"""Unit tests for the open-questions cockpit builder and decision oracle."""
from __future__ import annotations

from app.physics_engine.constants import MAX_ENHANCEMENT_FACTOR
from app.physics_engine.decision_oracle import (
    FORBIDDEN_STATUS,
    TWO_BODY_LOG10_N_EVENTS,
    evaluate_determination,
    miles_q_mev,
)
from app.physics_engine.open_questions import (
    build_open_questions,
    safe_build_open_questions,
)


def test_two_body_log10_n_events_is_minus_forty() -> None:
    assert TWO_BODY_LOG10_N_EVENTS == -40.0
    block = build_open_questions(route_mode="legacy_unified_model", rate_mode="two_body")
    assert block["q_statistical"]["n_events_log10_two_body"] == -40.0
    assert block["determination"]["status"] == "RATE_BUDGET_DOES_NOT_CLOSE"
    assert block["determination"]["oracle_a"]["two_body_budget_closes"] is False


def test_lenr_proved_never_emitted() -> None:
    block = build_open_questions(route_mode="legacy_unified_model")
    assert block["lenr_proved"] is False
    dumped = str(block)
    for forbidden in FORBIDDEN_STATUS:
        assert forbidden not in dumped
    assert "LENR_PROVED" not in dumped


def test_illegal_product_is_pedagogy_only() -> None:
    block = build_open_questions(
        route_mode="theory_pipeline",
        pipeline_combined_enhancement=MAX_ENHANCEMENT_FACTOR,
        bubble_peak_enhancement=MAX_ENHANCEMENT_FACTOR,
    )
    assert block["composition"]["not_combinable"] is True
    assert block["composition"]["illegal_product"] == MAX_ENHANCEMENT_FACTOR ** 2
    assert "not physical" in block["composition"]["illegal_product_label"]
    # The illegal product is never a rate or enhancement of the payload.
    assert block["composition"]["pipeline_combined_enhancement"] == MAX_ENHANCEMENT_FACTOR
    assert block["composition"]["bubble_peak_enhancement"] == MAX_ENHANCEMENT_FACTOR


def test_energy_partition_leaves_open_remainder() -> None:
    block = build_open_questions(route_mode="legacy_unified_model")
    part = block["q_mev_gap"]["energy_partition_mev"]
    assert part["open_remainder"] > 0
    assert part["open_remainder"] + part["phonon"] + part["gamma"] + part["recoil"] == part["q_total"]
    assert block["q_mev_gap"]["status"] == "OPEN"
    assert block["q_radiation"]["status"] == "OPEN"


def test_local_fallback_is_inconclusive_without_emp_chips() -> None:
    block = build_open_questions(route_mode="local_fallback")
    assert block["determination"]["status"] == "INCONCLUSIVE"
    assert block["emp_chips"] == []
    assert block["determination"]["oracle_emp"]["evaluated"] is False


def test_miles_q_identity_near_23_8() -> None:
    q = miles_q_mev(1.0, 2.63e11)
    assert q is not None
    assert 23.0 < q < 24.5


def test_trapped_state_without_lab_is_prior_sensitive() -> None:
    det = evaluate_determination(rate_mode="trapped_state")
    assert det["status"] == "PRIOR_SENSITIVE_SPEC"
    assert det["oracle_b"]["engine_fusion_probability_is_not_the_prior"] is True
    hyps = {row["id"] for row in det["oracle_b"]["hypotheses"]}
    assert hyps == {"chemical_null", "two_body", "trapped_state", "three_body"}


def test_safe_builder_never_raises() -> None:
    # Invalid types still return a dict (empty on catastrophic failure).
    out = safe_build_open_questions(route_mode="legacy_unified_model", rate_mode="two_body")
    assert isinstance(out, dict)
    assert out.get("schema") == "lenr-open-questions-v1"


def test_tsc_leak_flag_when_module_enabled_on_two_body() -> None:
    block = build_open_questions(
        route_mode="theory_pipeline",
        rate_mode="two_body",
        enabled_theories=["takahashi_tsc", "electron_screening"],
        pipeline_combined_enhancement=10.0,
    )
    assert block["composition"]["tsc_enhancement_can_scale_two_body"] is True
    assert block["nbody"]["geometry_neq_trap"] is True
    assert block["nbody"]["modes_replace_not_product"] is True


def test_q4_q5_are_dimmed_and_open() -> None:
    block = build_open_questions(route_mode="legacy_unified_model")
    assert block["q_electron_capture"]["dimmed"] is True
    assert block["q_electron_capture"]["status"] == "OPEN"
    assert block["q_integrated_yield"]["dimmed"] is True
    assert block["q_integrated_yield"]["status"] == "OPEN"
    assert block["open_ids"] == [
        "EQ-OPEN-MEV-01",
        "EQ-OPEN-RAD-01",
        "EQ-OPEN-RATE-01",
        "EQ-OPEN-EC-01",
        "EQ-OPEN-YIELD-01",
    ]
