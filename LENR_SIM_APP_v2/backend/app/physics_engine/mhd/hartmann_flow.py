"""
Hartmann Flow Module
=====================

Analytical and semi-analytical solutions for MHD channel flow between
parallel walls in the presence of a transverse magnetic field.

The Hartmann problem is the canonical benchmark for MHD viscous flow and
is directly relevant to the lattice nano-gap environment during bubble
collapse where conducting electrolyte / ionised D₂O is forced through
sub-micron channels between lattice planes under a Z-pinch magnetic field.

Key results
-----------
* Hartmann velocity profile (flattened compared to Poiseuille parabolic)
* Hartmann boundary-layer thickness  δ_Ha = L / Ha
* Flow-rate modification factor
* Pressure-drop amplification
* Conducting vs. insulating wall cases
* Nano-scale quantum corrections when δ_Ha ~ lattice constant

References
----------
[1] Hartmann, J. (1937). *Theory of the laminar flow of an electrically
    conductive liquid in a homogeneous magnetic field*. Kgl. Danske
    Videnskab. Selskab, Mat.-Fys. Medd. 15(6), 1–28.
[2] Müller, U. & Bühler, L. (2001). *Magnetofluiddynamics in Channels
    and Containers*. Springer.
[3] Shercliff, J. A. (1953). *Steady motion of conducting fluids in pipes
    under transverse magnetic fields*. Proc. Camb. Phil. Soc. 49, 136.
[4] Casimir, H. B. G. (1948). "On the attraction between two perfectly
    conducting plates". Proc. K. Ned. Akad. Wet. 51, 793–795.
[5] Lifshitz, E. M. (1956). "The theory of molecular attractive forces
    between solids". Sov. Phys. JETP 2, 73–83.
"""

from __future__ import annotations

import logging
import math
from dataclasses import dataclass
from typing import Any, Dict, Optional

import numpy as np
from scipy import constants as const

from .dimensionless_parameters import compute_mhd_parameters, MHDDimensionlessParameters

logger = logging.getLogger(__name__)

MU_0: float = const.mu_0
KB: float = const.k
HBAR: float = const.hbar
E_CHARGE: float = const.e


# ---------------------------------------------------------------------------
# Data structures
# ---------------------------------------------------------------------------
@dataclass
class HartmannFlowResult:
    """Results from a Hartmann flow calculation."""

    # Velocity profile
    y_positions: np.ndarray             # normalised  y/L  ∈ [−1, 1]
    velocity_profile: np.ndarray        # v(y) / v_0

    # Scalars
    hartmann_number: float = 0.0
    boundary_layer_thickness_m: float = 0.0
    flow_rate_ratio: float = 1.0        # Q_MHD / Q_Poiseuille
    pressure_drop_ratio: float = 1.0    # ΔP_MHD / ΔP_Poiseuille
    wall_shear_stress_ratio: float = 1.0
    max_velocity_m_s: float = 0.0
    wall_type: str = "insulating"       # "insulating" or "conducting"

    # Nano-scale extras
    quantum_correction_factor: float = 1.0
    casimir_pressure_pa: float = 0.0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "hartmann_number": self.hartmann_number,
            "boundary_layer_thickness_m": self.boundary_layer_thickness_m,
            "flow_rate_ratio": self.flow_rate_ratio,
            "pressure_drop_ratio": self.pressure_drop_ratio,
            "wall_shear_stress_ratio": self.wall_shear_stress_ratio,
            "max_velocity_m_s": self.max_velocity_m_s,
            "wall_type": self.wall_type,
            "quantum_correction_factor": self.quantum_correction_factor,
            "casimir_pressure_pa": self.casimir_pressure_pa,
        }


# ---------------------------------------------------------------------------
# Core Hartmann flow calculations
# ---------------------------------------------------------------------------
def compute_hartmann_velocity_profile(
    Ha: float,
    n_points: int = 200,
    wall_type: str = "insulating",
) -> np.ndarray:
    """Compute normalised Hartmann velocity profile  v(y)/v₀.

    Parameters
    ----------
    Ha : float
        Hartmann number.
    n_points : int
        Number of grid points across the channel  (y/L ∈ [−1, 1]).
    wall_type : str
        ``"insulating"`` or ``"conducting"``.

    Returns
    -------
    (y, v) : tuple of np.ndarray
        Normalised position and velocity arrays.
    """
    y = np.linspace(-1.0, 1.0, n_points)

    if Ha < 1e-6:
        # Pure Poiseuille limit
        v = 1.0 - y**2
    elif wall_type == "insulating":
        # Insulating walls (Hartmann, 1937)
        #   v(y) = (Ha / tanh(Ha)) × [1 - cosh(Ha·y) / cosh(Ha)]
        # Normalised so that the centre-line velocity = v_0 when Ha→0.
        cosh_Ha = np.cosh(Ha)
        v = (Ha / math.tanh(Ha)) * (1.0 - np.cosh(Ha * y) / cosh_Ha)
    else:
        # Conducting walls (Shercliff, 1953) — slug-flow limit faster
        #   v(y) = 1 - cosh(Ha·y) / cosh(Ha)
        # (No tanh(Ha) pre-factor; induced currents close through walls.)
        v = 1.0 - np.cosh(Ha * y) / np.cosh(Ha)

    return y, v


