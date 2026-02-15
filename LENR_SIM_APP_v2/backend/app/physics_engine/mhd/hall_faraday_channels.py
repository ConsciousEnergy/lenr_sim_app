"""
Hall & Faraday Channel Physics
================================

Implements the anisotropic conductivity tensor and channel-type MHD
interactions that arise when the Hall parameter β_H = ω_c τ_c becomes
significant (β_H ≳ 0.1).

Hall Channel
~~~~~~~~~~~~
When β_H > 1 the current is deflected perpendicular to both **E** and **B**,
requiring the full conductivity tensor rather than scalar Ohm's law.

Faraday Channel
~~~~~~~~~~~~~~~
When conducting fluid moves perpendicular to **B** (as during radial bubble
collapse cutting through a Z-pinch field), an EMF is generated that drives
axial / azimuthal currents — the Faraday-type MHD interaction.

During bubble collapse these two effects couple:
1. Faraday EMF from the collapsing shell cutting B-field lines
2. Hall currents deflecting the resulting current sheet
3. Self-consistent B-field amplification through flux compression

References
----------
[1] Sutton, G. W. & Sherman, A. (1965). *Engineering Magnetohydrodynamics*.
    McGraw-Hill.
[2] Rosa, R. J. (1987). *Magnetohydrodynamic Energy Conversion*. Hemisphere.
[3] Huba, J. D. (2003). "Hall MHD — A Tutorial". Space Sci. Rev. 107.
"""

from __future__ import annotations

import logging
import math
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
from scipy import constants as const

logger = logging.getLogger(__name__)

MU_0: float = const.mu_0
E_CHARGE: float = const.e
ME: float = const.m_e
MP: float = const.m_p
KB: float = const.k


# ═══════════════════════════════════════════════════════════════════════════
#  Hall Conductivity Tensor
# ═══════════════════════════════════════════════════════════════════════════
@dataclass
class HallConductivityResult:
    """Anisotropic conductivity tensor and derived quantities."""

    # 3×3 conductivity tensor (S/m)
    sigma_tensor: np.ndarray = field(default_factory=lambda: np.eye(3))

    # Scalar components
    sigma_parallel: float = 0.0         # σ_‖  along B
    sigma_pedersen: float = 0.0         # σ_P  perpendicular to B, along E⊥
    sigma_hall: float = 0.0             # σ_H  perpendicular to both E and B

    # Dimensionless
    hall_parameter: float = 0.0         # β_H = ω_c τ_c
    ion_slip_factor: float = 0.0        # α_i = β_i² / (1 + β_i²)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "sigma_parallel": self.sigma_parallel,
            "sigma_pedersen": self.sigma_pedersen,
            "sigma_hall": self.sigma_hall,
            "hall_parameter": self.hall_parameter,
            "ion_slip_factor": self.ion_slip_factor,
        }


def compute_hall_conductivity(
    sigma_0: float,
    B: float,
    collision_frequency: float = 1e13,
    ion_mass: float = MP,
    ion_collision_frequency: Optional[float] = None,
) -> HallConductivityResult:
    """Compute the full anisotropic conductivity tensor.

    In a magnetic field the scalar conductivity σ₀ is replaced by a tensor::

        σ_ij = σ₀/(1+β_H²) × [[1,     −β_H,  0         ],
                                 [β_H,    1,    0         ],
                                 [0,      0,    1+β_H²    ]]

    with **B** along the z-axis.  The three independent components are:

    * σ_‖  = σ₀             (parallel to **B** — unaffected)
    * σ_P  = σ₀/(1+β_H²)    (Pedersen — along E⊥)
    * σ_H  = σ₀ β_H/(1+β_H²) (Hall — perpendicular to both)

    Parameters
    ----------
    sigma_0 : float
        Isotropic (zero-field) electrical conductivity (S/m).
    B : float
        Magnetic field magnitude (T).
    collision_frequency : float
        Electron–ion/neutral collision frequency (Hz).
    ion_mass : float
        Ion mass (kg).  Default = proton mass.
    ion_collision_frequency : float or None
        Ion–neutral collision frequency (Hz).  If None, estimated as
        ``collision_frequency × m_e / ion_mass``.
    """
    result = HallConductivityResult()

    if sigma_0 <= 0 or B <= 0:
        result.sigma_parallel = sigma_0
        result.sigma_tensor = np.eye(3) * sigma_0
        return result

    # Electron Hall parameter
    omega_ce = E_CHARGE * B / ME
    tau_e = 1.0 / collision_frequency if collision_frequency > 0 else 0.0
    beta_H = omega_ce * tau_e
    result.hall_parameter = beta_H

    # Ion Hall parameter & slip factor
    if ion_collision_frequency is None:
        ion_collision_frequency = collision_frequency * ME / ion_mass
    omega_ci = E_CHARGE * B / ion_mass
    tau_i = 1.0 / ion_collision_frequency if ion_collision_frequency > 0 else 0.0
    beta_i = omega_ci * tau_i
    result.ion_slip_factor = beta_i**2 / (1.0 + beta_i**2)

    # Conductivity components
    denom = 1.0 + beta_H**2
    result.sigma_parallel = sigma_0
    result.sigma_pedersen = sigma_0 / denom
    result.sigma_hall = sigma_0 * beta_H / denom

    # Tensor (B along z)
    result.sigma_tensor = np.array([
        [result.sigma_pedersen,  -result.sigma_hall,     0.0],
        [result.sigma_hall,       result.sigma_pedersen,  0.0],
        [0.0,                     0.0,                    result.sigma_parallel],
    ])

    return result


