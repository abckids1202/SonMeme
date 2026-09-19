from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class SonifyRegion(BaseModel):
    x: float = Field(ge=0, le=1)
    y: float = Field(ge=0, le=1)
    width: float = Field(gt=0, le=1)
    height: float = Field(gt=0, le=1)


class SonifyAnalysis(BaseModel):
    target_type: Literal["face", "faces", "object", "unknown"]
    confidence: float = Field(ge=0, le=1)
    region: SonifyRegion | None = None
    description: str = ""


class SonifyResponse(BaseModel):
    image_base64: str
    media_type: Literal["image/png", "image/jpeg", "image/webp"] = "image/png"
    width: int = Field(gt=0)
    height: int = Field(gt=0)
    analysis: SonifyAnalysis
    model: str
