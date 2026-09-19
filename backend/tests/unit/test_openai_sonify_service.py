from app.config import Settings
from app.services.openai_sonify_service import OpenAISonifyService


def test_analysis_parser_keeps_normalized_region() -> None:
    analysis = OpenAISonifyService._parse_analysis(
        '{"target_type":"object","confidence":0.87,"region":{"x":0.1,"y":0.2,"width":0.7,"height":0.6},"description":"A wave."}'
    )
    assert analysis.target_type == "object"
    assert analysis.confidence == 0.87
    assert analysis.region is not None
    assert analysis.region.x == 0.1


def test_analysis_parser_fails_closed_for_non_json() -> None:
    analysis = OpenAISonifyService._parse_analysis("not json")
    assert analysis.target_type == "unknown"
    assert analysis.confidence == 0
    assert analysis.region is None


def test_output_size_is_multiple_of_sixteen() -> None:
    width, height = (int(value) for value in OpenAISonifyService._output_size(487, 512).split("x"))
    assert width % 16 == 0
    assert height % 16 == 0
    assert abs((height / width) - (512 / 487)) < 0.05


def test_capabilities_require_server_key(monkeypatch) -> None:
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    monkeypatch.delenv("SONIFY_OPENAI_API_KEY", raising=False)
    service = OpenAISonifyService(Settings(_env_file=None, openai_api_key=None))
    assert service.configured is False
    assert "OPENAI_API_KEY" in service.capabilities()["message"]
