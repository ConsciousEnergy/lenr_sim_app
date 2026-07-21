"""Tests for the reaction-rate engine and its UQ wrapper (Phase 5 / RR-006)."""

import math

import numpy as np
import pytest

from app.physics_engine.unified_lenr_model.config import SimulationConfig
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


def _config() -> SimulationConfig:
    return SimulationConfig(temperature=320.0, loading_ratio=0.9)


def test_two_body_mode_matches_baseline_and_is_validated_tier() -> None:
    cfg = _config()
    res = compute_reaction_rate(cfg, tunneling_prob=1e-40, mode=RateMode.TWO_BODY)
    assert res.mode == "two_body"
    assert res.claim_tier == "validated_lenr_mechanism"
    assert res.collective_factor == 1.0
    assert math.isfinite(res.rate_per_m3_s)
    assert res.rate_per_m3_s >= 0.0


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
    two_body = compute_two_body_rate(cfg, tunneling_prob=1e-40).rate_per_m3_s
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
    res = compute_reaction_rate(cfg, tunneling_prob=1e-40)
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


def test_uq_sensitivity_ranking_sums_to_one_when_nondegenerate() -> None:
    """Trapped-state spread is wide, so sensitivity indices must be informative."""
    cfg = _config()
    res = propagate_rate_uncertainty(cfg, mode="trapped_state", n_samples=256, seed=2)
    assert res.sensitivity, "expected non-empty sensitivity for trapped_state"
    assert 0.99 <= sum(res.sensitivity.values()) <= 1.01
    # Trap separation should dominate the variance (exponential barrier sensitivity).
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
