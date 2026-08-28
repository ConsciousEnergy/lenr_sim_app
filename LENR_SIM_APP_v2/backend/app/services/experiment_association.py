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
        row["literatureId"] = params.get("literature_id")
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
    return row


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
