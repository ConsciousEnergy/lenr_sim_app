"""Unit tests for spoof-resistant client IP extraction."""

from types import SimpleNamespace

from app.security.client_ip import client_ip_from_request


class _FakeRequest:
    def __init__(self, headers=None, client_host=None):
        self.headers = headers or {}
        self.client = SimpleNamespace(host=client_host) if client_host else None


def test_prefers_x_real_ip_over_spoofed_xff():
    req = _FakeRequest(
        headers={
            "X-Real-IP": "198.51.100.10",
            "X-Forwarded-For": "203.0.113.99, 198.51.100.10",
        },
        client_host="10.0.0.2",
    )
    assert client_ip_from_request(req) == "198.51.100.10"


def test_uses_rightmost_xff_when_no_real_ip():
    req = _FakeRequest(
        headers={"X-Forwarded-For": "203.0.113.99, 198.51.100.20"},
        client_host="10.0.0.2",
    )
    assert client_ip_from_request(req) == "198.51.100.20"


def test_falls_back_to_peer_host():
    req = _FakeRequest(headers={}, client_host="127.0.0.1")
    assert client_ip_from_request(req) == "127.0.0.1"


def test_rejects_junk_real_ip():
    req = _FakeRequest(
        headers={"X-Real-IP": "not an ip", "X-Forwarded-For": "198.51.100.30"},
        client_host="10.0.0.2",
    )
    assert client_ip_from_request(req) == "198.51.100.30"
