# Sonify

Sonify is a still-image parody meme generator for the `son 😭` format. The first milestone creates the runnable project foundation: a Vite + React + TypeScript editor shell, a FastAPI backend with typed configuration and a health endpoint, and a separate ML workspace for future custom training.

The project is intentionally staged. This commit does not claim to include trained custom face models yet. The app reports unavailable checkpoints honestly until later milestones add the detector, landmarks, classical warp pipeline, and neural transformer.

## Architecture

```mermaid
flowchart LR
  UI["React editor"] --> API["FastAPI /api/v1"]
  API --> Registry["ModelRegistry"]
  Registry --> PT["PyTorch runtime"]
  Registry --> OX["ONNX runtime"]
  API --> Temp["Temporary image store"]
  Train["ml training pipelines"] --> Models["models/pytorch and models/onnx"]
  Models --> Registry
```

## Repository Structure

- `frontend/` - Vite React editor, routes, Zustand store, TanStack Query client, tests.
- `backend/` - FastAPI application package, typed settings, health endpoint, pytest tests.
- `ml/` - training and export workspace kept separate from the API package.
- `models/` - ignored checkpoint/export locations plus model-card templates.
- `docs/` - architecture, API, training, evaluation, and privacy notes.

## Local Setup

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Backend:

```bash
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt -r requirements-dev.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Health check:

```bash
curl http://localhost:8000/api/v1/health
```

## Commands

```bash
cd frontend && npm test
cd frontend && npm run build
cd backend && pytest
docker compose up --build
```

## Environment

Copy `.env.example` to `.env` for local overrides. `MODEL_DEVICE=auto` chooses CUDA when PyTorch can see it and falls back to CPU. `MODEL_RUNTIME` accepts `pytorch` and `onnx`.

## Training Roadmap

- Detector: custom lightweight face detector with reproducible configs under `ml/configs/detector`.
- Landmarks: custom five-point landmark model with crop transform parity between training and inference.
- Generator: identity-conditioned dual-decoder face transformer after the classical pipeline works.
- Export: ONNX scripts must run parity checks before marking exports successful.

## Privacy Behavior

Sonify is for AI-edited parody images only. It handles still images, does not build voice cloning or realtime video replacement, and must not retain uploads beyond the configured TTL. Future public deployments should add provenance marking.

## Known Limitations

Milestone 1 is a foundation. Upload, detection, landmark inference, classical warping, and final image export are intentionally scheduled for later milestones.
