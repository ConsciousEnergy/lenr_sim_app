"""
LENR Physics Engine Constants and Configuration Module
Contains physical constants, derived parameters, and configuration utilities
for LENR simulation v2.
"""

from typing import Dict, Any
import numpy as np
from scipy import constants
import json
import os

# Fundamental physical constants
PHYSICAL_CONSTANTS = {
    # Fundamental constants
    "hbar": constants.hbar,
    "e": constants.e,
    "c": constants.c,
    "epsilon_0": constants.epsilon_0,
    "mu_0": constants.mu_0,
    "k_B": constants.k,
    "G": constants.G,
    
    # Particle masses
    "m_e": constants.m_e,
    "m_p": constants.m_p,
    "m_n": constants.m_n,
    "m_d": 2.01410177811 * constants.atomic_mass,  # Deuterium mass
    "m_t": 3.0160492 * constants.atomic_mass,      # Tritium mass
    "m_He3": 3.0160293 * constants.atomic_mass,    # Helium-3 mass
    "m_He4": 4.0026032497 * constants.atomic_mass, # Helium-4 mass
    "m_Li6": 6.0151223 * constants.atomic_mass,    # Lithium-6 mass
    "m_Li7": 7.0160040 * constants.atomic_mass,    # Lithium-7 mass
    "m_Pd": 106.42 * constants.atomic_mass,        # Palladium mass (average)
    "m_Ni": 58.6934 * constants.atomic_mass,       # Nickel mass (average)
    
    # Derived constants
    "alpha": constants.alpha,                      # Fine structure constant
    "r_bohr": constants.physical_constants["Bohr radius"][0],
    "rydberg": constants.physical_constants["Rydberg constant"][0],
    
    # Unit conversions
    "eV_to_J": constants.e,
    "J_to_eV": 1.0 / constants.e
}

# ---------------------------------------------------------------------------
# Theory-level constants (v0.3.0-beta)
# ---------------------------------------------------------------------------
# Conservative upper bound for total tunneling enhancement factor.
# Part 2 of the unified framework derives 10^3 - 10^5 (90% confidence).
# Set to 10^5 as the default ceiling; configurable per simulation run.
MAX_ENHANCEMENT_FACTOR: float = 1e5

# Schwinger critical field E_cr = m_e^2 c^3 / (e hbar) ≈ 1.323285e18 V/m.
# Derived from CODATA via scipy.constants (see PHYSICS_EQUATION_VERIFICATION §9C.2).
SCHWINGER_CRITICAL_FIELD_V_M: float = (
    constants.m_e**2 * constants.c**3 / (constants.e * constants.hbar)
)

# Leading Heisenberg–Euler vacuum-polarisation coefficient 2*alpha/(45*pi).
QED_VACUUM_COEFFICIENT: float = 2.0 * constants.alpha / (45.0 * np.pi)

# Miles heat-helium correlation: D + D -> He-4 + 23.8 MeV (all as heat)
# 1 Watt of excess heat = 2.63e11 He-4 atoms/second  (Miles 1990)
MILES_HEAT_HELIUM_RATE: float = 2.63e11  # He-4 atoms per second per watt

# Ni-H thermal activation threshold (Clean-HME data)
# Below ~973 K (~700 C) excess heat is not observed in Nickel-Hydrogen systems.
NIH_ACTIVATION_TEMPERATURE_K: float = 973.0  # K (~700 C)

# Nuclear radius (used for halo electron overlap calculations)
# r_0 ~ 5 fm for light nuclei.  The 0.1 nm value in the original
# paper is the ionic/atomic radius, NOT the nuclear radius.
NUCLEAR_RADIUS_FM: float = 5.0  # femtometers
NUCLEAR_RADIUS_M: float = 5.0e-15  # meters

