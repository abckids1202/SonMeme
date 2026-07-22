from app.config import Settings


def test_frontend_origins_parse_comma_separated_string() -> None:
    settings = Settings(frontend_origins="http://localhost:5173,http://127.0.0.1:5173")

    assert settings.frontend_origins == ["http://localhost:5173", "http://127.0.0.1:5173"]


def test_default_upload_limit_is_15_mb() -> None:
    assert Settings().max_upload_mb == 15
