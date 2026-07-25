from __future__ import annotations

import sys
from pathlib import Path

from ml.datasets.widerface_parser import count_images, find_duplicate_entries, parse_widerface_annotations, resolve_image_path
from ml.utils.config import load_config
from ml.utils.paths import robust_existing_file


def line(ok: bool, message: str) -> bool:
    print(f"[{'PASS' if ok else 'FAIL'}] {message}")
    return ok


def main() -> int:
    cfg = load_config()
    paths = cfg["paths"]
    print("WIDER FACE Verification")
    print("=======================")
    print()
    checks: list[bool] = []
    project_root = Path(paths["project_root"])
    train_root = Path(paths["train_images"])
    val_root = Path(paths["val_images"])
    test_root = Path(paths["test_images"])
    train_ann = robust_existing_file(paths["train_annotations"])
    val_ann = robust_existing_file(paths["val_annotations"])

    checks.append(line(project_root.exists(), "Project root found"))
    checks.append(line(train_root.exists(), "Train image root found"))
    checks.append(line(val_root.exists(), "Validation image root found"))
    if test_root.exists():
        checks.append(line(True, "Test image root found"))
    else:
        print("[WARN] Test image root not found; this is okay for supervised training")
    checks.append(line(train_ann.exists(), "Train annotations found"))
    checks.append(line(val_ann.exists(), "Validation annotations found"))
    print()

    train_records, train_malformed = parse_widerface_annotations(train_ann) if train_ann.exists() else ([], ["missing train annotations"])
    val_records, val_malformed = parse_widerface_annotations(val_ann) if val_ann.exists() else ([], ["missing val annotations"])
    train_images = count_images(train_root)
    val_images = count_images(val_root)
    train_missing = [r.relative_path for r in train_records if not resolve_image_path(train_root, r.relative_path).exists()]
    val_missing = [r.relative_path for r in val_records if not resolve_image_path(val_root, r.relative_path).exists()]
    train_dupes = find_duplicate_entries(train_records)
    val_dupes = find_duplicate_entries(val_records)
    malformed = train_malformed + val_malformed

    print(f"Train images on disk: {train_images}")
    print(f"Train annotation entries: {len(train_records)}")
    print()
    print(f"Validation images on disk: {val_images}")
    print(f"Validation annotation entries: {len(val_records)}")
    print()
    print(f"Missing train images: {len(train_missing)}")
    print(f"Missing validation images: {len(val_missing)}")
    print(f"Duplicate train entries: {len(train_dupes)}")
    print(f"Duplicate validation entries: {len(val_dupes)}")
    print(f"Malformed entries: {len(malformed)}")
    print()
    print("First five resolved train image paths:")
    for record in train_records[:5]:
        print(f"  {resolve_image_path(train_root, record.relative_path)}")
    print()

    checks.extend([
        line(12000 <= train_images <= 13500, "Train image count is approximately 12,880"),
        line(3000 <= val_images <= 3500, "Validation image count is approximately 3,226"),
        line(len(train_records) > 0, "Train annotation entries parsed"),
        line(len(val_records) > 0, "Validation annotation entries parsed"),
        line(len(train_missing) == 0, "No missing train images"),
        line(len(val_missing) == 0, "No missing validation images"),
        line(len(train_dupes) == 0, "No duplicate train entries"),
        line(len(val_dupes) == 0, "No duplicate validation entries"),
        line(len(malformed) == 0, "No malformed annotation rows"),
    ])

    if all(checks):
        print("\nVERDICT: DATASET STRUCTURE IS READY")
        return 0
    print("\nVERDICT: DATASET STRUCTURE NEEDS ATTENTION")
    for item in malformed[:10]:
        print(f"  malformed: {item}")
    for item in train_missing[:10]:
        print(f"  missing train: {item}")
    for item in val_missing[:10]:
        print(f"  missing val: {item}")
    return 1


if __name__ == "__main__":
    sys.exit(main())