# Ultra-Dense Hydrogen (UDH) Constants from arxiv paper 2505.21946
# "Field-Coupled Quantum Collapse in Ultra-Dense Hydrogen" by Zeiner-Gundersen
UDH_CONSTANTS = {
    # UDH structural parameters
    "udh_bond_length": 2.3e-12,           # UDH interatomic distance (~2.3 pm)
    "normal_h2_bond": 74e-12,             # Normal H2 bond length (~74 pm)
    "udh_density_factor": 1e6,            # Density enhancement factor (74/2.3)^3
    
    # Bosonic state parameters
    "bosonic_binding_energy": 0.5,        # Binding energy in eV
    "metastable_lifetime": 2.2e-6,        # Metastable state lifetime (muon-like)
    "cluster_size_typical": 6,            # Typical H(0) cluster size
    
    # Field-induced collapse parameters
    "collapse_threshold_field": 1e8,      # Electric field threshold for collapse (V/m)
    "collapse_rate_constant": 1e12,       # Collapse rate constant (s^-1)
    
    # Vacuum squeezing parameters
    "vacuum_squeeze_coefficient": 0.1,    # Squeeze parameter coefficient
    "casimir_prefactor": 1.0,             # Casimir effect prefactor
    
    # QET (Quantum Energy Teleportation) parameters
    "qet_correlation_factor": 0.5,        # Entanglement correlation strength
    "decoherence_rate": 1e9,              # Decoherence rate (Hz)
}

# Default LENR system configuration
DEFAULT_CONFIG = {
    # System parameters
    "temperature": 300.0,         # Temperature in Kelvin
    "pressure": 101325.0,         # Pressure in Pascal (1 atm)
    "lattice_constant": 3.89e-10, # Lattice parameter in meters (Pd)
    "electron_density": 1e28,     # Electron density in m^-3
    "dimensions": (10, 10, 10),   # Lattice dimensions
    
    # Simulation parameters
    "time_step": 1e-15,           # Simulation time step in seconds
    "max_steps": 1000,            # Maximum simulation steps
    "enhancement_factor": 1.0,    # Global enhancement factor
    
    # Physics model parameters
    "spring_constant": 10.0,      # Spring constant for lattice dynamics
    "debye_temperature": 275.0,   # Debye temperature for Pd
    "work_function": 5.12,        # Work function for Pd in eV
    "fermi_energy": 6.1,          # Free-electron E_F for Pd in eV (from n_e=6.8e28 m^-3)
    "screening_length": 5e-11,    # Electron screening length in meters
    
    # Advanced model parameters
    "coherence_factor": 0.5,      # Quantum coherence factor
    "tunneling_factor": 0.001,    # Base tunneling probability factor
    "vacancy_concentration": 0.01,# Vacancy concentration in lattice
    "impurity_concentration": 0.005,  # Impurity concentration
    
    # Reaction parameters
    "reaction_types": ["DD", "DT", "pD", "pLi6"],
    "branching_ratios": {
        "DD": {"He3_n": 0.5, "T_p": 0.5},
        "DT": {"He4_n": 1.0},
        "pD": {"He3_gamma": 1.0},
        "pLi6": {"He4_He3": 1.0}
    },
    
    # Visualization parameters
    "visualization_scale": 1.0,
    "color_scheme": "standard",
    
    # Ultra-Dense Hydrogen (UDH) Physics Parameters
    # Based on arxiv paper 2505.21946 by Zeiner-Gundersen
    "enable_udh_physics": True,           # Enable UDH physics calculations
    "vacuum_squeezing_enabled": True,     # Enable vacuum squeezing effects
    "udh_params": {
        "cluster_size": 6,                # Number of hydrogen atoms in UDH cluster
        "bond_length": 2.3e-12,           # UDH bond length in meters
        "binding_energy": 0.5,            # Bosonic binding energy in eV
        "collapse_threshold": 1e8,        # Field collapse threshold in V/m
        "squeeze_coefficient": 0.1,       # Vacuum squeeze coefficient
    },
    "field_collapse_threshold": 1e8,      # EM field threshold for collapse (V/m)
}

