from __future__ import annotations

from typing import Any

from pydantic import BaseModel


class DetectionResponse(BaseModel):
    imageId: str
    faces: list[dict[str, Any]]
    model: dict[str, Any]
    timingMs: dict[str, float]
    imageWidth: int
    imageHeight: int
