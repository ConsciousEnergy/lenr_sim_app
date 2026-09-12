"""
Bubble Fusion (Sonofusion) Calculator
=====================================

This module implements calculations for acoustic cavitation fusion,
also known as sonofusion or bubble fusion.

The physics involves:
1. Rayleigh-Plesset equation for bubble dynamics
2. Adiabatic compression heating
3. Shock wave focusing
4. Nuclear reaction conditions at collapse

Reference:
- Rayleigh-Plesset equation for bubble dynamics
- Taleyarkhan et al. (2002) Science paper (controversial)
- Putterman & Weninger (2000) Annual Review of Fluid Mechanics
"""

import numpy as np
from typing import Dict, Tuple, Optional, Any
from dataclasses import dataclass
from scipy import integrate, optimize
from enum import Enum

from .core_constants import (
    K_BOLTZMANN, M_DEUTERON, AMU, KEV_TO_J, EV_TO_J,
    thermal_energy, reduced_mass
)


class FluidType(Enum):
    """Available working fluids."""
    WATER = "water"
    DEUTERATED_WATER = "d2o"
    ACETONE = "acetone"
    DEUTERATED_ACETONE = "d_acetone"


class GasType(Enum):
    """Available bubble gases."""
    AIR = "air"
    ARGON = "argon"
    DEUTERIUM = "deuterium"
    XENON = "xenon"


@dataclass
class FluidProperties:
    """Properties of the working fluid."""
    name: str
    density: float  # kg/m³
    surface_tension: float  # N/m
    viscosity: float  # Pa·s
    vapor_pressure: float  # Pa at 298 K
    sound_speed: float  # m/s
    gamma: float  # Heat capacity ratio of vapor


FLUID_DATA = {
    FluidType.WATER: FluidProperties(
        name="Water",
        density=998.0,
        surface_tension=0.0728,
        viscosity=0.001,
        vapor_pressure=3169.0,
        sound_speed=1481.0,
        gamma=1.33
    ),
    FluidType.DEUTERATED_WATER: FluidProperties(
        name="Heavy Water",
        density=1107.0,
        surface_tension=0.0718,
        viscosity=0.00125,
        vapor_pressure=2740.0,
        sound_speed=1400.0,
        gamma=1.33
    ),
    FluidType.ACETONE: FluidProperties(
        name="Acetone",
        density=784.0,
        surface_tension=0.0237,
        viscosity=0.00032,
        vapor_pressure=30800.0,
        sound_speed=1174.0,
        gamma=1.12
    ),
    FluidType.DEUTERATED_ACETONE: FluidProperties(
        name="Deuterated Acetone",
        density=870.0,
        surface_tension=0.0235,
        viscosity=0.00034,
        vapor_pressure=28000.0,
        sound_speed=1100.0,
        gamma=1.12
    ),
}


@dataclass
class GasProperties:
    """Properties of the bubble gas."""
    name: str
    molecular_mass: float  # AMU
    gamma: float  # Heat capacity ratio
    is_fusible: bool  # Can undergo fusion


GAS_DATA = {
    GasType.AIR: GasProperties(
        name="Air",
        molecular_mass=29.0,
        gamma=1.4,
        is_fusible=False
    ),
    GasType.ARGON: GasProperties(
        name="Argon",
        molecular_mass=40.0,
        gamma=1.67,
        is_fusible=False
    ),
    GasType.DEUTERIUM: GasProperties(
        name="Deuterium",
        molecular_mass=4.0,
        gamma=1.4,
        is_fusible=True
    ),
    GasType.XENON: GasProperties(
        name="Xenon",
        molecular_mass=131.0,
        gamma=1.67,
        is_fusible=False
    ),
}


@dataclass
class BubbleCollapseResult:
    """Result of bubble collapse calculation."""
    max_temperature_k: float
    max_pressure_pa: float
    min_radius_m: float
    compression_ratio: float
    collapse_time_s: float
    peak_velocity_m_s: float
    fusion_probability: float
    neutron_yield_estimate: float
    energy_density_j_m3: float
    conditions_met: Dict[str, bool]


@dataclass
class BubbleSimulationParams:
    """Parameters for bubble fusion simulation."""
    initial_radius_um: float = 10.0
    acoustic_pressure_bar: float = 1.2
    frequency_khz: float = 20.0
    ambient_pressure_bar: float = 1.0
    ambient_temperature_k: float = 298.0
    fluid_type: FluidType = FluidType.WATER
    gas_type: GasType = GasType.DEUTERIUM
    gas_fraction: float = 0.8  # Fraction of dissolved gas


