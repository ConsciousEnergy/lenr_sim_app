"""
Core Physics Constants for LENR Simulation
==========================================

This module contains all fundamental physics constants used throughout the LENR
simulation platform. Values are in SI units unless otherwise specified.

All constants are from CODATA 2018 recommended values.
"""

import numpy as np
from dataclasses import dataclass
from typing import Dict, Any

# ============================================================================
# FUNDAMENTAL CONSTANTS (SI Units)
# ============================================================================

# Speed of light in vacuum (m/s)
C_LIGHT = 299792458.0
C = C_LIGHT  # Alias for convenience

# Planck constant (J·s)
H_PLANCK = 6.62607015e-34

# Reduced Planck constant (J·s)
HBAR = 1.054571817e-34

# Elementary charge (C)
E_CHARGE = 1.602176634e-19

# Vacuum permittivity (F/m)
EPSILON_0 = 8.8541878128e-12

# Vacuum permeability (H/m)
MU_0 = 1.25663706212e-6

# Boltzmann constant (J/K)
K_BOLTZMANN = 1.380649e-23

# Avogadro constant (1/mol)
N_AVOGADRO = 6.02214076e23

# Fine-structure constant (dimensionless)
ALPHA = 7.2973525693e-3

# Bohr radius (m)
A_BOHR = 5.29177210903e-11

# ============================================================================
# PARTICLE MASSES (kg)
# ============================================================================

# Electron mass
M_ELECTRON = 9.1093837015e-31

# Proton mass
M_PROTON = 1.67262192369e-27

# Neutron mass
M_NEUTRON = 1.67492749804e-27

# Deuteron mass (deuterium nucleus)
M_DEUTERON = 3.3435837724e-27

# Triton mass (tritium nucleus)
M_TRITON = 5.0073567446e-27

# Alpha particle mass (He-4 nucleus)
M_ALPHA = 6.6446573357e-27

# Atomic mass unit
AMU = 1.66053906660e-27

# ============================================================================
# ATOMIC MASSES IN AMU
# ============================================================================

ATOMIC_MASSES = {
    'H': 1.00782503207,      # Hydrogen-1
    'D': 2.01410177785,      # Deuterium
    'T': 3.0160492777,       # Tritium
    'He3': 3.0160293191,     # Helium-3
    'He4': 4.00260325415,    # Helium-4
    'Li6': 6.015122795,      # Lithium-6
    'Li7': 7.01600455,       # Lithium-7
    'B10': 10.0129370,       # Boron-10
    'B11': 11.0093054,       # Boron-11
    'C12': 12.0,             # Carbon-12
    'N14': 14.0030740048,    # Nitrogen-14
    'O16': 15.99491461956,   # Oxygen-16
    'Pd': 106.42,            # Palladium (average)
    'Ni': 58.6934,           # Nickel (average)
    'Ti': 47.867,            # Titanium (average)
    'Pt': 195.084,           # Platinum (average)
}

# ============================================================================
# ENERGY CONVERSION FACTORS
# ============================================================================

# 1 eV in Joules
EV_TO_J = 1.602176634e-19

# 1 keV in Joules
KEV_TO_J = 1.602176634e-16

# 1 MeV in Joules
MEV_TO_J = 1.602176634e-13

# 1 Joule in eV
J_TO_EV = 1.0 / EV_TO_J

# 1 Joule in keV
J_TO_KEV = 1.0 / KEV_TO_J  # 1 Joule in keV
# 1 Joule in MeV
J_TO_MEV = 1.0 / MEV_TO_J

# 1 electron mass in MeV/c²
M_ELECTRON_MEV = 0.51099895

# 1 proton mass in MeV/c²
M_PROTON_MEV = 938.27208816

# 1 neutron mass in MeV/c²
M_NEUTRON_MEV = 939.56542052

# ============================================================================
# NUCLEAR PARAMETERS
# ============================================================================

# Nuclear radius constant (fm)
R0_NUCLEAR = 1.2  # r = r0 * A^(1/3)

# Nuclear force range (fm)
NUCLEAR_FORCE_RANGE = 1.4

# QCD strong coupling evaluated at the Z-boson mass, alpha_s(M_Z).
# NOTE: this is NOT a low-energy nuclear coupling; at nuclear (MeV) scales
# the strong interaction is non-perturbative and alpha_s is O(1).
ALPHA_STRONG = 0.1181

# ============================================================================
# SCREENING PARAMETERS FOR LENR
# ============================================================================

# Electron screening potential in Pd (eV) - experimental estimate
SCREENING_POTENTIAL_PD = 800.0  # eV