def compute_hartmann_flow(
    B: float,
    L: float,
    rho: float,
    sigma: float,
    nu: float,
    dP_dx: float,
    wall_type: str = "insulating",
    n_points: int = 200,
    temperature: float = 300.0,
    enable_quantum_correction: bool = True,
) -> HartmannFlowResult:
    """Full Hartmann flow calculation for a planar channel of half-width *L*.

    Parameters
    ----------
    B : float       Transverse magnetic field (T).
    L : float       Channel half-width (m).
    rho : float     Fluid density (kg/m^3).
    sigma : float   Electrical conductivity (S/m).
    nu : float      Kinematic viscosity (m^2/s).
    dP_dx : float   Applied pressure gradient magnitude (Pa/m).
    wall_type : str  ``"insulating"`` or ``"conducting"``.
    n_points : int  Grid resolution.
    temperature : float  For nano-scale thermal / Casimir corrections (K).
    enable_quantum_correction : bool  Apply quantum confinement correction.

    Returns
    -------
    HartmannFlowResult
    """
    result = HartmannFlowResult(
        y_positions=np.zeros(n_points),
        velocity_profile=np.zeros(n_points),
        wall_type=wall_type,
    )

    if any(x <= 0 for x in (L, rho, nu)):
        return result

    # Hartmann number
    Ha = 0.0
    if sigma > 0 and rho > 0 and nu > 0:
        Ha = B * L * math.sqrt(sigma / (rho * nu))
    result.hartmann_number = Ha

    # Velocity profile
    y, v_norm = compute_hartmann_velocity_profile(Ha, n_points, wall_type)
    result.y_positions = y

    # Dimensional centre-line velocity for Poiseuille baseline
    mu = rho * nu  # dynamic viscosity (Pa·s)
    v_poiseuille_max = dP_dx * L**2 / (2.0 * mu) if mu > 0 else 0.0

    # The Hartmann profile normalisation already encodes the MHD
    # velocity reduction, but we scale to physical units:
    v_centre = v_poiseuille_max  # maximum in the Poiseuille limit
    if Ha > 1e-6 and wall_type == "insulating":
        v_centre = dP_dx * L**2 / (mu * Ha * math.tanh(Ha)) if mu > 0 else 0.0

    result.velocity_profile = v_norm * v_centre / max(np.max(np.abs(v_norm)), 1e-30) if v_centre > 0 else v_norm
    result.max_velocity_m_s = float(np.max(np.abs(result.velocity_profile)))

    # Hartmann boundary-layer thickness
    result.boundary_layer_thickness_m = L / Ha if Ha > 1e-6 else L

    # Flow-rate ratio  Q_MHD / Q_Poiseuille
    if Ha > 1e-6:
        result.flow_rate_ratio = (3.0 / Ha) * (1.0 - math.tanh(Ha) / Ha)
    else:
        result.flow_rate_ratio = 1.0

    # Pressure-drop ratio for same flow rate
    result.pressure_drop_ratio = 1.0 / result.flow_rate_ratio if result.flow_rate_ratio > 0 else 1.0

    # Wall shear stress ratio
    if Ha > 1e-6:
        result.wall_shear_stress_ratio = Ha / math.tanh(Ha)
    else:
        result.wall_shear_stress_ratio = 1.0

    # ── Nano-scale quantum corrections ─────────────────────────────────
    if enable_quantum_correction and L < 100e-9:
        # When the channel width approaches nm scale, the classical
        # Hartmann solution receives corrections from:
        # 1) Casimir pressure  P_C = −π²ℏc/(240 d⁴)   (attractive, narrowing)
        # 2) Quantum confinement of electron wave-functions
        d = 2.0 * L  # full channel width
        casimir_pressure = math.pi**2 * HBAR * const.c / (240.0 * d**4)
        result.casimir_pressure_pa = casimir_pressure

        # Correction factor: ratio of Casimir pressure to applied pressure
        P_applied = abs(dP_dx) * L
        if P_applied > 0:
            correction = 1.0 + casimir_pressure / P_applied
        else:
            correction = 1.0
        result.quantum_correction_factor = min(correction, 10.0)  # cap

    return result
