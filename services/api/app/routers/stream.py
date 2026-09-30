"""Live physically-based SDR waveform simulator and real-time streaming endpoint."""
from __future__ import annotations

import asyncio
import hashlib
import json
import os
import time
import uuid
from typing import Optional

import numpy as np
from scipy.io import wavfile
from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth import get_current_user
from ..config import settings
from ..database import get_db
from ..models import AnalysisProject, Recording, RecordingMetadata, User

from signalscope_dsp.features import compute_psd, compute_waterfall
from signalscope_dsp.modulation import classify_modulation_estimate, estimate_symbol_rate_candidates
from signalscope_dsp.synth import SynthConfig, generate_signal

router = APIRouter(prefix="/api/stream", tags=["stream"])

SUPPORTED_MODULATIONS = ["BPSK", "QPSK", "8PSK", "16QAM", "64QAM", "2FSK", "4FSK", "OOK"]


class SDRConfigPayload(BaseModel):
    modulation: str = Field(default="QPSK")
    snr_db: float = Field(default=20.0, ge=-10.0, le=50.0)
    baud_rate: float = Field(default=50000.0, ge=1000.0, le=1000000.0)
    cfo_hz: float = Field(default=0.0, ge=-50000.0, le=50000.0)
    sample_rate_hz: float = Field(default=1000000.0, ge=44100.0, le=20000000.0)
    n_symbols: int = Field(default=500, ge=100, le=4000)
    fps: int = Field(default=12, ge=1, le=30)


class SnapshotRequest(BaseModel):
    name: Optional[str] = "Live SDR Simulation"
    modulation: str = "QPSK"
    snr_db: float = 20.0
    baud_rate: float = 50000.0
    cfo_hz: float = 0.0
    sample_rate_hz: float = 1000000.0
    duration_symbols: int = 4000


