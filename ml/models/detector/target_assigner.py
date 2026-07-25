from __future__ import annotations

import torch


def feature_locations(height: int, width: int, stride: int, device: torch.device) -> torch.Tensor:
    ys = (torch.arange(height, device=device) + 0.5) * stride
    xs = (torch.arange(width, device=device) + 0.5) * stride
    y, x = torch.meshgrid(ys, xs)
    return torch.stack([x.reshape(-1), y.reshape(-1)], dim=1)


def assign_targets_for_level(boxes: torch.Tensor, locations: torch.Tensor, regress_range: tuple[float, float], radius: float = 1.5, stride: int = 8):
    n = locations.shape[0]
    labels = torch.zeros(n, device=locations.device)
    reg_targets = torch.zeros((n, 4), device=locations.device)
    centerness = torch.zeros(n, device=locations.device)
    if boxes.numel() == 0:
        return labels, reg_targets, centerness
    left = locations[:, 0:1] - boxes[:, 0]
    top = locations[:, 1:2] - boxes[:, 1]
    right = boxes[:, 2] - locations[:, 0:1]
    bottom = boxes[:, 3] - locations[:, 1:2]
    reg = torch.stack([left, top, right, bottom], dim=2)
    inside_box = reg.min(dim=2).values > 0
    max_reg = reg.max(dim=2).values
    in_range = (max_reg >= regress_range[0]) & (max_reg <= regress_range[1])
    centers = torch.stack([(boxes[:, 0] + boxes[:, 2]) / 2, (boxes[:, 1] + boxes[:, 3]) / 2], dim=1)
    center_distance = (locations[:, None, :] - centers[None, :, :]).abs().max(dim=2).values
    in_center = center_distance <= radius * stride
    matches = inside_box & in_range & in_center
    areas = ((boxes[:, 2] - boxes[:, 0]) * (boxes[:, 3] - boxes[:, 1])).clone()
    areas = areas[None, :].repeat(n, 1)
    areas[~matches] = float("inf")
    min_area, assigned = areas.min(dim=1)
    positive = torch.isfinite(min_area)
    if positive.any():
        labels[positive] = 1
        chosen = reg[positive, assigned[positive], :]
        reg_targets[positive] = chosen
        lr = chosen[:, [0, 2]]
        tb = chosen[:, [1, 3]]
        centerness[positive] = torch.sqrt((lr.min(dim=1).values / lr.max(dim=1).values).clamp(min=0) * (tb.min(dim=1).values / tb.max(dim=1).values).clamp(min=0))
    return labels, reg_targets, centerness
