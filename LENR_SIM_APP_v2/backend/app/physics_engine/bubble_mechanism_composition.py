"""
Bubble-lattice enhancement composition and three-tier prediction reporting.

The naive product in ``_calculate_enhancement_breakdown`` multiplies
collapse-correlated mechanisms (compression, casimir, qed, rydberg) as if they
were independent. This module applies grouped max-within-group composition
(EQ-BBL-COMP-01) and separates:

* **sensitivity_model** — exploratory upper-bound product (legacy naive multiply)
* **physics_governed** — grouped composition with per-mechanism physics bounds
* **claim_tier_display** — governance ceiling (``MAX_ENHANCEMENT_FACTOR``)
"""

from __future__ import annotations

import math
from typing import Any, Dict, List, Mapping, Optional, Tuple

from app.physics_engine.constants import MAX_ENHANCEMENT_FACTOR
from app.physics_engine.enhancement_saturation import MECHANISM_KEYS, _safe_log10

# Correlated mechanisms share a group; within a group take max, across groups multiply.
BUBBLE_MECHANISM_GROUPS: Dict[str, Tuple[str, ...]] = {
    "barrier_screening": ("screening",),
    "collapse_geometry": ("compression", "casimir"),
    "field_coupling": ("qed", "rydberg"),
    "lattice_coupling": ("phonon",),
    "material_loading": ("loading",),
    "electrolyte": ("electrolyte",),
}

# Literature / model caps distinct from the claim-tier display ceiling.
MECHANISM_PHYSICS_BOUNDS: Dict[str, Optional[float]] = {
    "screening": float(MAX_ENHANCEMENT_FACTOR),
    "phonon": 100.0,
    "qed": 2.0,
    "compression": 1.0e6,
    "casimir": 1.0e6,
    "rydberg": 10.0,
    "loading": 3.0,
    "electrolyte": None,
}

COMPOSITION_RULE = "bubble_grouped_max_product"


def _mechanism_values(raw_breakdown: Mapping[str, Any]) -> Dict[str, float]:
    values: Dict[str, float] = {}
    for key in MECHANISM_KEYS:
        raw = raw_breakdown.get(key, 1.0)
        if isinstance(raw, (int, float)) and not isinstance(raw, bool):
            values[key] = float(raw)
        else:
            values[key] = 1.0
    return values


def apply_physics_bounds(
    mechanisms: Mapping[str, float],
) -> Tuple[Dict[str, float], Dict[str, Dict[str, Any]]]:
    """Cap each mechanism at its physics bound and record exceedance."""
    bounded: Dict[str, float] = {}
    meta: Dict[str, Dict[str, Any]] = {}
    for key, raw_value in mechanisms.items():
        bound = MECHANISM_PHYSICS_BOUNDS.get(key)
        raw_float = float(raw_value)
        if bound is None or not math.isfinite(bound):
            bounded_value = raw_float
            exceeded = False
        else:
            bounded_value = min(raw_float, float(bound))
            exceeded = raw_float > float(bound) * (1.0 + 1e-9)
        bounded[key] = bounded_value
        meta[key] = {
            "value_raw": raw_float,
            "value_bounded": bounded_value,
            "physics_bound": bound,
            "is_physics_exceeded": exceeded,
            "log10_value_raw": _safe_log10(raw_float),
            "log10_value_bounded": _safe_log10(bounded_value),
        }
    return bounded, meta


def _product_log10(values: Mapping[str, float]) -> float:
    return sum(_safe_log10(float(v)) for v in values.values())


def _product_linear(log10_total: float) -> float:
    if not math.isfinite(log10_total) or log10_total >= 300.0:
        return math.inf
    return 10.0 ** log10_total


def compose_governed_product(
    bounded_mechanisms: Mapping[str, float],
) -> Tuple[float, float, List[Dict[str, Any]]]:
    """Grouped max-within-group, multiply across groups."""
    log10_total = 0.0
    groups: List[Dict[str, Any]] = []

    for group_name, members in BUBBLE_MECHANISM_GROUPS.items():
        candidates = [
            {
                "id": member,
                "value": float(bounded_mechanisms.get(member, 1.0)),
                "log10_value": _safe_log10(bounded_mechanisms.get(member, 1.0)),
            }
            for member in members
            if member in bounded_mechanisms
        ]
        if not candidates:
            continue

        if len(candidates) == 1:
            selected = candidates[0]
            rule = "pass_through"
        else:
            selected = max(candidates, key=lambda row: row["value"])
            rule = "max"

        log10_total += selected["log10_value"]
        groups.append(
            {
                "group": group_name,
                "rule": rule,
                "candidates": candidates,
                "selected": selected["id"],
                "value": selected["value"],
                "log10_value": selected["log10_value"],
            }
        )

    total = _product_linear(log10_total)
    return total, log10_total, groups


def build_prediction_report(
    raw_breakdown: Mapping[str, Any],
    ceiling: float = MAX_ENHANCEMENT_FACTOR,
) -> Dict[str, Any]:
    """Build the three-tier prediction block for API consumers."""
    mechanisms = _mechanism_values(raw_breakdown)
    bounded, bound_meta = apply_physics_bounds(mechanisms)

    sensitivity_log10 = _product_log10(mechanisms)
    governed_total, governed_log10, groups = compose_governed_product(bounded)
    claim_total = min(governed_total, float(ceiling)) if math.isfinite(governed_total) else float(ceiling)

    return {
        "composition_rule": COMPOSITION_RULE,
        "not_a_nature_theorem": True,
        "sensitivity_model": {
            "total_log10": sensitivity_log10,
            "total": _product_linear(sensitivity_log10),
            "mechanisms": {
                key: {
                    "value": mechanisms[key],
                    "log10_value": _safe_log10(mechanisms[key]),
                }
                for key in mechanisms
            },
        },
        "physics_governed": {
            "total": governed_total,
            "total_log10": governed_log10,
            "mechanisms": bound_meta,
            "groups": groups,
        },
        "claim_tier_display": {
            "total": claim_total,
            "total_log10": _safe_log10(claim_total),
            "ceiling": float(ceiling),
        },
    }


def attach_prediction_to_breakdown(
    raw_breakdown: Dict[str, Any],
    ceiling: float = MAX_ENHANCEMENT_FACTOR,
) -> Dict[str, Any]:
    """Return a copy of the breakdown with the additive ``prediction`` block."""
    enriched = dict(raw_breakdown)
    enriched["prediction"] = build_prediction_report(raw_breakdown, ceiling=ceiling)
    return enriched
