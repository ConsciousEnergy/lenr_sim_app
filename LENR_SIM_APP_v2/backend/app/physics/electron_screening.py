"""
Electron Screening Module for LENR Simulations

This module provides functions to calculate electron screening effects
in LENR systems. Electron screening reduces the Coulomb barrier between
nuclei, enhancing fusion probabilities.
"""

import numpy as np
import logging
from typing import Union, Tuple

from app.utils.logging import setup_logger

# Set up logger
logger = setup_logger("electron_screening", "logs/simulation.log")

def calculate_screening_potential(
    electron_density: float,
    work_function: float,
    temperature: float,
    model: str = "debye"
) -> float:
    """
    Calculate the electron screening potential.
    
    Args:
        electron_density: Electron density (electrons/m³)
        work_function: Material work function (eV)
        temperature: Temperature (K)
        model: Screening model to use ('debye', 'breit', 'thomas_fermi')
        
    Returns:
        Screening potential in eV
    """
    # Convert constants to SI units
    kB = 8.617333262e-5  # Boltzmann constant in eV/K
    e = 1.602176634e-19  # Elementary charge in C
    epsilon_0 = 8.8541878128e-12  # Vacuum permittivity in F/m
    
    if model.lower() == "debye":
        # Debye screening model
        # In a metal, the Debye length is very short due to high electron density
        # Calculate the Debye length
        debye_length = np.sqrt(epsilon_0 * kB * temperature / (electron_density * e**2))
        
        # Calculate the screening potential (Debye potential)
        # Ue = e^2 / (4*pi*epsilon_0*debye_length)
        screening_potential = e / (4 * np.pi * epsilon_0 * debye_length)
        
        # Convert from J to eV
        screening_potential = screening_potential / e
        
    elif model.lower() == "breit":
        # Breit model (simplified)
        # Based on Breit's quantum mechanical treatment of electron screening
        # This is a simplified implementation
        fermi_energy = work_function  # Approximation
        alpha = 1.0 / 137.036  # Fine structure constant
        screening_potential = alpha * fermi_energy * np.sqrt(electron_density * 1e-6)  # Simplified
        
    elif model.lower() == "thomas_fermi":
        # Thomas-Fermi model
        # Based on electron density at the nucleus
        # Uses the work function as an approximation of the Fermi energy
        screening_potential = 1.5 * work_function * (electron_density / 1e29)**(1/3)
        
    else:
        logger.warning(f"Unknown screening model: {model}, using Debye model")
        return calculate_screening_potential(electron_density, work_function, temperature, "debye")
    
    # Add temperature dependence - screening generally decreases with temperature
    # due to increased thermal motion
    temperature_factor = 1.0 / (1.0 + temperature / 1000.0)
    screening_potential *= temperature_factor
    
    logger.debug(f"Calculated screening potential of {screening_potential:.2f} eV using {model} model")
    
    return screening_potential

def calculate_enhancement_factor(
    z1: int,
    z2: int,
    screening_potential: float,
    energy: float
) -> float:
    """
    Calculate the fusion rate enhancement factor due to electron screening.
    
    Args:
        z1: Atomic number of first nucleus
        z2: Atomic number of second nucleus
        screening_potential: Screening potential in eV
        energy: Center-of-mass energy in keV
        
    Returns:
        Enhancement factor (dimensionless)
    """
    # Convert energy to eV
    energy_ev = energy * 1000.0
    
    # Calculate the Gamow peak energy
    # This is a characteristic energy for fusion reactions
    reduced_mass_u = 1.0  # Default to 1 amu for now
    
    # The enhancement factor is approximated by:
    # f = exp(πηUe/E)
    # where η = Z1*Z2*e²/(ℏ*v) is the Sommerfeld parameter
    
    # Calculate the Sommerfeld parameter
    alpha = 1.0 / 137.036  # Fine structure constant
    eta = z1 * z2 * alpha * np.sqrt(reduced_mass_u * 931494.0 / (2.0 * energy_ev))
    
    # Calculate the enhancement factor
    enhancement = np.exp(np.pi * eta * screening_potential / energy_ev)
    
    logger.debug(f"Calculated enhancement factor of {enhancement:.2e} for Z1={z1}, Z2={z2}, Ue={screening_potential:.2f} eV")
    
    return enhancement

def optimize_screening_conditions(
    material_work_function: float,
    temperature_range: Tuple[float, float]
) -> Tuple[float, float]:
    """
    Find optimal conditions for maximizing electron screening.
    
    Args:
        material_work_function: Material work function in eV
        temperature_range: (min_temp, max_temp) in K
        
    Returns:
        Tuple of (optimal_temperature, max_screening_potential)
    """
    # Simplified optimization: scan the temperature range and find
    # the temperature that maximizes screening
    
    temperatures = np.linspace(temperature_range[0], temperature_range[1], 100)
    potentials = []
    
    # Typical electron density in metals
    electron_density = 1e29  # electrons/m³
    
    for temp in temperatures:
        potential = calculate_screening_potential(
            electron_density, 
            material_work_function, 
            temp
        )
        potentials.append(potential)
    
    potentials = np.array(potentials)
    optimal_idx = np.argmax(potentials)
    optimal_temperature = temperatures[optimal_idx]
    max_screening_potential = potentials[optimal_idx]
    
    logger.info(f"Optimal screening conditions: T={optimal_temperature:.2f}K, Ue={max_screening_potential:.2f}eV")
    
    return optimal_temperature, max_screening_potential 