# Electron screening potential in Ni (eV) - experimental estimate  
SCREENING_POTENTIAL_NI = 500.0  # eV

# Electron screening potential in Ti (eV) - experimental estimate
SCREENING_POTENTIAL_TI = 350.0  # eV

# Electron screening potential in Pt (eV) - experimental estimate
SCREENING_POTENTIAL_PT = 750.0  # eV

# Dictionary of screening potentials by material
SCREENING_POTENTIALS = {
    'palladium': SCREENING_POTENTIAL_PD,
    'nickel': SCREENING_POTENTIAL_NI,
    'titanium': SCREENING_POTENTIAL_TI,
    'platinum': SCREENING_POTENTIAL_PT,
    'Pd': SCREENING_POTENTIAL_PD,
    'Ni': SCREENING_POTENTIAL_NI,
    'Ti': SCREENING_POTENTIAL_TI,
    'Pt': SCREENING_POTENTIAL_PT,
}

# ============================================================================
# REACTION Q-VALUES (MeV)
# ============================================================================

REACTION_Q_VALUES = {
    'd-d_n': 3.269,      # D + D → He-3 + n
    'd-d_p': 4.033,      # D + D → T + p
    'd-d_gamma': 23.847, # D + D → He-4 + γ (radiative; branch ~1e-7 in vacuum)
    'p-d': 5.494,        # p + D → He-3 + γ
    'd-t': 17.589,       # D + T → He-4 + n
    'd-he3': 18.353,     # D + He-3 → He-4 + p
    'p-li7': 17.346,     # p + Li-7 → 2 He-4
    'p-b11': 8.682,      # p + B-11 → 3 He-4
    'p-li6': 4.02,       # p + Li-6 → He-4 + He-3
}

# ============================================================================
# ASTROPHYSICAL S-FACTORS (keV·barn)
# ============================================================================

# S-factor at zero energy for various reactions
S_FACTORS = {
    'd-d': 52.9,         # D(d,n)He-3 single channel S(0); D(d,p)T is ~55-56,
                         # so both channels combined is ~108 keV·barn (NACRE)
    'd-t': 1.1e4,        # D + T (much higher due to resonance)
    'd-he3': 6.2e3,      # D + He-3
    'p-b11': 2.0e-4,     # p + B-11 (very low)
    'p-li7': 0.048,      # p + Li-7
}

# ============================================================================
# MATERIAL PROPERTIES
# ============================================================================

@dataclass
class MaterialProperties:
    """Properties of a host material for LENR"""
    name: str
    symbol: str
    atomic_number: int
    atomic_mass: float  # AMU
    density: float  # kg/m³
    lattice_constant: float  # Angstroms
    lattice_type: str  # 'fcc', 'bcc', etc.
    debye_temperature: float  # K
    electron_density: float  # electrons/m³
    fermi_energy: float  # eV
    screening_potential: float  # eV

MATERIALS = {
    'palladium': MaterialProperties(
        name='Palladium',
        symbol='Pd',
        atomic_number=46,
        atomic_mass=106.42,
        density=12023.0,
        lattice_constant=3.89,
        lattice_type='fcc',
        debye_temperature=274.0,
        electron_density=6.8e28,
        # Free-electron E_F from electron_density (self-consistent with the
        # Thomas-Fermi screening formulas that consume both). The previous
        # 11.7 eV is aluminium's textbook value.
        fermi_energy=6.1,
        screening_potential=800.0
    ),
    'nickel': MaterialProperties(
        name='Nickel',
        symbol='Ni',
        atomic_number=28,
        atomic_mass=58.69,
        density=8908.0,
        lattice_constant=3.52,
        lattice_type='fcc',
        debye_temperature=450.0,
        electron_density=9.1e28,
        fermi_energy=7.4,  # free-electron model from electron_density
        screening_potential=500.0
    ),
    'titanium': MaterialProperties(
        name='Titanium',
        symbol='Ti',
        atomic_number=22,
        atomic_mass=47.87,
        density=4506.0,
        lattice_constant=2.95,
        lattice_type='hcp',
        debye_temperature=420.0,
        electron_density=1.0e29,
        fermi_energy=7.9,  # free-electron model from electron_density
        screening_potential=350.0
    ),
    'platinum': MaterialProperties(
        name='Platinum',
        symbol='Pt',
        atomic_number=78,
        atomic_mass=195.08,
        density=21450.0,
        lattice_constant=3.92,
        lattice_type='fcc',
        debye_temperature=240.0,
        electron_density=6.6e28,
        fermi_energy=6.0,  # free-electron model from electron_density
        screening_potential=750.0
    ),
}

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

