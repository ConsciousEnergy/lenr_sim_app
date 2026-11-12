"""Shared-simulation save/share are fail-closed in production (SEC-04 / M3)."""

from __future__ import annotations

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.core.config import EnvironmentType
from app.core.write_token_guard import require_shared_simulation_write


def _save_payload(name: str = "gated-save") -> dict:
    return {
        "name": name,
        "description": "",
        "tags": [],
        "is_public": False,
        "parameters": {"material": {"host_material": "palladium", "reactant": "deuterium"}},
        "results": {"excess_heat_watts": 0.0},
        "session_id": "test-session",
    }


def test_require_shared_simulation_write_forbids_anonymous_production() -> None:
    from unittest.mock import Mock

    settings = Mock()
    settings.ENVIRONMENT = EnvironmentType.PRODUCTION
    settings.SECRET_KEY = "prod-secret-key"
    settings.ANALYTICS_WRITE_TOKEN = None
    with pytest.raises(HTTPException) as exc:
        require_shared_simulation_write(x_lenr_write_token=None, settings=settings)
    assert exc.value.status_code == 403


def test_shared_simulation_save_gated_in_production(monkeypatch: pytest.MonkeyPatch) -> None:
    from app.core.config import settings
    from app.main import app

    monkeypatch.setattr(settings, "ENVIRONMENT", EnvironmentType.PRODUCTION)
    monkeypatch.setattr(settings, "SECRET_KEY", "prod-secret-key")
    monkeypatch.setattr(settings, "ANALYTICS_WRITE_TOKEN", None)

    with TestClient(app) as client:
        denied = client.post("/api/simulations/save", json=_save_payload())
        assert denied.status_code == 403

        allowed = client.post(
            "/api/simulations/save",
            json=_save_payload("token-ok"),
            headers={"X-LENR-Write-Token": "prod-secret-key"},
        )
        assert allowed.status_code == 201
        assert allowed.json()["name"] == "token-ok"


def test_shared_simulation_save_rejects_oversized_payload(monkeypatch: pytest.MonkeyPatch) -> None:
    from app.core.config import settings
    from app.main import app

    monkeypatch.setattr(settings, "ENVIRONMENT", EnvironmentType.TEST)
    huge = {"blob": "x" * (70 * 1024)}
    payload = _save_payload("too-big")
    payload["parameters"] = huge

    with TestClient(app) as client:
        response = client.post("/api/simulations/save", json=payload)
        assert response.status_code == 422
