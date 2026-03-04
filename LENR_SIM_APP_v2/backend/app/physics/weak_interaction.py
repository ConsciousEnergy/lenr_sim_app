"""
Weak interaction cross-section for neutron formation (p + e- -> n + nu_e).

Inverse beta decay threshold: 0.782 MeV (mass difference m_n - m_p + m_e in energy units).
Cross-section follows Fermi theory: sigma ~ G_F^2 * E_nu^2 / (pi * (hbar*c)^4) in SI (G_F in GeV^-2, conversion to m^2 via (hbar*c)^2).

References:
    - Weak interaction, inverse beta decay
    - 0.782 MeV threshold for p + e- -> n + nu_e
"""

from __future__ import annotations

import math
from scipy import constants as const

# Physical constants (SI)
HBAR = const.hbar
C = const.c
KB = const.k
E_CHARGE = const.e
M_E = const.m_e
M_P = const.m_p

# Fermi constant in GeV^-2 (PDG)
G_F_GEV_INV2 = 1.166e-5

# p + e- -> n + nu_e threshold: Q = (m_n - m_p - m_e)*c^2 = 0.782 MeV
THRESHOLD_ELECTRON_MEV = 0.782

# hbar*c in GeV*m for conversion (0.197 GeV*fm = 1.97e-16 GeV*m)
HBAR_C_GEV_M = 1.973269804e-16  # GeV*m


def calculate_weak_interaction_cross_section(E_nu_eV: float) -> float:
    """
    Weak interaction cross-section for inverse beta decay.

    sigma ~ G_F^2 * E_nu^2 / (pi * (hbar*c)^2) in SI.
    G_F = 1.166e-5 GeV^-2. Returns sigma in m^2 (~10^-47 at ~1 MeV).

    Args:
        E_nu_eV: Neutrino (or equivalent) energy in eV.

    Returns:
        Cross-section in m^2.
    """
    E_nu_GeV = E_nu_eV / 1e9  # eV -> GeV (1 GeV = 1e9 eV)
    sigma_GeV_inv2 = (G_F_GEV_INV2**2) * (E_nu_GeV**2) / math.pi
    # Convert GeV^-2 to m^2: 1 GeV^-2 = (hbar*c)^2 in GeV^2*m^2
    sigma_m2 = sigma_GeV_inv2 * (HBAR_C_GEV_M**2)
    return sigma_m2


def calculate_neutron_formation_rate(
    n_p: float,
    n_e: float,
    T: float,
    sigma: float | None = None,
) -> float:
    """
    Neutron formation rate via p + e- -> n + nu_e.

    Uses Boltzmann suppression exp(-0.782e6*e/(k_B*T)), multiplies by n_p*n_e*sigma*v_th.
    If sigma is None, uses calculate_weak_interaction_cross_section at E_nu ~ 1 MeV.

    Args:
        n_p: Proton number density (m^-3).
        n_e: Electron number density (m^-3).
        T: Temperature (K).
        sigma: Cross-section (m^2). If None, computed at ~1 MeV.

    Returns:
        Formation rate per unit volume (m^-3 s^-1).
    """
    if sigma is None:
        sigma = calculate_weak_interaction_cross_section(1e6)  # ~1 MeV
    # Boltzmann suppression: exp(-E_threshold / (k_B*T))
    E_threshold_J = THRESHOLD_ELECTRON_MEV * 1e6 * E_CHARGE
    boltzmann = math.exp(-E_threshold_J / (KB * T)) if T > 0 else 0.0
    # Thermal velocity for electron-proton relative motion (reduced mass ~ m_e)
    v_th = math.sqrt(2.0 * KB * T / M_E) if T > 0 else 0.0
    rate = n_p * n_e * sigma * v_th * boltzmann
    return rate
