"""
Non-saturating success-odds margin features (HIP-04 / ENG-HS-05).

Association-screen high-L Pd–D cells often sit at the ``MAX_ENHANCEMENT_FACTOR``
(1e5) display ceiling, so capped enhancement / confidence stop discriminating
Miles vs McKubre vs ARPA-E. This module exposes **uncapped** discrimination
features for Analytics success-odds ranking:

* rate-space — ``log10`` reaction / He rates (never clamped to 1e5)
* oracle separation — Miles-band vs null log10 hypothesis separation
* loading sensitivity — distance above the EMP loading threshold
* enhancement residual — ``log10_raw − log10(ceiling)`` when saturated

Honesty: model_output / analytics aid only. Never discovery claim, never
fabricated σ_Q, never EQ-OPEN close, never ``lenr_proved``.
"""

from __future__ import annotations

import math
from typing import Any, Dict, Mapping, Optional

from scipy import constants as const

from app.physics_engine.constants import MAX_ENHANCEMENT_FACTOR
from app.physics_engine.decision_oracle import (
    MILES_MEV_MAX,
    MILES_MEV_MIN,
    evaluate_determination,
    miles_q_mev,
)

# EMP / association-screen loading gate (Miles / McKubre class).
LOADING_EMP_THRESHOLD = 0.85
LOADING_EMP_SPAN = 0.10  # 0.85 → 0.95

HONESTY_NOTE = (
    "Non-saturating margin features for success-odds discrimination when "
    "enhancement hits the 1e5 claim-tier ceiling. Model_output analytics "
    "only — not P(LENR), not discovery MoE, not EQ-OPEN discharge, not "
    "lenr_proved."
)


def _safe_log10(value: Optional[float]) -> Optional[float]:
    if value is None:
        return None
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    if not math.isfinite(number) or number <= 0.0:
        return None
    return math.log10(number)


def _safe_float(value: Any) -> Optional[float]:
    if value is None:
        return None
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    if not math.isfinite(number):
        return None
    return number


def rate_space_margins(
    *,
    reaction_rate: Optional[float] = None,
    helium4_rate: Optional[float] = None,
    excess_heat_watts: Optional[float] = None,
) -> Dict[str, Any]:
    """Uncapped log10 rate-space features (never clamped to 1e5)."""
    log_rate = _safe_log10(reaction_rate)
    log_he4 = _safe_log10(helium4_rate)
    log_heat = _safe_log10(excess_heat_watts)
    return {
        "log10_reaction_rate": log_rate,
        "log10_helium4_rate": log_he4,
        "log10_excess_heat_watts": log_heat,
        "reaction_rate": _safe_float(reaction_rate),
        "helium4_rate": _safe_float(helium4_rate),
        "excess_heat_watts": _safe_float(excess_heat_watts),
        "units": {
            "reaction_rate": "events/s/m^3_or_model",
            "helium4_rate": "atoms/s",
            "excess_heat_watts": "W",
        },
    }


def loading_sensitivity_margins(
    *,
    loading_ratio: Optional[float],
    threshold: float = LOADING_EMP_THRESHOLD,
    span: float = LOADING_EMP_SPAN,
) -> Dict[str, Any]:
    """Loading-margin features that stay informative at saturated enhancement."""
    loading = _safe_float(loading_ratio)
    if loading is None:
        return {
            "loading_ratio": None,
            "loading_above_threshold": None,
            "loading_sensitivity_01": None,
            "loading_emp_gate_met": False,
            "threshold": float(threshold),
            "span": float(span),
        }
    above = loading - float(threshold)
    sensitivity = min(max(above / float(span), 0.0), 1.0) if span > 0 else 0.0
    return {
        "loading_ratio": loading,
        "loading_above_threshold": above,
        "loading_sensitivity_01": sensitivity,
        "loading_emp_gate_met": loading >= float(threshold),
        "threshold": float(threshold),
        "span": float(span),
    }


