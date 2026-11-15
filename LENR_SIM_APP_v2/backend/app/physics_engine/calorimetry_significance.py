"""Calorimetry significance helpers: S_heat = Q / σ_Q and ≥5σ analytics flag.

Paper criterion (Unified Framework § statistical significance):

    S_heat = Q_excess / σ_Q

with σ_Q including statistical and systematic contributions when both are
known. Discovery-grade language in this module is an **analytics flag only**.

Hard honesty:
- ``discovery_grade_eligible`` never sets ``lenr_proved``
- never closes any ``EQ-OPEN-*``
- refuse fabricated ``literature_reported`` σ_Q (citation required)
- Oracle B null-falsify SNR≥3 remains **exploratory**, distinct from ≥5σ
"""

from __future__ import annotations

import math
from typing import Any, Dict, Mapping, Optional, Sequence

from app.campaign.avenue_catalog import OPEN_IDS

#: Paper / discovery bar for calorimetry excess heat (σ-equivalent).
DISCOVERY_GRADE_SIGMA = 5.0

#: Oracle B ``null_excess_falsified`` uses SNR≥3 — exploratory, not discovery-grade.
EXPLORATORY_NULL_FALSIFY_SNR = 3.0

ALLOWED_MOE_PROVENANCE = frozenset({"literature_reported", "model_assumption"})


def combine_sigma_q_w(
    *,
    sigma_q_w: Optional[float] = None,
    sigma_q_statistical_w: Optional[float] = None,
    sigma_q_systematic_w: Optional[float] = None,
) -> Optional[float]:
    """Return total σ_Q (W). Prefer explicit total; else RSS of stat+syst."""
    if sigma_q_w is not None:
        value = float(sigma_q_w)
        if value <= 0.0 or not math.isfinite(value):
            return None
        return value
    parts = []
    if sigma_q_statistical_w is not None:
        parts.append(float(sigma_q_statistical_w))
    if sigma_q_systematic_w is not None:
        parts.append(float(sigma_q_systematic_w))
    if not parts:
        return None
    if any(p < 0.0 or not math.isfinite(p) for p in parts):
        return None
    combined = math.sqrt(sum(p * p for p in parts))
    if combined <= 0.0:
        return None
    return float(combined)


def s_heat(
    *,
    excess_power_w: Optional[float],
    sigma_q_w: Optional[float],
) -> Optional[float]:
    """S_heat = Q_excess / σ_Q. None when undefined or non-finite."""
    if excess_power_w is None or sigma_q_w is None:
        return None
    q = float(excess_power_w)
    sigma = float(sigma_q_w)
    if sigma <= 0.0 or not math.isfinite(sigma) or not math.isfinite(q):
        return None
    return abs(q) / sigma


def _eq_open_status_open() -> Dict[str, str]:
    return {oid: "OPEN" for oid in OPEN_IDS}


def validate_moe_provenance(
    *,
    sigma_q_w: Optional[float],
    moe_provenance: Optional[str],
    moe_citation_keys: Optional[Sequence[str]] = None,
) -> Dict[str, Any]:
    """Gate fabricated literature_reported MoE.

    Returns ``{"ok": bool, "reason": str|None}``.
    A numeric σ_Q with ``literature_reported`` and empty citations is refused.
    """
    if sigma_q_w is None:
        return {"ok": True, "reason": None}
    if moe_provenance is None:
        return {
            "ok": False,
            "reason": "sigma_Q_W present without moe_provenance "
            "(label literature_reported or model_assumption)",
        }
    if moe_provenance not in ALLOWED_MOE_PROVENANCE:
        return {
            "ok": False,
            "reason": f"unknown moe_provenance={moe_provenance!r}",
        }
    if moe_provenance == "literature_reported":
        keys = [str(k) for k in (moe_citation_keys or []) if k]
        if not keys:
            return {
                "ok": False,
                "reason": "literature_reported sigma_Q_W requires moe_citation_keys "
                "(refuse fabricated lab uncertainty)",
            }
    return {"ok": True, "reason": None}


