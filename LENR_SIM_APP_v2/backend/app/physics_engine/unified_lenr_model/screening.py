"""Electron screening enhancement calculation for unified LENR model."""
import numpy as np
import logging
from typing import TYPE_CHECKING
from scipy import constants as const

from .config import (
    EnhancementResult,
    get_double_layer_potential,
)

if TYPE_CHECKING:
    from .config import SimulationConfig

logger = logging.getLogger(__name__)

# Physical constants
HBAR = const.hbar
E_CHARGE = const.e
C = const.c
EPS0 = const.epsilon_0
ME = const.m_e
MP = const.m_p
KB = const.k
ALPHA = const.alpha


def calculate_electron_screening(config: "SimulationConfig") -> EnhancementResult:
    """
    Calculate electron screening enhancement.
    From paper Section 2.1: Screening reduces effective Coulomb barrier by 10-100 eV.
    """
    T = config.temperature
    n_e = config.host_material.electron_density
    if T <= 0:
        raise ValueError(f"Temperature must be positive, got {T} K")
    if n_e <= 0:
        raise ValueError(f"Electron density must be positive, got {n_e} m^-3")
    lambda_d = np.sqrt(EPS0 * KB * T / (n_e * E_CHARGE**2))
    if not np.isfinite(lambda_d) or lambda_d <= 0:
        raise ValueError(f"Invalid Debye screening length: {lambda_d} m")
    Z1, Z2 = 1, 1
    U_screen_j = Z1 * Z2 * E_CHARGE**2 / (4 * np.pi * EPS0 * lambda_d)
    U_screen_ev = U_screen_j / E_CHARGE
    E_thermal = 1.5 * KB * T / E_CHARGE
    eta = Z1 * Z2 * ALPHA * np.sqrt(MP * C**2 / (2 * E_thermal * E_CHARGE))
    E_thermal = max(E_thermal, 0.01)
    enhancement = np.exp(np.pi * eta * U_screen_ev / E_thermal)
    if not np.isfinite(enhancement):
        logger.warning("Non-finite enhancement calculated, capping to 1e6")
        enhancement = 1e6
    enhancement = min(enhancement, 1e6)
    threshold_met = U_screen_ev > 10
    return EnhancementResult(
        name="Electron Screening",
        value=enhancement,
        threshold_met=threshold_met,
        equation="f = exp(pi*eta*U_s/E)",
        parameters={"U_screen_eV": U_screen_ev, "lambda_D_nm": lambda_d * 1e9},
        category="primary",
    )