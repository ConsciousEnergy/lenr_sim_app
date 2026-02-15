"""
MHD Induction Equation Solver
==============================

Solves the generalised induction equation coupling magnetic-field evolution
to a given velocity field:

    ∂B/∂t = ∇×(v×B) − ∇×(η ∇×B) + (1/ne) ∇×(J×B)
             advection    resistive        Hall term

The solver also exposes the generalised Ohm's law:

    E + v×B = η J  +  (1/ne)(J×B)  −  (1/ne) ∇P_e
               resistive  Hall          electron pressure

Supports both **1-D radial** (spherical symmetry for bubble collapse) and
full **3-D Cartesian** modes.  In 1-D mode only the azimuthal component
B_θ(r) is evolved (appropriate for Z-pinch geometry).

References
----------
[1] Goedbloed, H. & Poedts, S. (2004). *Principles of MHD*.
[2] Huba, J. D. (2003). "Hall Magnetohydrodynamics — A Tutorial".
    Space Sci. Rev. 107, 175–190.
"""

from __future__ import annotations

import logging
import math
from dataclasses import dataclass, field
from typing import Any, Dict, Optional, Tuple

import numpy as np
from scipy import constants as const

logger = logging.getLogger(__name__)

MU_0: float = const.mu_0
E_CHARGE: float = const.e
ME: float = const.m_e
KB: float = const.k


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
@dataclass
class MHDInductionConfig:
    """Configuration for the induction equation solver."""

    # Grid
    nr: int = 200                        # radial grid points (1-D mode)
    r_min: float = 1e-9                  # inner radius (m) — avoid r=0 singularity
    r_max: float = 100e-6                # outer radius (m) — bubble scale
    # 3-D grid (used only when mode == '3d')
    nx: int = 64
    ny: int = 64
    nz: int = 64
    dx: float = 1e-7                     # grid spacing (m)

    # Physics
    sigma: float = 1e4                   # electrical conductivity (S/m)
    ion_density: float = 1e28            # ion number density (m^-3)
    include_hall: bool = True            # include Hall term
    include_electron_pressure: bool = False  # include ∇P_e term
    electron_temperature: float = 300.0  # T_e for ∇P_e (K)

    # Numerics
    cfl_safety: float = 0.4             # CFL factor < 0.5 for stability
    mode: str = "1d"                     # "1d" or "3d"


