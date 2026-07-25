from __future__ import annotations

from pathlib import Path
import torch


def save_checkpoint(path: str | Path, payload: dict) -> None:
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    torch.save(payload, target)


def load_checkpoint(path: str | Path, map_location="cpu") -> dict:
    return torch.load(Path(path), map_location=map_location)
