"""Map cite-gated literature / MoE / Bayesian fields onto Experiment columns.

Honesty:
- never invent ``literature_reported`` σ_Q
- ``discovery_grade_eligible`` never sets ``lenr_proved``
- never close any ``EQ-OPEN-*``
- Miles ``instrument_precision`` stays non-discovery
- Q and σ_Q must share an envelope for implicit pairing
"""

from __future__ import annotations

import math
from typing import Any, Dict, List, Mapping, Optional

from app.physics_engine.calorimetry_significance import (
    discovery_grade_from_literature_record,
)

_MEASURED_Q_KEYS = (
    "literature_peak_excess_power_W",
    "measured_excess_power_W",
    "excess_heat_watts_reported",
)


def _optional_float(value: Any) -> Optional[float]:
    if value is None:
        return None
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    if not math.isfinite(number):
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


def _first_present_float(*candidates: Any) -> Optional[float]:
    """Return the first finite float among candidates (None / invalid skipped)."""
    for candidate in candidates:
        if candidate is None:
            continue
        parsed = _optional_float(candidate)
        if parsed is not None:
            return parsed
    return None


def _first_present_str(*candidates: Any, max_len: Optional[int] = None) -> Optional[str]:
    for candidate in candidates:
        text = _optional_str(candidate, max_len=max_len)
        if text is not None:
            return text
    return None


def _first_present_str_list(*candidates: Any) -> Optional[List[str]]:
    for candidate in candidates:
        if isinstance(candidate, list):
            keys = [str(item) for item in candidate if item]
            return keys
    return None


def _sanitize_mapping_floats(
    bag: Mapping[str, Any],
    keys: tuple[str, ...],
) -> Dict[str, Any]:
    """Copy bag, replacing invalid float fields with absence (drop key)."""
    cleaned = dict(bag)
    for key in keys:
        if key not in cleaned or cleaned[key] is None:
            continue
        parsed = _optional_float(cleaned[key])
        if parsed is None:
            cleaned.pop(key, None)
        else:
            cleaned[key] = parsed
    return cleaned


def _copy_measured_q_fields(
    target: Dict[str, Any],
    *bags: Mapping[str, Any],
) -> None:
    """Preserve measured-Q keys recognized by resolve_measured_excess_power_w."""
    for key in _MEASURED_Q_KEYS:
        if key in target and _optional_float(target[key]) is not None:
            continue
        for bag in bags:
            if key not in bag or bag[key] is None:
                continue
            parsed = _optional_float(bag[key])
            if parsed is not None:
                target[key] = parsed
                break


def _restore_measured_q_from_summary(summary: Mapping[str, Any]) -> Dict[str, Any]:
    """Rebuild top-level measured-Q key from bayesian_summary for round-trips."""
    q_source = summary.get("q_source")
    excess = _optional_float(summary.get("excess_power_w"))
    if excess is None or q_source not in _MEASURED_Q_KEYS:
        return {}
    return {str(q_source): excess}


