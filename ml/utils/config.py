from __future__ import annotations

from copy import deepcopy
from pathlib import Path
from typing import Any

import yaml

from ml.utils.paths import DEFAULT_CONFIG, PROJECT_ROOT, robust_existing_file


def deep_update(base: dict[str, Any], override: dict[str, Any]) -> dict[str, Any]:
    result = deepcopy(base)
    for key, value in override.items():
        if isinstance(value, dict) and isinstance(result.get(key), dict):
            result[key] = deep_update(result[key], value)
        elif key != "extends":
            result[key] = value
    return result


def load_config(path: str | Path | None = None) -> dict[str, Any]:
    config_path = Path(path) if path else DEFAULT_CONFIG
    if not config_path.is_absolute():
        config_path = PROJECT_ROOT / config_path
    with config_path.open("r", encoding="utf-8") as handle:
        config = yaml.safe_load(handle) or {}
    if "extends" in config:
        parent = config_path.parent / str(config["extends"])
        if not parent.exists():
            parent = DEFAULT_CONFIG
        config = deep_update(load_config(parent), config)
    paths = config.setdefault("paths", {})
    for key, value in list(paths.items()):
        if isinstance(value, str):
            paths[key] = str(Path(value))
    for annotation_key in ("train_annotations", "val_annotations"):
        if annotation_key in paths:
            paths[annotation_key] = str(robust_existing_file(paths[annotation_key]))
    return config
