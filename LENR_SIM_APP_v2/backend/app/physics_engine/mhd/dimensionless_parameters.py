"""
MHD Dimensionless Parameters Module
====================================

Computes the key dimensionless numbers that characterise the MHD regime at
each point in the bubble-collapse / lattice-confinement cycle.

Each parameter is accompanied by a human-readable *regime classification*
and a confidence score (0–1) indicating how deep into the regime the system
sits.  This allows the multi-scale bridge and the theory module to
automatically select the dominant physics at every scale.

References
----------
[1] Davidson, P. A. (2001). *An Introduction to Magnetohydrodynamics*.
    Cambridge University Press.
[2] Müller, U. & Bühler, L. (2001). *Magnetofluiddynamics in Channels
    and Containers*. Springer.
[3] Goedbloed, H. & Poedts, S. (2004). *Principles of
    Magnetohydrodynamics*. Cambridge University Press.
"""

from __future__ import annotations

import logging
import math
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
from scipy import constants as const

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Physical constants
# ---------------------------------------------------------------------------
MU_0: float = const.mu_0        # Vacuum permeability  (H/m)
KB: float = const.k              # Boltzmann constant    (J/K)
E_CHARGE: float = const.e        # Elementary charge     (C)
ME: float = const.m_e            # Electron mass         (kg)
MP: float = const.m_p            # Proton mass           (kg)
EPS0: float = const.epsilon_0    # Vacuum permittivity   (F/m)
C: float = const.c               # Speed of light        (m/s)


# ---------------------------------------------------------------------------
# Regime classification helpers
# ---------------------------------------------------------------------------
def _regime_score(value: float, threshold: float = 1.0) -> float:
    """Return a 0-1 confidence that *value* is well above *threshold*.

    Uses a logistic-like mapping:  score = tanh(log10(value / threshold)).
    Returns 0.5 at the threshold, → 1.0 far above, → 0.0 far below.
    """
    if value <= 0 or threshold <= 0:
        return 0.0
    ratio = value / threshold
    if ratio <= 0:
        return 0.0
    return 0.5 * (1.0 + math.tanh(math.log10(ratio)))


def _classify_ratio(value: float, name: str) -> Tuple[str, float]:
    """Classify a dimensionless ratio as 'low', 'moderate', or 'high'."""
    if value < 0.1:
        return (f"{name} << 1: dominated by diffusion / viscous effects", _regime_score(0.1 / max(value, 1e-30)))
    if value < 1.0:
        return (f"{name} ~ O(1): transitional regime", 0.5)
    if value < 10.0:
        return (f"{name} > 1: advective / EM-dominated", _regime_score(value, 1.0))
    return (f"{name} >> 1: strongly advective / EM-dominated", _regime_score(value, 1.0))


# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------
@dataclass
class MHDRegimeClassification:
    """Human-readable regime labels and confidence scores."""

    magnetic_reynolds: Tuple[str, float] = ("", 0.0)
    hartmann: Tuple[str, float] = ("", 0.0)
    lundquist: Tuple[str, float] = ("", 0.0)
    plasma_beta: Tuple[str, float] = ("", 0.0)
    hall_parameter: Tuple[str, float] = ("", 0.0)
    stuart_number: Tuple[str, float] = ("", 0.0)
    magnetic_prandtl: Tuple[str, float] = ("", 0.0)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "magnetic_reynolds": {"label": self.magnetic_reynolds[0], "confidence": self.magnetic_reynolds[1]},
            "hartmann": {"label": self.hartmann[0], "confidence": self.hartmann[1]},
            "lundquist": {"label": self.lundquist[0], "confidence": self.lundquist[1]},
            "plasma_beta": {"label": self.plasma_beta[0], "confidence": self.plasma_beta[1]},
            "hall_parameter": {"label": self.hall_parameter[0], "confidence": self.hall_parameter[1]},
            "stuart_number": {"label": self.stuart_number[0], "confidence": self.stuart_number[1]},
            "magnetic_prandtl": {"label": self.magnetic_prandtl[0], "confidence": self.magnetic_prandtl[1]},
        }


