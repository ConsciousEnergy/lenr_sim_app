"""
Physical Constants and Configuration Parameters for LENR Simulation
Contains all fundamental constants, derived quantities, and default configurations
used across the physics engine components.
"""

from typing import Dict, Any
from scipy import constants
import numpy as np

# Fundamental Physical Constants
CONSTANTS = {
    # Quantum mechanics
    "hbar": constants.hbar,  # Reduced Planck constant (J⋅s)
    "h": constants.h,        # Planck constant (J⋅s)
    
    # Electromagnetic
    "e": constants.e,        # Elementary charge (C)
    "eps0": constants.epsilon_0,  # Vacuum permittivity (F/m)
    "mu0": constants.mu_0,   # Vacuum permeability (N/A^2)
    "alpha": constants.alpha, # Fine structure constant
    
    # Mass-related
    "me": constants.m_e,     # Electron mass (kg)
    "mp": constants.m_p,     # Proton mass (kg)
    "mn": constants.m_n,     # Neutron mass (kg)
    "u": constants.physical_constants["atomic mass constant"][0],  # Atomic mass unit (kg)
    
    # Thermodynamic
    "kb": constants.k,       # Boltzmann constant (J/K)
    "Na": constants.N_A,     # Avogadro constant (1/mol)
    "R": constants.R,        # Gas constant (J/(mol⋅K))
    
    # Other
    "c": constants.c,        # Speed of light (m/s)
    "G": constants.G,        # Gravitational constant (m^3/(kg⋅s^2))
}

# LENR-specific constants and parameters
LENR_PARAMETERS = {
    # Lattice parameters
    "default_lattice_constant": 4e-10,  # Default lattice spacing (m)
    "default_spring_constant": 10.0,    # Default spring constant (N/m)
    
    # Reaction parameters
    "dd_fusion_energy": 3.27e6 * constants.e,  # D-D fusion energy release (J)
    "hni_fusion_energy": 7.8e6 * constants.e,  # H-Ni fusion energy release (J)
    "dh_fusion_energy": 5.5e6 * constants.e,   # D-H fusion energy release (J)
    
    # Enhancement factors
    "quantum_tunneling_base": 1e-20,    # Base tunneling probability
    "electron_screening_base": 1e-10,    # Base screening enhancement
    "coherence_factor_base": 1.0,       # Base quantum coherence factor
    
    # Reaction rates
    "dd_base_rate": 1e-20,   # Base D-D reaction rate (m^3/s)
    "dh_base_rate": 1e-21,   # Base D-H reaction rate (m^3/s)
    "hni_base_rate": 1e-15,  # Base H-Ni reaction rate (m^3/s)
}

# Default simulation parameters
DEFAULT_CONFIG = {
    # System parameters
    "temperature": 300.0,     # Default temperature (K)
    "pressure": 1e5,         # Default pressure (Pa)
    "volume": 1e-6,          # Default reaction volume (m^3)
    
    # Lattice configuration
    "dimensions": (10, 10, 10),  # Default lattice dimensions
    "lattice_constant": LENR_PARAMETERS["default_lattice_constant"],
    "spring_constant": LENR_PARAMETERS["default_spring_constant"],
    
    # Material properties
    "electron_density": 1e28,  # Default electron density (m^-3)
    "deuterium_fraction": 0.5, # Default D/(D+H) ratio
    "nickel_density": 1e28,    # Default Ni atom density (m^-3)
    
    # Simulation parameters
    "time_step": 1e-15,       # Default time step (s)
    "max_steps": 1000,        # Default number of simulation steps
    "enhancement_factor": 1.0, # Default enhancement factor
}

# Derived quantities
DERIVED_QUANTITIES = {
    # Characteristic lengths
    "bohr_radius": constants.physical_constants["Bohr radius"][0],
    "compton_wavelength": constants.physical_constants["Compton wavelength"][0],
    
    # Energy scales
    "rydberg": constants.physical_constants["Rydberg constant times hc in eV"][0] * constants.e,
    "hartree": constants.physical_constants["Hartree energy"][0],
    
    # Nuclear physics
    "nuclear_magneton": constants.physical_constants["nuclear magneton"][0],
    "deuteron_mass": 2.014101778 * CONSTANTS["u"],
    "helium3_mass": 3.016029 * CONSTANTS["u"],
    "tritium_mass": 3.016049 * CONSTANTS["u"],
}

# Numerical parameters
NUMERICAL_PARAMETERS = {
    # Integration parameters
    "energy_tolerance": 1e-6,    # Energy conservation tolerance
    "position_tolerance": 1e-12,  # Position convergence tolerance
    "force_tolerance": 1e-10,    # Force convergence tolerance
    
    # Grid parameters
    "spatial_grid_points": 100,   # Number of spatial grid points
    "energy_grid_points": 1000,   # Number of energy grid points
    "momentum_grid_points": 50,   # Number of momentum grid points
    
    # Solver parameters
    "max_iterations": 1000,       # Maximum iterations for iterative solvers
    "convergence_threshold": 1e-8, # Convergence threshold for iterative methods
}

def get_config(overrides: Dict[str, Any] = None) -> Dict[str, Any]:
    """
    Get configuration dictionary with optional overrides.
    
    Args:
        overrides: Dictionary of parameter overrides
        
    Returns:
        Complete configuration dictionary
    """
    config = DEFAULT_CONFIG.copy()
    if overrides:
        config.update(overrides)
    return config

def calculate_derived_parameters(config: Dict[str, Any]) -> Dict[str, Any]:
    """
    Calculate derived parameters based on configuration.
    
    Args:
        config: Configuration dictionary
        
    Returns:
        Dictionary of derived parameters
    """
    derived = {}
    
    # Thermal parameters
    derived["thermal_velocity"] = np.sqrt(
        2 * CONSTANTS["kb"] * config["temperature"] / CONSTANTS["mp"]
    )
    derived["thermal_wavelength"] = np.sqrt(
        2 * np.pi * CONSTANTS["hbar"]**2 / 
        (CONSTANTS["me"] * CONSTANTS["kb"] * config["temperature"])
    )
    
    # Screening parameters
    derived["debye_length"] = np.sqrt(
        CONSTANTS["eps0"] * CONSTANTS["kb"] * config["temperature"] /
        (config["electron_density"] * CONSTANTS["e"]**2)
    )
    
    # Reaction parameters
    derived["dd_reaction_rate"] = (
        LENR_PARAMETERS["dd_base_rate"] * 
        config["enhancement_factor"] * 
        config["deuterium_fraction"]**2
    )
    
    return derived 