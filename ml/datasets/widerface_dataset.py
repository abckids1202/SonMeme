from __future__ import annotations

from pathlib import Path
from typing import Any

import numpy as np
import torch
from PIL import Image, ImageOps
from torch.utils.data import Dataset

from ml.datasets.manifests import read_jsonl
from ml.preprocessing.augmentations import horizontal_flip, light_color_jitter
from ml.preprocessing.letterbox import letterbox
from ml.preprocessing.transforms import image_to_tensor


class WiderFaceDetectionDataset(Dataset):
    def __init__(self, manifest_path: str | Path, input_size: int = 640, augment: bool = False, limit: int | None = None) -> None:
        self.rows = read_jsonl(manifest_path)
        if limit is not None:
            self.rows = self.rows[:limit]
        self.input_size = input_size
        self.augment = augment

    def __len__(self) -> int:
        return len(self.rows)

    def __getitem__(self, index: int) -> tuple[torch.Tensor, dict[str, Any]]:
        row = self.rows[index]
        image = Image.open(row["absolute_path"]).convert("RGB")
        image = ImageOps.exif_transpose(image)
        boxes = np.array([[box["x1"], box["y1"], box["x2"], box["y2"]] for box in row["boxes"]], dtype="float32")
        if self.augment and boxes.size and torch.rand(()) < 0.5:
            image, boxes = horizontal_flip(image, boxes)
        if self.augment and torch.rand(()) < 0.2:
            image = light_color_jitter(image)
        result = letterbox(image, boxes, (self.input_size, self.input_size))
        tensor = image_to_tensor(result.image)
        target: dict[str, Any] = {
            "boxes": torch.as_tensor(result.boxes, dtype=torch.float32).reshape(-1, 4),
            "labels": torch.ones((len(result.boxes),), dtype=torch.int64),
            "image_id": row["image_id"],
            "original_size": torch.as_tensor(result.original_size, dtype=torch.int64),
            "resized_size": torch.as_tensor(result.resized_size, dtype=torch.int64),
            "scale": torch.as_tensor(result.scale, dtype=torch.float32),
            "padding": torch.as_tensor(result.padding, dtype=torch.float32),
        }
        return tensor, target
