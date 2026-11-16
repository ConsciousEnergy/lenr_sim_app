"""Association rank helpers for Analytics experiment list rows.

``meanFinalScore`` is five-factor GM × claim_tier (model association),
not a laboratory probability that LENR occurs. Extra runs do not raise
empirical claim tiers or close EQ-OPEN-*.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import and_, or_

from app.models.database_models import Experiment
from app.services.enhancement_history import enhancement_is_saturated
from app.services.simulation_persistence import (
    SHARED_SOURCES,
    SOURCE_AUTO_PERSIST,
    SOURCE_CAMPAIGN,
)

SOURCE_CLASSES = ("Baseline", "Campaign", "Auto", "User")
PYTHON_SORT_FIELDS = frozenset({"mean_final_score"})


def classify_source_class(*, is_baseline: bool, source: Optional[str] = None) -> str:
    """Map SQL flags onto the History source-chip vocabulary."""
    if is_baseline:
        return "Baseline"
    if source == SOURCE_CAMPAIGN:
        return "Campaign"
    if source == SOURCE_AUTO_PERSIST:
        return "Auto"
    return "User"


def normalize_source_class(source_class: Optional[str]) -> Optional[str]:
    if source_class is None:
        return None
    text = str(source_class).strip()
    if not text:
        return None
    lookup = {item.lower(): item for item in SOURCE_CLASSES}
    return lookup.get(text.lower())


def source_class_clause(source_class: Optional[str]):
    """SQLAlchemy filter for Baseline / Campaign / Auto / User, or None."""
    label = normalize_source_class(source_class)
    if label is None:
        return None
    if label == "Baseline":
        return Experiment.is_baseline.is_(True)
    if label == "Campaign":
        return and_(
            Experiment.is_baseline.is_(False),
            Experiment.source == SOURCE_CAMPAIGN,
        )
    if label == "Auto":
        return and_(
            Experiment.is_baseline.is_(False),
            Experiment.source == SOURCE_AUTO_PERSIST,
        )
    return and_(
        Experiment.is_baseline.is_(False),
        or_(
            Experiment.source.is_(None),
            ~Experiment.source.in_(list(SHARED_SOURCES)),
        ),
    )


def _record_association_score(record: Dict[str, Any]) -> float:
    if record.get("final_score") is not None:
        return float(record.get("final_score") or 0.0)
    return float(record.get("score") or 0.0)


def association_from_scores(
    scores: Optional[Dict[str, Any]],
) -> Tuple[Optional[float], Optional[str]]:
    """Mean association score and top theory id from ``pipeline_scores``."""
    if not isinstance(scores, dict) or not scores:
        return None, None
    values: List[Tuple[str, float]] = []
    for theory_id, record in scores.items():
        if not isinstance(record, dict) or not theory_id:
            continue
        values.append((str(theory_id), _record_association_score(record)))
    if not values:
        return None, None
    mean = sum(value for _, value in values) / len(values)
    top_id, _ = max(values, key=lambda item: item[1])
    return mean, top_id


def enrich_experiment_dict(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Add additive list fields without dropping existing keys."""
    row = dict(payload)
    row.setdefault(
        "sourceClass",
        classify_source_class(
            is_baseline=bool(row.get("is_baseline")),
            source=row.get("source"),
        ),
    )
    params = row.get("parameters") or {}
    if "literatureId" not in row:
        # Prefer first-class SQL column (Alembic 003); fall back for older rows.
        row["literatureId"] = row.get("literature_id") or params.get(
            "literature_id"
        )
    results = row.get("results") or {}
    scores = results.get("pipeline_scores") or {}
    mean, top_id = association_from_scores(scores)
    if "meanFinalScore" not in row:
        row["meanFinalScore"] = mean
    if "topTheoryId" not in row:
        row["topTheoryId"] = top_id
    saturation = results.get("enhancement_saturation") or {}
    if "enhancementSaturated" not in row:
        row["enhancementSaturated"] = bool(
            saturation.get("is_saturated")
        ) or enhancement_is_saturated(row.get("enhancement_factor"))
    if "log10EnhancementRaw" not in row:
        log10_raw = saturation.get("log10_value_raw")
        row["log10EnhancementRaw"] = (
            float(log10_raw) if isinstance(log10_raw, (int, float)) else None
        )
    if "excessHeatWatts" not in row:
        watts = row.get("excess_heat_watts")
        if watts is None:
            watts = results.get("total_energy_watts")
        row["excessHeatWatts"] = watts

    # Additive ≥5σ / honest-closure envelopes for Analytics History + export.
    _attach_discovery_grade_envelopes_to_row(row)
    return row


