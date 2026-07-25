from __future__ import annotations

import torch


def select_device(requested: str = "auto") -> torch.device:
    requested = requested.lower()
    cuda_available = torch.cuda.is_available()
    if requested == "cuda" and not cuda_available:
        raise RuntimeError("CUDA was requested, but PyTorch cannot see a CUDA device.")
    if requested == "cpu":
        return torch.device("cpu")
    return torch.device("cuda" if cuda_available else "cpu")


def describe_device(device: torch.device, mixed_precision: bool, workers: int) -> str:
    lines = [
        f"PyTorch version: {torch.__version__}",
        f"CUDA available: {torch.cuda.is_available()}",
        f"Selected device: {device}",
        f"Mixed precision enabled: {mixed_precision and device.type == 'cuda'}",
        f"DataLoader workers: {workers}",
    ]
    if torch.cuda.is_available():
        lines.append(f"CUDA version: {torch.version.cuda}")
        lines.append(f"GPU model: {torch.cuda.get_device_name(0)}")
        try:
            props = torch.cuda.get_device_properties(0)
            lines.append(f"GPU memory: {props.total_memory / 1024 ** 3:.2f} GB")
        except Exception:
            pass
    elif device.type == "cpu":
        lines.append("Warning: full WIDER FACE training on CPU may be extremely slow.")
    return "\n".join(lines)
