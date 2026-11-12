"""Path traversal guards for result visualization storage."""

from __future__ import annotations

import pytest
from fastapi import HTTPException

from app.routers.result_visualization_routes import RESULTS_DIR, _safe_result_path


def test_safe_result_path_accepts_simple_id() -> None:
    path = _safe_result_path("abc-123")
    assert path == (RESULTS_DIR / "abc-123.json").resolve()


@pytest.mark.parametrize(
    "bad_id",
    [
        "../etc/passwd",
        "..\\windows",
        "a/b",
        "a\\b",
        "",
        "/tmp/x",
    ],
)
def test_safe_result_path_rejects_traversal(bad_id: str) -> None:
    with pytest.raises(HTTPException) as exc:
        _safe_result_path(bad_id)
    assert exc.value.status_code == 400


def test_results_route_rejects_traversal_http() -> None:
    from fastapi.testclient import TestClient
    from app.main import app

    with TestClient(app) as client:
        response = client.get("/api/results/simulations/../etc/passwd")
        assert response.status_code in {400, 404}
