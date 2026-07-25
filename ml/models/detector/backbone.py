from __future__ import annotations

import torch
from torch import nn


class ConvBlock(nn.Sequential):
    def __init__(self, in_channels: int, out_channels: int, stride: int) -> None:
        super().__init__(
            nn.Conv2d(in_channels, out_channels, 3, stride=stride, padding=1, bias=False),
            nn.BatchNorm2d(out_channels),
            nn.SiLU(inplace=True),
        )


class TinyBackbone(nn.Module):
    def __init__(self) -> None:
        super().__init__()
        self.stem = ConvBlock(3, 32, 2)
        self.block1 = nn.Sequential(ConvBlock(32, 48, 2), ConvBlock(48, 64, 2))  # stride 8
        self.block2 = nn.Sequential(ConvBlock(64, 96, 2), ConvBlock(96, 128, 1))  # stride 16
        self.block3 = nn.Sequential(ConvBlock(128, 160, 2), ConvBlock(160, 192, 1))  # stride 32
        self.out_channels = [64, 128, 192]

    def forward(self, x: torch.Tensor) -> list[torch.Tensor]:
        x = self.stem(x)
        p3 = self.block1(x)
        p4 = self.block2(p3)
        p5 = self.block3(p4)
        return [p3, p4, p5]