def literature_moe_columns_from_record(
    record: Mapping[str, Any],
) -> Dict[str, Any]:
    """Build first-class SQL column values from a literature / baseline row.

    Missing MoE stays ``None`` (refuse fabrication). Bayesian summary is the
    calorimetry_significance analytics payload with hard honesty locks.
    Explicit ``None`` on the record does not block parameter/results fallbacks.
    When ``results`` carries ``q_ex_w`` + ``sigma_Q_W``, prefer that envelope's σ.
    """
    params = record.get("parameters") if isinstance(record.get("parameters"), dict) else {}
    results_raw = (
        record.get("results") if isinstance(record.get("results"), dict) else {}
    )
    # Drop invalid measured-Q / MoE numerics so float() never raises downstream.
    params = _sanitize_mapping_floats(
        params,
        _MEASURED_Q_KEYS + ("sigma_Q_W", "sigma_Q_statistical_W", "sigma_Q_systematic_W"),
    )
    results = _sanitize_mapping_floats(
        results_raw,
        ("q_ex_w", "sigma_Q_W") + _MEASURED_Q_KEYS,
    )

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

    results_has_q = results.get("q_ex_w") is not None
    results_sigma = _optional_float(results.get("sigma_Q_W"))
    # Same-envelope preference: results Q + σ beat parameter σ for pairing.
    if results_has_q and results_sigma is not None:
        sigma_q_w = _first_present_float(
            record.get("sigma_Q_W"),
            results_sigma,
            params.get("sigma_Q_W"),
        )
    else:
        sigma_q_w = _first_present_float(
            record.get("sigma_Q_W"),
            params.get("sigma_Q_W"),
            results.get("sigma_Q_W"),
        )

    sigma_q_statistical_w = _first_present_float(
        record.get("sigma_Q_statistical_W"),
        params.get("sigma_Q_statistical_W"),
        results.get("sigma_Q_statistical_W"),
    )
    sigma_q_systematic_w = _first_present_float(
        record.get("sigma_Q_systematic_W"),
        params.get("sigma_Q_systematic_W"),
        results.get("sigma_Q_systematic_W"),
    )
    sigma_q_instrument_floor_w = _first_present_float(
        record.get("sigma_Q_instrument_floor_W"),
        params.get("sigma_Q_instrument_floor_W"),
    )
    sigma_q_relative_fraction = _first_present_float(
        record.get("sigma_Q_relative_fraction"),
        params.get("sigma_Q_relative_fraction"),
    )
    moe_provenance = _first_present_str(
        record.get("moe_provenance"),
        params.get("moe_provenance"),
        results.get("moe_provenance"),
        max_len=80,
    )
    moe_citation_keys = _first_present_str_list(
        record.get("moe_citation_keys"),
        params.get("moe_citation_keys"),
        results.get("moe_citation_keys"),
    )
    moe_notes = _first_present_str(
        record.get("moe_notes"),
        params.get("moe_notes"),
        results.get("moe_notes"),
    )

    pairing_raw = record.get("moe_sigma_q_pairing_verified")
    if pairing_raw is None:
        pairing_raw = params.get("moe_sigma_q_pairing_verified")
    if pairing_raw is None:
        pairing_raw = results.get("moe_sigma_q_pairing_verified")
    moe_sigma_q_pairing_verified = (
        bool(pairing_raw) if pairing_raw is not None else None
    )

    # If results Q is paired with a different selected σ, do not claim verified.
    if (
        moe_sigma_q_pairing_verified is None
        and results_has_q
        and results_sigma is not None
        and sigma_q_w is not None
        and abs(float(sigma_q_w) - float(results_sigma)) > 1e-12
    ):
        moe_sigma_q_pairing_verified = False

    excess_heat = _optional_float(record.get("excess_heat_watts"))

    significance_record: Dict[str, Any] = {
        "literature_id": literature_id,
        "citation_key": citation_key,
        "parameters": params,
        "results": results,
        "sigma_Q_W": sigma_q_w,
        "sigma_Q_statistical_W": sigma_q_statistical_w,
        "sigma_Q_systematic_W": sigma_q_systematic_w,
        "moe_provenance": moe_provenance,
        "moe_citation_keys": moe_citation_keys or [],
        "moe_notes": moe_notes,
    }
    if excess_heat is not None:
        significance_record["excess_heat_watts"] = excess_heat
    _copy_measured_q_fields(significance_record, record, params, results)
    # Also restore measured Q from a prior bayesian_summary (pack round-trip).
    prior_summary = results.get("bayesian_summary")
    if isinstance(prior_summary, dict):
        _copy_measured_q_fields(
            significance_record,
            _restore_measured_q_from_summary(prior_summary),
        )
    if moe_sigma_q_pairing_verified is not None:
        significance_record["moe_sigma_q_pairing_verified"] = (
            moe_sigma_q_pairing_verified
        )

    summary = discovery_grade_from_literature_record(significance_record)
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
    """Mirror Bayesian / MoE analytics into results_json without claim flips.

    Authoritative ``s_heat`` / ``discovery_grade_eligible`` from ``columns``
    always overwrite caller-supplied values (including null ``s_heat``).
    Measured-Q used for significance is re-serialized for pack round-trips.
    """
    payload = dict(results or {})
    summary = columns.get("bayesian_summary")
    if isinstance(summary, dict):
        payload["bayesian_summary"] = dict(summary)
        payload["bayesian_summary"]["lenr_proved"] = False
        payload["lenr_proved"] = False
        payload.update(_restore_measured_q_from_summary(summary))
        # Keep results.q_ex_w when that was the Q source.
        if summary.get("q_source") == "results.q_ex_w":
            excess = _optional_float(summary.get("excess_power_w"))
            if excess is not None:
                payload["q_ex_w"] = excess
    else:
        if payload.get("lenr_proved") is True:
            payload["lenr_proved"] = False
        elif "lenr_proved" not in payload:
            payload["lenr_proved"] = False

    payload["s_heat"] = columns.get("s_heat")
    if "discovery_grade_eligible" in columns:
        payload["discovery_grade_eligible"] = bool(
            columns["discovery_grade_eligible"]
        )
    if columns.get("sigma_q_w") is not None:
        payload["sigma_Q_W"] = columns["sigma_q_w"]
    if columns.get("moe_provenance"):
        payload["moe_provenance"] = columns["moe_provenance"]
    if columns.get("moe_citation_keys"):
        payload["moe_citation_keys"] = columns["moe_citation_keys"]
    return payload
