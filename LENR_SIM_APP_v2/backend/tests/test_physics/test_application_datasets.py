"""Versioned application datasets: baselines, screening, Parkhomov, open questions."""

from __future__ import annotations

from app.data.baseline_experiments import get_baseline_experiments
from app.data.dataset_io import (
    SCHEMA,
    exploratory_moe_literature_records,
    iccf27_literature_records,
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
    assert len(records) == 19
    experiments = get_baseline_experiments()
    assert len(experiments) == 19
    ids = {row["id"] for row in experiments}
    assert len(ids) == 19
    assert all(len(row["id"]) == 36 for row in experiments)
    arpa = next(row for row in experiments if "ARPA-E" in row["name"])
    assert arpa["claim_tag"] == "null"
    assert float(arpa["excess_heat_watts"]) == 0.0
    assert arpa["id"] == stable_baseline_id("berlinguette-arpa-e-2019")
    miles = next(row for row in experiments if row["literature_id"] == "miles-1993")
    assert miles["claim_tag"] == "EMP"
    assert miles["citation_key"] == "miles1993"
    assert float(miles["excess_heat_watts"]) == 1.0
    assert miles["id"] == stable_baseline_id("miles-1993")
    assert miles["parameters"]["literature_id"] == "miles-1993"
    assert miles["parameters"]["open_question_ids"] == [
        "EQ-OPEN-YIELD-01",
        "EQ-OPEN-RAD-01",
    ]
    assert get_baseline_experiments()[0]["id"] == experiments[0]["id"]
    tagged = {row["claim_tag"] for row in records}
    
    pyy = next(row for row in experiments if row["literature_id"] == "pyyhtia-cr39-cavitation-2026")
    assert pyy["claim_tag"] == "contested"
    assert pyy["citation_key"] == "pyyhtia2026"
    assert pyy["doi"] == "10.1016/j.jelechem.2026.120104"
    assert pyy["open_question_ids"] == ["EQ-OPEN-RAD-01"]

    assert {"EMP", "null", "disputed", "contested", "speculative"} <= tagged


# Rows with a first-class literature-reported (or instrument-precision) sigma_Q_W.
_HYDRATED_SIGMA_Q_IDS = frozenset(
    {
        "miles-1993",
        "deninno-tid-1995",
    }
)


def test_cite_gated_moe_fields_are_literature_reported_only() -> None:
    """Hydrated σ_Q must carry provenance; never invent MoE or flip claim honesty."""
    experiments = {row["literature_id"]: row for row in get_baseline_experiments()}
    miles = experiments["miles-1993"]
    assert float(miles["sigma_Q_W"]) == 0.02
    # Follow-on calorimetric error — exploratory instrument precision, NOT
    # discovery-eligible literature_reported (peak+σ pairing unverified).
    assert miles["moe_provenance"] == "literature_reported_instrument_precision"
    assert "miles1993" in miles["moe_citation_keys"]
    assert "miles_calorimetric_error_followon" in miles["moe_citation_keys"]
    assert miles["claim_tag"] == "EMP"
    assert "EQ-OPEN-YIELD-01" in miles["open_question_ids"]
    # Seed path persists MoE via parameters_json
    assert float(miles["parameters"]["sigma_Q_W"]) == 0.02
    assert miles["parameters"]["moe_provenance"] == (
        "literature_reported_instrument_precision"
    )

    # McKubre: instrument floor only — do not publish floor as measured sigma_Q_W
    for lit_id in ("mckubre-sri-p13-p14-1992", "mckubre-high-loading-1998"):
        mckubre = experiments[lit_id]
        assert "sigma_Q_W" not in mckubre
        assert "sigma_Q_W" not in mckubre["parameters"]
        assert float(mckubre["sigma_Q_instrument_floor_W"]) == 0.01
        assert float(mckubre["sigma_Q_relative_fraction"]) == 0.001
        assert mckubre["moe_provenance"] == "literature_reported_instrument_floor"
        assert float(mckubre["parameters"]["sigma_Q_instrument_floor_W"]) == 0.01
        assert mckubre["claim_tag"] == "EMP"

    deninno = experiments["deninno-tid-1995"]
    assert float(deninno["sigma_Q_W"]) == 0.02
    assert deninno["moe_provenance"] == "literature_reported_instrument_precision"
    assert float(deninno["parameters"]["sigma_Q_W"]) == 0.02

    # Every baseline outside the hydrated sigma_Q set must lack fabricated sigma_Q_W
    for lit_id, row in experiments.items():
        if lit_id in _HYDRATED_SIGMA_Q_IDS:
            continue
        assert "sigma_Q_W" not in row, f"unexpected sigma_Q_W on {lit_id}"
        assert "sigma_Q_W" not in (row.get("parameters") or {}), lit_id

    kasagi_rows = [
        row
        for row in iccf27_literature_records()
        if row["literature_id"].startswith("kasagi-")
    ]
    assert len(kasagi_rows) == 2
    for row in kasagi_rows:
        assert float(row["sigma_Q_W"]) == 0.08
        assert row["moe_provenance"] == "literature_reported"
        assert row["claim_tag"] == "EMP"

    questions = open_question_register()["questions"]
    assert all(row["status"] == "OPEN" for row in questions)


def test_moe_fields_are_copied_into_seed_parameters() -> None:
    """seed_database persists extras only via parameters/results — MoE must be in parameters."""
    miles = next(
        row
        for row in get_baseline_experiments()
        if row["literature_id"] == "miles-1993"
    )
    params = miles["parameters"]
    assert params["sigma_Q_W"] == miles["sigma_Q_W"]
    assert params["moe_provenance"] == miles["moe_provenance"]
    assert params["moe_citation_keys"] == miles["moe_citation_keys"]
    assert "moe_notes" in params

    mckubre = next(
        row
        for row in get_baseline_experiments()
        if row["literature_id"] == "mckubre-sri-p13-p14-1992"
    )
    assert "sigma_Q_W" not in mckubre["parameters"]
    assert mckubre["parameters"]["sigma_Q_instrument_floor_W"] == 0.01
    assert mckubre["parameters"]["sigma_Q_relative_fraction"] == 0.001
    assert mckubre["parameters"]["moe_provenance"] == (
        "literature_reported_instrument_floor"
    )


def test_screening_priors_match_legacy_typical_values() -> None:
    payload = screening_priors()
    assert payload["schema"] == SCHEMA
    assert float(payload["adiabatic_limit_eV"]) == ADIABATIC_LIMIT_EV
    assert get_screening_potential("palladium") == 800.0
    assert get_screening_potential("erbium") == 347.0
    materials = {row["material"] for row in payload["materials"]}
    assert {"palladium", "nickel", "titanium", "erbium", "lithium"} <= materials
    assert {"graphite", "silicon_carbide", "zirconium", "iridium"} <= materials
    assert get_screening_potential("zirconium") == 120.0
    assert get_screening_potential("graphite") == 80.0


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
    by_id = {row["id"]: row for row in questions}
    assert "czerski2024a" in by_id["EQ-OPEN-RATE-01"]["citation_keys"]
    assert "kasagi2026" in by_id["EQ-OPEN-YIELD-01"]["citation_keys"]
    assert "hylenr2026" in by_id["EQ-OPEN-RAD-01"]["citation_keys"]
    assert "PRED-02" in by_id["EQ-OPEN-RATE-01"]["testable_prediction_ids"]


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
        "PRED-08",
        "PRED-09",
        "PRED-10",
    ]
    assert all(row.get("falsifier") for row in preds)
    pred03 = next(row for row in preds if row["id"] == "PRED-03")
    assert "hylenr2026" in pred03["citation_keys"]
    pred07 = next(row for row in preds if row["id"] == "PRED-07")
    assert "hylenr2026" in pred07["citation_keys"]
    pred08 = next(row for row in preds if row["id"] == "PRED-08")
    assert "parkhomov2018" in pred08["citation_keys"]
    assert "Cd" in pred08["title"] or "Cd" in pred08["falsifier"]


