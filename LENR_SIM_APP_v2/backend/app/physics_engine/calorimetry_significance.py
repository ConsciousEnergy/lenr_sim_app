"""Calorimetry significance helpers: S_heat = Q / σ_Q and ≥5σ analytics flag.

Paper criterion (Unified Framework § statistical significance):

    S_heat = Q_excess / σ_Q

with σ_Q including statistical and systematic contributions when both are
known. Discovery-grade language in this module is an **analytics flag only**.

Hard honesty:
- ``discovery_grade_eligible`` never sets ``lenr_proved``
- never closes any ``EQ-OPEN-*``
- refuse fabricated ``literature_reported`` σ_Q (citation required)
- S_heat preserves sign (heat deficit cannot pass discovery)
- instrument precision / floor MoE is exploratory only (not discovery)
- literature adapter prefers measured Q (e.g. ``literature_peak_excess_power_W``);
  seed-scale ``excess_heat_watts`` alone does not grant discovery
- discovery requires verified Q↔σ_Q pairing (``moe_sigma_q_pairing_verified``
  or same-results envelope); Miles peak + follow-on ±0.02 stays exploratory
- Oracle B null-falsify SNR≥3 remains **exploratory**, distinct from ≥5σ
"""

from __future__ import annotations

import math
from typing import Any, Dict, Mapping, Optional, Sequence, Tuple

from app.campaign.avenue_catalog import OPEN_IDS

#: Paper / discovery bar for calorimetry excess heat (σ-equivalent).
DISCOVERY_GRADE_SIGMA = 5.0

#: Oracle B ``null_excess_falsified`` uses SNR≥3 — exploratory, not discovery-grade.
EXPLORATORY_NULL_FALSIFY_SNR = 3.0

ALLOWED_MOE_PROVENANCE = frozenset(
    {
        "literature_reported",
        "literature_reported_instrument_precision",
        "literature_reported_instrument_floor",
        "model_assumption",
    }
)

#: Provenance labels that require citation keys (refuse fabricated lab MoE).
CITED_MOE_PROVENANCE = frozenset(
    {
        "literature_reported",
        "literature_reported_instrument_precision",
        "literature_reported_instrument_floor",
    }
)

#: Only measurement-specific total σ_Q may set discovery_grade_eligible.
#: Instrument precision / floor stay exploratory.
DISCOVERY_ELIGIBLE_PROVENANCE = frozenset({"literature_reported"})


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
    """S_heat = Q_excess / σ_Q (signed). None when undefined or non-finite."""
    if excess_power_w is None or sigma_q_w is None:
        return None
    q = float(excess_power_w)
    sigma = float(sigma_q_w)
    if sigma <= 0.0 or not math.isfinite(sigma) or not math.isfinite(q):
        return None
    return q / sigma


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
    A numeric σ_Q with cited provenance and empty citations is refused.
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
    if moe_provenance in CITED_MOE_PROVENANCE:
        keys = [str(k) for k in (moe_citation_keys or []) if k]
        if not keys:
            return {
                "ok": False,
                "reason": (
                    f"{moe_provenance} sigma_Q_W requires moe_citation_keys "
                    "(refuse fabricated lab uncertainty)"
                ),
            }
    return {"ok": True, "reason": None}


def resolve_measured_excess_power_w(
    record: Mapping[str, Any],
) -> Tuple[Optional[float], Optional[str], bool]:
    """Resolve Q for significance from a literature / baseline row.

    Prefers explicitly measured fields over seed-scale ``excess_heat_watts``.

    Returns ``(q_w, source_label, is_seed_scale)``.
    """
    params = record.get("parameters") or {}
    results = record.get("results") or {}
    bags: Tuple[Mapping[str, Any], ...] = (record, params, results)
    for key in ("literature_peak_excess_power_W", "measured_excess_power_W"):
        for bag in bags:
            value = bag.get(key)
            if value is not None:
                return float(value), key, False
    # Prefer results.q_ex_w before parameters.*_reported so same-envelope σ pairs.
    if results.get("q_ex_w") is not None:
        return float(results["q_ex_w"]), "results.q_ex_w", False
    for bag in bags:
        value = bag.get("excess_heat_watts_reported")
        if value is not None:
            return float(value), "excess_heat_watts_reported", False
    seed = record.get("excess_heat_watts")
    if seed is not None:
        return float(seed), "excess_heat_watts", True
    return None, None, False


