from __future__ import annotations

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_get_stream_frame(client: AsyncClient):
    resp = await client.get("/api/stream/frame?modulation=QPSK&snr_db=20&baud_rate=50000")
    assert resp.status_code == 200
    data = resp.json()
    assert data["type"] == "sdr_frame"
    assert data["configured_modulation"] == "QPSK"
    assert "detected_modulation" in data
    assert "confidence" in data
    assert len(data["waveform"]) > 0
    assert len(data["constellation"]) > 0
    assert len(data["psd"]) > 0


@pytest.mark.asyncio
async def test_snapshot_to_project(client: AsyncClient, auth_headers: dict):
    payload = {
        "name": "Test SDR Snapshot",
        "modulation": "BPSK",
        "snr_db": 25.0,
        "baud_rate": 20000.0,
        "cfo_hz": 500.0,
        "sample_rate_hz": 200000.0,
        "duration_symbols": 500,
    }
    resp = await client.post("/api/stream/snapshot", json=payload, headers=auth_headers)
    assert resp.status_code == 200
    res_data = resp.json()
    assert res_data["success"] is True
    assert "recording_id" in res_data
    assert "project_id" in res_data
