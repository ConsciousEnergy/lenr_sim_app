"""Detector / weak-oriented scenario cells (model-output only).

Designed cells for Cd-ratio / detector UL (RAD), moderator-null style nulls,
and weak EC-threshold stress. Not a cartesian. Does not prove LENR.
EQ-OPEN-* stay OPEN. Weights remain Approximate scenario aids.
"""

from __future__ import annotations

from typing import Any, Dict, Iterator, List, Tuple

from app.data.dataset_io import literature_records

# Detector UL / Cd-ratio style (RAD stress) + contested sonofusion neutron claim.
DETECTOR_LITERATURE_IDS: Tuple[str, ...] = (
    "spawar-cr39-2007",
    "spawar-dpf-2009",
    "taleyarkhan-sonofusion-2002",
)

# Weak / EC threshold path (Widom–Larsen contested).
WEAK_EC_LITERATURE_ID = "safire-plasma-2020"
WEAK_EC_THEORY = "widom_larsen"

# Moderator-null style control (ARPA-E null heat).
MODERATOR_NULL_LITERATURE_ID = "berlinguette-arpa-e-2019"

TEMPERATURES: Tuple[float, ...] = (300.0, 350.0)
LOADING_RATIOS: Tuple[float, ...] = (0.85, 0.95)


def _records_by_id() -> Dict[str, Dict[str, Any]]:
    return {str(row["literature_id"]): row for row in literature_records()}


def _base_case(
    record: Dict[str, Any],
    *,
    temperature: float,
    loading: float,
    tag: str,
    open_question_ids: List[str],
    enabled_theories: List[str] | None = None,
) -> Dict[str, Any]:
    case: Dict[str, Any] = {
        "temperature": float(temperature),
        "loading_ratio": float(loading),
        "host_material": str(record.get("material") or "palladium"),
        "reactant": str(record.get("reactant") or "deuterium"),
        "rate_mode": "two_body",
        "use_theory_pipeline": True,
        "tag": tag,
        "literature_id": str(record["literature_id"]),
        "citation_key": record.get("citation_key"),
        "claim_tag": record.get("claim_tag"),
        "open_question_ids": list(open_question_ids),
        "campaign_preset": "detector_weak_screen",
        "scenario_kind": "scenario_table_not_posterior",
        "lenr_proved": False,
    }
    if enabled_theories is not None:
        case["enabled_theories"] = list(enabled_theories)
    return case


def iter_detector_weak_screen_cases() -> Iterator[Dict[str, Any]]:
    """Yield designed detector / weak / null cells (~dozen model-output rows)."""
    records = _records_by_id()

    for literature_id in DETECTOR_LITERATURE_IDS:
        record = records.get(literature_id)
        if record is None:
            continue
        open_ids = list(record.get("open_question_ids") or ["EQ-OPEN-RAD-01"])
        for temperature in TEMPERATURES:
            for loading in LOADING_RATIOS:
                yield _base_case(
                    record,
                    temperature=temperature,
                    loading=loading,
                    tag=(
                        f"detector_weak_screen:detector_cd_ratio:"
                        f"{literature_id}:T{int(temperature)}:L{loading:.2f}"
                    ),
                    open_question_ids=open_ids,
                )

    safire = records.get(WEAK_EC_LITERATURE_ID)
    if safire is not None:
        for temperature in TEMPERATURES:
            yield _base_case(
                safire,
                temperature=temperature,
                loading=0.90,
                tag=(
                    f"detector_weak_screen:weak_ec_threshold:"
                    f"{WEAK_EC_LITERATURE_ID}:T{int(temperature)}:{WEAK_EC_THEORY}"
                ),
                open_question_ids=["EQ-OPEN-EC-01"],
                enabled_theories=[WEAK_EC_THEORY],
            )

    arpa = records.get(MODERATOR_NULL_LITERATURE_ID)
    if arpa is not None:
        yield _base_case(
            arpa,
            temperature=300.0,
            loading=0.90,
            tag=(
                f"detector_weak_screen:moderator_null:"
                f"{MODERATOR_NULL_LITERATURE_ID}:T300"
            ),
            open_question_ids=["EQ-OPEN-RAD-01", "EQ-OPEN-YIELD-01"],
        )


def detector_weak_screen_count() -> int:
    return sum(1 for _ in iter_detector_weak_screen_cases())


def detector_weak_screen_axes() -> Dict[str, List[Any]]:
    return {
        "temperatures": list(TEMPERATURES),
        "loading_ratios": list(LOADING_RATIOS),
        "detector_literature_ids": list(DETECTOR_LITERATURE_IDS),
        "weak_ec_literature_id": WEAK_EC_LITERATURE_ID,
        "moderator_null_literature_id": MODERATOR_NULL_LITERATURE_ID,
    }
