"""Visualization WebSocket Origin gate (LRS-M1) against the mounted app."""

import json

import pytest
from fastapi.testclient import TestClient
from starlette.websockets import WebSocketDisconnect

from app.core.config import settings
from app.main import app

WS_PATH = "/api/visualization/ws/lrs-m1-test"


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


def _allowed_origin() -> str:
    origins = settings.CORS_ORIGINS or []
    assert origins, "test env must configure CORS_ORIGINS"
    return origins[0]


def test_viz_ws_rejects_evil_origin(client: TestClient):
    with pytest.raises(WebSocketDisconnect) as exc_info:
        with client.websocket_connect(
            WS_PATH, headers={"Origin": "https://evil.example"}
        ):
            pass
    assert exc_info.value.code == 1008


def test_viz_ws_rejects_missing_origin(client: TestClient):
    with pytest.raises(WebSocketDisconnect) as exc_info:
        with client.websocket_connect(WS_PATH):
            pass
    assert exc_info.value.code == 1008


def test_viz_ws_accepts_allowlisted_origin_and_subscribe(client: TestClient):
    origin = _allowed_origin()
    with client.websocket_connect(WS_PATH, headers={"Origin": origin}) as ws:
        ws.send_text(json.dumps({"type": "subscribe", "simulation_id": "sim-1"}))
        reply = json.loads(ws.receive_text())
    assert reply["status"] == "subscribed"
    assert reply["simulation_id"] == "sim-1"
