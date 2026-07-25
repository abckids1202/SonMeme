from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from PIL import Image


@dataclass
class LetterboxResult:
    image: Image.Image
    boxes: np.ndarray
    scale: tuple[float, float]
    padding: tuple[float, float, float, float]
    original_size: tuple[int, int]
    resized_size: tuple[int, int]


def letterbox(image: Image.Image, boxes: np.ndarray, target_size: tuple[int, int] = (640, 640), padding_value: int = 114) -> LetterboxResult:
    target_w, target_h = target_size
    orig_w, orig_h = image.size
    scale = min(target_w / orig_w, target_h / orig_h)
    resized_w = int(round(orig_w * scale))
    resized_h = int(round(orig_h * scale))
    resized = image.resize((resized_w, resized_h), Image.BILINEAR)
    canvas = Image.new("RGB", (target_w, target_h), (padding_value, padding_value, padding_value))
    left = (target_w - resized_w) // 2
    top = (target_h - resized_h) // 2
    canvas.paste(resized, (left, top))
    next_boxes = boxes.astype("float32").copy()
    if next_boxes.size:
        next_boxes[:, [0, 2]] = next_boxes[:, [0, 2]] * scale + left
        next_boxes[:, [1, 3]] = next_boxes[:, [1, 3]] * scale + top
    return LetterboxResult(
        image=canvas,
        boxes=next_boxes,
        scale=(scale, scale),
        padding=(float(left), float(top), float(target_w - resized_w - left), float(target_h - resized_h - top)),
        original_size=(orig_h, orig_w),
        resized_size=(resized_h, resized_w),
    )


def inverse_letterbox_boxes(boxes: np.ndarray, scale: tuple[float, float], padding: tuple[float, float, float, float], original_size: tuple[int, int]) -> np.ndarray:
    result = boxes.astype("float32").copy()
    if result.size:
        left, top, _, _ = padding
        result[:, [0, 2]] = (result[:, [0, 2]] - left) / scale[0]
        result[:, [1, 3]] = (result[:, [1, 3]] - top) / scale[1]
        h, w = original_size
        result[:, [0, 2]] = np.clip(result[:, [0, 2]], 0, w)
        result[:, [1, 3]] = np.clip(result[:, [1, 3]], 0, h)
    return result
