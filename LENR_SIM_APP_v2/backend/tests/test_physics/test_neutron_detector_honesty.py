"""WS3: neutron detector UL honesty + PRED Cd/moderator/soft-X falsifiers."""

from __future__ import annotations

import pytest

from app.data.dataset_io import (
    literature_records,
    open_question_register,
    parkhomov_curated,
    testable_predictions,
)
from app.physics_engine.many_body.branching_model import (
    BRANCHING_INCONSISTENT_WITH_NEUTRON_INTERPRETATION,
    DETECTOR_UL_HONESTY_CLASS,
    branching_inconsistent_with_neutron_interpretation,
    branching_inconsistent_with_neutron_ul,
    cd_ratio,
    detector_neutron_ul_log10,
    moderator_null_ratio,
    neutron_rate_bound_payload,
)
from app.physics_engine.open_questions import build_open_questions
from app.physics_engine.parkhomov_validation import (
    list_detector_gas_speculative_rows,
    validate_transmutation,
)
from app.physics_engine.scientific_guardrails import build_observables_bridge


def test_neutron_ul_honesty_class_parallels_gamma() -> None:
    bound = neutron_rate_bound_payload()
    assert bound["proxy_not_computed"] is True
    assert bound["honesty_class"] == DETECTOR_UL_HONESTY_CLASS
    assert bound["not_neutron_proof"] is True
    assert bound["value"] == 0.0

    wired = neutron_rate_bound_payload(
        neutron_cps_ul=0.1,
        neutron_efficiency=0.5,
        live_time_s=3600.0,
    )
    assert wired["proxy_not_computed"] is False
    assert wired["honesty_class"] == DETECTOR_UL_HONESTY_CLASS
    assert wired["value"] == 0.2
    assert wired["not_neutron_proof"] is True


def test_detector_neutron_ul_log10_and_branch_gate() -> None:
    ul = detector_neutron_ul_log10(1e-6, 1.0, 1e6)
    assert ul is not None
    assert ul == -12.0
    # log10(1e-13) = -13 < UL -12 → consistent; 1e-11 exceeds UL.
    assert branching_inconsistent_with_neutron_ul(1e-13, ul) is False
    assert branching_inconsistent_with_neutron_ul(1e-11, ul) is True


def test_cd_ratio_and_moderator_null_helpers() -> None:
    assert cd_ratio(9.1, 1.1) == pytest.approx(9.1 / 1.1)
    assert cd_ratio(9.1, 0.0) is None
    assert moderator_null_ratio(1.0, 2.0) == 0.5
    assert moderator_null_ratio(2.0, 1.0) == 2.0


def test_multi_messenger_neutron_interpretation_falsifier() -> None:
    assert (
        branching_inconsistent_with_neutron_interpretation(
            soft_x_present=True,
            hard_gamma_absent=True,
            cd_wrapped_cps=10.0,
            cd_ratio_value=1.2,
        )
        is True
    )
    assert (
        branching_inconsistent_with_neutron_interpretation(
            soft_x_present=False,
            hard_gamma_absent=True,
            cd_wrapped_cps=0.01,
            cd_ratio_value=10.0,
            moderator_ratio=2.0,
        )
        is False
    )
    assert (
        branching_inconsistent_with_neutron_interpretation(
            soft_x_present=True,
            moderator_ratio=0.3,
            cd_wrapped_cps=2.0,
        )
        is True
    )


def test_observables_bridge_gates_neutron_rate_bound() -> None:
    bridge = build_observables_bridge(
        total_energy_watts=1.0,
        expected_he4_rate_per_s=2.63e11,
    )
    n_bound = bridge["neutron_rate_bound"]
    assert n_bound["honesty_class"] == DETECTOR_UL_HONESTY_CLASS
    assert n_bound["proxy_not_computed"] is True
    assert n_bound["not_neutron_proof"] is True
    assert bridge["gamma_rate_bound"]["honesty_class"] == DETECTOR_UL_HONESTY_CLASS

    wired = build_observables_bridge(
        total_energy_watts=1.0,
        expected_he4_rate_per_s=2.63e11,
        neutron_cps_ul=0.05,
        neutron_efficiency=0.25,
    )
    assert wired["neutron_rate_bound"]["proxy_not_computed"] is False
    assert wired["neutron_rate_bound"]["value"] == 0.2


