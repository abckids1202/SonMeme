Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Push-Location frontend
npm install
Pop-Location

Push-Location backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install --upgrade pip
.\.venv\Scripts\python.exe -m pip install -r requirements.txt -r requirements-dev.txt
Pop-Location
