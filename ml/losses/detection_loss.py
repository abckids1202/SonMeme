from __future__ import annotations

import torch
import torch.nn.functional as F

from ml.losses.focal_loss import sigmoid_focal_loss
from ml.models.detector.target_assigner import assign_targets_for_level, feature_locations


def decode_regression(locations: torch.Tensor, distances: torch.Tensor) -> torch.Tensor:
    return torch.stack([
        locations[:, 0] - distances[:, 0],
        locations[:, 1] - distances[:, 1],
        locations[:, 0] + distances[:, 2],
        locations[:, 1] + distances[:, 3],
    ], dim=1)


def detection_loss(outputs, targets, strides=(8, 16, 32), ranges=((0, 64), (64, 160), (160, 100000))):
    total_cls = total_reg = total_ctr = total_pos = 0.0
    device = outputs[0]["cls"].device
    for batch_index, target in enumerate(targets):
        boxes = target["boxes"].to(device)
        for level, output in enumerate(outputs):
            cls = output["cls"][batch_index, 0].reshape(-1)
            reg = output["reg"][batch_index].permute(1, 2, 0).reshape(-1, 4) * strides[level]
            ctr = output["ctr"][batch_index, 0].reshape(-1)
            h, w = output["cls"].shape[-2:]
            loc = feature_locations(h, w, strides[level], device)
            labels, reg_targets, ctr_targets = assign_targets_for_level(boxes, loc, tuple(ranges[level]), stride=strides[level])
            pos = labels > 0
            total_cls = total_cls + sigmoid_focal_loss(cls, labels).sum()
            total_pos = total_pos + pos.sum().float()
            if pos.any():
                pred_boxes = decode_regression(loc[pos], reg[pos])
                tgt_boxes = decode_regression(loc[pos], reg_targets[pos])
                from ml.losses.iou_loss import giou_loss
                total_reg = total_reg + (giou_loss(pred_boxes, tgt_boxes) * ctr_targets[pos]).sum()
                total_ctr = total_ctr + F.binary_cross_entropy_with_logits(ctr[pos], ctr_targets[pos], reduction="sum")
    normalizer = max(float(total_pos), 1.0)
    losses = {
        "classification": total_cls / normalizer,
        "regression": total_reg / normalizer,
        "centerness": total_ctr / normalizer,
        "positive_count": torch.as_tensor(total_pos, device=device),
    }
    losses["total"] = losses["classification"] + 2.0 * losses["regression"] + losses["centerness"]
    return losses
