"""Baseline LENR experiment data from published literature.

Rows are loaded from ``LENR_SIM_APP_v2/datasets/literature_baselines.v1.json``.
IDs are stable UUID5 values derived from ``literature_id``.
"""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any, Dict, List

from app.data.dataset_io import literature_baselines, literature_records, stable_baseline_id

_RUNTIME_KEYS = (
    "name",
    "description",
    "experiment_type",
    "status",
    "is_baseline",
    "source",
    "source_url",
    "material",
    "temperature_k",
    "pressure_bar",
    "loading_ratio",
    "defect_density",
    "driving_frequency_khz",
    "parameters",
    "enhancement_factor",
    "fusion_rate",
    "energy_output_kev",
    "excess_heat_watts",
    "duration_seconds",
    "results",
)


def get_baseline_experiments() -> List[Dict[str, Any]]:
    """Return baseline LENR experiment rows for seeding and comparison."""
    payload = literature_baselines()
    anchor = datetime.fromisoformat(str(payload.get("anchor_date") or "2026-01-01"))
    experiments: List[Dict[str, Any]] = []
    for record in literature_records():
        literature_id = str(record["literature_id"])
        offset_days = int(record.get("created_at_offset_days") or 0)
        row: Dict[str, Any] = {
            "id": stable_baseline_id(literature_id),
            "literature_id": literature_id,
            "citation_key": record.get("citation_key"),
            "doi": record.get("doi"),
            "claim_tag": record.get("claim_tag"),
            "reactant": record.get("reactant"),
            "open_question_ids": list(record.get("open_question_ids") or []),
            "created_at": anchor - timedelta(days=offset_days),
        }
        for key in _RUNTIME_KEYS:
            if key in record:
                row[key] = record[key]
        params = dict(row.get("parameters") or {})
        params.setdefault("literature_id", literature_id)
        if record.get("claim_tag"):
            params.setdefault("claim_tag", record.get("claim_tag"))
        params.setdefault(
            "open_question_ids",
            list(record.get("open_question_ids") or []),
        )
        row["parameters"] = params
        experiments.append(row)
    return experiments


def get_baseline_timeline_data() -> Dict[str, List[Dict[str, Any]]]:
    """Return sample timeline data for baseline experiments."""
    import random

    timeline: Dict[str, List[Dict[str, Any]]] = {}
    timeline["fleischmann_pons_sample"] = []
    for i in range(100):
        timestamp_ms = i * 3600000
        if i < 20:
            enhancement = 1.0 + random.random() * 2
            energy = random.random() * 5
        elif i < 40:
            enhancement = 5.0 + random.random() * 5
            energy = 5 + random.random() * 10
        elif i < 60:
            enhancement = 15.0 + random.random() * 10
            energy = 20 + random.random() * 20
        else:
            enhancement = 20.0 + random.random() * 15
            energy = 50 + random.random() * 50
        timeline["fleischmann_pons_sample"].append({
            "timestamp_ms": timestamp_ms,
            "enhancement_factor": round(enhancement, 2),
            "temperature_k": 300 + random.random() * 50,
            "energy_output": round(energy, 2),
            "data": {
                "loading_ratio": 0.6 + (i / 100) * 0.35,
                "current_ma": 100 + random.random() * 50,
            },
        })
    return timeline
