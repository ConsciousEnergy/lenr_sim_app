"""
Bubble-Lattice Interaction Physics Model

Couples Rayleigh-Plesset bubble dynamics with lattice-loaded material physics
for unified LENR simulation. Models the electrodynamic ionic double-layer
bubble collapsing onto lattice surfaces.

Based on Section 3.2 of the unified LENR theory paper:
R*R'' + 3/2*R'^2 = (P_bubble - P_inf - 2*sigma/R - 4*mu*R'/R + epsilon_0*E^2/2) / rho

Author: Conscious Energies
"""

import logging
import os
import sys
from contextlib import contextmanager
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
from scipy import constants as const
from scipy.integrate import odeint, solve_ivp

from app.physics.casimir_forces import DOMAIN_VALIDITY_THRESHOLD_M
from app.physics_engine.constants import (
    QED_VACUUM_COEFFICIENT,
    SCHWINGER_CRITICAL_FIELD_V_M,
)
from app.physics_engine.screening_kernel import (
    compute_screening_enhancement,
    thermal_energy_ev,
)

logger = logging.getLogger(__name__)

# Re-export Schwinger / QED coefficients for callers that historically imported
# them from this module (API routes, mechanism bound tests).

# Hydrogen ground-state binding energy in eV, for the Rydberg level spacing.
RYDBERG_GROUND_STATE_EV: float = 13.605693122994


@contextmanager
def _suppressed_fortran_stdout():
    """Silence LSODA's Fortran chatter for the duration of one solve.

    SciPy's LSODA wrapper writes step-size warnings ("internal t and h are such
    that t + h = t ... solver will continue anyway") straight to file descriptor 1,
    so they cannot be captured by ``warnings`` or ``logging``. At high acoustic
    drive the collapse rebound triggers ~11 of them per run, which floods server
    logs. They are informational: across drives from 1.5e5 to 8e5 Pa and every
    tolerance and step-limit setting tried, the returned minimum radius agrees to
    six significant figures and ``solution.success`` is True, so the solution is
    converged. ``simulate_collapse`` logs ``solution.status`` itself when the
    solver genuinely fails, so no real failure is hidden.

    Safe here because ``solve_ivp`` is a blocking, synchronous call with no
    ``await`` inside it: no other coroutine on this event loop can write to stdout
    while it runs. The descriptor is always restored.
    """
    try:
        original_fd = os.dup(1)
    except OSError:
        # No real stdout to redirect (e.g. captured test environment).
        yield
        return

    devnull_fd = None
    try:
        sys.stdout.flush()
        devnull_fd = os.open(os.devnull, os.O_WRONLY)
        os.dup2(devnull_fd, 1)
        yield
    finally:
        try:
            sys.stdout.flush()
        except ValueError:
            pass
        os.dup2(original_fd, 1)
        os.close(original_fd)
        if devnull_fd is not None:
            os.close(devnull_fd)


# Gas-specific polytropic indices (heat capacity ratio γ = Cp/Cv)
# For diatomic gases (H2, D2, N2): γ ≈ 1.4 (5 degrees of freedom at moderate T)
# For monatomic gases (He, Ar): γ ≈ 1.67 (3 degrees of freedom)
# For water vapor (H2O): γ ≈ 1.33 (6 degrees of freedom)
# Reference: NIST Chemistry WebBook
GAS_POLYTROPIC_INDEX = {
    "hydrogen": 1.405,      # H2 at 300K
    "deuterium": 1.399,     # D2 at 300K (slightly lower due to higher mass)
    "helium": 1.667,        # Monatomic
    "argon": 1.667,         # Monatomic
    "nitrogen": 1.401,      # N2
    "air": 1.400,           # Mixture
    "water_vapor": 1.330,   # H2O vapor
    "mixed": 1.380,         # D2 + vapor mixture (approximate for LENR bubble)
}


@dataclass
class BubbleParameters:
    """Parameters for bubble dynamics simulation."""
    initial_radius: float = 10e-6  # m (10 μm)
    ambient_pressure: float = 101325.0  # Pa (1 atm)
    driving_pressure: float = 1.5e5  # Pa (1.5 bar amplitude)
    frequency: float = 20e3  # Hz (20 kHz)
    ambient_temperature: float = 298.0  # K
    
    # Fluid properties (water by default)
    fluid_density: float = 998.0  # kg/m³
    surface_tension: float = 0.0728  # N/m
    dynamic_viscosity: float = 1.002e-3  # Pa·s
    
    # Gas properties
    gas_type: str = "deuterium"
    polytropic_index: float = 1.399  # γ for adiabatic process (D2 default)
    
    # Electric field in double layer
    double_layer_field: float = 1e8  # V/m

    # Bubble-dynamics model. "rayleigh_plesset" is incompressible (default, keeps
    # every stored baseline valid); "keller_miksis" adds acoustic radiation
    # damping, which matters once the wall Mach number Rdot/c approaches ~0.1.
    bubble_dynamics_mode: str = "rayleigh_plesset"
    # Speed of sound in the surrounding liquid (water at 20 C).
    sound_speed: float = 1481.0
    
    def __post_init__(self):
        """Set polytropic index based on gas type if not explicitly provided."""
        # Only set from GAS_POLYTROPIC_INDEX if polytropic_index is still at default
        # This preserves user-provided values
        if (self.polytropic_index == 1.399 and 
            self.gas_type.lower() in GAS_POLYTROPIC_INDEX):
            # Use gas-specific value only if still at default
            self.polytropic_index = GAS_POLYTROPIC_INDEX[self.gas_type.lower()]
        # Otherwise keep the provided value
        
    @classmethod
    def for_gas(cls, gas_type: str, **kwargs) -> "BubbleParameters":
        """Factory method to create parameters for a specific gas."""
        # Use polytropic_index from kwargs if provided, otherwise lookup by gas_type
        if 'polytropic_index' in kwargs:
            gamma = kwargs.pop('polytropic_index')
        else:
            gamma = GAS_POLYTROPIC_INDEX.get(gas_type.lower(), 1.4)
        return cls(gas_type=gas_type, polytropic_index=gamma, **kwargs)


@dataclass
class LatticeParameters:
    """Parameters for lattice interaction."""
    host_material: str = "palladium"
    loading_ratio: float = 0.9  # H/M ratio
    defect_density: float = 1e16  # m⁻³
    surface_roughness: float = 5e-9  # m
    lattice_constant: float = 3.89e-10  # m (Pd)
    electron_density: float = 6.8e28  # m⁻³
    debye_temperature: float = 275.0  # K (Pd)
    work_function: float = 5.12  # eV (Pd)
    fermi_energy: float = 11.7  # eV (Pd)
    # eV. Typical (point-estimate) value for Pd-D. The cited material-dependent
    # range lives in unified_lenr_model/screening_data.py (RR-007); Pd spans
    # ~250-800 eV, up to ~18 keV in hard targets. UQ should sample the range.
    screening_potential: float = 800.0
    # Pa. Isothermal bulk modulus, used to convert collapse pressure into lattice
    # strain for the Casimir term. Values from CRC Handbook of Chemistry and
    # Physics (elastic constants of the elements).
    bulk_modulus: float = 1.80e11  # Pd
    
    @classmethod
    def for_material(cls, material: str) -> "LatticeParameters":
        """
        Factory method to create parameters for common LENR materials.
        
        Data from:
        - Lattice constants: Kittel, Introduction to Solid State Physics
        - Electron densities: Ashcroft & Mermin, Solid State Physics
        - Debye temperatures: American Institute of Physics Handbook
        - Work functions: CRC Handbook of Chemistry and Physics
        - Screening potentials: cited material-dependent ranges in
          unified_lenr_model/screening_data.py (Raiola 2002; Huke 2008;
          Czerski 2023; Pines 2020). Values below are the typical point
          estimates of those ranges (RR-007); Kasagi et al. JPSJ 71 (2002).
        """
        material_data = {
            "palladium": {
                "lattice_constant": 3.89e-10,  # m (FCC)
                "electron_density": 6.8e28,     # m^-3
                "debye_temperature": 275.0,     # K
                "work_function": 5.12,          # eV
                "fermi_energy": 11.7,           # eV
                "screening_potential": 800.0,   # eV (D-D in Pd)
                "bulk_modulus": 1.80e11,        # Pa (CRC Handbook)
            },
            "nickel": {
                "lattice_constant": 3.52e-10,   # m (FCC)
                "electron_density": 9.1e28,     # m^-3
                "debye_temperature": 450.0,     # K
                "work_function": 5.15,          # eV
                "fermi_energy": 11.7,           # eV
                "screening_potential": 500.0,   # eV (H-H in Ni, estimate)
                "bulk_modulus": 1.80e11,        # Pa (CRC Handbook)
            },
            "titanium": {
                "lattice_constant": 2.95e-10,   # m (HCP)
                "electron_density": 1.0e29,     # m^-3 (varies with structure)
                "debye_temperature": 420.0,     # K
                "work_function": 4.33,          # eV
                "fermi_energy": 7.0,            # eV
                "screening_potential": 350.0,   # eV (D-D in Ti, estimate)
                "bulk_modulus": 1.10e11,        # Pa (CRC Handbook)
            },
            "platinum": {
                "lattice_constant": 3.92e-10,   # m (FCC)
                "electron_density": 6.6e28,     # m^-3
                "debye_temperature": 240.0,     # K
                "work_function": 5.65,          # eV
                "fermi_energy": 9.7,            # eV
                "screening_potential": 750.0,   # eV (estimate)
                "bulk_modulus": 2.30e11,        # Pa (CRC Handbook)
            },
            "lithium": {
                "lattice_constant": 3.51e-10,   # m (BCC)
                "electron_density": 4.7e28,     # m^-3
                "debye_temperature": 344.0,     # K
                "work_function": 2.9,           # eV
                "fermi_energy": 4.7,            # eV
                "screening_potential": 300.0,   # eV (Li-H Rydberg matter, estimate)
                "bulk_modulus": 1.10e10,        # Pa (CRC Handbook)
            },
        }
        mat_key = (material or "").strip().lower()
        if mat_key in material_data:
            data = material_data[mat_key].copy()
        else:
            # Generic/custom fallback: use Pd-like structure, work function 5.0 eV
            data = {**material_data["palladium"], "work_function": 5.0}
        return cls(host_material=material, **data)