@dataclass
class MHDDimensionlessParameters:
    """Dimensionless MHD parameters for a given local state.

    All values default to 0.0 so callers can inspect which parameters
    were actually computed.
    """

    # Core MHD numbers
    magnetic_reynolds_number: float = 0.0   # Rm
    hartmann_number: float = 0.0            # Ha
    lundquist_number: float = 0.0           # S
    alfven_velocity_m_s: float = 0.0        # v_A
    plasma_beta: float = 0.0               # beta
    hall_parameter: float = 0.0            # beta_H
    stuart_number: float = 0.0             # N  (interaction parameter)
    magnetic_prandtl_number: float = 0.0   # Pm

    # Derived transport coefficients used in computation
    magnetic_diffusivity_m2_s: float = 0.0  # eta = 1/(mu_0 * sigma)
    reynolds_number: float = 0.0            # Re (hydrodynamic)

    # Regime classification
    regimes: MHDRegimeClassification = field(default_factory=MHDRegimeClassification)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "magnetic_reynolds_number": self.magnetic_reynolds_number,
            "hartmann_number": self.hartmann_number,
            "lundquist_number": self.lundquist_number,
            "alfven_velocity_m_s": self.alfven_velocity_m_s,
            "plasma_beta": self.plasma_beta,
            "hall_parameter": self.hall_parameter,
            "stuart_number": self.stuart_number,
            "magnetic_prandtl_number": self.magnetic_prandtl_number,
            "magnetic_diffusivity_m2_s": self.magnetic_diffusivity_m2_s,
            "reynolds_number": self.reynolds_number,
            "regimes": self.regimes.to_dict(),
        }


# ---------------------------------------------------------------------------
# Core computation
# ---------------------------------------------------------------------------
def compute_alfven_velocity(
    B: float,
    rho: float,
) -> float:
    """Alfvén velocity  v_A = B / sqrt(mu_0 * rho).

    Parameters
    ----------
    B : float   – Magnetic field strength (T)
    rho : float – Mass density (kg/m^3)
    """
    if rho <= 0 or B <= 0:
        return 0.0
    return B / math.sqrt(MU_0 * rho)


def compute_magnetic_diffusivity(sigma: float) -> float:
    """Magnetic diffusivity  eta = 1 / (mu_0 * sigma)  (m^2/s).

    Parameters
    ----------
    sigma : float – Electrical conductivity (S/m)
    """
    if sigma <= 0:
        return float("inf")
    return 1.0 / (MU_0 * sigma)


