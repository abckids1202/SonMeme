from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field, model_validator


class NormalizedPoint(BaseModel):
    x: float = Field(ge=-0.5, le=1.5)
    y: float = Field(ge=-0.5, le=1.5)


class NormalizedBox(BaseModel):
    x: float = Field(ge=0, le=1)
    y: float = Field(ge=0, le=1)
    width: float = Field(gt=0, le=1)
    height: float = Field(gt=0, le=1)

    @model_validator(mode="after")
    def stays_inside_image(self) -> "NormalizedBox":
        if self.x + self.width > 1.0001 or self.y + self.height > 1.0001:
            raise ValueError("Target region must stay inside the image.")
        return self


class GenerationTarget(BaseModel):
    kind: Literal["face", "manual"]
    bbox: NormalizedBox
    face_id: str | None = None
    landmarks: dict[str, NormalizedPoint] = Field(default_factory=dict)
    corners: list[NormalizedPoint] = Field(default_factory=list)


class GenerationJobResponse(BaseModel):
    job_id: str
    status: Literal["queued", "running", "complete", "failed", "cancelled"]
    result_url: str | None = None
    error: str | None = None
    provider: str


class GenerationCapabilities(BaseModel):
    enabled: bool
    configured: bool
    provider: str
    message: str


class GenerationPayload(BaseModel):
    preset: Literal["natural", "scene-blend", "meme"]
    target: GenerationTarget
    source_crop: NormalizedBox
    source_mask: list[NormalizedPoint] = Field(default_factory=list)
    prompt: str | None = None

    @model_validator(mode="after")
    def source_mask_is_reasonable(self) -> "GenerationPayload":
        if len(self.source_mask) not in (0,) and len(self.source_mask) < 3:
            raise ValueError("Source mask must contain at least three points.")
        return self


def generation_payload_json(payload: GenerationPayload) -> dict[str, Any]:
    return payload.model_dump(mode="json")
