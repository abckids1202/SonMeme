@echo off
setlocal
cd /d "%~dp0.."

if not exist .venv (
  python -m venv .venv || goto :error
)

call .venv\Scripts\activate.bat || goto :error
python -m pip install --upgrade pip || goto :error
python -m pip install -r ml\requirements-detector.txt || goto :error
python -c "import yaml, PIL, torch; print('Dependencies OK'); print('PyTorch', torch.__version__, 'CUDA', torch.cuda.is_available())" || goto :error
python -m ml.scripts.verify_widerface || goto :error

echo.
echo Setup complete.
echo Next: scripts\prepare_detector.ps1
exit /b 0

:error
echo.
echo Detector setup failed. Scroll up to the first error, then rerun:
echo python -m pip install -r ml\requirements-detector.txt
exit /b 1
