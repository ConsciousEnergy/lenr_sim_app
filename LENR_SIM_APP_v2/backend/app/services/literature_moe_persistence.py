"""Map cite-gated literature / MoE / Bayesian fields onto Experiment columns.

Honesty:
- never invent ``literature_reported`` σ_Q
- ``discovery_grade_eligible`` never sets ``lenr_proved``
- never close any ``EQ-OPEN-*``
- Miles ``instrument_precision`` stays non-discovery
"""

from __future__ import annotations

from typing import Any, Dict, Mapping, Optional

from app.physics_engine.calorimetry_significance import (
    discovery_grade_from_literature_record,
)


def _optional_float(value: Any) -> Optional[float]:
    if value is None:
        return None
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return number


def _optional_str(value: Any, *, max_len: Optional[int] = None) -> Optional[str]:
    if value is None:
        return None
    text = str(value).strip()
    if not text:
        return None
    if max_len is not None:
        return text[:max_len]
    return text


def literature_moe_columns_from_record(
    record: Mapping[str, Any],
) -> Dict[str, Any]:
    """Build first-class SQL column values from a literature / baseline row.

    Missing MoE stays ``None`` (refuse fabrication). Bayesian summary is the
    calorimetry_significance analytics payload with hard honesty locks.
    """
    params = record.get("parameters") if isinstance(record.get("parameters"), dict) else {}
    results = record.get("results") if isinstance(record.get("results"), dict) else {}

    literature_id = _optional_str(
        record.get("literature_id") or params.get("literature_id"),
        max_len=120,
    )
    claim_tag = _optional_str(
        record.get("claim_tag") or params.get("claim_tag"),
        max_len=40,
    )
    citation_key = _optional_str(
        record.get("citation_key") or params.get("citation_key"),
        max_len=120,
    )
    doi = _optional_str(record.get("doi") or params.get("doi"), max_len=200)

    open_ids_raw = record.get("open_question_ids")
    if open_ids_raw is None:
        open_ids_raw = params.get("open_question_ids")
    open_question_ids = (
        [str(item) for item in open_ids_raw if item]
        if isinstance(open_ids_raw, list)
        else None
    )

    sigma_q_w = _optional_float(
        record.get("sigma_Q_W")
        if "sigma_Q_W" in record
        else params.get("sigma_Q_W")
    )
    sigma_q_statistical_w = _optional_float(
        record.get("sigma_Q_statistical_W", params.get("sigma_Q_statistical_W"))
    )
    sigma_q_systematic_w = _optional_float(
        record.get("sigma_Q_systematic_W", params.get("sigma_Q_systematic_W"))
    )
    sigma_q_instrument_floor_w = _optional_float(
        record.get(
            "sigma_Q_instrument_floor_W",
            params.get("sigma_Q_instrument_floor_W"),
        )
    )
    sigma_q_relative_fraction = _optional_float(
        record.get(
            "sigma_Q_relative_fraction",
            params.get("sigma_Q_relative_fraction"),
        )
    )
    moe_provenance = _optional_str(
        record.get("moe_provenance") or params.get("moe_provenance"),
        max_len=80,
    )
    moe_keys_raw = record.get("moe_citation_keys")
    if moe_keys_raw is None:
        moe_keys_raw = params.get("moe_citation_keys")
    moe_citation_keys = (
        [str(item) for item in moe_keys_raw if item]
        if isinstance(moe_keys_raw, list)
        else None
    )
    moe_notes = _optional_str(record.get("moe_notes") or params.get("moe_notes"))

    pairing_raw = record.get("moe_sigma_q_pairing_verified")
    if pairing_raw is None:
        pairing_raw = params.get("moe_sigma_q_pairing_verified")
    if pairing_raw is None:
        pairing_raw = results.get("moe_sigma_q_pairing_verified")
    moe_sigma_q_pairing_verified = (
        bool(pairing_raw) if pairing_raw is not None else None
    )

    # Build a significance view that prefers measured Q over seed-scale watts.
    significance_record: Dict[str, Any] = {
        "literature_id": literature_id,
        "citation_key": citation_key,
        "excess_heat_watts": record.get("excess_heat_watts"),
        "parameters": params,
        "results": results,
        "sigma_Q_W": sigma_q_w,
        "sigma_Q_statistical_W": sigma_q_statistical_w,
        "sigma_Q_systematic_W": sigma_q_systematic_w,
        "moe_provenance": moe_provenance,
        "moe_citation_keys": moe_citation_keys or [],
        "moe_notes": moe_notes,
    }
    if "literature_peak_excess_power_W" in record:
        significance_record["literature_peak_excess_power_W"] = record[
            "literature_peak_excess_power_W"
        ]
    if moe_sigma_q_pairing_verified is not None:
        significance_record["moe_sigma_q_pairing_verified"] = (
            moe_sigma_q_pairing_verified
        )

    summary = discovery_grade_from_literature_record(significance_record)
    # Hard honesty locks — never persist claim flips via this path.
    summary["lenr_proved"] = False
    if isinstance(summary.get("eq_open_status"), dict):
        summary["eq_open_status"] = {
            key: "OPEN" for key in summary["eq_open_status"]
        }

    return {
        "literature_id": literature_id,
        "claim_tag": claim_tag,
        "citation_key": citation_key,
        "doi": doi,
        "open_question_ids": open_question_ids,
        "sigma_q_w": sigma_q_w,
        "sigma_q_statistical_w": sigma_q_statistical_w,
        "sigma_q_systematic_w": sigma_q_systematic_w,
        "sigma_q_instrument_floor_w": sigma_q_instrument_floor_w,
        "sigma_q_relative_fraction": sigma_q_relative_fraction,
        "moe_provenance": moe_provenance,
        "moe_citation_keys": moe_citation_keys,
        "moe_notes": moe_notes,
        "moe_sigma_q_pairing_verified": (
            bool(summary.get("moe_sigma_q_pairing_verified"))
            if summary.get("moe_sigma_q_pairing_verified") is not None
            else moe_sigma_q_pairing_verified
        ),
        "s_heat": summary.get("s_heat"),
        "discovery_grade_eligible": bool(
            summary.get("discovery_grade_eligible")
        ),
        "bayesian_summary": summary,
    }


def merge_bayesian_into_results(
    results: Optional[Mapping[str, Any]],
    columns: Mapping[str, Any],
) -> Dict[str, Any]:
    """Mirror Bayesian / MoE analytics into results_json without claim flips."""
    payload = dict(results or {})
    summary = columns.get("bayesian_summary")
    if isinstance(summary, dict):
        payload["bayesian_summary"] = dict(summary)
        payload["bayesian_summary"]["lenr_proved"] = False
        # Keep existing lenr_proved false if present; never promote to true.
        if payload.get("lenr_proved") is True:
            payload["lenr_proved"] = False
        elif "lenr_proved" not in payload:
            payload["lenr_proved"] = False
    if columns.get("s_heat") is not None:
        payload.setdefault("s_heat", columns["s_heat"])
    if "discovery_grade_eligible" in columns:
        payload.setdefault(
            "discovery_grade_eligible",
            bool(columns["discovery_grade_eligible"]),
        )
    if columns.get("sigma_q_w") is not None:
        payload.setdefault("sigma_Q_W", columns["sigma_q_w"])
    if columns.get("moe_provenance"):
        payload.setdefault("moe_provenance", columns["moe_provenance"])
    if columns.get("moe_citation_keys"):
        payload.setdefault("moe_citation_keys", columns["moe_citation_keys"])
    return payload
