from __future__ import annotations

import argparse
import random
import sys
from pathlib import Path

from ml.datasets.manifests import read_jsonl
from ml.utils.config import load_config
from ml.visualization.draw_boxes import draw_manifest_sample, make_contact_sheet


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", default="ml/configs/detector/widerface_fcos_mnv3_640.yaml")
    parser.add_argument("--split", choices=["train", "val"], default="train")
    parser.add_argument("--count", type=int, default=100)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()
    cfg = load_config(args.config)
    processed_root = Path(cfg["paths"]["processed_root"])
    manifest = processed_root / "manifests" / f"{args.split}.jsonl"
    if not manifest.exists():
        print(f"Manifest missing: {manifest}. Run python -m ml.scripts.prepare_widerface first.")
        return 1
    rows = read_jsonl(manifest)
    rng = random.Random(args.seed)
    sample = rng.sample(rows, min(args.count, len(rows)))
    output_dir = processed_root / "previews" / args.split
    saved: list[Path] = []
    for index, row in enumerate(sample):
        output = output_dir / f"{index:04d}_{Path(row['relative_path']).stem}.jpg"
        draw_manifest_sample(row, output)
        saved.append(output)
    make_contact_sheet(saved[: min(40, len(saved))], output_dir / "contact_sheet.jpg")
    print(f"Saved {len(saved)} previews to {output_dir}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