def compute_mhd_parameters(
    B: float,
    L: float,
    v: float,
    rho: float,
    sigma: float,
    nu: float,
    temperature: float = 300.0,
    ion_density: float = 1e28,
    collision_frequency: float = 1e13,
) -> MHDDimensionlessParameters:
    """Compute all MHD dimensionless parameters for a local state.

    Parameters
    ----------
    B : float
        Magnetic field strength (T).
    L : float
        Characteristic length scale (m).
    v : float
        Characteristic velocity (m/s).
    rho : float
        Mass density (kg/m^3).
    sigma : float
        Electrical conductivity (S/m).
    nu : float
        Kinematic viscosity (m^2/s).
    temperature : float
        Local temperature (K).  Used for plasma beta.
    ion_density : float
        Ion number density (m^-3).  Used for Hall parameter and plasma beta.
    collision_frequency : float
        Electron-ion collision frequency (Hz).  Used for Hall parameter.

    Returns
    -------
    MHDDimensionlessParameters
        Dataclass with all computed values and regime classifications.
    """
    params = MHDDimensionlessParameters()

    # Guard against non-physical inputs
    if any(x <= 0 for x in (L, rho, nu)):
        logger.warning("Non-physical input to compute_mhd_parameters: L=%s, rho=%s, nu=%s", L, rho, nu)
        return params

    # Magnetic diffusivity
    eta = compute_magnetic_diffusivity(sigma)
    params.magnetic_diffusivity_m2_s = eta if eta != float("inf") else 0.0

    # Alfvén velocity
    v_A = compute_alfven_velocity(B, rho)
    params.alfven_velocity_m_s = v_A

    # Hydrodynamic Reynolds number
    Re = v * L / nu if nu > 0 else 0.0
    params.reynolds_number = Re

    # Magnetic Reynolds number:  Rm = mu_0 * sigma * v * L
    Rm = MU_0 * sigma * v * L if sigma > 0 else 0.0
    params.magnetic_reynolds_number = Rm

    # Hartmann number:  Ha = B * L * sqrt(sigma / (rho * nu))
    Ha = 0.0
    if sigma > 0 and rho > 0 and nu > 0:
        Ha = B * L * math.sqrt(sigma / (rho * nu))
    params.hartmann_number = Ha

    # Lundquist number:  S = mu_0 * v_A * L / eta
    S = 0.0
    if eta > 0 and eta != float("inf"):
        S = MU_0 * v_A * L / eta if eta > 0 else 0.0
    params.lundquist_number = S

    # Plasma beta:  beta = 2 * mu_0 * n * k_B * T / B^2
    beta = 0.0
    if B > 0:
        P_thermal = ion_density * KB * temperature
        P_magnetic = B**2 / (2.0 * MU_0)
        beta = P_thermal / P_magnetic if P_magnetic > 0 else float("inf")
    params.plasma_beta = beta

    # Hall parameter:  beta_H = omega_c * tau_c = (e * B) / (m_e * nu_collision)
    beta_H = 0.0
    if collision_frequency > 0 and B > 0:
        omega_c = E_CHARGE * B / ME          # electron cyclotron frequency
        tau_c = 1.0 / collision_frequency    # mean free time
        beta_H = omega_c * tau_c
    params.hall_parameter = beta_H

    # Stuart number (interaction parameter):  N = Ha^2 / Re
    N = 0.0
    if Re > 0:
        N = Ha**2 / Re
    elif sigma > 0 and v > 0:
        N = sigma * B**2 * L / (rho * v)
    params.stuart_number = N

    # Magnetic Prandtl number:  Pm = nu / eta  = Rm / Re
    Pm = 0.0
    if eta > 0 and eta != float("inf"):
        Pm = nu / eta
    params.magnetic_prandtl_number = Pm

    # ── Regime classification ──────────────────────────────────────────
    regimes = MHDRegimeClassification()

    # Rm
    if Rm < 0.1:
        regimes.magnetic_reynolds = ("Rm << 1: diffusive — field lines slip through fluid", _regime_score(0.1 / max(Rm, 1e-30)))
    elif Rm < 10:
        regimes.magnetic_reynolds = ("Rm ~ O(1): transitional — partial flux freezing", 0.5)
    else:
        regimes.magnetic_reynolds = ("Rm >> 1: frozen-in flux — field compressed with fluid", _regime_score(Rm, 1.0))

    # Ha
    if Ha < 1:
        regimes.hartmann = ("Ha < 1: viscous-dominated — parabolic Poiseuille profile", _regime_score(1.0 / max(Ha, 1e-30)))
    elif Ha < 100:
        regimes.hartmann = ("Ha ~ O(10): Hartmann profile — EM flattening of velocity", 0.5 + 0.3 * math.tanh(math.log10(Ha)))
    else:
        regimes.hartmann = ("Ha >> 1: slug flow — thin Hartmann boundary layers", _regime_score(Ha, 10.0))

    # Lundquist
    if S < 1:
        regimes.lundquist = ("S < 1: resistive — reconnection faster than Alfvén transit", _regime_score(1.0 / max(S, 1e-30)))
    elif S < 1e4:
        regimes.lundquist = (f"S ~ {S:.0e}: Sweet-Parker reconnection regime", 0.5)
    else:
        regimes.lundquist = (f"S ~ {S:.0e}: Petschek / plasmoid-unstable reconnection", _regime_score(S, 1e4))

    # Plasma beta
    if beta < 0.1:
        regimes.plasma_beta = ("β << 1: magnetically dominated — field controls dynamics", _regime_score(0.1 / max(beta, 1e-30)))
    elif beta < 10:
        regimes.plasma_beta = ("β ~ O(1): equipartition — thermal and magnetic pressures comparable", 0.5)
    else:
        regimes.plasma_beta = ("β >> 1: kinetically dominated — field is a perturbation", _regime_score(beta, 1.0))

    # Hall parameter
    if beta_H < 0.1:
        regimes.hall_parameter = ("β_H << 1: resistive MHD — Hall effect negligible", _regime_score(0.1 / max(beta_H, 1e-30)))
    elif beta_H < 1.0:
        regimes.hall_parameter = ("β_H ~ O(1): transitional — Hall currents becoming important", 0.5)
    else:
        regimes.hall_parameter = ("β_H >> 1: Hall-MHD — current deflected perpendicular to E×B", _regime_score(beta_H, 1.0))

    # Stuart number
    if N < 0.1:
        regimes.stuart_number = ("N << 1: inertia-dominated — EM forces negligible", _regime_score(0.1 / max(N, 1e-30)))
    elif N < 10:
        regimes.stuart_number = ("N ~ O(1): EM forces comparable to inertia", 0.5)
    else:
        regimes.stuart_number = ("N >> 1: EM-dominated — strong MHD braking", _regime_score(N, 1.0))

    # Magnetic Prandtl
    if Pm < 1e-3:
        regimes.magnetic_prandtl = ("Pm << 1: magnetic diffusion >> viscous — typical of liquid metals", _regime_score(1e-3 / max(Pm, 1e-30)))
    elif Pm < 1:
        regimes.magnetic_prandtl = ("Pm < 1: magnetic diffusion > viscous", 0.5)
    else:
        regimes.magnetic_prandtl = ("Pm ≥ 1: viscous diffusion ≥ magnetic — rare, hot plasma", _regime_score(Pm, 1.0))

    params.regimes = regimes
    return params
