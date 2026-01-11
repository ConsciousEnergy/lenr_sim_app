"""
Integrated Mechanisms Module for LENR_Sim_App

This module provides a high-level integration layer for all physical mechanisms
involved in LENR simulations, ensuring proper coupling between different effects.
It serves as a bridge between individual physics modules and the API layer.
"""

import numpy as np
import scipy.constants as const
from typing import Dict, List, Tuple, Any, Optional, Union
from dataclasses import dataclass, field
import math
import time
import logging
import json

from app.utils.logging import setup_logger
from app.physics.models import (
    FusionReaction, 
    FusionEnhancementFactors, 
    ReactionConditions
)
from app.physics.phonon_modes import (
    LatticeParameters,
    calculate_comprehensive_phonon_enhancement
)
from app.physics.quantum_tunneling import (
    calculate_tunneling_probability,
    calculate_gamow_factor,
    calculate_enhanced_tunneling
)
from app.physics.tunneling_engine import (
    calculate_integrated_tunneling,
    calculate_reaction_rate
)
from app.physics.potential_models import (
    calculate_coulomb_barrier,
    calculate_total_potential,
    calculate_lenr_lattice_potential
)
from app.physics.unified_enhancement import (
    calculate_enhancement,
    get_default_configuration
)

# Set up logger
logger = setup_logger("integrated_mechanisms", "logs/physics.log")

# Physical constants
HBAR = const.hbar  # Reduced Planck constant
KB = const.k  # Boltzmann constant
ELECTRON_MASS = const.m_e  # Electron mass
PROTON_MASS = const.m_p  # Proton mass
NEUTRON_MASS = const.m_n  # Neutron mass
ELECTRON_CHARGE = const.e  # Elementary charge
VACUUM_PERMITTIVITY = const.epsilon_0  # Vacuum permittivity
AMU = const.u  # Atomic mass unit
EV_TO_J = const.e  # Conversion factor from eV to Joules
KEV_TO_J = 1e3 * EV_TO_J  # Conversion from keV to Joules
MEV_TO_J = 1e6 * EV_TO_J  # Conversion from MeV to Joules


@dataclass
class IntegratedSimulationParameters:
    """
    Comprehensive parameters for integrated LENR simulations
    """
    # Reaction parameters
    reaction_name: str = "d-d"  # Reaction name
    projectile_z: int = 1  # Atomic number of projectile
    projectile_a: int = 2  # Mass number of projectile
    target_z: int = 1  # Atomic number of target
    target_a: int = 2  # Mass number of target
    
    # Environment parameters
    temperature: float = 300.0  # Temperature in Kelvin
    pressure: float = 1e5  # Pressure in Pa
    electric_field: float = 0.0  # Applied electric field in V/m
    magnetic_field: float = 0.0  # Applied magnetic field in T
    
    # Lattice parameters
    lattice_type: str = "fcc"  # Lattice type
    lattice_constant: float = 3.89e-10  # Lattice constant in m
    debye_temperature: float = 275.0  # Debye temperature in K
    loading_ratio: float = 0.9  # H/Pd or similar
    loading_element: str = "D"  # Element loaded (H, D, T)
    
    # Enhancement configuration
    mechanisms: List[str] = field(default_factory=lambda: [
        "electron_screening",
        "coherent_tunneling",
        "rydberg_matter",
        "interface_field",
        "phonon_assisted"
    ])
    
    # Energy parameters
    energy_range_ev: Tuple[float, float] = (0.01, 1000.0)  # Energy range in eV
    energy_points: int = 20  # Number of energy points
    
    # Computational parameters
    convergence_threshold: float = 1e-6  # Convergence threshold
    max_iterations: int = 100  # Maximum iterations
    
    def create_lattice_parameters(self) -> LatticeParameters:
        """Create LatticeParameters object from this configuration"""
        return LatticeParameters(
            lattice_type=self.lattice_type,
            lattice_constant=self.lattice_constant,
            debye_temperature=self.debye_temperature,
            temperature=self.temperature,
            has_loading=True if self.loading_ratio > 0 else False,
            loading_element=self.loading_element,
            loading_ratio=self.loading_ratio,
            loading_sites="octahedral"  # Default
        )
    
    def create_enhancement_config(self) -> Dict[str, Dict[str, Any]]:
        """Create unified enhancement configuration dictionary"""
        # Start with default configuration
        config = get_default_configuration()
        
        # Update with parameters from this configuration
        config["electron_screening"]["temperature"] = self.temperature
        config["electron_screening"]["atomic_number_1"] = self.projectile_z
        config["electron_screening"]["atomic_number_2"] = self.target_z
        
        config["coherent_tunneling"]["temperature"] = self.temperature
        config["coherent_tunneling"]["atoms_per_cluster"] = int(100 * self.loading_ratio)
        
        config["rydberg_matter"]["temperature"] = self.temperature
        config["rydberg_matter"]["loading_ratio"] = self.loading_ratio
        
        config["interface_field"]["field_strength"] = max(1e7, self.electric_field)
        config["interface_field"]["atomic_number_1"] = self.projectile_z
        config["interface_field"]["atomic_number_2"] = self.target_z
        
        return config


