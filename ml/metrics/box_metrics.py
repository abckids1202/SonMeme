from __future__ import annotations

import torch

from ml.losses.iou_loss import box_iou


def match_predictions(pred_boxes: torch.Tensor, pred_scores: torch.Tensor, gt_boxes: torch.Tensor, iou_threshold: float = 0.5) -> dict[str, int]:
    if gt_boxes.numel() == 0:
        return {"tp": 0, "fp": int(pred_boxes.shape[0]), "fn": 0}
    if pred_boxes.numel() == 0:
        return {"tp": 0, "fp": 0, "fn": int(gt_boxes.shape[0])}
    order = pred_scores.argsort(descending=True)
    matched = torch.zeros((gt_boxes.shape[0],), dtype=torch.bool, device=gt_boxes.device)
    tp = fp = 0
    ious = box_iou(pred_boxes[order], gt_boxes)
    for row in ious:
        best_iou, best_idx = row.max(dim=0)
        if best_iou >= iou_threshold and not matched[best_idx]:
            tp += 1
            matched[best_idx] = True
        else:
            fp += 1
    return {"tp": tp, "fp": fp, "fn": int((~matched).sum().item())}
