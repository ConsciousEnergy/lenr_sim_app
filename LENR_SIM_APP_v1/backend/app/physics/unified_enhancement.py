"""
Unified Enhancement Factor Integration Module for LENR_Sim_App

This module integrates the various enhancement mechanisms described in the
Unified LENR Theory paper to provide a comprehensive model for LENR processes.

It combines contributions from:
- Rydberg matter effects
- Electron screening effects
- Double-layer QED effects
- Casimir forces
- Quantum coherence
- Oppenheimer-Phillips process
- Bubble collapse and shock effects

The module provides functions to calculate the total enhancement factor
for various experimental configurations and conditions.
"""

import math
import logging
import numpy as np
from typing import Dict, List, Any, Optional, Union, Tuple
from datetime import datetime
import importlib
from functools import lru_cache
import scipy.constants as const

from app.utils.logging import setup_logger

# Set up logger
logger = logging.getLogger("unified_enhancement")
logger = setup_logger("unified_enhancement", "logs/physics.log")

# Import the mechanism modules
# Using dynamic imports to handle potential circular dependencies
def get_module(name):
    """Dynamically import a module"""
    try:
        return importlib.import_module(f"app.physics.{name}")
    except ImportError as e:
        logger.error(f"Could not import module {name}: {e}")
        return None

# Physical constants
HBAR = const.hbar  # Reduced Planck constant in J·s
KB = const.k  # Boltzmann constant in J/K
ELECTRON_MASS = const.m_e  # Electron mass in kg
ELECTRON_CHARGE = const.e  # Elementary charge in C
AMU = const.u  # Atomic mass unit in kg
EV_TO_J = const.e  # Conversion from eV to Joules
MEV_TO_J = 1e6 * EV_TO_J  # Conversion from MeV to Joules


