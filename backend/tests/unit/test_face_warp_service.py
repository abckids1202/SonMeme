from __future__ import annotations

import numpy as np
from PIL import Image

from app.services.face_warp_service import warp_rgba, warp_semantic_rgba


def regular_mesh():
    return [
        {"sourceX": column / 3, "sourceY": row / 3, "targetX": column / 3, "targetY": row / 3}
        for row in range(4)
        for column in range(4)
    ]


def test_identity_mesh_preserves_rgba_pixels():
    pixels = np.zeros((32, 32, 4), dtype=np.uint8)
    pixels[8:24, 10:22] = (240, 80, 40, 255)
    result = np.asarray(warp_rgba(Image.fromarray(pixels, "RGBA"), regular_mesh(), [], (32, 32), 0))

    assert result.shape == pixels.shape
    assert result[16, 16, 0] > 220
    assert result[0, 0, 3] == 0


def test_mesh_vertex_movement_changes_geometry():
    pixels = np.zeros((32, 32, 4), dtype=np.uint8)
    pixels[8:24, 10:22] = (240, 80, 40, 255)
    mesh = regular_mesh()
    mesh[5]["targetX"] = 0.95
    result = np.asarray(warp_rgba(Image.fromarray(pixels, "RGBA"), mesh, [], (32, 32), 0))

    assert np.count_nonzero(result[:, :, 3]) > 0
    assert result[:, 24:, 3].max() > 0


def test_mask_polygon_controls_alpha_boundary():
    pixels = np.zeros((32, 32, 4), dtype=np.uint8)
    pixels[:, :] = (240, 80, 40, 255)
    mask = [{"x": 0.25, "y": 0.25}, {"x": 0.75, "y": 0.25}, {"x": 0.75, "y": 0.75}, {"x": 0.25, "y": 0.75}]
    result = np.asarray(warp_rgba(Image.fromarray(pixels, "RGBA"), regular_mesh(), mask, (32, 32), 0))

    assert result[16, 16, 3] == 255
    assert result[2, 2, 3] == 0


def semantic_controls():
    names = ["foreheadCenter", "leftTemple", "rightTemple", "leftEye", "rightEye", "nose", "leftMouth", "rightMouth", "leftJaw", "rightJaw", "chin"]
    points = [(0.58, 0.22), (0.27, 0.40), (0.95, 0.45), (0.53, 0.49), (0.83, 0.52), (0.70, 0.71), (0.625, 0.793), (0.758, 0.80), (0.30, 0.79), (0.94, 0.84), (0.59, 0.75)]
    return {name: {"source": {"x": point[0], "y": point[1]}, "target": {"x": point[0], "y": point[1]}} for name, point in zip(names, points)}


def test_semantic_tps_renders_a_stable_rgba_image():
    pixels = np.zeros((48, 48, 4), dtype=np.uint8)
    pixels[10:38, 12:36] = (240, 80, 40, 255)
    result = np.asarray(warp_semantic_rgba(Image.fromarray(pixels, "RGBA"), semantic_controls(), {"gridSize": 16, "offsets": [{"x": 0, "y": 0} for _ in range(256)]}, [], (48, 48), 0))

    assert result.shape == pixels.shape
    assert np.isfinite(result).all()
    assert result[:, :, 3].max() == 255


def test_semantic_tps_and_liquify_change_the_render():
    pixels = np.zeros((48, 48, 4), dtype=np.uint8)
    pixels[14:34, 16:32] = (240, 80, 40, 255)
    controls = semantic_controls()
    controls["nose"]["target"] = {"x": 0.85, "y": 0.48}
    offsets = [{"x": 0.0, "y": 0.0} for _ in range(256)]
    offsets[8 * 16 + 8] = {"x": 0.12, "y": 0.0}
    result = np.asarray(warp_semantic_rgba(Image.fromarray(pixels, "RGBA"), controls, {"gridSize": 16, "offsets": offsets}, [], (48, 48), 0))

    assert np.count_nonzero(result[:, :, 3]) > 0
    assert not np.array_equal(result, pixels)
