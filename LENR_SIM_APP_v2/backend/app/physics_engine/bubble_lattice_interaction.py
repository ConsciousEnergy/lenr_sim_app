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
                "screening_potential": 800.0    # eV (D-D in Pd)
            },
            "nickel": {
                "lattice_constant": 3.52e-10,   # m (FCC)
                "electron_density": 9.1e28,     # m^-3
                "debye_temperature": 450.0,     # K
                "work_function": 5.15,          # eV
                "fermi_energy": 11.7,           # eV
                "screening_potential": 500.0    # eV (H-H in Ni, estimate)
            },
            "titanium": {
                "lattice_constant": 2.95e-10,   # m (HCP)
                "electron_density": 1.0e29,     # m^-3 (varies with structure)
                "debye_temperature": 420.0,     # K
                "work_function": 4.33,          # eV
                "fermi_energy": 7.0,            # eV
                "screening_potential": 350.0    # eV (D-D in Ti, estimate)
            },
            "platinum": {
                "lattice_constant": 3.92e-10,   # m (FCC)
                "electron_density": 6.6e28,     # m^-3
                "debye_temperature": 240.0,     # K
                "work_function": 5.65,          # eV
                "fermi_energy": 9.7,            # eV
                "screening_potential": 750.0    # eV (estimate)
            },
            "lithium": {
                "lattice_constant": 3.51e-10,   # m (BCC)
                "electron_density": 4.7e28,     # m^-3
                "debye_temperature": 344.0,     # K
                "work_function": 2.9,           # eV
                "fermi_energy": 4.7,            # eV
                "screening_potential": 300.0    # eV (Li-H Rydberg matter, estimate)
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
        
        # Van der Waals hard-core floor: R_min >= R_0 / MAX_COMPRESSION_RATIO
        R_min_floor = self.bubble.initial_radius / self.MAX_COMPRESSION_RATIO
        R_min = max(R[min_idx], R_min_floor, 1e-12)
        collapse_time = t[min_idx]
        
        # Compression ratio is capped by the hard-core limit
        compression_ratio = min(self.bubble.initial_radius / R_min, self.MAX_COMPRESSION_RATIO)
        
        # Adiabatic temperature rise: T = T0 * (R0/R)^(3(γ-1))
        gamma = self.bubble.polytropic_index
        T_max_raw = self.bubble.ambient_temperature * compression_ratio ** (3 * (gamma - 1))
        # Cap at regime-specific max (sonofusion/single_bubble ~1e4 K)
        from app.physics.bubble_collapse import REGIME_MAX_TEMPERATURE
        T_max = min(T_max_raw, REGIME_MAX_TEMPERATURE.get("single_bubble", 1e4))
        
        # Pressure at collapse (capped at 10^10 Pa, consistent with bubble_collapse.py)
        P_max_raw = self.bubble.ambient_pressure * compression_ratio ** (3 * gamma)
        P_max = min(P_max_raw, 1e10)  # ~100 kbar, sonoluminescence regime
        
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
        # Screening enhancement (temperature-dependent Debye model)
        n_e = self.lattice.electron_density
        lambda_d = np.sqrt(self.EPS0 * self.KB * max(temperature, 1.0) / (n_e * self.E_CHARGE ** 2))
        U_screen = self.E_CHARGE ** 2 / (4 * np.pi * self.EPS0 * lambda_d)
        
        E_thermal = max(1.5 * self.KB * temperature, 1e-25)  # Prevent division by zero
        # Limit exponent to prevent overflow (exp(700) ≈ 10^304)
        exp_arg = min(U_screen / E_thermal, 9.2)  # exp(9.2) ≈ 10^4
        screening_factor = np.exp(exp_arg)
        
        # Phonon-nuclear coupling (temperature-dependent)
        phonon_factor = self._calculate_debye_phonon_coupling(temperature)
        
        # QED field enhancement
        E_critical = 1e8  # V/m
        qed_factor = 1 + (electric_field / E_critical) ** 2
        
        # Compression enhancement (increased density)
        density_factor = compression ** 2
        
        # Casimir enhancement (scales with 1/d⁴, simplified as compression²)
        casimir_factor = compression ** 2
        
        # Rydberg Matter enhancement (simplified)
        rydberg_factor = 1 + 0.5 * compression * (electric_field / 1e8)
        
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
        
        if enhancement >= nuclear_threshold:
            # Preserve a non-zero nuclear share at the exact threshold boundary.
            distribution["NUCLEAR"] = max(
                0.01,
                min(0.3, (enhancement / nuclear_threshold - 1) * 0.1),
            )
            distribution["CAPTURE_READY"] = 0.4
            distribution["SCREENED"] = 0.2
            distribution["FREE"] = 1 - sum(distribution.values())
        elif enhancement >= capture_threshold:
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
