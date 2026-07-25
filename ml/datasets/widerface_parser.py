from __future__ import annotations

from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Iterable

from ml.utils.paths import robust_existing_file


IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png"}


@dataclass
class WiderFaceBox:
    x1: float
    y1: float
    x2: float
    y2: float
    width: float
    height: float
    blur: int
    expression: int
    illumination: int
    invalid: int
    occlusion: int
    pose: int

    def to_dict(self) -> dict[str, float | int]:
        return asdict(self)


@dataclass
class WiderFaceRecord:
    relative_path: str
    boxes: list[WiderFaceBox]


def is_image_path_line(line: str) -> bool:
    suffix = Path(line.strip()).suffix.lower()
    return suffix in IMAGE_SUFFIXES and "/" in line.strip() or suffix in IMAGE_SUFFIXES and "\\" in line.strip()


def normalize_annotation_path(relative_path: str) -> Path:
    return Path(relative_path.strip().replace("\\", "/"))


def resolve_image_path(images_root: str | Path, relative_path: str) -> Path:
    # WIDER annotations use forward slashes. pathlib handles each part safely on Windows.
    parts = normalize_annotation_path(relative_path).parts
    return Path(images_root).joinpath(*parts)


def parse_box_row(row: str) -> WiderFaceBox:
    parts = row.strip().split()
    if len(parts) < 10:
        raise ValueError(f"Malformed WIDER FACE annotation row: {row!r}")
    x, y, width, height = [float(value) for value in parts[:4]]
    flags = [int(float(value)) for value in parts[4:10]]
    return WiderFaceBox(
        x1=x,
        y1=y,
        x2=x + width,
        y2=y + height,
        width=width,
        height=height,
        blur=flags[0],
        expression=flags[1],
        illumination=flags[2],
        invalid=flags[3],
        occlusion=flags[4],
        pose=flags[5],
    )


def parse_widerface_annotations(path: str | Path) -> tuple[list[WiderFaceRecord], list[str]]:
    annotation_path = robust_existing_file(path)
    lines = annotation_path.read_text(encoding="utf-8", errors="replace").splitlines()
    records: list[WiderFaceRecord] = []
    malformed: list[str] = []
    index = 0
    while index < len(lines):
        relative_path = lines[index].strip()
        index += 1
        if not relative_path:
            continue
        if not is_image_path_line(relative_path):
            malformed.append(f"Expected image path at line {index}: {relative_path!r}")
            continue
        if index >= len(lines):
            malformed.append(f"Missing face count for {relative_path}")
            break
        try:
            face_count = int(float(lines[index].strip()))
        except ValueError:
            malformed.append(f"Invalid face count for {relative_path}: {lines[index]!r}")
            break
        index += 1
        boxes: list[WiderFaceBox] = []
        consumed = 0
        while consumed < face_count and index < len(lines):
            candidate = lines[index].strip()
            if is_image_path_line(candidate):
                # Some zero-face variants include a placeholder row despite count mismatch.
                malformed.append(f"Parser resync before expected boxes for {relative_path}")
                break
            try:
                boxes.append(parse_box_row(candidate))
            except ValueError as exc:
                malformed.append(str(exc))
            consumed += 1
            index += 1
        # Official variants with zero faces may include a placeholder row. Skip it only when safe.
        if face_count == 0 and index < len(lines) and not is_image_path_line(lines[index].strip()):
            maybe_placeholder = lines[index].strip().split()
            if len(maybe_placeholder) >= 4:
                index += 1
        records.append(WiderFaceRecord(relative_path=relative_path, boxes=boxes))
    return records, malformed


def count_images(root: str | Path) -> int:
    path = Path(root)
    if not path.exists():
        return 0
    return sum(1 for item in path.rglob("*") if item.suffix.lower() in IMAGE_SUFFIXES)


def find_duplicate_entries(records: Iterable[WiderFaceRecord]) -> list[str]:
    seen: set[str] = set()
    duplicates: list[str] = []
    for record in records:
        if record.relative_path in seen:
            duplicates.append(record.relative_path)
        seen.add(record.relative_path)
    return duplicates
