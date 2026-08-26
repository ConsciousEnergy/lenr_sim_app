"""Aggregate persisted theory_runs into a Relevance Map overlay.

The overlay is simulation-derived association, not empirical confidence.
Curated graph edge strength is never rewritten here.

``mean_score`` prefers persisted ``final_score`` (five-factor GM × claim
tier) and falls back to guardrails ``weighted_score``.
"""

from __future__ import annotations

import math
from collections import defaultdict
from typing import Any, Dict, List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.database_models import TheoryRun
from app.services.simulation_persistence import DISCLAIMER, SOURCE_CAMPAIGN

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
        "score_formula": "five_factor_gm_x_claim_tier",
        "is_empirical_confidence": False,
        "curated_edge_strength_unchanged": True,
        "disclaimer": DISCLAIMER,
        "skip_sensitivity_note": (
            "Persisted parameter_sensitivity is 0.5 unless live scores are computed."
        ),
        "n_runs": 0,
        "n_theories": 0,
        "per_theory": {},
        "by_source_class": {},
    }


def _record_score(rec: Dict[str, Any]) -> float:
    if rec.get("final_score") is not None:
        return float(rec.get("final_score") or 0.0)
    return float(rec.get("score") or 0.0)


def _percentile(sorted_vals: List[float], percent: float) -> float:
    if not sorted_vals:
        return 0.0
    if len(sorted_vals) == 1:
        return sorted_vals[0]
    rank = (len(sorted_vals) - 1) * (percent / 100.0)
    low = math.floor(rank)
    high = math.ceil(rank)
    if low == high:
        return sorted_vals[low]
    weight = rank - low
    return sorted_vals[low] * (1.0 - weight) + sorted_vals[high] * weight


def _run_source_class(run: TheoryRun) -> str:
    if run.session_id == SOURCE_CAMPAIGN or run.session_id == "simulation_campaign":
        return "Campaign"
    if run.session_id:
        return "Auto"
    return "User"


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

    buckets: Dict[str, Dict[str, Any]] = defaultdict(
        lambda: {
            "n": 0.0,
            "sum_score": 0.0,
            "sum_weighted": 0.0,
            "sum_enhancement": 0.0,
            "sum_confidence": 0.0,
            "values": [],
            **{f"sum_{key}": 0.0 for key in _SUBSCORE_KEYS},
        }
    )
    source_counts: Dict[str, int] = defaultdict(int)
    for run in runs:
        source_counts[_run_source_class(run)] += 1
        scores = run.theory_scores or {}
        for theory_id, rec in scores.items():
            if not isinstance(rec, dict):
                continue
            bucket = buckets[theory_id]
            bucket["n"] += 1.0
            value = _record_score(rec)
            bucket["sum_score"] += value
            bucket["values"].append(value)
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
        values = sorted(float(item) for item in bucket["values"])
        entry = {
            "n": int(bucket["n"]),
            "mean_score": bucket["sum_score"] / n,
            "mean_final_score": bucket["sum_score"] / n,
            "mean_weighted_score": bucket["sum_weighted"] / n,
            "mean_enhancement": bucket["sum_enhancement"] / n,
            "mean_confidence": bucket["sum_confidence"] / n,
            "ci_lo": _percentile(values, 2.5),
            "ci_hi": _percentile(values, 97.5),
            "ci_method": "percentile_2.5_97.5",
            "score_formula": "five_factor_gm_x_claim_tier",
        }
        for key in _SUBSCORE_KEYS:
            entry[f"mean_{key}"] = bucket[f"sum_{key}"] / n
        per_theory[theory_id] = entry

    return {
        "schema": HISTORY_SCHEMA,
        "score_source": "simulation_campaign",
        "score_field": "final_score_preferred",
        "score_formula": "five_factor_gm_x_claim_tier",
        "is_empirical_confidence": False,
        "curated_edge_strength_unchanged": True,
        "disclaimer": DISCLAIMER,
        "skip_sensitivity_note": (
            "Persisted parameter_sensitivity is 0.5 unless live scores are computed."
        ),
        "n_runs": len(runs),
        "n_theories": len(per_theory),
        "per_theory": per_theory,
        "by_source_class": dict(source_counts),
    }
