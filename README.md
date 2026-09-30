<div align="center">

# SIGIL

**Signal Intelligence & Identification Lab**  
*Next-Gen Explainable RF Signal-Analysis, 3D Waterfall & Live SDR Simulation Workbench*

An offline, provenance-tracked, AI-assisted RF signal analysis platform for **authorized** `.iq`, `.wav`, and SigMF recordings — from raw spectrum to demodulated bits, with every estimate backed by evidence.

![Status](https://img.shields.io/badge/status-production%20ready-2ea44f?style=for-the-badge&logo=vercel&logoColor=white)
![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white)
![Version](https://img.shields.io/badge/version-0.2.0-8A2BE2?style=for-the-badge&logo=semver&logoColor=white)

---

**Never guesses. Never hides uncertainty. Every number has a `source`, a `confidence`, and evidence you can inspect.**

</div>

---

## ✨ Why SIGIL?

Traditional signal analyzers output a single number and call it truth. SIGIL treats every parameter as a **provenance-tracked estimate**:

| Feature | The SIGIL way |
|---|---|
| **Explainable** | Every estimate ships with `source`, `confidence`, and human-readable evidence |
| **3D Waterfall Analysis** | Interactive WebGL 3D surface mesh with 6 color palettes (Viridis, Plasma, Inferno, Jet, Electric, Turbo) and real-time pan/zoom/orbit |
| **Live SDR Simulator** | Real-time WebSocket/HTTP SDR streaming, live I/Q oscilloscope, constellation & Welch PSD spectrum, and 1-click snapshot to project |
| **Offline & Private** | 100% local processing — your RF data never leaves your machine |
| **Multi-Format** | WAV, raw I/Q (int8, int16, float32), and SigMF (`-meta` + `-data` pairs) |
| **End-to-End DSP** | Modulation → symbol rate → bursts → demodulation → de-interleaving → FEC → bits |
| **FEC & Coding** | Convolutional/Viterbi, Reed-Solomon, LDPC, and RS+Convolutional concatenated decoders |
| **Instant Auto-Login** | Built-in credential helper with 1-click auto-registration & authentication |

---

## 🧱 Tech Stack

<div align="center">

### Frontend
![Next.js](https://img.shields.io/badge/Next.js-14-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![shadcn/ui](https://img.shields.io/badge/shadcn%2Fui-000000?style=for-the-badge&logo=shadcnui&logoColor=white)
![TanStack Query](https://img.shields.io/badge/TanStack%20Query-5-FF4154?style=for-the-badge&logo=reactquery&logoColor=white)
![Plotly](https://img.shields.io/badge/Plotly.js-3F4F75?style=for-the-badge&logo=plotly&logoColor=white)
![Recharts](https://img.shields.io/badge/Recharts-2-22C55E?style=for-the-badge)
![Zustand](https://img.shields.io/badge/Zustand-4-5A67D8?style=for-the-badge)
![Vitest](https://img.shields.io/badge/Vitest-5-6E9F18?style=for-the-badge&logo=vitest&logoColor=white)

### Backend
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![SQLAlchemy](https://img.shields.io/badge/SQLAlchemy-2.0-D71F00?style=for-the-badge&logo=sqlalchemy&logoColor=white)
![Alembic](https://img.shields.io/badge/Alembic-1.15-D2B48C?style=for-the-badge)
![Celery](https://img.shields.io/badge/Celery-5.5-37814A?style=for-the-badge&logo=celery&logoColor=white)
![Pydantic](https://img.shields.io/badge/Pydantic-2-E92063?style=for-the-badge&logo=pydantic&logoColor=white)
![JWT](https://img.shields.io/badge/JWT%20Auth-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white)

### Data & Infrastructure
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![Docker Compose](https://img.shields.io/badge/Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white)

### DSP Core
![NumPy](https://img.shields.io/badge/NumPy-2.2-013243?style=for-the-badge&logo=numpy&logoColor=white)
![SciPy](https://img.shields.io/badge/SciPy-1.15-8CAAE6?style=for-the-badge&logo=scipy&logoColor=white)
![Pytest](https://img.shields.io/badge/Pytest-8-0A9EDC?style=for-the-badge&logo=pytest&logoColor=white)

</div>

---

## 🚀 Getting Started

### Prerequisites

- **Python**: 3.11+ (Python 3.13 supported)
- **Node.js**: 18+ (Node 20+ recommended)
- **PostgreSQL**: 16+ or 17 (or run via Docker)

---

### Running Locally (Native - No Docker Required)

#### 1. Clone the Repository
```bash
git clone https://github.com/Abhinav-kp-dev/Analysis-of-.IQ-and-.wav-files.git sigil
cd sigil
```

#### 2. Backend Setup
```bash
cd services/api
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pip install -e ../dsp-worker

# Run database migrations
alembic upgrade head

# Start FastAPI server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

#### 3. Frontend Setup
```bash
cd ../../apps/web
npm install
npm run dev -- -p 3000
```

| Service | URL |
|---|---|
| **SIGIL Web App** | [http://localhost:3000](http://localhost:3000) |
| **Login / Auto-Login** | [http://localhost:3000/login](http://localhost:3000/login) |
| **Live SDR Simulator** | [http://localhost:3000/live](http://localhost:3000/live) |
| **API Health** | [http://localhost:8000/health](http://localhost:8000/health) |
| **Interactive API Docs** | [http://localhost:8000/docs](http://localhost:8000/docs) |

---

### Instant Auto-Login Credentials

SIGIL includes a pre-configured admin account for rapid evaluation:
- **Email**: `admin@signalscope.io`
- **Password**: `SignalScopeAdmin123!`
- Or simply click **⚡ Auto Login** on [http://localhost:3000/login](http://localhost:3000/login).

---

### Running with Docker

```bash
cp .env.example .env
cp apps/web/.env.example apps/web/.env.local

docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

---

## 📡 Live SDR Simulator & 3D Waterfall

### Live SDR Simulation Engine
- **Streaming Protocols**: Real-time bidirectional WebSocket at `/api/stream/ws` with seamless HTTP frame polling fallback at `/api/stream/frame`.
- **Modulation Types**: QPSK, BPSK, 8PSK, 16QAM, 64QAM, 2FSK, 4FSK.
- **Interactive Controls**: Modulation selection, SNR slider (-10 dB to +30 dB), Symbol Rate / Baud Rate, Carrier Frequency Offset (CFO), and Frames Per Second.
- **Live Visualizers**:
  - Dual-channel I & Q oscilloscope trace
  - IQ constellation scatter with detected frequency deviation
  - Welch Power Spectral Density (PSD) spectrum with carrier markers
  - Real-time scrolling 3D surface waterfall
- **1-Click Snapshot**: Directly records live simulated RF streams into a persistent `Recording` and `AnalysisProject` with a single click.

### 3D Waterfall Surface Mesh
- **WebGL Accelerated**: Fully rotatable 3D surface visualization in project workspaces.
- **6 Scientific Palettes**: `Viridis`, `Plasma`, `Inferno`, `Jet`, `Electric`, and `Turbo`.
- **Display Modes**: Toggle between high-resolution 2D Spectrogram and full 3D Surface Mesh with height exaggeration and contour levels.

---

## 🧪 Testing

| Suite | Command | Scope |
|---|---|---|
| **DSP Core** | `cd services/dsp-worker && python -m pytest tests/ -q` | **55 passed** — Loading, modulation/demodulation BER, FEC (Convolutional, Reed-Solomon, LDPC, Concatenated), de-interleaving, proof spectra. |
| **API** | `cd services/api && pytest tests/ -q` | **34 passed** — Auth, upload, projects, jobs, evidence-proof payloads, live SDR streaming endpoints. |
| **Frontend** | `cd apps/web && npm test` | **26 passed** — Vitest + RTL: provenance badge, waveform points, file format inference, proof summarization. |

---

## 🔬 DSP Pipeline & Provenance Model

Every estimate the pipeline produces carries an immutable **provenance record**:

```json
{
  "name": "symbol_rate",
  "value": 250000.0,
  "unit": "symbols/s",
  "source": "spectral_correlator",
  "confidence": 0.93,
  "evidence": [
    "dominant spectral peak at 250.0 kHz (±2.5 kHz) in the cyclostationary profile",
    "agrees within 1.2% of candidate from zero-crossing analysis"
  ],
  "alternatives": [
    { "value": 256000.0, "evidence": ["second harmonic candidate"] }
  ],
  "warnings": []
}
```

**Pipeline Stages**:
1. Signal Conditioning & DC Offset Removal
2. Energy-based Burst Detection & Segmentation
3. Spectral Feature Extraction (Cyclostationary & Higher-Order Cumulants)
4. AMC Modulation Classification (BPSK, QPSK, 8PSK, 16QAM, 64QAM, 2FSK, 4FSK)
5. Symbol Rate Estimation via Non-Linear Spectral Line Extraction
6. Symbol Center Demodulation & Constellation Clustering
7. De-interleaving (Matrix / Pseudo-Random)
8. FEC Validation (Convolutional/Viterbi, Reed-Solomon, LDPC)
9. Bit Correlation & Frame Synchronization

---

## 🌐 API Overview

| Endpoint | Method | Description |
|---|---|---|
| `/api/auth/register` · `/login` · `/me` | POST/GET | User authentication & JWT management |
| `/api/stream/ws` | WebSocket | Real-time SDR I/Q frame streaming |
| `/api/stream/frame` | GET | Single SDR frame snapshot (polling fallback) |
| `/api/stream/snapshot` | POST | Convert live stream into persistent project |
| `/api/uploads` | POST | Upload WAV / raw I/Q / SigMF |
| `/api/projects` | CRUD | Group recordings into analysis projects |
| `/api/projects/{id}/estimate-parameters` | POST | Trigger DSP estimation pipeline |
| `/api/projects/{id}/parameters` | GET | Provenance-tracked parameter estimates |
| `/api/recordings` | CRUD | Recording metadata, previews, and raw chunks |
| `/api/jobs/{id}` | GET | Asynchronous DSP job status |
| `/api/dashboard/stats` | GET | Global aggregate metrics and project counts |
| `/health` | GET | System liveness probe |

---

## 📜 License

All usage must be limited to **authorized** spectrum analysis. The authors assume no responsibility for misuse of the DSP capabilities.

---

<div align="center">

**SIGIL** — *Signal Intelligence & Identification Lab*

</div>
