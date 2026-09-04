"""Literature-anchored campaign cells from versioned baseline JSON.

Designed experiment: one unified cell per distinct literature_id
plus tagged negative controls. Same (host, T, loading) does not collapse
Miles or Chubb into Fleischmann–Pons.
Does not prove LENR. EQ-OPEN-* stay OPEN.
"""

from __future__ import annotations

from typing import Any, Dict, Iterator, List, Tuple

from app.data.dataset_io import literature_records

LITERATURE_NEGATIVE_CONTROLS: List[Dict[str, Any]] = [
    {
        "temperature": 300.0,
        "loading_ratio": 0.90,
        "host_material": "copper",
        "reactant": "hydrogen",
        "rate_mode": "two_body",
        "use_theory_pipeline": True,
        "tag": "literature_copper_host_control",
        "claim_tag": "null",
        "open_question_ids": [],
        "citation_key": None,
    },
    {
        "temperature": 300.0,
        "loading_ratio": 0.10,
        "host_material": "palladium",
        "reactant": "deuterium",
        "rate_mode": "two_body",
        "use_theory_pipeline": True,
        "tag": "literature_unloaded_control",
        "claim_tag": "null",
        "open_question_ids": ["EQ-OPEN-RATE-01"],
        "citation_key": None,
    },
    {
        "temperature": 300.0,
        "loading_ratio": 0.90,
        "host_material": "palladium",
        "reactant": "hydrogen",
        "rate_mode": "two_body",
        "use_theory_pipeline": True,
        "tag": "literature_h_vs_d_control",
        "claim_tag": "null",
        "open_question_ids": ["EQ-OPEN-RATE-01"],
        "citation_key": None,
    },
    {
        "temperature": 300.0,
        "loading_ratio": 0.90,
        "host_material": "palladium",
        "reactant": "deuterium",
        "rate_mode": "trapped_state",
        "use_theory_pipeline": False,
        "tag": "literature_trapped_state_slice",
        "claim_tag": "speculative",
        "open_question_ids": ["EQ-OPEN-RATE-01", "EQ-OPEN-MEV-01"],
        "citation_key": "takahashi2016",
    },
]


def _cell_key(case: Dict[str, Any]) -> Tuple[Any, ...]:
    return (
        str(case.get("host_material")),
        str(case.get("reactant")),
        round(float(case.get("temperature") or 0.0), 3),
        round(float(case.get("loading_ratio") or 0.0), 4),
        str(case.get("rate_mode") or "two_body"),
    )


def iter_literature_baseline_cells() -> Iterator[Dict[str, Any]]:
    """One two-body pipeline cell per distinct literature_id (not T/loading)."""
    seen: set[str] = set()
    for record in literature_records():
        literature_id = str(record["literature_id"])
        if literature_id in seen:
            continue
        seen.add(literature_id)
        loading = record.get("loading_ratio")
        case = {
            "temperature": float(record.get("temperature_k") or 300.0),
            "loading_ratio": float(loading if loading is not None else 0.9),
            "host_material": str(record.get("material") or "palladium"),
            "reactant": str(record.get("reactant") or "deuterium"),
            "rate_mode": "two_body",
            "use_theory_pipeline": True,
            "tag": f"literature:{literature_id}",
            "literature_id": literature_id,
            "citation_key": record.get("citation_key"),
            "claim_tag": record.get("claim_tag"),
            "open_question_ids": list(record.get("open_question_ids") or []),
        }
        yield case


def iter_literature_grid_cases() -> Iterator[Dict[str, Any]]:
    """Baseline-anchored cells plus negative controls (no cartesian blow-up)."""
    seen: set[Tuple[Any, ...]] = set()
    for case in iter_literature_baseline_cells():
        seen.add(_cell_key(case))
        yield dict(case)
    for extra in LITERATURE_NEGATIVE_CONTROLS:
        key = _cell_key(extra)
        if key in seen:
            continue
        seen.add(key)
        yield dict(extra)


def literature_grid_count() -> int:
    return sum(1 for _ in iter_literature_grid_cases())
