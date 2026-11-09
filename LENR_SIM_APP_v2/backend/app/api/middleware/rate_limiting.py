"""
Rate Limiting Middleware

Limits requests per client IP with a stricter budget for unauthenticated
heavy-compute POST paths. Client IP comes from Traefik-aware extraction
(X-Real-IP when present, else rightmost X-Forwarded-For).
"""

from __future__ import annotations

import time
from typing import Callable, Dict, List, Optional, Tuple

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.config import settings
from app.security.client_ip import client_ip_from_request
from app.utils.logging import setup_logger

logger = setup_logger("rate_limiting", "logs/security.log")

# Default paths that burn CPU / threadpool without auth (prefix match).
_DEFAULT_HEAVY_PATH_PREFIXES: List[str] = [
    "/api/unified/simulate",
    "/api/unified/export",
    "/api/unified/compare",
    "/api/unified/bubble-lattice",
    "/api/physics/theories/run",
    "/api/physics/theories/",  # /theories/{id}/run
    "/api/analytics/parameter-sweep",
    "/api/analytics/theories/run-coupled",
    "/api/analytics/compare",
    "/api/analytics/theory-scores",
    "/api/analytics/theory-comparison",
    "/api/multi-physics/simulations",
]

_DEFAULT_WHITELIST_PATHS: List[str] = [
    "/api/docs",
    "/api/redoc",
    "/api/openapi.json",
    "/api/health",
    "/health",
]


class RateLimitingMiddleware(BaseHTTPMiddleware):
    """Sliding-window per-IP limiter with an optional heavy-path budget."""

    def __init__(
        self,
        app,
        rate_limit_per_minute: int = 60,
        heavy_rate_limit_per_minute: Optional[int] = None,
        heavy_path_prefixes: Optional[List[str]] = None,
        whitelist_paths: Optional[list] = None,
        whitelist_ips: Optional[list] = None,
    ):
        super().__init__(app)
        self.rate_limit = rate_limit_per_minute
        self.heavy_rate_limit = (
            heavy_rate_limit_per_minute
            if heavy_rate_limit_per_minute is not None
            else getattr(settings, "HEAVY_RATE_LIMIT_PER_MINUTE", 10)
        )
        self.heavy_path_prefixes = list(
            heavy_path_prefixes
            if heavy_path_prefixes is not None
            else getattr(settings, "HEAVY_RATE_LIMIT_PATH_PREFIXES", _DEFAULT_HEAVY_PATH_PREFIXES)
        )
        # client_ip -> (request_count, window_start, heavy_count)
        self.clients: Dict[str, Tuple[int, float, int]] = {}
        self.window_size = 60
        self.whitelist_paths = (
            whitelist_paths if whitelist_paths is not None else list(_DEFAULT_WHITELIST_PATHS)
        )
        self.whitelist_ips = (
            whitelist_ips if whitelist_ips is not None else ["127.0.0.1", "::1"]
        )

        logger.info(
            "Rate limiting initialized: general=%s/min heavy=%s/min paths=%s",
            rate_limit_per_minute,
            self.heavy_rate_limit,
            self.heavy_path_prefixes,
        )

    def _is_heavy_path(self, path: str, method: str) -> bool:
        if method.upper() not in {"POST", "PUT", "PATCH"}:
            return False
        return any(path.startswith(prefix) for prefix in self.heavy_path_prefixes)

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        if any(request.url.path.startswith(path) for path in self.whitelist_paths):
            return await call_next(request)

        client_ip = self._get_client_ip(request)
        if client_ip in self.whitelist_ips:
            return await call_next(request)

        current_time = time.time()
        is_heavy = self._is_heavy_path(request.url.path, request.method)
        limit = self.heavy_rate_limit if is_heavy else self.rate_limit

        if client_ip in self.clients:
            requests, timestamp, heavy_count = self.clients[client_ip]
            if current_time - timestamp >= self.window_size:
                requests, heavy_count, timestamp = 0, 0, current_time

            next_general = requests + 1
            next_heavy = heavy_count + (1 if is_heavy else 0)

            if next_general > self.rate_limit or (is_heavy and next_heavy > self.heavy_rate_limit):
                logger.warning(
                    "Rate limit exceeded for IP=%s path=%s heavy=%s",
                    client_ip,
                    request.url.path,
                    is_heavy,
                )
                return self._rate_limit_response(request, limit=limit)

            self.clients[client_ip] = (next_general, timestamp, next_heavy)
        else:
            self.clients[client_ip] = (1, current_time, 1 if is_heavy else 0)

        if sum(count for count, _, _ in self.clients.values()) % 100 == 0:
            self._cleanup_old_entries(current_time)

        response = await call_next(request)

        client_requests, _, heavy_used = self.clients.get(client_ip, (0, current_time, 0))
        if is_heavy:
            remaining = max(0, self.heavy_rate_limit - heavy_used)
            response.headers["X-RateLimit-Limit"] = str(self.heavy_rate_limit)
            response.headers["X-RateLimit-Scope"] = "heavy"
        else:
            remaining = max(0, self.rate_limit - client_requests)
            response.headers["X-RateLimit-Limit"] = str(self.rate_limit)
            response.headers["X-RateLimit-Scope"] = "general"
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Reset"] = str(int(current_time + self.window_size))
        return response

    def _get_client_ip(self, request: Request) -> str:
        return client_ip_from_request(request)

    def _cleanup_old_entries(self, current_time: float) -> None:
        expired = [
            ip
            for ip, (_, timestamp, _) in self.clients.items()
            if current_time - timestamp >= self.window_size
        ]
        for ip in expired:
            del self.clients[ip]

    def _rate_limit_response(self, request: Request, limit: Optional[int] = None) -> Response:
        from starlette.responses import JSONResponse

        request_id = getattr(request.state, "request_id", "unknown")
        logger.warning(
            "Rate limit exceeded | RequestID: %s | %s %s",
            request_id,
            request.method,
            request.url.path,
        )
        client_ip = self._get_client_ip(request)
        entry = self.clients.get(client_ip, (0, 0.0, 0))
        timestamp = entry[1]
        retry_after = (
            int(self.window_size - (time.time() - timestamp)) if timestamp else self.window_size
        )
        effective = limit if limit is not None else self.rate_limit
        return JSONResponse(
            status_code=429,
            content={"detail": "Too Many Requests - Rate limit exceeded"},
            headers={
                "Retry-After": str(max(1, retry_after)),
                "X-RateLimit-Limit": str(effective),
            },
        )
