from __future__ import annotations

import torch

from ml.losses.detection_loss import decode_regression
from ml.losses.iou_loss import box_iou
from ml.models.detector.target_assigner import feature_locations


def nms(boxes: torch.Tensor, scores: torch.Tensor, iou_threshold: float) -> torch.Tensor:
    if boxes.numel() == 0:
        return torch.empty((0,), dtype=torch.long, device=boxes.device)
    order = scores.argsort(descending=True)
    keep = []
    while order.numel() > 0:
        i = order[0]
        keep.append(i)
        if order.numel() == 1:
            break
        ious = box_iou(boxes[i].view(1, 4), boxes[order[1:]]).view(-1)
        order = order[1:][ious <= iou_threshold]
    return torch.stack(keep) if keep else torch.empty((0,), dtype=torch.long, device=boxes.device)


def decode_outputs(outputs, threshold=0.35, nms_iou=0.4, pre_nms_top_k=1000, max_detections=100, strides=(8, 16, 32)):
    predictions = []
    batch_size = outputs[0]["cls"].shape[0]
    for b in range(batch_size):
        all_boxes = []
        all_scores = []
        for level, output in enumerate(outputs):
            cls = torch.sigmoid(output["cls"][b, 0]).reshape(-1)
            ctr = torch.sigmoid(output["ctr"][b, 0]).reshape(-1)
            scores = torch.sqrt(cls * ctr)
            mask = scores > threshold
            if not mask.any():
                continue
            h, w = output["cls"].shape[-2:]
            loc = feature_locations(h, w, strides[level], output["cls"].device)
            reg = output["reg"][b].permute(1, 2, 0).reshape(-1, 4) * strides[level]
            boxes = decode_regression(loc[mask], reg[mask]).clamp(min=0, max=640)
            score_values = scores[mask]
            if score_values.numel() > pre_nms_top_k:
                top = score_values.topk(pre_nms_top_k).indices
                boxes = boxes[top]
                score_values = score_values[top]
            all_boxes.append(boxes)
            all_scores.append(score_values)
        if all_boxes:
            boxes = torch.cat(all_boxes, 0)
            scores = torch.cat(all_scores, 0)
            keep = nms(boxes, scores, nms_iou)[:max_detections]
            predictions.append({"boxes": boxes[keep], "scores": scores[keep]})
        else:
            predictions.append({"boxes": torch.empty((0, 4), device=outputs[0]["cls"].device), "scores": torch.empty((0,), device=outputs[0]["cls"].device)})
    return predictions
