"""
Coherence Length Calculations for LENR Simulation

Implements electronic vs nuclear coherence lengths per unified theoretical framework:
- Electronic coherence: xi_e = hbar * v_F / (delta_E * e) for electron-mediated effects
- Nuclear coherence: xi_D = hbar * v_D / (delta_E * e) for direct nuclear coherence

Phase 1.4: Distinguish electronic vs nuclear coherence lengths.
"""

from scipy import constants as const

# Reference values (for validation/reference)
XI_E_TYPICAL_NM = 6.6   # nm, for v_F=1e6 m/s, delta_E=0.1 eV
XI_D_TYPICAL_PM = 7.2   # pm, for deuteron thermal v_D ~ 1100 m/s at 300K, delta_E=0.1 eV

HBAR = const.hbar  # J*s
E_CHARGE = const.e  # C
KB = const.k       # J/K
M_D = 2.01410177811 * const.atomic_mass  # Deuterium mass, kg


def calculate_electronic_coherence_length(v_F_m_s: float, delta_E_eV: float) -> float:
    """
    Electronic coherence length: xi_e = hbar * v_F / (delta_E * e).

    For v_F=1e6 m/s, delta_E=0.1 eV: xi_e ~ 6.6e-9 m.

    Args:
        v_F_m_s: Fermi velocity in m/s
        delta_E_eV: Energy gap in eV

    Returns:
        Coherence length in meters
    """
    if delta_E_eV <= 0 or v_F_m_s <= 0:
        return 0.0
    delta_E_J = delta_E_eV * E_CHARGE
    return HBAR * v_F_m_s / delta_E_J


def calculate_nuclear_coherence_length(v_D_m_s: float, delta_E_eV: float) -> float:
    """
    Nuclear coherence length: xi_D = hbar * v_D / (delta_E * e).

    For deuteron thermal v_D ~ 1100 m/s at 300K, delta_E=0.1 eV: xi_D ~ 7.2e-12 m.

    Args:
        v_D_m_s: Deuteron velocity in m/s
        delta_E_eV: Energy gap in eV

    Returns:
        Coherence length in meters
    """
    if delta_E_eV <= 0 or v_D_m_s <= 0:
        return 0.0
    delta_E_J = delta_E_eV * E_CHARGE
    return HBAR * v_D_m_s / delta_E_J


def get_deuteron_thermal_velocity(T_K: float) -> float:
    """
    Deuteron thermal velocity: v = sqrt(k_B * T / m_D).

    At 300K: v_D ~ 1100 m/s.

    Args:
        T_K: Temperature in Kelvin

    Returns:
        Thermal velocity in m/s
    """
    if T_K <= 0:
        return 0.0
    return (KB * T_K / M_D) ** 0.5
