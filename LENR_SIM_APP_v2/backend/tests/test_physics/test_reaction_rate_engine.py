"""Tests for the reaction-rate engine and its UQ wrapper (Phase 5 / RR-006)."""

import math

import pytest

from app.physics_engine.unified_lenr_model.config import SimulationConfig
from app.physics_engine.unified_lenr_model.cross_sections import (
    calculate_reaction_rate,
    calculate_tunneling_probability,
)
from app.physics_engine.unified_lenr_model.reaction_rate_engine import (
    RateMode,
    compute_reaction_rate,
    compute_two_body_rate,
    compute_trapped_state_rate,
    MAX_COLLECTIVE_FACTOR,
)
from app.physics_engine.unified_lenr_model.reaction_rate_uq import (
    propagate_rate_uncertainty,
)
from app.physics_engine.mhd.nuclear_force_coupling import compute_nuclear_cross_section


def _config() -> SimulationConfig:
    return SimulationConfig(temperature=320.0, loading_ratio=0.9)


def test_two_body_mode_matches_baseline_and_is_reference_tier() -> None:
    cfg = _config()
    res = compute_reaction_rate(cfg, tunneling_prob=1.0, mode=RateMode.TWO_BODY)
    assert res.mode == "two_body"
    assert res.claim_tier == "established_reference"
    assert res.collective_factor == 1.0
    assert math.isfinite(res.rate_per_m3_s)
    assert res.rate_per_m3_s >= 0.0


def test_two_body_does_not_double_count_gamow() -> None:
    """σ(E) already includes e^{-2πη}; rate must multiply enhancement only once."""
    cfg = SimulationConfig(temperature=1e7, loading_ratio=0.9)  # keV-scale E
    e_cm_kev = max(1.380649e-23 * cfg.temperature / (1e3 * 1.602176634e-19), 1e-6)
    xs = compute_nuclear_cross_section(
        E_keV=e_cm_kev, reaction="D(d,n)He3", screening_energy_keV=0.0
    )
    assert xs.cross_section_m2 > 0.0
    rate_enh1 = calculate_reaction_rate(cfg, tunneling_prob=1.0)
    n_host = cfg.host_material.electron_density / cfg.host_material.atomic_number
    n = n_host * cfg.loading_ratio
    m = 0.5 * cfg.reactant.atomic_mass * 1.66053906660e-27
    v = math.sqrt(8 * 1.380649e-23 * cfg.temperature / (math.pi * m))
    expected = 0.5 * n**2 * xs.cross_section_m2 * v
    assert rate_enh1 == pytest.approx(expected, rel=1e-3)
    rate_enh2 = calculate_reaction_rate(cfg, tunneling_prob=2.0)
    assert rate_enh2 == pytest.approx(2.0 * rate_enh1, rel=1e-6)


def test_no_artificial_cross_section_floor_at_room_temp() -> None:
    cfg = _config()
    rate = calculate_reaction_rate(cfg, tunneling_prob=1.0)
    assert rate == 0.0 or rate < 1e-50


def test_trapped_state_is_speculative_and_cites_takahashi() -> None:
    cfg = _config()
    res = compute_trapped_state_rate(cfg, n_coherent=1.0)
    assert res.mode == "trapped_state"
    assert res.claim_tier == "speculative_exploratory"
    assert "takahashi2016" in res.references
    assert math.isfinite(res.rate_per_m3_s)


def test_trapped_state_exceeds_two_body_at_subpm_separation() -> None:
    """Crux of RR-006: trapped-state rate >> two-body at sub-pm separation."""
    cfg = _config()
    two_body = compute_two_body_rate(cfg, tunneling_prob=1.0).rate_per_m3_s
    trapped = compute_trapped_state_rate(
        cfg, trap_separation_m=1e-12
    ).rate_per_m3_s
    assert trapped > two_body