def simulate_reaction_at_energy(
    params: IntegratedSimulationParameters,
    energy_kev: float
) -> Dict[str, Any]:
    """
    Simulate a fusion reaction at a specific energy with integration
    of all physical mechanisms.
    
    Args:
        params: Simulation parameters
        energy_kev: Collision energy in keV
        
    Returns:
        Dictionary with simulation results
    """
    # Start timing
    start_time = time.time()
    
    # Create lattice parameters
    lattice_params = params.create_lattice_parameters()
    
    # Create enhancement configuration
    enhancement_config = params.create_enhancement_config()
    
    # Step 1: Calculate potentials
    potential_result = calculate_total_potential(
        z1=params.projectile_z,
        z2=params.target_z,
        a1=params.projectile_a,
        a2=params.target_a,
        distance=params.lattice_constant * 0.3,  # Approximate distance in lattice
        include_nuclear=True,
        include_screening=True
    )
    
    # Step 2: Calculate LENR-specific lattice potential
    lenr_potential = calculate_lenr_lattice_potential(
        distance=params.lattice_constant * 0.3,
        z1=params.projectile_z,
        z2=params.target_z,
        screening_length=5e-11,  # Approximate
        binding_energy=2.0,  # Approximate for metal-hydrogen binding
        equilibrium_distance=params.lattice_constant * 0.25
    )
    
    # Step 3: Calculate unified enhancements
    unified_enhancement = calculate_enhancement(
        config=enhancement_config,
        mechanisms=params.mechanisms
    )
    
    # Create enhancement factors object
    enhancement_factors = FusionEnhancementFactors(
        electron_screening=unified_enhancement["individual_factors"].get("electron_screening", 1.0),
        coherent_tunneling=unified_enhancement["individual_factors"].get("coherent_tunneling", 1.0),
        rydberg_matter=unified_enhancement["individual_factors"].get("rydberg_matter", 1.0),
        interface_field=unified_enhancement["individual_factors"].get("interface_field", 1.0)
    )
    
    # Ensure total is calculated
    enhancement_factors.calculate_total()
    
    # Step 4: Calculate phonon enhancements
    barrier_height_ev = potential_result["total_potential_ev"]
    barrier_width = params.lattice_constant * 0.3  # Approximate
    
    # Only calculate phonon enhancement if requested
    phonon_enhancement = None
    if "phonon_assisted" in params.mechanisms:
        phonon_enhancement = calculate_comprehensive_phonon_enhancement(
            params=lattice_params,
            barrier_height_ev=barrier_height_ev,
            incident_energy_ev=energy_kev * 1e3,  # Convert to eV
            barrier_width=barrier_width,
            correlation_sites=int(100 * params.loading_ratio),
            correlation_length_m=params.lattice_constant * 3.0,  # Approximate
            particle_mass=params.projectile_a * AMU  # Approximate
        )
    
    # Step 5: Calculate integrated tunneling
    tunneling_result = calculate_integrated_tunneling(
        z1=params.projectile_z,
        z2=params.target_z,
        a1=params.projectile_a,
        a2=params.target_a,
        energy_kev=energy_kev,
        temperature=params.temperature,
        barrier_width=barrier_width,
        lattice_params=lattice_params,
        enhancement_factors=enhancement_factors,
        include_phonons="phonon_assisted" in params.mechanisms,
        include_coherent="coherent_tunneling" in params.mechanisms,
        include_electron_screening="electron_screening" in params.mechanisms,
        correlation_sites=int(100 * params.loading_ratio),
        correlation_length_m=params.lattice_constant * 3.0  # Approximate
    )
    
    # Step 6: Calculate reaction rate
    # Approximate number densities
    target_density = 1e29  # Typical metal atom density
    projectile_density = target_density * params.loading_ratio
    
    # Approximate cross section (nuclear part) for common reactions
    nuclear_cross_section = 0.1  # barns, typical low-energy value
    
    if params.reaction_name == "d-d":
        nuclear_cross_section = 0.01  # barns
    elif params.reaction_name == "d-t":
        nuclear_cross_section = 5.0  # barns
    elif params.reaction_name == "p-7Li":
        nuclear_cross_section = 0.1  # barns
    
    rate_result = calculate_reaction_rate(
        integrated_tunneling=tunneling_result,
        z1=params.projectile_z,
        z2=params.target_z,
        a1=params.projectile_a,
        a2=params.target_a,
        number_density1=projectile_density,
        number_density2=target_density,
        nuclear_cross_section=nuclear_cross_section,
        temperature=params.temperature
    )
    
    # Compile integrated result
    result = {
        "reaction": {
            "name": params.reaction_name,
            "projectile": {"z": params.projectile_z, "a": params.projectile_a},
            "target": {"z": params.target_z, "a": params.target_a},
            "energy_kev": float(energy_kev)
        },
        "environment": {
            "temperature_k": params.temperature,
            "pressure_pa": params.pressure,
            "electric_field_v_m": params.electric_field,
            "magnetic_field_t": params.magnetic_field
        },
        "lattice": {
            "type": params.lattice_type,
            "constant_m": params.lattice_constant,
            "debye_temperature_k": params.debye_temperature,
            "loading_ratio": params.loading_ratio,
            "loading_element": params.loading_element
        },
        "potential": {
            "barrier_height_ev": float(barrier_height_ev),
            "barrier_width_m": float(barrier_width),
            "coulomb_potential_ev": float(potential_result["coulomb_potential_ev"]),
            "nuclear_potential_ev": float(potential_result["nuclear_potential_ev"]),
            "total_potential_ev": float(potential_result["total_potential_ev"]),
            "lenr_lattice_potential": {
                "total_ev": float(lenr_potential["total_eV"]),
                "reduction_factor": float(lenr_potential["reduction_factor"])
            }
        },
        "enhancement": {
            "unified_total": float(unified_enhancement["combined_enhancement_factor"]),
            "log_unified_total": float(unified_enhancement["log_combined_enhancement"]),
            "mechanisms_used": unified_enhancement["mechanisms_used"],
            "individual_factors": {k: float(v) for k, v in unified_enhancement["individual_factors"].items()}
        },
        "tunneling": {
            "base_probability": float(tunneling_result["base_probability"]),
            "enhanced_probability": float(tunneling_result["enhanced_probability"]),
            "total_enhancement_factor": float(tunneling_result["total_enhancement_factor"]),
            "mechanism_factors": tunneling_result["mechanism_factors"]
        },
        "reaction_rate": {
            "rate_coefficient_m3_s": float(rate_result["rate_coefficient_m3_s"]),
            "reaction_rate_density_m3_s": float(rate_result["reaction_rate_density_m3_s"]),
            "power_density_w_m3": float(rate_result["power_density_w_m3"]),
            "q_value_mev": float(rate_result["q_value_mev"])
        },
        "metadata": {
            "processing_time_ms": (time.time() - start_time) * 1000
        }
    }
    
    # Add phonon enhancement results if calculated
    if phonon_enhancement is not None:
        result["phonon_enhancement"] = {
            "total_factor": float(phonon_enhancement["total_enhancement_factor"]),
            "component_factors": {k: float(v) for k, v in phonon_enhancement["component_factors"].items()},
            "enhanced_tunneling_probability": float(phonon_enhancement["enhanced_tunneling_probability"])
        }
    
    logger.info(f"Integrated reaction simulation completed for {params.reaction_name} at {energy_kev} keV: " +
               f"power density = {rate_result['power_density_w_m3']:.2e} W/m³")
    
    return result


