from __future__ import annotations

from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_CONFIG = PROJECT_ROOT / "ml" / "configs" / "detector" / "widerface_fcos_mnv3_640.yaml"


def resolve_project_path(value: str | Path) -> Path:
    path = Path(value)
    return path if path.is_absolute() else PROJECT_ROOT / path


def robust_existing_file(path: str | Path) -> Path:
    candidate = resolve_project_path(path)
    candidates = [candidate]
    if candidate.suffix == ".txt":
        candidates.append(candidate.with_suffix(""))
    else:
        candidates.append(candidate.with_suffix(candidate.suffix + ".txt") if candidate.suffix else Path(str(candidate) + ".txt"))
    for item in candidates:
        if item.exists() and item.is_file():
            return item
    return candidate
