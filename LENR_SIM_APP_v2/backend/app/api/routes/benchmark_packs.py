"""Benchmark pack API — UMLENR P1–P6 honesty-gated downloads."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse, Response

from app.services.benchmark_pack import (
    DEFAULT_PACK_ID,
    build_benchmark_pack_zip,
    list_benchmark_packs,
)

router = APIRouter(prefix="/benchmark-packs", tags=["Benchmark Packs"])

# Reuse the same spirit as /api/unified/export: tighter per-IP budget for zip.
_DOWNLOAD_CLIENTS: dict = {}
_DOWNLOAD_LIMIT = 10
_DOWNLOAD_WINDOW_S = 60.0
_DOWNLOAD_CLIENT_MAX = 256


def _enforce_download_rate_limit(request: Request) -> None:
    import time

    from app.security.client_ip import client_ip_from_request

    client_ip = client_ip_from_request(request) or "unknown"
    now = time.monotonic()
    stale = [
        ip
        for ip, (_count, window_start) in _DOWNLOAD_CLIENTS.items()
        if now - window_start >= _DOWNLOAD_WINDOW_S
    ]
    for ip in stale:
        _DOWNLOAD_CLIENTS.pop(ip, None)
    if (
        len(_DOWNLOAD_CLIENTS) >= _DOWNLOAD_CLIENT_MAX
        and client_ip not in _DOWNLOAD_CLIENTS
    ):
        oldest_ip = min(_DOWNLOAD_CLIENTS.items(), key=lambda item: item[1][1])[0]
        _DOWNLOAD_CLIENTS.pop(oldest_ip, None)

    count, window_start = _DOWNLOAD_CLIENTS.get(client_ip, (0, now))
    if now - window_start >= _DOWNLOAD_WINDOW_S:
        _DOWNLOAD_CLIENTS[client_ip] = (1, now)
        return
    if count >= _DOWNLOAD_LIMIT:
        raise HTTPException(
            status_code=429,
            detail="Too Many Requests - benchmark pack download rate limit exceeded",
        )
    _DOWNLOAD_CLIENTS[client_ip] = (count + 1, window_start)


@router.get("")
async def get_benchmark_pack_index() -> JSONResponse:
    """Read-only index of UMLENR benchmark packs (``umlenr-benchmark-pack-v1``)."""
    payload = list_benchmark_packs()
    if payload.get("lenr_proved") is True:
        raise HTTPException(
            status_code=500,
            detail="benchmark pack index must keep lenr_proved false",
        )
    return JSONResponse(payload)


@router.get("/{pack_id}/download")
async def download_benchmark_pack(pack_id: str, request: Request) -> Response:
    """Download a benchmark pack zip (PROVENANCE + P1–P6 inventory + stubs)."""
    _enforce_download_rate_limit(request)
    try:
        data = build_benchmark_pack_zip(pack_id=pack_id)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    filename = f"{pack_id or DEFAULT_PACK_ID}.zip"
    return Response(
        content=data,
        media_type="application/zip",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "X-LENR-Proved": "false",
            "X-EQ-Open-Status": "all_five_OPEN",
        },
    )
