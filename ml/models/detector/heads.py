from __future__ import annotations

from torch import nn
import torch


class SepConvBlock(nn.Sequential):
    def __init__(self, channels: int, groups: int = 16) -> None:
        super().__init__(
            nn.Conv2d(channels, channels, 3, padding=1, groups=channels, bias=False),
            nn.Conv2d(channels, channels, 1, bias=False),
            nn.GroupNorm(min(groups, channels), channels),
            nn.SiLU(inplace=True),
        )


class FCOSHead(nn.Module):
    def __init__(self, channels: int = 128, convs: int = 4) -> None:
        super().__init__()
        tower = [SepConvBlock(channels) for _ in range(convs)]
        self.shared = nn.Sequential(*tower)
        self.cls = nn.Conv2d(channels, 1, 3, padding=1)
        self.reg = nn.Conv2d(channels, 4, 3, padding=1)
        self.ctr = nn.Conv2d(channels, 1, 3, padding=1)
        nn.init.constant_(self.cls.bias, -4.6)

    def forward(self, features: list[torch.Tensor]) -> list[dict[str, torch.Tensor]]:
        outputs = []
        for feature in features:
            hidden = self.shared(feature)
            outputs.append({
                "cls": self.cls(hidden),
                "reg": torch.relu(self.reg(hidden)) + 1e-4,
                "ctr": self.ctr(hidden),
            })
        return outputs
