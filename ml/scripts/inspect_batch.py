from __future__ import annotations

import argparse
import sys
from pathlib import Path

from PIL import ImageDraw
from torch.utils.data import DataLoader

from ml.datasets.collate import detection_collate
from ml.datasets.widerface_dataset import WiderFaceDetectionDataset
from ml.preprocessing.transforms import tensor_to_image
from ml.utils.config import load_config
from ml.visualization.draw_boxes import make_contact_sheet


def draw_target_boxes(image, target):
    draw = ImageDraw.Draw(image)
    for box in target["boxes"].tolist():
        x1, y1, x2, y2 = box
        if x2 > x1 and y2 > y1:
            draw.rectangle((x1, y1, x2, y2), outline=(255, 213, 92), width=3)
    return image


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", default="ml/configs/detector/widerface_fcos_mnv3_640.yaml")
    parser.add_argument("--batches", type=int, default=5)
    args = parser.parse_args()
    cfg = load_config(args.config)
    processed = Path(cfg["paths"]["processed_root"])
    manifest = processed / "manifests" / "train.jsonl"
    if not manifest.exists():
        print("Manifest missing. Run prepare_widerface first.")
        return 1
    dataset = WiderFaceDetectionDataset(manifest, int(cfg["input"]["width"]), augment=False, limit=args.batches * 4)
    loader = DataLoader(dataset, batch_size=4, collate_fn=detection_collate)
    output_dir = processed / "previews" / "batches"
    output_dir.mkdir(parents=True, exist_ok=True)
    saved = []
    for batch_idx, (images, targets) in enumerate(loader):
        box_counts = [len(t["boxes"]) for t in targets]
        print(f"batch={batch_idx} images={tuple(images.shape)} box_counts={box_counts} finite={bool(images.isfinite().all())}")
        for i in range(images.shape[0]):
            image = draw_target_boxes(tensor_to_image(images[i]), targets[i])
            path = output_dir / f"batch_{batch_idx:02d}_{i:02d}.jpg"
            image.save(path)
            saved.append(path)
        if batch_idx + 1 >= args.batches:
            break
    make_contact_sheet(saved, output_dir / "contact_sheet.jpg")
    print(f"Saved batch previews to {output_dir}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
