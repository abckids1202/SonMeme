from __future__ import annotations

import random
import numpy as np
from PIL import Image, ImageEnhance


def horizontal_flip(image: Image.Image, boxes: np.ndarray) -> tuple[Image.Image, np.ndarray]:
    width = image.width
    flipped = image.transpose(Image.FLIP_LEFT_RIGHT)
    result = boxes.copy()
    if result.size:
        x1 = result[:, 0].copy()
        x2 = result[:, 2].copy()
        result[:, 0] = width - x2
        result[:, 2] = width - x1
    return flipped, result


def light_color_jitter(image: Image.Image) -> Image.Image:
    brightness = 0.85 + random.random() * 0.3
    contrast = 0.85 + random.random() * 0.3
    image = ImageEnhance.Brightness(image).enhance(brightness)
    return ImageEnhance.Contrast(image).enhance(contrast)
