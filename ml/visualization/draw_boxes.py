from __future__ import annotations

from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw, ImageFont


def draw_manifest_sample(row: dict[str, Any], output_path: str | Path, title: str | None = None) -> None:
    image = Image.open(row["absolute_path"]).convert("RGB")
    draw = ImageDraw.Draw(image)
    try:
        font = ImageFont.truetype("arial.ttf", 18)
    except Exception:
        font = ImageFont.load_default()
    for box in row.get("boxes", []):
        coords = [box["x1"], box["y1"], box["x2"], box["y2"]]
        color = "lime" if not box.get("clipped") else "yellow"
        draw.rectangle(coords, outline=color, width=3)
    label = title or f"{row['relative_path']} | faces: {len(row.get('boxes', []))} | {row['width']}x{row['height']}"
    draw.rectangle([0, 0, min(image.width, 1100), 30], fill=(0, 0, 0))
    draw.text((8, 6), label, fill="white", font=font)
    output = Path(output_path)
    output.parent.mkdir(parents=True, exist_ok=True)
    image.save(output)


def make_contact_sheet(paths: list[Path], output_path: str | Path, thumb_size: tuple[int, int] = (240, 180)) -> None:
    if not paths:
        return
    thumbs = []
    for path in paths:
        image = Image.open(path).convert("RGB")
        image.thumbnail(thumb_size)
        canvas = Image.new("RGB", thumb_size, (20, 20, 20))
        canvas.paste(image, ((thumb_size[0] - image.width) // 2, (thumb_size[1] - image.height) // 2))
        thumbs.append(canvas)
    cols = 4
    rows = (len(thumbs) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * thumb_size[0], rows * thumb_size[1]), (12, 12, 12))
    for i, thumb in enumerate(thumbs):
        sheet.paste(thumb, ((i % cols) * thumb_size[0], (i // cols) * thumb_size[1]))
    output = Path(output_path)
    output.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(output)
