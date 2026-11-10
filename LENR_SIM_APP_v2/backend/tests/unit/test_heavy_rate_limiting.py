"""Path-aware heavy rate-limit + /api/health whitelist."""

from fastapi import FastAPI
from fastapi.testclient import TestClient
from starlette.middleware.base import BaseHTTPMiddleware

from app.api.middleware.rate_limiting import RateLimitingMiddleware


def _app(heavy_limit: int = 2, general_limit: int = 20):
    app = FastAPI()

    class IPOverrideMiddleware(BaseHTTPMiddleware):
        async def dispatch(self, request, call_next):
            request.scope["client"] = ("203.0.113.50", 12345)
            return await call_next(request)

    app.add_middleware(
        RateLimitingMiddleware,
        rate_limit_per_minute=general_limit,
        heavy_rate_limit_per_minute=heavy_limit,
        heavy_path_prefixes=["/api/unified/simulate", "/api/unified/compare"],
        whitelist_ips=[],
        whitelist_paths=["/api/health", "/health"],
    )
    app.add_middleware(IPOverrideMiddleware)

    @app.post("/api/unified/simulate")
    def simulate():
        return {"ok": True}

    @app.get("/api/health")
    def health():
        return {"status": "healthy"}

    @app.get("/light")
    def light():
        return {"ok": True}

    return app


def test_heavy_path_uses_stricter_budget():
    client = TestClient(_app(heavy_limit=2), raise_server_exceptions=False)
    assert client.post("/api/unified/simulate").status_code == 200
    assert client.post("/api/unified/simulate").status_code == 200
    blocked = client.post("/api/unified/simulate")
    assert blocked.status_code == 429
    assert blocked.headers.get("X-RateLimit-Limit") == "2"


def test_api_health_is_whitelisted():
    client = TestClient(_app(heavy_limit=1, general_limit=1), raise_server_exceptions=False)
    # Burn general budget
    assert client.get("/light").status_code == 200
    assert client.get("/light").status_code == 429
    # Health still OK
    for _ in range(5):
        assert client.get("/api/health").status_code == 200


def test_light_path_keeps_general_budget():
    client = TestClient(_app(heavy_limit=1, general_limit=3), raise_server_exceptions=False)
    for _ in range(3):
        assert client.get("/light").status_code == 200
    assert client.get("/light").status_code == 429
