"""Unit tests: completion vs scientific outcome labels."""

from app.data.baseline_experiments import get_baseline_experiments
from app.services.scientific_outcomes import (
    OUTCOME_FAILED,
    OUTCOME_INAPPLICABLE,
    OUTCOME_NULL,
    OUTCOME_POSITIVE,
    classify_experiment,
    classify_scientific_outcome,
)


def test_arpa_e_seed_is_scientific_null() -> None:
    arpa = next(
        row
        for row in get_baseline_experiments()
        if "ARPA-E" in row["name"] or "Google" in row["name"]
    )
    assert arpa["status"] == "completed"
    assert float(arpa["excess_heat_watts"]) == 0.0
    assert (
        classify_scientific_outcome(
            status=arpa["status"],
            excess_heat_watts=arpa["excess_heat_watts"],
            results=arpa.get("results"),
        )
        == OUTCOME_NULL
    )
    assert classify_experiment(arpa) == OUTCOME_NULL


def test_failed_status_is_failed_even_with_heat() -> None:
    assert (
        classify_scientific_outcome(
            status="failed",
            excess_heat_watts=12.0,
        )
        == OUTCOME_FAILED
    )


def test_all_inapplicable_theories_are_inapplicable() -> None:
    assert (
        classify_scientific_outcome(
            status="completed",
            excess_heat_watts=0.0,
            pipeline_scores={
                "electron_screening": {"is_applicable": False, "claim_tier": "speculative"},
                "hagelstein_phonon": {"is_applicable": False, "claim_tier": "speculative"},
            },
        )
        == OUTCOME_INAPPLICABLE
    )


def test_excess_heat_above_zero_is_positive() -> None:
    assert (
        classify_scientific_outcome(
            status="completed",
            excess_heat_watts=0.4,
        )
        == OUTCOME_POSITIVE
    )


def test_enhancement_only_is_null() -> None:
    assert (
        classify_scientific_outcome(
            status="completed",
            excess_heat_watts=0.0,
            results={"enhancement_factor": 1.0e6, "pipeline_scores": {}},
        )
        == OUTCOME_NULL
    )
