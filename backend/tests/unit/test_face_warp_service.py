from __future__ import annotations

import numpy as np
from PIL import Image

from app.services.face_warp_service import warp_rgba


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