def _attach_discovery_grade_envelopes_to_row(row: Dict[str, Any]) -> None:
    """Ensure discovery_grade_gap + honest_closure on analytics row payloads."""
    from app.physics_engine.calorimetry_significance import (
        resolve_measured_excess_power_w,
    )
    from app.physics_engine.discovery_grade_gap import (
        discovery_grade_envelopes_from_moe_fields,
    )

    results = row.get("results") if isinstance(row.get("results"), dict) else {}
    parameters = (
        row.get("parameters") if isinstance(row.get("parameters"), dict) else {}
    )
    summary = row.get("bayesian_summary")
    if not isinstance(summary, dict):
        summary = results.get("bayesian_summary") if isinstance(results, dict) else None
    if not isinstance(summary, dict):
        summary = {}

    # Resolve Q + seed flag together from the live row. Never pair a stale
    # bayesian_summary.excess_power_w with an updated row sigma_Q_W.
    q_probe: Dict[str, Any] = {
        "excess_heat_watts": row.get("excess_heat_watts"),
        "parameters": dict(parameters),
        "results": dict(results),
    }
    for key in (
        "literature_peak_excess_power_W",
        "measured_excess_power_W",
        "excess_heat_watts_reported",
    ):
        if row.get(key) is not None:
            q_probe[key] = row[key]
        elif results.get(key) is not None:
            q_probe[key] = results[key]

    # When σ still matches the summary envelope, restore missing measured-Q
    # slots (e.g. results.q_ex_w) so baselines round-trip. If σ was updated
    # independently, skip summary Q entirely — resolve live fields only.
    row_sigma = row.get("sigma_Q_W")
    summary_sigma = summary.get("sigma_q_w")
    sigma_matches_summary = True
    try:
        if row_sigma is not None and summary_sigma is not None:
            sigma_matches_summary = abs(float(row_sigma) - float(summary_sigma)) <= 1e-12
    except (TypeError, ValueError):
        sigma_matches_summary = False
    if sigma_matches_summary:
        summary_q = summary.get("excess_power_w")
        summary_q_source = summary.get("q_source")
        if summary_q is not None and summary_q_source == "results.q_ex_w":
            if q_probe["results"].get("q_ex_w") is None:
                q_probe["results"]["q_ex_w"] = summary_q
        elif summary_q is not None and summary_q_source in (
            "literature_peak_excess_power_W",
            "measured_excess_power_W",
            "excess_heat_watts_reported",
        ):
            if q_probe.get(summary_q_source) is None:
                q_probe[str(summary_q_source)] = summary_q

    q_w, q_source, q_is_seed = resolve_measured_excess_power_w(q_probe)

    # Rebuild from MoE columns so older SQL rows and pack imports stay honest.
    attached = discovery_grade_envelopes_from_moe_fields(
        excess_power_w=q_w,
        sigma_q_w=row.get("sigma_Q_W"),
        sigma_q_statistical_w=row.get("sigma_Q_statistical_W"),
        sigma_q_systematic_w=row.get("sigma_Q_systematic_W"),
        moe_provenance=row.get("moe_provenance"),
        moe_citation_keys=row.get("moe_citation_keys")
        if isinstance(row.get("moe_citation_keys"), list)
        else None,
        moe_sigma_q_pairing_verified=row.get("moe_sigma_q_pairing_verified"),
        q_source=q_source,
        q_is_seed_scale=bool(q_is_seed),
        discovery_grade_eligible=row.get("discovery_grade_eligible"),
        s_heat=row.get("s_heat") if q_w is None else None,
        literature_id=row.get("literature_id") or row.get("literatureId"),
    )
    # Preserve prior summary metadata; significance + gap envelopes win.
    attached = {**summary, **attached, "lenr_proved": False}
    gap = attached["discovery_grade_gap"]
    closure = attached["honest_closure"]

    row["discovery_grade_gap"] = gap
    row["honest_closure"] = closure
    row["bayesian_summary"] = attached
    # Never allow export envelopes to claim LENR proof / EQ-OPEN closure.
    row["lenr_proved"] = False
    if isinstance(row.get("results"), dict):
        row["results"] = {
            **row["results"],
            "lenr_proved": False,
            "discovery_grade_gap": gap,
            "honest_closure": closure,
            "bayesian_summary": attached,
        }


def sort_enriched_rows(
    rows: List[Dict[str, Any]],
    *,
    sort_by: str,
    sort_order: str,
) -> List[Dict[str, Any]]:
    descending = str(sort_order or "desc").lower() != "asc"

    def _key(row: Dict[str, Any]) -> Tuple[int, float]:
        value = row.get("meanFinalScore")
        if value is None:
            return (1, 0.0)
        signed = -float(value) if descending else float(value)
        return (0, signed)

    return sorted(rows, key=_key)
