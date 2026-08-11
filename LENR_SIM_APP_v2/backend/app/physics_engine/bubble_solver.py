"""
Modified Rayleigh-Plesset Solver for LENR Bubble Dynamics.

Implements the paper Section 3.2 equation:
  R*R̈ + (3/2)*Ṙ² = (1/ρ)(P_bubble - P_∞ - 2σ/R - 4μṘ/R + ε₀E²/2)

Electric field term ε₀E²/2 contributes to pressure during collapse,
modeling double-layer fields in electrolytic LENR configurations.
"""

import numpy as np
from scipy.integrate import solve_ivp
from typing import Tuple, Optional
from dataclasses import dataclass

from scipy import constants as const

EPS0 = const.epsilon_0


@dataclass
class RayleighPlessetParams:
    """Physical parameters for modified Rayleigh-Plesset equation."""
    rho: float = 1000.0       # Liquid density kg/m³
    sigma: float = 0.072      # Surface tension N/m
    mu: float = 1e-3          # Dynamic viscosity Pa·s
    P_inf: float = 101325.0   # Ambient pressure Pa
    gamma: float = 5.0 / 3.0  # Adiabatic index (monatomic gas)
    E_field: float = 0.0      # Electric field V/m (optional)
    drive_factor: float = 2.0  # P_inf_eff = P_inf * drive_factor to simulate collapse


def _rayleigh_plesset_rhs(
    t: float,
    y: np.ndarray,
    R0: float,
    P_gas0: float,
    params: RayleighPlessetParams,
) -> np.ndarray:
    """
    RHS of modified Rayleigh-Plesset: d/dt [R, Ṙ].

    y = [R, R_dot]
    R_ddot = (1/R) * (1/rho) * (P_gas - P_inf - 2*sigma/R - 4*mu*R_dot/R + eps0*E^2/2)
             - (3/2) * R_dot^2 / R

    Gas pressure: P_gas = P_gas0 * (R0/R)^(3*gamma) for adiabatic collapse.
    """
    R, R_dot = y
    if R <= 1e-12:
        return np.array([0.0, 0.0])

    P_gas = P_gas0 * (R0 / R) ** (3 * params.gamma)
    P_electric = 0.5 * EPS0 * params.E_field**2
    P_surface = 2 * params.sigma / R
    P_viscous = 4 * params.mu * R_dot / R
    P_inf_eff = params.P_inf * params.drive_factor

    delta_P = P_gas - P_inf_eff - P_surface - P_viscous + P_electric

    R_ddot = (delta_P / params.rho) / R - 1.5 * (R_dot**2) / R

    return np.array([R_dot, R_ddot])


def solve_modified_rayleigh_plesset(
    R0: float,
    t_span: Tuple[float, float],
    params: Optional[RayleighPlessetParams] = None,
    R_dot0: float = 0.0,
    max_step: float = 1e-8,
    events=None,
) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
    """
    Numerically solve the modified Rayleigh-Plesset equation.

    Args:
        R0: Initial bubble radius (m)
        t_span: (t_start, t_end) in seconds
        params: RayleighPlessetParams; if None, uses defaults
        R_dot0: Initial radial velocity (m/s), typically 0
        max_step: Maximum ODE step size
        events: Optional callable(s) for event detection (e.g., minimum R)

    Returns:
        t: Time array (s)
        R: Radius array (m)
        R_dot: Radial velocity array (m/s)
    """
    params = params or RayleighPlessetParams()
    P_gas0 = params.P_inf + 2 * params.sigma / R0

    def rhs(t: float, y: np.ndarray) -> np.ndarray:
        return _rayleigh_plesset_rhs(t, y, R0, P_gas0, params)

    y0 = np.array([R0, R_dot0])
    sol = solve_ivp(
        rhs,
        t_span,
        y0,
        max_step=max_step,
        events=events,
        dense_output=False,
    )

    t = sol.t
    R = sol.y[0]
    R_dot = sol.y[1]

    return t, R, R_dot


def _bubble_wall_pressure(
    R: float,
    R_dot: float,
    R0: float,
    P_gas0: float,
    params: "RayleighPlessetParams",
) -> Tuple[float, float]:
    """Liquid pressure at the bubble wall and its time derivative.

    Shared by the Rayleigh-Plesset and Keller-Miksis right-hand sides so the two
    equations differ only in their compressibility treatment, which is what makes
    the ``c -> infinity`` reduction test meaningful.

    Returns:
        ``(p_L, dp_L_dt)`` in Pa and Pa/s.
    """
    P_gas = P_gas0 * (R0 / R) ** (3 * params.gamma)
    P_electric = 0.5 * EPS0 * params.E_field ** 2
    p_L = P_gas - 2 * params.sigma / R - 4 * params.mu * R_dot / R + P_electric

    # d/dt of the gas term: P_gas ∝ R^(-3γ) so dP_gas/dt = -3γ P_gas Ṙ / R.
    # The surface and viscous derivatives are omitted, the standard simplification
    # for the Keller-Miksis radiation term.
    dp_L_dt = -3.0 * params.gamma * P_gas * R_dot / R
    return p_L, dp_L_dt


