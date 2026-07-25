from __future__ import annotations

import torch.nn.functional as F
from torch import nn
import torch


class SimpleFPN(nn.Module):
    def __init__(self, in_channels: list[int], out_channels: int = 128) -> None:
        super().__init__()
        self.lateral = nn.ModuleList([nn.Conv2d(c, out_channels, 1) for c in in_channels])
        self.smooth = nn.ModuleList([nn.Conv2d(out_channels, out_channels, 3, padding=1) for _ in in_channels])

    def forward(self, features: list[torch.Tensor]) -> list[torch.Tensor]:
        laterals = [conv(feature) for conv, feature in zip(self.lateral, features)]
        for i in range(len(laterals) - 1, 0, -1):
            laterals[i - 1] = laterals[i - 1] + F.interpolate(laterals[i], size=laterals[i - 1].shape[-2:], mode="nearest")
        return [smooth(feature) for smooth, feature in zip(self.smooth, laterals)]
