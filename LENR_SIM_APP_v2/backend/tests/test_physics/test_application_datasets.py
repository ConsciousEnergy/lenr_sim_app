"""Versioned application datasets: baselines, screening, Parkhomov, open questions."""

from __future__ import annotations

from app.data.baseline_experiments import get_baseline_experiments
from app.data.dataset_io import (
    SCHEMA,
    literature_records,
    open_question_register,
    parkhomov_curated,
    screening_priors,
    stable_baseline_id,
    testable_predictions,
)
from app.physics_engine.parkhomov_validation import validate_transmutation
from app.physics_engine.unified_lenr_model.screening_data import (
    ADIABATIC_LIMIT_EV,
    get_screening_potential,
)


def test_literature_baselines_have_stable_ids_and_claim_tags() -> None:
    records = literature_records()
    assert len(records) == 16
    experiments = get_baseline_experiments()
    assert len(experiments) == 16
    ids = {row["id"] for row in experiments}
    assert len(ids) == 16
    assert all(len(row["id"]) == 36 for row in experiments)
    arpa = next(row for row in experiments if "ARPA-E" in row["name"])
    assert arpa["claim_tag"] == "null"
    assert float(arpa["excess_heat_watts"]) == 0.0
    assert arpa["id"] == stable_baseline_id("berlinguette-arpa-e-2019")
    assert get_baseline_experiments()[0]["id"] == experiments[0]["id"]
    tagged = {row["claim_tag"] for row in records}
    assert {"EMP", "null", "disputed", "contested", "speculative"} <= tagged


def test_screening_priors_match_legacy_typical_values() -> None:
    payload = screening_priors()
    assert payload["schema"] == SCHEMA
    assert float(payload["adiabatic_limit_eV"]) == ADIABATIC_LIMIT_EV
    assert get_screening_potential("palladium") == 800.0
    assert get_screening_potential("erbium") == 347.0
    materials = {row["material"] for row in payload["materials"]}
    assert materials == {"palladium", "nickel", "titanium", "erbium", "lithium"}


def test_parkhomov_curated_does_not_claim_full_database() -> None:
    payload = parkhomov_curated()
    assert "not shipped" in payload["disclaimer"].lower()
    assert len(payload["reactions"]) >= 25
    result = validate_transmutation([("D", 2), ("D", 2)], [("He", 4)])
    assert result["parkhomov_match"] == "exact"
    assert result["table_version"] == "v0.3.6-beta-curated-subset"


def test_open_questions_remain_open() -> None:
    questions = open_question_register()["questions"]
    assert len(questions) == 5
    assert {row["id"] for row in questions} == {
        "EQ-OPEN-MEV-01",
        "EQ-OPEN-RAD-01",
        "EQ-OPEN-RATE-01",
        "EQ-OPEN-EC-01",
        "EQ-OPEN-YIELD-01",
    }
    assert all(row["status"] == "OPEN" for row in questions)


def test_testable_predictions_cover_seven_falsifiers() -> None:
    preds = testable_predictions()["predictions"]
    assert [row["id"] for row in preds] == [
        "PRED-01",
        "PRED-02",
        "PRED-03",
        "PRED-04",
        "PRED-05",
        "PRED-06",
        "PRED-07",
    ]
    assert all(row.get("falsifier") for row in preds)
