from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI

from app.config import get_settings
from app.services.model_registry import ModelRegistry
from app.services.generation_service import GenerationService
from app.services.openai_sonify_service import OpenAISonifyService


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    registry = ModelRegistry(get_settings())
    generation = GenerationService(get_settings())
    sonify = OpenAISonifyService(get_settings())
    await registry.load()
    await registry.warmup()
    app.state.model_registry = registry
    app.state.generation_service = generation
    app.state.sonify_service = sonify
    try:
        yield
    finally:
        await generation.close()
        await registry.close()
