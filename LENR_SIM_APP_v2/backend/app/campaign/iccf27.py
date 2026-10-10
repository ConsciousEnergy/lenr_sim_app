"""ICCF-27 literature extension campaign (does not mutate the locked 17-row seed set)."""

from __future__ import annotations

from typing import Any, Dict, Iterator, List

from app.data.dataset_io import iccf27_literature_records

ICCF27_NEGATIVE_CONTROLS: List[Dict[str, Any]] = [
    {
        "temperature": 300.0,
        "loading_ratio": 0.10,
        "host_material": "graphite",
        "reactant": "hydrogen",
        "rate_mode": "two_body",
        "use_theory_pipeline": True,
        "tag": "iccf27_graphite_unloaded_control",
        "claim_tag": "null",
        "open_question_ids": ["EQ-OPEN-RATE-01"],
    },
    {
        "temperature": 300.0,
        "loading_ratio": 0.90,
        "host_material": "silicon_carbide",
        "reactant": "hydrogen",
        "rate_mode": "two_body",
        "use_theory_pipeline": True,
        "tag": "iccf27_sic_control",
        "claim_tag": "null",
        "open_question_ids": ["EQ-OPEN-RATE-01"],
    },
]


def iter_iccf27_grid_cases() -> Iterator[Dict[str, Any]]:
    """One two-body pipeline cell per ICCF-27 literature_id plus C/SiC controls."""
    seen: set[str] = set()
    for record in iccf27_literature_records():
        lit_id = str(record.get("literature_id") or "")
        if not lit_id or lit_id in seen:
            continue
        seen.add(lit_id)
        params = record.get("parameters") or {}
        case: Dict[str, Any] = {
            "temperature": float(record.get("temperature_k") or 300.0),
            "loading_ratio": float(record.get("loading_ratio") or 0.9),
            "host_material": str(record.get("material") or "palladium"),
            "reactant": str(record.get("reactant") or "deuterium"),
            "rate_mode": "two_body",
            "use_theory_pipeline": True,
            "tag": f"iccf27:{lit_id}",
            "literature_id": lit_id,
            "citation_key": record.get("citation_key"),
            "claim_tag": record.get("claim_tag"),
            "open_question_ids": list(record.get("open_question_ids") or []),
        }
        if params.get("beam_energy_kev") is not None:
            case["beam_energy_kev"] = float(params["beam_energy_kev"])
        if params.get("molecular_beam_species"):
            case["molecular_beam_species"] = str(params["molecular_beam_species"])
        if params.get("h2_absorb_pressure_pa") is not None:
            case["h2_absorb_pressure_pa"] = float(params["h2_absorb_pressure_pa"])
        if params.get("radiant_calorimetry"):
            case["radiant_calorimetry"] = True
        if params.get("actual_host"):
            case["host_material"] = str(params["actual_host"])
        yield case
    yield from ICCF27_NEGATIVE_CONTROLS


def iccf27_grid_count() -> int:
    return len(list(iter_iccf27_grid_cases()))
