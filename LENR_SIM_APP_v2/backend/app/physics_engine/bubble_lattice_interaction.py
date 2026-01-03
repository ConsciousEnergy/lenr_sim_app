"""
Bubble-Lattice Interaction Physics Model

Couples Rayleigh-Plesset bubble dynamics with lattice-loaded material physics
for unified LENR simulation. Models the electrodynamic ionic double-layer
bubble collapsing onto lattice surfaces.

Based on Section 3.2 of the unified LENR theory paper:
R*R'' + 3/2*R'^2 = (P_bubble - P_inf - 2*sigma/R - 4*mu*R'/R + epsilon_0*E^2/2) / rho

Author: Conscious Energies
"""

import numpy as np
from typing import Dict, Any, Optional, List, Tuple
from dataclasses import dataclass, field
from scipy import constants as const
from scipy.integrate import odeint
import logging

logger = logging.getLogger(__name__)


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
    polytropic_index: float = 1.4  # γ for adiabatic process
    
    # Electric field in double layer
    double_layer_field: float = 1e8  # V/m


@dataclass
class LatticeParameters:
    """Parameters for lattice interaction."""
    host_material: str = "palladium"
    loading_ratio: float = 0.9  # H/M ratio
    defect_density: float = 1e16  # m⁻³
    surface_roughness: float = 5e-9  # m
    lattice_constant: float = 3.89e-10  # m (Pd)
    electron_density: float = 6.8e28  # m⁻³


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
    
    def rayleigh_plesset_rhs(self, y: np.ndarray, t: float) -> np.ndarray:
        """
        Right-hand side of modified Rayleigh-Plesset equation.
        
        y = [R, dR/dt]
        
        Modified RP equation from paper Section 3.2:
        R*R'' + 3/2*R'^2 = (1/ρ) * [P_b - P_∞ - 2σ/R - 4μR'/R + ε₀E²/2]
        """
        R, dRdt = y
        
        # Prevent singularity at R=0
        R = max(R, 1e-12)
        
        # Driving pressure (sinusoidal acoustic field)
        omega = 2 * np.pi * self.bubble.frequency
        P_acoustic = self.bubble.driving_pressure * np.sin(omega * t)
        P_infinity = self.bubble.ambient_pressure + P_acoustic
        
        # Bubble internal pressure (polytropic gas law)
        R0 = self.bubble.initial_radius
        gamma = self.bubble.polytropic_index
        P_gas_0 = self.bubble.ambient_pressure + 2 * self.bubble.surface_tension / R0
        P_bubble = P_gas_0 * (R0 / R) ** (3 * gamma)
        
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
        
        return np.array([dRdt, d2Rdt2])
    
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
        
        # Integrate ODE
        solution = odeint(self.rayleigh_plesset_rhs, y0, t)
        
        R = solution[:, 0]
        dRdt = solution[:, 1]
        
        # Find minimum radius (collapse point)
        min_idx = np.argmin(R)
        R_min = R[min_idx]
        collapse_time = t[min_idx]
        
        # Calculate peak conditions at collapse
        compression_ratio = self.bubble.initial_radius / R_min
        
        # Adiabatic temperature rise: T = T0 * (R0/R)^(3(γ-1))
        gamma = self.bubble.polytropic_index
        T_max = self.bubble.ambient_temperature * compression_ratio ** (3 * (gamma - 1))
        
        # Pressure at collapse
        P_max = self.bubble.ambient_pressure * compression_ratio ** (3 * gamma)
        
        # Peak double-layer field
        E_peak = self.bubble.double_layer_field * compression_ratio ** 2
        
        # Calculate enhancement factor
        enhancement = self._calculate_enhancement_at_collapse(
            T_max, P_max, E_peak, compression_ratio
        )
        
        # Determine proton phase distribution
        proton_phases = self._calculate_proton_phases(T_max, E_peak, enhancement)
        
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
            proton_phase_distribution=proton_phases
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
        # Screening enhancement (simplified Debye model)
        n_e = self.lattice.electron_density
        lambda_d = np.sqrt(self.EPS0 * self.KB * temperature / (n_e * self.E_CHARGE ** 2))
        U_screen = self.E_CHARGE ** 2 / (4 * np.pi * self.EPS0 * lambda_d)
        
        E_thermal = 1.5 * self.KB * temperature
        screening_factor = min(1e4, np.exp(U_screen / E_thermal))
        
        # QED field enhancement
        E_critical = 1e8  # V/m
        qed_factor = 1 + (electric_field / E_critical) ** 2
        
        # Compression enhancement (increased density)
        density_factor = compression ** 2
        
        # Casimir enhancement (scales with 1/d⁴, simplified as compression²)
        casimir_factor = compression ** 2
        
        # Rydberg Matter enhancement (simplified)
        rydberg_factor = 1 + 0.5 * compression * (electric_field / 1e8)
        
        # Loading ratio bonus
        loading_factor = 1 + 10 * (self.lattice.loading_ratio - 0.8) if self.lattice.loading_ratio > 0.8 else 1
        
        # Combined enhancement (multiplicative, capped)
        total = screening_factor * qed_factor * density_factor * casimir_factor * rydberg_factor * loading_factor
        
        return {
            "total": min(total, 1e8),
            "screening": float(screening_factor),
            "qed": float(qed_factor),
            "casimir": float(casimir_factor),
            "rydberg": float(rydberg_factor),
            "compression": float(density_factor),
            "loading": float(loading_factor)
        }
    
    def _calculate_proton_phases(
        self,
        temperature: float,
        electric_field: float,
        enhancement: float
    ) -> Dict[str, float]:
        """
        Calculate distribution of protons across phase states.
        
        States: FREE, SCREENED, CAPTURE_READY, NUCLEAR
        """
        # Thresholds from theory
        screening_threshold = 10 * self.E_CHARGE  # 10 eV
        capture_threshold = 1e3  # Enhancement factor
        nuclear_threshold = 1e5  # Enhancement factor
        
        E_thermal = self.KB * temperature
        
        # Calculate probabilities based on conditions
        distribution = {
            "FREE": 0.0,
            "SCREENED": 0.0,
            "CAPTURE_READY": 0.0,
            "NUCLEAR": 0.0
        }
        
        if enhancement > nuclear_threshold:
            distribution["NUCLEAR"] = min(0.3, (enhancement / nuclear_threshold - 1) * 0.1)
            distribution["CAPTURE_READY"] = 0.4
            distribution["SCREENED"] = 0.2
            distribution["FREE"] = 1 - sum(distribution.values())
        elif enhancement > capture_threshold:
            distribution["CAPTURE_READY"] = min(0.5, (enhancement / capture_threshold - 1) * 0.2)
            distribution["SCREENED"] = 0.3
            distribution["FREE"] = 1 - sum(distribution.values())
        elif electric_field > 1e7:
            distribution["SCREENED"] = min(0.6, electric_field / 1e8)
            distribution["FREE"] = 1 - distribution["SCREENED"]
        else:
            distribution["FREE"] = 1.0
        
        return distribution
    
    def get_collapse_phases(self, normalized_time: float) -> Tuple[str, Dict[str, Any]]:
        """
        Determine collapse phase from normalized time (0-1 in cycle).
        
        Returns phase name and associated conditions.
        """
        if normalized_time < 0.4:
            phase = "EXPANSION"
            t = normalized_time / 0.4
            radius_factor = 1 + 0.3 * np.sin(t * np.pi / 2)
        elif normalized_time < 0.55:
            phase = "COLLAPSE"
            t = (normalized_time - 0.4) / 0.15
            radius_factor = 1.3 - 1.15 * t ** 2
        elif normalized_time < 0.6:
            phase = "MINIMUM"
            radius_factor = 0.15
        elif normalized_time < 0.7:
            phase = "REBOUND"
            t = (normalized_time - 0.6) / 0.1
            radius_factor = 0.15 + 0.5 * t
        else:
            phase = "RECOVERY"
            t = (normalized_time - 0.7) / 0.3
            radius_factor = 0.65 + 0.35 * t
        
        # Calculate instantaneous conditions
        R0 = self.bubble.initial_radius
        R = R0 * max(0.1, radius_factor)
        compression = R0 / R
        
        E_field = self.bubble.double_layer_field * compression ** 2
        T = self.bubble.ambient_temperature * compression ** (3 * 0.4)  # γ-1 ≈ 0.4
        
        conditions = {
            "radius": R,
            "radius_factor": radius_factor,
            "compression": compression,
            "electric_field": E_field,
            "temperature": T,
            "is_critical": phase in ["COLLAPSE", "MINIMUM"]
        }
        
        return phase, conditions
    
    def calculate_instantaneous_enhancement(self, normalized_time: float) -> Dict[str, Any]:
        """
        Calculate enhancement factor at a specific point in the cycle.
        For real-time visualization feedback.
        """
        phase, conditions = self.get_collapse_phases(normalized_time)
        
        enhancement = self._calculate_enhancement_at_collapse(
            conditions["temperature"],
            self.bubble.ambient_pressure * conditions["compression"] ** 4.2,
            conditions["electric_field"],
            conditions["compression"]
        )
        
        proton_phases = self._calculate_proton_phases(
            conditions["temperature"],
            conditions["electric_field"],
            enhancement
        )
        
        return {
            "phase": phase,
            "enhancement": enhancement,
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