def simulate_reaction_energy_scan(
    params: IntegratedSimulationParameters
) -> Dict[str, Any]:
    """
    Simulate a fusion reaction across an energy range with integration
    of all physical mechanisms.
    
    Args:
        params: Simulation parameters
        
    Returns:
        Dictionary with scan results
    """
    # Start timing
    start_time = time.time()
    
    # Create energy array
    min_ev, max_ev = params.energy_range_ev
    # Use logarithmic spacing for wide energy ranges
    if max_ev / min_ev > 10:
        energy_ev_array = np.logspace(np.log10(min_ev), np.log10(max_ev), params.energy_points)
    else:
        energy_ev_array = np.linspace(min_ev, max_ev, params.energy_points)
    
    energy_kev_array = energy_ev_array / 1000.0  # Convert to keV
    
    # Initialize arrays for results
    base_probability_array = np.zeros_like(energy_kev_array)
    enhanced_probability_array = np.zeros_like(energy_kev_array)
    enhancement_factor_array = np.zeros_like(energy_kev_array)
    reaction_rate_array = np.zeros_like(energy_kev_array)
    power_density_array = np.zeros_like(energy_kev_array)
    
    # Detailed results for each energy
    detailed_results = []
    
    # Calculate for each energy
    for i, energy_kev in enumerate(energy_kev_array):
        result = simulate_reaction_at_energy(params, energy_kev)
        
        # Extract key values
        base_probability_array[i] = result["tunneling"]["base_probability"]
        enhanced_probability_array[i] = result["tunneling"]["enhanced_probability"]
        enhancement_factor_array[i] = result["tunneling"]["total_enhancement_factor"]
        reaction_rate_array[i] = result["reaction_rate"]["reaction_rate_density_m3_s"]
        power_density_array[i] = result["reaction_rate"]["power_density_w_m3"]
        
        # Append detailed result
        detailed_results.append(result)
    
    # Find peak of reaction rate and power density
    peak_rate_index = np.argmax(reaction_rate_array)
    peak_power_index = np.argmax(power_density_array)
    
    # Compile scan result
    result = {
        "energy_scan": {
            "energy_ev": energy_ev_array.tolist(),
            "energy_kev": energy_kev_array.tolist(),
            "base_probability": base_probability_array.tolist(),
            "enhanced_probability": enhanced_probability_array.tolist(),
            "enhancement_factor": enhancement_factor_array.tolist(),
            "reaction_rate_m3_s": reaction_rate_array.tolist(),
            "power_density_w_m3": power_density_array.tolist()
        },
        "peak_values": {
            "peak_rate_energy_kev": float(energy_kev_array[peak_rate_index]),
            "peak_rate_m3_s": float(reaction_rate_array[peak_rate_index]),
            "peak_power_energy_kev": float(energy_kev_array[peak_power_index]),
            "peak_power_density_w_m3": float(power_density_array[peak_power_index])
        },
        "reaction_info": {
            "name": params.reaction_name,
            "projectile": {"z": params.projectile_z, "a": params.projectile_a},
            "target": {"z": params.target_z, "a": params.target_a}
        },
        "environment": {
            "temperature_k": params.temperature,
            "pressure_pa": params.pressure,
            "electric_field_v_m": params.electric_field,
            "magnetic_field_t": params.magnetic_field
        },
        "lattice": {
            "type": params.lattice_type,
            "constant_m": params.lattice_constant,
            "debye_temperature_k": params.debye_temperature,
            "loading_ratio": params.loading_ratio,
            "loading_element": params.loading_element
        },
        "mechanisms": params.mechanisms,
        "metadata": {
            "num_points": params.energy_points,
            "min_energy_ev": float(min_ev),
            "max_energy_ev": float(max_ev),
            "processing_time_ms": (time.time() - start_time) * 1000
        }
    }
    
    # Add an option to include detailed results
    # (can be large for many energy points)
    result["detailed_results"] = detailed_results
    
    logger.info(f"Energy scan completed for {params.reaction_name}: " +
               f"peak power density = {result['peak_values']['peak_power_density_w_m3']:.2e} W/m³")
    
    return result


