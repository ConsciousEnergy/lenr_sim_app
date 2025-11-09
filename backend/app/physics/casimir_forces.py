"""
Casimir Forces Module for LENR Simulations

This module provides functions to calculate Casimir forces and their
effects in LENR systems. Casimir forces are quantum effects arising
from vacuum fluctuations, which can play a role in nanoscale LENR
phenomena.
"""

import numpy as np
import logging
from typing import Union, Tuple, Dict, Any

from app.utils.logging import setup_logger

# Set up logger
logger = setup_logger("casimir_forces", "logs/simulation.log")

def calculate_casimir_force(
    distance: float,
    area: float,
    temperature: float = 300.0,
    permittivity1: float = 1.0,
    permittivity2: float = 1.0,
    permeability1: float = 1.0,
    permeability2: float = 1.0
) -> float:
    """
    Calculate the Casimir force between two parallel plates.
    
    Args:
        distance: Distance between plates in meters
        area: Area of the plates in m²
        temperature: Temperature in Kelvin
        permittivity1: Relative permittivity of first material
        permittivity2: Relative permittivity of second material
        permeability1: Relative permeability of first material
        permeability2: Relative permeability of second material
        
    Returns:
        Casimir force in Newtons (attractive force is negative)
    """
    # Physical constants
    hbar = 1.054571817e-34  # Reduced Planck constant in J·s
    c = 299792458  # Speed of light in m/s
    kB = 1.380649e-23  # Boltzmann constant in J/K
    
    # Ensure distance is positive
    if distance <= 0:
        logger.warning(f"Invalid distance: {distance} m. Using minimum value of 1e-10 m.")
        distance = 1e-10
    
    # Calculate the Casimir force at zero temperature (original Casimir formula)
    # F = -π²ħc A / (240 d⁴)
    casimir_force_zero = -np.pi**2 * hbar * c * area / (240 * distance**4)
    
    # Temperature correction factor
    # At high temperature or large distance, thermal effects become important
    thermal_length = hbar * c / (2 * np.pi * kB * temperature)
    
    if distance > thermal_length:
        # High-temperature limit correction
        correction_factor = (thermal_length / distance) * (np.pi**2 / 3)
        casimir_force = casimir_force_zero / correction_factor
    else:
        # Low-temperature approximation (minimal correction)
        correction_factor = 1 + (distance / thermal_length)**4 / 45
        casimir_force = casimir_force_zero * correction_factor
    
    # Material properties correction
    # The original Casimir formula assumes perfect conductors
    # For real materials, we need a correction factor
    r1 = (permittivity1 - 1) / (permittivity1 + 1)
    r2 = (permittivity2 - 1) / (permittivity2 + 1)
    material_factor = r1 * r2  # Simplified correction
    
    # Apply material correction
    casimir_force *= material_factor
    
    logger.debug(f"Calculated Casimir force of {casimir_force:.2e} N at d={distance*1e9:.2f} nm")
    
    return casimir_force

def calculate_casimir_energy(
    distance: float,
    area: float,
    temperature: float = 300.0,
    permittivity1: float = 1.0,
    permittivity2: float = 1.0
) -> float:
    """
    Calculate the Casimir energy between two parallel plates.
    
    Args:
        distance: Distance between plates in meters
        area: Area of the plates in m²
        temperature: Temperature in Kelvin
        permittivity1: Relative permittivity of first material
        permittivity2: Relative permittivity of second material
        
    Returns:
        Casimir energy in Joules
    """
    # Physical constants
    hbar = 1.054571817e-34  # Reduced Planck constant in J·s
    c = 299792458  # Speed of light in m/s
    
    # Ensure distance is positive
    if distance <= 0:
        logger.warning(f"Invalid distance: {distance} m. Using minimum value of 1e-10 m.")
        distance = 1e-10
    
    # Calculate the Casimir energy at zero temperature
    # E = -π²ħc A / (720 d³)
    casimir_energy = -np.pi**2 * hbar * c * area / (720 * distance**3)
    
    # Material properties correction (simplified)
    r1 = (permittivity1 - 1) / (permittivity1 + 1)
    r2 = (permittivity2 - 1) / (permittivity2 + 1)
    material_factor = r1 * r2
    
    # Apply material correction
    casimir_energy *= material_factor
    
    # Temperature correction (simplified)
    if temperature > 0:
        kB = 1.380649e-23  # Boltzmann constant in J/K
        thermal_correction = 1 + (2 * np.pi * kB * temperature * distance / (hbar * c))**2 / 6
        casimir_energy *= thermal_correction
    
    logger.debug(f"Calculated Casimir energy of {casimir_energy:.2e} J at d={distance*1e9:.2f} nm")
    
    return casimir_energy

