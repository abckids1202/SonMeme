from __future__ import annotations

import torch


def detection_collate(batch):
    images, targets = zip(*batch)
    return torch.stack(list(images), dim=0), list(targets)
