"""Quantitative distance-to-≥5σ bookkeeping (BDS-302 / BDS-330).

Surfaces how far a calorimetry MoE row sits from the discovery-grade bar
without ever claiming discovery, flipping ``lenr_proved``, or closing
``EQ-OPEN-*``. Arithmetic S_heat ≥ 5 alone is not discharge.
"""

from __future__ import annotations

import math
from typing import Any, Dict, List, Mapping, Optional, Sequence

from app.campaign.avenue_catalog import OPEN_IDS
from app.physics_engine.calorimetry_significance import (
    DISCOVERY_GRADE_SIGMA,
    combine_sigma_q_w,
    discovery_grade_analytics,
    s_heat,
)


def quantitative_distance_to_discovery(
    report: Optional[Mapping[str, Any]] = None,
) -> Dict[str, Any]:
    """Return signed distance of S_heat to the ≥5σ analytics bar (RORO).

    When ``report`` is None, returns the corpus default: S_heat undefined,
    distance undefined, overall gates unmet.
    """
    if report is None:
        summary = discovery_grade_analytics(
            excess_power_w=None,
            sigma_q_w=None,
            moe_provenance=None,
            moe_citation_keys=[],
            moe_sigma_q_pairing_verified=False,
        )
    else:
        summary = dict(report)

    q_w = summary.get("excess_power_w")
    sigma = summary.get("sigma_q_w")
    if sigma is None:
        sigma = combine_sigma_q_w(
            sigma_q_w=summary.get("sigma_q_w"),
            sigma_q_statistical_w=summary.get("sigma_q_statistical_w"),
            sigma_q_systematic_w=summary.get("sigma_q_systematic_w"),
        )
    significance = summary.get("s_heat")
    if significance is None:
        significance = s_heat(excess_power_w=q_w, sigma_q_w=sigma)

    threshold = float(DISCOVERY_GRADE_SIGMA)
    eligible = bool(summary.get("discovery_grade_eligible"))

    arithmetic_shortfall: Optional[float] = None
    required_sigma: Optional[float] = None
    tightening: Optional[float] = None
    distance_status = "undefined"

    if significance is not None and math.isfinite(float(significance)):
        s_val = float(significance)
        arithmetic_shortfall = max(0.0, threshold - s_val)
        if s_val >= threshold:
            distance_status = (
                "at_or_above_bar_gates_clear"
                if eligible
                else "at_or_above_bar_gates_blocked"
            )
        else:
            distance_status = "below_bar"

    if (
        q_w is not None
        and float(q_w) > 0.0
        and math.isfinite(float(q_w))
    ):
        required_sigma = float(q_w) / threshold
        if sigma is not None and float(sigma) > 0.0 and required_sigma > 0.0:
            tightening = float(sigma) / required_sigma

    stat = summary.get("sigma_q_statistical_w")
    syst = summary.get("sigma_q_systematic_w")
    rss = combine_sigma_q_w(
        sigma_q_statistical_w=stat,
        sigma_q_systematic_w=syst,
    )
    # Prefer RSS labeling when both components are present and the total matches
    # (discovery_grade_analytics writes the combined value into sigma_q_w).
    if rss is not None and stat is not None and syst is not None:
        if sigma is None or abs(float(sigma) - float(rss)) <= 1e-12:
            composition_mode = "rss_stat_sys"
        else:
            composition_mode = "explicit_total_with_components"
    elif sigma is not None:
        composition_mode = "explicit_total"
    else:
        composition_mode = "missing"

    composition = {
        "sigma_q_statistical_w": float(stat) if stat is not None else None,
        "sigma_q_systematic_w": float(syst) if syst is not None else None,
        "sigma_q_rss_w": rss,
        "sigma_q_total_w": float(sigma) if sigma is not None else None,
        "composition_mode": composition_mode,
    }

    return {
        "schema": "lenr-sigma-distance-v1",
        "discovery_grade_threshold_sigma": threshold,
        "s_heat": float(significance) if significance is not None else None,
        "excess_power_w": float(q_w) if q_w is not None else None,
        "sigma_q_w": float(sigma) if sigma is not None else None,
        "arithmetic_sigma_shortfall": arithmetic_shortfall,
        "required_sigma_q_w_for_5": required_sigma,
        "sigma_tightening_factor_vs_5": tightening,
        "distance_status": distance_status,
        "discovery_grade_eligible": eligible,
        "stat_sys_composition": composition,
        "lenr_proved": False,
        "eq_open_status": {oid: "OPEN" for oid in OPEN_IDS},
        "honesty": (
            "Quantitative distance to the BDS-302 ≥5σ analytics bar only. "
            "Arithmetic S_heat ≥ 5 with blocked gates (instrument_precision, "
            "unverified pairing, seed-scale Q) is not discovery and never sets "
            "lenr_proved or closes EQ-OPEN-*. Clearing analytics gates still "
            "requires EQ-OPEN discharge + governance for honest closure."
        ),
    }