def enhancement_residual_margins(
    *,
    enhancement_factor: Optional[float] = None,
    log10_enhancement_raw: Optional[float] = None,
    is_saturated: Optional[bool] = None,
    ceiling: float = MAX_ENHANCEMENT_FACTOR,
) -> Dict[str, Any]:
    """Residual above the display ceiling for saturated cells."""
    capped = _safe_float(enhancement_factor)
    log10_raw = _safe_float(log10_enhancement_raw)
    if log10_raw is None and capped is not None and capped > 0:
        log10_raw = math.log10(capped)
    log10_ceiling = math.log10(float(ceiling)) if ceiling > 0 else None
    residual = None
    if log10_raw is not None and log10_ceiling is not None:
        residual = log10_raw - log10_ceiling
    saturated = bool(is_saturated)
    if is_saturated is None and capped is not None:
        saturated = capped >= float(ceiling) * (1.0 - 1e-9)
    return {
        "enhancement_factor_display": capped,
        "log10_enhancement_raw": log10_raw,
        "log10_ceiling": log10_ceiling,
        "log10_residual_above_ceiling": residual,
        "is_saturated": saturated,
        "ceiling": float(ceiling),
        "discriminates_when_saturated": bool(
            saturated and residual is not None and abs(residual) > 1e-9
        ),
    }


def oracle_separation_margins(
    *,
    excess_power_w: Optional[float] = None,
    helium4_rate: Optional[float] = None,
    sigma_q_w: float = 0.1,
) -> Dict[str, Any]:
    """Miles-band vs null oracle separation in log10 Bayes-factor space.

    Uses model-output ``sigma_Q_W`` (default 0.1 W) — **not** literature MoE
    and never a fabricated discovery σ.
    """
    power = _safe_float(excess_power_w)
    he4 = _safe_float(helium4_rate)
    null = evaluate_determination(rate_mode="two_body", observations={})
    observations: Dict[str, Any] = {}
    if power is not None and power > 0:
        observations["excess_power_W"] = power
        observations["sigma_Q_W"] = float(sigma_q_w)
        if he4 is not None and he4 > 0:
            observations["he4_atoms_per_s"] = he4
        else:
            # Ideal Miles-band He rate for the supplied heat (correlation check).
            q_target = 0.5 * (MILES_MEV_MIN + MILES_MEV_MAX)
            observations["he4_atoms_per_s"] = 1.0 / (q_target * const.e * 1e6) * power
        observations["gamma_cps_ul"] = 1e-3

    miles = evaluate_determination(
        rate_mode="trapped_state",
        observations=observations,
    )
    oracle_b = miles.get("oracle_b") or {}
    bf_trap = float(oracle_b.get("bayes_factor_trapped_vs_two_body") or 1.0)
    bf_null = float(oracle_b.get("bayes_factor_two_body_vs_null") or 1.0)
    separation = abs(math.log10(max(bf_trap, 1e-300))) + abs(
        math.log10(max(bf_null, 1e-300))
    )
    q_check = None
    if "excess_power_W" in observations and "he4_atoms_per_s" in observations:
        q_check = miles_q_mev(
            float(observations["excess_power_W"]),
            float(observations["he4_atoms_per_s"]),
        )
    return {
        "null_status": null.get("status"),
        "miles_status": miles.get("status"),
        "log10_hypothesis_separation": separation,
        "bayes_factor_trapped_vs_two_body": bf_trap,
        "bayes_factor_two_body_vs_null": bf_null,
        "q_mev_check": q_check,
        "miles_band_mev": [MILES_MEV_MIN, MILES_MEV_MAX],
        "sigma_q_w_model_output": float(sigma_q_w),
        "sigma_q_is_literature_moe": False,
        "occurrence_anchored": bool(oracle_b.get("occurrence_anchored")),
        "claim_tier": "model_output_hypothetical",
    }


