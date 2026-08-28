"""Designed theory-testbed review campaign (not a cartesian).

One isolated cell per registered theory_id plus three literature-anchored
full-pipeline cells (Miles, McKubre SRI, ARPA-E null). Pipeline on.
Model output only. Does not prove LENR. EQ-OPEN-* stay OPEN.
"""

from __future__ import annotations

from typing import Any, Dict, Iterator, List, Tuple

from app.data.dataset_io import literature_records
from app.physics_engine.theory_pipeline import get_default_pipeline

ANCHOR_LITERATURE_IDS: Tuple[str, ...] = (
    "miles-1993",
    "mckubre-sri-p13-p14-1992",
    "berlinguette-arpa-e-2019",
)

# Isolated cells default to Pd-D at Miles 1993 unless a theory has a
# literature-relevant host (Ni-H for Piantelli).
THEORY_HOST_OVERRIDES: Dict[str, Dict[str, Any]] = {
    "piantelli_ni_h": {
        "host_material": "nickel",
        "reactant": "hydrogen",
        "literature_id": "brillouin-ni-h-2012",
        "temperature": 300.0,
        "loading_ratio": 0.90,
    },
    "iwamura_transmutation": {"literature_id": "iwamura-cs-pr-2002"},
    "hagelstein_phonon": {"literature_id": "hagelstein-phonon-2010"},
    "chubb_ion_band": {"literature_id": "chubb-lattice-tunneling-2004"},
    "miles_heat_helium": {"literature_id": "miles-1993"},
}

DEFAULT_ISOLATED: Dict[str, Any] = {
    "temperature": 300.0,
    "loading_ratio": 0.90,
    "host_material": "palladium",
    "reactant": "deuterium",
    "literature_id": "miles-1993",
}


def _records_by_id() -> Dict[str, Dict[str, Any]]:
    return {str(row["literature_id"]): row for row in literature_records()}


def iter_testbed_review_isolated_cases() -> Iterator[Dict[str, Any]]:
    """One pipeline cell per registered theory_id."""
    records = _records_by_id()
    theory_ids = list(get_default_pipeline().registered_ids)
    for theory_id in theory_ids:
        spec = dict(DEFAULT_ISOLATED)
        spec.update(THEORY_HOST_OVERRIDES.get(theory_id) or {})
        literature_id = str(spec.get("literature_id") or "miles-1993")
        record = records.get(literature_id) or {}
        yield {
            "temperature": float(spec["temperature"]),
            "loading_ratio": float(spec["loading_ratio"]),
            "host_material": str(spec["host_material"]),
            "reactant": str(spec["reactant"]),
            "rate_mode": "two_body",
            "use_theory_pipeline": True,
            "enabled_theories": [theory_id],
            "tag": f"testbed_review:{theory_id}",
            "literature_id": literature_id,
            "citation_key": record.get("citation_key"),
            "claim_tag": record.get("claim_tag"),
            "open_question_ids": list(record.get("open_question_ids") or []),
            "campaign_preset": "testbed_review",
        }


def iter_testbed_review_literature_cases() -> Iterator[Dict[str, Any]]:
    """Three full-pipeline literature anchors (not a cartesian)."""
    records = _records_by_id()
    for literature_id in ANCHOR_LITERATURE_IDS:
        record = records.get(literature_id)
        if record is None:
            continue
        yield {
            "temperature": float(record.get("temperature_k") or 300.0),
            "loading_ratio": float(record.get("loading_ratio") or 0.90),
            "host_material": str(record.get("material") or "palladium"),
            "reactant": str(record.get("reactant") or "deuterium"),
            "rate_mode": "two_body",
            "use_theory_pipeline": True,
            "tag": f"testbed_review:literature:{literature_id}",
            "literature_id": literature_id,
            "citation_key": record.get("citation_key"),
            "claim_tag": record.get("claim_tag"),
            "open_question_ids": list(record.get("open_question_ids") or []),
            "campaign_preset": "testbed_review",
        }


def iter_testbed_review_cases() -> Iterator[Dict[str, Any]]:
    yield from iter_testbed_review_isolated_cases()
    yield from iter_testbed_review_literature_cases()


def testbed_review_count() -> int:
    return sum(1 for _ in iter_testbed_review_cases())


def testbed_review_axes() -> Dict[str, List[Any]]:
    return {
        "isolated_theory_ids": list(get_default_pipeline().registered_ids),
        "literature_ids": list(ANCHOR_LITERATURE_IDS),
    }
