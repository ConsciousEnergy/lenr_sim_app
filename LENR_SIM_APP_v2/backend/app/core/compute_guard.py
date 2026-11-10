"""
Concurrency guard for CPU-heavy, unauthenticated simulation endpoints.

The public beta keeps uvicorn workers at 1 per container (per-process rate-limit
/ WebSocket state). Heavy NumPy/SciPy work must (a) leave the event loop free
and (b) be bounded so a burst degrades to fast 503s instead of OOM.

A process-wide ``threading.BoundedSemaphore`` is shared by async routes
(``heavy_compute_slot``) and sync BackgroundTasks (multi-physics) so the two
paths cannot stack to 2× ``MAX_CONCURRENT_HEAVY_SIMS``.

Usage::

    async with heavy_compute_slot("unified/simulate"):
        result = await run_in_threadpool(sync_compute, request)

    # sync / BackgroundTasks:
    if not try_acquire_heavy_slot_sync(timeout=0):
        raise busy...
    try:
        ...
    finally:
        release_heavy_slot_sync()
"""

from __future__ import annotations

import asyncio
import logging
import threading
from contextlib import asynccontextmanager
from typing import AsyncIterator, Optional

from fastapi import HTTPException
from starlette.concurrency import run_in_threadpool  # re-exported for callers

from app.core.config import settings

__all__ = [
    "heavy_compute_slot",
    "run_in_threadpool",
    "reset_heavy_compute_slots",
    "try_acquire_heavy_slot_sync",
    "release_heavy_slot_sync",
    "heavy_slots_limit",
]

logger = logging.getLogger(__name__)

_sync_semaphore: Optional[threading.BoundedSemaphore] = None
_sync_limit: Optional[int] = None
_sync_lock = threading.Lock()


def heavy_slots_limit() -> int:
    return max(1, int(settings.MAX_CONCURRENT_HEAVY_SIMS))


def _get_sync_semaphore() -> threading.BoundedSemaphore:
    """Return the process-wide heavy-compute semaphore, recreating on limit change."""
    global _sync_semaphore, _sync_limit
    limit = heavy_slots_limit()
    with _sync_lock:
        if _sync_semaphore is None or _sync_limit != limit:
            _sync_semaphore = threading.BoundedSemaphore(limit)
            _sync_limit = limit
        return _sync_semaphore


def reset_heavy_compute_slots() -> None:
    """Drop the cached semaphore (tests only)."""
    global _sync_semaphore, _sync_limit
    with _sync_lock:
        _sync_semaphore = None
        _sync_limit = None


def try_acquire_heavy_slot_sync(timeout: float = 0.0) -> bool:
    """Acquire a heavy slot from sync code (BackgroundTasks). timeout=0 → non-blocking."""
    sem = _get_sync_semaphore()
    if timeout <= 0:
        return bool(sem.acquire(blocking=False))
    return bool(sem.acquire(blocking=True, timeout=timeout))


def release_heavy_slot_sync() -> None:
    """Release a slot acquired via ``try_acquire_heavy_slot_sync``."""
    sem = _get_sync_semaphore()
    try:
        sem.release()
    except ValueError:
        # Already at max — ignore double-release in failure paths.
        logger.warning("heavy slot release ignored (semaphore already at limit)")


@asynccontextmanager
async def heavy_compute_slot(label: str) -> AsyncIterator[None]:
    """Acquire a heavy-compute slot or fail fast with 503 + Retry-After."""
    wait_seconds = max(0.0, float(settings.HEAVY_SLOT_WAIT_SECONDS))
    loop = asyncio.get_running_loop()
    sem = _get_sync_semaphore()

    def _acquire() -> bool:
        if wait_seconds <= 0:
            return bool(sem.acquire(blocking=False))
        return bool(sem.acquire(blocking=True, timeout=wait_seconds))

    acquired = await loop.run_in_executor(None, _acquire)
    if not acquired:
        logger.warning(
            "Heavy compute saturated (%s): %d slots busy",
            label,
            _sync_limit or 0,
        )
        raise HTTPException(
            status_code=503,
            detail="The simulation service is busy. Please retry in a few seconds.",
            headers={"Retry-After": str(int(max(1.0, wait_seconds)))},
        )
    try:
        yield
    finally:
        sem.release()
