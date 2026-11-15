"""
Rate Limiting Middleware

Limits requests per client IP with stricter budgets for unauthenticated
heavy-compute and persistence-write POST paths. Client IP comes from
Traefik-aware extraction (X-Real-IP when present, else rightmost X-Forwarded-For).

Default counters are process-local. Prefer Traefik file-provider path RL for
cluster fencing. Optional ``RATE_LIMIT_BACKEND=redis`` shares FastAPI budgets
across workers when edge RL cannot be applied — default remains memory/off.
"""

from __future__ import annotations

import time
from typing import Callable, List, Optional

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from app.api.middleware.rate_limit_store import (
    RateLimitStore,
    build_rate_limit_store,
)
from app.core.config import settings
from app.security.client_ip import client_ip_from_request
from app.utils.logging import setup_logger

logger = setup_logger("rate_limiting", "logs/security.log")

# Default paths that burn CPU / threadpool without auth (prefix match).
# Broad physics/multi-physics prefixes cover live LP-H3 compute POSTs.
_DEFAULT_HEAVY_PATH_PREFIXES: List[str] = [
    "/api/unified/simulate",
    "/api/unified/export",
    "/api/unified/compare",
    "/api/unified/bubble-lattice",
    "/api/physics/",
    "/api/analytics/parameter-sweep",
    "/api/analytics/theories/run-coupled",
    "/api/analytics/compare",
    "/api/analytics/theory-scores",
    "/api/analytics/theory-comparison",
    "/api/multi-physics/",
]

# Persistence / storage-abuse paths — tighter than heavy compute.
_DEFAULT_WRITE_PATH_PREFIXES: List[str] = [
    "/api/simulations/save",
    "/api/simulations/share",
]

_DEFAULT_WHITELIST_PATHS: List[str] = [
    "/api/docs",
    "/api/redoc",
    "/api/openapi.json",
    "/api/health",
    "/health",
]


