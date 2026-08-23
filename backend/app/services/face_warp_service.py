from __future__ import annotations

from typing import Any, Iterable

import cv2
import numpy as np
from PIL import Image


GRID_SIZE = 4
SEMANTIC_IDS = (
    "foreheadCenter", "leftTemple", "rightTemple", "leftEye", "rightEye", "nose",
    "leftMouth", "rightMouth", "leftJaw", "rightJaw", "chin",
)


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


def _tps_kernel(distance_squared: np.ndarray) -> np.ndarray:
    return distance_squared * np.log(np.maximum(distance_squared, 1e-12))


def _tps_parameters(domain: np.ndarray, destination: np.ndarray, regularization: float = 1e-5) -> np.ndarray:
    if domain.shape != destination.shape or domain.ndim != 2 or domain.shape[1] != 2 or len(domain) < 3:
        raise ValueError("TPS controls must contain matching x/y point arrays.")
    differences = domain[:, None, :] - domain[None, :, :]
    kernel = _tps_kernel(np.sum(differences * differences, axis=2))
    affine = np.concatenate([np.ones((len(domain), 1), dtype=np.float64), domain], axis=1)
    system = np.zeros((len(domain) + 3, len(domain) + 3), dtype=np.float64)
    system[:len(domain), :len(domain)] = kernel + np.eye(len(domain), dtype=np.float64) * regularization
    system[:len(domain), len(domain):] = affine
    system[len(domain):, :len(domain)] = affine.T
    values = np.concatenate([destination, np.zeros((3, 2), dtype=np.float64)], axis=0)
    try:
        return np.linalg.solve(system, values)
    except np.linalg.LinAlgError:
        return np.linalg.lstsq(system, values, rcond=None)[0]


def _tps_evaluate(points: np.ndarray, domain: np.ndarray, parameters: np.ndarray) -> np.ndarray:
    differences = points[:, None, :] - domain[None, :, :]
    kernel = _tps_kernel(np.sum(differences * differences, axis=2))
    affine = np.concatenate([np.ones((len(points), 1), dtype=np.float64), points], axis=1)
    return np.concatenate([kernel, affine], axis=1) @ parameters


def _semantic_points(semantic: dict[str, Any]) -> tuple[np.ndarray, np.ndarray]:
    if not isinstance(semantic, dict):
        raise ValueError("Semantic controls must be an object.")
    source: list[tuple[float, float]] = []
    target: list[tuple[float, float]] = []
    for name in SEMANTIC_IDS:
        item = semantic.get(name)
        if not isinstance(item, dict) or not isinstance(item.get("source"), dict) or not isinstance(item.get("target"), dict):
            raise ValueError(f"Missing semantic control: {name}.")
        try:
            source.append((float(item["source"]["x"]), float(item["source"]["y"])))
            target.append((float(item["target"]["x"]), float(item["target"]["y"])))
        except (KeyError, TypeError, ValueError) as exc:
            raise ValueError(f"Invalid semantic control: {name}.") from exc
    source_points = np.clip(np.asarray(source, dtype=np.float64), 0.0, 1.0)
    target_points = np.clip(np.asarray(target, dtype=np.float64), 0.0, 1.0)
    if np.ptp(target_points[:, 0]) < 0.08 or np.ptp(target_points[:, 1]) < 0.08:
        raise ValueError("Semantic controls collapse into a narrow region.")
    return source_points, target_points


