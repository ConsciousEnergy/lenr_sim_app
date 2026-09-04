"""Production hardening: SECRET_KEY, OpenAPI surface, Analytics write guard."""

from __future__ import annotations

from unittest.mock import Mock

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from app.core.analytics_write_guard import require_analytics_write
from app.core.config import EnvironmentType, Settings, openapi_surface
from app.services.simulation_persistence import persistence_enabled


def test_openapi_surface_disabled_in_production() -> None:
    prod = openapi_surface(EnvironmentType.PRODUCTION)
    assert prod == {"docs_url": None, "redoc_url": None, "openapi_url": None}
    dev = openapi_surface(EnvironmentType.DEVELOPMENT)
    assert dev["docs_url"] == "/api/docs"
    assert dev["openapi_url"] == "/api/openapi.json"


def test_production_settings_require_secret_key() -> None:
    with pytest.raises(ValidationError):
        Settings(
            ENVIRONMENT=EnvironmentType.PRODUCTION,
            SECRET_KEY=None,
            _env_file=None,
        )


def test_production_settings_accept_secret_key() -> None:
    cfg = Settings(
        ENVIRONMENT=EnvironmentType.PRODUCTION,
        SECRET_KEY="prod-secret-key",
        _env_file=None,
    )
    assert cfg.SECRET_KEY == "prod-secret-key"
    assert cfg.ENVIRONMENT == EnvironmentType.PRODUCTION


def test_auto_persist_defaults_off_in_production(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("LENR_AUTO_PERSIST", raising=False)
    from app.core.config import settings

    monkeypatch.setattr(settings, "ENVIRONMENT", EnvironmentType.PRODUCTION)
    assert persistence_enabled() is False
    monkeypatch.setattr(settings, "ENVIRONMENT", EnvironmentType.TEST)
    assert persistence_enabled() is True
    monkeypatch.setenv("LENR_AUTO_PERSIST", "0")
    assert persistence_enabled() is False


def test_require_analytics_write_noop_outside_production() -> None:
    settings = Mock()
    settings.ENVIRONMENT = EnvironmentType.TEST
    settings.SECRET_KEY = None
    settings.ANALYTICS_WRITE_TOKEN = None
    require_analytics_write(x_lenr_write_token=None, settings=settings)


def test_require_analytics_write_forbids_anonymous_production() -> None:
    settings = Mock()
    settings.ENVIRONMENT = EnvironmentType.PRODUCTION
    settings.SECRET_KEY = "prod-secret-key"
    settings.ANALYTICS_WRITE_TOKEN = None
    with pytest.raises(HTTPException) as exc:
        require_analytics_write(x_lenr_write_token=None, settings=settings)
    assert exc.value.status_code == 403


def test_require_analytics_write_accepts_matching_token() -> None:
    settings = Mock()
    settings.ENVIRONMENT = EnvironmentType.PRODUCTION
    settings.SECRET_KEY = "prod-secret-key"
    settings.ANALYTICS_WRITE_TOKEN = None
    require_analytics_write(x_lenr_write_token="prod-secret-key", settings=settings)


def test_require_analytics_write_prefers_dedicated_token() -> None:
    settings = Mock()
    settings.ENVIRONMENT = EnvironmentType.PRODUCTION
    settings.SECRET_KEY = "prod-secret-key"
    settings.ANALYTICS_WRITE_TOKEN = "write-token"
    with pytest.raises(HTTPException):
        require_analytics_write(x_lenr_write_token="prod-secret-key", settings=settings)
    require_analytics_write(x_lenr_write_token="write-token", settings=settings)


def _experiment_payload() -> dict:
    return {
        "name": "anon write",
        "experiment_type": "unified_theory",
        "material": "palladium",
        "temperature_k": 300.0,
    }


def test_analytics_http_writes_gated_in_production(monkeypatch: pytest.MonkeyPatch) -> None:
    from app.core.config import settings
    from fastapi.testclient import TestClient
    from app.main import app

    monkeypatch.setattr(settings, "ENVIRONMENT", EnvironmentType.PRODUCTION)
    monkeypatch.setattr(settings, "SECRET_KEY", "prod-secret-key")
    monkeypatch.setattr(settings, "ANALYTICS_WRITE_TOKEN", None)
    with TestClient(app) as client:
        denied = client.post("/api/analytics/experiments", json=_experiment_payload())
        assert denied.status_code == 403
        stats = client.get("/api/analytics/stats")
        assert stats.status_code == 200
        assert "totalSimulations" in stats.json()
        allowed = client.post(
            "/api/analytics/experiments",
            json=_experiment_payload(),
            headers={"X-LENR-Write-Token": "prod-secret-key"},
        )
        assert allowed.status_code == 201

