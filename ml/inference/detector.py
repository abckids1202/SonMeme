from __future__ import annotations

import sys
import time
from pathlib import Path
from typing import Any

import numpy as np
import torch
from PIL import Image, ImageOps

from ml.models.detector.decoder import decode_outputs
from ml.models.detector.fcos_face_lite import FCOSFaceLite
from ml.preprocessing.letterbox import inverse_letterbox_boxes, letterbox
from ml.preprocessing.transforms import image_to_tensor
from ml.utils.config import load_config


class DetectorPredictor:
    """Loads the trained FCOS checkpoint once and returns original-image boxes."""

    def __init__(self, config_path: str | Path, checkpoint_path: str | Path, device: str = "auto") -> None:
        self.config_path = Path(config_path)
        self.checkpoint_path = Path(checkpoint_path)
        self.config = load_config(self.config_path)
        self.input_size = int(self.config["input"]["width"])
        inference = self.config.get("inference", {})
        self.threshold = float(inference.get("confidence_threshold", 0.35))
        self.nms_iou = float(inference.get("nms_iou_threshold", 0.4))
        self.pre_nms_top_k = int(inference.get("pre_nms_top_k", 1000))
        self.max_detections = int(inference.get("maximum_detections", 20))
        self.device = self._select_device(device)
        self.model = FCOSFaceLite(
            fpn_channels=int(self.config["model"].get("fpn_channels", 128)),
            head_convolutions=int(self.config["model"].get("head_convolutions", 4)),
        ).to(self.device)
        checkpoint = torch.load(self.checkpoint_path, map_location=self.device)
        state_dict = checkpoint.get("model_state_dict", checkpoint)
        self.model.load_state_dict(state_dict)
        self.model.eval()

    @staticmethod
    def _select_device(requested: str) -> torch.device:
        if requested == "cuda" and torch.cuda.is_available():
            return torch.device("cuda")
        if requested == "auto" and torch.cuda.is_available():
            return torch.device("cuda")
        return torch.device("cpu")

    def predict(self, image: Image.Image, threshold: float | None = None) -> dict[str, Any]:
        image = ImageOps.exif_transpose(image).convert("RGB")
        original_width, original_height = image.size
        started = time.perf_counter()
        prep_started = time.perf_counter()
        result = letterbox(image, np.empty((0, 4), dtype="float32"), (self.input_size, self.input_size), 114)
        tensor = image_to_tensor(result.image).unsqueeze(0).to(self.device)
        preprocessing_ms = (time.perf_counter() - prep_started) * 1000

        inference_started = time.perf_counter()
        with torch.inference_mode():
            outputs = self.model(tensor)
        if self.device.type == "cuda":
            torch.cuda.synchronize()
        inference_ms = (time.perf_counter() - inference_started) * 1000

        decode_started = time.perf_counter()
        predictions = decode_outputs(
            outputs,
            threshold=self.threshold if threshold is None else threshold,
            nms_iou=self.nms_iou,
            pre_nms_top_k=self.pre_nms_top_k,
            max_detections=self.max_detections,
            strides=tuple(self.config["model"].get("feature_strides", [8, 16, 32])),
            image_size=self.input_size,
        )[0]
        boxes = predictions["boxes"].detach().cpu().numpy()
        boxes = inverse_letterbox_boxes(boxes, result.scale, result.padding, result.original_size)
        scores = predictions["scores"].detach().cpu().numpy().tolist()
        decoding_ms = (time.perf_counter() - decode_started) * 1000

        faces = []
        for index, (box, score) in enumerate(zip(boxes.tolist(), scores)):
            x1, y1, x2, y2 = box
            width = max(0.0, x2 - x1)
            height = max(0.0, y2 - y1)
            faces.append(
                {
                    "id": f"face-{index}",
                    "confidence": float(score),
                    "bbox": {
                        "x": x1 / original_width,
                        "y": y1 / original_height,
                        "width": width / original_width,
                        "height": height / original_height,
                    },
                    "bboxPixels": {"x": x1, "y": y1, "width": width, "height": height},
                }
            )
        return {
            "faces": faces,
            "model": {
                "name": "FCOSFaceLite",
                "version": "416-v1",
                "customTrained": True,
                "inputSize": self.input_size,
                "runtime": "pytorch",
            },
            "timingMs": {
                "preprocessing": preprocessing_ms,
                "inference": inference_ms,
                "decoding": decoding_ms,
                "nms": 0.0,
                "total": (time.perf_counter() - started) * 1000,
            },
            "imageWidth": original_width,
            "imageHeight": original_height,
        }