def compute_hall_current_density(
    E: np.ndarray,
    v: np.ndarray,
    B: np.ndarray,
    sigma_0: float,
    collision_frequency: float = 1e13,
) -> np.ndarray:
    """Compute Hall-modified current density  **J** = σ̄ · (**E** + **v**×**B**).

    Parameters
    ----------
    E : np.ndarray  shape (3,) — electric field (V/m)
    v : np.ndarray  shape (3,) — velocity (m/s)
    B : np.ndarray  shape (3,) — magnetic field (T)
    sigma_0 : float — isotropic conductivity (S/m)
    collision_frequency : float — electron collision frequency (Hz)

    Returns
    -------
    J : np.ndarray  shape (3,) — current density (A/m^2)
    """
    B_mag = float(np.linalg.norm(B))
    if B_mag < 1e-30:
        # No B → isotropic Ohm's law
        return sigma_0 * (E + np.cross(v, B))

    # Rotate to B-aligned frame, apply tensor, rotate back
    b_hat = B / B_mag

    hall_result = compute_hall_conductivity(sigma_0, B_mag, collision_frequency)

    # Effective electric field in the fluid frame
    E_eff = E + np.cross(v, B)

    # Decompose E_eff into parallel and perpendicular components
    E_par = np.dot(E_eff, b_hat) * b_hat
    E_perp = E_eff - E_par

    # Pedersen current (along E_perp)
    J_pedersen = hall_result.sigma_pedersen * E_perp

    # Hall current (perpendicular to both E_perp and B)
    J_hall = hall_result.sigma_hall * np.cross(b_hat, E_perp)

    # Parallel current
    J_par = hall_result.sigma_parallel * E_par

    return J_par + J_pedersen + J_hall


# ═══════════════════════════════════════════════════════════════════════════
#  Faraday Channel Physics
# ═══════════════════════════════════════════════════════════════════════════
@dataclass
class FaradayChannelResult:
    """Results from a Faraday-type MHD interaction."""

    faraday_emf_V: float = 0.0
    loading_parameter_K: float = 0.0
    electrical_efficiency: float = 0.0
    body_force_N_m3: float = 0.0        # MHD braking force density
    power_extracted_W_m3: float = 0.0
    power_dissipated_W_m3: float = 0.0
    induced_current_A_m2: float = 0.0
    channel_type: str = "continuous"     # "continuous" or "segmented"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "faraday_emf_V": self.faraday_emf_V,
            "loading_parameter_K": self.loading_parameter_K,
            "electrical_efficiency": self.electrical_efficiency,
            "body_force_N_m3": self.body_force_N_m3,
            "power_extracted_W_m3": self.power_extracted_W_m3,
            "power_dissipated_W_m3": self.power_dissipated_W_m3,
            "induced_current_A_m2": self.induced_current_A_m2,
            "channel_type": self.channel_type,
        }


def compute_faraday_emf(
    v: float,
    B: float,
    channel_length: float,
) -> float:
    """Faraday EMF  =  ∫ (v × B) · dl  ≈  v · B · L  for uniform fields.

    Parameters
    ----------
    v : float   Fluid velocity perpendicular to B (m/s).
    B : float   Magnetic field strength (T).
    channel_length : float   Interaction length (m).
    """
    return abs(v * B * channel_length)


