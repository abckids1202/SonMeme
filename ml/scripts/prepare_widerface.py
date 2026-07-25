from __future__ import annotations

import argparse
import json
import statistics
import sys
from pathlib import Path
from typing import Any

from PIL import Image, ImageOps
from tqdm import tqdm

from ml.datasets.manifests import write_json, write_jsonl
from ml.datasets.widerface_parser import WiderFaceBox, parse_widerface_annotations, resolve_image_path
from ml.utils.config import load_config
from ml.utils.paths import robust_existing_file


def percentile(values: list[float], p: float) -> float:
    if not values:
        return 0.0
    values = sorted(values)
    k = (len(values) - 1) * p
    lo = int(k)
    hi = min(lo + 1, len(values) - 1)
    if lo == hi:
        return float(values[lo])
    return float(values[lo] * (hi - k) + values[hi] * (k - lo))


def clip_box(box: WiderFaceBox, width: int, height: int) -> tuple[dict[str, Any] | None, bool, str | None]:
    x1 = max(0.0, min(float(width), box.x1))
    y1 = max(0.0, min(float(height), box.y1))
    x2 = max(0.0, min(float(width), box.x2))
    y2 = max(0.0, min(float(height), box.y2))
    clipped = (x1, y1, x2, y2) != (box.x1, box.y1, box.x2, box.y2)
    if x2 <= x1 or y2 <= y1:
        return None, clipped, "zero_area_after_clipping"
    result = box.to_dict()
    result.update({"x1": x1, "y1": y1, "x2": x2, "y2": y2, "width": x2 - x1, "height": y2 - y1, "clipped": clipped})
    return result, clipped, None


def stats(rows: list[dict[str, Any]], raw_boxes: int, invalid: int, clipped: int, zero_area: int, missing: int, unreadable: int) -> dict[str, Any]:
    counts = [len(row["boxes"]) for row in rows]
    widths = [box["x2"] - box["x1"] for row in rows for box in row["boxes"]]
    heights = [box["y2"] - box["y1"] for row in rows for box in row["boxes"]]
    areas = [w * h for w, h in zip(widths, heights)]
    ratios = [w / h for w, h in zip(widths, heights) if h > 0]
    max_sides = [max(w, h) for w, h in zip(widths, heights)]
    size_groups = {
        "tiny": sum(1 for side in max_sides if side < 16),
        "small": sum(1 for side in max_sides if 16 <= side < 32),
        "medium": sum(1 for side in max_sides if 32 <= side < 96),
        "large": sum(1 for side in max_sides if side >= 96),
    }
    distributions: dict[str, dict[str, int]] = {"blur": {}, "occlusion": {}, "pose": {}, "illumination": {}}
    for row in rows:
        for box in row["boxes"]:
            for key in distributions:
                value = str(box.get(key, 0))
                distributions[key][value] = distributions[key].get(value, 0) + 1
    return {
        "images": len(rows),
        "annotation_entries": len(rows),
        "total_raw_boxes": raw_boxes,
        "total_valid_boxes": sum(counts),
        "total_invalid_flagged_boxes": invalid,
        "total_clipped_boxes": clipped,
        "total_zero_area_boxes": zero_area,
        "total_missing_images": missing,
        "total_unreadable_images": unreadable,
        "images_with_zero_valid_faces": sum(1 for count in counts if count == 0),
        "mean_faces_per_image": statistics.mean(counts) if counts else 0,
        "median_faces_per_image": statistics.median(counts) if counts else 0,
        "maximum_faces_in_one_image": max(counts) if counts else 0,
        "box_width_percentiles": {str(p): percentile(widths, p / 100) for p in [1, 5, 25, 50, 75, 95, 99]},
        "box_height_percentiles": {str(p): percentile(heights, p / 100) for p in [1, 5, 25, 50, 75, 95, 99]},
        "box_area_percentiles": {str(p): percentile(areas, p / 100) for p in [1, 5, 25, 50, 75, 95, 99]},
        "aspect_ratio_percentiles": {str(p): percentile(ratios, p / 100) for p in [1, 5, 25, 50, 75, 95, 99]},
        "diagnostic_size_groups": size_groups,
        "diagnostic_size_note": "Project diagnostics only; not official WIDER difficulty groups.",
        **{f"{key}_distribution": value for key, value in distributions.items()},
    }