# ---------------------------------------------------------------------------
# 1-D Radial Solver  (spherical Z-pinch geometry)
# ---------------------------------------------------------------------------
class MHDInductionSolver1D:
    """Solve the 1-D radial induction equation for B_theta(r, t).

    In spherical/cylindrical symmetry the azimuthal field evolves as::

        ∂B_θ/∂t = −∂/∂r [v_r B_θ]              (advection / compression)
                  + η [∂²B_θ/∂r² + (1/r)∂B_θ/∂r − B_θ/r²]   (diffusion)
                  + Hall and electron-pressure corrections

    where J_z = (1/μ₀) (1/r) ∂(r B_θ)/∂r   (Ampere's law).
    """

    def __init__(self, config: Optional[MHDInductionConfig] = None) -> None:
        self.cfg = config or MHDInductionConfig()
        self.nr = self.cfg.nr
        self.r = np.linspace(self.cfg.r_min, self.cfg.r_max, self.nr)
        self.dr = self.r[1] - self.r[0]

        # Magnetic diffusivity
        self.eta = 1.0 / (MU_0 * self.cfg.sigma) if self.cfg.sigma > 0 else 0.0

        # State arrays
        self.B_theta = np.zeros(self.nr)           # azimuthal B (T)
        self.J_z = np.zeros(self.nr)               # axial current density (A/m^2)
        self.E_r = np.zeros(self.nr)               # radial electric field (V/m)

    # ── initialisation helpers ─────────────────────────────────────────
    def set_initial_B_theta(self, B_profile: np.ndarray) -> None:
        """Set an initial B_theta(r) profile."""
        if B_profile.shape[0] != self.nr:
            raise ValueError(f"Profile length {B_profile.shape[0]} != grid size {self.nr}")
        self.B_theta[:] = B_profile

    def set_zpinch_initial(self, I_total: float = 1.0) -> None:
        """Initialise with ideal Z-pinch field  B_θ = μ₀ I / (2πr)."""
        self.B_theta = MU_0 * I_total / (2.0 * np.pi * self.r)

    # ── physics computations ───────────────────────────────────────────
    def _compute_current_density(self) -> None:
        """J_z = (1/μ₀)(1/r) ∂(r B_θ)/∂r  via central differences."""
        rB = self.r * self.B_theta
        # central difference for interior, one-sided at boundaries
        d_rB_dr = np.zeros(self.nr)
        d_rB_dr[1:-1] = (rB[2:] - rB[:-2]) / (2.0 * self.dr)
        d_rB_dr[0] = (rB[1] - rB[0]) / self.dr
        d_rB_dr[-1] = (rB[-1] - rB[-2]) / self.dr
        self.J_z = d_rB_dr / (MU_0 * self.r)

    def _compute_lorentz_body_force(self) -> np.ndarray:
        """Radial J×B force density  f_r = −J_z B_θ  (inward for pinch)."""
        return -self.J_z * self.B_theta

    def step(self, dt: float, v_r: np.ndarray) -> Dict[str, Any]:
        """Advance B_theta by one time-step.

        Parameters
        ----------
        dt : float
            Time step (s).
        v_r : np.ndarray
            Radial velocity profile v_r(r) (m/s).  Negative = inward collapse.

        Returns
        -------
        dict with keys: 'B_theta', 'J_z', 'J_cross_B_r', 'dt_used'
        """
        r = self.r
        dr = self.dr
        B = self.B_theta.copy()
        eta = self.eta

        # ── CFL-limited time step ──────────────────────────────────────
        v_max = np.max(np.abs(v_r)) + 1e-30
        dt_adv = self.cfg.cfl_safety * dr / v_max
        dt_diff = self.cfg.cfl_safety * dr**2 / (2.0 * eta) if eta > 0 else float("inf")
        dt_used = min(dt, dt_adv, dt_diff)

        # ── Advection:  −∂/∂r [v_r B_θ] ───────────────────────────────
        flux = v_r * B
        dflux_dr = np.zeros(self.nr)
        dflux_dr[1:-1] = (flux[2:] - flux[:-2]) / (2.0 * dr)
        dflux_dr[0] = (flux[1] - flux[0]) / dr
        dflux_dr[-1] = (flux[-1] - flux[-2]) / dr
        advection = -dflux_dr

        # ── Resistive diffusion: η [∂²B/∂r² + (1/r)∂B/∂r − B/r²] ────
        d2B_dr2 = np.zeros(self.nr)
        dB_dr = np.zeros(self.nr)
        d2B_dr2[1:-1] = (B[2:] - 2.0 * B[1:-1] + B[:-2]) / dr**2
        dB_dr[1:-1] = (B[2:] - B[:-2]) / (2.0 * dr)
        # boundaries (one-sided)
        dB_dr[0] = (B[1] - B[0]) / dr
        dB_dr[-1] = (B[-1] - B[-2]) / dr
        d2B_dr2[0] = (B[1] - 2.0 * B[0]) / dr**2      # ghost = 0
        d2B_dr2[-1] = (-2.0 * B[-1] + B[-2]) / dr**2

        diffusion = eta * (d2B_dr2 + dB_dr / r - B / r**2)

        # ── Hall term  (optional) ──────────────────────────────────────
        hall = np.zeros(self.nr)
        if self.cfg.include_hall and self.cfg.ion_density > 0:
            self._compute_current_density()
            # Hall term ≈ (1/ne) ∂/∂r [J_z B_θ]
            JB = self.J_z * B
            d_JB_dr = np.zeros(self.nr)
            d_JB_dr[1:-1] = (JB[2:] - JB[:-2]) / (2.0 * dr)
            d_JB_dr[0] = (JB[1] - JB[0]) / dr
            d_JB_dr[-1] = (JB[-1] - JB[-2]) / dr
            hall = d_JB_dr / (self.cfg.ion_density * E_CHARGE)

        # ── Electron pressure term (optional) ──────────────────────────
        e_press = np.zeros(self.nr)
        if self.cfg.include_electron_pressure and self.cfg.ion_density > 0:
            # ∇P_e ≈ n_e k_B T_e  →  ∂P_e/∂r (assume uniform T_e, varying n_e ~ n_i)
            # For simplicity, model as n_e proportional to |J_z| / (e v_thermal)
            # This is a placeholder — full two-fluid model would require separate
            # electron energy equation.
            pass  # TODO: implement full two-fluid electron pressure

        # ── Time integration (explicit Euler) ──────────────────────────
        dB_dt = advection + diffusion + hall + e_press
        self.B_theta = B + dt_used * dB_dt

        # Enforce B=0 at inner boundary (axis regularity)
        self.B_theta[0] = 0.0
        # Outer boundary: free outflow (zero gradient)
        self.B_theta[-1] = self.B_theta[-2]

        # Update derived quantities
        self._compute_current_density()
        J_cross_B_r = self._compute_lorentz_body_force()

        return {
            "B_theta": self.B_theta.copy(),
            "J_z": self.J_z.copy(),
            "J_cross_B_r": J_cross_B_r,
            "dt_used": dt_used,
        }

    # ── Diagnostics ────────────────────────────────────────────────────
    def get_magnetic_energy(self) -> float:
        """Total magnetic energy  ∫ B²/(2μ₀) 2πr dr."""
        integrand = self.B_theta**2 / (2.0 * MU_0) * 2.0 * np.pi * self.r
        return float(np.trapz(integrand, self.r))

    def get_total_current(self) -> float:
        """Total axial current  I = ∫ J_z 2πr dr."""
        integrand = self.J_z * 2.0 * np.pi * self.r
        return float(np.trapz(integrand, self.r))

    def get_summary(self) -> Dict[str, Any]:
        return {
            "B_theta_max_T": float(np.max(np.abs(self.B_theta))),
            "J_z_max_A_m2": float(np.max(np.abs(self.J_z))),
            "magnetic_energy_J": self.get_magnetic_energy(),
            "total_current_A": self.get_total_current(),
            "grid_points": self.nr,
            "r_min_m": float(self.r[0]),
            "r_max_m": float(self.r[-1]),
        }