def compute_faraday_channel(
    v: float,
    B: float,
    sigma: float,
    channel_length: float,
    channel_width: float,
    loading_parameter: float = 0.5,
    hall_parameter: float = 0.0,
    channel_type: str = "continuous",
    n_segments: int = 1,
) -> FaradayChannelResult:
    """Compute Faraday MHD channel interaction.

    Models the interaction of a conducting fluid flowing perpendicular to
    a transverse magnetic field — the geometry that arises during radial
    bubble collapse through a Z-pinch field.

    Parameters
    ----------
    v : float            Flow velocity (m/s).
    B : float            Magnetic field (T).
    sigma : float        Electrical conductivity (S/m).
    channel_length : float  Interaction length (m) — radial extent.
    channel_width : float   Channel width (m) — gap between walls.
    loading_parameter : float
        K = E_load / (v·B), range [0, 1].  K=0 is short circuit,
        K=1 is open circuit, K≈0.5 maximises power extraction.
    hall_parameter : float
        β_H.  If > 0, modifies effective conductivity.
    channel_type : str
        ``"continuous"`` or ``"segmented"``.
    n_segments : int
        Number of electrode segments (for segmented Faraday channels).
    """
    result = FaradayChannelResult(channel_type=channel_type)

    if any(x <= 0 for x in (abs(v), B, sigma, channel_length, channel_width)):
        return result

    K = max(0.0, min(1.0, loading_parameter))
    result.loading_parameter_K = K

    # Effective conductivity (with Hall correction)
    if hall_parameter > 0:
        sigma_eff = sigma / (1.0 + hall_parameter**2)
    else:
        sigma_eff = sigma

    # For segmented channels, Hall short-circuit is eliminated per-segment
    if channel_type == "segmented" and n_segments > 1:
        # Each segment sees  β_H_segment ≈ β_H / n_segments (approximately)
        beta_seg = hall_parameter / n_segments
        sigma_eff = sigma / (1.0 + beta_seg**2)

    # Faraday EMF
    EMF = compute_faraday_emf(v, B, channel_length)
    result.faraday_emf_V = EMF

    # Induced current density  J = σ_eff × (1−K) × v × B
    J = sigma_eff * (1.0 - K) * abs(v) * B
    result.induced_current_A_m2 = J

    # Body force (MHD braking)  F = J × B
    F_body = J * B
    result.body_force_N_m3 = F_body

    # Electrical efficiency  η = K(1−K)
    result.electrical_efficiency = K * (1.0 - K)

    # Power densities (W/m³)
    P_total = sigma_eff * (abs(v) * B)**2
    result.power_extracted_W_m3 = K * (1.0 - K) * P_total
    result.power_dissipated_W_m3 = (1.0 - K)**2 * P_total

    return result


# ═══════════════════════════════════════════════════════════════════════════
#  Bubble-Collapse MHD Interaction
# ═══════════════════════════════════════════════════════════════════════════
@dataclass
class BubbleCollapseMHDResult:
    """Combined Hall + Faraday analysis for a collapsing bubble shell."""

    faraday: FaradayChannelResult = field(default_factory=FaradayChannelResult)
    hall: HallConductivityResult = field(default_factory=HallConductivityResult)
    flux_compression_ratio: float = 1.0
    B_compressed_T: float = 0.0
    shell_current_A: float = 0.0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "faraday": self.faraday.to_dict(),
            "hall": self.hall.to_dict(),
            "flux_compression_ratio": self.flux_compression_ratio,
            "B_compressed_T": self.B_compressed_T,
            "shell_current_A": self.shell_current_A,
        }


def compute_bubble_collapse_mhd(
    v_collapse: float,
    B_initial: float,
    R_initial: float,
    R_current: float,
    sigma: float,
    shell_thickness: float,
    collision_frequency: float = 1e13,
) -> BubbleCollapseMHDResult:
    """Analyse the MHD interaction during bubble collapse.

    As the bubble shell implodes, it:
    1. Compresses the trapped magnetic flux  →  B amplification
    2. Cuts field lines  →  Faraday EMF drives shell currents
    3. Hall effect deflects those currents

    Parameters
    ----------
    v_collapse : float      Radial collapse velocity (m/s, positive inward).
    B_initial : float       Initial magnetic field (T).
    R_initial : float       Initial bubble radius (m).
    R_current : float       Current bubble radius (m).
    sigma : float           Shell conductivity (S/m).
    shell_thickness : float Shell thickness (m).
    collision_frequency : float  Electron collision frequency (Hz).
    """
    result = BubbleCollapseMHDResult()

    if R_current <= 0 or R_initial <= 0:
        return result

    # Flux compression: B ∝ 1/R² (cylindrical) or 1/R³ (spherical)
    # Use cylindrical (2D) approximation for the azimuthal Z-pinch field
    compression_ratio = (R_initial / R_current)**2
    result.flux_compression_ratio = compression_ratio
    B_now = B_initial * compression_ratio
    result.B_compressed_T = B_now

    # Hall conductivity at compressed field
    result.hall = compute_hall_conductivity(sigma, B_now, collision_frequency)

    # Faraday interaction — shell moving inward through B
    result.faraday = compute_faraday_channel(
        v=abs(v_collapse),
        B=B_now,
        sigma=sigma,
        channel_length=shell_thickness,
        channel_width=2.0 * math.pi * R_current,  # circumference
        loading_parameter=0.0,  # short-circuit (closed shell)
        hall_parameter=result.hall.hall_parameter,
        channel_type="continuous",
    )

    # Total shell current
    result.shell_current_A = result.faraday.induced_current_A_m2 * shell_thickness

    return result
