from __future__ import annotations

from fastapi import Request

from app.services.model_registry import ModelRegistry
from app.services.generation_service import GenerationService


def get_model_registry(request: Request) -> ModelRegistry:
    return request.app.state.model_registry


def get_generation_service(request: Request) -> GenerationService:
    return request.app.state.generation_service
