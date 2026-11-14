"""Shared rate-limit store: two middleware instances share one heavy budget."""

from fastapi import FastAPI
from fastapi.testclient import TestClient
from starlette.middleware.base import BaseHTTPMiddleware

from app.api.middleware.rate_limit_store import (
    SharedMemoryRateLimitStore,
    build_rate_limit_store,
)
from app.api.middleware.rate_limiting import RateLimitingMiddleware


def _app_with_store(store, heavy_limit: int = 2):
    app = FastAPI()

    class IPOverrideMiddleware(BaseHTTPMiddleware):
        async def dispatch(self, request, call_next):
            request.scope["client"] = ("203.0.113.77", 12345)
            return await call_next(request)

    app.add_middleware(
        RateLimitingMiddleware,
        rate_limit_per_minute=50,
        heavy_rate_limit_per_minute=heavy_limit,
        heavy_path_prefixes=["/api/physics/"],
        whitelist_ips=[],
        store=store,
    )
    app.add_middleware(IPOverrideMiddleware)

    @app.post("/api/physics/quantum-tunneling")
    def qt():
        return {"ok": True}

    return app


def test_build_rate_limit_store_defaults_to_memory():
    store = build_rate_limit_store(backend="memory")
    assert store.get("x") is None
    store.set("x", (1, 0.0, 0, 0))
    assert store.get("x") == (1, 0.0, 0, 0)


def test_build_rate_limit_store_redis_requires_url():
    try:
        build_rate_limit_store(backend="redis", redis_url=None)
        assert False, "expected RuntimeError"
    except RuntimeError as exc:
        assert "RATE_LIMIT_REDIS_URL" in str(exc)


def test_shared_store_two_middleware_instances_share_heavy_budget():
    """Simulates two workers: same store → heavy limit is not doubled."""
    shared = SharedMemoryRateLimitStore()
    client_a = TestClient(_app_with_store(shared, heavy_limit=2), raise_server_exceptions=False)
    client_b = TestClient(_app_with_store(shared, heavy_limit=2), raise_server_exceptions=False)

    assert client_a.post("/api/physics/quantum-tunneling").status_code == 200
    assert client_b.post("/api/physics/quantum-tunneling").status_code == 200
    blocked = client_a.post("/api/physics/quantum-tunneling")
    assert blocked.status_code == 429
    assert blocked.headers.get("Retry-After")
    assert blocked.headers.get("X-RateLimit-Scope") == "heavy"
    # Second "worker" also sees the shared fence.
    assert client_b.post("/api/physics/quantum-tunneling").status_code == 429


def test_separate_memory_stores_dilute_like_replicas():
    """Control: two private stores allow 2× the heavy budget (dilution)."""
    client_a = TestClient(
        _app_with_store(SharedMemoryRateLimitStore(), heavy_limit=1),
        raise_server_exceptions=False,
    )
    client_b = TestClient(
        _app_with_store(SharedMemoryRateLimitStore(), heavy_limit=1),
        raise_server_exceptions=False,
    )
    assert client_a.post("/api/physics/quantum-tunneling").status_code == 200
    assert client_b.post("/api/physics/quantum-tunneling").status_code == 200
    assert client_a.post("/api/physics/quantum-tunneling").status_code == 429
    # Other store still has budget until its own limit.
    assert client_b.post("/api/physics/quantum-tunneling").status_code == 429