def analyze_parameter_sensitivity(
    base_params: IntegratedSimulationParameters,
    parameter_name: str,
    values: List[float],
    energy_kev: float = 1.0
) -> Dict[str, Any]:
    """
    Analyze the sensitivity of reaction outcomes to a specific parameter
    
    Args:
        base_params: Base simulation parameters
        parameter_name: Name of parameter to vary
        values: List of parameter values to test
        energy_kev: Energy for each simulation in keV
        
    Returns:
        Dictionary with sensitivity analysis results
    """
    # Start timing
    start_time = time.time()
    
    # Initialize result arrays
    probabilities = []
    enhancements = []
    reaction_rates = []
    power_densities = []
    processing_times = []
    
    # Valid parameters for sensitivity analysis
    valid_parameters = [
        "temperature", "pressure", "electric_field", "magnetic_field",
        "lattice_constant", "debye_temperature", "loading_ratio"
    ]
    
    if parameter_name not in valid_parameters:
        logger.warning(f"Invalid parameter for sensitivity analysis: {parameter_name}")
        return {"error": f"Invalid parameter: {parameter_name}. Valid options are: {valid_parameters}"}
    
    # Run simulation for each parameter value
    for value in values:
        # Create copy of parameters
        import copy
        params = copy.deepcopy(base_params)
        
        # Set parameter value
        setattr(params, parameter_name, value)
        
        # Run simulation
        result = simulate_reaction_at_energy(params, energy_kev)
        
        # Extract key values
        probabilities.append(result["tunneling"]["enhanced_probability"])
        enhancements.append(result["tunneling"]["total_enhancement_factor"])
        reaction_rates.append(result["reaction_rate"]["reaction_rate_density_m3_s"])
        power_densities.append(result["reaction_rate"]["power_density_w_m3"])
        processing_times.append(result["metadata"]["processing_time_ms"])
    
    # Compile sensitivity result
    result = {
        "parameter": parameter_name,
        "values": values,
        "energy_kev": energy_kev,
        "results": {
            "enhanced_probability": probabilities,
            "enhancement_factor": enhancements,
            "reaction_rate_m3_s": reaction_rates,
            "power_density_w_m3": power_densities
        },
        "reaction_info": {
            "name": base_params.reaction_name,
            "projectile": {"z": base_params.projectile_z, "a": base_params.projectile_a},
            "target": {"z": base_params.target_z, "a": base_params.target_a}
        },
        "base_parameters": {
            "temperature_k": base_params.temperature,
            "pressure_pa": base_params.pressure,
            "electric_field_v_m": base_params.electric_field,
            "magnetic_field_t": base_params.magnetic_field,
            "lattice_type": base_params.lattice_type,
            "lattice_constant_m": base_params.lattice_constant,
            "debye_temperature_k": base_params.debye_temperature,
            "loading_ratio": base_params.loading_ratio,
            "loading_element": base_params.loading_element
        },
        "metadata": {
            "num_points": len(values),
            "mechanisms": base_params.mechanisms,
            "simulation_times_ms": processing_times,
            "total_processing_time_ms": (time.time() - start_time) * 1000
        }
    }
    
    logger.info(f"Parameter sensitivity analysis completed for {parameter_name}: " +
               f"values range = [{min(values)}, {max(values)}]")
    
    return result


