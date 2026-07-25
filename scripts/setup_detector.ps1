Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

if (-not (Test-Path ".venv")) {
  python -m venv .venv
}
. .\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r ml\requirements-detector.txt
python -c "import torch; print('PyTorch', torch.__version__, 'CUDA', torch.cuda.is_available())"
python -m ml.scripts.verify_widerface

Write-Host ""
Write-Host "Next commands:"
Write-Host ".\scripts\prepare_detector.ps1"
Write-Host "python -m ml.scripts.prepare_widerface --mark-validated"
Write-Host ".\scripts\train_detector_tiny.ps1"
