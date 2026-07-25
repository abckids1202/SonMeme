@echo off
setlocal
cd /d "%~dp0.."
if not exist .venv python -m venv .venv
call .venv\Scripts\activate.bat
python -m pip install --upgrade pip
pip install -r ml\requirements-detector.txt
python -c "import torch; print('PyTorch', torch.__version__, 'CUDA', torch.cuda.is_available())"
python -m ml.scripts.verify_widerface
echo Next: scripts\prepare_detector.ps1
