"""Public-beta compute hardening: heavy-compute slots, input bounds, root advertisement.

These guard the single-worker VPS profile: unauthenticated compute must be
bounded (422 above limits), saturate to fast 503s (with Retry-After) instead of
queueing, and the export envelope must stay ``lenr-run-export-v1``.
"""

from __future__ import annotations

import asyncio
import threading

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.core import compute_guard
from app.core.config import settings
from app.routers import multi_physics_routes as mp_routes
from app.routers.websocket_router import _coerce_duration_steps


def _client() -> TestClient:
    from app.main import app

    return TestClient(app)


def _sync_available() -> int:
    """Best-effort count of free slots on the process-wide BoundedSemaphore."""
    sem = compute_guard._get_sync_semaphore()
    # threading.BoundedSemaphore has no public counter; probe with non-blocking acquire.
    held = 0
    while sem.acquire(blocking=False):
        held += 1
    for _ in range(held):
        sem.release()
    return held


# --------------------------------------------------------------------------- #
# heavy_compute_slot
# --------------------------------------------------------------------------- #
def test_heavy_compute_slot_releases_after_use() -> None:
    compute_guard.reset_heavy_compute_slots()

    async def scenario() -> None:
        async with compute_guard.heavy_compute_slot("t"):
            pass
        assert _sync_available() == max(1, settings.MAX_CONCURRENT_HEAVY_SIMS)

    asyncio.run(scenario())
    compute_guard.reset_heavy_compute_slots()


def test_heavy_compute_slot_returns_503_when_saturated(monkeypatch) -> None:
    monkeypatch.setattr(settings, "MAX_CONCURRENT_HEAVY_SIMS", 1)
    monkeypatch.setattr(settings, "HEAVY_SLOT_WAIT_SECONDS", 0.05)
    compute_guard.reset_heavy_compute_slots()

    async def scenario() -> HTTPException:
        async with compute_guard.heavy_compute_slot("outer"):
            with pytest.raises(HTTPException) as exc_info:
                async with compute_guard.heavy_compute_slot("inner"):
                    pass
        return exc_info.value

    exc = asyncio.run(scenario())
    assert exc.status_code == 503
    assert exc.headers["Retry-After"].isdigit()
    compute_guard.reset_heavy_compute_slots()


def test_simulate_endpoint_returns_503_when_saturated(monkeypatch) -> None:
    """A saturated slot must surface as 503 through the HTTP layer, not a 500."""
    monkeypatch.setattr(settings, "MAX_CONCURRENT_HEAVY_SIMS", 1)
    monkeypatch.setattr(settings, "HEAVY_SLOT_WAIT_SECONDS", 0.05)
    compute_guard.reset_heavy_compute_slots()

    from app.api.routes import unified_simulation as routes

    release = threading.Event()
    real_compute = routes._compute_unified_simulation

    def slow_compute(request):  # noqa: ANN001 - mirrors the real signature
        release.wait(timeout=5)
        return real_compute(request)

    monkeypatch.setattr(routes, "_compute_unified_simulation", slow_compute)
    payload = {"material": {"host_material": "palladium", "reactant": "deuterium"}}

    with _client() as client:
        results: dict = {}

        def first_call() -> None:
            results["first"] = client.post("/api/unified/simulate", json=payload)

        worker = threading.Thread(target=first_call)
        worker.start()
        # Give the first request time to occupy the single slot.
        import time

        deadline = time.time() + 3
        while time.time() < deadline and compute_guard._sync_semaphore is None:
            time.sleep(0.01)
        while time.time() < deadline and _sync_available() != 0:
            time.sleep(0.01)
        # Slot held by first request → available == 0
        deadline = time.time() + 3
        while time.time() < deadline and _sync_available() != 0:
            time.sleep(0.01)
        second = client.post("/api/unified/simulate", json=payload)
        release.set()
        worker.join(timeout=30)

    assert second.status_code == 503, second.text
    assert "Retry-After" in second.headers
    assert results["first"].status_code == 200, results["first"].text
    compute_guard.reset_heavy_compute_slots()


def test_sync_and_async_slots_share_one_pool(monkeypatch) -> None:
    monkeypatch.setattr(settings, "MAX_CONCURRENT_HEAVY_SIMS", 1)
    monkeypatch.setattr(settings, "HEAVY_SLOT_WAIT_SECONDS", 0.05)
    compute_guard.reset_heavy_compute_slots()
    assert compute_guard.try_acquire_heavy_slot_sync(timeout=0) is True

    async def scenario() -> None:
        with pytest.raises(HTTPException) as exc_info:
            async with compute_guard.heavy_compute_slot("blocked"):
                pass
        assert exc_info.value.status_code == 503

    asyncio.run(scenario())
    compute_guard.release_heavy_slot_sync()
    compute_guard.reset_heavy_compute_slots()


