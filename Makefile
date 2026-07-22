.PHONY: frontend-dev backend-dev frontend-test backend-test test

frontend-dev:
	cd frontend && npm run dev

backend-dev:
	cd backend && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

frontend-test:
	cd frontend && npm test

backend-test:
	cd backend && pytest

test: frontend-test backend-test
