"""EQ-SCHWINGER-STUB-NC-01 — Schwinger NEAL P0 historical-control stub honesty twin."""

from __future__ import annotations

from app.physics_engine.theories.schwinger_lattice import SchwingerLatticeTheory


def test_schwinger_lattice_stub_honesty_locks():
    theory = SchwingerLatticeTheory()
    contrib = theory.calculate({"loading_ratio": 0.9, "temperature": 300.0})
    assert contrib.theory_id == "schwinger_lattice"
    assert contrib.is_applicable is True
    assert contrib.energy_output_watts == 0.0
    assert contrib.enhancement_factor == 1.0
    assert contrib.reaction_rate_modifier == 1.0
    assert contrib.observables.get("product_He4") == 0.0
    assert contrib.observables.get("product_neutrons") == 0.0
    assert contrib.observables.get("product_gamma") == 0.0
    assert contrib.provenance.get("implementation_role") == "historical_control_scaffold"
    assert contrib.provenance.get("no_invented_rate_law") is True
    assert contrib.provenance.get("lenr_proved") is False
    assert contrib.provenance.get("eq_open_closed") is False
    assert contrib.provenance.get("discovery_moe") is False
    assert contrib.provenance.get("hd_critical_experiment") is True
    approx = contrib.author_equations_vs_simulator_approximations or {}
    assert approx.get("nuclear_rate_law") == "not_implemented_no_invented_author_rate"
    assert approx.get("h_fraction_in_d2o") == "exploratory_free_parameter"
    assert approx.get("energy_output_watts") == "stub_zero_until_cite_gated_calorimetry"
    assert approx.get("claimed_mass_defect_mev") == "none_no_author_mev_label"
    meta = theory.get_metadata()
    assert meta.model_fidelity == "phenomenological"
    assert meta.empirical_support == "speculative"