def test_collective_factor_is_hard_capped() -> None:
    cfg = _config()
    res = compute_trapped_state_rate(cfg, n_coherent=1e12)
    assert res.collective_factor <= MAX_COLLECTIVE_FACTOR


def test_default_mode_is_backward_compatible_two_body() -> None:
    cfg = _config()
    res = compute_reaction_rate(cfg, tunneling_prob=1.0)
    assert res.mode == "two_body"


def test_uq_is_deterministic_given_seed() -> None:
    cfg = _config()
    a = propagate_rate_uncertainty(cfg, mode="two_body", n_samples=128, seed=7)
    b = propagate_rate_uncertainty(cfg, mode="two_body", n_samples=128, seed=7)
    assert a.median == pytest.approx(b.median, rel=1e-12)
    assert a.credible_interval["p95"] == pytest.approx(b.credible_interval["p95"], rel=1e-12)


def test_uq_interval_is_ordered_and_predictive_without_band() -> None:
    cfg = _config()
    res = propagate_rate_uncertainty(cfg, mode="two_body", n_samples=128, seed=1)
    ci = res.credible_interval
    assert ci["p05"] <= ci["p50"] <= ci["p95"]
    assert res.interval_kind == "predictive"
    assert res.claim_tier == "established_reference"


def test_uq_screening_potential_affects_two_body_rate() -> None:
    """Cited U_e prior must propagate into σ(E+U_e), not be a phantom dimension."""
    cfg = SimulationConfig(temperature=1e7, loading_ratio=0.9)
    res = propagate_rate_uncertainty(
        cfg, mode="two_body", n_samples=64, seed=11, material_key="palladium"
    )
    assert math.isfinite(res.median)
    assert "screening_potential_eV" in res.sensitivity
    assert res.sensitivity["screening_potential_eV"] > 0.0


def test_uq_sensitivity_ranking_sums_to_one_when_nondegenerate() -> None:
    """Trapped-state spread is wide, so sensitivity indices must be informative."""
    cfg = _config()
    res = propagate_rate_uncertainty(cfg, mode="trapped_state", n_samples=256, seed=2)
    assert res.sensitivity, "expected non-empty sensitivity for trapped_state"
    assert 0.99 <= sum(res.sensitivity.values()) <= 1.01
    assert res.sensitivity.get("trap_separation_m", 0.0) > 0.0


def test_uq_posterior_update_with_experimental_band() -> None:
    cfg = _config()
    res = propagate_rate_uncertainty(
        cfg, mode="trapped_state", n_samples=256, seed=3,
        experimental_band=(1e10, 1e14),
    )
    assert res.interval_kind == "posterior_credible"
    assert res.credible_interval["p05"] <= res.credible_interval["p95"]
    assert "takahashi2016" in res.references


def test_tunneling_helper_still_reports_enhanced_probability() -> None:
    cfg = _config()
    p = calculate_tunneling_probability(cfg, enhancement=1e3)
    assert 0.0 <= p <= 1.0


def test_rate_call_conventions_agree_on_enhancement() -> None:
    """f and legacy P_gamow×f must resolve to the same volumetric rate."""
    cfg = SimulationConfig(temperature=1e7, loading_ratio=0.9)
    f = 50.0
    p_legacy = calculate_tunneling_probability(cfg, enhancement=f)
    assert p_legacy < 1.0
    r_from_f = calculate_reaction_rate(cfg, tunneling_prob=f)
    r_from_p = calculate_reaction_rate(cfg, tunneling_prob=p_legacy)
    assert r_from_f == pytest.approx(r_from_p, rel=1e-9)
    assert r_from_f == pytest.approx(f * calculate_reaction_rate(cfg, 1.0), rel=1e-9)


def test_trapped_exposes_fusion_probability() -> None:
    cfg = _config()
    baseline = compute_trapped_state_rate(cfg, fusion_probability=1.0)
    half = compute_trapped_state_rate(cfg, fusion_probability=0.5)
    assert "fusion_probability" in half.provenance
    assert half.provenance["fusion_probability"] == pytest.approx(0.5)
    assert half.rate_per_m3_s == pytest.approx(0.5 * baseline.rate_per_m3_s)