class BubbleFusionCalculator:
    """
    Calculator for bubble fusion / sonofusion.
    
    Implements the Rayleigh-Plesset equation and estimates
    fusion conditions during bubble collapse.
    """
    
    def __init__(self):
        """Initialize the bubble fusion calculator."""
        self.c_fusion_threshold_k = 1e6  # 1 million K for fusion consideration
        self.c_fusion_threshold_pa = 1e11  # 100 GPa
    
    def simulate_collapse(
        self,
        params: BubbleSimulationParams,
        num_cycles: int = 1,
        time_points: int = 1000
    ) -> BubbleCollapseResult:
        """
        Simulate bubble collapse and calculate peak conditions.
        
        Uses simplified Rayleigh-Plesset dynamics to estimate
        maximum temperature and pressure during collapse.
        
        Args:
            params: Bubble simulation parameters
            num_cycles: Number of acoustic cycles to simulate
            time_points: Number of time points for calculation
            
        Returns:
            BubbleCollapseResult with peak conditions
        """
        # Get fluid and gas properties
        fluid = FLUID_DATA.get(params.fluid_type, FLUID_DATA[FluidType.WATER])
        gas = GAS_DATA.get(params.gas_type, GAS_DATA[GasType.DEUTERIUM])
        
        # Convert units
        R0 = params.initial_radius_um * 1e-6  # meters
        Pa = params.acoustic_pressure_bar * 1e5  # Pascals
        P0 = params.ambient_pressure_bar * 1e5  # Pascals
        T0 = params.ambient_temperature_k
        f = params.frequency_khz * 1e3  # Hz
        omega = 2 * np.pi * f
        
        # Fluid properties
        rho = fluid.density
        sigma = fluid.surface_tension
        mu = fluid.viscosity
        c = fluid.sound_speed
        gamma = gas.gamma
        
        # Initial pressure inside bubble (gas + vapor)
        P_gas0 = P0 + 2 * sigma / R0 - fluid.vapor_pressure
        
        # Calculate minimum radius using adiabatic compression
        # R_min/R0 = (P0/P_max)^(1/3γ)
        # For violent collapse, estimate compression ratio
        
        # Maximum expansion ratio (during rarefaction phase)
        # Blake threshold: Pa > P0 - Pv + 2σ/R0 ≈ P0 for large bubbles
        if Pa > P0:
            expansion_ratio = (Pa / P0) ** (1/3)
            R_max = R0 * expansion_ratio
        else:
            expansion_ratio = 1.1
            R_max = R0 * 1.1
        
        # Collapse dynamics
        # Using simplified model: collapse velocity approaches sound speed
        # Actual collapse is more complex (Rayleigh collapse)
        
        # Rayleigh collapse time
        t_collapse = 0.915 * R_max * np.sqrt(rho / P0)
        
        # Minimum radius from adiabatic compression
        # P_final / P_initial = (R_initial / R_final)^(3γ)
        # For strong collapse with Pa/P0 >> 1
        # Guard against division by zero when gamma approaches 1.0
        gamma_exponent = 3 * gamma - 3
        if abs(gamma_exponent) < 0.01:
            # For nearly isothermal processes (gamma ≈ 1), use PV = constant
            # In isothermal compression: P1*V1 = P2*V2, so V2/V1 = P1/P2
            # compression_ratio = R_max/R_min, and V ∝ R^3, so R_ratio = (P_ratio)^(1/3)
            compression_ratio = (Pa / P0 + 1)  # Isothermal approximation
        else:
            compression_ratio = (Pa / P0 + 1) ** (1 / gamma_exponent)
        compression_ratio = max(compression_ratio, 10)  # At least 10x compression
        compression_ratio = min(compression_ratio, 1000)  # Physical limit
        
        R_min = R_max / compression_ratio
        
        # Peak conditions (adiabatic)
        # T_max = T0 * (R0/R_min)^(3(γ-1))
        # Guard against gamma ≈ 1 (isothermal case: no temperature change)
        gamma_minus_1 = gamma - 1
        if abs(gamma_minus_1) < 0.01:
            # Isothermal process: temperature remains constant by definition
            # Heat is transferred to maintain constant T during compression
            T_max = T0
        else:
            T_max = T0 * (R_max / R_min) ** (3 * gamma_minus_1)
        T_max = min(T_max, 1e8)  # Cap at 100 million K
        
        # P_max = P_gas0 * (R0/R_min)^(3γ)
        P_max = P_gas0 * (R_max / R_min) ** (3 * gamma)
        P_max = min(P_max, 1e15)  # Cap at 1 PPa
        
        # Peak collapse velocity (Rayleigh)
        # v_max ≈ sqrt(2P0/3ρ) * (R_max/R_min)
        v_max = np.sqrt(2 * P0 / (3 * rho)) * (R_max / R_min) ** 1.5
        v_max = min(v_max, c * 10)  # Cap at 10x sound speed
        
        # Energy density at collapse
        energy_density = 0.5 * rho * v_max**2
        
        # Check fusion conditions
        conditions = {
            "temperature_threshold": T_max > self.c_fusion_threshold_k,
            "pressure_threshold": P_max > self.c_fusion_threshold_pa,
            "fusible_gas": gas.is_fusible,
            "sufficient_density": compression_ratio > 100
        }
        
        # Estimate fusion probability
        fusion_prob = self._estimate_fusion_probability(
            T_max, P_max, compression_ratio, gas, params
        )
        
        # Estimate neutron yield
        neutron_yield = self._estimate_neutron_yield(
            fusion_prob, params, gas
        )
        
        return BubbleCollapseResult(
            max_temperature_k=float(T_max),
            max_pressure_pa=float(P_max),
            min_radius_m=float(R_min),
            compression_ratio=float(compression_ratio),
            collapse_time_s=float(t_collapse),
            peak_velocity_m_s=float(v_max),
            fusion_probability=float(fusion_prob),
            neutron_yield_estimate=float(neutron_yield),
            energy_density_j_m3=float(energy_density),
            conditions_met=conditions
        )
    
    def _estimate_fusion_probability(
        self,
        T_max: float,
        P_max: float,
        compression_ratio: float,
        gas: GasProperties,
        params: BubbleSimulationParams
    ) -> float:
        """Estimate fusion probability based on peak conditions."""
        if not gas.is_fusible:
            return 0.0
        
        if T_max < 1e5:  # Below 100,000 K, essentially zero
            return 0.0
        
        # Thermal energy at peak temperature
        kT_kev = (K_BOLTZMANN * T_max) / KEV_TO_J
        
        # Very rough estimate using Gamow factor
        # For D-D fusion at high temperature
        from .wkb_tunneling import calculate_dd_tunneling
        
        try:
            result = calculate_dd_tunneling(
                energy_kev=kT_kev,
                temperature_k=T_max,
                material='nickel',  # Use generic
                screening_energy_ev=0
            )
            base_prob = result.probability
        except Exception:
            # Fallback estimate
            # P ~ exp(-√(Eg/E)) where Eg is Gamow energy
            E_gamow_kev = 986  # For D-D
            gamow_factor = np.sqrt(E_gamow_kev / max(kT_kev, 0.01))
            base_prob = np.exp(-gamow_factor)
        
        # Density enhancement
        density_factor = compression_ratio ** 2
        
        # Total probability estimate
        fusion_prob = base_prob * density_factor * params.gas_fraction
        
        return min(fusion_prob, 1.0)
    
    def _estimate_neutron_yield(
        self,
        fusion_prob: float,
        params: 'BubbleSimulationParams',
        gas: GasProperties
    ) -> float:
        """Estimate neutron yield per collapse."""
        if fusion_prob <= 0:
            return 0.0
        
        # Number of gas atoms is conserved through the collapse, so count them
        # in the *initial* bubble at ambient conditions with the ideal gas law
        # n0 = P0 / (kB * T0). (A previous version multiplied the collapsed
        # volume by a hardcoded 1e30 m^-3, a magic density unrelated to the
        # actual gas inventory.)
        k_B = 1.380649e-23  # J/K
        R0_m = params.initial_radius_um * 1e-6
        P0_pa = params.ambient_pressure_bar * 1e5
        T0_k = max(params.ambient_temperature_k, 1.0)
        n_ambient = P0_pa / (k_B * T0_k)  # m^-3 (~2.4e25 at 1 bar, 298 K)
        n_atoms = (4/3) * np.pi * R0_m**3 * n_ambient * params.gas_fraction
        n_atoms = min(n_atoms, 1e15)  # Physical limit
        
        # D-D → 50% He-3 + n, 50% T + p
        neutron_branch = 0.5
        
        # Yield estimate
        yield_estimate = n_atoms * fusion_prob * neutron_branch
        
        return yield_estimate
    
    def calculate_bubble_dynamics_timeseries(
        self,
        params: BubbleSimulationParams,
        num_cycles: int = 2,
        time_points: int = 500
    ) -> Dict[str, np.ndarray]:
        """
        Calculate bubble radius vs time using simplified dynamics.
        
        Returns time series data for visualization.
        """
        # Get fluid properties
        fluid = FLUID_DATA.get(params.fluid_type, FLUID_DATA[FluidType.WATER])
        gas = GAS_DATA.get(params.gas_type, GAS_DATA[GasType.DEUTERIUM])
        
        # Convert units
        R0 = params.initial_radius_um * 1e-6
        Pa = params.acoustic_pressure_bar * 1e5
        P0 = params.ambient_pressure_bar * 1e5
        f = params.frequency_khz * 1e3
        T = 1 / f
        gamma = gas.gamma
        
        # Time array
        t = np.linspace(0, num_cycles * T, time_points)
        
        # Driving pressure
        P_drive = P0 - Pa * np.sin(2 * np.pi * f * t)
        
        # Simplified bubble response (quasi-static approximation)
        # R³ ∝ 1/P for isothermal, R^3γ ∝ 1/P for adiabatic
        # Using intermediate behavior
        eff_gamma = (gamma + 1) / 2
        
        R = R0 * (P0 / np.maximum(P_drive, P0 * 0.01)) ** (1 / (3 * eff_gamma))
        R = np.minimum(R, R0 * 100)  # Cap expansion
        R = np.maximum(R, R0 * 0.001)  # Cap compression
        
        # Estimate temperature (adiabatic)
        # Guard against gamma ≈ 1 (isothermal case)
        gamma_minus_1 = gamma - 1
        if abs(gamma_minus_1) < 0.01:
            # Nearly isothermal: minimal temperature change
            T_gas = np.full_like(R, params.ambient_temperature_k)
        else:
            T_gas = params.ambient_temperature_k * (R0 / R) ** (3 * gamma_minus_1)
        T_gas = np.minimum(T_gas, 1e8)
        
        # Estimate internal pressure
        P_internal = P0 * (R0 / R) ** (3 * gamma)
        P_internal = np.minimum(P_internal, 1e15)
        
        # Radial velocity (dR/dt approximation)
        v_radial = np.gradient(R, t)
        
        return {
            "time_s": t,
            "time_us": t * 1e6,
            "radius_m": R,
            "radius_um": R * 1e6,
            "temperature_k": T_gas,
            "pressure_pa": P_internal,
            "pressure_bar": P_internal / 1e5,
            "velocity_m_s": v_radial,
            "driving_pressure_pa": P_drive
        }


