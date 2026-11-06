"""Production health responses must not leak host memory / DB latency."""

from fastapi.testclient import TestClient

from app.core.config import EnvironmentType, settings
from app.main import app


def test_production_health_omits_memory_and_db_latency(monkeypatch):
    monkeypatch.setattr(settings, "ENVIRONMENT", EnvironmentType.PRODUCTION)
    with TestClient(app) as client:
        response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ("healthy", "degraded")
    assert "system_memory" not in data
    assert "process_memory_mb" not in data
    assert "connected" in data["database"]
    assert "latency_ms" not in data["database"]
    assert "error" not in data["database"]


def test_non_production_health_still_includes_memory():
    # Default test env from conftest is LENR_ENVIRONMENT=test
    with TestClient(app) as client:
        response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert "system_memory" in data
    assert "process_memory_mb" in data
