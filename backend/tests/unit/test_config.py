from app.config import Settings


def test_frontend_origins_parse_comma_separated_string() -> None:
    settings = Settings(frontend_origins="http://localhost:5173,http://127.0.0.1:5173")

    assert settings.frontend_origins == ["http://localhost:5173", "http://127.0.0.1:5173"]


def test_frontend_origins_accept_plain_environment_url(monkeypatch) -> None:
    monkeypatch.setenv("FRONTEND_ORIGINS", "https://sonify.vercel.app")
    settings = Settings(_env_file=None)

    assert settings.frontend_origins == ["https://sonify.vercel.app"]


def test_default_upload_limit_is_15_mb() -> None:
    assert Settings().max_upload_mb == 15