def _compressibility_regime(peak_mach: float) -> str:
    if peak_mach >= 0.1:
        return "compressibility_significant"
    if peak_mach >= 0.01:
        return "compressibility_marginal"
    return "incompressible_valid"


def _simulate_bubble_fusion_ode(
    *,
    initial_radius_um: float,
    acoustic_pressure_bar: float,
    frequency_khz: float,
    ambient_pressure_bar: float,
    ambient_temperature_k: float,
    fluid_type: str,
    gas_type: str,
    dynamics_mode: str,
) -> Dict[str, Any]:
    """
    Phase B bridge: run the shared lattice-grade RP/KM ODE core for a single bubble.

    Does not enable KM auto-default. Caller must pass an explicit
    rayleigh_plesset or keller_miksis mode.
    """
    from ..physics_engine.bubble_lattice_interaction import (
        BubbleLatticeInteraction,
        BubbleParameters,
        LatticeParameters,
    )

    fluid = FLUID_DATA.get(
        {
            "water": FluidType.WATER,
            "d2o": FluidType.DEUTERATED_WATER,
            "heavy_water": FluidType.DEUTERATED_WATER,
            "acetone": FluidType.ACETONE,
            "d_acetone": FluidType.DEUTERATED_ACETONE,
        }.get(fluid_type.lower(), FluidType.WATER),
        FLUID_DATA[FluidType.WATER],
    )

    bubble_params = BubbleParameters(
        initial_radius=initial_radius_um * 1e-6,
        ambient_pressure=ambient_pressure_bar * 1e5,
        driving_pressure=acoustic_pressure_bar * 1e5,
        frequency=frequency_khz * 1e3,
        ambient_temperature=ambient_temperature_k,
        fluid_density=fluid.density,
        surface_tension=fluid.surface_tension,
        dynamic_viscosity=fluid.viscosity,
        gas_type=gas_type,
        bubble_dynamics_mode=dynamics_mode,
        sound_speed=fluid.sound_speed,
    )
    # Lattice host is unused for BF page peaks; keep defaults for the shared core.
    model = BubbleLatticeInteraction(bubble_params, LatticeParameters())
    collapse = model.simulate_collapse(num_cycles=2)
    dynamics = dict(collapse.bubble_dynamics or {})
    peak_mach = float(dynamics.get("peak_mach", 0.0))
    peak_velocity_m_s = peak_mach * float(getattr(bubble_params, "sound_speed", fluid.sound_speed))

    traj = getattr(model, "_trajectory", None) or {}
    t = traj.get("t")
    R = traj.get("R")
    if t is not None and R is not None and len(t) > 1:
        # Subsample for the BF timeseries contract.
        step = max(1, len(t) // 200)
        idx = np.arange(0, len(t), step)
        time_us = (np.asarray(t)[idx] * 1e6).tolist()
        radius_um = (np.asarray(R)[idx] * 1e6).tolist()
        # Temperature/pressure along the full ODE path are not stored; fill peaks only.
        temperature_k = [ambient_temperature_k] * len(time_us)
        pressure_bar = [ambient_pressure_bar] * len(time_us)
        if temperature_k:
            temperature_k[-1] = float(collapse.max_temperature)
            pressure_bar[-1] = float(collapse.max_pressure) / 1e5
    else:
        time_us, radius_um, temperature_k, pressure_bar = [], [], [], []

    km_recommended = peak_mach >= 0.3
    return {
        "collapse_results": {
            "max_temperature_k": float(collapse.max_temperature),
            "max_temperature_ev": float(collapse.max_temperature) * K_BOLTZMANN / EV_TO_J,
            "max_pressure_pa": float(collapse.max_pressure),
            "max_pressure_gpa": float(collapse.max_pressure) / 1e9,
            "min_radius_um": float(collapse.min_radius) * 1e6,
            "compression_ratio": float(collapse.compression_ratio),
            "collapse_time_ns": float(collapse.collapse_time) * 1e9,
            "peak_velocity_km_s": peak_velocity_m_s / 1000.0,
            "fusion_probability": None,
            "neutron_yield_estimate": None,
            "energy_density_j_m3": None,
            "conditions_met": False,
            "peak_mach": peak_mach,
            "compressibility_regime": dynamics.get(
                "compressibility_regime", _compressibility_regime(peak_mach)
            ),
        },
        "timeseries": {
            "time_us": time_us,
            "radius_um": radius_um,
            "temperature_k": temperature_k,
            "pressure_bar": pressure_bar,
        },
        "parameters": {
            "initial_radius_um": initial_radius_um,
            "acoustic_pressure_bar": acoustic_pressure_bar,
            "frequency_khz": frequency_khz,
            "ambient_pressure_bar": ambient_pressure_bar,
            "ambient_temperature_k": ambient_temperature_k,
            "fluid_type": fluid_type,
            "gas_type": gas_type,
            "dynamics_mode": dynamics_mode,
        },
        "dynamics": {
            "dynamics_mode_used": dynamics_mode,
            "bounds_solver_used": dynamics_mode,
            "km_auto_selected": False,
            "km_recommended": km_recommended,
            "peak_mach": peak_mach,
            "compressibility_regime": dynamics.get(
                "compressibility_regime", _compressibility_regime(peak_mach)
            ),
            "source": "bubble_lattice_interaction",
            "note": (
                "Opt-in ODE bridge to the shared RP/KM core. "
                "KM is not auto-selected on the Bubble Fusion page (Phase B policy)."
            ),
        },
    }


def simulate_bubble_fusion(
    initial_radius_um: float = 10.0,
    acoustic_pressure_bar: float = 1.2,
    frequency_khz: float = 20.0,
    ambient_pressure_bar: float = 1.0,
    ambient_temperature_k: float = 298.0,
    fluid_type: str = "water",
    gas_type: str = "deuterium",
    gas_fraction: float = 0.8,
    dynamics_mode: str = "legacy",
) -> Dict[str, Any]:
    """
    Convenience function for bubble fusion simulation.

    dynamics_mode:
      - legacy: adiabatic / quasi-static calculator (default, unchanged)
      - rayleigh_plesset / keller_miksis: shared ODE core (opt-in Phase B bridge)
    """
    mode = (dynamics_mode or "legacy").strip().lower()
    if mode in {"rayleigh_plesset", "keller_miksis"}:
        return _simulate_bubble_fusion_ode(
            initial_radius_um=initial_radius_um,
            acoustic_pressure_bar=acoustic_pressure_bar,
            frequency_khz=frequency_khz,
            ambient_pressure_bar=ambient_pressure_bar,
            ambient_temperature_k=ambient_temperature_k,
            fluid_type=fluid_type,
            gas_type=gas_type,
            dynamics_mode=mode,
        )

    # Map string to enum
    fluid_map = {
        "water": FluidType.WATER,
        "d2o": FluidType.DEUTERATED_WATER,
        "heavy_water": FluidType.DEUTERATED_WATER,
        "acetone": FluidType.ACETONE,
        "d_acetone": FluidType.DEUTERATED_ACETONE,
    }
    
    gas_map = {
        "air": GasType.AIR,
        "argon": GasType.ARGON,
        "deuterium": GasType.DEUTERIUM,
        "xenon": GasType.XENON,
    }
    
    fluid = fluid_map.get(fluid_type.lower(), FluidType.WATER)
    gas = gas_map.get(gas_type.lower(), GasType.DEUTERIUM)
    
    params = BubbleSimulationParams(
        initial_radius_um=initial_radius_um,
        acoustic_pressure_bar=acoustic_pressure_bar,
        frequency_khz=frequency_khz,
        ambient_pressure_bar=ambient_pressure_bar,
        ambient_temperature_k=ambient_temperature_k,
        fluid_type=fluid,
        gas_type=gas,
        gas_fraction=gas_fraction
    )
    
    calc = BubbleFusionCalculator()
    result = calc.simulate_collapse(params)
    timeseries = calc.calculate_bubble_dynamics_timeseries(params)
    fluid_props = FLUID_DATA.get(fluid, FLUID_DATA[FluidType.WATER])
    peak_mach = float(result.peak_velocity_m_s) / max(float(fluid_props.sound_speed), 1.0)
    
    return {
        "collapse_results": {
            "max_temperature_k": result.max_temperature_k,
            "max_temperature_ev": result.max_temperature_k * K_BOLTZMANN / EV_TO_J,
            "max_pressure_pa": result.max_pressure_pa,
            "max_pressure_gpa": result.max_pressure_pa / 1e9,
            "min_radius_um": result.min_radius_m * 1e6,
            "compression_ratio": result.compression_ratio,
            "collapse_time_ns": result.collapse_time_s * 1e9,
            "peak_velocity_km_s": result.peak_velocity_m_s / 1000,
            "fusion_probability": result.fusion_probability,
            "neutron_yield_estimate": result.neutron_yield_estimate,
            "energy_density_j_m3": result.energy_density_j_m3,
            "conditions_met": result.conditions_met,
            "peak_mach": peak_mach,
            "compressibility_regime": _compressibility_regime(peak_mach),
        },
        "timeseries": {
            "time_us": timeseries["time_us"].tolist(),
            "radius_um": timeseries["radius_um"].tolist(),
            "temperature_k": timeseries["temperature_k"].tolist(),
            "pressure_bar": timeseries["pressure_bar"].tolist()
        },
        "parameters": {
            "initial_radius_um": initial_radius_um,
            "acoustic_pressure_bar": acoustic_pressure_bar,
            "frequency_khz": frequency_khz,
            "ambient_pressure_bar": ambient_pressure_bar,
            "ambient_temperature_k": ambient_temperature_k,
            "fluid_type": fluid_type,
            "gas_type": gas_type,
            "gas_fraction": gas_fraction,
            "dynamics_mode": "legacy",
        },
        "dynamics": {
            "dynamics_mode_used": "legacy",
            "bounds_solver_used": "legacy_adiabatic",
            "km_auto_selected": False,
            "km_recommended": peak_mach >= 0.3,
            "peak_mach": peak_mach,
            "compressibility_regime": _compressibility_regime(peak_mach),
            "source": "bubble_fusion_adiabatic",
            "note": (
                "Legacy adiabatic / quasi-static calculator. "
                "Pass dynamics_mode=rayleigh_plesset|keller_miksis for the shared ODE core."
            ),
        },
    }


# Export
__all__ = [
    'FluidType',
    'GasType',
    'FluidProperties',
    'GasProperties',
    'BubbleCollapseResult',
    'BubbleSimulationParams',
    'BubbleFusionCalculator',
    'simulate_bubble_fusion',
    'FLUID_DATA',
    'GAS_DATA',
]