def test_open_questions_surfaces_neutron_interpretation_flag() -> None:
    block = build_open_questions(
        route_mode="legacy_unified_model",
        observations={
            "soft_x_present": True,
            "hard_gamma_absent": True,
            "neutron_bare_cps": 2.0,
            "neutron_cd_cps": 5.0,
            "neutron_with_moderator_cps": 1.0,
            "neutron_cps_ul": 1e-3,
            "neutron_efficiency": 1.0,
            "he4_atoms_per_s": 1e6,
        },
    )
    q_rad = block["q_radiation"]
    assert q_rad["status"] == "OPEN"
    assert q_rad["detector_ul_honesty_class"] == DETECTOR_UL_HONESTY_CLASS
    assert q_rad["cd_ratio"] == pytest.approx(0.4)
    assert q_rad["moderator_null_ratio"] == pytest.approx(0.5)
    assert q_rad["branching_inconsistent_with_neutron_interpretation"] is True
    assert (
        q_rad["neutron_interpretation_status"]
        == BRANCHING_INCONSISTENT_WITH_NEUTRON_INTERPRETATION
    )
    assert block["lenr_proved"] is False
    assert "EQ-OPEN-RAD-01" in block["open_ids"]


def test_pred_falsifiers_include_cd_moderator_soft_x() -> None:
    preds = {row["id"]: row for row in testable_predictions()["predictions"]}
    assert "PRED-08" in preds
    assert "PRED-09" in preds
    assert "PRED-10" in preds
    pred02 = preds["PRED-02"]
    assert "q_radiation.cd_ratio" in pred02["virtual_lab_fields"]
    assert "Cd-wrap" in pred02["falsifier"] or "Cd-wrapped" in pred02["falsifier"]
    assert "parkhomov2018" in pred02["citation_keys"]
    assert "BRANCHING_INCONSISTENT_WITH_NEUTRON_INTERPRETATION" in preds["PRED-10"][
        "falsifier"
    ]


def test_rad_register_still_missing_neutron_detector_interpretation() -> None:
    rad = next(
        row
        for row in open_question_register()["questions"]
        if row["id"] == "EQ-OPEN-RAD-01"
    )
    assert rad["status"] == "OPEN"
    assert "neutron-detector interpretation" in rad["still_missing"]
    assert "PRED-08" in rad["testable_prediction_ids"]
    assert "parkhomov2018" in rad["citation_keys"]


def test_parkhomov_detector_gas_spec_excluded_from_production_match() -> None:
    payload = parkhomov_curated()
    spec_rows = [
        row
        for row in payload["reactions"]
        if row.get("category") == "detector_gas_speculative"
    ]
    assert len(spec_rows) >= 2
    assert all(row.get("feeds_production_rate") is False for row in spec_rows)
    assert all(row.get("neutrino") == "anti-nu" for row in spec_rows)
    assert all(
        row.get("claim_tier") == "speculative_exploratory" for row in spec_rows
    )
    result = validate_transmutation(
        [("He", 3), ("He", 3), ("e", 0)],
        [("D", 2), ("He", 4)],
    )
    assert result["parkhomov_match"] == "none"
    listed = list_detector_gas_speculative_rows()
    assert len(listed) >= 2
    assert all(not row["feeds_production_rate"] for row in listed)


def test_literature_baseline_parkhomov_cd_wrap_contested() -> None:
    records = literature_records()
    row = next(
        r
        for r in records
        if r["literature_id"] == "parkhomov-cd-wrapped-snm14-contested"
    )
    assert row["claim_tag"] == "contested"
    assert "EQ-OPEN-RAD-01" in row["open_question_ids"]
    assert row["parameters"]["not_eq_open_discharge"] is True
    note = row["results"]["note"].lower()
    assert "not" in note or "never" in note
