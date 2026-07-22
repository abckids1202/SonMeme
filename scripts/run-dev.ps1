Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Write-Host "Start backend: cd backend; uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
Write-Host "Start frontend: cd frontend; npm run dev"
