from __future__ import annotations

import json
import time
from pathlib import Path

import torch
from torch.utils.data import DataLoader

from ml.datasets.collate import detection_collate
from ml.datasets.widerface_dataset import WiderFaceDetectionDataset
from ml.losses.detection_loss import detection_loss
from ml.models.detector.fcos_face_lite import FCOSFaceLite
from ml.training.checkpointing import save_checkpoint


def build_loaders(cfg: dict, mode: str):
    paths = cfg["paths"]
    processed = Path(paths["processed_root"])
    input_size = int(cfg["input"]["width"])
    limits = {"tiny-overfit": (32, 8), "smoke-test": (1000, 200), "full": (None, None)}[mode]
    train_ds = WiderFaceDetectionDataset(processed / "manifests" / "train.jsonl", input_size=input_size, augment=mode != "tiny-overfit", limit=limits[0])
    val_ds = WiderFaceDetectionDataset(processed / "manifests" / "val.jsonl", input_size=input_size, augment=False, limit=limits[1])
    batch_size = 4 if mode == "tiny-overfit" else int(cfg["training"]["batch_size"])
    workers = 0 if mode == "tiny-overfit" else int(cfg["training"]["num_workers"])
    train_loader = DataLoader(train_ds, batch_size=batch_size, shuffle=True, num_workers=workers, collate_fn=detection_collate)
    val_loader = DataLoader(val_ds, batch_size=batch_size, shuffle=False, num_workers=workers, collate_fn=detection_collate)
    return train_loader, val_loader


def train(cfg: dict, mode: str, device: torch.device, resume: str | None = None) -> Path:
    train_loader, val_loader = build_loaders(cfg, mode)
    model = FCOSFaceLite(
        fpn_channels=int(cfg["model"].get("fpn_channels", 128)),
        head_convolutions=int(cfg["model"].get("head_convolutions", 4)),
    ).to(device)
    optimizer = torch.optim.AdamW(model.parameters(), lr=float(cfg["optimizer"]["learning_rate"]), weight_decay=float(cfg["optimizer"]["weight_decay"]))
    epochs = {"tiny-overfit": min(100, int(cfg["training"]["epochs"])), "smoke-test": 3, "full": int(cfg["training"]["epochs"])}[mode]
    run_root = Path(cfg["paths"]["run_root"])
    run_name = f"{cfg['project']['run_name']}_{mode}_{time.strftime('%Y%m%d_%H%M%S')}"
    run_dir = run_root / run_name
    checkpoint_dir = Path(cfg["paths"]["checkpoint_root"]) / run_name
    run_dir.mkdir(parents=True, exist_ok=True)
    checkpoint_dir.mkdir(parents=True, exist_ok=True)
    (run_dir / "resolved_config.json").write_text(json.dumps(cfg, indent=2), encoding="utf-8")
    global_step = 0
    for epoch in range(1, epochs + 1):
        model.train()
        for images, targets in train_loader:
            start = time.perf_counter()
            images = images.to(device)
            optimizer.zero_grad(set_to_none=True)
            outputs = model(images)
            losses = detection_loss(outputs, targets)
            if not torch.isfinite(losses["total"]):
                raise RuntimeError("Non-finite loss detected; aborting training.")
            losses["total"].backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), float(cfg["training"]["gradient_clip_norm"]))
            optimizer.step()
            global_step += 1
            if global_step % int(cfg["training"]["log_every_steps"]) == 0:
                print(
                    f"epoch={epoch} step={global_step} loss={losses['total'].item():.4f} "
                    f"cls={losses['classification'].item():.4f} reg={losses['regression'].item():.4f} "
                    f"ctr={losses['centerness'].item():.4f} positives={int(losses['positive_count'].item())} "
                    f"step_time={time.perf_counter() - start:.2f}s"
                )
            if mode == "tiny-overfit" and global_step >= 1000:
                break
        payload = {
            "epoch": epoch,
            "global_step": global_step,
            "model_state_dict": model.state_dict(),
            "optimizer_state_dict": optimizer.state_dict(),
            "best_metric": 0.0,
            "config": cfg,
            "metrics": {},
        }
        save_checkpoint(checkpoint_dir / f"epoch_{epoch:03d}.pt", payload)
        save_checkpoint(checkpoint_dir / "last.pt", payload)
        if mode == "tiny-overfit" and global_step >= 1000:
            break
    save_checkpoint(checkpoint_dir / "best_ap50.pt", payload)
    print(f"Training complete. Checkpoints: {checkpoint_dir}")
    print(f"Run logs/config: {run_dir}")
    return checkpoint_dir
