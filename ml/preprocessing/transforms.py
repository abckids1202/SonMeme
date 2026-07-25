from __future__ import annotations

import numpy as np
import torch
from PIL import Image


IMAGENET_MEAN = torch.tensor([0.485, 0.456, 0.406]).view(3, 1, 1)
IMAGENET_STD = torch.tensor([0.229, 0.224, 0.225]).view(3, 1, 1)


def image_to_tensor(image: Image.Image, normalize: bool = True) -> torch.Tensor:
    arr = np.asarray(image.convert("RGB"), dtype="float32") / 255.0
    tensor = torch.from_numpy(arr).permute(2, 0, 1).contiguous()
    return (tensor - IMAGENET_MEAN) / IMAGENET_STD if normalize else tensor


def tensor_to_image(tensor: torch.Tensor) -> Image.Image:
    value = tensor.detach().cpu() * IMAGENET_STD + IMAGENET_MEAN
    value = value.clamp(0, 1).permute(1, 2, 0).numpy()
    return Image.fromarray((value * 255).astype("uint8"))
