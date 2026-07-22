from __future__ import annotations

from fastapi import APIRouter, Depends

from app.dependencies import get_model_registry
from app.schemas.health import HealthResponse
from app.services.model_registry import ModelRegistry

router = APIRouter(prefix="/health", tags=["health"])


@router.get("", response_model=HealthResponse)
async def health(registry: ModelRegistry = Depends(get_model_registry)) -> HealthResponse:
    return HealthResponse(
        status="healthy",
        device=registry.device,
        runtime=registry.runtime,
        models=registry.availability(),
        metadata=registry.metadata(),
    )
