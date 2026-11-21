"""ENG-HS-08 ranked-regime hygiene + HIP-02 S_heat / σ ladder payload.

High-success ranking must **not** sort raw arithmetic S_heat alone.
Seed-scale Q ÷ instrument_precision (e.g. De Ninno S=250) and
non-``literature_reported`` MoE rows are demoted out of the high-success
list so consumers cannot outrank cite-gated Kasagi by raw-S lies.

Honesty locks (absolute):
- never invent σ_Q
- never set ``lenr_proved``
- never close any ``EQ-OPEN-*``
- never raise claim tiers beyond optics chips on existing provenance
"""

from __future__ import annotations

import math
from typing import Any, Dict, List, Mapping, Optional, Sequence

from app.campaign.avenue_catalog import OPEN_IDS
from app.physics_engine.calorimetry_significance import (
    DISCOVERY_ELIGIBLE_PROVENANCE,
    DISCOVERY_GRADE_SIGMA,
    discovery_grade_from_literature_record,
)
from app.physics_engine.sigma_distance import quantitative_distance_to_discovery

SCHEMA = "lenr-s-heat-ladder-v1"

BAND_DISCOVERY = "discovery_analytics_clear"
BAND_EXPLORATORY = "exploratory_gates_blocked"
BAND_DEMOTED_SEED = "demoted_seed_scale"
BAND_NULL_SIGMA = "refuse_null_or_missing_sigma"

#: Primary ladder display ceiling — demoted seed outliers (S≫30) stay off-scale.
LADDER_DISPLAY_MAX_S = 30.0


def _eq_open_status_open() -> Dict[str, str]:
    return {oid: "OPEN" for oid in OPEN_IDS}


def ladder_claim_tier(report: Mapping[str, Any]) -> str:
    """Optics claim-tier chip from MoE provenance (never upgrades discovery)."""
    if (
        bool(report.get("discovery_grade_eligible"))
        and report.get("moe_provenance") in DISCOVERY_ELIGIBLE_PROVENANCE
    ):
        return "empirical_lenr_correlation"
    return "speculative_exploratory"


def regime_band(report: Mapping[str, Any]) -> str:
    """Classify a MoE row for ladder / ranking hygiene."""
    if bool(report.get("q_is_seed_scale")):
        return BAND_DEMOTED_SEED
    significance = report.get("s_heat")
    sigma = report.get("sigma_q_w")
    if (
        significance is None
        or sigma is None
        or not math.isfinite(float(significance))
        or not math.isfinite(float(sigma))
    ):
        return BAND_NULL_SIGMA
    if (
        bool(report.get("discovery_grade_eligible"))
        and report.get("moe_provenance") in DISCOVERY_ELIGIBLE_PROVENANCE
    ):
        return BAND_DISCOVERY
    return BAND_EXPLORATORY


def is_high_success_rankable(report: Mapping[str, Any]) -> bool:
    """ENG-HS-08: high-success lists require cite-gated literature_reported MoE.

    Excludes seed-scale Q and any non-``literature_reported`` provenance
    (instrument_precision / floor / model_assumption), even when arithmetic
    S_heat is large.
    """
    if bool(report.get("q_is_seed_scale")):
        return False
    if report.get("moe_provenance") not in DISCOVERY_ELIGIBLE_PROVENANCE:
        return False
    significance = report.get("s_heat")
    if significance is None or not math.isfinite(float(significance)):
        return False
    return True


def demotion_reason(report: Mapping[str, Any], band: str) -> Optional[str]:
    """Human-readable why a row is out of high-success ranking."""
    if band == BAND_DEMOTED_SEED:
        return (
            "q_is_seed_scale — seed Q ÷ instrument_precision must not "
            "outrank cite-gated literature_reported MoE (ENG-HS-08)"
        )
    if band == BAND_EXPLORATORY:
        provenance = report.get("moe_provenance") or "unknown"
        return (
            f"moe_provenance={provenance} is not literature_reported — "
            "exploratory arithmetic only; excluded from high-success ranking"
        )
    if band == BAND_NULL_SIGMA:
        return (
            "sigma_Q_W / S_heat undefined — refuse fabricated σ_Q; "
            "cannot enter S_heat success ranking"
        )
    return None