def test_subnuclear_separation_is_guarded() -> None:
    cfg = _config()
    res = compute_trapped_state_rate(cfg, trap_separation_m=1e-16)
    assert res.provenance["barrier_penetration"] < 1.0


def test_penetration_monotonic_in_separation() -> None:
    from app.physics_engine.unified_lenr_model.reaction_rate_engine import (
        _gamow_penetration,
    )

    cfg = _config()
    assert _gamow_penetration(cfg, 1e-12) > _gamow_penetration(cfg, 1e-11)


def test_power_density_falsifier_flags_unphysical() -> None:
    from app.physics_engine.unified_lenr_model.reaction_rate_engine import (
        DEFAULT_TRAP_NUCLEAR_RADIUS_M,
    )

    cfg = _config()
    res = compute_trapped_state_rate(
        cfg,
        trap_separation_m=DEFAULT_TRAP_NUCLEAR_RADIUS_M,
        n_coherent=1e6,
    )
    assert res.provenance["unphysical"] == 1.0
    assert res.provenance["power_density_W_m3"] > 1e9


def test_uq_fusion_probability_dimension_present_for_trapped() -> None:
    cfg = _config()
    res = propagate_rate_uncertainty(cfg, mode="trapped_state", n_samples=128, seed=5)
    assert "fusion_probability" in res.sensitivity


def test_three_body_is_speculative_and_cites_widom_larsen() -> None:
    from app.physics_engine.unified_lenr_model.reaction_rate_engine import (
        compute_three_body_rate,
    )

    cfg = _config()
    res = compute_three_body_rate(cfg)
    assert res.mode == "three_body"
    assert res.claim_tier == "speculative_exploratory"
    assert "widomlarsen2006" in res.references
    assert "steinetz2020exp" in res.references
    assert "conversion_probability" in res.provenance
    assert res.provenance["conversion_probability"] == pytest.approx(1e-6)
    assert math.isfinite(res.rate_per_m3_s)
    assert res.rate_per_m3_s >= 0.0


def test_three_body_scales_with_conversion_and_compression() -> None:
    from app.physics_engine.unified_lenr_model.reaction_rate_engine import (
        compute_three_body_rate,
    )

    cfg = _config()
    base = compute_three_body_rate(
        cfg, conversion_probability=1e-6, compression_ratio=10.0, mass_renormalization=4.0
    )
    hotter = compute_three_body_rate(
        cfg, conversion_probability=2e-6, compression_ratio=10.0, mass_renormalization=4.0
    )
    denser = compute_three_body_rate(
        cfg, conversion_probability=1e-6, compression_ratio=20.0, mass_renormalization=4.0
    )
    assert base.rate_per_m3_s > 0.0
    assert hotter.rate_per_m3_s == pytest.approx(2.0 * base.rate_per_m3_s, rel=1e-6)
    # Densities scale as compression² in n_p·n_e product → 4× for 2× compression.
    assert denser.rate_per_m3_s == pytest.approx(4.0 * base.rate_per_m3_s, rel=1e-6)


def test_three_body_closed_without_mass_renormalization() -> None:
    from app.physics_engine.unified_lenr_model.reaction_rate_engine import (
        compute_three_body_rate,
    )

    cfg = _config()
    closed = compute_three_body_rate(cfg, mass_renormalization=1.0)
    open_ = compute_three_body_rate(cfg, mass_renormalization=4.0)
    assert closed.provenance["mass_sufficient"] == 0.0
    assert closed.rate_per_m3_s < open_.rate_per_m3_s
    assert open_.provenance["mass_sufficient"] == 1.0