class UnifiedEnhancementCalculator:
    """
    Class to calculate the combined enhancement factor from multiple mechanisms.
    """
    
    def __init__(self):
        """Initialize the calculator with default configuration."""
        # Load the physics modules
        self.rydberg_matter = get_module("rydberg_matter")
        self.electron_screening = get_module("electron_screening")
        self.qed_effects = get_module("qed_effects")
        self.casimir_forces = get_module("casimir_forces")
        self.quantum_coherence = get_module("quantum_coherence")
        self.oppenheimer_phillips = get_module("oppenheimer_phillips")
        self.bubble_collapse = get_module("bubble_collapse")
        
        # Store available mechanisms
        self.available_mechanisms = {}
        if self.rydberg_matter:
            self.available_mechanisms["rydberg_matter"] = True
        if self.electron_screening:
            self.available_mechanisms["electron_screening"] = True
        if self.qed_effects:
            self.available_mechanisms["qed_effects"] = True
        if self.casimir_forces:
            self.available_mechanisms["casimir_forces"] = True
        if self.quantum_coherence:
            self.available_mechanisms["quantum_coherence"] = True
        if self.oppenheimer_phillips:
            self.available_mechanisms["oppenheimer_phillips"] = True
        if self.bubble_collapse:
            self.available_mechanisms["bubble_collapse"] = True
        
        logger.info(f"Initialized UnifiedEnhancementCalculator with {len(self.available_mechanisms)} available mechanisms")
    
    def calculate_rydberg_enhancement(
        self,
        principal_quantum_number: int,
        temperature: float,
        electric_field: float,
        density: float
    ) -> Dict[str, Any]:
        """
        Calculate enhancement from Rydberg matter effects.
        
        Args:
            principal_quantum_number: Principal quantum number (n)
            temperature: Temperature in Kelvin
            electric_field: Electric field strength in V/m
            density: Electron density in m^-3
            
        Returns:
            Dictionary with enhancement results
        """
        if not self.rydberg_matter:
            logger.warning("Rydberg matter module not available")
            return {"enhancement_factor": 1.0, "log_enhancement": 0.0, "error": "Module not available"}
        
        try:
            # Calculate Rydberg enhancement
            rydberg_state = self.rydberg_matter.calculate_rydberg_state(
                principal_quantum_number, temperature, electric_field
            )
            
            enhancement = self.rydberg_matter.calculate_tunneling_enhancement(
                rydberg_state, density
            )
            
            return enhancement
        
        except Exception as e:
            logger.error(f"Error calculating Rydberg enhancement: {e}")
            return {"enhancement_factor": 1.0, "log_enhancement": 0.0, "error": str(e)}
    
    def calculate_electron_screening_enhancement(
        self,
        atomic_number_1: int,
        atomic_number_2: int,
        electron_density: float,
        temperature: float
    ) -> Dict[str, Any]:
        """
        Calculate enhancement from electron screening effects.
        
        Args:
            atomic_number_1: Atomic number of first nucleus
            atomic_number_2: Atomic number of second nucleus
            electron_density: Electron density in m^-3
            temperature: Temperature in Kelvin
            
        Returns:
            Dictionary with enhancement results
        """
        if not self.electron_screening:
            logger.warning("Electron screening module not available")
            return {"enhancement_factor": 1.0, "log_enhancement": 0.0, "error": "Module not available"}
        
        try:
            # Calculate electron screening enhancement
            screening_potential = self.electron_screening.calculate_screening_potential(
                atomic_number_1, atomic_number_2, electron_density, temperature
            )
            
            enhancement = self.electron_screening.calculate_tunneling_reduction(
                screening_potential, temperature, atomic_number_1, atomic_number_2
            )
            
            return enhancement
        
        except Exception as e:
            logger.error(f"Error calculating electron screening enhancement: {e}")
            return {"enhancement_factor": 1.0, "log_enhancement": 0.0, "error": str(e)}
    
    def calculate_qed_enhancement(
        self,
        electric_field: float,
        frequency: float,
        temperature: float
    ) -> Dict[str, Any]:
        """
        Calculate enhancement from QED effects.
        
        Args:
            electric_field: Electric field strength in V/m
            frequency: Frequency of the electric field oscillation in Hz
            temperature: Temperature in Kelvin
            
        Returns:
            Dictionary with enhancement results
        """
        if not self.qed_effects:
            logger.warning("QED effects module not available")
            return {"enhancement_factor": 1.0, "log_enhancement": 0.0, "error": "Module not available"}
        
        try:
            # Calculate QED enhancement
            enhancement = self.qed_effects.calculate_qed_enhancement(
                electric_field, frequency, temperature
            )
            
            return enhancement
        
        except Exception as e:
            logger.error(f"Error calculating QED enhancement: {e}")
            return {"enhancement_factor": 1.0, "log_enhancement": 0.0, "error": str(e)}
    
    def calculate_casimir_enhancement(
        self,
        separation: float,
        area: float,
        temperature: float
    ) -> Dict[str, Any]:
        """
        Calculate enhancement from Casimir forces.
        
        Args:
            separation: Separation distance in meters
            area: Area of the surfaces in m^2
            temperature: Temperature in Kelvin
            
        Returns:
            Dictionary with enhancement results
        """
        if not self.casimir_forces:
            logger.warning("Casimir forces module not available")
            return {"enhancement_factor": 1.0, "log_enhancement": 0.0, "error": "Module not available"}
        
        try:
            # Calculate Casimir enhancement
            casimir_force = self.casimir_forces.calculate_casimir_force(
                separation, area, temperature
            )
            
            enhancement = self.casimir_forces.calculate_barrier_reduction(
                separation, casimir_force
            )
            
            return enhancement
        
        except Exception as e:
            logger.error(f"Error calculating Casimir enhancement: {e}")
            return {"enhancement_factor": 1.0, "log_enhancement": 0.0, "error": str(e)}
    
    def calculate_coherence_enhancement(
        self,
        temperature: float,
        lattice_constant: float,
        electric_field: float
    ) -> Dict[str, Any]:
        """
        Calculate enhancement from quantum coherence effects.
        
        Args:
            temperature: Temperature in Kelvin
            lattice_constant: Lattice constant in meters
            electric_field: Electric field in V/m
            
        Returns:
            Dictionary with enhancement results
        """
        if not self.quantum_coherence:
            logger.warning("Quantum coherence module not available")
            return {"enhancement_factor": 1.0, "log_enhancement": 0.0, "error": "Module not available"}
        
        try:
            # Calculate coherence enhancement
            enhancement = self.quantum_coherence.calculate_coherence_enhancement(
                temperature, lattice_constant, electric_field
            )
            
            return enhancement
        
        except Exception as e:
            logger.error(f"Error calculating coherence enhancement: {e}")
            return {"enhancement_factor": 1.0, "log_enhancement": 0.0, "error": str(e)}
    
    def calculate_oppenheimer_phillips_enhancement(
        self,
        projectile_z: int,
        target_z: int,
        projectile_a: int,
        target_a: int,
        energy_kev: float
    ) -> Dict[str, Any]:
        """
        Calculate enhancement from the Oppenheimer-Phillips process.
        
        Args:
            projectile_z: Atomic number of projectile
            target_z: Atomic number of target
            projectile_a: Mass number of projectile
            target_a: Mass number of target
            energy_kev: Collision energy in keV
            
        Returns:
            Dictionary with enhancement results
        """
        if not self.oppenheimer_phillips:
            logger.warning("Oppenheimer-Phillips module not available")
            return {"enhancement_factor": 1.0, "log_enhancement": 0.0, "error": "Module not available"}
        
        try:
            # Calculate OP enhancement
            enhancement = self.oppenheimer_phillips.calculate_op_probability(
                projectile_z, target_z, projectile_a, target_a, energy_kev
            )
            
            return enhancement
        
        except Exception as e:
            logger.error(f"Error calculating Oppenheimer-Phillips enhancement: {e}")
            return {"enhancement_factor": 1.0, "log_enhancement": 0.0, "error": str(e)}
    
    def calculate_bubble_collapse_enhancement(
        self,
        initial_radius: float,
        driving_pressure: float,
        frequency: float
    ) -> Dict[str, Any]:
        """
        Calculate enhancement from bubble collapse effects.
        
        Args:
            initial_radius: Initial bubble radius in meters
            driving_pressure: Acoustic driving pressure amplitude in Pa
            frequency: Acoustic driving frequency in Hz
            
        Returns:
            Dictionary with enhancement results
        """
        if not self.bubble_collapse:
            logger.warning("Bubble collapse module not available")
            return {"enhancement_factor": 1.0, "log_enhancement": 0.0, "error": "Module not available"}
        
        try:
            # Calculate bubble collapse enhancement
            enhancement = self.bubble_collapse.calculate_compression_enhancement(
                initial_radius, driving_pressure, frequency
            )
            
            return enhancement
        
        except Exception as e:
            logger.error(f"Error calculating bubble collapse enhancement: {e}")
            return {"enhancement_factor": 1.0, "log_enhancement": 0.0, "error": str(e)}
    
    def calculate_combined_enhancement(
        self,
        config: Dict[str, Any],
        mechanisms: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Calculate the combined enhancement from multiple mechanisms.
        
        Args:
            config: Dictionary with configuration parameters for all mechanisms
            mechanisms: List of mechanisms to include (if None, use all available)
            
        Returns:
            Dictionary with combined enhancement results
        """
        # Determine which mechanisms to use
        if mechanisms is None:
            mechanisms = list(self.available_mechanisms.keys())
        else:
            # Filter only available mechanisms
            mechanisms = [m for m in mechanisms if m in self.available_mechanisms]
        
        logger.info(f"Calculating combined enhancement using {len(mechanisms)} mechanisms: {mechanisms}")
        
        # Initialize results
        enhancements = {}
        combined_enhancement = 1.0
        log_enhancements = []
        
        # Calculate enhancement for each mechanism
        if "rydberg_matter" in mechanisms and "rydberg_matter" in config:
            rm_config = config["rydberg_matter"]
            rm_result = self.calculate_rydberg_enhancement(
                rm_config.get("principal_quantum_number", 20),
                rm_config.get("temperature", 300.0),
                rm_config.get("electric_field", 1e5),
                rm_config.get("density", 1e28)
            )
            enhancements["rydberg_matter"] = rm_result
            if "enhancement_factor" in rm_result:
                combined_enhancement *= rm_result["enhancement_factor"]
                log_enhancements.append(rm_result.get("log_enhancement", 0.0))
        
        if "electron_screening" in mechanisms and "electron_screening" in config:
            es_config = config["electron_screening"]
            es_result = self.calculate_electron_screening_enhancement(
                es_config.get("atomic_number_1", 1),
                es_config.get("atomic_number_2", 1),
                es_config.get("electron_density", 1e28),
                es_config.get("temperature", 300.0)
            )
            enhancements["electron_screening"] = es_result
            if "enhancement_factor" in es_result:
                combined_enhancement *= es_result["enhancement_factor"]
                log_enhancements.append(es_result.get("log_enhancement", 0.0))
        
        if "qed_effects" in mechanisms and "qed_effects" in config:
            qed_config = config["qed_effects"]
            qed_result = self.calculate_qed_enhancement(
                qed_config.get("electric_field", 1e7),
                qed_config.get("frequency", 1e12),
                qed_config.get("temperature", 300.0)
            )
            enhancements["qed_effects"] = qed_result
            if "enhancement_factor" in qed_result:
                combined_enhancement *= qed_result["enhancement_factor"]
                log_enhancements.append(qed_result.get("log_enhancement", 0.0))
        
        if "casimir_forces" in mechanisms and "casimir_forces" in config:
            cf_config = config["casimir_forces"]
            cf_result = self.calculate_casimir_enhancement(
                cf_config.get("separation", 1e-10),
                cf_config.get("area", 1e-18),
                cf_config.get("temperature", 300.0)
            )
            enhancements["casimir_forces"] = cf_result
            if "enhancement_factor" in cf_result:
                combined_enhancement *= cf_result["enhancement_factor"]
                log_enhancements.append(cf_result.get("log_enhancement", 0.0))
        
        if "quantum_coherence" in mechanisms and "quantum_coherence" in config:
            qc_config = config["quantum_coherence"]
            qc_result = self.calculate_coherence_enhancement(
                qc_config.get("temperature", 300.0),
                qc_config.get("lattice_constant", 4e-10),
                qc_config.get("electric_field", 1e5)
            )
            enhancements["quantum_coherence"] = qc_result
            if "enhancement_factor" in qc_result:
                combined_enhancement *= qc_result["enhancement_factor"]
                log_enhancements.append(qc_result.get("log_enhancement", 0.0))
        
        if "oppenheimer_phillips" in mechanisms and "oppenheimer_phillips" in config:
            op_config = config["oppenheimer_phillips"]
            op_result = self.calculate_oppenheimer_phillips_enhancement(
                op_config.get("projectile_z", 1),
                op_config.get("target_z", 3),
                op_config.get("projectile_a", 2),
                op_config.get("target_a", 7),
                op_config.get("energy_kev", 1.0)
            )
            enhancements["oppenheimer_phillips"] = op_result
            if "enhancement_factor" in op_result:
                combined_enhancement *= op_result["enhancement_factor"]
                log_enhancements.append(op_result.get("log_enhancement", 0.0))
        
        if "bubble_collapse" in mechanisms and "bubble_collapse" in config:
            bc_config = config["bubble_collapse"]
            bc_result = self.calculate_bubble_collapse_enhancement(
                bc_config.get("initial_radius", 1e-5),
                bc_config.get("driving_pressure", 1e5),
                bc_config.get("frequency", 20000.0)
            )
            enhancements["bubble_collapse"] = bc_result
            if "enhancement_factor" in bc_result:
                combined_enhancement *= bc_result["enhancement_factor"]
                log_enhancements.append(bc_result.get("log_enhancement", 0.0))
        
        # Cap the enhancement to a reasonable value (based on paper)
        max_log_enhancement = 80.0  # Limit based on theoretical considerations in the paper
        log_combined = min(max_log_enhancement, np.log10(combined_enhancement) if combined_enhancement > 0 else 0)
        
        # Prepare final results
        results = {
            "individual_enhancements": enhancements,
            "combined_enhancement_factor": 10**log_combined,
            "log_combined_enhancement": log_combined,
            "mechanism_contribution": {
                mech: enhancements[mech].get("log_enhancement", 0.0) / max(1.0, sum(log_enhancements))
                for mech in enhancements if "log_enhancement" in enhancements[mech]
            },
            "mechanisms_used": mechanisms,
            "dominant_mechanism": max(
                [mech for mech in enhancements if "log_enhancement" in enhancements[mech]],
                key=lambda x: enhancements[x].get("log_enhancement", 0.0)
            ) if enhancements else None
        }
        
        return results


def get_mechanism_requirements() -> Dict[str, List[str]]:
    """
    Get the required parameters for each enhancement mechanism.
    
    Returns:
        Dictionary mapping mechanism names to lists of required parameters
    """
    requirements = {
        "rydberg_matter": [
            "principal_quantum_number",
            "temperature",
            "electric_field",
            "density"
        ],
        "electron_screening": [
            "atomic_number_1",
            "atomic_number_2",
            "electron_density",
            "temperature"
        ],
        "qed_effects": [
            "electric_field",
            "frequency",
            "temperature"
        ],
        "casimir_forces": [
            "separation",
            "area",
            "temperature"
        ],
        "quantum_coherence": [
            "temperature",
            "lattice_constant",
            "electric_field"
        ],
        "oppenheimer_phillips": [
            "projectile_z",
            "target_z",
            "projectile_a",
            "target_a",
            "energy_kev"
        ],
        "bubble_collapse": [
            "initial_radius",
            "driving_pressure",
            "frequency"
        ]
    }
    
    return requirements


def get_default_configuration() -> Dict[str, Dict[str, Any]]:
    """
    Get default configuration parameters for all mechanisms.
    
    Returns:
        Nested dictionary with default configurations
    """
    defaults = {
        "rydberg_matter": {
            "principal_quantum_number": 20,
            "temperature": 300.0,
            "electric_field": 1e5,
            "density": 1e28
        },
        "electron_screening": {
            "atomic_number_1": 1,
            "atomic_number_2": 1,
            "electron_density": 1e28,
            "temperature": 300.0
        },
        "qed_effects": {
            "electric_field": 1e7,
            "frequency": 1e12,
            "temperature": 300.0
        },
        "casimir_forces": {
            "separation": 1e-10,
            "area": 1e-18,
            "temperature": 300.0
        },
        "quantum_coherence": {
            "temperature": 300.0,
            "lattice_constant": 4e-10,
            "electric_field": 1e5
        },
        "oppenheimer_phillips": {
            "projectile_z": 1,
            "target_z": 3,
            "projectile_a": 2,
            "target_a": 7,
            "energy_kev": 1.0
        },
        "bubble_collapse": {
            "initial_radius": 1e-5,
            "driving_pressure": 1e5,
            "frequency": 20000.0
        }
    }
    
    return defaults


# Create a singleton instance
calculator = UnifiedEnhancementCalculator()


def calculate_enhancement(
    config: Dict[str, Dict[str, Any]], 
    mechanisms: Optional[List[str]] = None
) -> Dict[str, Any]:
    """
    Calculate the combined enhancement factor for LENR reactions based on 
    multiple enhancement mechanisms from the Unified LENR Theory.
    
    Args:
        config: Dictionary with parameters for each mechanism
        mechanisms: List of mechanisms to include (defaults to all in config)
        
    Returns:
        Dictionary with detailed enhancement results
    """
    try:
        logger.info(f"Calculating enhancement with {len(config)} mechanism configurations")
        
        # Use only specified mechanisms or all in config
        active_mechanisms = mechanisms if mechanisms else list(config.keys())
        logger.info(f"Active mechanisms: {', '.join(active_mechanisms)}")
        
        # Validate that all mechanisms in the list are in the config
        missing_mechanisms = [m for m in active_mechanisms if m not in config]
        if missing_mechanisms:
            error_msg = f"Missing configuration for mechanisms: {', '.join(missing_mechanisms)}"
            logger.error(error_msg)
            raise ValueError(error_msg)
        
        # Calculate individual enhancements
        individual_enhancements = {}
        log_sum = 0.0
        dominant_mechanism = None
        max_log_enhancement = 0.0
        
        for mechanism in active_mechanisms:
            try:
                if mechanism not in config:
                    continue
                    
                mechanism_config = config[mechanism]
                logger.debug(f"Processing {mechanism} with params: {mechanism_config}")
                
                # Calculate enhancement for this mechanism
                enhancement_result = calculate_mechanism_enhancement(mechanism, mechanism_config)
                
                # Store the result
                individual_enhancements[mechanism] = enhancement_result
                log_enhancement = enhancement_result.get("log_enhancement", 0)
                log_sum += log_enhancement
                
                # Track dominant mechanism
                if log_enhancement > max_log_enhancement:
                    max_log_enhancement = log_enhancement
                    dominant_mechanism = mechanism
                    
                logger.debug(f"{mechanism} enhancement: {enhancement_result}")
                
            except Exception as e:
                logger.error(f"Error calculating enhancement for {mechanism}: {str(e)}")
                # Include the error in the individual enhancement result
                individual_enhancements[mechanism] = {
                    "log_enhancement": 0,
                    "enhancement_factor": 1,
                    "dominant_parameters": [],
                    "error": str(e),
                    "confidence": "None (Error)"
                }
        
        # Calculate combined enhancement factor
        combined_enhancement = math.pow(10, log_sum)
        
        # Determine mechanism contributions (percentage of log enhancement)
        total_log_enhancement = max(log_sum, 0.001)  # Avoid division by zero
        mechanism_contribution = {}
        
        for mechanism in individual_enhancements:
            log_enhancement = individual_enhancements[mechanism].get("log_enhancement", 0)
            contribution = log_enhancement / total_log_enhancement if total_log_enhancement > 0 else 0
            mechanism_contribution[mechanism] = round(contribution, 4)
        
        # Determine reaction rate increase category based on combined enhancement
        reaction_rate_increase = categorize_enhancement(combined_enhancement)
        
        logger.info(f"Calculated combined log enhancement: {log_sum}, " 
                   f"enhancement factor: {combined_enhancement:.2e}, "
                   f"dominant mechanism: {dominant_mechanism}")
        
        # Build and return the comprehensive result
        return {
            "individual_enhancements": individual_enhancements,
            "log_combined_enhancement": log_sum,
            "combined_enhancement_factor": combined_enhancement,
            "dominant_mechanism": dominant_mechanism,
            "mechanism_contribution": mechanism_contribution,
            "reaction_rate_increase": reaction_rate_increase
        }
        
    except Exception as e:
        logger.error(f"Error in calculate_enhancement: {str(e)}")
        raise

def calculate_mechanism_enhancement(
    mechanism: str, 
    params: Dict[str, Any]
) -> Dict[str, Any]:
    """Calculate the enhancement factor for a specific mechanism.
    
    Args:
        mechanism: The name of the mechanism
        params: Parameters specific to this mechanism
        
    Returns:
        Dictionary with enhancement results
    """
    try:
        # Dispatch to the appropriate calculation function based on mechanism type
        if mechanism == "rydberg_matter":
            return calculate_rydberg_enhancement(params)
        elif mechanism == "electron_screening":
            return calculate_electron_screening(params)
        elif mechanism == "qed_effects":
            return calculate_qed_effects(params)
        elif mechanism == "casimir_forces":
            return calculate_casimir_forces(params)
        elif mechanism == "quantum_coherence":
            return calculate_quantum_coherence(params)
        elif mechanism == "oppenheimer_phillips":
            return calculate_oppenheimer_phillips(params)
        elif mechanism == "bubble_collapse":
            return calculate_bubble_collapse(params)
        else:
            logger.warning(f"Unknown mechanism: {mechanism}")
            return {
                "log_enhancement": 0,
                "enhancement_factor": 1,
                "dominant_parameters": [],
                "confidence": "None (Unknown mechanism)"
            }
    except Exception as e:
        logger.error(f"Error calculating {mechanism} enhancement: {str(e)}")
        raise ValueError(f"Error in {mechanism} calculation: {str(e)}")

def calculate_rydberg_enhancement(params: Dict[str, Any]) -> Dict[str, Any]:
    """Calculate enhancement from Rydberg matter effects."""
    try:
        # Validate required parameters
        for param in ["principal_quantum_number", "temperature", "electric_field", "density"]:
            if param not in params:
                raise ValueError(f"Missing required parameter: {param}")

        n = params["principal_quantum_number"]
        T = params["temperature"]
        E = params["electric_field"]
        density = params["density"]
        
        # Basic physical model for Rydberg enhancement
        # log(Enhancement) ~ n^2 * (E/E0)^0.5 * exp(-ΔE/kT)
        
        # Characteristic electric field scale
        E0 = 5.14e11  # V/m (atomic unit)
        
        # Energy difference and thermal factor
        delta_E = 13.6 / (n * n)  # eV
        kT = 8.617e-5 * T  # eV
        thermal_factor = math.exp(-delta_E / kT)
        
        # Electric field factor (normalized)
        field_factor = math.sqrt(E / E0)
        
        # Density factor (normalized to typical metal density)
        density_factor = math.pow(density / 1e28, 0.5)
        
        # Combined enhancement
        log_enhancement = (2 * math.log10(n) + math.log10(field_factor) + 
                          math.log10(thermal_factor) + math.log10(density_factor))
        
        # Scale to realistic magnitudes (based on experimental observations)
        log_enhancement = max(min(log_enhancement + 3, 10), 0)
        
        # Enhancement factor
        enhancement_factor = math.pow(10, log_enhancement)
        
        # Determine dominant parameters
        param_contributions = {
            "principal_quantum_number": 2 * math.log10(n),
            "electric_field": math.log10(field_factor),
            "temperature": math.log10(thermal_factor),
            "density": math.log10(density_factor)
        }
        
        dominant_parameters = sorted(
            param_contributions.keys(),
            key=lambda p: abs(param_contributions[p]),
            reverse=True
        )[:2]
        
        return {
            "log_enhancement": log_enhancement,
            "enhancement_factor": enhancement_factor,
            "dominant_parameters": dominant_parameters,
            "parameter_contributions": param_contributions,
            "confidence": "Medium-High"
        }
    except Exception as e:
        logger.error(f"Error in calculate_rydberg_enhancement: {str(e)}")
        raise ValueError(f"Rydberg calculation error: {str(e)}")

def categorize_enhancement(enhancement_factor: float) -> str:
    """Categorize the enhancement factor into descriptive terms."""
    if enhancement_factor < 10:
        return "Negligible"
    elif enhancement_factor < 1e3:
        return "Minor"
    elif enhancement_factor < 1e6:
        return "Moderate"
    elif enhancement_factor < 1e10:
        return "Significant"
    elif enhancement_factor < 1e15:
        return "Major"
    elif enhancement_factor < 1e20:
        return "Revolutionary"
    else:
        return "Extraordinary"

@lru_cache(maxsize=128)
def calculate_enhancement_for_material(
    material_name: str,
    temperature: float,
    pressure: float,
    electric_field: float = 0.0,
    mechanisms: Optional[List[str]] = None
) -> Dict[str, Any]:
    """
    Calculate enhancement factors based on material properties.
    
    Args:
        material_name: Name of the material
        temperature: Temperature in Kelvin
        pressure: Pressure in Pa
        electric_field: Electric field in V/m
        mechanisms: List of mechanisms to include
        
    Returns:
        Dictionary with enhancement results
    """
    # Define material properties
    material_properties = {
        "palladium": {
            "lattice_constant": 3.89e-10,  # m
            "electron_density": 1.36e29,    # m^-3
            "work_function": 5.12,          # eV
            "atomic_number": 46,
            "mass_number": 106,
            "loading_ratio": 0.7,           # H/Pd ratio
        },
        "nickel": {
            "lattice_constant": 3.52e-10,   # m
            "electron_density": 9.14e28,    # m^-3
            "work_function": 5.01,          # eV
            "atomic_number": 28,
            "mass_number": 59,
            "loading_ratio": 0.6,           # H/Ni ratio
        },
        "titanium": {
            "lattice_constant": 2.95e-10,   # m
            "electron_density": 5.7e28,     # m^-3
            "work_function": 4.33,          # eV
            "atomic_number": 22,
            "mass_number": 48,
            "loading_ratio": 1.9,           # H/Ti ratio
        }
    }
    
    # Check if material is supported
    if material_name not in material_properties:
        logger.warning(f"Material {material_name} not supported, using palladium")
        material_name = "palladium"
    
    # Get material properties
    properties = material_properties[material_name]
    
    # Create configuration based on material properties
    config = {
        "rydberg_matter": {
            "principal_quantum_number": 20,
            "temperature": temperature,
            "electric_field": electric_field,
            "density": properties["electron_density"]
        },
        "electron_screening": {
            "atomic_number_1": 1,  # Hydrogen
            "atomic_number_2": properties["atomic_number"],
            "electron_density": properties["electron_density"],
            "temperature": temperature
        },
        "qed_effects": {
            "electric_field": electric_field,
            "frequency": 1e12,  # Typical phonon frequency
            "temperature": temperature
        },
        "casimir_forces": {
            "separation": properties["lattice_constant"] * 0.5,
            "area": properties["lattice_constant"]**2,
            "temperature": temperature
        },
        "quantum_coherence": {
            "temperature": temperature,
            "lattice_constant": properties["lattice_constant"],
            "electric_field": electric_field
        },
        "oppenheimer_phillips": {
            "projectile_z": 1,  # Hydrogen
            "target_z": properties["atomic_number"],
            "projectile_a": 2,  # Deuterium
            "target_a": properties["mass_number"],
            "energy_kev": 0.025  # Thermal energy at room temperature (approx)
        },
        "bubble_collapse": {
            "initial_radius": 1e-6,  # Typical microbubble
            "driving_pressure": pressure * 0.1,  # 10% of ambient
            "frequency": 20000.0  # 20 kHz (typical ultrasonic)
        }
    }
    
    # Calculate enhancement
    return calculate_enhancement(config, mechanisms)


def analyze_parameter_sensitivity(
    base_config: Dict[str, Any],
    parameter_name: str,
    mechanism: str,
    values: List[float],
    mechanisms: Optional[List[str]] = None
) -> Dict[str, Any]:
    """
    Analyze the sensitivity of enhancement to a parameter.
    
    Args:
        base_config: Base configuration dictionary
        parameter_name: Name of the parameter to vary
        mechanism: Name of the mechanism the parameter belongs to
        values: List of parameter values to test
        mechanisms: List of mechanisms to include
        
    Returns:
        Dictionary with sensitivity analysis results
    """
    if mechanism not in base_config:
        logger.error(f"Mechanism {mechanism} not in base configuration")
        return {"error": f"Mechanism {mechanism} not in base configuration"}
    
    if parameter_name not in base_config[mechanism]:
        logger.error(f"Parameter {parameter_name} not in mechanism {mechanism}")
        return {"error": f"Parameter {parameter_name} not in mechanism {mechanism}"}
    
    # Store original value
    original_value = base_config[mechanism][parameter_name]
    
    # Calculate enhancement for each value
    results = {
        "parameter_name": parameter_name,
        "mechanism": mechanism,
        "values": values,
        "enhancements": [],
        "log_enhancements": []
    }
    
    for value in values:
        # Create a deep copy of the configuration
        import copy
        config_copy = copy.deepcopy(base_config)
        
        # Set the parameter value
        config_copy[mechanism][parameter_name] = value
        
        # Calculate enhancement
        enhancement = calculate_enhancement(config_copy, mechanisms)
        
        # Store results
        results["enhancements"].append(enhancement["combined_enhancement_factor"])
        results["log_enhancements"].append(enhancement["log_combined_enhancement"])
    
    # Restore original value
    base_config[mechanism][parameter_name] = original_value
    
    return results 

def calculate_electron_screening(params: Dict[str, Any]) -> Dict[str, Any]:
    """Calculate enhancement from electron screening effects."""
    try:
        # Validate required parameters
        for param in ["atomic_number_1", "atomic_number_2", "electron_density", "temperature"]:
            if param not in params:
                raise ValueError(f"Missing required parameter: {param}")
        
        Z1 = params["atomic_number_1"]
        Z2 = params["atomic_number_2"]
        n_e = params["electron_density"]  # m^-3
        T = params["temperature"]  # K
        
        # Simple model for electron screening enhancement
        # U_e ~ (Z1 * Z2 * e^2) / (4πε0 * a_e)
        # where a_e is the electron cloud radius ~ (3/(4π*n_e))^(1/3)
        
        # Electron cloud radius in Bohr radii
        a_e = math.pow(3 / (4 * math.pi * n_e), 1/3) / 5.29e-11
        
        # Screening energy in eV
        U_e = (Z1 * Z2 * 14.4) / a_e
        
        # Temperature factor (screening is more effective at lower T)
        kT = 8.617e-5 * T  # eV
        temp_factor = math.exp(-min(kT / 5, 5))  # Normalized temperature effect
        
        # Calculate log enhancement based on empirical formula
        log_enhancement = math.log10(1 + (U_e / kT) * temp_factor)
        
        # Scale to typical values (based on experimental data)
        log_enhancement = min(log_enhancement * 0.5, 3)
        
        # Enhancement factor
        enhancement_factor = math.pow(10, log_enhancement)
        
        # Determine dominant parameters
        param_contributions = {
            "atomic_number_product": math.log10(Z1 * Z2) * 0.3,
            "electron_density": math.log10(n_e / 1e28) * 0.4,
            "temperature": -math.log10(T / 300) * 0.3
        }
        
        dominant_parameters = sorted(
            param_contributions.keys(),
            key=lambda p: abs(param_contributions[p]),
            reverse=True
        )[:2]
        
        return {
            "log_enhancement": log_enhancement,
            "enhancement_factor": enhancement_factor,
            "dominant_parameters": dominant_parameters,
            "parameter_contributions": param_contributions,
            "confidence": "High"
        }
    except Exception as e:
        logger.error(f"Error in calculate_electron_screening: {str(e)}")
        raise ValueError(f"Electron screening calculation error: {str(e)}")

def calculate_qed_effects(params: Dict[str, Any]) -> Dict[str, Any]:
    """Calculate enhancement from QED effects in double layers."""
    try:
        # Validate required parameters
        for param in ["electric_field", "frequency", "temperature"]:
            if param not in params:
                raise ValueError(f"Missing required parameter: {param}")
        
        E = params["electric_field"]  # V/m
        f = params["frequency"]  # Hz
        T = params["temperature"]  # K
        
        # Simple model for QED enhancement factor
        # Based on Preparata's theory of coherent quantum effects
        
        # Normalized electric field (relative to critical field 1e9 V/m)
        E_norm = E / 1e9
        
        # Frequency factor (coherent oscillations)
        f_norm = min(f / 1e12, 1.0)  # Normalized to THz
        
        # Temperature factor (coherence decreases with temperature)
        T_factor = 300 / max(T, 1)  # Normalized to room temperature
        
        # Calculate log enhancement
        log_enhancement = 2.0 * math.log10(E_norm) + math.log10(f_norm) + math.log10(T_factor)
        
        # Realistic constraints
        log_enhancement = max(min(log_enhancement + 1, 5), 0)
        
        # Enhancement factor
        enhancement_factor = math.pow(10, log_enhancement)
        
        # Determine dominant parameters
        param_contributions = {
            "electric_field": 2.0 * math.log10(E_norm),
            "frequency": math.log10(f_norm),
            "temperature": math.log10(T_factor)
        }
        
        dominant_parameters = sorted(
            param_contributions.keys(),
            key=lambda p: abs(param_contributions[p]),
            reverse=True
        )[:2]
        
        return {
            "log_enhancement": log_enhancement,
            "enhancement_factor": enhancement_factor,
            "dominant_parameters": dominant_parameters,
            "parameter_contributions": param_contributions,
            "confidence": "Medium"
        }
    except Exception as e:
        logger.error(f"Error in calculate_qed_effects: {str(e)}")
        raise ValueError(f"QED effects calculation error: {str(e)}")

def calculate_casimir_forces(params: Dict[str, Any]) -> Dict[str, Any]:
    """Calculate enhancement from Casimir forces."""
    try:
        # Validate required parameters
        for param in ["separation", "area", "temperature"]:
            if param not in params:
                raise ValueError(f"Missing required parameter: {param}")
        
        d = params["separation"]  # m
        A = params["area"]  # m^2
        T = params["temperature"]  # K
        
        # Simplified Casimir force model: F ~ hc*A/(d^4)
        # Enhancement factor based on potential energy modification
        
        # Normalized separation (relative to atomic scale 1 Å)
        d_norm = d / 1e-10
        
        # Normalized area (relative to atomic cross-section)
        A_norm = A / 1e-19
        
        # Temperature correction (thermal photons affect vacuum energy)
        # Lambda_T = hc/(2πkT) is thermal wavelength
        k_B = 1.38e-23  # J/K
        hbar = 1.05e-34  # J·s
        c = 3e8  # m/s
        lambda_T = hbar * c / (2 * math.pi * k_B * T)
        
        # Temperature factor (only relevant when d > lambda_T)
        T_factor = 1.0
        if d > lambda_T:
            T_factor = lambda_T / d
        
        # Calculate log enhancement (empirical model)
        log_enhancement = math.log10(A_norm) - 4 * math.log10(d_norm) + math.log10(T_factor)
        
        # Scale to realistic values
        log_enhancement = max(min(log_enhancement - 1, 3), 0)
        
        # Enhancement factor
        enhancement_factor = math.pow(10, log_enhancement)
        
        # Determine dominant parameters
        param_contributions = {
            "separation": -4 * math.log10(d_norm),
            "area": math.log10(A_norm),
            "temperature": math.log10(T_factor)
        }
        
        dominant_parameters = sorted(
            param_contributions.keys(),
            key=lambda p: abs(param_contributions[p]),
            reverse=True
        )[:2]
        
        return {
            "log_enhancement": log_enhancement,
            "enhancement_factor": enhancement_factor,
            "dominant_parameters": dominant_parameters,
            "parameter_contributions": param_contributions,
            "confidence": "Medium-Low"
        }
    except Exception as e:
        logger.error(f"Error in calculate_casimir_forces: {str(e)}")
        raise ValueError(f"Casimir forces calculation error: {str(e)}")

def calculate_quantum_coherence(params: Dict[str, Any]) -> Dict[str, Any]:
    """Calculate enhancement from quantum coherence effects."""
    try:
        # Validate required parameters
        for param in ["temperature", "lattice_constant", "electric_field"]:
            if param not in params:
                raise ValueError(f"Missing required parameter: {param}")
        
        T = params["temperature"]  # K
        a = params["lattice_constant"]  # m
        E = params["electric_field"]  # V/m
        
        # Coherence length estimate (simplified)
        # L_coh ~ a * exp(E_coh/kT) where E_coh is coherence energy
        
        # Characteristic energy scales
        E_0 = 1e5  # V/m (reference field)
        T_0 = 100  # K (reference temperature)
        a_0 = 3e-10  # m (reference lattice constant)
        
        # Field factor (field can help maintain coherence)
        E_factor = math.sqrt(E / E_0)
        
        # Temperature factor (coherence decreases with temperature)
        T_factor = math.exp(-(T / T_0))
        
        # Lattice constant factor (affects coherence length)
        a_factor = a_0 / a
        
        # Calculate log enhancement
        log_enhancement = math.log10(E_factor) + 2 * math.log10(T_factor) + math.log10(a_factor)
        
        # Scale to realistic values
        log_enhancement = max(min(log_enhancement + 3, 5), 0)
        
        # Enhancement factor
        enhancement_factor = math.pow(10, log_enhancement)
        
        # Determine dominant parameters
        param_contributions = {
            "temperature": 2 * math.log10(T_factor),
            "lattice_constant": math.log10(a_factor),
            "electric_field": math.log10(E_factor)
        }
        
        dominant_parameters = sorted(
            param_contributions.keys(),
            key=lambda p: abs(param_contributions[p]),
            reverse=True
        )[:2]
        
        return {
            "log_enhancement": log_enhancement,
            "enhancement_factor": enhancement_factor,
            "dominant_parameters": dominant_parameters,
            "parameter_contributions": param_contributions,
            "confidence": "Medium"
        }
    except Exception as e:
        logger.error(f"Error in calculate_quantum_coherence: {str(e)}")
        raise ValueError(f"Quantum coherence calculation error: {str(e)}")

def calculate_oppenheimer_phillips(params: Dict[str, Any]) -> Dict[str, Any]:
    """Calculate enhancement from Oppenheimer-Phillips process."""
    try:
        # Validate required parameters
        for param in ["projectile_z", "target_z", "projectile_a", "target_a", "energy_kev"]:
            if param not in params:
                raise ValueError(f"Missing required parameter: {param}")
        
        Z_p = params["projectile_z"]
        Z_t = params["target_z"]
        A_p = params["projectile_a"]
        A_t = params["target_a"]
        E = params["energy_kev"]  # keV
        
        # Simplified O-P process enhancement model
        # Enhancement relative to standard fusion cross-section
        
        # Coulomb barrier height (MeV)
        E_c = 1.44 * Z_p * Z_t / (A_p**(1/3) + A_t**(1/3)) / 1000
        
        # Neutron separation energy estimate (MeV)
        B_n = 8.0 if A_p > 1 else 0.0
        
        # Ratio of incident energy to Coulomb barrier
        eta = E / (E_c * 1000)
        
        # Basic O-P enhancement (relative to standard fusion)
        # Enhancement increases as Z_t increases and as E approaches barrier
        log_enhancement = math.log10(1 + (Z_t / 10) * (B_n / 8.0) * math.exp(-1/eta))
        
        # Scale based on empirical observations
        log_enhancement = max(min(log_enhancement + 2, 4), 0)
        
        # Enhancement factor
        enhancement_factor = math.pow(10, log_enhancement)
        
        # Determine dominant parameters
        param_contributions = {
            "target_z": math.log10(1 + Z_t / 10),
            "projectile_a": math.log10(1 + B_n / 8.0),
            "energy_ratio": math.log10(1 + math.exp(-1/eta))
        }
        
        dominant_parameters = sorted(
            param_contributions.keys(),
            key=lambda p: abs(param_contributions[p]),
            reverse=True
        )[:2]
        
        return {
            "log_enhancement": log_enhancement,
            "enhancement_factor": enhancement_factor,
            "dominant_parameters": dominant_parameters,
            "parameter_contributions": param_contributions,
            "confidence": "Medium-High"
        }
    except Exception as e:
        logger.error(f"Error in calculate_oppenheimer_phillips: {str(e)}")
        raise ValueError(f"Oppenheimer-Phillips calculation error: {str(e)}")

def calculate_bubble_collapse(params: Dict[str, Any]) -> Dict[str, Any]:
    """Calculate enhancement from bubble collapse (sonofusion)."""
    try:
        # Validate required parameters
        for param in ["initial_radius", "driving_pressure", "frequency"]:
            if param not in params:
                raise ValueError(f"Missing required parameter: {param}")
        
        R_0 = params["initial_radius"]  # m
        P_a = params["driving_pressure"]  # Pa
        f = params["frequency"]  # Hz
        
        # Simplified bubble collapse model
        # Based on Rayleigh-Plesset equation and shock formation
        
        # Reference values
        R_ref = 1e-5  # m
        P_ref = 1e5  # Pa (1 atm)
        f_ref = 2e4  # Hz (20 kHz)
        
        # Calculate characteristic velocity (crude estimate)
        sound_speed = 1500  # m/s (in water)
        v_max = sound_speed * math.sqrt(P_a / P_ref) 
        
        # Simplified shock strength estimate
        shock_strength = (R_ref / R_0) * math.pow(P_a / P_ref, 0.5) * math.pow(f / f_ref, 0.3)
        
        # Temperature compression estimate (based on adiabatic compression)
        # T ~ T_0 * (V_0/V)^(gamma-1) with gamma = 5/3 for ideal gas
        compression_ratio = math.pow(shock_strength, 3)  # Volume ratio estimate
        T_ratio = math.pow(compression_ratio, 2/3)  # Temperature ratio
        
        # Empirical enhancement factor model
        log_enhancement = 3.0 * math.log10(shock_strength) + 2.0 * math.log10(T_ratio)
        
        # Scale to realistic values (huge range in literature from 10^3 to 10^30!)
        log_enhancement = max(min(log_enhancement, 15), 3)
        
        # Enhancement factor
        enhancement_factor = math.pow(10, log_enhancement)
        
        # Determine dominant parameters
        param_contributions = {
            "initial_radius": -3.0 * math.log10(R_0 / R_ref),
            "driving_pressure": 1.5 * math.log10(P_a / P_ref),
            "frequency": 0.3 * math.log10(f / f_ref)
        }
        
        dominant_parameters = sorted(
            param_contributions.keys(),
            key=lambda p: abs(param_contributions[p]),
            reverse=True
        )[:2]
        
        return {
            "log_enhancement": log_enhancement,
            "enhancement_factor": enhancement_factor,
            "dominant_parameters": dominant_parameters,
            "parameter_contributions": param_contributions,
            "confidence": "Low"  # Highly variable experimental results
        }
    except Exception as e:
        logger.error(f"Error in calculate_bubble_collapse: {str(e)}")
        raise ValueError(f"Bubble collapse calculation error: {str(e)}") 