def is_sigma_q_pairing_verified(
    record: Mapping[str, Any],
    *,
    q_source: Optional[str] = None,
) -> bool:
    """True only when Q and σ_Q are an explicitly verified measurement pair.

    Explicit ``moe_sigma_q_pairing_verified`` wins. Otherwise, same-results
    envelope with both ``q_ex_w`` and ``sigma_Q_W`` counts as verified.
    Miles peak + follow-on ±0.02 without the flag stays unverified.
    """
    bags: Tuple[Mapping[str, Any], ...] = (
        record,
        record.get("parameters") or {},
        record.get("results") or {},
    )
    for bag in bags:
        if "moe_sigma_q_pairing_verified" in bag:
            return bool(bag["moe_sigma_q_pairing_verified"])
    results = record.get("results") or {}
    if q_source == "results.q_ex_w" and results.get("sigma_Q_W") is not None:
        return True
    return False


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
    q_source: Optional[str] = None,
    q_is_seed_scale: bool = False,
    moe_sigma_q_pairing_verified: bool = False,
) -> Dict[str, Any]:
    """Compute S_heat and discovery_grade_eligible analytics flag (RORO).

    ``discovery_grade_eligible`` is True only when:
    - S_heat ≥ 5 (signed; deficits fail)
    - MoE provenance is ``literature_reported`` (measurement-specific total σ_Q)
    - Q is not a simulation seed-scale anchor
    - Q↔σ_Q pairing is verified
    - provenance citation gate passes

    It does **not** prove LENR or close EQ-OPEN-*.
    Instrument precision / floor and unverified pairings may still yield
    exploratory S_heat.
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
    discovery_provenance_ok = moe_provenance in DISCOVERY_ELIGIBLE_PROVENANCE
    pairing_ok = bool(moe_sigma_q_pairing_verified)
    discovery = (
        provenance_gate["ok"]
        and discovery_provenance_ok
        and pairing_ok
        and not q_is_seed_scale
        and significance is not None
        and significance >= DISCOVERY_GRADE_SIGMA
    )
    return {
        "literature_id": literature_id,
        "excess_power_w": (
            float(excess_power_w) if excess_power_w is not None else None
        ),
        "q_source": q_source,
        "q_is_seed_scale": bool(q_is_seed_scale),
        "moe_sigma_q_pairing_verified": pairing_ok,
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
        "discovery_provenance_ok": bool(discovery_provenance_ok),
        # Hard honesty locks — analytics flag must never flip these:
        "lenr_proved": False,
        "eq_open_status": _eq_open_status_open(),
        "honesty": (
            "discovery_grade_eligible is an analytics flag only "
            "(signed S_heat≥5 with literature_reported measurement-specific "
            "σ_Q, verified Q↔σ pairing, and non-seed Q). Instrument "
            "precision/floor, unverified pairings, and seed-scale Q stay "
            "exploratory. It does not set lenr_proved, does not close "
            "EQ-OPEN-*, and does not raise claim_tier. Oracle B "
            "null_excess_falsified uses exploratory SNR≥3, distinct from "
            "this discovery-grade bar."
        ),
    }


def moe_fields_from_record(record: Mapping[str, Any]) -> Dict[str, Any]:
    """Extract MoE + measured-Q fields from a literature JSON / baseline row."""
    keys = record.get("moe_citation_keys")
    if keys is None and record.get("citation_key"):
        keys = []
    q_w, q_source, is_seed = resolve_measured_excess_power_w(record)
    pairing = is_sigma_q_pairing_verified(record, q_source=q_source)
    return {
        "excess_power_w": q_w,
        "q_source": q_source,
        "q_is_seed_scale": is_seed,
        "moe_sigma_q_pairing_verified": pairing,
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