def test_uq_three_body_exposes_conversion_sensitivity() -> None:
    cfg = _config()
    res = propagate_rate_uncertainty(cfg, mode="three_body", n_samples=128, seed=9)
    assert res.claim_tier == "speculative_exploratory"
    assert "conversion_probability" in res.sensitivity
    assert "widomlarsen2006" in res.references


def test_uq_enhancement_prior_respects_composition_cap_honesty_floor() -> None:
    """RR-001 / EQ-COMP-01 honesty: UQ two-body enhancement prior ≤ 1e5 ceiling."""
    from app.physics_engine.constants import MAX_ENHANCEMENT_FACTOR
    from app.physics_engine.unified_lenr_model.reaction_rate_uq import (
        ENHANCEMENT_PRIOR_HI,
        ENHANCEMENT_PRIOR_LO,
    )

    assert ENHANCEMENT_PRIOR_LO == pytest.approx(1e3)
    assert ENHANCEMENT_PRIOR_HI == pytest.approx(MAX_ENHANCEMENT_FACTOR)
    assert ENHANCEMENT_PRIOR_HI == pytest.approx(1e5)


def test_two_body_notes_are_non_closure_honest() -> None:
    """Two-body is a reference formalism, not a lattice-LENR closure claim."""
    cfg = _config()
    res = compute_two_body_rate(cfg, tunneling_prob=1.0)
    notes = res.notes.lower()
    assert "not a validated lattice-lenr" in notes
    assert "lenr_proved" not in notes
    assert res.claim_tier == "established_reference"


def test_eq_uq_bf_01_algebraic_identities_mirror_lean() -> None:
    """EQ-UQ-BF-01 Python mirrors Lean self/antisymm/cocycle + ExpHom products."""
    from app.physics_engine.decision_oracle import (
        approx_bayes_factor,
        log_bayes_factor,
    )

    samples = (-3.0, -1.0, 0.0, 0.5, 2.0, 4.0)
    for log_ev in samples:
        assert log_bayes_factor(log_ev, log_ev) == pytest.approx(0.0)
        assert approx_bayes_factor(log_ev, log_ev) == pytest.approx(1.0)

    for i in samples:
        for j in samples:
            assert log_bayes_factor(i, j) == pytest.approx(-log_bayes_factor(j, i))
            bf_ij = approx_bayes_factor(i, j)
            bf_ji = approx_bayes_factor(j, i)
            assert bf_ij * bf_ji == pytest.approx(1.0, rel=1e-12)
            assert bf_ij == pytest.approx(math.exp(-log_bayes_factor(j, i)))

    for i in samples:
        for j in samples:
            for k in samples:
                assert log_bayes_factor(i, j) + log_bayes_factor(j, k) == pytest.approx(
                    log_bayes_factor(i, k)
                )
                assert approx_bayes_factor(i, j) * approx_bayes_factor(j, k) == pytest.approx(
                    approx_bayes_factor(i, k), rel=1e-12
                )


def test_decision_oracle_bayes_factors_obey_reciprocal_identity() -> None:
    """Oracle B reported BF pairs stay algebraically reciprocal (not empirical)."""
    from app.physics_engine.decision_oracle import evaluate_determination

    det = evaluate_determination(rate_mode="two_body")
    assert det["oracle_a"]["two_body_budget_closes"] is False
    assert det["oracle_a"]["log10_n_events_two_body"] == pytest.approx(-40.0)
    assert "LENR_PROVED" in det["forbidden"]
    assert det["status"] != "LENR_PROVED"

    oracle_b = det["oracle_b"]
    hyps = {row["id"]: row for row in oracle_b["hypotheses"]}
    bf_trap = oracle_b["bayes_factor_trapped_vs_two_body"]
    log_trap = hyps["trapped_state"]["log_evidence"]
    log_two = hyps["two_body"]["log_evidence"]
    assert bf_trap == pytest.approx(math.exp(log_trap - log_two), rel=1e-12)
    assert bf_trap * math.exp(log_two - log_trap) == pytest.approx(1.0, rel=1e-12)
