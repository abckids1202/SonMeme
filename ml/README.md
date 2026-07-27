# Sonify ML Workspace

Training code lives here, separate from the FastAPI application package.

## WIDER FACE Detector Preparation

Setup PowerShell:

```powershell
cd "C:\Users\charl\OneDrive\Desktop\son"
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\scripts\setup_detector.ps1
```

Command Prompt alternative:

```cmd
cd /d C:\Users\charl\OneDrive\Desktop\son
python -m venv .venv
.venv\Scripts\activate
python -m pip install --upgrade pip
pip install -r ml\requirements-detector.txt
```

Verify and prepare:

```cmd
python -m ml.scripts.verify_widerface
python -m ml.scripts.prepare_widerface
python -m ml.scripts.visualize_widerface --split train --count 100
python -m ml.scripts.visualize_widerface --split val --count 50
python -m ml.scripts.inspect_batch --config ml/configs/detector/widerface_fcos_mnv3_640.yaml --batches 5

After training, inspect real Sonify images:

```cmd
python -m ml.scripts.inspect_predictions --config ml/configs/detector/widerface_fcos_mnv3_416.yaml --checkpoint models/detector/production/fcos_face_lite_416_v1.pt --input-dir data/application_eval/sonify_faces --count 50
```
```

After manually inspecting `data/processed/widerface/previews`, mark validation:

```cmd
python -m ml.scripts.prepare_widerface --mark-validated
```

Training order:

```powershell
.\scripts\train_detector_tiny.ps1
.\scripts\train_detector_smoke.ps1
.\scripts\train_detector_full.ps1
```

Do not start full training until dataset verification passes, annotation previews look correct, batch previews look correct, tiny-overfit succeeds, and smoke-test completes.
