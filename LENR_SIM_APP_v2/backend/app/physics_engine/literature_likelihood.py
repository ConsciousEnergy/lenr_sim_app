"""Opt-in literature likelihood blended into experimental agreement.

Default five-factor scoring is unchanged. This term never promotes claim_tier.
"""

from __future__ import annotations

from typing import Any, Dict, List

from app.data.dataset_io import literature_records
from app.physics_engine.theory_protocol import TheoryContribution

SCORE_MODE_FIVE_FACTOR = "five_factor"
SCORE_MODE_PLUS_LITERATURE = "five_factor_plus_literature"
VALID_SCORE_MODES = (SCORE_MODE_FIVE_FACTOR, SCORE_MODE_PLUS_LITERATURE)


def _he4_fraction(contrib: TheoryContribution) -> float:
    value = contrib.observables.get("product_He4", 0)
    try:
        return float(value or 0.0)
    except (TypeError, ValueError):
        return 0.0


def _radiation_ok(contrib: TheoryContribution) -> bool:
    neutrons = contrib.observables.get("product_neutrons", 0) or 0
    gamma = contrib.observables.get("product_gamma", 0) or 0
    try:
        return float(neutrons) < 0.05 and float(gamma) < 0.1
    except (TypeError, ValueError):
        return False


def literature_likelihood_score(contrib: TheoryContribution) -> float:
    """Compare one contribution to tagged EMP/null literature rows."""
    score = 0.5
    records: List[Dict[str, Any]] = literature_records()
    emp_heat = [
        row for row in records
        if row.get("claim_tag") == "EMP" and float(row.get("excess_heat_watts") or 0) > 0
    ]
    null_rows = [row for row in records if row.get("claim_tag") == "null"]
    radiation_rows = [
        row for row in records
        if "EQ-OPEN-RAD-01" in (row.get("open_question_ids") or [])
        and row.get("claim_tag") == "EMP"
    ]

    if emp_heat and _he4_fraction(contrib) > 0.5:
        score += 0.2
    if emp_heat and _radiation_ok(contrib):
        score += 0.15
    if radiation_rows and _radiation_ok(contrib):
        score += 0.05
    if null_rows and contrib.energy_output_watts > 10.0:
        score -= 0.1
    return max(0.0, min(1.0, score))


def blend_experimental_agreement(
    contrib: TheoryContribution,
    heuristic: float,
    score_mode: str,
) -> float:
    """Keep the Miles heuristic unless literature mode is opted in."""
    mode = score_mode or SCORE_MODE_FIVE_FACTOR
    if mode != SCORE_MODE_PLUS_LITERATURE:
        return heuristic
    literature = literature_likelihood_score(contrib)
    return max(0.0, min(1.0, 0.7 * heuristic + 0.3 * literature))
