"""Cross section and reaction rate calculations for unified LENR model."""
from __future__ import annotations

import numpy as np
from scipy import constants as const

from .config import SimulationConfig
from app.physics_engine.mhd.nuclear_force_coupling import compute_nuclear_cross_section

KB = const.k
E_CHARGE = const.e
C = const.c
ALPHA = const.alpha

# Phenomenological enhancement hard cap (paper §2.8 / RR-001).
MAX_ENHANCEMENT_FACTOR = 1e5


def _get_reduced_mass_kg(config: SimulationConfig) -> float:
    reactant_mass_kg = config.reactant.atomic_mass * const.u
    return 0.5 * reactant_mass_kg


def _bare_gamow_factor(config: SimulationConfig) -> float:
    """Thermal Gamow penetration P = exp(-2πη) at E = kT (diagnostic only).

    Uses the same thermal-energy convention as ``calculate_reaction_rate``'s
    S-factor evaluation so diagnostic P and σ(E) stay consistent.
    """
    T = config.temperature
    m_reduced = _get_reduced_mass_kg(config)
    E = KB * T
    if E <= 0:
        return 0.0
    z1 = z2 = config.reactant.atomic_number
    eta = z1 * z2 * ALPHA * np.sqrt(m_reduced * C**2 / (2 * E))
    exponent = float(-2.0 * np.pi * eta)
    if exponent < -700.0:
        return 0.0
    return float(np.exp(exponent))


def calculate_tunneling_probability(config: SimulationConfig, enhancement: float) -> float:
    """Diagnostic enhanced tunneling probability P_gamow × f (capped at 1).

    For volumetric rates use ``calculate_reaction_rate`` with an enhancement
    factor; do **not** multiply this probability onto an S-factor σ that already
    contains Gamow penetration (that double-counts e^{-2πη}).
    """
    p_gamow = _bare_gamow_factor(config)
    p_enhanced = p_gamow * max(float(enhancement), 0.0)
    return float(min(p_enhanced, 1.0))


def _resolve_enhancement_factor(config: SimulationConfig, tunneling_prob: float) -> float:
    """Map legacy ``tunneling_prob`` argument to a Gamow-free enhancement factor.

    Call conventions:
    - ``tunneling_prob >= 1``: treat as phenomenological enhancement f (UQ / tests).
    - ``0 < tunneling_prob < 1``: legacy ``P_gamow × f`` from
      ``calculate_tunneling_probability``; recover ``f = tunneling_prob / P_gamow``.
    """
    tp = float(tunneling_prob)
    if not np.isfinite(tp) or tp <= 0.0:
        return 0.0
    if tp >= 1.0:
        return float(min(tp, MAX_ENHANCEMENT_FACTOR))
    p_bare = _bare_gamow_factor(config)
    if p_bare <= 0.0:
        return 0.0
    return float(min(tp / p_bare, MAX_ENHANCEMENT_FACTOR))


def calculate_reaction_rate(
    config: SimulationConfig,
    tunneling_prob: float,
    *,
    screening_energy_keV: float = 0.0,
) -> float:
    """Volumetric fusion rate R_V = (1/2) n^2 σ(E) v × f_enh [reactions m^{-3} s^{-1}].

    ``σ(E)`` from the astrophysical S-factor already includes **one** Gamow factor.
    ``tunneling_prob`` is interpreted as a Gamow-free enhancement (or legacy
    P_gamow×f — see ``_resolve_enhancement_factor``). No artificial σ floor.
    """
    n_host = config.host_material.electron_density / config.host_material.atomic_number
    n_reactant = n_host * config.loading_ratio
    T = config.temperature
    m = _get_reduced_mass_kg(config)
    v_thermal = np.sqrt(8 * KB * T / (np.pi * m))
    e_cm_kev = max(KB * T / (1e3 * E_CHARGE), 1e-6)
    reaction = (
        "D(d,n)He3" if config.reactant.name.lower() == "deuterium" else "p(d,gamma)He3"
    )
    cross_section = compute_nuclear_cross_section(
        E_keV=e_cm_kev,
        reaction=reaction,
        screening_energy_keV=float(screening_energy_keV),
    )
    sigma_nuclear = float(cross_section.cross_section_m2)
    if not np.isfinite(sigma_nuclear) or sigma_nuclear < 0.0:
        sigma_nuclear = 0.0
    f_enh = _resolve_enhancement_factor(config, tunneling_prob)
    return float(0.5 * n_reactant**2 * sigma_nuclear * v_thermal * f_enh)