@dataclass 
class CollapseResult:
    """Results from bubble collapse calculation."""
    time_series: np.ndarray
    radius_series: np.ndarray
    velocity_series: np.ndarray
    
    # Peak conditions
    min_radius: float
    max_temperature: float
    max_pressure: float
    collapse_time: float
    compression_ratio: float
    
    # LENR-relevant outputs
    double_layer_field_peak: float
    enhancement_factor: float
    proton_phase_distribution: Dict[str, float]

    # Which reporting limits bound this result, and the pre-clamp values. Peak
    # conditions are clamped to physical/claim-tier ceilings; without this a
    # saturated value is indistinguishable from a computed one. Every entry here
    # carries a ``ceiling``; solver diagnostics live in ``bubble_dynamics``.
    limits: Dict[str, Any] = field(default_factory=dict)

    # Which bubble-dynamics model and solver produced this result, plus the peak
    # wall Mach number that decides whether the incompressible model applies.
    bubble_dynamics: Dict[str, Any] = field(default_factory=dict)


class BubbleLatticeInteraction:
    """
    Unified model for bubble collapse onto lattice-loaded materials.
    
    Implements:
    1. Modified Rayleigh-Plesset dynamics with electric field term
    2. Double-layer field evolution during collapse
    3. Proton phase transitions based on local conditions
    4. Enhancement factor calculation at collapse
    """
    
    # Physical constants
    EPS0 = const.epsilon_0
    KB = const.k
    HBAR = const.hbar
    E_CHARGE = const.e
    
    # Van der Waals hard-core limit: maximum compression ratio before
    # repulsive molecular forces dominate.  Single-bubble sonoluminescence
    # experiments measure compression ratios up to ~1000.
    MAX_COMPRESSION_RATIO = 1000
    
    def __init__(
        self, 
        bubble_params: Optional[BubbleParameters] = None,
        lattice_params: Optional[LatticeParameters] = None
    ):
        self.bubble = bubble_params or BubbleParameters()
        self.lattice = lattice_params or LatticeParameters()
        
        logger.info(f"BubbleLatticeInteraction initialized:")
        logger.info(f"  Bubble: R0={self.bubble.initial_radius*1e6:.1f}μm, f={self.bubble.frequency/1e3:.0f}kHz")
        logger.info(f"  Lattice: {self.lattice.host_material}, loading={self.lattice.loading_ratio}")
    
    @property
    def hard_core_radius(self) -> float:
        """Van der Waals hard-core radius: the incompressible gas core.

        This is what physically sets ``R_min``, so it belongs in the gas law rather
        than being applied afterwards as a clamp.
        """
        return self.bubble.initial_radius / self.MAX_COMPRESSION_RATIO

    def _guard_radius(self, R: float) -> float:
        """Keep the radius strictly outside the hard core for numerical safety."""
        floor = self.hard_core_radius * (1.0 + 1e-9)
        if not np.isfinite(R):
            return floor
        return max(R, floor)

    def _gas_pressure(self, R: float, dRdt: float) -> Tuple[float, float]:
        """Van der Waals hard-core polytropic gas pressure and its derivative.

            P(R) = P_0 * ((R_0^3 - h^3) / (R^3 - h^3))^gamma

        where ``h`` is the hard-core radius. As ``R -> h`` the pressure diverges,
        which decelerates the wall and produces a smooth rebound.

        This replaces ``P_0 (R_0/R)^(3 gamma)`` plus a post-hoc ``max(R, floor)``
        clamp. That combination was genuinely singular: the state kept driving the
        radius below the floor while the right-hand side pretended it sat at the
        floor, so the adaptive solver drove its step size to ~1e-20 and LSODA's raw
        solution diverged to ~-3e145 at the collapse instant. The divergence was
        invisible because it was sanitised away afterwards. With the hard core in
        the gas law, R_min emerges from the physics instead.

        Returns:
            ``(P_gas, dP_gas/dt)`` in Pa and Pa/s.
        """
        R0 = self.bubble.initial_radius
        gamma = self.bubble.polytropic_index
        h = self.hard_core_radius

        P_gas_0 = self.bubble.ambient_pressure + 2 * self.bubble.surface_tension / R0
        volume_term = R**3 - h**3
        reference_term = R0**3 - h**3
        if volume_term <= 0.0 or reference_term <= 0.0:
            return float(P_gas_0), 0.0

        P_gas = P_gas_0 * (reference_term / volume_term) ** gamma
        if not np.isfinite(P_gas):
            return float(P_gas_0), 0.0

        # d/dt of P ~ (R^3 - h^3)^(-gamma).
        dP_dt = -3.0 * gamma * P_gas * R**2 * dRdt / volume_term
        if not np.isfinite(dP_dt):
            dP_dt = 0.0
        return float(P_gas), float(dP_dt)

    def rayleigh_plesset_rhs(self, y: np.ndarray, t: float) -> np.ndarray:
        """
        Right-hand side of modified Rayleigh-Plesset equation.
        
        y = [R, dR/dt]
        
        Modified RP equation from paper Section 3.2:
        R*R'' + 3/2*R'^2 = (1/ρ) * [P_b - P_∞ - 2σ/R - 4μR'/R + ε₀E²/2]
        """
        R, dRdt = float(y[0]), float(y[1])

        R = self._guard_radius(R)
        if not np.isfinite(dRdt):
            dRdt = 0.0
        
        # Driving pressure (sinusoidal acoustic field)
        omega = 2 * np.pi * self.bubble.frequency
        P_acoustic = self.bubble.driving_pressure * np.sin(omega * t)
        P_infinity = self.bubble.ambient_pressure + P_acoustic
        
        # Bubble internal pressure (van der Waals hard-core polytropic law)
        R0 = self.bubble.initial_radius
        gamma = self.bubble.polytropic_index
        P_bubble, _ = self._gas_pressure(R, dRdt)
        
        # Surface tension term
        P_surface = 2 * self.bubble.surface_tension / R
        
        # Viscous damping term
        P_viscous = 4 * self.bubble.dynamic_viscosity * dRdt / R
        
        # Electric field contribution (double-layer Maxwell stress)
        # Field intensifies as bubble compresses
        E_field = self.bubble.double_layer_field * (R0 / R) ** 2
        P_electric = self.EPS0 * E_field ** 2 / 2
        
        # Total pressure balance
        delta_P = P_bubble - P_infinity - P_surface - P_viscous + P_electric
        
        # Rayleigh-Plesset: R*R'' + 3/2*R'² = (1/ρ)*ΔP
        # Solving for R'':
        d2Rdt2 = (delta_P / self.bubble.fluid_density - 1.5 * dRdt ** 2) / R
        if not np.isfinite(d2Rdt2):
            d2Rdt2 = 0.0
        
        return np.array([dRdt, d2Rdt2])

    def keller_miksis_rhs(self, y: np.ndarray, t: float) -> np.ndarray:
        """Right-hand side of the Keller-Miksis equation, same drive model.

        Keller & Miksis (1980) for a bubble in a weakly compressible liquid:

            (1 - Rdot/c) R Rddot + (3/2)(1 - Rdot/3c) Rdot^2
                = (1/rho)(1 + Rdot/c)(p_L - p_inf) + (R/(rho c)) dp_L/dt

        This shares the sinusoidal acoustic drive and the ``E ~ (R0/R)^2``
        double-layer field with :meth:`rayleigh_plesset_rhs`, so the two modes
        differ *only* in their compressibility treatment. ``bubble_solver`` has a
        Keller-Miksis solver too, but it drives with a constant
        ``P_inf * drive_factor`` and a constant field, so routing this path
        through it would have silently changed the physics being compared.

        As ``c -> infinity`` every correction vanishes and this recovers
        Rayleigh-Plesset; that limit is asserted in the bubble-dynamics gates.
        """
        R, dRdt = float(y[0]), float(y[1])

        R = self._guard_radius(R)
        if not np.isfinite(dRdt):
            dRdt = 0.0

        omega = 2 * np.pi * self.bubble.frequency
        P_acoustic = self.bubble.driving_pressure * np.sin(omega * t)
        P_infinity = self.bubble.ambient_pressure + P_acoustic

        R0 = self.bubble.initial_radius
        P_gas, dp_gas_dt = self._gas_pressure(R, dRdt)

        E_field = self.bubble.double_layer_field * (R0 / R) ** 2
        P_electric = self.EPS0 * E_field ** 2 / 2

        # Liquid pressure at the wall.
        p_L = (
            P_gas
            - 2 * self.bubble.surface_tension / R
            - 4 * self.bubble.dynamic_viscosity * dRdt / R
            + P_electric
        )
        # Only the gas term's derivative is retained, the standard simplification
        # for the acoustic radiation term.
        dp_L_dt = dp_gas_dt

        c = max(float(self.bubble.sound_speed), 1.0)
        mach = dRdt / c
        # Guard the singularity at Rdot = c; the model is only valid well below it.
        lhs_coefficient = max(1.0 - mach, 1e-6)
        rho = self.bubble.fluid_density

        rhs = (
            (1.0 + mach) * (p_L - P_infinity) / rho
            + R * dp_L_dt / (rho * c)
            - 1.5 * (1.0 - mach / 3.0) * dRdt ** 2
        )
        d2Rdt2 = rhs / (lhs_coefficient * R)
        if not np.isfinite(d2Rdt2):
            d2Rdt2 = 0.0

        return np.array([dRdt, d2Rdt2])

    def _dynamics_rhs(self, y: np.ndarray, t: float) -> np.ndarray:
        """Dispatch to the configured bubble-dynamics model."""
        mode = str(getattr(self.bubble, "bubble_dynamics_mode", "rayleigh_plesset")).lower()
        if mode == "keller_miksis":
            return self.keller_miksis_rhs(y, t)
        return self.rayleigh_plesset_rhs(y, t)
    
    def simulate_collapse(self, num_cycles: int = 2, points_per_cycle: int = 1000) -> CollapseResult:
        """
        Simulate bubble collapse dynamics over multiple acoustic cycles.
        """
        period = 1.0 / self.bubble.frequency
        total_time = num_cycles * period
        num_points = num_cycles * points_per_cycle
        
        t = np.linspace(0, total_time, num_points)
        
        # Initial conditions: [R0, dR/dt=0]
        y0 = np.array([self.bubble.initial_radius, 0.0])

        # Adaptive integration with error control. `odeint` on a fixed grid emitted
        # "Excess work done on this call" on every run, because the collapse is
        # stiff near R -> R_min, and it cannot locate the collapse instant more
        # precisely than the sample spacing. solve_ivp with LSODA adapts its own
        # step; a non-terminal min-radius event records hard-core crossings, and
        # the parabolic splice below refines the true extremum when it sits
        # above the floor.
        R_min_floor = self.bubble.initial_radius / self.MAX_COMPRESSION_RATIO

        def _rhs(time: float, state: np.ndarray) -> np.ndarray:
            return self._dynamics_rhs(state, time)

        def _min_radius_event(time: float, state: np.ndarray) -> float:
            # Zero crossing when the wall reaches the van der Waals hard core.
            return float(state[0] - R_min_floor)

        _min_radius_event.terminal = False
        _min_radius_event.direction = -1

        with _suppressed_fortran_stdout():
            solution = solve_ivp(
                _rhs,
                (0.0, total_time),
                y0,
                t_eval=t,
                method="LSODA",
                rtol=1e-8,
                atol=[R_min_floor * 1e-6, 1e-6],
                events=_min_radius_event,
                dense_output=False,
            )

        if not solution.success:
            logger.warning(
                "Collapse integration reported status %s: %s",
                solution.status,
                getattr(solution, "message", "unknown"),
            )

        if solution.y.shape[1] >= 2:
            R = np.asarray(solution.y[0], dtype=float)
            dRdt = np.asarray(solution.y[1], dtype=float)
            if R.size < t.size:
                # Integration stopped early; pad with the hard-core floor so
                # downstream shapes stay aligned with the requested grid.
                pad = t.size - R.size
                R = np.concatenate([R, np.full(pad, R_min_floor)])
                dRdt = np.concatenate([dRdt, np.zeros(pad)])
            t = t[: R.size]
        else:
            logger.warning(
                "solve_ivp returned no usable solution (%s); falling back to odeint",
                getattr(solution, "message", "unknown"),
            )
            fallback = odeint(self.rayleigh_plesset_rhs, y0, t)
            R = np.asarray(fallback[:, 0], dtype=float)
            dRdt = np.asarray(fallback[:, 1], dtype=float)

        # Van der Waals hard-core floor: R_min >= R_0 / MAX_COMPRESSION_RATIO.
        # ODE blow-up can yield NaN/inf/underflow; Python max(nan, floor) stays nan.
        bad = ~np.isfinite(R) | (R <= 0.0)
        if np.any(bad):
            R = R.copy()
            dRdt = dRdt.copy()
            R[bad] = R_min_floor
            dRdt[bad] = 0.0
        R = np.maximum(R, R_min_floor)

        # Sub-grid refinement of the collapse instant. Plain argmin resolves the
        # minimum no better than the sample spacing, and R(t) is smooth and locally
        # quadratic near its extremum, so fitting a parabola through the bracketing
        # samples locates the vertex to well inside one step.
        #
        # A wall-at-rest (Rdot = 0) solver event would be more direct for the
        # extremum, but the initial condition has Rdot exactly 0, so the root
        # finder is handed a bracket with no sign change and raises. The
        # min-radius (hard-core) event above records floor crossings; the
        # parabolic splice here refines extrema that sit above the floor.
        #
        # The vertex is *spliced into* the trajectory rather than only reported:
        # get_collapse_phases interpolates the cached trajectory, so a reported
        # minimum that is not in it would make the timeline and the peak describe
        # two different collapses.
        collapse_time_refined = False
        grid_min_idx = int(np.argmin(R))
        if 0 < grid_min_idx < R.size - 1:
            left = float(R[grid_min_idx - 1])
            centre = float(R[grid_min_idx])
            right = float(R[grid_min_idx + 1])
            curvature = left - 2.0 * centre + right
            if curvature > 0.0:
                offset = 0.5 * (left - right) / curvature
                spacing = float(t[grid_min_idx + 1] - t[grid_min_idx])
                vertex_radius = centre - 0.25 * (left - right) * offset
                if (
                    -1.0 < offset < 1.0
                    and spacing > 0.0
                    and R_min_floor <= vertex_radius < centre
                ):
                    vertex_time = float(t[grid_min_idx]) + offset * spacing
                    insert_at = int(np.searchsorted(t, vertex_time))
                    t = np.insert(t, insert_at, vertex_time)
                    R = np.insert(R, insert_at, float(vertex_radius))
                    # The wall is momentarily at rest at the extremum.
                    dRdt = np.insert(dRdt, insert_at, 0.0)
                    collapse_time_refined = True

        # Find minimum radius (collapse point) among sanitized samples
        min_idx = int(np.argmin(R))
        R_min = float(max(R[min_idx], R_min_floor, 1e-12))
        collapse_time = float(t[min_idx])

        # Peak wall Mach number decides whether the incompressible model is even
        # admissible: Keller-Miksis corrections scale with Rdot/c and matter once
        # this approaches ~0.1.
        sound_speed = max(float(getattr(self.bubble, "sound_speed", 1481.0)), 1.0)
        finite_velocities = dRdt[np.isfinite(dRdt)]
        peak_wall_speed = float(np.max(np.abs(finite_velocities))) if finite_velocities.size else 0.0
        peak_mach = peak_wall_speed / sound_speed
        dynamics_mode = str(
            getattr(self.bubble, "bubble_dynamics_mode", "rayleigh_plesset")
        ).lower()
        if peak_mach >= 0.1:
            compressibility_regime = "compressibility_significant"
        elif peak_mach >= 0.01:
            compressibility_regime = "compressibility_marginal"
        else:
            compressibility_regime = "incompressible_valid"
        
        # Compression ratio is capped by the hard-core limit
        compression_ratio = float(min(self.bubble.initial_radius / R_min, self.MAX_COMPRESSION_RATIO))
        
        # Adiabatic temperature rise: T = T0 * (R0/R)^(3(γ-1))
        gamma = self.bubble.polytropic_index
        T_max_raw = self.bubble.ambient_temperature * compression_ratio ** (3 * (gamma - 1))
        # Ceiling is a literature-anchored bound, not a prediction; the closed-form
        # adiabatic law ignores dissociation, ionisation and conduction losses and
        # overshoots badly at high compression. See REGIME_TEMPERATURE_PROVENANCE.
        from app.physics.bubble_collapse import (
            REGIME_MAX_TEMPERATURE,
            REGIME_TEMPERATURE_PROVENANCE,
        )
        T_ceiling = REGIME_MAX_TEMPERATURE.get("single_bubble", 2.0e6)
        T_max = min(T_max_raw, T_ceiling)
        
        # Pressure at collapse (capped at 10^10 Pa, consistent with bubble_collapse.py)
        P_max_raw = self.bubble.ambient_pressure * compression_ratio ** (3 * gamma)
        P_CEILING_PA = 1e10  # ~100 kbar, sonoluminescence regime
        P_max = min(P_max_raw, P_CEILING_PA)
        
        # Peak double-layer field
        E_peak = float(self.bubble.double_layer_field * compression_ratio ** 2)
        if not np.isfinite(E_peak):
            E_peak = float(self.bubble.double_layer_field)
        
        # Calculate enhancement factor
        enhancement = self._calculate_enhancement_at_collapse(
            T_max, P_max, E_peak, compression_ratio
        )
        
        # Determine proton phase distribution
        proton_phases = self._calculate_proton_phases(T_max, E_peak, enhancement)
        
        # Cache the integrated trajectory so get_collapse_phases() reports the same
        # collapse the peak conditions came from, instead of a separate envelope.
        # dRdt is kept too so get_collapse_trajectory() can report wall velocity.
        self._trajectory = {"t": t, "R": R, "dRdt": dRdt}

        compression_saturated = (
            self.bubble.initial_radius / R_min >= self.MAX_COMPRESSION_RATIO
        )
        limits = {
            "temperature_k": {
                "value": float(T_max),
                "value_raw": float(T_max_raw) if np.isfinite(T_max_raw) else None,
                "ceiling": float(T_ceiling),
                "is_saturated": bool(T_max_raw >= T_ceiling),
                "basis": REGIME_TEMPERATURE_PROVENANCE["single_bubble"]["basis"],
                "citation": REGIME_TEMPERATURE_PROVENANCE["single_bubble"][
                    "simulation_citation"
                ],
            },
            "pressure_pa": {
                "value": float(P_max),
                "value_raw": float(P_max_raw) if np.isfinite(P_max_raw) else None,
                "ceiling": float(P_CEILING_PA),
                "is_saturated": bool(P_max_raw >= P_CEILING_PA),
                "basis": "sonoluminescence regime bound",
            },
            "compression_ratio": {
                "value": float(compression_ratio),
                "ceiling": float(self.MAX_COMPRESSION_RATIO),
                "is_saturated": bool(compression_saturated),
                "basis": "van der Waals hard-core radius floor on R_min",
            },
        }

        # Kept out of `limits`: every entry there describes a value clamped to a
        # ceiling, and this is solver diagnostics. It reports whether the chosen
        # bubble-dynamics model is admissible at the wall speeds actually reached,
        # which was previously invisible.
        hard_core_hits = 0
        if getattr(solution, "t_events", None):
            try:
                hard_core_hits = int(len(solution.t_events[0]))
            except (IndexError, TypeError):
                hard_core_hits = 0

        dynamics_report = {
            "mode": dynamics_mode,
            "solver": "scipy.integrate.solve_ivp(LSODA)",
            "sound_speed_m_s": float(sound_speed),
            "peak_wall_speed_m_s": float(peak_wall_speed),
            "peak_mach": float(peak_mach),
            "compressibility_regime": compressibility_regime,
            "min_radius_event_count": hard_core_hits,
            "collapse_time_refinement": (
                "parabolic_subgrid" if collapse_time_refined else "grid_sample"
            ),
            "note": (
                "Keller-Miksis corrections scale with Rdot/c. Above Mach ~0.1 the "
                "incompressible Rayleigh-Plesset result overpredicts rebound "
                "because it omits acoustic radiation damping; set "
                "bubble_dynamics_mode='keller_miksis' for that regime."
            ),
        }

        return CollapseResult(
            time_series=t,
            radius_series=R,
            velocity_series=dRdt,
            min_radius=R_min,
            max_temperature=T_max,
            max_pressure=P_max,
            collapse_time=collapse_time,
            compression_ratio=compression_ratio,
            double_layer_field_peak=E_peak,
            enhancement_factor=enhancement,
            proton_phase_distribution=proton_phases,
            limits=limits,
            bubble_dynamics=dynamics_report,
        )
    
    def _calculate_enhancement_at_collapse(
        self,
        temperature: float,
        pressure: float,
        electric_field: float,
        compression: float
    ) -> float:
        """
        Calculate total tunneling enhancement factor at collapse.
        
        Combines contributions from:
        - Electron screening (temperature-dependent)
        - QED double-layer field
        - Pressure-induced barrier reduction
        """
        breakdown = self._calculate_enhancement_breakdown(temperature, pressure, electric_field, compression)
        return breakdown["total"]
    
    def _calculate_debye_phonon_coupling(self, temperature: float) -> float:
        """
        Calculate temperature-dependent phonon-nuclear coupling using Debye model.
        
        The Debye model describes lattice vibrations as a collection of phonons.
        At temperatures above Debye temperature, classical behavior dominates.
        Below Debye temperature, quantum effects become significant.
        
        Phonon coupling enhances nuclear reaction rates through:
        1. Momentum transfer during lattice vibrations
        2. Coherent phonon modes that localize energy
        3. Dynamic screening from oscillating charge distributions
        
        The coupling factor is based on the Debye function:
        D(x) = 3 * (T/θ_D)^3 * ∫[0 to x] (t^3 * e^t) / (e^t - 1)^2 dt
        where x = θ_D / T
        
        Args:
            temperature: System temperature in Kelvin
            
        Returns:
            Phonon coupling enhancement factor (dimensionless, >= 1.0)
        """
        theta_d = self.lattice.debye_temperature
        T = max(temperature, 1.0)  # Prevent division by zero
        
        x = theta_d / T  # Reduced temperature
        
        # Calculate Debye function using numerical integration
        # For efficiency, use approximations for extreme cases
        if x < 0.01:
            # High temperature limit: D(x) ≈ 1
            debye_value = 1.0
        elif x > 20:
            # Low temperature limit: D(x) ≈ 3*(π/x)^4 * 4/15
            debye_value = 3 * (np.pi / x) ** 4 * 4 / 15
        else:
            # Numerical integration for intermediate range
            # D(x) = 3/x^3 * ∫[0 to x] (t^3 / (e^t - 1)) dt
            from scipy.integrate import quad
            
            def integrand(t):
                if t < 1e-10:
                    return t ** 2  # Taylor expansion near zero
                exp_t = np.exp(t)
                if exp_t > 1e300:  # Prevent overflow
                    return 0.0
                return t ** 3 / (exp_t - 1)
            
            integral, _ = quad(integrand, 0, x, limit=100)
            debye_value = 3 * integral / (x ** 3)
        
        # Calculate mean square displacement (proportional to <u²>)
        # <u²> = (9ℏ²/M*k_B*θ_D) * D(x)
        # This affects overlap integrals for nuclear reactions
        
        # Phonon occupation number (Bose-Einstein)
        # n_phonon = 1/(exp(ℏω/k_B*T) - 1)
        # Average over Debye spectrum: <n> ≈ T/θ_D at high T
        if x < 20:
            avg_phonon_occupation = 1 / (np.exp(x) - 1) if x > 0.01 else T / theta_d
        else:
            avg_phonon_occupation = np.exp(-x)
        
        # Enhancement from phonon-assisted processes
        # Higher temperature -> more phonons -> more scattering events
        # But also more decoherence, so there's an optimal range
        
        # Phonon density of states at Debye cutoff
        dos_factor = 1 + 0.5 * debye_value
        
        # Multi-phonon process enhancement
        # At T ~ θ_D, coherent multi-phonon processes become significant
        multi_phonon = 1 + 2.0 * np.exp(-abs(1 - T / theta_d) ** 2 / 0.5)
        
        # Lattice softening near phase transitions (simplified)
        softening_factor = 1 + 0.1 * (T / theta_d) if T < theta_d else 1 + 0.1 * np.exp(-(T / theta_d - 1))
        
        # Combined phonon coupling factor
        phonon_factor = dos_factor * multi_phonon * softening_factor * (1 + avg_phonon_occupation)
        
        # Ensure factor is at least 1.0 and cap at reasonable value
        return float(min(max(phonon_factor, 1.0), 100.0))
    
    # Continuum Casimir formulae assume separations above roughly 2 nm; below that
    # the ideal-plate result is an extrapolation. Shared with
    # app/physics/casimir_forces.DOMAIN_VALIDITY_THRESHOLD_M and
    # theories/casimir_confinement, so one threshold governs every path.
    CASIMIR_CONTINUUM_FLOOR_M = DOMAIN_VALIDITY_THRESHOLD_M

    def casimir_domain_validity(self, pressure: float) -> Dict[str, Any]:
        """Report whether the Casimir term is inside its continuum domain.

        The strained lattice spacing at collapse pressures is a few angstroms,
        far below the ~2 nm floor where the ideal-plate result holds, so the term
        is an extrapolation. The floor constant existed but was never enforced or
        reported, so a client could not tell. Mirrors the observable names used by
        ``theories/casimir_confinement`` (``domain_valid`` plus ``warning``).

        Args:
            pressure: Local collapse pressure in Pa.

        Returns:
            Dict with ``spacing_m``, ``threshold_m``, ``domain_valid`` and an
            optional ``warning``.
        """
        spacing = self._strained_spacing(pressure)
        domain_valid = bool(spacing >= self.CASIMIR_CONTINUUM_FLOOR_M)
        report: Dict[str, Any] = {
            "spacing_m": float(spacing),
            "threshold_m": float(self.CASIMIR_CONTINUUM_FLOOR_M),
            "domain_valid": domain_valid,
        }
        if not domain_valid:
            report["warning"] = (
                "Ideal-plate Casimir scaling extrapolated below "
                f"{self.CASIMIR_CONTINUUM_FLOOR_M * 1e9:.1f} nm; surface roughness, "
                "finite conductivity and non-locality may dominate at this spacing."
            )
        return report

    def _strained_spacing(self, pressure: float) -> float:
        """Lattice plane spacing after elastic compression by ``pressure`` (m)."""
        bulk_modulus = float(getattr(self.lattice, "bulk_modulus", 1.80e11) or 1.80e11)
        d0 = float(self.lattice.lattice_constant)
        if bulk_modulus <= 0:
            return d0
        volumetric_strain = min(max(float(pressure), 0.0) / bulk_modulus, 0.9)
        return float(d0 * (1.0 - volumetric_strain) ** (1.0 / 3.0))

    def _calculate_casimir_enhancement(self, pressure: float) -> float:
        """Casimir enhancement from pressure-induced lattice strain.

        The collapse pressure ``P`` elastically compresses the host lattice by a
        volumetric strain ``P / K`` (``K`` = bulk modulus), so the linear spacing
        contracts as

            d = d0 * (1 - P / (3K))^(1/3) ≈ d0 * (1 - P / (9K))

        The Casimir pressure between the confining planes scales as ``1/d⁴``, so
        the enhancement relative to the unstrained lattice is ``(d0/d)⁴``.

        This depends on pressure, not on the compression ratio, which is what makes
        it an independent mechanism rather than a restatement of the density term.
        The magnitude is deliberately modest: at the 1e10 Pa pressure ceiling and
        Pd's K = 180 GPa the strain is ~2%, giving a few percent enhancement.

        Args:
            pressure: Local collapse pressure in Pa.

        Returns:
            Dimensionless enhancement factor >= 1.
        """
        bulk_modulus = float(getattr(self.lattice, "bulk_modulus", 1.80e11) or 1.80e11)
        if bulk_modulus <= 0:
            return 1.0

        p = max(float(pressure), 0.0)
        # Volumetric strain, kept below 1 so the lattice cannot invert.
        volumetric_strain = min(p / bulk_modulus, 0.9)
        spacing_ratio = (1.0 - volumetric_strain) ** (1.0 / 3.0)
        if spacing_ratio <= 0.0:
            return 1.0

        # Casimir pressure ratio P(d)/P(d0) = (d0/d)^4
        casimir_factor = spacing_ratio ** -4.0
        if not np.isfinite(casimir_factor):
            return 1.0
        return float(max(casimir_factor, 1.0))

    # Rydberg orbital-overlap bounds, matching unified_lenr_model/enhancements.py.
    RYDBERG_MAX_N = 10
    RYDBERG_MAX_ENHANCEMENT = 10.0
    RYDBERG_LOG_COEFFICIENT = 0.1

    def _calculate_rydberg_enhancement(self, temperature: float) -> float:
        """Bounded Rydberg-matter enhancement from orbital extension.

        The accessible principal quantum number follows the hydrogenic level
        spacing ``E_n = -13.6 eV / n^2``, capped at ``RYDBERG_MAX_N``. Overlap
        gain is logarithmic in the orbital extension ``r_n ~ n^2 a_0``, so the
        factor is bounded in ``[1, RYDBERG_MAX_ENHANCEMENT]``.

        Args:
            temperature: Local temperature in K.

        Returns:
            Dimensionless enhancement in ``[1, 10]``.
        """
        thermal_ev = thermal_energy_ev(temperature)
        if thermal_ev > 0.001:
            n_estimate = min(
                self.RYDBERG_MAX_N, max(1, int(np.sqrt(RYDBERG_GROUND_STATE_EV / thermal_ev)))
            )
        else:
            n_estimate = 1
        orbital_extension = float(n_estimate**2)
        enhancement = 1.0 + self.RYDBERG_LOG_COEFFICIENT * np.log(orbital_extension)
        return float(max(1.0, min(enhancement, self.RYDBERG_MAX_ENHANCEMENT)))

    def _calculate_enhancement_breakdown(
        self,
        temperature: float,
        pressure: float,
        electric_field: float,
        compression: float
    ) -> Dict[str, float]:
        """
        Calculate enhancement factor breakdown by mechanism.
        
        Returns dictionary with individual enhancement factors.
        """
        # Screening enhancement. Canonical kernel (screening_kernel.py): the
        # Assenbaum-Rolfs screened cross-section with the *cited, material
        # dependent* potential. The previous form derived its potential from a
        # Debye length and capped the exponent at a magic 9.2, so every host
        # screened identically and lattice.screening_potential was never read.
        screening_report = compute_screening_enhancement(
            temperature_k=temperature,
            material=self.lattice.host_material,
            screening_potential_ev=self.lattice.screening_potential,
        )
        screening_factor = screening_report["enhancement"]

        # Phonon-nuclear coupling (temperature-dependent)
        phonon_factor = self._calculate_debye_phonon_coupling(temperature)

        # QED vacuum polarisation. The critical field is the Schwinger limit
        # E_cr = m_e^2 c^3 / (e hbar) = 1.3233e18 V/m, not the 1e8 V/m stand-in
        # used before. With the real constant the leading correction is
        # eps_eff = 1 + (2 alpha / 45 pi) (E/E_cr)^2, which is ~1 + 6e-13 at the
        # 1e14 V/m peak field. The old expression returned ~1e12 there, making a
        # negligible effect the single largest term in the product.
        # Reference: Heisenberg-Euler effective Lagrangian; Schwinger (1951).
        qed_factor = 1.0 + QED_VACUUM_COEFFICIENT * (electric_field / SCHWINGER_CRITICAL_FIELD_V_M) ** 2

        # Compression enhancement (increased pair density). Bounded by the van der
        # Waals hard-core limit on compression (MAX_COMPRESSION_RATIO), so this
        # cannot exceed MAX_COMPRESSION_RATIO**2. Correlated with the other
        # collapse-driven terms rather than independent of them.
        density_factor = compression ** 2
        
        # Casimir enhancement. Previously this was literally compression**2, i.e.
        # a duplicate of density_factor, so it was not an independent mechanism.
        # It is now driven by the collapse *pressure* elastically straining the
        # lattice spacing, using the real Casimir pressure scaling P ∝ 1/d⁴
        # (app/physics/casimir_forces.py: P = -π²ħc/(240 d⁴)).
        casimir_factor = self._calculate_casimir_enhancement(pressure)
        
        # Rydberg Matter enhancement. Previously 1 + 0.5*cr*(E/1e8), which grows
        # linearly without bound and reached ~5e8 at peak conditions. Rydberg
        # states are bounded: the principal quantum number accessible at a given
        # thermal energy follows E_n = -13.6 eV / n^2, and the orbital-overlap
        # gain is logarithmic in the orbital extension r_n ~ n^2 a_0. This is the
        # same bounded form the unified model uses (enhancements.py), so the two
        # paths no longer disagree by eight orders of magnitude.
        rydberg_factor = self._calculate_rydberg_enhancement(temperature)
        
        # Loading ratio enhancement using smooth sigmoid function
        # Enhancement increases significantly above critical loading (~0.85 for Pd-D)
        # Physics: Higher loading increases hydrogen density and coherent screening
        # Reference: McKubre et al., loading ratios above 0.85-0.9 correlate with excess heat
        critical_loading = 0.85
        steepness = 20.0  # Controls sharpness of transition
        max_enhancement = 3.0  # Maximum loading factor
        
        # Smooth sigmoid: f(x) = 1 + (max-1) * sigmoid((x - critical) * steepness)
        sigmoid_arg = (self.lattice.loading_ratio - critical_loading) * steepness
        sigmoid_arg = np.clip(sigmoid_arg, -20, 20)  # Prevent overflow
        sigmoid_value = 1.0 / (1.0 + np.exp(-sigmoid_arg))
        loading_factor = 1.0 + (max_enhancement - 1.0) * sigmoid_value

        # Combined enhancement (multiplicative, capped to theory-level limit)
        from app.physics_engine.constants import MAX_ENHANCEMENT_FACTOR
        total = (screening_factor * phonon_factor * qed_factor * 
                density_factor * casimir_factor * rydberg_factor * loading_factor)
        
        return {
            "total": min(total, MAX_ENHANCEMENT_FACTOR),
            "screening": float(screening_factor),
            "phonon": float(phonon_factor),
            "qed": float(qed_factor),
            "casimir": float(casimir_factor),
            "rydberg": float(rydberg_factor),
            "compression": float(density_factor),
            "loading": float(loading_factor)
        }
    
    @staticmethod
    def _logistic(x: float, steepness: float = 1.0) -> float:
        """Numerically safe logistic gate returning a value in (0, 1)."""
        arg = float(np.clip(x * steepness, -60.0, 60.0))
        return float(1.0 / (1.0 + np.exp(-arg)))

    def _calculate_proton_phases(
        self,
        temperature: float,
        electric_field: float,
        enhancement: float
    ) -> Dict[str, float]:
        """
        Calculate distribution of protons across phase states.

        States: FREE -> SCREENED -> CAPTURE_READY -> NUCLEAR, which is a strictly
        ordered cascade: a proton must be screened before halo-electron overlap can
        make it capture-ready, and capture-ready before the strong force engages.

        The distribution is therefore built from three smooth occupancy gates rather
        than the previous hardcoded tier table, which returned fixed fractions
        (0.4 / 0.2 and a floored nuclear share) whenever the enhancement crossed a
        threshold. Those constants meant the reported distribution was independent
        of temperature, field and loading over wide ranges.

        Gate criteria come from ``PhaseThresholds`` in ``proton_phase_model.py``:
          - screened:      screening energy relative to thermal energy (section 2.1)
          - capture-ready: double-layer field relative to 1e8 V/m (section 2.3)
          - nuclear:       tunnelling enhancement relative to 1e5 (section 5.1)
        each additionally gated on the loading ratio required for that phase.

        Note: ``ProtonPhaseModel.calculate_overlap_probability`` is deliberately not
        used as the capture gate. Even after the density-form units fix (~9e-18
        for a 10 a0 orbital), the nuclear-volume overlap is many orders below any
        useful threshold, so the field criterion from the same theory section
        remains the capture gate. Overlap is still computed on the
        ``ProtonPhaseModel`` path for diagnostics.

        Returns:
            Normalised fractions summing to 1.0.
        """
        from app.physics_engine.proton_phase_model import (
            PhaseThresholds,
            ProtonPhaseModel,
        )

        thresholds = PhaseThresholds()
        phase_model = ProtonPhaseModel(thresholds)

        temperature = max(float(temperature), 1.0)
        loading = float(self.lattice.loading_ratio)

        # Screening strength relative to thermal energy: screening only matters
        # when it exceeds kT.
        screening_ev = phase_model.calculate_screening_energy(
            temperature, self.lattice.electron_density, electric_field
        )
        thermal_ev = self.KB * temperature / self.E_CHARGE
        screening_ratio = screening_ev / max(thermal_ev, 1e-12)

        # log10-space gates so each spans the many decades these quantities cover.
        LOG_STEEPNESS = 1.5
        LOADING_STEEPNESS = 25.0

        g_screened = self._logistic(
            np.log10(max(screening_ratio, 1e-30)), LOG_STEEPNESS
        ) * self._logistic(loading - thresholds.min_loading_ratio, LOADING_STEEPNESS)

        g_capture = self._logistic(
            np.log10(max(electric_field, 1e-30) / thresholds.electric_field_threshold),
            LOG_STEEPNESS,
        ) * self._logistic(
            loading - thresholds.capture_loading_ratio, LOADING_STEEPNESS
        )

        g_nuclear = self._logistic(
            np.log10(max(enhancement, 1e-30) / thresholds.tunneling_enhancement),
            LOG_STEEPNESS,
        ) * self._logistic(
            loading - thresholds.nuclear_loading_ratio, LOADING_STEEPNESS
        )

        # Ordered cascade; these four terms sum to exactly 1 by construction.
        distribution = {
            "FREE": (1.0 - g_screened),
            "SCREENED": g_screened * (1.0 - g_capture),
            "CAPTURE_READY": g_screened * g_capture * (1.0 - g_nuclear),
            "NUCLEAR": g_screened * g_capture * g_nuclear,
        }
        return {k: float(v) for k, v in distribution.items()}
    
    def _phases_from_trajectory(
        self, normalized_time: float
    ) -> Optional[Tuple[str, float]]:
        """Read phase and radius factor off the integrated Rayleigh-Plesset solution.

        Returns ``None`` when no trajectory has been computed yet, so the caller can
        fall back to the analytic envelope.
        """
        trajectory = getattr(self, "_trajectory", None)
        if not trajectory:
            return None

        t_series = trajectory["t"]
        r_series = trajectory["R"]
        if t_series is None or len(t_series) < 3:
            return None

        t_start, t_end = float(t_series[0]), float(t_series[-1])
        span = t_end - t_start
        if span <= 0:
            return None

        t_query = t_start + float(np.clip(normalized_time, 0.0, 1.0)) * span
        radius = float(np.interp(t_query, t_series, r_series))
        radius_factor = radius / self.bubble.initial_radius

        r_min = float(np.min(r_series))
        r_max = float(np.max(r_series))
        t_min = float(t_series[int(np.argmin(r_series))])
        slope = float(np.interp(t_query, t_series, np.gradient(r_series, t_series)))

        # Thresholds are relative to this trajectory's own range so the labels do
        # not depend on the driving amplitude. Phase names match the analytic
        # envelope, so existing consumers are unaffected.
        span = max(r_max - r_min, 1e-30)
        near_minimum = radius <= r_min * 1.05
        rebound_ceiling = r_min + 0.5 * span

        if near_minimum:
            phase = "MINIMUM"
        elif t_query < t_min:
            phase = "EXPANSION" if slope >= 0 else "COLLAPSE"
        elif radius < rebound_ceiling:
            phase = "REBOUND"
        else:
            phase = "RECOVERY"

        return phase, radius_factor

    def get_collapse_trajectory(self, max_points: int = 200) -> Dict[str, Any]:
        """Downsampled view of the integrated Rayleigh-Plesset trajectory.

        ``simulate_collapse`` integrates R(t) and dR/dt but only the scalar peak
        conditions were ever reported, so no client could plot the collapse curve
        itself. This exposes the same cached solution the peak conditions came
        from, decimated to a plottable length.

        The minimum-radius sample is always retained, since that is the collapse
        instant every other reported quantity is evaluated at.

        Args:
            max_points: Upper bound on returned samples.

        Returns:
            Dict with ``time_s``, ``radius_um``, ``wall_velocity_m_s``, and
            provenance, or an empty dict when no collapse has been integrated.
        """
        trajectory = getattr(self, "_trajectory", None)
        if not trajectory:
            return {}

        t = np.asarray(trajectory.get("t"), dtype=float)
        R = np.asarray(trajectory.get("R"), dtype=float)
        dRdt = trajectory.get("dRdt")
        dRdt = np.asarray(dRdt, dtype=float) if dRdt is not None else None
        if t.size == 0 or R.size == 0:
            return {}

        n = int(min(t.size, R.size))
        step = max(1, int(np.ceil(n / max(1, max_points))))
        indices = list(range(0, n, step))

        # The collapse instant must survive decimation.
        min_idx = int(np.argmin(R[:n]))
        if min_idx not in indices:
            indices.append(min_idx)
            indices.sort()

        velocities = None
        if dRdt is not None and dRdt.size >= n:
            velocities = [float(dRdt[i]) for i in indices]

        return {
            "time_s": [float(t[i]) for i in indices],
            "radius_um": [float(R[i] * 1e6) for i in indices],
            "wall_velocity_m_s": velocities,
            "min_radius_sample_index": indices.index(min_idx),
            "sample_count": len(indices),
            "downsample_step": step,
            "source": "rayleigh_plesset_trajectory",
        }

    def get_collapse_phases(self, normalized_time: float) -> Tuple[str, Dict[str, Any]]:
        """
        Determine collapse phase from normalized time (0-1 in cycle).

        Prefers the integrated Rayleigh-Plesset trajectory cached by
        ``simulate_collapse``, so the timeline and the peak conditions describe the
        same collapse. The piecewise envelope below is only a fallback for callers
        that ask for a phase before any collapse has been integrated; previously it
        was always used, which meant the timeline and the reported peak came from two
        different collapse models.

        Returns phase name and associated conditions.
        """
        from_trajectory = self._phases_from_trajectory(normalized_time)
        if from_trajectory is not None:
            phase, radius_factor = from_trajectory
            source = "rayleigh_plesset_trajectory"
        elif normalized_time < 0.4:
            phase = "EXPANSION"
            t = normalized_time / 0.4
            radius_factor = 1 + 0.3 * np.sin(t * np.pi / 2)
            source = "analytic_envelope"
        elif normalized_time < 0.55:
            phase = "COLLAPSE"
            t = (normalized_time - 0.4) / 0.15
            radius_factor = 1.3 - 1.15 * t ** 2
            source = "analytic_envelope"
        elif normalized_time < 0.6:
            phase = "MINIMUM"
            radius_factor = 0.15
            source = "analytic_envelope"
        elif normalized_time < 0.7:
            phase = "REBOUND"
            t = (normalized_time - 0.6) / 0.1
            radius_factor = 0.15 + 0.5 * t
            source = "analytic_envelope"
        else:
            phase = "RECOVERY"
            t = (normalized_time - 0.7) / 0.3
            radius_factor = 0.65 + 0.35 * t
            source = "analytic_envelope"
        
        # Instantaneous thermo must match simulate_collapse: same gamma, same R
        # floor, same T/P ceilings. The old path used max(0.1, radius_factor)
        # (CR<=10), hardcoded γ-1=0.4, and no ceilings, so timeline charts
        # disagreed with the reported peak conditions.
        R0 = self.bubble.initial_radius
        R_min_floor = R0 / self.MAX_COMPRESSION_RATIO
        R = max(R0 * float(radius_factor), R_min_floor)
        compression = float(min(R0 / R, self.MAX_COMPRESSION_RATIO))

        gamma = float(self.bubble.polytropic_index)
        E_field = float(self.bubble.double_layer_field * compression ** 2)

        from app.physics.bubble_collapse import REGIME_MAX_TEMPERATURE
        T_ceiling = float(REGIME_MAX_TEMPERATURE.get("single_bubble", 2.0e6))
        T_raw = float(
            self.bubble.ambient_temperature * compression ** (3.0 * (gamma - 1.0))
        )
        T = min(T_raw, T_ceiling) if np.isfinite(T_raw) else T_ceiling

        P_CEILING_PA = 1.0e10
        P_raw = float(self.bubble.ambient_pressure * compression ** (3.0 * gamma))
        P = min(P_raw, P_CEILING_PA) if np.isfinite(P_raw) else P_CEILING_PA

        conditions = {
            "radius": R,
            "radius_factor": float(R / R0),
            "compression": compression,
            "electric_field": E_field,
            "temperature": T,
            "temperature_raw": T_raw,
            "pressure": P,
            "pressure_raw": P_raw,
            "is_critical": phase in ["COLLAPSE", "MINIMUM"],
            # Which collapse model produced this point, so a client can tell the
            # integrated solution from the fallback envelope.
            "source": source,
        }
        
        return phase, conditions
    
    def calculate_instantaneous_enhancement(self, normalized_time: float) -> Dict[str, Any]:
        """
        Calculate enhancement factor at a specific point in the cycle.
        For real-time visualization feedback.

        ``enhancement`` is clamped to the theory display ceiling and is therefore
        flat across most of the cycle. ``enhancement_log10_raw`` carries the
        uncapped magnitude so a timeline plot still shows real variation instead of
        a horizontal line at the ceiling.
        """
        from app.physics_engine.enhancement_saturation import build_saturation_report

        phase, conditions = self.get_collapse_phases(normalized_time)
        # Prefer the thermo-consistent pressure from get_collapse_phases; never
        # reconstruct pressure from ambient temperature (a prior bug).
        pressure = float(conditions.get("pressure") or (
            self.bubble.ambient_pressure
            * conditions["compression"] ** (3.0 * self.bubble.polytropic_index)
        ))

        breakdown = self._calculate_enhancement_breakdown(
            conditions["temperature"],
            pressure,
            conditions["electric_field"],
            conditions["compression"],
        )
        _, saturation = build_saturation_report(breakdown)
        total = saturation["mechanisms"]["total"]
        enhancement = total["value"]

        proton_phases = self._calculate_proton_phases(
            conditions["temperature"],
            conditions["electric_field"],
            enhancement
        )
        
        return {
            "phase": phase,
            "enhancement": enhancement,
            "enhancement_log10_raw": total["log10_value_raw"],
            "enhancement_is_saturated": total["is_saturated"],
            "proton_distribution": proton_phases,
            "conditions": conditions
        }


