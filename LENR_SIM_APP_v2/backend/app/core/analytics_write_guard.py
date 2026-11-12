"""Backward-compatible Analytics write gate.

Prefer importing from ``app.core.write_token_guard``. This module re-exports the
same dependency so existing analytics routes keep working unchanged.
"""

from __future__ import annotations

from app.core.write_token_guard import (  # noqa: F401
    WRITE_TOKEN_HEADER,
    require_analytics_write,
    require_production_write_token,
    require_shared_simulation_write,
)
