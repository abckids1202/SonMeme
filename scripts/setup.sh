#!/usr/bin/env bash
set -euo pipefail

(cd frontend && npm install)
(cd backend && python -m venv .venv && . .venv/bin/activate && python -m pip install --upgrade pip && python -m pip install -r requirements.txt -r requirements-dev.txt)
