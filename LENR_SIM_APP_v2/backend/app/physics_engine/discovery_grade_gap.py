"""Structured ≥5σ discovery-grade gap bookkeeping (BDS-302).

Surfaces what is **missing** for ``discovery_grade_eligible`` without ever
flipping ``lenr_proved`` or closing ``EQ-OPEN-*``. Campaign / avenue / Lean
outputs alone never clear these gates.
"""

from __future__ import annotations

from typing import Any, Dict, List, Mapping, Optional

from app.campaign.avenue_catalog import OPEN_IDS
from app.physics_engine.calorimetry_significance import (
    DISCOVERY_ELIGIBLE_PROVENANCE,
    DISCOVERY_GRADE_SIGMA,
    discovery_grade_analytics,
)
from app.physics_engine.sigma_distance import quantitative_distance_to_discovery

#: Stable requirement ids for UI / Analytics §5B checklists.
GAP_REQUIREMENT_IDS = (
    "cite_gated_sigma_q",
    "moe_citations",
    "discovery_provenance",
    "moe_pairing_verified",
    "non_seed_measured_q",
    "s_heat_ge_5",
)


def _requirement(
    *,
    requirement_id: str,
    label: str,
    status: str,
    detail: str,
) -> Dict[str, str]:
    return {
        "id": requirement_id,
        "label": label,
        "status": status,
        "detail": detail,
    }


