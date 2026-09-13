from __future__ import annotations

from dataclasses import dataclass
import os
from pathlib import Path
from typing import Any

import cv2
import numpy as np
from PIL import Image, ImageOps

try:
    import face_recognition
except ImportError:  # pragma: no cover - OpenCV remains available in minimal installs.
    face_recognition = None  # type: ignore[assignment]

try:
    import mediapipe as mp
except ImportError:  # pragma: no cover - local development keeps the dlib path available.
    mp = None  # type: ignore[assignment]


@dataclass(frozen=True)
class FaceAnalyzer:
    """Production face analysis with landmark-first bounds and a CV fallback."""

    minimum_size: int = 24

    def detect(self, image: Image.Image, threshold: float = 0.35) -> dict[str, Any]:
        image = ImageOps.exif_transpose(image).convert("RGB")
        width, height = image.size
        pixels = np.asarray(image)
        faces = self._landmark_faces(pixels, width, height, threshold)
        method = "face-recognition-landmarks"
        if not faces:
            faces = self._mediapipe_faces(pixels, width, height, threshold)
            method = "mediapipe-blazeface"
        # A weak cascade can produce convincing-looking but incorrect regions. The UI
        # has a deterministic manual rectangle fallback, so do not return guesses as
        # production detections when both landmark-capable detectors fail.
        return {
            "faces": faces,
            "model": {
                "name": method,
                "version": "production-1",
                "customTrained": False,
                "production": True,
                "runtime": "python",
                "inputSize": 0,
            },
            "timingMs": {},
            "imageWidth": width,
            "imageHeight": height,
        }

    def _mediapipe_faces(self, pixels: np.ndarray, width: int, height: int, threshold: float) -> list[dict[str, Any]]:
        model_path = Path(os.getenv("MEDIAPIPE_FACE_MODEL_PATH", "/models/blaze_face_short_range.tflite"))
        if mp is None or not model_path.exists() or not hasattr(mp, "tasks"):
            return []
        try:
            base_options = mp.tasks.BaseOptions(model_asset_path=str(model_path))
            options = mp.tasks.vision.FaceDetectorOptions(
                base_options=base_options,
                running_mode=mp.tasks.vision.RunningMode.IMAGE,
                min_detection_confidence=threshold,
            )
            image = mp.Image(image_format=mp.ImageFormat.SRGB, data=pixels)
            with mp.tasks.vision.FaceDetector.create_from_options(options) as detector:
                detections = detector.detect(image).detections
        except Exception:  # pragma: no cover - depends on the optional runtime/model asset.
            return []

        faces: list[dict[str, Any]] = []
        for index, detection in enumerate(detections):
            box = detection.bounding_box
            expanded = self._expanded_box(box.origin_x, box.origin_y, box.origin_x + box.width, box.origin_y + box.height, width, height)
            if expanded is None:
                continue
            keypoints = getattr(detection, "keypoints", [])
            landmarks: dict[str, list[tuple[int, int]]] = {}
            names = ("right_eye", "left_eye", "nose_tip", "mouth_center")
            for name, keypoint in zip(names, keypoints):
                landmarks[name] = [(int(keypoint.x * width), int(keypoint.y * height))]
            score = float(detection.categories[0].score) if detection.categories else threshold
            faces.append(self._face_payload(index, expanded, width, height, score, landmarks, "mediapipe"))
        return faces

    def _landmark_faces(self, pixels: np.ndarray, width: int, height: int, threshold: float) -> list[dict[str, Any]]:
        if face_recognition is None:
            return []
        locations = face_recognition.face_locations(pixels, model="hog", number_of_times_to_upsample=1)
        if not locations:
            locations = face_recognition.face_locations(pixels, model="hog", number_of_times_to_upsample=2)
        if not locations:
            return []
        landmark_sets = face_recognition.face_landmarks(pixels, locations)
        faces: list[dict[str, Any]] = []
        for index, location in enumerate(locations):
            top, right, bottom, left = location
            landmarks = landmark_sets[index] if index < len(landmark_sets) else {}
            points = [point for group in landmarks.values() for point in group]
            if points:
                xs = [point[0] for point in points]
                ys = [point[1] for point in points]
                left = min(left, min(xs))
                right = max(right, max(xs))
                top = min(top, min(ys))
                bottom = max(bottom, max(ys))
            box = self._expanded_box(left, top, right, bottom, width, height)
            if box is not None:
                faces.append(self._face_payload(index, box, width, height, 0.98, landmarks, "face-recognition"))
        return faces

    def _cascade_faces(self, pixels: np.ndarray, width: int, height: int, threshold: float) -> list[dict[str, Any]]:
        if not hasattr(cv2, "CascadeClassifier"):
            return []
        gray = cv2.cvtColor(pixels, cv2.COLOR_RGB2GRAY)
        gray = cv2.equalizeHist(gray)
        frontal = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
        profile = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_profileface.xml")
        detections = list(frontal.detectMultiScale(gray, scaleFactor=1.08, minNeighbors=5, minSize=(self.minimum_size, self.minimum_size)))
        detections.extend(profile.detectMultiScale(gray, scaleFactor=1.08, minNeighbors=4, minSize=(self.minimum_size, self.minimum_size)))
        boxes = self._dedupe_boxes([(x, y, x + w, y + h) for x, y, w, h in detections])
        faces: list[dict[str, Any]] = []
        for index, box in enumerate(boxes):
            expanded = self._expanded_box(*box, width, height)
            if expanded is not None:
                faces.append(self._face_payload(index, expanded, width, height, 0.68, {}, "opencv"))
        return faces

    def _face_payload(self, index: int, box: tuple[int, int, int, int], width: int, height: int, confidence: float, landmarks: dict[str, Any], source: str) -> dict[str, Any]:
        left, top, right, bottom = box
        pixel_box = {"x": left, "y": top, "width": right - left, "height": bottom - top}
        return {
            "id": f"face-{index}",
            "confidence": confidence,
            "source": source,
            "bbox": {"x": left / width, "y": top / height, "width": (right - left) / width, "height": (bottom - top) / height},
            "bboxPixels": pixel_box,
            "landmarks": self._landmark_payload(landmarks, width, height),
        }

    @staticmethod
    def _landmark_payload(landmarks: dict[str, Any], width: int, height: int) -> dict[str, list[float]]:
        result: dict[str, list[float]] = {}
        for key in ("left_eye", "right_eye", "nose_tip", "top_lip", "bottom_lip", "chin"):
            points = landmarks.get(key)
            if points:
                x = sum(point[0] for point in points) / len(points)
                y = sum(point[1] for point in points) / len(points)
                result[key] = [x / width, y / height]
        return result

    @staticmethod
    def _expanded_box(left: int, top: int, right: int, bottom: int, width: int, height: int) -> tuple[int, int, int, int] | None:
        box_width = right - left
        box_height = bottom - top
        if box_width < 24 or box_height < 24:
            return None
        left = max(0, int(left - box_width * 0.12))
        top = max(0, int(top - box_height * 0.18))
        right = min(width, int(right + box_width * 0.12))
        bottom = min(height, int(bottom + box_height * 0.10))
        return left, top, right, bottom

    @staticmethod
    def _dedupe_boxes(boxes: list[tuple[int, int, int, int]]) -> list[tuple[int, int, int, int]]:
        result: list[tuple[int, int, int, int]] = []
        for box in sorted(boxes, key=lambda value: (value[2] - value[0]) * (value[3] - value[1]), reverse=True):
            if all(FaceAnalyzer._iou(box, other) < 0.35 for other in result):
                result.append(box)
        return result

    @staticmethod
    def _iou(first: tuple[int, int, int, int], second: tuple[int, int, int, int]) -> float:
        left = max(first[0], second[0])
        top = max(first[1], second[1])
        right = min(first[2], second[2])
        bottom = min(first[3], second[3])
        overlap = max(0, right - left) * max(0, bottom - top)
        first_area = max(1, first[2] - first[0]) * max(1, first[3] - first[1])
        second_area = max(1, second[2] - second[0]) * max(1, second[3] - second[1])
        return overlap / max(1, first_area + second_area - overlap)