def create_bubble_lattice_simulation(
    bubble_params: Optional[Dict[str, Any]] = None,
    lattice_params: Optional[Dict[str, Any]] = None
) -> BubbleLatticeInteraction:
    """Factory function to create simulation with dict parameters."""
    
    bp = BubbleParameters()
    if bubble_params:
        for key, value in bubble_params.items():
            if hasattr(bp, key):
                setattr(bp, key, value)
    
    lp = LatticeParameters()
    if lattice_params:
        for key, value in lattice_params.items():
            if hasattr(lp, key):
                setattr(lp, key, value)
    
    return BubbleLatticeInteraction(bp, lp)


# =============================================================================
# Cavitation Site Geometry (v0.2.2-beta)
# =============================================================================

# Lattice constants for common host materials (meters)
LATTICE_CONSTANTS = {
    "palladium": 3.89e-10,  # FCC
    "nickel": 3.52e-10,     # FCC
    "titanium": 2.95e-10,   # HCP (a-axis)
    "platinum": 3.92e-10,   # FCC
    "lithium": 3.51e-10,    # BCC
}


@dataclass
class CavitationSite:
    """
    Represents a cavitation site where bubble meets lattice.
    
    This is the target point for proton convergence during collapse.
    """
    position: np.ndarray              # 3D coordinates (m)
    lattice_site_type: str           # "octahedral" or "tetrahedral"
    nearest_lattice_atoms: int       # Number of nearest neighbor atoms
    site_energy: float               # Interstitial site energy (eV)
    compression_ratio: float         # R_0/R at this point
    electric_field: float            # Local E-field (V/m)
    
    def __post_init__(self):
        self.position = np.asarray(self.position)


