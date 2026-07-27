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
    pin_memory = bool(cfg["training"].get("pin_memory", False))
    persistent_workers = workers > 0 and bool(cfg["training"].get("persistent_workers", False))
    train_loader = DataLoader(
        train_ds,
        batch_size=batch_size,
        shuffle=True,
        num_workers=workers,
        pin_memory=pin_memory,
        persistent_workers=persistent_workers,
        collate_fn=detection_collate,
    )
    val_loader = DataLoader(
        val_ds,
        batch_size=batch_size,
        shuffle=False,
        num_workers=workers,
        pin_memory=pin_memory,
        persistent_workers=persistent_workers,
        collate_fn=detection_collate,
    )
    return train_loader, val_loader


def set_backbone_trainable(model: FCOSFaceLite, trainable: bool) -> None:
    for parameter in model.backbone.parameters():
        parameter.requires_grad = trainable


def optimizer_parameters(model: FCOSFaceLite):
    return [parameter for parameter in model.parameters() if parameter.requires_grad]


def autocast_context(device: torch.device, enabled: bool):
    return torch.amp.autocast(device_type=device.type, enabled=enabled)


def make_scaler(device: torch.device, enabled: bool):
    return torch.amp.GradScaler(device=device.type, enabled=enabled)


def regression_ranges_from_config(cfg: dict):
    return tuple(tuple(float(value) for value in item) for item in cfg["model"].get("regression_ranges", ((0, 64), (64, 160), (160, 100000))))


def train(cfg: dict, mode: str, device: torch.device, resume: str | None = None) -> Path:
    train_loader, val_loader = build_loaders(cfg, mode)
    model = FCOSFaceLite(
        fpn_channels=int(cfg["model"].get("fpn_channels", 128)),
        head_convolutions=int(cfg["model"].get("head_convolutions", 4)),
    ).to(device)
    training_cfg = cfg["training"]
    accumulation_steps = max(1, int(training_cfg.get("gradient_accumulation_steps", 1)))
    freeze_backbone_epochs = 0 if mode == "tiny-overfit" else int(training_cfg.get("freeze_backbone_epochs", 0))
    mixed_precision = device.type == "cuda" and bool(training_cfg.get("mixed_precision", False))
    regression_ranges = regression_ranges_from_config(cfg)
    strides = tuple(int(value) for value in cfg["model"].get("feature_strides", (8, 16, 32)))

    if freeze_backbone_epochs > 0:
        set_backbone_trainable(model, False)
        print(f"Backbone frozen for first {freeze_backbone_epochs} epoch(s).")

    optimizer = torch.optim.AdamW(
        optimizer_parameters(model),
        lr=float(cfg["optimizer"]["learning_rate"]),
        weight_decay=float(cfg["optimizer"]["weight_decay"]),
    )
    scaler = make_scaler(device, mixed_precision)
    epochs = {"tiny-overfit": min(100, int(training_cfg["epochs"])), "smoke-test": 3, "full": int(training_cfg["epochs"])}[mode]
    run_root = Path(cfg["paths"]["run_root"])
    run_name = f"{cfg['project']['run_name']}_{mode}_{time.strftime('%Y%m%d_%H%M%S')}"
    run_dir = run_root / run_name
    checkpoint_dir = Path(cfg["paths"]["checkpoint_root"]) / run_name
    run_dir.mkdir(parents=True, exist_ok=True)
    checkpoint_dir.mkdir(parents=True, exist_ok=True)
    (run_dir / "resolved_config.json").write_text(json.dumps(cfg, indent=2), encoding="utf-8")
    global_step = 0
    optimizer_step = 0
    payload = {}
    for epoch in range(1, epochs + 1):
        if freeze_backbone_epochs > 0 and epoch == freeze_backbone_epochs + 1:
            set_backbone_trainable(model, True)
            optimizer = torch.optim.AdamW(
                optimizer_parameters(model),
                lr=float(cfg["optimizer"]["learning_rate"]),
                weight_decay=float(cfg["optimizer"]["weight_decay"]),
            )
            print(f"Backbone unfrozen at epoch {epoch}.")

        model.train()
        optimizer.zero_grad(set_to_none=True)
        for batch_index, (images, targets) in enumerate(train_loader, start=1):
            start = time.perf_counter()
            images = images.to(device, non_blocking=True)
            with autocast_context(device, mixed_precision):
                outputs = model(images)
                losses = detection_loss(outputs, targets, strides=strides, ranges=regression_ranges)
                scaled_loss = losses["total"] / accumulation_steps
            if not torch.isfinite(losses["total"]):
                raise RuntimeError("Non-finite loss detected; aborting training.")

            scaler.scale(scaled_loss).backward()
            should_step = batch_index % accumulation_steps == 0 or batch_index == len(train_loader)
            if should_step:
                scaler.unscale_(optimizer)
                torch.nn.utils.clip_grad_norm_(optimizer_parameters(model), float(training_cfg["gradient_clip_norm"]))
                scaler.step(optimizer)
                scaler.update()
                optimizer.zero_grad(set_to_none=True)
                optimizer_step += 1

            global_step += 1
            if global_step % int(training_cfg["log_every_steps"]) == 0:
                effective_batch = int(training_cfg["batch_size"]) * accumulation_steps
                print(
                    f"epoch={epoch} step={global_step} opt_step={optimizer_step} loss={losses['total'].item():.4f} "
                    f"cls={losses['classification'].item():.4f} reg={losses['regression'].item():.4f} "
                    f"ctr={losses['centerness'].item():.4f} positives={int(losses['positive_count'].item())} "
                    f"effective_batch={effective_batch} step_time={time.perf_counter() - start:.2f}s"
                )
            if mode == "tiny-overfit" and global_step >= 1000:
                break
        payload = {
            "epoch": epoch,
            "global_step": global_step,
            "optimizer_step": optimizer_step,
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
