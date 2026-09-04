"""Classify persisted runs as completion vs scientific outcome.

Completion (HTTP/SQL status) is not LENR validation. These labels describe
model or literature *outcomes* only. They do not prove LENR.

Positive is reserved for excess heat strictly above 0 W. Enhancement factor
alone never counts as a scientific positive.
"""

from __future__ import annotations

from typing import Any, Dict, Mapping, Optional

OUTCOME_FAILED = "failed"
OUTCOME_INAPPLICABLE = "inapplicable"
OUTCOME_POSITIVE = "positive"
OUTCOME_NULL = "null"

VALID_OUTCOMES = (
    OUTCOME_FAILED,
    OUTCOME_INAPPLICABLE,
    OUTCOME_POSITIVE,
    OUTCOME_NULL,
)

# Documented threshold: any reported excess heat above 0 W is "positive".
# Enhancement-only rows stay null so a large screening factor is not "success".
EXCESS_HEAT_POSITIVE_THRESHOLD_W = 0.0


def _as_mapping(value: Any) -> Dict[str, Any]:
    return dict(value) if isinstance(value, Mapping) else {}


def tally_claim_tiers(pipeline_scores: Optional[Mapping[str, Any]] = None) -> Dict[str, int]:
    """Count claim_tier labels from per-theory pipeline scores."""
    counts: Dict[str, int] = {}
    for record in _as_mapping(pipeline_scores).values():
        if not isinstance(record, Mapping):
            continue
        tier = record.get("claim_tier")
        if not tier:
            continue
        key = str(tier)
        counts[key] = counts.get(key, 0) + 1
    return counts


def classify_scientific_outcome(
    *,
    status: Optional[str] = None,
    excess_heat_watts: Any = None,
    pipeline_scores: Optional[Mapping[str, Any]] = None,
    results: Optional[Mapping[str, Any]] = None,
) -> str:
    """Return failed | inapplicable | positive | null."""
    if str(status or "").lower() in {"failed", "cancelled"}:
        return OUTCOME_FAILED

    payload = _as_mapping(results)
    scores = _as_mapping(pipeline_scores) or _as_mapping(payload.get("pipeline_scores"))

    applicability = []
    for record in scores.values():
        if isinstance(record, Mapping) and "is_applicable" in record:
            applicability.append(bool(record.get("is_applicable")))
    if applicability and not any(applicability):
        return OUTCOME_INAPPLICABLE

    heat = excess_heat_watts
    if heat is None:
        observables = _as_mapping(payload.get("observables"))
        heat = observables.get("excess_heat_watts")
        if heat is None:
            heat = payload.get("excess_heat_watts")
    try:
        if heat is not None and float(heat) > EXCESS_HEAT_POSITIVE_THRESHOLD_W:
            return OUTCOME_POSITIVE
    except (TypeError, ValueError):
        pass
    return OUTCOME_NULL


def classify_experiment(experiment: Any) -> str:
    """Classify an Experiment ORM row or dict-like record."""
    if isinstance(experiment, Mapping):
        results = experiment.get("results") or experiment.get("results_json") or {}
        return classify_scientific_outcome(
            status=experiment.get("status"),
            excess_heat_watts=experiment.get("excess_heat_watts"),
            pipeline_scores=_as_mapping(results).get("pipeline_scores"),
            results=results,
        )
    results = getattr(experiment, "results_json", None) or {}
    return classify_scientific_outcome(
        status=getattr(experiment, "status", None),
        excess_heat_watts=getattr(experiment, "excess_heat_watts", None),
        pipeline_scores=_as_mapping(results).get("pipeline_scores"),
        results=results,
    )


def tally_claim_tiers_from_experiment(experiment: Any) -> Dict[str, int]:
    if isinstance(experiment, Mapping):
        results = experiment.get("results") or experiment.get("results_json") or {}
    else:
        results = getattr(experiment, "results_json", None) or {}
    payload = _as_mapping(results)
    stored = payload.get("claim_tier_histogram")
    if isinstance(stored, Mapping):
        return {str(k): int(v) for k, v in stored.items()}
    return tally_claim_tiers(payload.get("pipeline_scores"))
