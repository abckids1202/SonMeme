import numpy as np
import torch
from PIL import Image

from ml.datasets.collate import detection_collate
from ml.losses.focal_loss import sigmoid_focal_loss
from ml.losses.iou_loss import giou_loss
from ml.preprocessing.augmentations import horizontal_flip
from ml.preprocessing.letterbox import inverse_letterbox_boxes, letterbox


def test_letterbox_landscape_and_inverse() -> None:
    image = Image.new("RGB", (800, 400))
    boxes = np.array([[100, 50, 300, 150]], dtype="float32")
    result = letterbox(image, boxes, (640, 640))
    restored = inverse_letterbox_boxes(result.boxes, result.scale, result.padding, result.original_size)
    assert np.allclose(restored, boxes, atol=1.0)


def test_horizontal_flip_updates_boxes() -> None:
    image = Image.new("RGB", (100, 50))
    boxes = np.array([[10, 5, 30, 25]], dtype="float32")
    _, flipped = horizontal_flip(image, boxes)
    assert flipped.tolist() == [[70.0, 5.0, 90.0, 25.0]]


def test_collate_allows_empty_targets() -> None:
    image = torch.zeros(3, 10, 10)
    target = {"boxes": torch.zeros(0, 4)}
    images, targets = detection_collate([(image, target)])
    assert images.shape == (1, 3, 10, 10)
    assert targets[0]["boxes"].shape == (0, 4)


def test_losses_are_finite() -> None:
    focal = sigmoid_focal_loss(torch.tensor([0.0]), torch.tensor([1.0]))
    giou = giou_loss(torch.tensor([[0.0, 0.0, 10.0, 10.0]]), torch.tensor([[1.0, 1.0, 9.0, 9.0]]))
    assert torch.isfinite(focal).all()
    assert torch.isfinite(giou).all()
