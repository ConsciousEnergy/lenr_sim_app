"""
Concurrency guard for CPU-heavy, unauthenticated simulation endpoints.

The public beta runs a single uvicorn worker (per-process rate-limit / WebSocket
state), so heavy NumPy/SciPy work must (a) leave the event loop free and (b) be
bounded so a burst of requests degrades to fast 503s instead of an OOM or a
minutes-long queue on a 2 vCPU host.

Usage::

    async with heavy_compute_slot("unified/simulate"):
        result = await run_in_threadpool(sync_compute, request)

``heavy_compute_slot`` waits up to ``LENR_HEAVY_SLOT_WAIT_SECONDS`` for one of
``LENR_MAX_CONCURRENT_HEAVY_SIMS`` slots, then raises ``HTTPException(503)`` with
a ``Retry-After`` header. The semaphore is created lazily per event loop so the
module stays import-safe under pytest and multiple TestClient loops.
"""

import asyncio
import logging
from contextlib import asynccontextmanager
from typing import AsyncIterator, Optional

from fastapi import HTTPException
from starlette.concurrency import run_in_threadpool  # re-exported for callers

from app.core.config import settings

__all__ = ["heavy_compute_slot", "run_in_threadpool", "reset_heavy_compute_slots"]

logger = logging.getLogger(__name__)

_semaphore: Optional[asyncio.Semaphore] = None
_semaphore_loop: Optional[asyncio.AbstractEventLoop] = None
_semaphore_limit: Optional[int] = None


def _get_semaphore() -> asyncio.Semaphore:
    """Return the per-event-loop semaphore, recreating it if the loop or limit changed."""
    global _semaphore, _semaphore_loop, _semaphore_limit
    loop = asyncio.get_running_loop()
    limit = max(1, int(settings.MAX_CONCURRENT_HEAVY_SIMS))
    if _semaphore is None or _semaphore_loop is not loop or _semaphore_limit != limit:
        _semaphore = asyncio.Semaphore(limit)
        _semaphore_loop = loop
        _semaphore_limit = limit
    return _semaphore


def reset_heavy_compute_slots() -> None:
    """Drop the cached semaphore (tests only)."""
    global _semaphore, _semaphore_loop, _semaphore_limit
    _semaphore = None
    _semaphore_loop = None
    _semaphore_limit = None


@asynccontextmanager
async def heavy_compute_slot(label: str) -> AsyncIterator[None]:
    """Acquire a heavy-compute slot or fail fast with 503 + Retry-After."""
    semaphore = _get_semaphore()
    wait_seconds = max(0.0, float(settings.HEAVY_SLOT_WAIT_SECONDS))
    try:
        await asyncio.wait_for(semaphore.acquire(), timeout=wait_seconds)
    except asyncio.TimeoutError:
        logger.warning("Heavy compute saturated (%s): %d slots busy", label, _semaphore_limit or 0)
        raise HTTPException(
            status_code=503,
            detail="The simulation service is busy. Please retry in a few seconds.",
            headers={"Retry-After": str(int(max(1.0, wait_seconds)))},
        )
    try:
        yield
    finally:
        semaphore.release()
