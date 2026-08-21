from pathlib import Path

from PIL import Image

from app.services.face_analyzer import FaceAnalyzer


def test_production_analyzer_returns_full_face_bounds_and_landmarks() -> None:
    image_path = Path(__file__).resolve().parents[3] / "frontend" / "src" / "assets" / "anthony-mackie-face.png"
    result = FaceAnalyzer().detect(Image.open(image_path))

    assert result["model"]["production"] is True
    assert result["faces"]
    face = result["faces"][0]
    assert face["bbox"]["width"] > 0.25
    assert face["bbox"]["height"] > 0.25
    assert face["landmarks"]["left_eye"]
    assert 0 <= face["bbox"]["x"] <= 1
    assert 0 <= face["bbox"]["y"] <= 1
    assert face["bbox"]["x"] + face["bbox"]["width"] <= 1
    assert face["bbox"]["y"] + face["bbox"]["height"] <= 1
