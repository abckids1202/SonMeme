from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import AliasChoices, Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


PROJECT_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=PROJECT_ROOT.parent / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
        populate_by_name=True,
    )

    app_name: str = "Sonify"
    app_env: str = "development"
    app_host: str = "0.0.0.0"
    app_port: int = 8000

    frontend_origins: list[str] = Field(default_factory=lambda: ["http://localhost:5173"])

    model_device: Literal["auto", "cpu", "cuda"] = "auto"
    model_runtime: Literal["pytorch", "onnx"] = "pytorch"

    detector_model_path: Path = Path("models/detector/production/fcos_face_lite_416_v1.pt")
    detector_config_path: Path = Path("ml/configs/detector/widerface_fcos_mnv3_416.yaml")
    landmark_model_path: Path = Path("../models/pytorch/landmark_model.pt")
    generator_model_path: Path = Path("../models/pytorch/identity_generator.pt")

    onnx_detector_path: Path = Path("../models/onnx/face_detector.onnx")
    onnx_landmark_path: Path = Path("../models/onnx/landmark_model.onnx")
    onnx_generator_path: Path = Path("../models/onnx/identity_generator.onnx")

    temp_directory: Path = Path("./runtime/temp")
    temp_ttl_minutes: int = 30

    max_upload_mb: int = 15
    max_image_width: int = 4096
    max_image_height: int = 4096
    preview_max_side: int = 1280

    detection_confidence_threshold: float = 0.35
    detection_nms_threshold: float = 0.40
    max_faces_per_image: int = 20

    enable_neural_swap: bool = False
    enable_debug_outputs: bool = True
    public_deployment: bool = False

    generation_enabled: bool = Field(
        False,
        validation_alias=AliasChoices("SONIFY_GENERATION_ENABLED", "GENERATION_ENABLED"),
    )
    generation_provider: str = Field(
        "configured-http",
        validation_alias=AliasChoices("SONIFY_GENERATION_PROVIDER", "GENERATION_PROVIDER"),
    )
    generation_api_url: str | None = Field(
        None,
        validation_alias=AliasChoices("SONIFY_GENERATION_API_URL", "GENERATION_API_URL"),
    )
    generation_api_key: str | None = Field(
        None,
        validation_alias=AliasChoices("SONIFY_GENERATION_API_KEY", "GENERATION_API_KEY"),
    )
    generation_model: str = Field(
        "sonify-face-inpaint",
        validation_alias=AliasChoices("SONIFY_GENERATION_MODEL", "GENERATION_MODEL"),
    )
    generation_timeout_seconds: float = Field(
        90.0,
        gt=1,
        le=300,
        validation_alias=AliasChoices("SONIFY_GENERATION_TIMEOUT_SECONDS", "GENERATION_TIMEOUT_SECONDS"),
    )
    generation_temp_ttl_minutes: int = Field(
        30,
        gt=1,
        le=240,
        validation_alias=AliasChoices("SONIFY_GENERATION_TEMP_TTL_MINUTES", "GENERATION_TEMP_TTL_MINUTES"),
    )

    @field_validator("frontend_origins", mode="before")
    @classmethod
    def parse_origins(cls, value: str | list[str]) -> list[str]:
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value


@lru_cache
def get_settings() -> Settings:
    return Settings()
