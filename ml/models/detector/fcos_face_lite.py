from __future__ import annotations

import torch
from torch import nn

from ml.models.detector.backbone import TinyBackbone
from ml.models.detector.fpn import SimpleFPN
from ml.models.detector.heads import FCOSHead


class FCOSFaceLite(nn.Module):
    def __init__(self, fpn_channels: int = 128, head_convolutions: int = 4) -> None:
        super().__init__()
        self.backbone = TinyBackbone()
        self.fpn = SimpleFPN(self.backbone.out_channels, fpn_channels)
        self.head = FCOSHead(fpn_channels, head_convolutions)

    def forward(self, images: torch.Tensor) -> list[dict[str, torch.Tensor]]:
        return self.head(self.fpn(self.backbone(images)))