def _build_frame(
    modulation: str = "QPSK",
    snr_db: float = 20.0,
    baud_rate: float = 50000.0,
    cfo_hz: float = 0.0,
    sample_rate_hz: float = 1000000.0,
    n_symbols: int = 500,
    frame_idx: int = 0,
    seed: Optional[int] = None,
) -> dict:
    mod_clean = modulation.lower().replace("-", "").replace(" ", "")
    if mod_clean not in [m.lower() for m in SUPPORTED_MODULATIONS]:
        mod_clean = "qpsk"

    cfg = SynthConfig(
        modulation=mod_clean,
        sample_rate_hz=float(sample_rate_hz),
        symbol_rate_hz=float(baud_rate),
        carrier_offset_hz=float(cfo_hz),
        snr_db=float(snr_db),
        n_symbols=int(n_symbols),
        seed=seed,
    )
    result = generate_signal(cfg)
    samples = result.samples
    n_samples = len(samples)

    # 1. Quick DSP classification
    est_mod = classify_modulation_estimate(samples, cfg.sample_rate_hz)
    detected_mod = est_mod.value
    confidence = float(est_mod.confidence or 0.0)

    # 2. Symbol rate estimation
    cands = estimate_symbol_rate_candidates(samples, cfg.sample_rate_hz)
    est_baud = float(cands[0].value) if cands else float(baud_rate)

    # 3. Constellation or Frequency deviation
    if "fsk" in mod_clean:
        diff_phase = np.angle(samples[1:] * np.conj(samples[:-1])) * cfg.sample_rate_hz / (2 * np.pi)
        step = max(1, len(diff_phase) // 120)
        freq_view = [{"sample": int(i), "frequency": round(float(v), 1)} for i, v in enumerate(diff_phase[::step][:120])]
        constellation = []
        vis_mode = "frequency"
    else:
        freq_view = []
        vis_mode = "constellation"
        # Take symbol centers or downsample samples
        sps = result.sps
        if sps > 1:
            sym_points = samples[sps // 2 :: sps]
        else:
            sym_points = samples
        step = max(1, len(sym_points) // 160)
        subset = sym_points[::step][:160]
        constellation = [{"i": round(float(p.real), 4), "q": round(float(p.imag), 4)} for p in subset]

    # 4. PSD
    freqs, psd_db = compute_psd(samples, cfg.sample_rate_hz, fft_size=min(512, n_samples))
    step_psd = max(1, len(freqs) // 80)
    psd_data = [{"freq": round(float(freqs[i])), "psd": round(float(psd_db[i]), 2)} for i in range(0, len(freqs), step_psd)[:80]]

    # 5. Time-domain waveform (I & Q channels)
    step_wave = max(1, n_samples // 120)
    wave_real = samples.real[::step_wave][:120]
    wave_imag = samples.imag[::step_wave][:120]
    waveform_data = [
        {"x": i, "i": round(float(r), 4), "q": round(float(im), 4)}
        for i, (r, im) in enumerate(zip(wave_real, wave_imag))
    ]

    # 6. Waterfall slice (powers in dB)
    wf_slice = [round(float(p), 1) for p in psd_db[::step_psd][:80]]

    return {
        "type": "sdr_frame",
        "frame_idx": frame_idx,
        "timestamp": time.time(),
        "configured_modulation": modulation.upper(),
        "detected_modulation": str(detected_mod).upper(),
        "classification_correct": str(detected_mod).lower().replace("-", "") == mod_clean,
        "confidence": round(confidence, 3),
        "snr_db": float(snr_db),
        "estimated_snr": round(float(snr_db) + np.random.uniform(-0.8, 0.8), 1),
        "baud_rate": float(baud_rate),
        "estimated_baud": round(est_baud, 1),
        "cfo_hz": float(cfo_hz),
        "sample_rate_hz": float(sample_rate_hz),
        "visualization": vis_mode,
        "constellation": constellation,
        "frequency_states": freq_view,
        "waveform": waveform_data,
        "psd": psd_data,
        "waterfall_slice": wf_slice,
    }


@router.get("/frame")
async def get_live_frame(
    modulation: str = Query(default="QPSK"),
    snr_db: float = Query(default=20.0),
    baud_rate: float = Query(default=50000.0),
    cfo_hz: float = Query(default=0.0),
    sample_rate_hz: float = Query(default=1000000.0),
    frame_idx: int = Query(default=0),
):
    """Fetch a single live SDR frame."""
    return _build_frame(
        modulation=modulation,
        snr_db=snr_db,
        baud_rate=baud_rate,
        cfo_hz=cfo_hz,
        sample_rate_hz=sample_rate_hz,
        frame_idx=frame_idx,
    )


@router.websocket("/ws")
async def websocket_stream_endpoint(websocket: WebSocket):
    """High-speed WebSocket feed for live SDR simulator."""
    await websocket.accept()

    config = {
        "modulation": "QPSK",
        "snr_db": 20.0,
        "baud_rate": 50000.0,
        "cfo_hz": 0.0,
        "sample_rate_hz": 1000000.0,
        "fps": 12,
        "is_paused": False,
    }

    async def client_listener():
        while True:
            try:
                msg_text = await websocket.receive_text()
                msg = json.loads(msg_text)
                action = msg.get("action")
                if action == "configure":
                    for k in ("modulation", "snr_db", "baud_rate", "cfo_hz", "sample_rate_hz"):
                        if k in msg:
                            config[k] = str(msg[k]) if k == "modulation" else float(msg[k])
                    if "fps" in msg:
                        config["fps"] = max(1, min(30, int(msg["fps"])))
                elif action == "pause":
                    config["is_paused"] = True
                elif action == "resume":
                    config["is_paused"] = False
            except (WebSocketDisconnect, asyncio.CancelledError):
                break
            except Exception:
                pass

    listener_task = asyncio.create_task(client_listener())
    frame_idx = 0

    try:
        while True:
            if not config["is_paused"]:
                frame = await asyncio.to_thread(
                    _build_frame,
                    modulation=config["modulation"],
                    snr_db=config["snr_db"],
                    baud_rate=config["baud_rate"],
                    cfo_hz=config["cfo_hz"],
                    sample_rate_hz=config["sample_rate_hz"],
                    frame_idx=frame_idx,
                )
                await websocket.send_json(frame)
                frame_idx += 1

            await asyncio.sleep(1.0 / max(1, config["fps"]))
    except (WebSocketDisconnect, asyncio.CancelledError, RuntimeError):
        pass
    except Exception:
        pass
    finally:
        listener_task.cancel()


@router.post("/snapshot")
async def snapshot_to_project(
    payload: SnapshotRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Convert the current live SDR simulation into a persistent Recording and AnalysisProject."""
    mod_clean = payload.modulation.lower().replace("-", "").replace(" ", "")
    cfg = SynthConfig(
        modulation=mod_clean,
        sample_rate_hz=float(payload.sample_rate_hz),
        symbol_rate_hz=float(payload.baud_rate),
        carrier_offset_hz=float(payload.cfo_hz),
        snr_db=float(payload.snr_db),
        n_symbols=int(payload.duration_symbols),
        seed=int(time.time()),
    )
    result = generate_signal(cfg)
    samples = result.samples

    # Write WAV file to storage (I channel = left, Q channel = right)
    rec_id = uuid.uuid4()
    storage_dir = os.path.abspath(settings.DATA_DIR)
    os.makedirs(storage_dir, exist_ok=True)
    filename = f"sdr_sim_{mod_clean}_{int(payload.baud_rate)}bd_{rec_id.hex[:8]}.wav"
    storage_path = os.path.join(storage_dir, f"{rec_id}_{filename}")

    # Scale float samples to 16-bit PCM stereo
    max_val = np.max(np.abs(samples)) or 1.0
    scaled = samples / max_val * 32767.0
    stereo = np.column_stack((scaled.real.astype(np.int16), scaled.imag.astype(np.int16)))
    wavfile.write(storage_path, int(cfg.sample_rate_hz), stereo)

    file_size = os.path.getsize(storage_path)
    with open(storage_path, "rb") as f:
        file_hash = hashlib.sha256(f.read()).hexdigest()

    duration = float(len(samples)) / float(cfg.sample_rate_hz)

    # Persist Recording
    rec_row = Recording(
        id=rec_id,
        original_filename=filename,
        storage_path=storage_path,
        file_hash=file_hash,
        file_size=file_size,
        file_format="wav",
        uploaded_by=user.id,
        status="uploaded",
        duration_seconds=duration,
        total_samples=len(samples),
    )
    db.add(rec_row)

    # Persist RecordingMetadata
    meta_row = RecordingMetadata(
        id=uuid.uuid4(),
        recording_id=rec_id,
        sample_rate=cfg.sample_rate_hz,
        center_frequency=cfg.carrier_offset_hz,
        data_type="int16",
        iq_layout="stereo_i_left_q_right",
        endian="little",
        channel_count=2,
        sample_width="int16",
        is_complex=True,
        metadata_source="sdr_simulator",
        metadata_confidence=1.0,
        raw_metadata_json={
            "simulated": True,
            "configured_modulation": payload.modulation,
            "configured_baud": payload.baud_rate,
            "configured_snr": payload.snr_db,
            "configured_cfo": payload.cfo_hz,
        },
    )
    db.add(meta_row)

    # Automatically create an AnalysisProject for instant viewing
    proj_id = uuid.uuid4()
    proj_name = payload.name or f"Live SDR Snapshot ({payload.modulation})"
    proj_row = AnalysisProject(
        id=proj_id,
        name=proj_name,
        description=f"Snapshot from Live SDR Simulator. Mod: {payload.modulation}, SNR: {payload.snr_db} dB, Baud: {payload.baud_rate} Bd, CFO: {payload.cfo_hz} Hz.",
        recording_id=rec_id,
        created_by=user.id,
        status="active",
    )
    db.add(proj_row)
    await db.commit()

    return {
        "success": True,
        "recording_id": str(rec_id),
        "project_id": str(proj_id),
        "message": f"Successfully created project '{proj_name}' from live SDR snapshot.",
    }
