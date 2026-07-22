from __future__ import annotations

from pydantic import BaseModel


class ModelAvailability(BaseModel):
    detector: bool
    landmarks: bool
    generator: bool


class ModelMetadata(BaseModel):
    detector: str
    landmarks: str
    generator: str


class HealthResponse(BaseModel):
    status: str
    device: str
    runtime: str
    models: ModelAvailability
    metadata: ModelMetadata