def discovery_grade_analytics(
    *,
    excess_power_w: Optional[float],
    sigma_q_w: Optional[float] = None,
    sigma_q_statistical_w: Optional[float] = None,
    sigma_q_systematic_w: Optional[float] = None,
    moe_provenance: Optional[str] = None,
    moe_citation_keys: Optional[Sequence[str]] = None,
    moe_notes: Optional[str] = None,
    literature_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Compute S_heat and discovery_grade_eligible analytics flag (RORO).

    ``discovery_grade_eligible`` is True only when S_heat ≥ 5 and MoE
    provenance validates. It does **not** prove LENR or close EQ-OPEN-*.
    """
    sigma = combine_sigma_q_w(
        sigma_q_w=sigma_q_w,
        sigma_q_statistical_w=sigma_q_statistical_w,
        sigma_q_systematic_w=sigma_q_systematic_w,
    )
    provenance_gate = validate_moe_provenance(
        sigma_q_w=sigma,
        moe_provenance=moe_provenance,
        moe_citation_keys=moe_citation_keys,
    )
    significance = s_heat(excess_power_w=excess_power_w, sigma_q_w=sigma)
    exploratory = (
        significance is not None and significance >= EXPLORATORY_NULL_FALSIFY_SNR
    )
    discovery = (
        provenance_gate["ok"]
        and significance is not None
        and significance >= DISCOVERY_GRADE_SIGMA
    )
    return {
        "literature_id": literature_id,
        "excess_power_w": (
            float(excess_power_w) if excess_power_w is not None else None
        ),
        "sigma_q_w": sigma,
        "sigma_q_statistical_w": (
            float(sigma_q_statistical_w)
            if sigma_q_statistical_w is not None
            else None
        ),
        "sigma_q_systematic_w": (
            float(sigma_q_systematic_w)
            if sigma_q_systematic_w is not None
            else None
        ),
        "s_heat": significance,
        "exploratory_snr_eligible": bool(exploratory),
        "discovery_grade_eligible": bool(discovery),
        "discovery_grade_threshold_sigma": DISCOVERY_GRADE_SIGMA,
        "exploratory_null_falsify_snr": EXPLORATORY_NULL_FALSIFY_SNR,
        "moe_provenance": moe_provenance,
        "moe_citation_keys": list(moe_citation_keys or []),
        "moe_notes": moe_notes,
        "moe_provenance_ok": bool(provenance_gate["ok"]),
        "moe_provenance_reason": provenance_gate["reason"],
        # Hard honesty locks — analytics flag must never flip these:
        "lenr_proved": False,
        "eq_open_status": _eq_open_status_open(),
        "honesty": (
            "discovery_grade_eligible is an analytics flag only "
            "(S_heat≥5 with labelled MoE). It does not set lenr_proved, "
            "does not close EQ-OPEN-*, and does not raise claim_tier. "
            "Oracle B null_excess_falsified uses exploratory SNR≥3, "
            "distinct from this discovery-grade bar."
        ),
    }


def moe_fields_from_record(record: Mapping[str, Any]) -> Dict[str, Any]:
    """Extract optional MoE fields from a literature JSON / baseline row."""
    keys = record.get("moe_citation_keys")
    if keys is None and record.get("citation_key"):
        # Do not auto-promote citation_key into literature_reported evidence;
        # only surface it when moe_citation_keys is absent for display helpers.
        keys = []
    return {
        "excess_power_w": record.get("excess_heat_watts"),
        "sigma_q_w": record.get("sigma_Q_W"),
        "sigma_q_statistical_w": record.get("sigma_Q_statistical_W"),
        "sigma_q_systematic_w": record.get("sigma_Q_systematic_W"),
        "moe_provenance": record.get("moe_provenance"),
        "moe_citation_keys": list(keys or []),
        "moe_notes": record.get("moe_notes"),
        "literature_id": record.get("literature_id"),
    }


def discovery_grade_from_literature_record(
    record: Mapping[str, Any],
) -> Dict[str, Any]:
    """Build discovery-grade analytics from one literature / baseline record."""
    fields = moe_fields_from_record(record)
    return discovery_grade_analytics(**fields)
