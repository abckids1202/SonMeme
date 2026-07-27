from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw

from ml.inference.detector import DetectorPredictor
from ml.utils.config import load_config

def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", default="ml/configs/detector/widerface_fcos_mnv3_416.yaml")
    parser.add_argument("--checkpoint", required=True)
    parser.add_argument("--split", choices=["train", "val"], default="val")
    parser.add_argument("--count", type=int, default=100)
    parser.add_argument("--input-dir")
    args = parser.parse_args()
    config = load_config(args.config)
    predictor = DetectorPredictor(args.config, args.checkpoint)
    if args.input_dir:
        image_paths = sorted(
            path for path in Path(args.input_dir).iterdir()
            if path.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"}
        )[: args.count]
        output_dir = Path(config["paths"]["run_root"]) / "prediction_previews" / Path(args.input_dir).name
    else:
        manifest = Path(config["paths"]["processed_root"]) / "manifests" / f"{args.split}.jsonl"
        rows = [json.loads(line) for line in manifest.read_text(encoding="utf-8").splitlines() if line.strip()]
        image_paths = [Path(row["absolute_path"]) for row in rows[: args.count]]
        output_dir = Path(config["paths"]["run_root"]) / "prediction_previews" / args.split
    output_dir.mkdir(parents=True, exist_ok=True)
    report = []
    for image_path in image_paths:
        image = Image.open(image_path).convert("RGB")
        prediction = predictor.predict(image)
        preview = image.copy()
        draw = ImageDraw.Draw(preview)
        for index, face in enumerate(prediction["faces"], start=1):
            box = face["bboxPixels"]
            xyxy = (box["x"], box["y"], box["x"] + box["width"], box["y"] + box["height"])
            draw.rectangle(xyxy, outline="#ffd166", width=max(2, image.width // 400))
            draw.text((xyxy[0] + 4, xyxy[1] + 4), f"{index} {face['confidence']:.2f}", fill="#ffd166")
        output_path = output_dir / f"{image_path.stem}_pred.jpg"
        preview.save(output_path, quality=92)
        report.append({"image": str(image_path), "preview": str(output_path), "faces": prediction["faces"], "timingMs": prediction["timingMs"]})
    report_path = output_dir / "predictions.json"
    report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(f"Inspected {len(report)} images with {args.checkpoint}")
    print(f"Saved annotated previews to {output_dir}")
    print(f"Saved prediction report to {report_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
