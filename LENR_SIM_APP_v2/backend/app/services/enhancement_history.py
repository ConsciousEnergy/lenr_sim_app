"""History honesty helpers: saturated enhancement and distinct power watts.

Saturated enhancement is the claim-tier display ceiling
(``MAX_ENHANCEMENT_FACTOR``), not a laboratory tunneling measurement.
Watts and keV stay separate units. Extra runs do not prove LENR.
"""

from __future__ import annotations

import math
from typing import Any, Dict, Optional

from app.physics_engine.constants import MAX_ENHANCEMENT_FACTOR

_SATURATION_RTOL = 1e-9

SATURATION_NOTE = (
    "Saturated enhancement is the claim-tier display ceiling, not a "
    "physical prediction. Read log10_value_raw for the uncapped model output."
)


def enhancement_is_saturated(
    value: Any,
    ceiling: float = MAX_ENHANCEMENT_FACTOR,
) -> bool:
    if value is None:
        return False
    try:
        raw = float(value)
    except (TypeError, ValueError):
        return False
    if not math.isfinite(raw):
        return True
    return raw >= float(ceiling) * (1.0 - _SATURATION_RTOL)


def _safe_log10(value: float) -> Optional[float]:
    if not math.isfinite(value) or value <= 0.0:
        return None
    return math.log10(value)


def compact_saturation_snippet(
    *,
    enhancement_factor: Any = None,
    report: Optional[Dict[str, Any]] = None,
    ceiling: float = MAX_ENHANCEMENT_FACTOR,
) -> Dict[str, Any]:
    """Small ``results.enhancement_saturation`` block for History.

    Additive. Does not change the stored ``enhancement_factor`` column.
    """
    snippet: Dict[str, Any] = {
        "ceiling": float(ceiling),
        "is_saturated": False,
        "log10_value_raw": None,
        "note": SATURATION_NOTE,
    }
    if isinstance(report, dict):
        mechanisms = report.get("mechanisms") or {}
        total = mechanisms.get("total") if isinstance(mechanisms, dict) else None
        if isinstance(total, dict):
            snippet["is_saturated"] = bool(
                total.get("is_saturated") or report.get("any_saturated")
            )
            log10_raw = total.get("log10_value_raw")
            snippet["log10_value_raw"] = (
                float(log10_raw) if isinstance(log10_raw, (int, float)) else None
            )
            if total.get("ceiling") is not None:
                snippet["ceiling"] = float(total.get("ceiling"))
            return snippet
        if report.get("any_saturated") is not None:
            snippet["is_saturated"] = bool(report.get("any_saturated"))
            log10_raw = report.get("log10_value_raw")
            snippet["log10_value_raw"] = (
                float(log10_raw) if isinstance(log10_raw, (int, float)) else None
            )
            return snippet

    if enhancement_factor is None:
        return snippet
    try:
        raw = float(enhancement_factor)
    except (TypeError, ValueError):
        return snippet
    snippet["is_saturated"] = enhancement_is_saturated(raw, ceiling)
    snippet["log10_value_raw"] = _safe_log10(raw)
    return snippet


def pipeline_total_watts(pipeline_result: Any) -> Optional[float]:
    if pipeline_result is None:
        return None
    if hasattr(pipeline_result, "total_energy_watts"):
        value = getattr(pipeline_result, "total_energy_watts")
    elif isinstance(pipeline_result, dict):
        value = pipeline_result.get("total_energy_watts")
    else:
        return None
    try:
        watts = float(value)
    except (TypeError, ValueError):
        return None
    if not math.isfinite(watts) or watts <= 0.0:
        return None
    return watts


def prefer_heat_watts(observables_heat: Any, pipeline_result: Any) -> Optional[float]:
    """Use observables heat when positive; else copy pipeline watts."""
    try:
        heat = float(observables_heat) if observables_heat is not None else 0.0
    except (TypeError, ValueError):
        heat = 0.0
    if math.isfinite(heat) and heat > 0.0:
        return heat
    return pipeline_total_watts(pipeline_result)


def wrap_attached_pipeline(theory_result: Any, pipeline_scores: Any) -> Any:
    """Return a pipeline-shaped object for persist without changing bubble peak.

    ``combined_enhancement`` is stamped 1.0 so TheoryRun cannot look like the
    bubble peak was multiplied by the testbed product.
    """
    if isinstance(theory_result, dict) and theory_result:
        wrapped = dict(theory_result)
        wrapped["combined_enhancement"] = 1.0
        return wrapped
    if theory_result:
        return theory_result
    if not isinstance(pipeline_scores, dict) or not pipeline_scores:
        return None
    per_theory = []
    for theory_id, record in pipeline_scores.items():
        if not theory_id or not isinstance(record, dict):
            continue
        row = dict(record)
        row.setdefault("theory_id", theory_id)
        row.setdefault("enhancement_factor", record.get("enhancement", 1.0))
        per_theory.append(row)
    if not per_theory:
        return None
    return {
        "per_theory": per_theory,
        "contributions": per_theory,
        "combined_enhancement": 1.0,
        "total_energy_watts": 0.0,
        "enabled_theories": [row["theory_id"] for row in per_theory],
    }
