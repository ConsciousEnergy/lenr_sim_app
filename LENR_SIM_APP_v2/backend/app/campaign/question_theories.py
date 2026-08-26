"""Designed Q-anchored theory slices (not a cartesian of cells × theories).

Each case is one isolated theory at one literature cell tagged to Q1–Q5,
plus ARPA-E null representatives per composition group.
Does not prove LENR. EQ-OPEN-* stay OPEN.
"""

from __future__ import annotations

from typing import Any, Dict, Iterator, List, Optional, Tuple

from app.data.dataset_io import literature_records

NULL_LITERATURE_ID = "berlinguette-arpa-e-2019"

# One isolated theory run per (literature_id, theory_id). Duplicate
# (Miles × miles_heat_helium on Q2 and Q5) is collapsed.
QUESTION_THEORY_SLICES: List[Dict[str, Any]] = [
    {
        "open_question_id": "EQ-OPEN-MEV-01",
        "literature_ids": [
            "iwamura-cs-pr-2002",
            "iwamura-sr-mo-2006",
            "hagelstein-phonon-2010",
        ],
        "theories": [
            "hagelstein_phonon",
            "phonon_coupling_legacy",
            "iwamura_transmutation",
        ],
    },
    {
        "open_question_id": "EQ-OPEN-RAD-01",
        "literature_ids": [
            "spawar-cr39-2007",
            "spawar-dpf-2009",
            "miles-1993",
        ],
        "theories": ["hagelstein_phonon", "miles_heat_helium"],
    },
    {
        "open_question_id": "EQ-OPEN-RATE-01",
        "literature_ids": [
            "brillouin-ni-h-2012",
            "clean-planet-ni-cu-2018",
            "chubb-lattice-tunneling-2004",
        ],
        "theories": ["takahashi_tsc", "piantelli_ni_h", "chubb_ion_band"],
    },
    {
        "open_question_id": "EQ-OPEN-EC-01",
        "literature_ids": ["safire-plasma-2020"],
        "theories": ["widom_larsen"],
    },
    {
        "open_question_id": "EQ-OPEN-YIELD-01",
        "literature_ids": [
            "mckubre-sri-p13-p14-1992",
            "mckubre-high-loading-1998",
            "deninno-tid-1995",
            "miles-1993",
        ],
        "theories": ["miles_heat_helium", "non_equilibrium_thermo"],
    },
]


def _records_by_id() -> Dict[str, Dict[str, Any]]:
    return {str(row["literature_id"]): row for row in literature_records()}


def _case_from_record(
    record: Dict[str, Any],
    *,
    theory_id: str,
    open_question_id: Optional[str],
    tag: str,
) -> Dict[str, Any]:
    loading = record.get("loading_ratio")
    open_ids = [open_question_id] if open_question_id else []
    return {
        "temperature": float(record.get("temperature_k") or 300.0),
        "loading_ratio": float(loading if loading is not None else 0.9),
        "host_material": str(record.get("material") or "palladium"),
        "reactant": str(record.get("reactant") or "deuterium"),
        "rate_mode": "two_body",
        "use_theory_pipeline": True,
        "enabled_theories": [theory_id],
        "tag": tag,
        "literature_id": str(record["literature_id"]),
        "citation_key": record.get("citation_key"),
        "claim_tag": record.get("claim_tag"),
        "open_question_ids": open_ids,
    }


def iter_question_theories_cases() -> Iterator[Dict[str, Any]]:
    """Yield isolated theory runs at Q-tagged literature cells plus ARPA-E nulls."""
    records = _records_by_id()
    seen: set[Tuple[str, str]] = set()
    for slice_spec in QUESTION_THEORY_SLICES:
        qid = str(slice_spec["open_question_id"])
        for literature_id in slice_spec["literature_ids"]:
            record = records.get(str(literature_id))
            if record is None:
                continue
            for theory_id in slice_spec["theories"]:
                key = (str(literature_id), str(theory_id))
                if key in seen:
                    continue
                seen.add(key)
                yield _case_from_record(
                    record,
                    theory_id=str(theory_id),
                    open_question_id=qid,
                    tag=f"question_theories:{qid}:{literature_id}:{theory_id}",
                )

    arpa = records.get(NULL_LITERATURE_ID)
    if arpa is None:
        return
    from app.campaign.grid import theory_group_representatives

    for group, theory_id in theory_group_representatives().items():
        key = (NULL_LITERATURE_ID, theory_id)
        if key in seen:
            continue
        seen.add(key)
        case = _case_from_record(
            arpa,
            theory_id=theory_id,
            open_question_id=None,
            tag=f"question_theories:null:{group}:{theory_id}",
        )
        case["composition_group"] = group
        yield case


def question_theories_count() -> int:
    return sum(1 for _ in iter_question_theories_cases())
