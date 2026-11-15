"""
Shared or process-local counters for RateLimitingMiddleware.

Default backend is process-local memory (historical behavior). When
``RATE_LIMIT_BACKEND=redis`` and a URL is configured, counters are shared
across workers/replicas. Redis is optional — import fails closed to memory
unless the flag is explicitly enabled.
"""

from __future__ import annotations

import threading
import time
from typing import Dict, Optional, Protocol, Tuple

from app.utils.logging import setup_logger

logger = setup_logger("rate_limit_store", "logs/security.log")

# ip -> (general, window_start, heavy, write)
ClientCounts = Tuple[int, float, int, int]


class RateLimitStore(Protocol):
    def get(self, client_ip: str) -> Optional[ClientCounts]:
        ...

    def set(self, client_ip: str, counts: ClientCounts) -> None:
        ...

    def cleanup(self, current_time: float, window_size: float) -> None:
        ...


class InMemoryRateLimitStore:
    """Process-local dict — dilutes across uvicorn workers / Swarm replicas."""

    def __init__(self) -> None:
        self._clients: Dict[str, ClientCounts] = {}
        self._lock = threading.Lock()

    def get(self, client_ip: str) -> Optional[ClientCounts]:
        with self._lock:
            return self._clients.get(client_ip)

    def set(self, client_ip: str, counts: ClientCounts) -> None:
        with self._lock:
            self._clients[client_ip] = counts

    def cleanup(self, current_time: float, window_size: float) -> None:
        with self._lock:
            expired = [
                ip
                for ip, (_, timestamp, _, _) in self._clients.items()
                if current_time - timestamp >= window_size
            ]
            for ip in expired:
                del self._clients[ip]

    @property
    def client_count(self) -> int:
        with self._lock:
            return len(self._clients)


class SharedMemoryRateLimitStore(InMemoryRateLimitStore):
    """Same process dict that multiple middleware instances can share (tests)."""


class RedisRateLimitStore:
    """
    Redis-backed sliding window counters.

    Key layout: ``lenr:rl:{ip}`` → ``general:window_start:heavy:write`` with TTL.
    Requires the optional ``redis`` package when enabled.
    """

    def __init__(self, redis_url: str, key_prefix: str = "lenr:rl:") -> None:
        try:
            import redis
        except ImportError as exc:  # pragma: no cover - env dependent
            raise RuntimeError(
                "RATE_LIMIT_BACKEND=redis requires the redis package"
            ) from exc
        self._client = redis.Redis.from_url(redis_url, decode_responses=True)
        self._prefix = key_prefix
        self._client.ping()
        logger.info("Redis rate-limit store connected")

    def _key(self, client_ip: str) -> str:
        return f"{self._prefix}{client_ip}"

    def get(self, client_ip: str) -> Optional[ClientCounts]:
        raw = self._client.get(self._key(client_ip))
        if not raw:
            return None
        parts = str(raw).split(":")
        if len(parts) != 4:
            return None
        general, window_start, heavy, write = parts
        return int(general), float(window_start), int(heavy), int(write)

    def set(self, client_ip: str, counts: ClientCounts) -> None:
        general, window_start, heavy, write = counts
        # TTL slightly above window so stale keys expire if cleanup is skipped.
        self._client.set(
            self._key(client_ip),
            f"{general}:{window_start}:{heavy}:{write}",
            ex=120,
        )

    def cleanup(self, current_time: float, window_size: float) -> None:
        # Redis TTL handles expiry; no scan required on the hot path.
        return


def build_rate_limit_store(
    backend: str = "memory",
    redis_url: Optional[str] = None,
    shared: Optional[RateLimitStore] = None,
) -> RateLimitStore:
    """Factory used by middleware wiring and tests."""
    if shared is not None:
        return shared
    normalized = (backend or "memory").strip().lower()
    if normalized == "redis":
        if not redis_url:
            raise RuntimeError(
                "RATE_LIMIT_BACKEND=redis requires RATE_LIMIT_REDIS_URL"
            )
        return RedisRateLimitStore(redis_url)
    return InMemoryRateLimitStore()