def process_split(name: str, images_root: Path, annotations: Path, processed_root: Path) -> dict[str, Any]:
    records, malformed = parse_widerface_annotations(annotations)
    rows: list[dict[str, Any]] = []
    excluded: list[dict[str, Any]] = []
    missing: list[dict[str, Any]] = []
    unreadable: list[dict[str, Any]] = []
    raw_boxes = invalid = clipped = zero_area = 0
    for record in tqdm(records, desc=f"Preparing {name}"):
        image_path = resolve_image_path(images_root, record.relative_path)
        if not image_path.exists():
            missing.append({"split": name, "relative_path": record.relative_path, "absolute_path": str(image_path)})
            continue
        try:
            with Image.open(image_path) as image:
                image = ImageOps.exif_transpose(image)
                width, height = image.size
        except Exception as exc:
            unreadable.append({"split": name, "relative_path": record.relative_path, "absolute_path": str(image_path), "error": str(exc)})
            continue
        boxes: list[dict[str, Any]] = []
        raw_boxes += len(record.boxes)
        for box in record.boxes:
            if box.invalid == 1:
                invalid += 1
                excluded.append({"split": name, "relative_path": record.relative_path, "reason": "invalid_flag", "box": box.to_dict()})
                continue
            clipped_box, was_clipped, reason = clip_box(box, width, height)
            if was_clipped:
                clipped += 1
            if reason:
                zero_area += 1
                excluded.append({"split": name, "relative_path": record.relative_path, "reason": reason, "box": box.to_dict()})
                continue
            if clipped_box:
                boxes.append(clipped_box)
        rows.append({
            "image_id": str(Path(record.relative_path).with_suffix("")).replace("\\", "/"),
            "relative_path": record.relative_path.replace("\\", "/"),
            "absolute_path": image_path.as_posix(),
            "width": width,
            "height": height,
            "boxes": boxes,
        })
    manifest_dir = processed_root / "manifests"
    reports_dir = processed_root / "reports"
    write_jsonl(manifest_dir / f"{name}.jsonl", rows)
    write_json(reports_dir / f"{name}_statistics.json", stats(rows, raw_boxes, invalid, clipped, zero_area, len(missing), len(unreadable)))
    return {"rows": rows, "excluded": excluded, "missing": missing, "unreadable": unreadable, "malformed": malformed}


def mark_validated(processed_root: Path) -> int:
    answer = input("Have you manually inspected the generated annotation previews? [y/N] ").strip().lower()
    if answer != "y":
        print("Not marking dataset as validated.")
        return 1
    marker = processed_root / ".validated"
    marker.parent.mkdir(parents=True, exist_ok=True)
    marker.write_text("validated by user\n", encoding="utf-8")
    print(f"Created {marker}")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", default="ml/configs/detector/widerface_fcos_mnv3_640.yaml")
    parser.add_argument("--mark-validated", action="store_true")
    args = parser.parse_args()
    cfg = load_config(args.config)
    paths = cfg["paths"]
    processed_root = Path(paths["processed_root"])
    if args.mark_validated:
        return mark_validated(processed_root)
    processed_root.mkdir(parents=True, exist_ok=True)
    result_train = process_split("train", Path(paths["train_images"]), robust_existing_file(paths["train_annotations"]), processed_root)
    result_val = process_split("val", Path(paths["val_images"]), robust_existing_file(paths["val_annotations"]), processed_root)
    reports_dir = processed_root / "reports"
    write_jsonl(reports_dir / "excluded_boxes.jsonl", result_train["excluded"] + result_val["excluded"])
    write_jsonl(reports_dir / "missing_images.jsonl", result_train["missing"] + result_val["missing"])
    write_jsonl(reports_dir / "unreadable_images.jsonl", result_train["unreadable"] + result_val["unreadable"])
    write_jsonl(reports_dir / "malformed_annotations.jsonl", [{"message": item} for item in result_train["malformed"] + result_val["malformed"]])
    print(f"Wrote manifests and reports under {processed_root}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