# --------------------------------------------------------------------------- #
# Multi-physics bounds + admission control
# --------------------------------------------------------------------------- #
def test_multi_physics_rejects_oversized_grid() -> None:
    too_big = settings.MAX_MULTI_PHYSICS_GRID_POINTS_PER_AXIS + 1
    with pytest.raises(ValidationError):
        mp_routes.SimulationRequest(resolution=(too_big, 4, 4))


def test_multi_physics_rejects_excessive_step_count() -> None:
    with pytest.raises(ValidationError):
        mp_routes.SimulationRequest(simulation_time=1.0, time_step=1e-9)


def test_multi_physics_accepts_limits() -> None:
    n = settings.MAX_MULTI_PHYSICS_GRID_POINTS_PER_AXIS
    req = mp_routes.SimulationRequest(
        resolution=(n, n, n),
        simulation_time=settings.MAX_MULTI_PHYSICS_STEPS * 1e-6,
        time_step=1e-6,
    )
    assert req.resolution == (n, n, n)


def test_multi_physics_endpoint_422_and_503(monkeypatch) -> None:
    monkeypatch.setattr(settings, "MAX_CONCURRENT_HEAVY_SIMS", 1)
    monkeypatch.setattr(settings, "HEAVY_SLOT_WAIT_SECONDS", 0.05)
    compute_guard.reset_heavy_compute_slots()
    mp_routes.simulation_results.clear()
    with _client() as client:
        bad = client.post(
            "/api/multi-physics/simulations",
            json={"resolution": [999, 2, 2]},
        )
        assert bad.status_code == 422

        assert compute_guard.try_acquire_heavy_slot_sync(timeout=0) is True
        try:
            busy = client.post("/api/multi-physics/simulations", json={})
            assert busy.status_code == 503
            assert "Retry-After" in busy.headers
        finally:
            compute_guard.release_heavy_slot_sync()
    mp_routes.simulation_results.clear()
    compute_guard.reset_heavy_compute_slots()


def test_multi_physics_store_is_bounded() -> None:
    mp_routes.simulation_results.clear()
    for i in range(mp_routes.MAX_STORED_SIMULATIONS + 25):
        mp_routes.simulation_results[f"done-{i}"] = {"status": "completed"}
    mp_routes.simulation_results["active"] = {"status": "running"}
    mp_routes._evict_finished_simulations()
    assert len(mp_routes.simulation_results) == mp_routes.MAX_STORED_SIMULATIONS
    assert "active" in mp_routes.simulation_results
    mp_routes.simulation_results.clear()


# --------------------------------------------------------------------------- #
# WebSocket duration_steps cap
# --------------------------------------------------------------------------- #
@pytest.mark.parametrize(
    "raw, expected",
    [
        (100, 100),
        (1, 1),
        (0, None),
        (-5, None),
        (True, None),
        ("100", None),
        (10**9, None),
    ],
)
def test_coerce_duration_steps(raw, expected) -> None:
    assert _coerce_duration_steps(raw) == expected


def test_coerce_duration_steps_at_limit() -> None:
    limit = settings.MAX_WS_DURATION_STEPS
    assert _coerce_duration_steps(limit) == limit
    assert _coerce_duration_steps(limit + 1) is None


# --------------------------------------------------------------------------- #
# Root advertisement + export envelope contract
# --------------------------------------------------------------------------- #
def test_root_does_not_advertise_dev_routes_in_production(monkeypatch) -> None:
    from app.core.config import EnvironmentType

    with _client() as client:
        monkeypatch.setattr(settings, "ENVIRONMENT", EnvironmentType.PRODUCTION)
        body = client.get("/").json()
    for key in ("docs", "fitting", "logs", "diagnostics"):
        assert key not in body["endpoints"]
    assert body["endpoints"]["health"] == "/api/health"


def test_export_envelope_unchanged_after_threadpool_refactor() -> None:
    payload = {"material": {"host_material": "palladium", "reactant": "deuterium"}}
    with _client() as client:
        resp = client.post("/api/unified/export", json=payload)
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["schema_version"] == "lenr-run-export-v1"
    assert "contract_version" in body["results"]
    assert body["results"]["contract_version"]
