"""Unit tests for the open-questions virtual lab builder and decision oracle."""
from __future__ import annotations

import pytest

from app.physics_engine.constants import MAX_ENHANCEMENT_FACTOR
from app.physics_engine.decision_oracle import (
    ANCHORED_PRIORS,
    FORBIDDEN_STATUS,
    HYPOTHESES,
    TWO_BODY_LOG10_N_EVENTS,
    evaluate_determination,
    miles_q_mev,
    occurrence_anchored,
)
from app.physics_engine.many_body.fgr_model import GeometryMode
from app.physics_engine.open_questions import (
    build_open_questions,
    safe_build_open_questions,
)
from app.physics_engine.theories.miles_heat_helium import MILES_RATE_PER_WATT
from app.physics_engine.unified_lenr_model.config import SimulationConfig
from app.physics_engine.unified_lenr_model.reaction_rate_engine import (
    DEFAULT_MASS_RENORMALIZATION,
    compute_reaction_rate,
    compute_trapped_state_rate,
)


def test_two_body_log10_n_events_is_minus_forty() -> None:
    assert TWO_BODY_LOG10_N_EVENTS == -40.0
    block = build_open_questions(route_mode="legacy_unified_model", rate_mode="two_body")
    assert block["q_statistical"]["n_events_log10_two_body"] == -40.0
    assert block["determination"]["status"] == "RATE_BUDGET_DOES_NOT_CLOSE"
    assert block["determination"]["oracle_a"]["two_body_budget_closes"] is False
    assert block["occurrence"]["anchored"] is False
    assert "when" in block and "how" in block


def test_lenr_proved_never_emitted() -> None:
    block = build_open_questions(route_mode="legacy_unified_model")
    assert block["lenr_proved"] is False
    assert block["determination"]["status"] not in FORBIDDEN_STATUS
    assert block["ui_phrase_class"] == "consistency_or_odds_only"
    assert "lenr_occurs" not in str(block["determination"].get("oracle_a", {})).lower()


def test_illegal_product_is_pedagogy_only() -> None:
    block = build_open_questions(
        route_mode="theory_pipeline",
        pipeline_combined_enhancement=MAX_ENHANCEMENT_FACTOR,
        bubble_peak_enhancement=MAX_ENHANCEMENT_FACTOR,
    )
    assert block["composition"]["not_combinable"] is True
    assert block["composition"]["illegal_product"] == MAX_ENHANCEMENT_FACTOR ** 2
    assert "not physical" in block["composition"]["illegal_product_label"]


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
    hyps = {row["id"] for row in det["oracle_b"]["hypotheses"]}
    assert hyps == set(HYPOTHESES)


def test_occurrence_anchored_shifts_priors() -> None:
    obs = {"excess_power_W": 1.0, "he4_atoms_per_s": 2.63e11}
    assert occurrence_anchored(obs)
    det = evaluate_determination(
        rate_mode="two_body",
        observations=obs,
    )
    assert det["oracle_b"]["priors_source"] == "occurrence_anchored"
    assert det["oracle_b"]["priors"]["chemical_null"] < ANCHORED_PRIORS["chemical_null"] + 0.01
    assert det["status"] == "OCCURRENCE_ANCHORED_EMP"


def test_threshold_crossed_with_synthetic_calorimetry() -> None:
    block = build_open_questions(
        route_mode="legacy_unified_model",
        rate_mode="trapped_state",
        observations={"excess_power_W": 1e-6, "he4_atoms_per_s": 1.0},
        rate_block={
            "rate": {
                "rate_per_m3_s": 1e20,
                "mode": "trapped_state",
                "provenance": {"unphysical": 0},
            }
        },
        total_time=100.0,
    )
    assert block["when"]["threshold_crossed"] is True
    assert block["determination"]["status"] == "THRESHOLD_CROSSED_UNDER_HYPOTHESIS"


def test_fgr_trapped_state_regression_default_params() -> None:
    config = SimulationConfig()
    config.loading_ratio = 0.9
    legacy = compute_trapped_state_rate(config)
    assert legacy.rate_per_m3_s > 0
    assert legacy.provenance.get("P_occ") == 1.0


def test_geometry_mode_changes_separation() -> None:
    config = SimulationConfig()
    trap = compute_trapped_state_rate(
        config, geometry_mode=GeometryMode.TRAP_25PM.value
    )
    fcc = compute_trapped_state_rate(
        config, geometry_mode=GeometryMode.FCC_TETRAHEDRAL.value
    )
    assert trap.provenance["trap_separation_m"] != fcc.provenance["trap_separation_m"]


def test_safe_builder_never_raises() -> None:
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


