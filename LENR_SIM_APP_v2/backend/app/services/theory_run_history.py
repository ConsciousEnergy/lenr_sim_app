"""Aggregate persisted theory_runs into a Relevance Map overlay.

The overlay is simulation-derived association, not empirical confidence.
Curated graph edge strength is never rewritten here.

``mean_score`` prefers persisted ``final_score`` (five-factor GM × claim
tier) and falls back to guardrails ``weighted_score``.
"""

from __future__ import annotations

from collections import defaultdict
from typing import Any, Dict, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.database_models import TheoryRun
from app.services.simulation_persistence import DISCLAIMER

HISTORY_SCHEMA = "lenr-theory-run-history-v1"

_SUBSCORE_KEYS = (
    "physical_consistency",
    "experimental_agreement",
    "parameter_sensitivity",
    "cross_theory_agreement",
    "observables_completeness",
)


def empty_theory_run_history() -> Dict[str, Any]:
    """Overlay payload when the database is unavailable."""
    return {
        "schema": HISTORY_SCHEMA,
        "score_source": "simulation_campaign",
        "score_field": "final_score_preferred",
        "is_empirical_confidence": False,
        "curated_edge_strength_unchanged": True,
        "disclaimer": DISCLAIMER,
        "n_runs": 0,
        "n_theories": 0,
        "per_theory": {},
    }


def _record_score(rec: Dict[str, Any]) -> float:
    if rec.get("final_score") is not None:
        return float(rec.get("final_score") or 0.0)
    return float(rec.get("score") or 0.0)


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
        lambda: {
            "n": 0.0,
            "sum_score": 0.0,
            "sum_weighted": 0.0,
            "sum_enhancement": 0.0,
            "sum_confidence": 0.0,
            **{f"sum_{key}": 0.0 for key in _SUBSCORE_KEYS},
        }
    )
    for run in runs:
        scores = run.theory_scores or {}
        for theory_id, rec in scores.items():
            if not isinstance(rec, dict):
                continue
            bucket = buckets[theory_id]
            bucket["n"] += 1.0
            bucket["sum_score"] += _record_score(rec)
            bucket["sum_weighted"] += float(rec.get("score") or 0.0)
            bucket["sum_enhancement"] += float(
                rec.get("enhancement") or rec.get("enhancement_factor") or 0.0
            )
            bucket["sum_confidence"] += float(rec.get("confidence") or 0.0)
            for key in _SUBSCORE_KEYS:
                bucket[f"sum_{key}"] += float(rec.get(key) or 0.0)

    per_theory = {}
    for theory_id, bucket in buckets.items():
        n = max(bucket["n"], 1.0)
        entry = {
            "n": int(bucket["n"]),
            "mean_score": bucket["sum_score"] / n,
            "mean_final_score": bucket["sum_score"] / n,
            "mean_weighted_score": bucket["sum_weighted"] / n,
            "mean_enhancement": bucket["sum_enhancement"] / n,
            "mean_confidence": bucket["sum_confidence"] / n,
        }
        for key in _SUBSCORE_KEYS:
            entry[f"mean_{key}"] = bucket[f"sum_{key}"] / n
        per_theory[theory_id] = entry

    return {
        "schema": HISTORY_SCHEMA,
        "score_source": "simulation_campaign",
        "score_field": "final_score_preferred",
        "is_empirical_confidence": False,
        "curated_edge_strength_unchanged": True,
        "disclaimer": DISCLAIMER,
        "n_runs": len(runs),
        "n_theories": len(per_theory),
        "per_theory": per_theory,
    }
