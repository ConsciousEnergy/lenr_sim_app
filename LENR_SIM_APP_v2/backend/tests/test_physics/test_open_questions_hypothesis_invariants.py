"""Property tests for WH-ENP-01 (runtime mirror of Lean identities)."""
from __future__ import annotations

import pytest

from app.physics_engine.many_body.branching_model import LATTICE_GAMMA_TARGET
from app.physics_engine.open_questions import build_open_questions
from app.physics_engine.working_hypothesis import (
    ALPHA_KE_MEV,
    Q_4D_MEV,
    Q_DD_HE4_MEV,
    WH_ID,
    compute_working_hypothesis,
    derive_lattice_gamma_bound,
    dicke_radius_m,
)


def test_partition_conserves_and_remainder_open() -> None:
    block = build_open_questions(route_mode="legacy_unified_model")
    part = block["q_mev_gap"]["energy_partition_mev"]
    assert part["open_remainder"] + part["phonon"] + part["gamma"] + part["recoil"] == part["q_total"]
    assert part["open_remainder"] > 0
    assert block["q_mev_gap"]["status"] == "OPEN"
    wh = block["working_hypothesis"]
    assert wh["id"] == WH_ID
    assert wh["q1"]["open_remainder_mev"] > 0
    assert wh["q1"]["naive_gN_closes"] is False
    assert wh["discharges_eq_open"] is False
    assert wh["lenr_proved"] is False
    assert block["lenr_proved"] is False


def test_gn_cannot_report_closure() -> None:
    block = build_open_questions(route_mode="legacy_unified_model")
    phonon = block["q_mev_gap"]["phonon"]
    assert phonon["naive_ruled_out"] is True
    assert block["working_hypothesis"]["q1"]["naive_gN_closes"] is False


def test_derived_branching_fails_target_and_stays_scenario() -> None:
    bound = derive_lattice_gamma_bound()
    assert bound["derived_gamma_ph_over_gamma_gamma"] == 0.0
    assert bound["meets_target"] is False
    assert bound["lattice_gamma_target"] == LATTICE_GAMMA_TARGET
    block = build_open_questions(route_mode="legacy_unified_model")
    q2 = block["q_radiation"]
    assert q2["status"] == "OPEN"
    assert q2["branching_is_scenario_input"] is True
    assert q2["derived_bound"]["meets_target"] is False
    assert "assumed" in q2["assumed_branching_label"]


def test_shared_hypothesis_id_across_q1_q2_q3() -> None:
    block = build_open_questions(route_mode="legacy_unified_model")
    hid = block["working_hypothesis"]["id"]
    assert hid == WH_ID
    assert block["q_mev_gap"]["working_hypothesis_id"] == hid
    assert block["q_radiation"]["working_hypothesis_id"] == hid
    assert block["q_statistical"]["working_hypothesis_id"] == hid
    assert block["how"]["working_hypothesis_id"] == hid


def test_floor_identity_matches_power_over_qv() -> None:
    power = 1.0
    vol = 1e-6
    block = build_open_questions(
        route_mode="legacy_unified_model",
        observations={"excess_power_W": power, "he4_atoms_per_s": 2.63e11},
        active_volume_m3=vol,
        rate_block={"rate": {"rate_per_m3_s": 0.0, "mode": "two_body"}},
    )
    r_obs = block["working_hypothesis"]["q3"]["R_obs_per_m3_s"]
    from scipy import constants as const

    q_j = Q_DD_HE4_MEV * 1e6 * const.e
    assert r_obs == power / (q_j * vol)
    assert block["when"]["threshold_crossed"] is False
    assert block["q_statistical"]["n_events_log10_two_body"] == -40.0


def test_dicke_n2_not_licensed_at_paper_domain() -> None:
    block = build_open_questions(route_mode="legacy_unified_model")
    dicke = block["working_hypothesis"]["dicke"]
    assert dicke["n2_licensed"] is False
    assert dicke["paper_domain_m"] > dicke["dicke_radius_m"]
    assert dicke["engine_collective"] == "linear_min_N_1e6"
    assert dicke_radius_m() < 6.6e-9


def test_he_negative_control() -> None:
    block = build_open_questions(route_mode="legacy_unified_model")
    he = block["working_hypothesis"]["schwinger_he"]
    assert abs(he["he_factor"] - 1.0) < 1e-10
    assert he["closes_q1"] is False
    assert he["closes_q2"] is False


def test_alpha_stopping_not_counted_as_derived() -> None:
    block = build_open_questions(route_mode="legacy_unified_model")
    stop = block["working_hypothesis"]["q1"]["alpha_stopping"]
    assert stop["ke_per_alpha_mev"] * 2 == pytest.approx(Q_4D_MEV)
    assert stop["ke_per_alpha_mev"] == pytest.approx(ALPHA_KE_MEV)
    assert stop["counted_in_derived_mev"] is False
    assert block["q_mev_gap"]["energy_partition_mev"]["open_remainder"] > 0


