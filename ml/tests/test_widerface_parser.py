from pathlib import Path

from ml.datasets.widerface_parser import parse_box_row, parse_widerface_annotations, resolve_image_path


def test_box_row_converts_xywh_to_xyxy() -> None:
    box = parse_box_row("449 330 122 149 0 0 0 0 0 0")
    assert box.x1 == 449
    assert box.y1 == 330
    assert box.x2 == 571
    assert box.y2 == 479


def test_nested_event_folder_resolution() -> None:
    root = Path("images")
    resolved = resolve_image_path(root, "0--Parade/0_Parade_marchingband_1_849.jpg")
    assert resolved == root / "0--Parade" / "0_Parade_marchingband_1_849.jpg"


def test_zero_face_entry_with_placeholder(tmp_path: Path) -> None:
    path = tmp_path / "ann.txt"
    path.write_text("0--Parade/a.jpg\n0\n0 0 0 0 0 0 0 0 0 0\n1--Handshaking/b.jpg\n1\n1 2 3 4 0 0 0 0 0 0\n")
    records, malformed = parse_widerface_annotations(path)
    assert len(records) == 2
    assert records[0].boxes == []
    assert records[1].boxes[0].x2 == 4
    assert malformed == []
