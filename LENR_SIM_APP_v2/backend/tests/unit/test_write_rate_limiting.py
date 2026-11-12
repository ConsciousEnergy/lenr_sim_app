"""Write-tier rate limit for shared-simulation persistence paths."""

from fastapi import FastAPI
from fastapi.testclient import TestClient
from starlette.middleware.base import BaseHTTPMiddleware

from app.api.middleware.rate_limiting import RateLimitingMiddleware


def _app(write_limit: int = 2):
    app = FastAPI()

    class IPOverrideMiddleware(BaseHTTPMiddleware):
        async def dispatch(self, request, call_next):
            request.scope["client"] = ("203.0.113.77", 12345)
            return await call_next(request)

    app.add_middleware(
        RateLimitingMiddleware,
        rate_limit_per_minute=60,
        heavy_rate_limit_per_minute=10,
        write_rate_limit_per_minute=write_limit,
        heavy_path_prefixes=["/api/unified/simulate"],
        write_path_prefixes=["/api/simulations/save", "/api/simulations/share"],
        whitelist_ips=[],
        whitelist_paths=["/api/health"],
    )
    app.add_middleware(IPOverrideMiddleware)

    @app.post("/api/simulations/save")
    def save():
        return {"ok": True}

    @app.post("/api/unified/simulate")
    def simulate():
        return {"ok": True}

    return app


def test_save_path_uses_write_budget():
    client = TestClient(_app(write_limit=2), raise_server_exceptions=False)
    assert client.post("/api/simulations/save").status_code == 200
    assert client.post("/api/simulations/save").status_code == 200
    blocked = client.post("/api/simulations/save")
    assert blocked.status_code == 429
    assert blocked.headers.get("X-RateLimit-Scope") == "write"
    assert blocked.headers.get("X-RateLimit-Limit") == "2"
    assert blocked.headers.get("X-RateLimit-Remaining") == "0"
    body = blocked.json()
    assert body["scope"] == "write"
    assert "Retry-After" in blocked.headers


def test_write_budget_does_not_block_heavy_immediately():
    client = TestClient(_app(write_limit=1), raise_server_exceptions=False)
    assert client.post("/api/simulations/save").status_code == 200
    assert client.post("/api/simulations/save").status_code == 429
    # Heavy path still has its own budget
    assert client.post("/api/unified/simulate").status_code == 200


def test_physics_and_multi_physics_use_heavy_scope():
    app = FastAPI()

    class IPOverrideMiddleware(BaseHTTPMiddleware):
        async def dispatch(self, request, call_next):
            request.scope["client"] = ("203.0.113.88", 12345)
            return await call_next(request)

    app.add_middleware(
        RateLimitingMiddleware,
        rate_limit_per_minute=60,
        heavy_rate_limit_per_minute=2,
        write_rate_limit_per_minute=3,
        heavy_path_prefixes=["/api/physics/", "/api/multi-physics/"],
        write_path_prefixes=["/api/simulations/save"],
        whitelist_ips=[],
        whitelist_paths=["/api/health"],
    )
    app.add_middleware(IPOverrideMiddleware)

    @app.post("/api/physics/quantum-tunneling")
    def tunneling():
        return {"ok": True}

    @app.post("/api/multi-physics/simulations")
    def multi():
        return {"ok": True}

    client = TestClient(app, raise_server_exceptions=False)
    assert client.post("/api/physics/quantum-tunneling").status_code == 200
    assert client.post("/api/multi-physics/simulations").status_code == 200
    blocked = client.post("/api/physics/quantum-tunneling")
    assert blocked.status_code == 429
    assert blocked.headers.get("X-RateLimit-Scope") == "heavy"
