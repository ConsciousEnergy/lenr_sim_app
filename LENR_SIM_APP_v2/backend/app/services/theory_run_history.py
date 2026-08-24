"""Aggregate persisted theory_runs into a Relevance Map overlay.

The overlay is simulation-derived association, not empirical confidence.
Curated graph edge strength is never rewritten here.
"""

from __future__ import annotations

from collections import defaultdict
from typing import Any, Dict, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.database_models import TheoryRun
from app.services.simulation_persistence import DISCLAIMER

HISTORY_SCHEMA = "lenr-theory-run-history-v1"


async def aggregate_theory_run_history(
    session: AsyncSession,
    session_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Mean per-theory scores across persisted pipeline runs."""
    query = select(TheoryRun)
    if session_id:
        query = query.where(TheoryRun.session_id == session_id)
    result = await session.execute(query)
    runs = list(result.scalars().all())

    buckets: Dict[str, Dict[str, float]] = defaultdict(
        lambda: {"n": 0.0, "sum_score": 0.0, "sum_enhancement": 0.0, "sum_confidence": 0.0}
    )
    for run in runs:
        scores = run.theory_scores or {}
        for theory_id, rec in scores.items():
            if not isinstance(rec, dict):
                continue
            bucket = buckets[theory_id]
            bucket["n"] += 1.0
            bucket["sum_score"] += float(rec.get("score") or 0.0)
            bucket["sum_enhancement"] += float(rec.get("enhancement") or 0.0)
            bucket["sum_confidence"] += float(rec.get("confidence") or 0.0)

    per_theory = {}
    for theory_id, bucket in buckets.items():
        n = max(bucket["n"], 1.0)
        per_theory[theory_id] = {
            "n": int(bucket["n"]),
            "mean_score": bucket["sum_score"] / n,
            "mean_enhancement": bucket["sum_enhancement"] / n,
            "mean_confidence": bucket["sum_confidence"] / n,
        }

    return {
        "schema": HISTORY_SCHEMA,
        "score_source": "simulation_campaign",
        "is_empirical_confidence": False,
        "curated_edge_strength_unchanged": True,
        "disclaimer": DISCLAIMER,
        "n_runs": len(runs),
        "n_theories": len(per_theory),
        "per_theory": per_theory,
    }
