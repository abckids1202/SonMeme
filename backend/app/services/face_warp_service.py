from __future__ import annotations

from typing import Any, Iterable

import cv2
import numpy as np
from PIL import Image


GRID_SIZE = 4


def mesh_triangles(mesh: list[dict[str, float]]) -> list[tuple[tuple[int, int, int], tuple[int, int, int]]]:
    if len(mesh) != GRID_SIZE * GRID_SIZE:
        raise ValueError("The Son face mesh must contain exactly 16 points.")
    triangles: list[tuple[tuple[int, int, int], tuple[int, int, int]]] = []
    for row in range(GRID_SIZE - 1):
        for column in range(GRID_SIZE - 1):
            top_left = row * GRID_SIZE + column
            top_right = top_left + 1
            bottom_left = top_left + GRID_SIZE
            bottom_right = bottom_left + 1
            triangles.append(((top_left, top_right, bottom_right), (top_left, bottom_right, bottom_left)))
    return triangles


def _point(item: dict[str, Any], prefix: str) -> tuple[float, float]:
    try:
        return float(item[f"{prefix}X"]), float(item[f"{prefix}Y"])
    except (KeyError, TypeError, ValueError) as exc:
        raise ValueError("Mesh points must contain numeric sourceX/sourceY/targetX/targetY values.") from exc


def _normalised_polygon(points: Iterable[dict[str, Any]]) -> np.ndarray | None:
    values: list[tuple[float, float]] = []
    for item in points:
        try:
            values.append((float(item["x"]), float(item["y"])))
        except (KeyError, TypeError, ValueError) as exc:
            raise ValueError("Mask points must contain numeric x/y values.") from exc
    if len(values) < 3:
        return None
    return np.asarray(values, dtype=np.float32)


def _alpha_composite(destination: np.ndarray, source: np.ndarray) -> None:
    source_alpha = source[:, :, 3].astype(np.float32) / 255.0
    destination_alpha = destination[:, :, 3].astype(np.float32) / 255.0
    output_alpha = source_alpha + destination_alpha * (1.0 - source_alpha)
    denominator = np.maximum(output_alpha, 1e-6)
    destination[:, :, :3] = (
        source[:, :, :3].astype(np.float32) * source_alpha[:, :, None]
        + destination[:, :, :3].astype(np.float32) * destination_alpha[:, :, None] * (1.0 - source_alpha[:, :, None])
    ) / denominator[:, :, None]
    destination[:, :, 3] = np.clip(output_alpha * 255.0, 0, 255).astype(np.uint8)


def warp_rgba(
    source: Image.Image,
    mesh: list[dict[str, float]],
    mask: list[dict[str, float]] | None = None,
    output_size: tuple[int, int] = (256, 256),
    feather: float = 5,
) -> Image.Image:
    """Warp a transparent face asset through a 4x4 piecewise-affine mesh."""
    output_width, output_height = output_size
    if output_width < 2 or output_height < 2 or output_width > 2048 or output_height > 2048:
        raise ValueError("Warp output dimensions must be between 2 and 2048 pixels.")
    source_pixels = np.asarray(source.convert("RGBA").resize((output_width, output_height), Image.Resampling.LANCZOS))
    destination = np.zeros((output_height, output_width, 4), dtype=np.uint8)
    triangles = mesh_triangles(mesh)

    for first, second in triangles:
        for triangle in (first, second):
            source_points = np.asarray([_point(mesh[index], "source") for index in triangle], dtype=np.float32)
            target_points = np.asarray([_point(mesh[index], "target") for index in triangle], dtype=np.float32)
            source_points[:, 0] *= output_width - 1
            source_points[:, 1] *= output_height - 1
            target_points[:, 0] *= output_width - 1
            target_points[:, 1] *= output_height - 1
            affine = cv2.getAffineTransform(source_points, target_points)
            warped = cv2.warpAffine(
                source_pixels,
                affine,
                (output_width, output_height),
                flags=cv2.INTER_LINEAR,
                borderMode=cv2.BORDER_CONSTANT,
                borderValue=(0, 0, 0, 0),
            )
            triangle_mask = np.zeros((output_height, output_width), dtype=np.uint8)
            cv2.fillConvexPoly(triangle_mask, np.round(target_points).astype(np.int32), 255)
            triangle_mask = cv2.dilate(triangle_mask, np.ones((3, 3), dtype=np.uint8))
            warped[:, :, 3] = np.minimum(warped[:, :, 3], triangle_mask)
            _alpha_composite(destination, warped)

    polygon = _normalised_polygon(mask or [])
    if polygon is not None:
        polygon[:, 0] *= output_width - 1
        polygon[:, 1] *= output_height - 1
        alpha_mask = np.zeros((output_height, output_width), dtype=np.uint8)
        cv2.fillPoly(alpha_mask, [np.round(polygon).astype(np.int32)], 255)
        blur_radius = max(0, min(40, int(round(feather))))
        if blur_radius:
            kernel = blur_radius * 2 + 1
            alpha_mask = cv2.GaussianBlur(alpha_mask, (kernel, kernel), 0)
        destination[:, :, 3] = ((destination[:, :, 3].astype(np.float32) / 255.0) * (alpha_mask.astype(np.float32) / 255.0) * 255.0).astype(np.uint8)

    return Image.fromarray(destination, mode="RGBA")
