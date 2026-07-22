#!/usr/bin/env bash
set -euo pipefail

echo "Start backend: cd backend && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
echo "Start frontend: cd frontend && npm run dev"
