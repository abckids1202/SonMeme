from fastapi.testclient import TestClient

from app.main import create_app


def test_health_endpoint_reports_model_availability() -> None:
    with TestClient(create_app()) as client:
        response = client.get("/api/v1/health")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "healthy"
    assert body["runtime"] in {"pytorch", "onnx"}
    assert set(body["models"]) == {"detector", "landmarks", "generator"}
    assert "metadata" in body