def test_channel_graph_is_finite_not_path_integral() -> None:
    block = build_open_questions(route_mode="legacy_unified_model")
    ids = {row["id"] for row in block["working_hypothesis"]["channels"]}
    assert ids == {"dd_he4_phonons", "tsc_4d_2alpha", "dd_t_p", "dd_n_he3"}
    tsc = next(row for row in block["working_hypothesis"]["channels"] if row["id"] == "tsc_4d_2alpha")
    assert tsc["primary_gamma_required"] is False
    assert tsc["weight_kind"] == "kinematics_only"


def test_two_body_never_overwritten() -> None:
    block = build_open_questions(route_mode="legacy_unified_model", rate_mode="two_body")
    assert block["rate_mode"] == "two_body"
    assert block["q_statistical"]["n_events_log10_two_body"] == -40.0
    trapped = build_open_questions(route_mode="legacy_unified_model", rate_mode="trapped_state")
    assert trapped["q_statistical"]["two_body_reference"] is not None or trapped["rate_mode"] == "trapped_state"
    assert trapped["working_hypothesis"]["q3"]["two_body_log10_n_events"] == -40.0


def test_compute_working_hypothesis_direct() -> None:
    wh = compute_working_hypothesis(
        phonon_energy_mev=0.0,
        gamma_energy_mev=0.0,
        recoil_energy_mev=0.0,
        open_remainder_mev=23.8,
        q_total_mev=23.8,
        naive_ruled_out=True,
        rate_per_m3_s=0.0,
        active_volume_m3=1e-6,
        excess_power_w=None,
        loading_ratio=0.9,
    )
    assert wh["q1_closed"] is False
    assert wh["q2_closed"] is False
    assert wh["q3_closed"] is False
    assert "EQ-WH-NONCLOSE-01" in wh["lean_theorems"]


WH_V2_LEAN_IDS = ("EQ-WH-FC-01", "EQ-WH-PART-02", "EQ-WH-DICKE-N-01", "EQ-WH-CAP-01")


def test_v2_blocks_present_and_nothing_closes() -> None:
    block = build_open_questions(
        route_mode="legacy_unified_model",
        observations={"excess_power_W": 1.0},
    )
    wh = block["working_hypothesis"]
    for lean_id in WH_V2_LEAN_IDS:
        assert lean_id in wh["lean_theorems"]
    assert wh["q2"]["franck_condon"]["meets_target"] is False
    assert wh["q2"]["franck_condon"]["lean_theorems"] == ["EQ-WH-FC-01"]
    assert wh["q1"]["open_remainder_mev"] == 23.8
    assert wh["q1"]["coupling_scan"]["default_derived_mev"] == 0.0
    assert wh["q1"]["coupling_scan"]["conservation_holds"] is True
    assert wh["q1"]["coupling_scan"]["n_coh_cited_cap"] == wh["dicke"]["n_coh_licensed_max"] == 0
    assert wh["dicke"]["n_within_radius"] < 1.0
    assert "EQ-WH-DICKE-N-01" in wh["dicke"]["lean_theorems"]
    closure = wh["q3"]["closure_demand"]
    assert closure["kind"] == "scenario_table_not_posterior"
    assert closure["two_body_untouched"] is True
    assert closure["R_obs_per_m3_s"] == wh["q3"]["R_obs_per_m3_s"]
    assert closure["required_product"] is not None
    assert closure["engine_cap"]["fcc_tetrahedral"]["crosses"] is False
    assert closure["engine_cap"]["trap_25pm"]["crosses"] is False
    assert closure["n_sites_convention"].startswith("reaction_rate_engine")
    assert wh["lenr_proved"] is False
    assert wh["discharges_eq_open"] is False
    assert wh["status"] == "OPEN"
    assert wh["q1"]["status"] == "OPEN"
    assert wh["q2"]["status"] == "OPEN"
    assert wh["q3"]["status"] == "OPEN"
    assert block["lenr_proved"] is False
    assert block["q_mev_gap"]["energy_partition_mev"]["open_remainder"] == 23.8
    assert block["q_statistical"]["n_events_log10_two_body"] == -40.0
    assert block["q_statistical"]["two_body_reference"] == {}


def test_v2_lean_ids_propagate_to_open_question_blocks() -> None:
    block = build_open_questions(route_mode="legacy_unified_model")
    assert "EQ-WH-PART-02" in block["q_mev_gap"]["lean_theorems"]
    assert "EQ-WH-DICKE-N-01" in block["q_mev_gap"]["lean_theorems"]
    assert "EQ-WH-FC-01" in block["q_radiation"]["lean_theorems"]
    assert "EQ-WH-CAP-01" in block["q_statistical"]["lean_theorems"]
    assert block["schema"] == "lenr-open-questions-v1"
    assert block["q_mev_gap"]["status"] == "OPEN"
    assert block["q_radiation"]["status"] == "OPEN"


def test_v2_closure_demand_without_power_stays_null_not_closed() -> None:
    block = build_open_questions(route_mode="legacy_unified_model")
    closure = block["working_hypothesis"]["q3"]["closure_demand"]
    assert closure["R_obs_per_m3_s"] is None
    assert closure["required_product"] is None
    assert closure["engine_cap"]["trap_25pm"]["crosses"] is None
    assert block["working_hypothesis"]["q3_closed"] is False
    assert block["working_hypothesis"]["q2"]["franck_condon"]["meets_target"] is False
