"""EQ-RATE-CAP-* Lean anchors vs the reaction-rate engine (scenario bounds only)."""
from __future__ import annotations

import math

from app.physics.weak_interaction import calculate_weak_interaction_cross_section
from app.physics_engine.collapse_calculated_bounds import MAX_COMPRESSION_RATIO
from app.physics_engine.constants import MAX_ENHANCEMENT_FACTOR
from app.physics_engine.many_body.fgr_model import MAX_COLLECTIVE_FACTOR
from app.physics_engine.unified_lenr_model import reaction_rate_engine as rre
from app.physics_engine.unified_lenr_model.config import SimulationConfig
from tests.test_formalization.test_lean_python_agreement import (
    LEAN_DIR,
    _evaluate_lean_integer,
)

RATE_BUDGET = LEAN_DIR / "RateBudget.lean"
# Paper §5A.3 exposure window: 1 cm³ over 1e5 s.
WINDOW_VOLUME_M3 = 1e-6
WINDOW_TIME_S = 1e5


def _lean(symbol: str) -> int:
    return _evaluate_lean_integer(RATE_BUDGET, symbol)


def _window_log10_n(rate_per_m3_s: float) -> float:
    return math.log10(rate_per_m3_s * WINDOW_VOLUME_M3 * WINDOW_TIME_S)


def test_trapped_state_anchors_bound_engine_values() -> None:
    config = SimulationConfig()
    n_sites = 0.5 * rre._reactant_number_density(config)
    tun_fcc = math.log10(rre._gamow_penetration(config, rre.fcc_d_dd_m()))
    tun_25pm = math.log10(rre._gamow_penetration(config, rre.DEFAULT_TRAP_SEPARATION_M))

    assert _lean("windowLog10") == round(math.log10(WINDOW_VOLUME_M3 * WINDOW_TIME_S))
    assert _lean("sitesLog10Floor") <= math.log10(n_sites) <= _lean("sitesLog10Cap")
    assert tun_fcc <= _lean("tunLog10CapFcc")
    assert _lean("tunLog10Floor25pm") <= tun_25pm <= _lean("tunLog10Cap25pm")
    assert _lean("invTauLog10Default") == round(-math.log10(rre.DEFAULT_CLUSTER_LIFETIME_S))
    assert _lean("invTauLog10Cap") == 30  # fgr_model lifetime floor max(τ, 1e-30)
    assert _lean("collectiveLog10Cap") == round(math.log10(MAX_COLLECTIVE_FACTOR))
    assert _lean("enhancementLog10Cap") == round(math.log10(MAX_ENHANCEMENT_FACTOR))


def test_trapped_state_engine_signs_match_lean_bound_and_gap() -> None:
    config = SimulationConfig()
    fcc_at_caps = rre.compute_reaction_rate(
        config,
        1e-85,
        mode="trapped_state",
        geometry_mode="fcc_tetrahedral",
        n_coherent=MAX_COLLECTIVE_FACTOR,
        cluster_lifetime_s=1e-30,
    )
    trap_default = rre.compute_reaction_rate(config, 1e-85, mode="trapped_state")

    # EQ-RATE-CAP-NC-01: engine stays below the conservative Lean cap sum (-15).
    assert _window_log10_n(fcc_at_caps.rate_per_m3_s) < -15
    # EQ-RATE-CAP-GAP-01: engine default at 25 pm is nonnegative (gap, not closure).
    assert _window_log10_n(trap_default.rate_per_m3_s) >= 8


def test_three_body_anchors_and_signs_match_lean() -> None:
    config = SimulationConfig()
    sigma = calculate_weak_interaction_cross_section(1e6)
    clip_log10 = -700.0 / math.log(10.0)

    assert math.log10(sigma) <= _lean("sigmaLog10Cap")
    assert clip_log10 <= _lean("channelLog10CapNonUlm")
    assert _lean("protonDensityLog10Cap") == _lean("sitesLog10Cap") + round(
        math.log10(MAX_COMPRESSION_RATIO)
    )
    assert rre.DEFAULT_MASS_RENORMALIZATION * 100 >= 253

    ulm_default = rre.compute_reaction_rate(config, 1e-85, mode="three_body")
    non_ulm_at_caps = rre.compute_reaction_rate(
        config,
        1e-85,
        mode="three_body",
        mass_renormalization=2.52,
        compression_ratio=MAX_COMPRESSION_RATIO,
        proton_fraction=0.5,
        conversion_probability=1.0,
        n_coherent=MAX_COLLECTIVE_FACTOR,
    )

    assert ulm_default.provenance["mass_sufficient"] == 1.0
    assert _window_log10_n(ulm_default.rate_per_m3_s) >= 4
    assert non_ulm_at_caps.provenance["mass_sufficient"] == 0.0
    assert _window_log10_n(non_ulm_at_caps.rate_per_m3_s) < -266
