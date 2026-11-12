"""
Rate Limiting Middleware

Limits requests per client IP with stricter budgets for unauthenticated
heavy-compute and persistence-write POST paths. Client IP comes from
Traefik-aware extraction (X-Real-IP when present, else rightmost X-Forwarded-For).

Budgets are process-local. Swarm replicas multiply the effective allowance until
a shared store (Redis) or edge RL is provisioned — see ops notes.
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
    "/api/physics/bubble-fusion",
    "/api/physics/quantum-tunneling",
    "/api/analytics/parameter-sweep",
    "/api/analytics/theories/run-coupled",
    "/api/analytics/compare",
    "/api/analytics/theory-scores",
    "/api/analytics/theory-comparison",
    "/api/multi-physics/simulations",
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
        # client_ip -> (request_count, window_start, heavy_count, write_count)
        self.clients: Dict[str, Tuple[int, float, int, int]] = {}
        self.window_size = 60
        self.whitelist_paths = (
            whitelist_paths if whitelist_paths is not None else list(_DEFAULT_WHITELIST_PATHS)
        )
        self.whitelist_ips = (
            whitelist_ips if whitelist_ips is not None else ["127.0.0.1", "::1"]
        )

        logger.info(
            "Rate limiting initialized: general=%s/min heavy=%s/min write=%s/min",
            rate_limit_per_minute,
            self.heavy_rate_limit,
            self.write_rate_limit,
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

        if client_ip in self.clients:
            requests, timestamp, heavy_count, write_count = self.clients[client_ip]
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
                return self._rate_limit_response(request, limit=limit, scope=scope)

            self.clients[client_ip] = (next_general, timestamp, next_heavy, next_write)
        else:
            self.clients[client_ip] = (
                1,
                current_time,
                1 if scope == "heavy" else 0,
                1 if scope == "write" else 0,
            )

        if sum(count for count, _, _, _ in self.clients.values()) % 100 == 0:
            self._cleanup_old_entries(current_time)

        response = await call_next(request)

        client_requests, _, heavy_used, write_used = self.clients.get(
            client_ip, (0, current_time, 0, 0)
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

    def _cleanup_old_entries(self, current_time: float) -> None:
        expired = [
            ip
            for ip, (_, timestamp, _, _) in self.clients.items()
            if current_time - timestamp >= self.window_size
        ]
        for ip in expired:
            del self.clients[ip]

    def _rate_limit_response(
        self,
        request: Request,
        limit: Optional[int] = None,
        scope: str = "general",
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
        client_ip = self._get_client_ip(request)
        entry = self.clients.get(client_ip, (0, 0.0, 0, 0))
        timestamp = entry[1]
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
