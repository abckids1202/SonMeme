param([switch]$yes)
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot
if (Test-Path ".venv\Scripts\Activate.ps1") { . .\.venv\Scripts\Activate.ps1 }
$validated = Test-Path "data\processed\widerface\.validated"
Write-Host "Input resolution: 640x640"
Write-Host "Config: ml/configs/detector/widerface_fcos_mnv3_640.yaml"
Write-Host "Validation marker exists: $validated"
if (-not $yes) {
  $answer = Read-Host "Start full training? [y/N]"
  if ($answer -ne "y") { Write-Host "Cancelled."; exit 1 }
}
python -m ml.training.train_detector --config ml/configs/detector/widerface_fcos_mnv3_640.yaml --mode full
