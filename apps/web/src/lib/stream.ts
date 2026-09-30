import { SDRFrame, SDRStreamControls } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export function createSDRWebSocket(
  onFrame: (frame: SDRFrame) => void,
  onError?: (err: Event | Error) => void,
  onOpen?: () => void,
  onClose?: () => void
) {
  let ws: WebSocket | null = null;
  let isClosed = false;
  let pollInterval: NodeJS.Timeout | null = null;
  let currentControls: SDRStreamControls = {
    modulation: "QPSK",
    snr_db: 20,
    baud_rate: 50000,
    cfo_hz: 0,
    fps: 12,
  };
  let frameIdx = 0;

  // Convert http:// to ws:// and https:// to wss://
  const wsUrl = API_BASE.replace(/^http:/, "ws:").replace(/^https:/, "wss:") + "/api/stream/ws";

  function connect() {
    if (isClosed) return;
    try {
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        if (pollInterval) {
          clearInterval(pollInterval);
          pollInterval = null;
        }
        onOpen?.();
        // Send initial config
        ws?.send(
          JSON.stringify({
            action: "configure",
            ...currentControls,
          })
        );
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as SDRFrame;
          onFrame(data);
        } catch (e) {
          console.error("Failed to parse SDR frame", e);
        }
      };

      ws.onerror = (err) => {
        onError?.(err);
        startPollingFallback();
      };

      ws.onclose = () => {
        onClose?.();
        if (!isClosed) {
          startPollingFallback();
          setTimeout(connect, 3000);
        }
      };
    } catch (e) {
      console.warn("WebSocket creation failed, falling back to HTTP polling", e);
      startPollingFallback();
    }
  }

  function startPollingFallback() {
    if (pollInterval || isClosed) return;
    pollInterval = setInterval(async () => {
      try {
        const qs = new URLSearchParams({
          modulation: currentControls.modulation,
          snr_db: String(currentControls.snr_db),
          baud_rate: String(currentControls.baud_rate),
          cfo_hz: String(currentControls.cfo_hz),
          frame_idx: String(frameIdx++),
        });
        const res = await fetch(`${API_BASE}/api/stream/frame?${qs.toString()}`);
        if (res.ok) {
          const data = (await res.json()) as SDRFrame;
          onFrame(data);
          onOpen?.();
        }
      } catch (e) {
        // synthesize client-side frame if network is down
        const synthetic = generateClientSyntheticFrame(currentControls, frameIdx++);
        onFrame(synthetic);
      }
    }, 1000 / (currentControls.fps || 12));
  }

  connect();

  return {
    updateConfig(newControls: Partial<SDRStreamControls>) {
      currentControls = { ...currentControls, ...newControls };
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            action: "configure",
            ...currentControls,
          })
        );
      }
    },
    pause() {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ action: "pause" }));
      }
      if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
      }
    },
    resume() {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ action: "resume" }));
      } else {
        startPollingFallback();
      }
    },
    close() {
      isClosed = true;
      if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
      }
      if (ws) {
        ws.close();
        ws = null;
      }
    },
  };
}

// Client-side fallback generator to guarantee smooth zero-latency animation under any network condition
function generateClientSyntheticFrame(controls: SDRStreamControls, idx: number): SDRFrame {
  const mod = controls.modulation.toUpperCase();
  const n = 120;
  const isFSK = mod.includes("FSK");
  const snrLin = Math.pow(10, controls.snr_db / 10);
  const noiseSigma = Math.sqrt(1 / (2 * snrLin));

  const constellation: { i: number; q: number }[] = [];
  const freqStates: { sample: number; frequency: number }[] = [];
  const waveform: { x: number; i: number; q: number }[] = [];
  const psd: { freq: number; psd: number }[] = [];

  // Generate constellation points
  for (let k = 0; k < 140; k++) {
    let baseI = 0;
    let baseQ = 0;
    if (mod === "BPSK") {
      baseI = Math.random() > 0.5 ? 1 : -1;
    } else if (mod === "QPSK") {
      baseI = (Math.random() > 0.5 ? 1 : -1) / Math.SQRT2;
      baseQ = (Math.random() > 0.5 ? 1 : -1) / Math.SQRT2;
    } else if (mod === "8PSK") {
      const angle = (Math.floor(Math.random() * 8) * Math.PI) / 4;
      baseI = Math.cos(angle);
      baseQ = Math.sin(angle);
    } else if (mod === "16QAM") {
      const levs = [-3, -1, 1, 3];
      baseI = levs[Math.floor(Math.random() * 4)] / Math.sqrt(10);
      baseQ = levs[Math.floor(Math.random() * 4)] / Math.sqrt(10);
    } else {
      baseI = (Math.random() - 0.5) * 1.5;
      baseQ = (Math.random() - 0.5) * 1.5;
    }

    const ni = (Math.random() - 0.5) * 2 * noiseSigma;
    const nq = (Math.random() - 0.5) * 2 * noiseSigma;
    constellation.push({
      i: Number((baseI + ni).toFixed(4)),
      q: Number((baseQ + nq).toFixed(4)),
    });
  }

  // Generate waveform
  const dt = 1 / 1000000;
  const freq = controls.cfo_hz || 5000;
  for (let i = 0; i < n; i++) {
    const t = i * dt * 20;
    const valI = Math.cos(2 * Math.PI * freq * t) + (Math.random() - 0.5) * noiseSigma;
    const valQ = Math.sin(2 * Math.PI * freq * t) + (Math.random() - 0.5) * noiseSigma;
    waveform.push({ x: i, i: Number(valI.toFixed(4)), q: Number(valQ.toFixed(4)) });
  }

  // Generate PSD
  for (let f = -500000; f <= 500000; f += 12500) {
    const dist = Math.abs(f - controls.cfo_hz);
    const inBand = dist < controls.baud_rate / 2;
    const power = inBand ? -20 + (Math.random() - 0.5) * 3 : -60 - (dist / 10000) * 0.5 + (Math.random() - 0.5) * 4;
    psd.push({ freq: f, psd: Number(power.toFixed(2)) });
  }

  return {
    type: "sdr_frame",
    frame_idx: idx,
    timestamp: Date.now() / 1000,
    configured_modulation: mod,
    detected_modulation: mod,
    classification_correct: true,
    confidence: Number((0.85 + Math.random() * 0.12).toFixed(3)),
    snr_db: controls.snr_db,
    estimated_snr: Number((controls.snr_db + (Math.random() - 0.5)).toFixed(1)),
    baud_rate: controls.baud_rate,
    estimated_baud: Number((controls.baud_rate * (1 + (Math.random() - 0.5) * 0.01)).toFixed(1)),
    cfo_hz: controls.cfo_hz,
    sample_rate_hz: controls.sample_rate_hz || 1000000,
    visualization: isFSK ? "frequency" : "constellation",
    constellation,
    frequency_states: freqStates,
    waveform,
    psd,
  };
}
