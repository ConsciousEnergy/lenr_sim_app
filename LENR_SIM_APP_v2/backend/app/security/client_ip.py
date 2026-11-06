"""
Client IP extraction for rate limits and abuse controls.

Behind Traefik/nginx, prefer X-Real-IP (set by the edge from the TCP peer).
Fall back to the rightmost X-Forwarded-For hop (appended by a trusted proxy)
rather than the leftmost hop, which a client can spoof to dilute per-IP budgets.
"""

from __future__ import annotations

from starlette.requests import Request


def client_ip_from_request(request: Request) -> str:
    """Return the best-effort client IP for abuse budgeting."""
    real_ip = (request.headers.get("X-Real-IP") or "").strip()
    if real_ip and _looks_like_ip(real_ip):
        return real_ip

    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        hops = [part.strip() for part in forwarded.split(",") if part.strip()]
        if hops:
            # Rightmost hop is the one added by the nearest trusted proxy when
            # the edge appends rather than overwriting client-supplied values.
            return hops[-1]

    if request.client and request.client.host:
        return request.client.host
    return "unknown"


def _looks_like_ip(value: str) -> bool:
    """Cheap shape check — reject header injection / empty junk."""
    if not value or len(value) > 64 or " " in value or "/" in value:
        return False
    # IPv4 or IPv6-ish (colon). Full validation is unnecessary for RL keys.
    return "." in value or ":" in value