def get_config(user_config: Dict[str, Any] = None) -> Dict[str, Any]:
    """
    Create configuration by merging user config with defaults.
    
    Args:
        user_config: User-provided configuration parameters
        
    Returns:
        Complete configuration dictionary
    """
    config = DEFAULT_CONFIG.copy()
    
    if user_config:
        # Update with user configuration
        config.update(user_config)
    
    # Add physical constants to config
    config["constants"] = PHYSICAL_CONSTANTS
    
    # Add UDH constants to config
    config["udh_constants"] = UDH_CONSTANTS
    
    # Add derived parameters
    config.update(calculate_derived_parameters(config))
    
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
    derived["thermal_energy"] = config["constants"]["k_B"] * config["temperature"]  # J
    derived["thermal_energy_eV"] = derived["thermal_energy"] * config["constants"]["J_to_eV"]
    
    # Thermal de Broglie wavelength
    derived["thermal_wavelength_e"] = np.sqrt(
        2 * np.pi * config["constants"]["hbar"]**2 / 
        (config["constants"]["m_e"] * derived["thermal_energy"])
    )
    
    derived["thermal_wavelength_d"] = np.sqrt(
        2 * np.pi * config["constants"]["hbar"]**2 / 
        (config["constants"]["m_d"] * derived["thermal_energy"])
    )
    
    # Debye length calculation
    derived["debye_length"] = np.sqrt(
        config["constants"]["epsilon_0"] * derived["thermal_energy"] / 
        (config["electron_density"] * config["constants"]["e"]**2)
    )
    
    # Plasma parameters
    derived["plasma_frequency"] = np.sqrt(
        config["electron_density"] * config["constants"]["e"]**2 / 
        (config["constants"]["m_e"] * config["constants"]["epsilon_0"])
    )
    
    # Classical turning point
    derived["classical_turning_point"] = (
        config["constants"]["e"]**2 / (4 * np.pi * config["constants"]["epsilon_0"] * derived["thermal_energy"])
    )
    
    # Screening enhancement
    derived["screening_energy"] = (
        config["constants"]["e"]**2 / (4 * np.pi * config["constants"]["epsilon_0"] * config["screening_length"])
    )
    derived["screening_energy_eV"] = derived["screening_energy"] * config["constants"]["J_to_eV"]
    
    # Coulomb barrier (approximate for D-D)
    derived["coulomb_barrier_dd"] = (
        config["constants"]["e"]**2 / (4 * np.pi * config["constants"]["epsilon_0"] * 2e-15)
    ) * config["constants"]["J_to_eV"]  # Value in eV
    
    # Gamow exponent 2*pi*eta for D-D at the thermal energy:
    # 2*pi*eta = pi*alpha*sqrt(2*mu*c^2/E) with mu = m_d/2, i.e.
    # pi*alpha*sqrt(m_d*c^2/E). Rest energy is converted to eV so the ratio
    # is dimensionless (a previous version divided joules by eV).
    m_d_c2_eV = (
        config["constants"]["m_d"] * config["constants"]["c"]**2
        * config["constants"]["J_to_eV"]
    )
    derived["gamow_factor_dd"] = np.pi * config["constants"]["alpha"] * np.sqrt(
        m_d_c2_eV / derived["thermal_energy_eV"]
    )
    
    # Phonon-assisted tunneling factor
    derived["phonon_frequency"] = (
        config["constants"]["k_B"] * config["debye_temperature"] / config["constants"]["hbar"]
    )
    
    # Lattice parameters
    derived["lattice_volume"] = config["lattice_constant"]**3
    derived["atom_density"] = 1.0 / derived["lattice_volume"]
    
    # Total number of lattice sites
    derived["total_sites"] = (
        config["dimensions"][0] * config["dimensions"][1] * config["dimensions"][2]
    )
    
    return derived

def save_config(config: Dict[str, Any], file_path: str) -> None:
    """
    Save configuration to a JSON file.
    
    Args:
        config: Configuration dictionary
        file_path: Path to save the configuration
    """
    # Create a serializable copy of the config
    serializable_config = {}
    
    for key, value in config.items():
        # Handle numpy arrays and other special types
        if isinstance(value, np.ndarray):
            serializable_config[key] = value.tolist()
        elif key == "constants":
            # Convert constants to string representations for readability
            serializable_config[key] = {
                const_key: str(const_val) for const_key, const_val in value.items()
            }
        else:
            serializable_config[key] = value
    
    # Make sure directory exists
    os.makedirs(os.path.dirname(file_path), exist_ok=True)
    
    # Save to file
    with open(file_path, 'w') as f:
        json.dump(serializable_config, f, indent=2)

def load_config(file_path: str) -> Dict[str, Any]:
    """
    Load configuration from a JSON file.
    
    Args:
        file_path: Path to the configuration file
        
    Returns:
        Configuration dictionary
    """
    with open(file_path, 'r') as f:
        loaded_config = json.load(f)
    
    # Re-add physical constants which were stored as strings
    config = get_config(loaded_config)
    
    return config 