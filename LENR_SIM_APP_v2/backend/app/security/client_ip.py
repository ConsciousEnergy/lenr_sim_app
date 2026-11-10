"""
Client IP extraction for rate limits and abuse controls.

Preference order:
1. ``X-Real-IP`` — set by nginx (SPA) or an operator-added Traefik plugin; Traefik
   stock does **not** emit this header on the Swarm edge.
2. ``CF-Connecting-IP`` — present only if ``api.`` is orange-clouded later.
3. Rightmost ``X-Forwarded-For`` hop — Traefik (edge) appends the TCP peer; this
   is the authoritative key for the current DNS-only Swarm path.
4. Direct peer ``request.client.host``.

Never prefer the leftmost XFF hop — clients can spoof it to dilute per-IP budgets.
Traefik ``backend-ratelimit`` uses ``sourceCriterion.ipStrategy.depth=1`` (same hop).
"""

from __future__ import annotations

from starlette.requests import Request


def client_ip_from_request(request: Request) -> str:
    """Return the best-effort client IP for abuse budgeting."""
    real_ip = (request.headers.get("X-Real-IP") or "").strip()
    if real_ip and _looks_like_ip(real_ip):
        return real_ip

    cf_ip = (request.headers.get("CF-Connecting-IP") or "").strip()
    if cf_ip and _looks_like_ip(cf_ip):
        return cf_ip

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
