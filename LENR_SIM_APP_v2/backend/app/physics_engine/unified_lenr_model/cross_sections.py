"""Cross section and reaction rate calculations for unified LENR model."""
import numpy as np
from scipy import constants as const
from .config import SimulationConfig

KB = const.k
E_CHARGE = const.e
C = const.c
ALPHA = const.alpha


def calculate_tunneling_probability(config: SimulationConfig, enhancement: float) -> float:
    """Calculate enhanced tunneling probability. From paper Section 2.8."""
    T = config.temperature
    m_reduced = config.reactant.atomic_mass * const.u / 2
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
    m = config.reactant.atomic_mass * const.u
    v_thermal = np.sqrt(8 * KB * T / (np.pi * m))
    sigma_nuclear = 1e-28
    rate = 0.5 * n_reactant**2 * sigma_nuclear * v_thermal * tunneling_prob
    return rate