def test_q4_q5_are_dimmed_and_open() -> None:
    block = build_open_questions(route_mode="legacy_unified_model")
    q_ec = block["q_electron_capture"]
    q_yield = block["q_integrated_yield"]
    assert q_ec["dimmed"] is True
    assert q_ec["status"] == "OPEN"
    assert q_ec["claim_tier"] == "speculative_exploratory"
    assert q_ec["electron_capture_threshold_mev"] == pytest.approx(0.782)
    assert q_ec["mass_renormalization_threshold_mstar_over_me"] == pytest.approx(
        2.53, rel=0.01
    )
    assert (
        q_ec["mass_renormalization_input_mstar_over_me"]
        == DEFAULT_MASS_RENORMALIZATION
    )
    assert q_ec["mass_renormalization_threshold_met"] is True
    assert q_ec["energy_deficit_mev"] == 0.0
    assert "scenario input" in q_ec["zero_deficit_note"]
    assert "EQ-OPEN-EC-DEFICIT-01" in q_ec["zero_deficit_note"]
    assert q_ec["stated_double_layer_deficit_factor"] == pytest.approx(7.82e6)
    assert "EQ-OPEN-EC-DEFICIT-01" in q_ec["lean_theorems"]
    assert q_ec["occurrence_claimed"] is False
    assert q_ec["unmet_reason"]
    assert q_yield["dimmed"] is True
    assert q_yield["status"] == "OPEN"
    assert q_yield["claim_tier"] == "empirical_lenr_correlation"
    assert q_yield["observed_integrated_he4_yield_atoms"] is None
    assert q_yield["occurrence_claimed"] is False
    assert q_yield["reported_integrated_yield_discrepancy"]["factor_band"] == [
        1e2,
        1e4,
    ]
    assert block["open_ids"][0] == "EQ-OPEN-MEV-01"
    assert block["lenr_proved"] is False


def test_q4_reports_mass_and_energy_gaps_below_threshold() -> None:
    block = build_open_questions(
        route_mode="legacy_unified_model",
        rate_block={
            "rate": {
                "mode": "three_body",
                "provenance": {"mass_renormalization": 2.0},
            }
        },
        rate_mode="three_body",
    )
    q_ec = block["q_electron_capture"]
    assert q_ec["status"] == "OPEN"
    assert q_ec["mass_renormalization_active"] is True
    assert q_ec["mass_renormalization_threshold_met"] is False
    assert q_ec["mass_renormalization_gap_mstar_over_me"] > 0
    assert q_ec["energy_deficit_mev"] > 0
    assert "below" in q_ec["unmet_reason"]
    assert q_ec["zero_deficit_note"] is None
    assert q_ec["occurrence_claimed"] is False
    assert block["lenr_proved"] is False


@pytest.mark.parametrize("rate_mode", ["two_body", "trapped_state", "three_body"])
def test_all_five_eq_open_rows_stay_open_with_locked_tiers(rate_mode: str) -> None:
    block = build_open_questions(route_mode="legacy_unified_model", rate_mode=rate_mode)
    assert block["open_ids"] == [
        "EQ-OPEN-MEV-01",
        "EQ-OPEN-RAD-01",
        "EQ-OPEN-RATE-01",
        "EQ-OPEN-EC-01",
        "EQ-OPEN-YIELD-01",
    ]
    assert block["lenr_proved"] is False
    for key in ("q_mev_gap", "q_radiation", "q_electron_capture"):
        assert block[key]["status"] == "OPEN"
        assert block[key]["claim_tier"] == "speculative_exploratory"
    assert block["q_integrated_yield"]["status"] == "OPEN"
    assert block["q_integrated_yield"]["claim_tier"] == "empirical_lenr_correlation"
    q_stat = block["q_statistical"]
    assert q_stat["id"] in block["open_ids"]
    assert q_stat["status"] != "CLOSED"
    if rate_mode == "two_body":
        assert q_stat["status"] == "BUDGET_DOES_NOT_CLOSE"
        assert q_stat["claim_tier"] == "established_reference"
    else:
        assert q_stat["status"] == "OPEN"
        assert q_stat["claim_tier"] == "speculative_exploratory"


def test_q5_computes_miles_rate_and_duty_adjusted_yield() -> None:
    block = build_open_questions(
        route_mode="legacy_unified_model",
        observations={"excess_power_W": 1.0},
        total_time=20.0,
        duty_fraction=0.5,
    )
    q_yield = block["q_integrated_yield"]
    assert q_yield["status"] == "OPEN"
    assert q_yield["expected_he4_rate_per_s"] == pytest.approx(
        MILES_RATE_PER_WATT
    )
    assert q_yield["duty_adjusted_expected_he4_rate_per_s"] == pytest.approx(
        0.5 * MILES_RATE_PER_WATT
    )
    assert q_yield["expected_integrated_he4_yield_atoms"] == pytest.approx(
        10.0 * MILES_RATE_PER_WATT
    )
    assert q_yield["observed_integrated_he4_yield_atoms"] is None
    assert "time-resolved" in q_yield["retention_time_resolved_caveat"]
    assert q_yield["occurrence_claimed"] is False
    assert block["lenr_proved"] is False


def test_mechanism_paths_include_backend_diagram_specs() -> None:
    block = build_open_questions(route_mode="legacy_unified_model")
    paths = block["how"]["mechanism_paths"]
    assert paths
    assert all(path["diagram_spec"]["nodes"] for path in paths)
    assert all(path["diagram_spec"]["edges"] for path in paths)


def test_two_body_dispatch_unchanged() -> None:
    config = SimulationConfig()
    r = compute_reaction_rate(config, 1e-20, mode="two_body")
    assert r.mode == "two_body"
    assert r.claim_tier == "established_reference"