def reduced_mass(m1: float, m2: float) -> float:
    """
    Calculate the reduced mass of two particles.
    
    Args:
        m1: Mass of particle 1 (kg)
        m2: Mass of particle 2 (kg)
        
    Returns:
        Reduced mass in kg
    """
    return (m1 * m2) / (m1 + m2)


def sommerfeld_parameter(z1: int, z2: int, energy_kev: float, mu_kg: float) -> float:
    """
    Calculate the Sommerfeld parameter (eta).
    
    The Sommerfeld parameter characterizes the strength of Coulomb interaction
    relative to kinetic energy.
    
    Args:
        z1: Charge number of particle 1
        z2: Charge number of particle 2  
        energy_kev: Center-of-mass energy in keV
        mu_kg: Reduced mass in kg
        
    Returns:
        Dimensionless Sommerfeld parameter
    """
    energy_j = energy_kev * KEV_TO_J
    velocity = np.sqrt(2 * energy_j / mu_kg)
    
    # eta = Z1 * Z2 * e^2 / (4π * ε0 * ℏ * v)
    eta = (z1 * z2 * E_CHARGE**2) / (4 * np.pi * EPSILON_0 * HBAR * velocity)
    return eta


def coulomb_barrier(z1: int, z2: int, r_fm: float = None) -> float:
    """
    Calculate the Coulomb barrier height.
    
    Args:
        z1: Charge number of particle 1
        z2: Charge number of particle 2
        r_fm: Barrier radius in femtometers (default: sum of nuclear radii)
        
    Returns:
        Barrier height in keV
    """
    if r_fm is None:
        # Use touching radius approximation
        a1 = ATOMIC_MASSES.get('D', 2.0)  # Use deuterium as default
        a2 = ATOMIC_MASSES.get('D', 2.0)
        r_fm = R0_NUCLEAR * (a1**(1/3) + a2**(1/3))
    
    r_m = r_fm * 1e-15  # Convert fm to m
    
    # V = Z1 * Z2 * e^2 / (4π * ε0 * r)
    v_j = (z1 * z2 * E_CHARGE**2) / (4 * np.pi * EPSILON_0 * r_m)
    v_kev = v_j / KEV_TO_J
    
    return v_kev


def gamow_energy(z1: int, z2: int, mu_kg: float) -> float:
    """
    Calculate the Gamow energy.
    
    The Gamow energy is characteristic of quantum tunneling through
    the Coulomb barrier.
    
    Args:
        z1: Charge number of particle 1
        z2: Charge number of particle 2
        mu_kg: Reduced mass in kg
        
    Returns:
        Gamow energy in keV
    """
    # E_G = 2 * mu * c^2 * (π * α * Z1 * Z2)^2
    factor = np.pi * ALPHA * z1 * z2
    e_g_j = 2 * mu_kg * C_LIGHT**2 * factor**2
    e_g_kev = e_g_j / KEV_TO_J
    return e_g_kev


def thermal_energy(temperature_k: float) -> float:
    """
    Calculate thermal energy kT.
    
    Args:
        temperature_k: Temperature in Kelvin
        
    Returns:
        Thermal energy in keV
    """
    e_j = K_BOLTZMANN * temperature_k
    return e_j / KEV_TO_J


# ============================================================================
# MODULE INFO
# ============================================================================

__all__ = [
    # Fundamental constants
    'C', 'C_LIGHT', 'H_PLANCK', 'HBAR', 'E_CHARGE', 'EPSILON_0', 'MU_0',
    'K_BOLTZMANN', 'N_AVOGADRO', 'ALPHA', 'A_BOHR',
    # Particle masses
    'M_ELECTRON', 'M_PROTON', 'M_NEUTRON', 'M_DEUTERON', 'M_TRITON', 
    'M_ALPHA', 'AMU', 'ATOMIC_MASSES',
    # Energy conversions
    'EV_TO_J', 'KEV_TO_J', 'MEV_TO_J', 'J_TO_EV', 'J_TO_KEV', 'J_TO_MEV',
    'M_ELECTRON_MEV', 'M_PROTON_MEV', 'M_NEUTRON_MEV',
    # Nuclear parameters  
    'R0_NUCLEAR', 'NUCLEAR_FORCE_RANGE', 'ALPHA_STRONG',
    # LENR parameters
    'SCREENING_POTENTIALS', 'REACTION_Q_VALUES', 'S_FACTORS',
    # Materials
    'MaterialProperties', 'MATERIALS',
    # Utility functions
    'reduced_mass', 'sommerfeld_parameter', 'coulomb_barrier', 
    'gamow_energy', 'thermal_energy',
]