def test_iccf27_extension_does_not_mutate_locked_baselines() -> None:
    records = iccf27_literature_records()
    assert len(records) == 6
    ids = {row["literature_id"] for row in records}
    assert "kasagi-nicu-radiant-2026" in ids
    assert "czerski-thermal-spike-zr-2024" in ids
    kasagi = next(row for row in records if row["literature_id"] == "kasagi-nicu-radiant-2026")
    assert kasagi["claim_tag"] == "EMP"
    assert kasagi["citation_key"] == "kasagi2026"
    hylenr = next(row for row in records if row["literature_id"] == "hylenr-tamu-phase1-2026")
    assert hylenr["claim_tag"] == "contested"
    assert literature_records()[0]["literature_id"] != "kasagi-nicu-radiant-2026"


def test_celani_exploratory_moe_companion_stays_non_baseline() -> None:
    """BDS-360: Celani exploratory hydrate does not mutate locked 19 baselines."""
    records = exploratory_moe_literature_records()
    assert len(records) >= 1
    celani = next(
        row for row in records if row["literature_id"] == "celani-constantan-2019"
    )
    assert celani["claim_tag"] == "contested"
    assert celani["citation_key"] == "celani2019"
    assert celani["doi"] == "10.70923/001c.72494"
    assert celani["moe_provenance"] == "literature_reported_instrument_precision"
    assert float(celani["sigma_Q_W"]) == 2.0
    assert celani.get("moe_sigma_q_pairing_verified") is False
    notes = str(celani.get("moe_notes") or "")
    assert "10.70923/001c.72341" in notes
    assert "valat2015" in notes
    assert "lower confidence" in notes
    assert "greenyer_*" in notes or "mfmp_*" in notes
    assert len(literature_records()) == 19
    assert all(
        row["literature_id"] != "celani-constantan-2019" for row in literature_records()
    )