def _discrimination_score(
    *,
    rate_space: Mapping[str, Any],
    loading: Mapping[str, Any],
    enhancement: Mapping[str, Any],
    oracle: Mapping[str, Any],
) -> float:
    """Blend uncapped features into one ranking aid (not a probability)."""
    parts = []
    log_he4 = rate_space.get("log10_helium4_rate")
    if isinstance(log_he4, (int, float)):
        # Map typical Miles ~11.4 log10(atoms/s) into ~[0,1] soft band.
        parts.append(min(max((float(log_he4) - 8.0) / 6.0, 0.0), 1.0))
    sens = loading.get("loading_sensitivity_01")
    if isinstance(sens, (int, float)):
        parts.append(float(sens))
    residual = enhancement.get("log10_residual_above_ceiling")
    if isinstance(residual, (int, float)) and enhancement.get("is_saturated"):
        parts.append(min(max(float(residual) / 10.0, 0.0), 1.0))
    elif not enhancement.get("is_saturated"):
        log_raw = enhancement.get("log10_enhancement_raw")
        if isinstance(log_raw, (int, float)):
            parts.append(min(max(float(log_raw) / 5.0, 0.0), 1.0))
    sep = oracle.get("log10_hypothesis_separation")
    if isinstance(sep, (int, float)):
        parts.append(min(max(float(sep) / 6.0, 0.0), 1.0))
    if not parts:
        return 0.0
    return sum(parts) / len(parts)


def build_success_odds_margins(
    *,
    reaction_rate: Optional[float] = None,
    helium4_rate: Optional[float] = None,
    excess_heat_watts: Optional[float] = None,
    loading_ratio: Optional[float] = None,
    enhancement_factor: Optional[float] = None,
    log10_enhancement_raw: Optional[float] = None,
    enhancement_is_saturated: Optional[bool] = None,
    literature_id: Optional[str] = None,
    confidence: Optional[float] = None,
    ceiling: float = MAX_ENHANCEMENT_FACTOR,
) -> Dict[str, Any]:
    """Build the additive success-odds margins block (RORO)."""
    rate_space = rate_space_margins(
        reaction_rate=reaction_rate,
        helium4_rate=helium4_rate,
        excess_heat_watts=excess_heat_watts,
    )
    loading = loading_sensitivity_margins(loading_ratio=loading_ratio)
    enhancement = enhancement_residual_margins(
        enhancement_factor=enhancement_factor,
        log10_enhancement_raw=log10_enhancement_raw,
        is_saturated=enhancement_is_saturated,
        ceiling=ceiling,
    )
    oracle = oracle_separation_margins(
        excess_power_w=excess_heat_watts,
        helium4_rate=helium4_rate,
    )
    score = _discrimination_score(
        rate_space=rate_space,
        loading=loading,
        enhancement=enhancement,
        oracle=oracle,
    )
    return {
        "schema": "lenr-success-odds-margins-v1",
        "rate_space": rate_space,
        "loading_sensitivity": loading,
        "enhancement_residual": enhancement,
        "oracle_separation": oracle,
        "discrimination_score": score,
        "literature_id": literature_id,
        "confidence_display": _safe_float(confidence),
        "enhancement_ceiling": float(ceiling),
        "is_model_output": True,
        "not_discovery_claim": True,
        "lenr_proved": False,
        "note": HONESTY_NOTE,
    }


def margins_discriminate(
    left: Mapping[str, Any],
    right: Mapping[str, Any],
    *,
    rtol: float = 1e-9,
) -> bool:
    """True when two margin blocks differ on at least one uncapped feature."""
    keys = (
        ("rate_space", "log10_helium4_rate"),
        ("rate_space", "log10_reaction_rate"),
        ("loading_sensitivity", "loading_sensitivity_01"),
        ("enhancement_residual", "log10_residual_above_ceiling"),
        ("enhancement_residual", "log10_enhancement_raw"),
        ("oracle_separation", "log10_hypothesis_separation"),
    )
    for section, field in keys:
        a = (left.get(section) or {}).get(field)
        b = (right.get(section) or {}).get(field)
        if a is None and b is None:
            continue
        if a is None or b is None:
            return True
        if abs(float(a) - float(b)) > rtol * max(1.0, abs(float(a)), abs(float(b))):
            return True
    left_score = left.get("discrimination_score")
    right_score = right.get("discrimination_score")
    if left_score is None or right_score is None:
        return left_score != right_score
    return abs(float(left_score) - float(right_score)) > rtol
