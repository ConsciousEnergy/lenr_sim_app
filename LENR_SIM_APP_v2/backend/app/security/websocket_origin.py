"""
WebSocket Origin allowlist (LRS-M1).

Browsers always send Origin on WebSocket handshakes. Reusing ``settings.CORS_ORIGINS``
keeps the viz stream gate aligned with HTTP CORS (app / beta / apex hosts).
"""

from __future__ import annotations

from typing import Optional, Sequence


def is_allowed_websocket_origin(
    origin: Optional[str],
    allowed_origins: Sequence[str],
) -> bool:
    """Return True when ``origin`` exactly matches an entry in ``allowed_origins``.

    Missing / blank Origin is rejected — non-browser clients that need access must
    present an allowlisted Origin (or use a non-browser path that does not hit this
    gate). Trailing slashes are stripped; matching is otherwise exact (same as
    Starlette CORSMiddleware).
    """
    if not origin:
        return False
    normalized = origin.strip().rstrip("/")
    if not normalized:
        return False
    allowed = {item.strip().rstrip("/") for item in allowed_origins if item and item.strip()}
    return normalized in allowed
