from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI

from app.config import get_settings
from app.services.model_registry import ModelRegistry


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    registry = ModelRegistry(get_settings())
    await registry.load()
    await registry.warmup()
    app.state.model_registry = registry
    try:
        yield
    finally:
        await registry.close()
