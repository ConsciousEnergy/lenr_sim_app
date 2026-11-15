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
    resolve_measured_excess_power_w,
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
    Resolve measured Q first; σ and provenance follow that envelope only.
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

    excess_heat = _optional_float(record.get("excess_heat_watts"))

    # Resolve Q first so σ / provenance follow the same envelope.
    q_probe: Dict[str, Any] = {
        "parameters": params,
        "results": results,
    }
    if excess_heat is not None:
        q_probe["excess_heat_watts"] = excess_heat
    _copy_measured_q_fields(q_probe, record, params, results)
    prior_summary = results.get("bayesian_summary")
    if isinstance(prior_summary, dict):
        _copy_measured_q_fields(
            q_probe,
            _restore_measured_q_from_summary(prior_summary),
        )
    _q_w, q_source, _q_seed = resolve_measured_excess_power_w(q_probe)

    results_sigma = _optional_float(results.get("sigma_Q_W"))
    params_sigma = _optional_float(params.get("sigma_Q_W"))
    record_sigma = _optional_float(record.get("sigma_Q_W"))

    if q_source == "results.q_ex_w":
        # Results Q → prefer results σ; explicit top-level may override.
        sigma_q_w = _first_present_float(record_sigma, results_sigma, params_sigma)
        envelope = results
        envelope_sigma = results_sigma
    elif q_source in (
        "measured_excess_power_W",
        "literature_peak_excess_power_W",
        "excess_heat_watts_reported",
    ):
        # Measured-Q lives on record/params — do not steal results σ.
        if _optional_float(record.get(q_source)) is not None:
            q_bag = record
        elif _optional_float(params.get(q_source)) is not None:
            q_bag = params
        else:
            q_bag = results
        sigma_q_w = _first_present_float(
            record_sigma,
            _optional_float(q_bag.get("sigma_Q_W")),
            params_sigma,
        )
        envelope = q_bag
        envelope_sigma = _optional_float(q_bag.get("sigma_Q_W"))
    else:
        # Seed-scale / unknown — generic fallback order.
        sigma_q_w = _first_present_float(record_sigma, params_sigma, results_sigma)
        if (
            record_sigma is not None
            and sigma_q_w is not None
            and abs(record_sigma - sigma_q_w) <= 1e-12
        ):
            envelope = record
        elif (
            params_sigma is not None
            and sigma_q_w is not None
            and abs(params_sigma - sigma_q_w) <= 1e-12
        ):
            envelope = params
        else:
            envelope = results
        envelope_sigma = _optional_float(envelope.get("sigma_Q_W"))

    def _sigma_matches(candidate: Optional[float]) -> bool:
        return (
            candidate is not None
            and sigma_q_w is not None
            and abs(float(candidate) - float(sigma_q_w)) <= 1e-12
        )

    # Provenance / citations / notes must travel with the selected σ envelope.
    if _sigma_matches(record_sigma):
        meta_bags: tuple[Mapping[str, Any], ...] = (record, params, results)
    elif _sigma_matches(envelope_sigma):
        meta_bags = (envelope, record)
    elif _sigma_matches(params_sigma):
        meta_bags = (params, record)
    elif _sigma_matches(results_sigma):
        meta_bags = (results, record)
    else:
        meta_bags = (record,)

    moe_provenance = _first_present_str(
        *(bag.get("moe_provenance") for bag in meta_bags),
        max_len=80,
    )
    moe_citation_keys = _first_present_str_list(
        *(bag.get("moe_citation_keys") for bag in meta_bags)
    )
    moe_notes = _first_present_str(*(bag.get("moe_notes") for bag in meta_bags))
    pairing_raw = None
    for bag in meta_bags:
        if "moe_sigma_q_pairing_verified" in bag:
            pairing_raw = bag.get("moe_sigma_q_pairing_verified")
            break

    moe_sigma_q_pairing_verified = (
        bool(pairing_raw) if pairing_raw is not None else None
    )

    # Block implicit pairing when selected σ ≠ results envelope σ for results Q.
    if (
        moe_sigma_q_pairing_verified is None
        and q_source == "results.q_ex_w"
        and results_sigma is not None
        and sigma_q_w is not None
        and abs(float(sigma_q_w) - float(results_sigma)) > 1e-12
    ):
        moe_sigma_q_pairing_verified = False

    sigma_q_statistical_w = _first_present_float(
        record.get("sigma_Q_statistical_W"),
        envelope.get("sigma_Q_statistical_W"),
        params.get("sigma_Q_statistical_W"),
        results.get("sigma_Q_statistical_W"),
    )
    sigma_q_systematic_w = _first_present_float(
        record.get("sigma_Q_systematic_W"),
        envelope.get("sigma_Q_systematic_W"),
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
    _copy_measured_q_fields(significance_record, q_probe)
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
