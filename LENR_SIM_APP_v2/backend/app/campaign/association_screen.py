"""Designed association-screen campaign (not a cartesian of every axis).

Anchors: Miles 1993, one Pd-D heat cell (McKubre SRI), ARPA-E null.
T in {280, 300, 350} K and loading in {0.85, 0.95}. Pipeline on.
Model output only. Does not prove LENR. EQ-OPEN-* stay OPEN.
"""

from __future__ import annotations

from typing import Any, Dict, Iterator, List, Tuple

from app.data.dataset_io import literature_records

ANCHOR_LITERATURE_IDS: Tuple[str, ...] = (
    "miles-1993",
    "mckubre-sri-p13-p14-1992",
    "berlinguette-arpa-e-2019",
)
TEMPERATURES: Tuple[float, ...] = (280.0, 300.0, 350.0)
LOADING_RATIOS: Tuple[float, ...] = (0.85, 0.95)


def _records_by_id() -> Dict[str, Dict[str, Any]]:
    return {str(row["literature_id"]): row for row in literature_records()}


def iter_association_screen_cases() -> Iterator[Dict[str, Any]]:
    """Yield ~18 designed unified cells (3 anchors × 3 T × 2 loading)."""
    records = _records_by_id()
    for literature_id in ANCHOR_LITERATURE_IDS:
        record = records.get(literature_id)
        if record is None:
            continue
        host = str(record.get("material") or "palladium")
        reactant = str(record.get("reactant") or "deuterium")
        claim_tag = record.get("claim_tag")
        citation_key = record.get("citation_key")
        open_ids = list(record.get("open_question_ids") or [])
        for temperature in TEMPERATURES:
            for loading in LOADING_RATIOS:
                yield {
                    "temperature": float(temperature),
                    "loading_ratio": float(loading),
                    "host_material": host,
                    "reactant": reactant,
                    "rate_mode": "two_body",
                    "use_theory_pipeline": True,
                    "tag": (
                        f"association_screen:{literature_id}:"
                        f"T{int(temperature)}:L{loading:.2f}"
                    ),
                    "literature_id": literature_id,
                    "citation_key": citation_key,
                    "claim_tag": claim_tag,
                    "open_question_ids": open_ids,
                    "campaign_preset": "association_screen",
                }


def association_screen_count() -> int:
    return sum(1 for _ in iter_association_screen_cases())


def association_screen_axes() -> Dict[str, List[Any]]:
    return {
        "temperatures": list(TEMPERATURES),
        "loading_ratios": list(LOADING_RATIOS),
        "literature_ids": list(ANCHOR_LITERATURE_IDS),
    }