def calculate_casimir_pressure(
    distance: float,
    temperature: float = 300.0,
    permittivity1: float = 1.0,
    permittivity2: float = 1.0
) -> float:
    """
    Calculate the Casimir pressure between two parallel plates.
    
    Args:
        distance: Distance between plates in meters
        temperature: Temperature in Kelvin
        permittivity1: Relative permittivity of first material
        permittivity2: Relative permittivity of second material
        
    Returns:
        Casimir pressure in Pascals
    """
    # Physical constants
    hbar = 1.054571817e-34  # Reduced Planck constant in J·s
    c = 299792458  # Speed of light in m/s
    
    # Ensure distance is positive
    if distance <= 0:
        logger.warning(f"Invalid distance: {distance} m. Using minimum value of 1e-10 m.")
        distance = 1e-10
    
    # Calculate the Casimir pressure at zero temperature
    # P = -π²ħc / (240 d⁴)
    casimir_pressure = -np.pi**2 * hbar * c / (240 * distance**4)
    
    # Material properties correction (simplified)
    r1 = (permittivity1 - 1) / (permittivity1 + 1)
    r2 = (permittivity2 - 1) / (permittivity2 + 1)
    material_factor = r1 * r2
    
    # Apply material correction
    casimir_pressure *= material_factor
    
    # Temperature correction (simplified)
    if temperature > 0:
        kB = 1.380649e-23  # Boltzmann constant in J/K
        thermal_length = hbar * c / (2 * np.pi * kB * temperature)
        
        if distance > thermal_length:
            # High-temperature limit
            casimir_pressure = -kB * temperature * area_constant(permittivity1, permittivity2) / distance**3
        else:
            # Low-temperature correction
            thermal_correction = 1 + (2 * np.pi * kB * temperature * distance / (hbar * c))**4 / 45
            casimir_pressure *= thermal_correction
    
    logger.debug(f"Calculated Casimir pressure of {casimir_pressure:.2e} Pa at d={distance*1e9:.2f} nm")
    
    return casimir_pressure

def area_constant(permittivity1: float, permittivity2: float) -> float:
    """
    Calculate area constant for Casimir calculations with real materials.
    
    Args:
        permittivity1: Relative permittivity of first material
        permittivity2: Relative permittivity of second material
        
    Returns:
        Area constant (dimensionless)
    """
    # Simplified model for real materials
    r1 = (permittivity1 - 1) / (permittivity1 + 1)
    r2 = (permittivity2 - 1) / (permittivity2 + 1)
    
    return np.pi**2 / 4 * r1 * r2

def calculate_casimir_force_sphere_plate(
    radius: float,
    distance: float,
    temperature: float = 300.0,
    permittivity_sphere: float = 1.0,
    permittivity_plate: float = 1.0
) -> float:
    """
    Calculate the Casimir force between a sphere and a plate using the proximity approximation.
    
    Args:
        radius: Radius of the sphere in meters
        distance: Distance between sphere and plate in meters
        temperature: Temperature in Kelvin
        permittivity_sphere: Relative permittivity of sphere material
        permittivity_plate: Relative permittivity of plate material
        
    Returns:
        Casimir force in Newtons
    """
    # In the proximity approximation, F_sphere-plate = 2πR * E_plate-plate
    # where E_plate-plate is the Casimir energy per unit area
    
    # Calculate energy per unit area
    energy_density = calculate_casimir_energy(distance, 1.0, temperature, 
                                            permittivity_sphere, permittivity_plate)
    
    # Multiply by 2πR
    casimir_force = 2 * np.pi * radius * energy_density
    
    logger.debug(f"Calculated sphere-plate Casimir force of {casimir_force:.2e} N at d={distance*1e9:.2f} nm")
    
    return casimir_force

def calculate_casimir_effect_in_lattice(
    lattice_constant: float,
    inclusion_radius: float,
    temperature: float,
    permittivity_host: float,
    permittivity_inclusion: float
) -> Dict[str, Any]:
    """
    Calculate Casimir effects in a lattice with inclusions.
    
    Args:
        lattice_constant: Lattice constant in meters
        inclusion_radius: Radius of inclusion particles in meters
        temperature: Temperature in Kelvin
        permittivity_host: Relative permittivity of host material
        permittivity_inclusion: Relative permittivity of inclusion material
        
    Returns:
        Dictionary with various Casimir effects in the lattice
    """
    # Estimate minimum distance between inclusions
    min_distance = lattice_constant - 2 * inclusion_radius
    
    # Ensure minimum distance is positive
    if min_distance <= 0:
        logger.warning(f"Inclusions overlap with lattice constant {lattice_constant} m and radius {inclusion_radius} m")
        min_distance = 1e-10
    
    # Calculate Casimir force between nearest inclusions
    force_between_inclusions = calculate_casimir_force_sphere_plate(
        inclusion_radius, min_distance/2, temperature, permittivity_inclusion, permittivity_inclusion
    )
    
    # Scale for the proximity of a sphere-sphere configuration (approximate)
    force_between_inclusions *= 0.5
    
    # Calculate Casimir pressure on lattice sites
    pressure = calculate_casimir_pressure(
        min_distance, temperature, permittivity_host, permittivity_inclusion
    )
    
    # Estimate Casimir energy density in the lattice
    # For a cubic lattice, we have 3 directions of separation
    energy_density = 3 * calculate_casimir_energy(
        lattice_constant, lattice_constant**2, temperature, permittivity_host, permittivity_inclusion
    ) / lattice_constant**3
    
    # Compile results
    results = {
        "force_between_inclusions": force_between_inclusions,
        "pressure": pressure,
        "energy_density": energy_density,
        "minimum_distance": min_distance,
        "estimated_attractive_energy": force_between_inclusions * min_distance,
        "lattice_parameters": {
            "lattice_constant": lattice_constant,
            "inclusion_radius": inclusion_radius,
            "temperature": temperature,
            "permittivity_host": permittivity_host,
            "permittivity_inclusion": permittivity_inclusion
        }
    }
    
    logger.info(f"Calculated Casimir effects in lattice with a={lattice_constant*1e10:.2f}Å, T={temperature}K")
    
    return results 