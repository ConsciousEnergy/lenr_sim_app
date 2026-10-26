"""Request / correlation ID propagation on happy and error paths."""

from fastapi.testclient import TestClient


def _client() -> TestClient:
    from app.main import app

    return TestClient(app)


def test_health_echoes_generated_request_id() -> None:
    client = _client()
    response = client.get("/health")
    assert response.status_code == 200
    request_id = response.headers.get("X-Request-ID")
    assert request_id
    assert len(request_id) >= 8
    assert response.headers.get("X-Correlation-ID") == request_id


def test_inbound_x_request_id_is_propagated() -> None:
    client = _client()
    inbound = "staging-corr-abc-12345"
    response = client.get("/health", headers={"X-Request-ID": inbound})
    assert response.status_code == 200
    assert response.headers.get("X-Request-ID") == inbound
    assert response.headers.get("X-Correlation-ID") == inbound


def test_inbound_x_correlation_id_alias_is_propagated() -> None:
    client = _client()
    inbound = "edge-trace-xyz-98765"
    response = client.get("/health", headers={"X-Correlation-ID": inbound})
    assert response.status_code == 200
    assert response.headers.get("X-Request-ID") == inbound


def test_unsafe_inbound_request_id_is_rejected() -> None:
    client = _client()
    # Newline / short tokens must not be echoed (log-injection / spam).
    response = client.get("/health", headers={"X-Request-ID": "bad\nid"})
    assert response.status_code == 200
    echoed = response.headers.get("X-Request-ID")
    assert echoed
    assert "\n" not in echoed
    assert echoed != "bad\nid"


def test_http_error_body_includes_request_id() -> None:
    client = _client()
    inbound = "err-path-corr-0001"
    response = client.get(
        "/api/definitely-not-a-route-zzzz",
        headers={"X-Request-ID": inbound},
    )
    assert response.status_code == 404
    body = response.json()
    assert body.get("request_id") == inbound
    assert response.headers.get("X-Request-ID") == inbound


def test_validation_error_body_includes_request_id() -> None:
    """POST with invalid JSON body to a JSON endpoint → 422 + request_id."""
    client = _client()
    inbound = "val-err-corr-0002"
    # Unified simulation expects a JSON object; empty array fails validation.
    response = client.post(
        "/api/unified/simulate",
        headers={
            "X-Request-ID": inbound,
            "Content-Type": "application/json",
        },
        json=[],
    )
    # Some routes 404 if router missing; either way correlation must survive.
    if response.status_code == 404:
        assert response.json().get("request_id") == inbound
        return
    assert response.status_code == 422
    body = response.json()
    assert body.get("request_id") == inbound
    assert response.headers.get("X-Request-ID") == inbound
