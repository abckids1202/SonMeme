from __future__ import annotations

import argparse
import sys
from pathlib import Path

import torch

from ml.training.reproducibility import set_seed
from ml.training.trainer import train
from ml.utils.config import load_config
from ml.utils.device import describe_device, select_device


def safety_checks(cfg: dict, mode: str) -> bool:
    processed = Path(cfg["paths"]["processed_root"])
    train_manifest = processed / "manifests" / "train.jsonl"
    val_manifest = processed / "manifests" / "val.jsonl"
    if not train_manifest.exists() or not val_manifest.exists():
        print("Missing manifests. Run: python -m ml.scripts.prepare_widerface")
        return False
    if mode == "full" and not (processed / ".validated").exists():
        print("Full training is blocked until previews are manually inspected.")
        print("After inspection run: python -m ml.scripts.prepare_widerface --mark-validated")
        return False
    return True


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", default="ml/configs/detector/widerface_fcos_mnv3_640.yaml")
    parser.add_argument("--mode", choices=["tiny-overfit", "smoke-test", "full"], required=True)
    parser.add_argument("--device", choices=["auto", "cpu", "cuda"], default="auto")
    parser.add_argument("--resume")
    args = parser.parse_args()
    cfg = load_config(args.config)
    set_seed(int(cfg["project"]["seed"]), deterministic=bool(cfg.get("reproducibility", {}).get("deterministic", False)))
    if not safety_checks(cfg, args.mode):
        return 1
    device = select_device(args.device)
    mixed = bool(cfg["training"].get("mixed_precision", False))
    print(describe_device(device, mixed, int(cfg["training"]["num_workers"])))
    try:
        train(cfg, args.mode, device, args.resume)
    except RuntimeError as exc:
        if "out of memory" in str(exc).lower():
            print("CUDA out of memory. Reduce batch_size or increase gradient_accumulation_steps.")
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
        raise
    return 0


if __name__ == "__main__":
    sys.exit(main())
