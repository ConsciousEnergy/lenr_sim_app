"""Cross section and reaction rate calculations for unified LENR model."""
import numpy as np
from scipy import constants as const
from .config import SimulationConfig
from app.physics_engine.mhd.nuclear_force_coupling import compute_nuclear_cross_section

KB = const.k
E_CHARGE = const.e
C = const.c
ALPHA = const.alpha


def _get_reduced_mass_kg(config: SimulationConfig) -> float:
    reactant_mass_kg = config.reactant.atomic_mass * const.u
    return 0.5 * reactant_mass_kg


def calculate_tunneling_probability(config: SimulationConfig, enhancement: float) -> float:
    """Calculate enhanced tunneling probability. From paper Section 2.8."""
    T = config.temperature
    m_reduced = _get_reduced_mass_kg(config)
    E = 1.5 * KB * T
    Z1 = Z2 = config.reactant.atomic_number
    r_nuclear = 1.2e-15 * (config.reactant.atomic_mass**(1/3) * 2)
    eta = Z1 * Z2 * ALPHA * np.sqrt(m_reduced * C**2 / (2 * E))
    P_gamow = np.exp(-2 * np.pi * eta)
    P_enhanced = P_gamow * enhancement
    return min(P_enhanced, 1.0)


def calculate_reaction_rate(config: SimulationConfig, tunneling_prob: float) -> float:
    """Calculate fusion reaction rate."""
    n_host = config.host_material.electron_density / config.host_material.atomic_number
    n_reactant = n_host * config.loading_ratio
    T = config.temperature
    m = _get_reduced_mass_kg(config)
    v_thermal = np.sqrt(8 * KB * T / (np.pi * m))
    E_cm_keV = max(KB * T / (1e3 * E_CHARGE), 1e-6)
    reaction = "D(d,n)He3" if config.reactant.name.lower() == "deuterium" else "p(d,gamma)He3"
    cross_section = compute_nuclear_cross_section(
        E_keV=E_cm_keV,
        reaction=reaction,
        screening_energy_keV=0.0,
    )
    sigma_nuclear = max(cross_section.cross_section_m2, 1e-32)
    rate = 0.5 * n_reactant**2 * sigma_nuclear * v_thermal * tunneling_prob
    return rate