def corpus_moe_coverage(
    reports: Sequence[Mapping[str, Any]],
    *,
    literature_ids: Optional[Sequence[Optional[str]]] = None,
) -> Dict[str, Any]:
    """Summarize cite-gated MoE / pairing coverage over analytics reports.

    Counts only — never promotes claim tiers or flips honesty locks.
    """
    n = len(reports)
    with_sigma = 0
    with_cite_gated = 0
    with_pairing = 0
    with_discovery = 0
    with_exploratory = 0
    with_s_heat = 0
    below_bar = 0
    above_bar_blocked = 0
    above_bar_clear = 0
    ids_discovery: List[str] = []
    ids_pairing: List[str] = []

    for idx, report in enumerate(reports):
        lit_id = None
        if literature_ids is not None and idx < len(literature_ids):
            lit_id = literature_ids[idx]
        lit_id = lit_id or report.get("literature_id")
        distance = quantitative_distance_to_discovery(report)
        if report.get("sigma_q_w") is not None or distance.get("sigma_q_w") is not None:
            with_sigma += 1
        provenance = report.get("moe_provenance")
        citations = list(report.get("moe_citation_keys") or [])
        if provenance == "literature_reported" and citations:
            with_cite_gated += 1
        if report.get("moe_sigma_q_pairing_verified"):
            with_pairing += 1
            if lit_id:
                ids_pairing.append(str(lit_id))
        if report.get("discovery_grade_eligible"):
            with_discovery += 1
            if lit_id:
                ids_discovery.append(str(lit_id))
        if report.get("exploratory_snr_eligible"):
            with_exploratory += 1
        if distance.get("s_heat") is not None:
            with_s_heat += 1
        status = distance.get("distance_status")
        if status == "below_bar":
            below_bar += 1
        elif status == "at_or_above_bar_gates_blocked":
            above_bar_blocked += 1
        elif status == "at_or_above_bar_gates_clear":
            above_bar_clear += 1

    return {
        "schema": "lenr-moe-coverage-v1",
        "n_records": n,
        "with_sigma_q": with_sigma,
        "with_literature_reported_cite_gated": with_cite_gated,
        "with_moe_pairing_verified": with_pairing,
        "with_s_heat": with_s_heat,
        "with_exploratory_snr": with_exploratory,
        "discovery_grade_eligible_count": with_discovery,
        "arithmetic_below_5sigma_count": below_bar,
        "arithmetic_ge_5sigma_gates_blocked_count": above_bar_blocked,
        "arithmetic_ge_5sigma_gates_clear_count": above_bar_clear,
        "discovery_grade_eligible_ids": ids_discovery,
        "pairing_verified_ids": ids_pairing,
        "discovery_grade_threshold_sigma": DISCOVERY_GRADE_SIGMA,
        "closes_eq_open": False,
        "lenr_proved": False,
        "eq_open_status": {oid: "OPEN" for oid in OPEN_IDS},
        "honesty": (
            "Corpus MoE / Q↔σ_Q pairing coverage bookkeeping only. "
            "discovery_grade_eligible rows remain analytics flags — they do not "
            "set lenr_proved or close EQ-OPEN-*. Campaign packs are excluded "
            "from discovery coverage by design."
        ),
    }


def literature_corpus_moe_coverage() -> Dict[str, Any]:
    """Scan curated literature + ICCF27 rows for MoE coverage (read-only)."""
    from app.data.dataset_io import iccf27_literature_records, literature_records
    from app.physics_engine.calorimetry_significance import (
        discovery_grade_from_literature_record,
    )

    rows = list(literature_records()) + list(iccf27_literature_records())
    reports = [discovery_grade_from_literature_record(row) for row in rows]
    lit_ids = [row.get("literature_id") for row in rows]
    coverage = corpus_moe_coverage(reports, literature_ids=lit_ids)
    coverage["source"] = "literature_records+iccf27_literature_records"
    return coverage