class CavitationGeometry:
    """
    Calculator for cavitation site geometry and proton target positions.
    
    Determines where the bubble cavitation point meets the lattice and
    identifies the optimal inter-atomic sites for proton convergence.
    """
    
    def __init__(
        self,
        host_material: str = "palladium",
        bubble_center: np.ndarray = None,
        lattice_surface_y: float = -5e-6
    ):
        """
        Initialize cavitation geometry calculator.
        
        Args:
            host_material: Host lattice material
            bubble_center: Initial bubble center position (m)
            lattice_surface_y: Y-coordinate of lattice surface (m)
        """
        self.host_material = host_material
        self.lattice_constant = LATTICE_CONSTANTS.get(host_material, 3.89e-10)
        self.bubble_center = np.asarray(bubble_center if bubble_center is not None else [0, 0, 0])
        self.lattice_surface_y = lattice_surface_y
        
        # FCC lattice interstitial sites (fractional coordinates)
        self._octahedral_sites = self._generate_octahedral_sites()
        self._tetrahedral_sites = self._generate_tetrahedral_sites()
        
        logger.info(
            f"Initialized CavitationGeometry for {host_material}, "
            f"lattice constant = {self.lattice_constant*1e10:.3f} Å"
        )
    
    def _generate_octahedral_sites(self) -> np.ndarray:
        """
        Generate octahedral interstitial sites in FCC unit cell.
        
        Octahedral sites in FCC: edge centers and body center.
        These are preferred sites for hydrogen in Pd.
        """
        a = self.lattice_constant
        sites = np.array([
            [0.5, 0.0, 0.0],
            [0.0, 0.5, 0.0],
            [0.0, 0.0, 0.5],
            [0.5, 0.5, 0.0],
            [0.5, 0.0, 0.5],
            [0.0, 0.5, 0.5],
            [0.5, 0.5, 0.5],  # Body center (octahedral)
        ]) * a
        return sites
    
    def _generate_tetrahedral_sites(self) -> np.ndarray:
        """
        Generate tetrahedral interstitial sites in FCC unit cell.
        
        Tetrahedral sites: at 1/4 and 3/4 positions along body diagonals.
        """
        a = self.lattice_constant
        sites = np.array([
            [0.25, 0.25, 0.25],
            [0.75, 0.75, 0.25],
            [0.75, 0.25, 0.75],
            [0.25, 0.75, 0.75],
            [0.75, 0.25, 0.25],
            [0.25, 0.75, 0.25],
            [0.25, 0.25, 0.75],
            [0.75, 0.75, 0.75],
        ]) * a
        return sites
    
    def compute_cavitation_point(
        self,
        bubble_radius: float,
        bubble_center: Optional[np.ndarray] = None
    ) -> np.ndarray:
        """
        Compute the exact cavitation point where bubble meets lattice.
        
        The cavitation point is where the bubble surface contacts the
        lattice surface during collapse.
        
        Args:
            bubble_radius: Current bubble radius (m)
            bubble_center: Current bubble center (uses stored if None)
            
        Returns:
            3D cavitation point coordinates (m)
        """
        center = bubble_center if bubble_center is not None else self.bubble_center
        center = np.asarray(center)
        
        # Direction from bubble center toward lattice surface (downward)
        direction = np.array([0.0, -1.0, 0.0])
        
        # Point on bubble surface closest to lattice
        cavitation_point = center + bubble_radius * direction
        
        # Clamp to lattice surface if bubble has reached it
        if cavitation_point[1] > self.lattice_surface_y:
            cavitation_point[1] = self.lattice_surface_y
        
        return cavitation_point
    
    def find_nearest_interstitial_sites(
        self,
        point: np.ndarray,
        site_type: str = "octahedral",
        num_sites: int = 6,
        search_radius: int = 3
    ) -> np.ndarray:
        """
        Find nearest interstitial sites to a given point.
        
        Args:
            point: Reference point (typically cavitation point)
            site_type: "octahedral" or "tetrahedral"
            num_sites: Number of sites to return
            search_radius: Number of unit cells to search in each direction
            
        Returns:
            Array of (num_sites, 3) site positions
        """
        point = np.asarray(point)
        base_sites = (self._octahedral_sites if site_type == "octahedral" 
                      else self._tetrahedral_sites)
        a = self.lattice_constant
        
        # Generate sites in multiple unit cells
        all_sites = []
        for i in range(-search_radius, search_radius + 1):
            for j in range(-search_radius, search_radius + 1):
                for k in range(-search_radius, search_radius + 1):
                    offset = np.array([i, j, k]) * a
                    # Center the search around the point
                    shifted = base_sites + offset + point
                    all_sites.extend(shifted)
        
        all_sites = np.array(all_sites)
        
        # Sort by distance to reference point
        distances = np.linalg.norm(all_sites - point, axis=1)
        nearest_indices = np.argsort(distances)[:num_sites]
        
        return all_sites[nearest_indices]
    
    def get_target_sites_for_protons(
        self,
        cavitation_point: np.ndarray,
        num_protons: int,
        compression_ratio: float = 1.0
    ) -> List[CavitationSite]:
        """
        Get target interstitial sites for proton convergence.
        
        During bubble collapse, protons should converge on specific
        lattice interstitial sites near the cavitation point.
        
        Args:
            cavitation_point: Cavitation point coordinates
            num_protons: Number of protons to place
            compression_ratio: Current compression ratio (affects site selection)
            
        Returns:
            List of CavitationSite objects
        """
        cavitation_point = np.asarray(cavitation_point)
        
        # Find nearest octahedral sites (preferred for H in Pd)
        site_positions = self.find_nearest_interstitial_sites(
            cavitation_point,
            site_type="octahedral",
            num_sites=num_protons
        )
        
        sites = []
        for i, pos in enumerate(site_positions):
            distance = np.linalg.norm(pos - cavitation_point)
            
            # Site energy (approximate, decreases with compression)
            # Reference: Hydrogen in Pd has ~0.2 eV site energy
            base_energy = 0.2  # eV
            site_energy = base_energy / (1 + 0.1 * compression_ratio)
            
            # Local E-field increases with compression
            E_field = 1e8 * compression_ratio**2 / (1 + distance * 1e6)
            
            site = CavitationSite(
                position=pos,
                lattice_site_type="octahedral",
                nearest_lattice_atoms=6,  # Octahedral coordination
                site_energy=site_energy,
                compression_ratio=compression_ratio,
                electric_field=E_field
            )
            sites.append(site)
        
        return sites
    
    def compute_proton_convergence_zone(
        self,
        cavitation_point: np.ndarray,
        compression_ratio: float
    ) -> Dict[str, Any]:
        """
        Compute the convergence zone parameters for proton dynamics.
        
        The convergence zone is a cone-shaped region where protons
        are funneled toward the cavitation point.
        
        Args:
            cavitation_point: Cavitation point coordinates
            compression_ratio: Current compression ratio
            
        Returns:
            Dictionary with convergence zone parameters
        """
        # Convergence zone size scales with compression
        base_radius = 1e-6  # 1 μm base
        zone_radius = base_radius / compression_ratio
        
        # Cone height (distance protons are attracted from)
        zone_height = 5e-6 / np.sqrt(compression_ratio)
        
        # Convergence strength (radial attraction coefficient)
        convergence_strength = 1e-10 * compression_ratio**2
        
        # Spiral parameters (tangential velocity component)
        spiral_frequency = 1e9 * np.sqrt(compression_ratio)  # rad/s
        
        return {
            "center": cavitation_point.tolist(),
            "radius": zone_radius,
            "height": zone_height,
            "convergence_strength": convergence_strength,
            "spiral_frequency": spiral_frequency,
            "compression_ratio": compression_ratio
        }
    
    def get_lattice_site_visualization_data(
        self,
        cavitation_point: np.ndarray,
        num_sites: int = 12
    ) -> Dict[str, Any]:
        """
        Get visualization data for lattice sites around cavitation point.
        
        Args:
            cavitation_point: Cavitation point coordinates
            num_sites: Number of sites to include
            
        Returns:
            Dictionary with visualization data
        """
        octahedral = self.find_nearest_interstitial_sites(
            cavitation_point, "octahedral", num_sites // 2
        )
        tetrahedral = self.find_nearest_interstitial_sites(
            cavitation_point, "tetrahedral", num_sites // 2
        )
        
        return {
            "cavitation_point": cavitation_point.tolist(),
            "octahedral_sites": octahedral.tolist(),
            "tetrahedral_sites": tetrahedral.tolist(),
            "lattice_constant": self.lattice_constant,
            "host_material": self.host_material
        }


def create_cavitation_geometry(
    host_material: str = "palladium",
    bubble_center: Optional[np.ndarray] = None,
    lattice_surface_y: float = -5e-6
) -> CavitationGeometry:
    """
    Factory function to create cavitation geometry calculator.
    
    Args:
        host_material: Host lattice material
        bubble_center: Initial bubble center position
        lattice_surface_y: Y-coordinate of lattice surface
        
    Returns:
        Configured CavitationGeometry instance
    """
    return CavitationGeometry(
        host_material=host_material,
        bubble_center=bubble_center,
        lattice_surface_y=lattice_surface_y
    )