def _row_from_report(report: Mapping[str, Any]) -> Dict[str, Any]:
    distance = quantitative_distance_to_discovery(report)
    significance = report.get("s_heat")
    if significance is None:
        significance = distance.get("s_heat")
    threshold = float(DISCOVERY_GRADE_SIGMA)
    margin: Optional[float] = None
    if significance is not None and math.isfinite(float(significance)):
        margin = float(significance) - threshold
    band = regime_band(report)
    claim_tier = ladder_claim_tier(report)
    s_val = float(significance) if significance is not None else None
    display_s: Optional[float] = None
    if s_val is not None and math.isfinite(s_val):
        if band == BAND_DEMOTED_SEED:
            display_s = None  # keep seed outliers off the primary scale
        else:
            display_s = min(s_val, LADDER_DISPLAY_MAX_S)
    return {
        "literature_id": report.get("literature_id"),
        "excess_power_w": (
            float(report["excess_power_w"])
            if report.get("excess_power_w") is not None
            else None
        ),
        "sigma_q_w": (
            float(report["sigma_q_w"])
            if report.get("sigma_q_w") is not None
            else None
        ),
        "s_heat": s_val,
        "display_s_heat": display_s,
        "success_margin_vs_5": margin,
        "moe_provenance": report.get("moe_provenance"),
        "q_source": report.get("q_source"),
        "q_is_seed_scale": bool(report.get("q_is_seed_scale")),
        "moe_sigma_q_pairing_verified": bool(
            report.get("moe_sigma_q_pairing_verified")
        ),
        "discovery_grade_eligible": bool(report.get("discovery_grade_eligible")),
        "distance_status": distance.get("distance_status"),
        "band": band,
        "claim_tier": claim_tier,
        "high_success_rankable": is_high_success_rankable(report),
        "demotion_reason": demotion_reason(report, band),
        "lenr_proved": False,
    }


def build_s_heat_ladder(
    reports: Sequence[Mapping[str, Any]],
) -> Dict[str, Any]:
    """Build HIP-02 ladder + ENG-HS-08 ranked high-success hygiene (RORO).

    ``ranked_high_success`` contains only literature_reported + non-seed rows,
    sorted by S_heat descending. Exploratory / seed / null-σ rows appear in
    separate lists for honest UI — never mixed into high-success rank order.
    """
    rows = [_row_from_report(report) for report in reports]
    high_success = [
        row for row in rows if row["high_success_rankable"]
    ]
    high_success.sort(
        key=lambda row: (
            -(row["s_heat"] if row["s_heat"] is not None else float("-inf")),
            str(row.get("literature_id") or ""),
        )
    )
    for idx, row in enumerate(high_success, start=1):
        row["high_success_rank"] = idx

    exploratory = [
        row for row in rows if row["band"] == BAND_EXPLORATORY
    ]
    exploratory.sort(
        key=lambda row: (
            -(row["s_heat"] if row["s_heat"] is not None else float("-inf")),
            str(row.get("literature_id") or ""),
        )
    )
    demoted_seed = [row for row in rows if row["band"] == BAND_DEMOTED_SEED]
    demoted_seed.sort(
        key=lambda row: (
            -(row["s_heat"] if row["s_heat"] is not None else float("-inf")),
            str(row.get("literature_id") or ""),
        )
    )
    null_sigma = [row for row in rows if row["band"] == BAND_NULL_SIGMA]

    # Raw-S lie check: if we sorted all finite S_heat, seed rows would win.
    raw_sorted_ids = [
        row["literature_id"]
        for row in sorted(
            [r for r in rows if r.get("s_heat") is not None],
            key=lambda r: -float(r["s_heat"]),
        )
    ]
    honest_top_ids = [row["literature_id"] for row in high_success]

    return {
        "schema": SCHEMA,
        "discovery_grade_threshold_sigma": float(DISCOVERY_GRADE_SIGMA),
        "ladder_display_max_s": LADDER_DISPLAY_MAX_S,
        "n_records": len(rows),
        "n_high_success_rankable": len(high_success),
        "n_exploratory_demoted": len(exploratory),
        "n_seed_scale_demoted": len(demoted_seed),
        "n_null_sigma": len(null_sigma),
        "ranked_high_success": high_success,
        "exploratory_band": exploratory,
        "demoted_seed_scale": demoted_seed,
        "null_or_missing_sigma": null_sigma,
        "all_rows": rows,
        "raw_s_heat_order_ids": raw_sorted_ids,
        "honest_high_success_order_ids": honest_top_ids,
        "eng_hs_08": {
            "rule": (
                "Exclude q_is_seed_scale and non-literature_reported from "
                "high-success / success-margin ranking before UI sort"
            ),
            "raw_s_heat_would_lie": bool(
                raw_sorted_ids
                and honest_top_ids
                and raw_sorted_ids[0] != honest_top_ids[0]
            ),
        },
        "closes_eq_open": False,
        "lenr_proved": False,
        "eq_open_status": _eq_open_status_open(),
        "honesty": (
            "S_heat / σ ladder is analytics bookkeeping only. "
            "High-success ranking filters seed-scale Q and non-literature_reported "
            "MoE (ENG-HS-08). Arithmetic S_heat ≥ 5 with blocked gates is not "
            "discovery. Never invent σ_Q; never set lenr_proved; never close "
            "EQ-OPEN-*. Soft language stays analytics_gates_clear — never "
            "“≥5σ met” as discovery closure."
        ),
    }


def literature_s_heat_ladder() -> Dict[str, Any]:
    """Scan curated corpus and build the HIP-02 ladder payload."""
    from app.data.dataset_io import curated_literature_corpus_records

    rows = curated_literature_corpus_records()
    reports = [discovery_grade_from_literature_record(row) for row in rows]
    ladder = build_s_heat_ladder(reports)
    ladder["source"] = (
        "literature_records+iccf27_literature_records+exploratory_moe_literature_records"
    )
    return ladder
