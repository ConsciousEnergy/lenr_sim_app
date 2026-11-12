"""Unit tests for WebSocket Origin allowlist (LRS-M1)."""

from app.security.websocket_origin import is_allowed_websocket_origin

# Production-shaped allowlist (matches ansible CORS / conscious.energy SPA hosts).
PROD_ORIGINS = [
    "https://conscious.energy",
    "https://www.conscious.energy",
    "https://api.conscious.energy",
    "https://lenr-sim-beta.conscious.energy",
    "https://app.conscious.energy",
]


def test_allows_beta_and_app_hosts():
    assert is_allowed_websocket_origin(
        "https://lenr-sim-beta.conscious.energy", PROD_ORIGINS
    )
    assert is_allowed_websocket_origin("https://app.conscious.energy", PROD_ORIGINS)
    assert is_allowed_websocket_origin("https://conscious.energy", PROD_ORIGINS)


def test_rejects_evil_origin():
    assert not is_allowed_websocket_origin("https://evil.example", PROD_ORIGINS)
    assert not is_allowed_websocket_origin("http://evil.example", PROD_ORIGINS)


def test_rejects_missing_or_blank_origin():
    assert not is_allowed_websocket_origin(None, PROD_ORIGINS)
    assert not is_allowed_websocket_origin("", PROD_ORIGINS)
    assert not is_allowed_websocket_origin("   ", PROD_ORIGINS)


def test_strips_trailing_slash_on_match():
    assert is_allowed_websocket_origin(
        "https://app.conscious.energy/", PROD_ORIGINS
    )


def test_rejects_lookalike_subdomain():
    assert not is_allowed_websocket_origin(
        "https://evil.conscious.energy", PROD_ORIGINS
    )
    assert not is_allowed_websocket_origin(
        "https://lenr-sim-beta.conscious.energy.evil.example", PROD_ORIGINS
    )