class RateLimitingMiddleware(BaseHTTPMiddleware):
    """Sliding-window per-IP limiter with heavy + write path budgets."""

    def __init__(
        self,
        app,
        rate_limit_per_minute: int = 60,
        heavy_rate_limit_per_minute: Optional[int] = None,
        write_rate_limit_per_minute: Optional[int] = None,
        heavy_path_prefixes: Optional[List[str]] = None,
        write_path_prefixes: Optional[List[str]] = None,
        whitelist_paths: Optional[list] = None,
        whitelist_ips: Optional[list] = None,
        store: Optional[RateLimitStore] = None,
    ):
        super().__init__(app)
        self.rate_limit = rate_limit_per_minute
        self.heavy_rate_limit = (
            heavy_rate_limit_per_minute
            if heavy_rate_limit_per_minute is not None
            else getattr(settings, "HEAVY_RATE_LIMIT_PER_MINUTE", 10)
        )
        self.write_rate_limit = (
            write_rate_limit_per_minute
            if write_rate_limit_per_minute is not None
            else getattr(settings, "WRITE_RATE_LIMIT_PER_MINUTE", 3)
        )
        self.heavy_path_prefixes = list(
            heavy_path_prefixes
            if heavy_path_prefixes is not None
            else getattr(settings, "HEAVY_RATE_LIMIT_PATH_PREFIXES", _DEFAULT_HEAVY_PATH_PREFIXES)
        )
        self.write_path_prefixes = list(
            write_path_prefixes
            if write_path_prefixes is not None
            else getattr(settings, "WRITE_RATE_LIMIT_PATH_PREFIXES", _DEFAULT_WRITE_PATH_PREFIXES)
        )
        self.window_size = 60
        self.whitelist_paths = (
            whitelist_paths if whitelist_paths is not None else list(_DEFAULT_WHITELIST_PATHS)
        )
        self.whitelist_ips = (
            whitelist_ips if whitelist_ips is not None else ["127.0.0.1", "::1"]
        )
        if store is not None:
            self.store = store
        else:
            backend = getattr(settings, "RATE_LIMIT_BACKEND", "memory")
            redis_url = getattr(settings, "RATE_LIMIT_REDIS_URL", None)
            self.store = build_rate_limit_store(backend=backend, redis_url=redis_url)

        logger.info(
            "Rate limiting initialized: general=%s/min heavy=%s/min write=%s/min backend=%s",
            rate_limit_per_minute,
            self.heavy_rate_limit,
            self.write_rate_limit,
            getattr(settings, "RATE_LIMIT_BACKEND", "memory"),
        )

    def _path_scope(self, path: str, method: str) -> str:
        if method.upper() not in {"POST", "PUT", "PATCH", "DELETE"}:
            return "general"
        if any(path.startswith(prefix) for prefix in self.write_path_prefixes):
            return "write"
        if any(path.startswith(prefix) for prefix in self.heavy_path_prefixes):
            return "heavy"
        return "general"

    def _limit_for_scope(self, scope: str) -> int:
        if scope == "write":
            return self.write_rate_limit
        if scope == "heavy":
            return self.heavy_rate_limit
        return self.rate_limit

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        if any(request.url.path.startswith(path) for path in self.whitelist_paths):
            return await call_next(request)

        client_ip = self._get_client_ip(request)
        if client_ip in self.whitelist_ips:
            return await call_next(request)

        current_time = time.time()
        scope = self._path_scope(request.url.path, request.method)
        limit = self._limit_for_scope(scope)

        entry = self.store.get(client_ip)
        if entry is not None:
            requests, timestamp, heavy_count, write_count = entry
            if current_time - timestamp >= self.window_size:
                requests, heavy_count, write_count, timestamp = 0, 0, 0, current_time

            next_general = requests + 1
            next_heavy = heavy_count + (1 if scope == "heavy" else 0)
            next_write = write_count + (1 if scope == "write" else 0)

            over_general = next_general > self.rate_limit
            over_heavy = scope == "heavy" and next_heavy > self.heavy_rate_limit
            over_write = scope == "write" and next_write > self.write_rate_limit
            if over_general or over_heavy or over_write:
                logger.warning(
                    "Rate limit exceeded for IP=%s path=%s scope=%s",
                    client_ip,
                    request.url.path,
                    scope,
                )
                return self._rate_limit_response(
                    request, limit=limit, scope=scope, window_start=timestamp
                )

            self.store.set(client_ip, (next_general, timestamp, next_heavy, next_write))
        else:
            self.store.set(
                client_ip,
                (
                    1,
                    current_time,
                    1 if scope == "heavy" else 0,
                    1 if scope == "write" else 0,
                ),
            )

        # Periodic cleanup for in-memory backends (Redis uses key TTL).
        if hasattr(self.store, "client_count"):
            if getattr(self.store, "client_count") % 100 == 0:
                self.store.cleanup(current_time, self.window_size)

        response = await call_next(request)

        client_requests, _, heavy_used, write_used = self.store.get(client_ip) or (
            0,
            current_time,
            0,
            0,
        )
        if scope == "write":
            remaining = max(0, self.write_rate_limit - write_used)
            response.headers["X-RateLimit-Limit"] = str(self.write_rate_limit)
        elif scope == "heavy":
            remaining = max(0, self.heavy_rate_limit - heavy_used)
            response.headers["X-RateLimit-Limit"] = str(self.heavy_rate_limit)
        else:
            remaining = max(0, self.rate_limit - client_requests)
            response.headers["X-RateLimit-Limit"] = str(self.rate_limit)
        response.headers["X-RateLimit-Scope"] = scope
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Reset"] = str(int(current_time + self.window_size))
        return response

    def _get_client_ip(self, request: Request) -> str:
        return client_ip_from_request(request)

    def _rate_limit_response(
        self,
        request: Request,
        limit: Optional[int] = None,
        scope: str = "general",
        window_start: float = 0.0,
    ) -> Response:
        from starlette.responses import JSONResponse

        request_id = getattr(request.state, "request_id", "unknown")
        logger.warning(
            "Rate limit exceeded | RequestID: %s | %s %s | scope=%s",
            request_id,
            request.method,
            request.url.path,
            scope,
        )
        timestamp = window_start
        if not timestamp:
            entry = self.store.get(self._get_client_ip(request))
            timestamp = entry[1] if entry else 0.0
        retry_after = (
            int(self.window_size - (time.time() - timestamp)) if timestamp else self.window_size
        )
        effective = limit if limit is not None else self.rate_limit
        return JSONResponse(
            status_code=429,
            content={
                "detail": "Too Many Requests - Rate limit exceeded",
                "scope": scope,
                "limit": effective,
                "retry_after": max(1, retry_after),
            },
            headers={
                "Retry-After": str(max(1, retry_after)),
                "X-RateLimit-Limit": str(effective),
                "X-RateLimit-Remaining": "0",
                "X-RateLimit-Scope": scope,
                "X-RateLimit-Reset": str(int(time.time() + max(1, retry_after))),
            },
        )
