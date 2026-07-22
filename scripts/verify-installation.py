from __future__ import annotations

import importlib

REQUIRED = ["fastapi", "pydantic", "pydantic_settings"]

for module in REQUIRED:
    importlib.import_module(module)

print("Sonify backend imports verified.")
