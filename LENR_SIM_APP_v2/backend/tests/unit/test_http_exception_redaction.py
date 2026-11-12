"""Production HTTPException 5xx detail redaction."""

from __future__ import annotations

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

from app.api.errors.handlers import register_exception_handlers
from app.core.config import EnvironmentType, settings


@pytest.fixture
def app_with_handlers(monkeypatch: pytest.MonkeyPatch) -> FastAPI:
    app = FastAPI()
    register_exception_handlers(app)

    @app.get("/boom")
    def boom():
        raise HTTPException(status_code=500, detail=str(RuntimeError("secret path /etc/shadow")))

    @app.get("/client-error")
    def client_error():
        raise HTTPException(status_code=400, detail="bad input visible")

    return app


def test_production_redacts_http_500_detail(app_with_handlers, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "ENVIRONMENT", EnvironmentType.PRODUCTION)
    client = TestClient(app_with_handlers, raise_server_exceptions=False)
    response = client.get("/boom")
    assert response.status_code == 500
    body = response.json()
    assert "secret path" not in str(body)
    assert "An internal server error occurred" in str(body["detail"])


def test_development_keeps_http_500_detail(app_with_handlers, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "ENVIRONMENT", EnvironmentType.DEVELOPMENT)
    client = TestClient(app_with_handlers, raise_server_exceptions=False)
    response = client.get("/boom")
    assert response.status_code == 500
    assert "secret path" in str(response.json()["detail"])


def test_client_errors_still_surface_detail(app_with_handlers, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "ENVIRONMENT", EnvironmentType.PRODUCTION)
    client = TestClient(app_with_handlers, raise_server_exceptions=False)
    response = client.get("/client-error")
    assert response.status_code == 400
    assert response.json()["detail"] == "bad input visible"