def _keller_miksis_rhs(
    t: float,
    y: np.ndarray,
    R0: float,
    P_gas0: float,
    params: "RayleighPlessetParams",
    sound_speed: float,
) -> np.ndarray:
    """RHS of the Keller-Miksis equation: d/dt [R, Ṙ].

    Keller & Miksis (1980), for a bubble in a weakly compressible liquid:

        (1 - Ṙ/c) R R̈ + (3/2)(1 - Ṙ/(3c)) Ṙ²
            = (1/ρ)(1 + Ṙ/c)(p_L - p_inf) + (R/(ρ c)) dp_L/dt

    Setting ``c -> infinity`` drops every correction term and recovers
    Rayleigh-Plesset, ``R R̈ + (3/2) Ṙ² = (p_L - p_inf)/ρ``. That limit is asserted
    in the bubble-dynamics gates.

    Unlike Rayleigh-Plesset this retains acoustic radiation damping, so it does not
    overpredict rebound amplitude at high Mach number.
    """
    R, R_dot = y
    if R <= 1e-12:
        return np.array([0.0, 0.0])

    p_L, dp_L_dt = _bubble_wall_pressure(R, R_dot, R0, P_gas0, params)
    P_inf_eff = params.P_inf * params.drive_factor

    mach = R_dot / sound_speed
    # Guard the singularity at Ṙ = c; the model is only valid well below it.
    lhs_coefficient = max(1.0 - mach, 1e-6)

    rhs = (
        (1.0 + mach) * (p_L - P_inf_eff) / params.rho
        + R * dp_L_dt / (params.rho * sound_speed)
        - 1.5 * (1.0 - mach / 3.0) * R_dot ** 2
    )
    R_ddot = rhs / (lhs_coefficient * R)

    return np.array([R_dot, R_ddot])


def solve_keller_miksis(
    R0: float,
    t_span: Tuple[float, float],
    params: Optional["RayleighPlessetParams"] = None,
    R_dot0: float = 0.0,
    sound_speed: float = 1481.0,
    max_step: float = 1e-8,
    events=None,
) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Solve the Keller-Miksis equation for a compressible surrounding liquid.

    Args:
        R0: Initial bubble radius (m)
        t_span: (t_start, t_end) in seconds
        params: RayleighPlessetParams; if None, uses defaults
        R_dot0: Initial radial velocity (m/s)
        sound_speed: Speed of sound in the liquid (m/s). Default 1481 m/s is water
            at 20 C. Pass a very large value to recover Rayleigh-Plesset.
        max_step: Maximum ODE step size
        events: Optional callable(s) for event detection

    Returns:
        t, R, R_dot arrays
    """
    params = params or RayleighPlessetParams()
    P_gas0 = params.P_inf + 2 * params.sigma / R0

    def rhs(t: float, y: np.ndarray) -> np.ndarray:
        return _keller_miksis_rhs(t, y, R0, P_gas0, params, sound_speed)

    sol = solve_ivp(
        rhs,
        t_span,
        np.array([R0, R_dot0]),
        max_step=max_step,
        events=events,
        dense_output=False,
    )
    return sol.t, sol.y[0], sol.y[1]


def compute_collapse_temperature_pressure(
    R0: float,
    R_min: float,
    T0: float = 298.0,
    P0: float = 101325.0,
    gamma: float = 5.0 / 3.0,
) -> Tuple[float, float]:
    """
    Adiabatic collapse: T_final and P_final from compression ratio.

    T_f = T0 * (R0/R_min)^(3*(gamma-1))
    P_f = P0 * (R0/R_min)^(3*gamma)
    """
    if R_min <= 0 or R0 <= 0:
        return T0, P0
    ratio = R0 / R_min
    T_f = T0 * ratio ** (3 * (gamma - 1))
    P_f = P0 * ratio ** (3 * gamma)
    return float(np.clip(T_f, T0, 1e7)), float(np.clip(P_f, P0, 1e12))


def get_bubble_enhancement_from_solver(
    R0: float = 10e-6,
    t_collapse: float = 1e-6,
    E_field: float = 1e6,
    T0: float = 350.0,
    P_inf: float = 101325.0,
) -> dict:
    """
    Run Rayleigh-Plesset collapse and return T, P, and enhancement factor.

    Used by unified_lenr_model._calculate_bubble_enhancement.
    """
    params = RayleighPlessetParams(
        rho=1000.0,
        sigma=0.072,
        mu=1e-3,
        P_inf=P_inf,
        gamma=5.0 / 3.0,
        E_field=E_field,
    )
    P_gas0 = P_inf + 2 * params.sigma / R0

    t, R, _ = solve_modified_rayleigh_plesset(
        R0,
        (0.0, t_collapse),
        params=params,
        max_step=t_collapse / 5000,
    )

    R_min = float(np.min(R))
    T_collapse, P_collapse = compute_collapse_temperature_pressure(
        R0, R_min, T0, P_gas0, params.gamma
    )

    return {
        "R_min_m": R_min,
        "compression_ratio": R0 / max(R_min, 1e-15),
        "T_collapse_K": T_collapse,
        "P_collapse_Pa": P_collapse,
    }
