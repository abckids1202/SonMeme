Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot
if (Test-Path ".venv\Scripts\Activate.ps1") { . .\.venv\Scripts\Activate.ps1 }

python -m ml.scripts.verify_widerface
python -m ml.scripts.prepare_widerface
python -m ml.scripts.visualize_widerface --split train --count 100
python -m ml.scripts.visualize_widerface --split val --count 50
python -m ml.scripts.inspect_batch --config ml/configs/detector/widerface_fcos_mnv3_640.yaml --batches 5

Write-Host ""
Write-Host "Inspect previews under:"
Write-Host "data\processed\widerface\previews"
Write-Host "Then run:"
Write-Host "python -m ml.scripts.prepare_widerface --mark-validated"
