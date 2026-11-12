"""Production write-token gate shared by Analytics and shared-simulation mutates.

GET/list/stats stay public. Writes require header ``X-LENR-Write-Token`` matching
``LENR_ANALYTICS_WRITE_TOKEN``, or ``SECRET_KEY`` when the dedicated token is unset.
"""

from __future__ import annotations

import hmac
from typing import Optional

from fastapi import Depends, Header, HTTPException, status

from app.core.config import EnvironmentType, Settings, get_settings

WRITE_TOKEN_HEADER = "X-LENR-Write-Token"


def _tokens_match(provided: str, expected: str) -> bool:
    provided_b = provided.encode("utf-8")
    expected_b = expected.encode("utf-8")
    if len(provided_b) != len(expected_b):
        return False
    return hmac.compare_digest(provided_b, expected_b)


def require_production_write_token(
    *,
    detail: str,
    x_lenr_write_token: Optional[str],
    settings: Settings,
) -> None:
    """No-op outside production; 403 on missing/wrong token in prod."""
    if settings.ENVIRONMENT != EnvironmentType.PRODUCTION:
        return
    expected = (settings.ANALYTICS_WRITE_TOKEN or settings.SECRET_KEY or "").strip()
    if not expected or not x_lenr_write_token or not _tokens_match(x_lenr_write_token, expected):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=detail)


def require_analytics_write(
    x_lenr_write_token: Optional[str] = Header(default=None, alias=WRITE_TOKEN_HEADER),
    settings: Settings = Depends(get_settings),
) -> None:
    """Gate Analytics experiment mutate routes in production."""
    require_production_write_token(
        detail=(
            "Analytics writes require a valid X-LENR-Write-Token header "
            "in production. GET/stats stay public."
        ),
        x_lenr_write_token=x_lenr_write_token,
        settings=settings,
    )


def require_shared_simulation_write(
    x_lenr_write_token: Optional[str] = Header(default=None, alias=WRITE_TOKEN_HEADER),
    settings: Settings = Depends(get_settings),
) -> None:
    """Fail-closed gate for shared-simulation save/share in production."""
    require_production_write_token(
        detail=(
            "Shared-simulation writes require a valid X-LENR-Write-Token header "
            "in production. Public browse/search stay available."
        ),
        x_lenr_write_token=x_lenr_write_token,
        settings=settings,
    )