def discovery_grade_gap_bookkeeping(
    report: Optional[Mapping[str, Any]] = None,
) -> Dict[str, Any]:
    """Return missing-requirements checklist for ≥5σ discovery flag (RORO).

    Parameters
    ----------
    report:
        Optional output of ``discovery_grade_analytics``. When ``None``,
        returns the corpus / §5B default: every gate ``not_met`` (campaign
        packs and UI rows do not carry cite-gated discovery MoE).

    Hard honesty: ``lenr_proved`` stays False; every ``EQ-OPEN-*`` stays OPEN;
    ``overall_status`` is ``not_met`` unless *all* BDS-302 gates pass on the
    supplied report. Even then the payload never claims LENR proof or
    EQ-OPEN closure.
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

    sigma = summary.get("sigma_q_w")
    provenance = summary.get("moe_provenance")
    citations = list(summary.get("moe_citation_keys") or [])
    pairing_ok = bool(summary.get("moe_sigma_q_pairing_verified"))
    seed = bool(summary.get("q_is_seed_scale"))
    s_heat_value = summary.get("s_heat")
    provenance_ok = bool(summary.get("moe_provenance_ok", True))
    discovery_prov_ok = bool(summary.get("discovery_provenance_ok"))
    eligible = bool(summary.get("discovery_grade_eligible"))

    has_sigma = sigma is not None
    citations_ok = bool(citations)
    cite_gated_ok = (
        has_sigma
        and provenance_ok
        and provenance in DISCOVERY_ELIGIBLE_PROVENANCE
        and citations_ok
    )
    measured_q_ok = summary.get("excess_power_w") is not None and not seed
    s_heat_ok = (
        s_heat_value is not None
        and float(s_heat_value) >= float(DISCOVERY_GRADE_SIGMA)
    )

    missing: List[Dict[str, str]] = []
    requirements: List[Dict[str, str]] = []

    def add(req: Dict[str, str]) -> None:
        requirements.append(req)
        if req["status"] != "met":
            missing.append(req)

    add(
        _requirement(
            requirement_id="cite_gated_sigma_q",
            label="Cite-gated literature_reported σ_Q",
            status="met" if cite_gated_ok else "not_met",
            detail=(
                "Measurement-specific total σ_Q with literature_reported provenance"
                if cite_gated_ok
                else "Missing cite-gated literature_reported σ_Q (instrument floor/"
                "precision MoE and campaign UQ envelopes do not count)"
            ),
        )
    )
    add(
        _requirement(
            requirement_id="moe_citations",
            label="moe_citation_keys present",
            status="met" if citations_ok else "not_met",
            detail=(
                f"Citations: {', '.join(citations)}"
                if citations
                else "No moe_citation_keys — refuse fabricated lab uncertainty"
            ),
        )
    )
    add(
        _requirement(
            requirement_id="discovery_provenance",
            label="Discovery-eligible MoE provenance",
            status="met" if discovery_prov_ok else "not_met",
            detail=(
                f"moe_provenance={provenance!r}"
                if discovery_prov_ok
                else (
                    f"moe_provenance={provenance!r} is exploratory; "
                    "only literature_reported total σ_Q is discovery-eligible"
                ),
            ),
        )
    )
    add(
        _requirement(
            requirement_id="moe_pairing_verified",
            label="moe_sigma_q_pairing_verified",
            status="met" if pairing_ok else "not_met",
            detail=(
                "Q↔σ_Q pairing verified"
                if pairing_ok
                else "Q↔σ_Q pairing unverified (Miles peak + follow-on ±0.02 stays exploratory)"
            ),
        )
    )
    add(
        _requirement(
            requirement_id="non_seed_measured_q",
            label="Non-seed measured Q_excess",
            status="met" if measured_q_ok else "not_met",
            detail=(
                f"q_source={summary.get('q_source')!r}"
                if measured_q_ok
                else "Measured Q missing or seed-scale excess_heat_watts only"
            ),
        )
    )
    add(
        _requirement(
            requirement_id="s_heat_ge_5",
            label=f"S_heat ≥ {DISCOVERY_GRADE_SIGMA:g}",
            status="met" if s_heat_ok else "not_met",
            detail=(
                f"S_heat={s_heat_value}"
                if s_heat_value is not None
                else "S_heat undefined without Q and σ_Q"
            ),
        )
    )

    overall = "met" if eligible and not missing else "not_met"
    # Belt-and-suspenders: never report overall met if any gate missing.
    if missing:
        overall = "not_met"

    distance = quantitative_distance_to_discovery(summary)

    return {
        "schema": "lenr-discovery-grade-gap-v1",
        "overall_status": overall,
        "discovery_grade_eligible": bool(eligible),
        "discovery_grade_threshold_sigma": DISCOVERY_GRADE_SIGMA,
        "requirements": requirements,
        "missing_requirements": missing,
        "missing_ids": [row["id"] for row in missing],
        "quantitative_distance": distance,
        "lenr_proved": False,
        "eq_open_status": {oid: "OPEN" for oid in OPEN_IDS},
        "honesty": (
            "Gap bookkeeping for the BDS-302 discovery_grade_eligible analytics "
            "flag only. Clearing every gate here still does not set lenr_proved, "
            "does not close EQ-OPEN-*, and does not raise claim_tier. Campaign / "
            "avenue / Lean outputs never satisfy cite-gated discovery MoE. "
            "quantitative_distance reports arithmetic shortfall to ≥5σ without "
            "implying discovery when gates remain blocked."
        ),
    }


def corpus_discovery_grade_gap() -> Dict[str, Any]:
    """§5B / Analytics default: corpus has no discovery-grade MoE closure."""
    return discovery_grade_gap_bookkeeping(None)


#: Closure-path gates that stay not_met until governed discharge + sign-off.
CLOSURE_REQUIREMENT_IDS = (
    "eq_open_discharge",
    "governance_signoff",
)


def honest_closure_bookkeeping(
    discovery_gap: Optional[Mapping[str, Any]] = None,
) -> Dict[str, Any]:
    """Honest LENR-proof / EQ-OPEN closure envelope (always ``not_met``).

    Even when BDS-302 ``discovery_grade_eligible`` clears on a literature row,
    this envelope keeps ``lenr_proved: false`` and every EQ-OPEN ``OPEN``.
    """
    gap = dict(discovery_gap) if discovery_gap is not None else corpus_discovery_grade_gap()
    analytics_missing = list(gap.get("missing_requirements") or [])
    closure_missing = [
        _requirement(
            requirement_id="eq_open_discharge",
            label="EQ-OPEN-* discharge under runway",
            status="not_met",
            detail=(
                "All five EQ-OPEN rows remain OPEN; runway criteria are "
                "documented, not met. Analytics discovery flags do not discharge."
            ),
        ),
        _requirement(
            requirement_id="governance_signoff",
            label="Governed lab evidence + human sign-off",
            status="not_met",
            detail=(
                "lenr_proved stays false until governed evidence + "
                "academic-review sign-off in the same series."
            ),
        ),
    ]
    missing = analytics_missing + closure_missing
    return {
        "schema": "lenr-honest-closure-gap-v1",
        "overall_status": "not_met",
        "discovery_grade_gap": gap,
        "missing_requirements": missing,
        "missing_ids": [row["id"] for row in missing],
        "lenr_proved": False,
        "eq_open_status": {oid: "OPEN" for oid in OPEN_IDS},
        # BDS-375 / UTF History parity: planned DAQ sample-v1 never attests
        # measurements and never discharges EQ-OPEN / lenr_proved.
        "daq_sample_provenance": {
            "schema_id": "lenr-ara-daq-sample-v1",
            "trust_plane": "daq",
            "ingest_status": "planned_not_attested",
            "refuse_fabricated_samples": True,
            "lenr_proved_default": False,
            "closes_eq_open": False,
            # EQ-RATE-DAQ-OCC-NC-01 twin: sample-v1 has no n_occ / f_nuc fields.
            "exposes_occupancy_observables": False,
            "rate_occupancy_underwrite_eligible": False,
            "lean_rate_daq_occ_nc_bound": "EQ-RATE-DAQ-OCC-NC-01",
        },
        # EQ-YIELD-EFF-NC-01 twin: Miles EMP / expected yield ≠ efficiency provenance.
        "he_yield_efficiency_provenance": {
            "retention_efficiency_calibrated": False,
            "collection_efficiency_calibrated": False,
            "simultaneous_heat_he": False,
            "eligible_for_q5_underwrite": False,
            "miles_emp_alone_closes_q5": False,
            "lean_yield_eff_nc_bound": "EQ-YIELD-EFF-NC-01",
        },
        # EQ-RAD-EFF-NC-01 twin: bare γ UL without efficiency/geometry ⇏ Q2.
        "detector_ul_provenance": {
            "efficiency_calibrated": False,
            "geometry_documented": False,
            "heat_coincidence": False,
            "eligible_for_q2_underwrite": False,
            "bare_ul_closes_q2": False,
            "lean_rad_eff_nc_bound": "EQ-RAD-EFF-NC-01",
        },
        # EQ-MEV-LABEL-NC-01 twin: named WH labels ≠ constrained |M|² / occupation.
        "mev_channel_provenance": {
            "named_hypotheses_are_labels_only": True,
            "matrix_element_constrained": False,
            "occupation_constrained": False,
            "eligible_for_q1_underwrite": False,
            "labeled_hypothesis_closes_q1": False,
            "lean_mev_label_nc_bound": "EQ-MEV-LABEL-NC-01",
        },
        "honesty": (
            "Honest closure path for lenr_proved / EQ-OPEN-*. "
            "discovery_grade_eligible is an analytics flag only and never "
            "implies closure. Campaign / avenue / Lean outputs never set "
            "lenr_proved or close EQ-OPEN-*. Planned lenr-ara-daq-sample-v1 "
            "ingest stays non-attested and never discharges obligations. "
            "Planned DAQ occupancy/collective Nat pairs stay ineligible for "
            "EQ-OPEN-RATE-01 underwriting (EQ-RATE-DAQ-OCC-NC-01). "
            "Miles EMP / expected-yield bookkeeping without retention/"
            "collection efficiency provenance never closes EQ-OPEN-YIELD-01 "
            "(EQ-YIELD-EFF-NC-01). "
            "Bare detector γ UL without efficiency/geometry/heat-coincidence "
            "never closes EQ-OPEN-RAD-01 (EQ-RAD-EFF-NC-01). "
            "Named Hagelstein/Dicke/BEC labels without constrained matrix "
            "element + occupation never close EQ-OPEN-MEV-01 "
            "(EQ-MEV-LABEL-NC-01)."
        ),
    }


def attach_discovery_grade_envelopes(
    summary: Optional[Mapping[str, Any]] = None,
) -> Dict[str, Any]:
    """Attach ``discovery_grade_gap`` + ``honest_closure`` onto a significance summary.

    Returns a new dict. Always keeps ``lenr_proved: false`` and EQ-OPEN OPEN.
    """
    payload = dict(summary or {})
    gap = discovery_grade_gap_bookkeeping(payload if summary is not None else None)
    closure = honest_closure_bookkeeping(gap)
    payload["discovery_grade_gap"] = gap
    payload["honest_closure"] = closure
    payload["quantitative_distance"] = gap.get("quantitative_distance")
    payload["lenr_proved"] = False
    payload["eq_open_status"] = {oid: "OPEN" for oid in OPEN_IDS}
    return payload


def discovery_grade_envelopes_from_moe_fields(
    *,
    excess_power_w: Optional[float] = None,
    sigma_q_w: Optional[float] = None,
    sigma_q_statistical_w: Optional[float] = None,
    sigma_q_systematic_w: Optional[float] = None,
    moe_provenance: Optional[str] = None,
    moe_citation_keys: Optional[List[str]] = None,
    moe_sigma_q_pairing_verified: Optional[bool] = None,
    q_source: Optional[str] = None,
    q_is_seed_scale: bool = False,
    discovery_grade_eligible: Optional[bool] = None,
    s_heat: Optional[float] = None,
    literature_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Build gap + honest_closure from MoE / Experiment column fields (RORO)."""
    report = discovery_grade_analytics(
        excess_power_w=excess_power_w,
        sigma_q_w=sigma_q_w,
        sigma_q_statistical_w=sigma_q_statistical_w,
        sigma_q_systematic_w=sigma_q_systematic_w,
        moe_provenance=moe_provenance,
        moe_citation_keys=moe_citation_keys or [],
        moe_sigma_q_pairing_verified=bool(moe_sigma_q_pairing_verified),
        q_source=q_source,
        q_is_seed_scale=bool(q_is_seed_scale),
        literature_id=literature_id,
    )
    # Prefer persisted analytics flag when explicitly provided (pack import
    # forces False even if arithmetic would clear).
    if discovery_grade_eligible is not None:
        report["discovery_grade_eligible"] = bool(discovery_grade_eligible)
    if s_heat is not None and report.get("s_heat") is None:
        report["s_heat"] = s_heat
    return attach_discovery_grade_envelopes(report)