def get_default_parameters(reaction_name: str = "d-d") -> IntegratedSimulationParameters:
    """
    Get default simulation parameters for a specific reaction
    
    Args:
        reaction_name: Name of reaction to get parameters for
        
    Returns:
        IntegratedSimulationParameters with default values
    """
    params = IntegratedSimulationParameters()
    
    # Set reaction-specific parameters
    if reaction_name == "d-d":
        params.reaction_name = "d-d"
        params.projectile_z = 1
        params.projectile_a = 2
        params.target_z = 1
        params.target_a = 2
        params.loading_element = "D"
    elif reaction_name == "d-t":
        params.reaction_name = "d-t"
        params.projectile_z = 1
        params.projectile_a = 2
        params.target_z = 1
        params.target_a = 3
        params.loading_element = "T"
    elif reaction_name == "p-d":
        params.reaction_name = "p-d"
        params.projectile_z = 1
        params.projectile_a = 1
        params.target_z = 1
        params.target_a = 2
        params.loading_element = "D"
    elif reaction_name == "p-7Li":
        params.reaction_name = "p-7Li"
        params.projectile_z = 1
        params.projectile_a = 1
        params.target_z = 3
        params.target_a = 7
        params.loading_element = "H"
    elif reaction_name == "d-Pd":
        params.reaction_name = "d-Pd"
        params.projectile_z = 1
        params.projectile_a = 2
        params.target_z = 46
        params.target_a = 106
        params.loading_element = "D"
    elif reaction_name == "d-Ni":
        params.reaction_name = "d-Ni"
        params.projectile_z = 1
        params.projectile_a = 2
        params.target_z = 28
        params.target_a = 58
        params.loading_element = "D"
    else:
        logger.warning(f"Unknown reaction: {reaction_name}. Using d-d as default.")
    
    return params 