# Architecture

Sonify is a monorepo with strict separation between application serving and model training.

- `frontend` owns the editor workflow and never stores full uploaded files in global state.
- `backend/app` owns HTTP APIs, validation, temporary storage, and inference orchestration.
- `ml` owns datasets, preprocessing, training, evaluation, and export.
- `models` stores deployable checkpoints and model cards, but large artifacts are ignored by Git.

The FastAPI `ModelRegistry` is loaded during lifespan startup so models are not reloaded per request.