# ---------------------------------------------------------------------------
# 3-D Cartesian Solver  (for full spatial coupling)
# ---------------------------------------------------------------------------
class MHDInductionSolver3D:
    """Solve the 3-D induction equation on a Cartesian grid.

    Uses a simple second-order central-difference / explicit-Euler scheme.
    For production-quality 3-D MHD a spectral or constrained-transport
    scheme would be preferred; this implementation prioritises correctness
    and clarity for the LENR testbed.
    """

    def __init__(self, config: Optional[MHDInductionConfig] = None) -> None:
        cfg = config or MHDInductionConfig(mode="3d")
        self.cfg = cfg
        self.nx, self.ny, self.nz = cfg.nx, cfg.ny, cfg.nz
        self.dx = cfg.dx
        self.eta = 1.0 / (MU_0 * cfg.sigma) if cfg.sigma > 0 else 0.0

        # B field components  (3, nx, ny, nz)
        self.B = np.zeros((3, self.nx, self.ny, self.nz))
        # Current density  J = (1/mu_0) curl(B)
        self.J = np.zeros_like(self.B)

    def _curl(self, F: np.ndarray) -> np.ndarray:
        """Compute curl of a 3-component vector field using central differences."""
        dx = self.dx
        curl = np.zeros_like(F)
        # curl_x = dFz/dy - dFy/dz
        curl[0] = (np.roll(F[2], -1, axis=1) - np.roll(F[2], 1, axis=1)) / (2 * dx) \
                 - (np.roll(F[1], -1, axis=2) - np.roll(F[1], 1, axis=2)) / (2 * dx)
        # curl_y = dFx/dz - dFz/dx
        curl[1] = (np.roll(F[0], -1, axis=2) - np.roll(F[0], 1, axis=2)) / (2 * dx) \
                 - (np.roll(F[2], -1, axis=0) - np.roll(F[2], 1, axis=0)) / (2 * dx)
        # curl_z = dFy/dx - dFx/dy
        curl[2] = (np.roll(F[1], -1, axis=0) - np.roll(F[1], 1, axis=0)) / (2 * dx) \
                 - (np.roll(F[0], -1, axis=1) - np.roll(F[0], 1, axis=1)) / (2 * dx)
        return curl

    @staticmethod
    def _cross(A: np.ndarray, B: np.ndarray) -> np.ndarray:
        """Cross product of two 3-component vector fields."""
        result = np.zeros_like(A)
        result[0] = A[1] * B[2] - A[2] * B[1]
        result[1] = A[2] * B[0] - A[0] * B[2]
        result[2] = A[0] * B[1] - A[1] * B[0]
        return result

    def _compute_current(self) -> None:
        """J = (1/μ₀) ∇×B"""
        self.J = self._curl(self.B) / MU_0

    def step(self, dt: float, velocity: np.ndarray) -> Dict[str, Any]:
        """Advance B by one time-step given velocity field (3, nx, ny, nz).

        Returns dict with 'B', 'J', 'J_cross_B', 'dt_used'.
        """
        dx = self.dx
        B = self.B

        # CFL
        v_max = float(np.max(np.abs(velocity))) + 1e-30
        dt_adv = self.cfg.cfl_safety * dx / v_max
        dt_diff = self.cfg.cfl_safety * dx**2 / (2.0 * self.eta) if self.eta > 0 else float("inf")
        dt_used = min(dt, dt_adv, dt_diff)

        # Advection:  ∇×(v×B)
        vxB = self._cross(velocity, B)
        advection = self._curl(vxB)

        # Resistive diffusion: −∇×(η ∇×B) = −η ∇×J*μ₀ ... simplify to η∇²B
        # Using vector identity: ∇×(∇×B) = ∇(∇·B) − ∇²B, and ∇·B = 0
        laplacian_B = np.zeros_like(B)
        for comp in range(3):
            for axis in range(3):
                laplacian_B[comp] += (
                    np.roll(B[comp], -1, axis=axis)
                    - 2.0 * B[comp]
                    + np.roll(B[comp], 1, axis=axis)
                ) / dx**2
        diffusion = self.eta * laplacian_B

        # Hall term (optional)
        hall = np.zeros_like(B)
        if self.cfg.include_hall and self.cfg.ion_density > 0:
            self._compute_current()
            JxB = self._cross(self.J, B)
            hall = self._curl(JxB) / (self.cfg.ion_density * E_CHARGE)

        # Time integration
        dB_dt = advection + diffusion + hall
        self.B = B + dt_used * dB_dt

        # Update current density
        self._compute_current()
        JxB_force = self._cross(self.J, self.B)

        return {
            "B": self.B.copy(),
            "J": self.J.copy(),
            "J_cross_B": JxB_force,
            "dt_used": dt_used,
        }

    def get_summary(self) -> Dict[str, Any]:
        B_mag = np.sqrt(np.sum(self.B**2, axis=0))
        return {
            "B_max_T": float(np.max(B_mag)),
            "B_mean_T": float(np.mean(B_mag)),
            "magnetic_energy_J": float(np.sum(B_mag**2 / (2.0 * MU_0)) * self.dx**3),
        }