def _liquify_offset_grid(liquify: dict[str, Any] | None, points: np.ndarray) -> np.ndarray:
    if not liquify:
        return np.zeros_like(points)
    try:
        grid_size = int(liquify.get("gridSize", 16))
        raw_offsets = liquify.get("offsets", [])
        if isinstance(raw_offsets, list) and raw_offsets and isinstance(raw_offsets[0], dict):
            raw_offsets = [[float(item.get("x", 0)), float(item.get("y", 0))] for item in raw_offsets]
        offsets = np.asarray(raw_offsets, dtype=np.float64).reshape((grid_size, grid_size, 2))
    except (AttributeError, TypeError, ValueError) as exc:
        raise ValueError("Liquify offsets must be a square grid of x/y values.") from exc
    if grid_size < 2 or grid_size > 32:
        raise ValueError("Liquify grid size must be between 2 and 32.")
    gx = np.clip(points[:, 0] * (grid_size - 1), 0, grid_size - 1)
    gy = np.clip(points[:, 1] * (grid_size - 1), 0, grid_size - 1)
    x0 = np.floor(gx).astype(np.int32)
    y0 = np.floor(gy).astype(np.int32)
    x1 = np.minimum(x0 + 1, grid_size - 1)
    y1 = np.minimum(y0 + 1, grid_size - 1)
    tx = (gx - x0)[:, None]
    ty = (gy - y0)[:, None]
    top = offsets[y0, x0] * (1 - tx) + offsets[y0, x1] * tx
    bottom = offsets[y1, x0] * (1 - tx) + offsets[y1, x1] * tx
    return np.clip(top * (1 - ty) + bottom * ty, -0.45, 0.45)


def warp_semantic_rgba(
    source: Image.Image,
    semantic: dict[str, Any],
    liquify: dict[str, Any] | None = None,
    mask: list[dict[str, float]] | None = None,
    output_size: tuple[int, int] = (256, 256),
    feather: float = 5,
) -> Image.Image:
    """Render a face with semantic TPS controls, boundary stabilization, liquify, and mask."""
    output_width, output_height = output_size
    if output_width < 2 or output_height < 2 or output_width > 2048 or output_height > 2048:
        raise ValueError("Warp output dimensions must be between 2 and 2048 pixels.")
    source_points, target_points = _semantic_points(semantic)
    boundary = np.asarray([
        [0.0, 0.0], [0.5, 0.0], [1.0, 0.0], [1.0, 0.5],
        [1.0, 1.0], [0.5, 1.0], [0.0, 1.0], [0.0, 0.5],
    ], dtype=np.float64)
    # Boundary controls stop local face edits from creating a stretched strip at the canvas edge.
    domain = np.concatenate([target_points, boundary], axis=0)
    destination = np.concatenate([source_points, boundary], axis=0)
    parameters = _tps_parameters(domain, destination)

    source_pixels = np.asarray(source.convert("RGBA").resize((output_width, output_height), Image.Resampling.LANCZOS))
    yy, xx = np.mgrid[0:output_height, 0:output_width]
    output_points = np.column_stack((xx.reshape(-1) / max(1, output_width - 1), yy.reshape(-1) / max(1, output_height - 1)))
    # Liquify is applied in the fitted face's local target space before inverse TPS sampling.
    fitted_points = np.clip(output_points - _liquify_offset_grid(liquify, output_points), 0.0, 1.0)
    sample_points = np.clip(_tps_evaluate(fitted_points, domain, parameters), 0.0, 1.0)
    map_x = (sample_points[:, 0] * (output_width - 1)).reshape((output_height, output_width)).astype(np.float32)
    map_y = (sample_points[:, 1] * (output_height - 1)).reshape((output_height, output_width)).astype(np.float32)
    destination_pixels = cv2.remap(source_pixels, map_x, map_y, cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=(0, 0, 0, 0))

    polygon = _normalised_polygon(mask or [])
    if polygon is not None:
        polygon[:, 0] *= output_width - 1
        polygon[:, 1] *= output_height - 1
        alpha_mask = np.zeros((output_height, output_width), dtype=np.uint8)
        cv2.fillPoly(alpha_mask, [np.round(polygon).astype(np.int32)], 255)
        blur_radius = max(0, min(40, int(round(feather))))
        if blur_radius:
            alpha_mask = cv2.GaussianBlur(alpha_mask, (blur_radius * 2 + 1, blur_radius * 2 + 1), 0)
        destination_pixels[:, :, 3] = (destination_pixels[:, :, 3].astype(np.float32) * (alpha_mask.astype(np.float32) / 255.0)).astype(np.uint8)
    return Image.fromarray(destination_pixels, mode="RGBA")


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
