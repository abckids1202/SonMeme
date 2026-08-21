from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path

from app.config import PROJECT_ROOT, Settings
from app.schemas.health import ModelAvailability, ModelMetadata
from app.services.face_analyzer import FaceAnalyzer

try:
    import sys

    sys.path.insert(0, str(PROJECT_ROOT.parent))
    from ml.inference.detector import DetectorPredictor
except ImportError:
    DetectorPredictor = None  # type: ignore[assignment,misc]


@dataclass
class ModelRegistry:
    settings: Settings
    device: str = "cpu"
    runtime: str = "pytorch"
    loaded: bool = False
    detector: object | None = None
    production_analyzer: FaceAnalyzer = field(default_factory=FaceAnalyzer)

    async def load(self) -> None:
        self.device = self._select_device()
        self.runtime = self.settings.model_runtime
        checkpoint = self._resolve(self.settings.detector_model_path)
        config = self._resolve(self.settings.detector_config_path)
        if self.runtime == "pytorch" and DetectorPredictor and checkpoint.exists() and config.exists():
            self.detector = DetectorPredictor(config, checkpoint, self.device)
        self.loaded = True

    async def warmup(self) -> None:
        return None

    async def close(self) -> None:
        self.detector = None
        self.loaded = False

    def detect(self, image, threshold: float | None = None) -> dict:
        return self.production_analyzer.detect(image, threshold=threshold or self.settings.detection_confidence_threshold)

    def availability(self) -> ModelAvailability:
        return ModelAvailability(
            detector=self._exists(self.settings.detector_model_path, self.settings.onnx_detector_path),
            landmarks=self._exists(self.settings.landmark_model_path, self.settings.onnx_landmark_path),
            generator=self._exists(self.settings.generator_model_path, self.settings.onnx_generator_path),
        )

    def metadata(self) -> ModelMetadata:
        availability = self.availability()
        return ModelMetadata(
            detector="custom checkpoint available" if availability.detector else "missing custom checkpoint",
            landmarks="custom checkpoint available" if availability.landmarks else "missing custom checkpoint",
            generator="custom checkpoint available" if availability.generator else "missing custom checkpoint",
        )

    def _select_device(self) -> str:
        if self.settings.model_device == "cpu":
            return "cpu"
        if self.settings.model_device == "cuda":
            return "cuda" if self._torch_cuda_available() else "cpu"
        return "cuda" if self._torch_cuda_available() else "cpu"

    def _torch_cuda_available(self) -> bool:
        try:
            import torch

            return bool(torch.cuda.is_available())
        except Exception:
            return False

    def _exists(self, pytorch_path: Path, onnx_path: Path) -> bool:
        candidate = onnx_path if self.settings.model_runtime == "onnx" else pytorch_path
        return self._resolve(candidate).exists()

    @staticmethod
    def _resolve(path: Path) -> Path:
        return path if path.is_absolute() else (PROJECT_ROOT / path).resolve()
