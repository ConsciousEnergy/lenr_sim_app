"""
Bubble Collapse and Shock-Induced Energy Localization for LENR_Sim_App

This module implements the Bubble Collapse and Shock-Induced Energy Localization calculations
described in the Unified LENR Theory.

It models the extreme conditions created during sonofusion/cavitation processes:
- Energy focusing during bubble collapse
- Shock wave generation and propagation
- Compression-induced heating and ionization
- Localized pressure and temperature spikes
"""

import numpy as np
import scipy.constants as const
from typing import Dict, List, Tuple, Any, Optional, Union
import math
import logging

from app.utils.logging import setup_logger

# Set up logger
logger = setup_logger("bubble_collapse", "logs/physics.log")

# Physical constants
HBAR = const.hbar  # Reduced Planck constant in J·s
KB = const.k  # Boltzmann constant in J/K
AMU = const.u  # Atomic mass unit in kg
EV_TO_J = const.e  # Conversion from eV to Joules
STANDARD_PRESSURE = 101325  # Standard atmospheric pressure in Pa
STANDARD_TEMPERATURE = 298.15  # Standard temperature in K
WATER_DENSITY = 1000  # Water density in kg/m^3 (approximate)


def calculate_rayleigh_collapse_time(
    radius: float,
    ambient_pressure: float = STANDARD_PRESSURE,
    water_density: float = WATER_DENSITY
) -> float:
    """
    Calculate Rayleigh collapse time for a bubble.
    
    Args:
        radius: Initial bubble radius in meters
        ambient_pressure: Ambient pressure in Pa
        water_density: Density of surrounding liquid in kg/m^3
        
    Returns:
        Collapse time in seconds
    """
    # Rayleigh collapse time: 
    # t_R = 0.915 * r_0 * sqrt(ρ/P)
    collapse_time = 0.915 * radius * np.sqrt(water_density / ambient_pressure)
    
    logger.debug(f"Rayleigh collapse time: {collapse_time:.2e} s for bubble of radius {radius:.2e} m")
    
    return collapse_time


def calculate_collapse_temperature(
    initial_radius: float,
    minimum_radius: float,
    initial_temperature: float = STANDARD_TEMPERATURE,
    gamma: float = 5/3  # Adiabatic index (monatomic gas)
) -> float:
    """
    Calculate the temperature at maximum compression during bubble collapse.
    
    Args:
        initial_radius: Initial bubble radius in meters
        minimum_radius: Minimum bubble radius at maximum compression in meters
        initial_temperature: Initial bubble temperature in Kelvin
        gamma: Adiabatic index of gas in bubble
        
    Returns:
        Temperature at maximum compression in Kelvin
    """
    # For adiabatic compression:
    # T_final = T_initial * (V_initial/V_final)^(γ-1)
    # Since V ∝ r^3, this becomes:
    # T_final = T_initial * (r_initial/r_final)^(3*(γ-1))
    
    compression_ratio = initial_radius / minimum_radius
    temperature_factor = compression_ratio**(3 * (gamma - 1))
    
    # Calculate final temperature
    final_temperature = initial_temperature * temperature_factor
    
    # Cap temperature at a reasonable maximum (based on literature)
    max_realistic_temp = 1e6  # K (maximum reasonable temperature)
    final_temperature = min(final_temperature, max_realistic_temp)
    
    logger.debug(f"Collapse temperature: {final_temperature:.2e} K with compression ratio {compression_ratio:.2f}")
    
    return final_temperature


def calculate_collapse_pressure(
    initial_radius: float,
    minimum_radius: float,
    initial_pressure: float = STANDARD_PRESSURE,
    gamma: float = 5/3  # Adiabatic index (monatomic gas)
) -> float:
    """
    Calculate the pressure at maximum compression during bubble collapse.
    
    Args:
        initial_radius: Initial bubble radius in meters
        minimum_radius: Minimum bubble radius at maximum compression in meters
        initial_pressure: Initial bubble pressure in Pa
        gamma: Adiabatic index of gas in bubble
        
    Returns:
        Pressure at maximum compression in Pa
    """
    # For adiabatic compression:
    # P_final = P_initial * (V_initial/V_final)^γ
    # Since V ∝ r^3, this becomes:
    # P_final = P_initial * (r_initial/r_final)^(3*γ)
    
    compression_ratio = initial_radius / minimum_radius
    pressure_factor = compression_ratio**(3 * gamma)
    
    # Calculate final pressure
    final_pressure = initial_pressure * pressure_factor
    
    # Cap pressure at a reasonable maximum (based on literature)
    max_realistic_pressure = 1e10  # Pa (maximum reasonable pressure)
    final_pressure = min(final_pressure, max_realistic_pressure)
    
    logger.debug(f"Collapse pressure: {final_pressure:.2e} Pa with compression ratio {compression_ratio:.2f}")
    
    return final_pressure


def calculate_shock_wave_energy(
    initial_radius: float,
    collapse_pressure: float,
    water_density: float = WATER_DENSITY,
    sound_speed: float = 1500.0  # Speed of sound in water (m/s)
) -> float:
    """
    Calculate the energy released in the shock wave during bubble collapse.
    
    Args:
        initial_radius: Initial bubble radius in meters
        collapse_pressure: Pressure at maximum compression in Pa
        water_density: Density of surrounding liquid in kg/m^3
        sound_speed: Speed of sound in the liquid in m/s
        
    Returns:
        Shock wave energy in Joules
    """
    # Shock wave energy estimate based on the Hickling-Plesset model
    # E ≈ (4π/3) * r_0^3 * P * (ρ/ρ_0)
    # Where ρ/ρ_0 is the density ratio across the shock
    
    # Mach number (approximate)
    mach_number = np.sqrt(collapse_pressure / (water_density * sound_speed**2))
    
    # Density ratio across shock (from Rankine-Hugoniot relations)
    # For strong shocks: ρ/ρ_0 ≈ (γ+1)/(γ-1) where γ is the adiabatic index
    gamma_water = 7.0  # Effective adiabatic index for water (approximate)
    density_ratio = max(1.0, min(10.0, (gamma_water + 1) / (gamma_water - 1) * mach_number / (mach_number + 2)))
    
    # Bubble volume
    bubble_volume = (4/3) * np.pi * initial_radius**3
    
    # Shock wave energy
    shock_energy = bubble_volume * collapse_pressure * density_ratio
    
    logger.debug(f"Shock wave energy: {shock_energy:.2e} J from bubble of radius {initial_radius:.2e} m")
    
    return shock_energy


def calculate_energy_density(
    shock_energy: float,
    dissipation_radius: float
) -> float:
    """
    Calculate the energy density at a specified radius from the shock center.
    
    Args:
        shock_energy: Shock wave energy in Joules
        dissipation_radius: Radius at which the energy density is calculated in meters
        
    Returns:
        Energy density in J/m^3
    """
    # Shock energy spreads over a spherical shell
    # Energy density = Energy / (4π * r^2 * Δr)
    # For simplicity, assume Δr ≈ 0.1*r
    
    dissipation_thickness = 0.1 * dissipation_radius
    shell_volume = 4 * np.pi * dissipation_radius**2 * dissipation_thickness
    
    # Energy density
    energy_density = shock_energy / shell_volume
    
    logger.debug(f"Energy density: {energy_density:.2e} J/m^3 at radius {dissipation_radius:.2e} m")
    
    return energy_density


def calculate_ion_energy(
    temperature: float
) -> float:
    """
    Calculate the average ion energy at a given temperature.
    
    Args:
        temperature: Temperature in Kelvin
        
    Returns:
        Average ion energy in eV
    """
    # E = (3/2) * k_B * T
    energy_J = 1.5 * KB * temperature
    
    # Convert to eV
    energy_eV = energy_J / EV_TO_J
    
    return energy_eV


def calculate_ionization_fraction(
    temperature: float,
    ionization_energy: float = 13.6  # Ionization energy of hydrogen in eV
) -> float:
    """
    Calculate the ionization fraction in plasma at a given temperature.
    
    Args:
        temperature: Temperature in Kelvin
        ionization_energy: Ionization energy in eV
        
    Returns:
        Ionization fraction (0-1)
    """
    # Saha equation (simplified)
    # n_i/n_0 = sqrt(K_saha / n_e)
    
    # Temperature in eV
    kT_eV = KB * temperature / EV_TO_J
    
    # Simplified version of Saha equation for high temperatures
    if kT_eV < ionization_energy / 10:
        # Boltzmann factor for low temperatures
        # Protect against overflow when kT_eV is very small
        exponent = -ionization_energy / max(kT_eV, 1e-10)
        exponent = np.clip(exponent, -700, 0)  # Clip to prevent underflow
        ionization_fraction = np.exp(exponent)
    else:
        # Approach full ionization at high temperatures
        ionization_fraction = 1.0 - np.exp(-kT_eV / ionization_energy)
    
    # Limit to valid range
    ionization_fraction = max(0.0, min(1.0, ionization_fraction))
    
    return ionization_fraction


def calculate_compression_enhancement(
    initial_radius: float,
    driving_pressure_amplitude: float,
    frequency: float,
    ambient_pressure: float = STANDARD_PRESSURE,
    ambient_temperature: float = STANDARD_TEMPERATURE,
    water_density: float = WATER_DENSITY
) -> Dict[str, Any]:
    """
    Calculate the enhancement of nuclear reactions due to bubble compression.
    
    Args:
        initial_radius: Initial bubble radius in meters
        driving_pressure_amplitude: Acoustic driving pressure amplitude in Pa
        frequency: Acoustic driving frequency in Hz
        ambient_pressure: Ambient pressure in Pa
        ambient_temperature: Ambient temperature in Kelvin
        water_density: Density of surrounding liquid in kg/m^3
        
    Returns:
        Dictionary with compression enhancement results
    """
    # Calculate collapse parameters
    
    # Estimate minimum radius (depends on many factors in reality)
    # Using a simplified model: r_min ≈ r_0 / CR
    # where CR is the compression ratio, typically 10-100 for strong collapse
    compression_ratio_estimate = min(100.0, 10.0 * driving_pressure_amplitude / ambient_pressure)
    min_radius = initial_radius / compression_ratio_estimate
    
    # Collapse time
    collapse_time = calculate_rayleigh_collapse_time(initial_radius, ambient_pressure, water_density)
    
    # Collapse conditions
    collapse_temp = calculate_collapse_temperature(initial_radius, min_radius, ambient_temperature)
    collapse_pressure = calculate_collapse_pressure(initial_radius, min_radius, ambient_pressure)
    
    # Energy calculations
    shock_energy = calculate_shock_wave_energy(initial_radius, collapse_pressure, water_density)
    energy_density_center = calculate_energy_density(shock_energy, min_radius)
    
    # Ion properties
    ion_energy_eV = calculate_ion_energy(collapse_temp)
    ionization_fraction = calculate_ionization_fraction(collapse_temp)
    
    # Fusion enhancement calculation
    
    # 1. Temperature contribution
    # Simplified Gamow factor for D-D fusion
    gamow_factor = 0.0 if collapse_temp < 1e4 else 44.0 / np.sqrt(max(collapse_temp / 1e6, 1e-10))
    # Clip gamow_factor to prevent underflow in exp
    gamow_factor = min(gamow_factor, 700)
    temp_enhancement = np.exp(-gamow_factor)
    
    # 2. Density contribution
    # Assuming density increases as (r_0/r_min)^3
    density_factor = (initial_radius / min_radius)**3
    
    # 3. Screening contribution from ionized plasma
    # Simplified model from the Unified LENR Theory
    debye_length = 0.0
    if ionization_fraction > 0.01:
        electron_density = 1e28 * ionization_fraction  # Approximate electron density
        debye_length = np.sqrt(KB * collapse_temp / (4 * np.pi * electron_density * const.e**2))
    
    screening_enhancement = 1.0
    if debye_length > 0:
        screening_factor = min(30.0, const.e**2 / (4 * np.pi * const.epsilon_0 * debye_length * KB * collapse_temp))
        screening_enhancement = np.exp(screening_factor)
    
    # 4. Shock wave contribution
    shock_enhancement = 1.0 + np.log10(max(1.0, energy_density_center / 1e12))
    
    # Combined enhancement
    raw_enhancement = temp_enhancement * density_factor * screening_enhancement * shock_enhancement
    
    # Apply realistic limits
    # Limit to range within paper's predictions (10^20 - 10^30 for extreme cases)
    log_enhancement = min(30.0, max(1.0, np.log10(raw_enhancement) if raw_enhancement > 0 else 0))
    capped_enhancement = 10**log_enhancement
    
    # Base tunneling probability (D-D fusion in free space)
    base_probability = 1e-80
    
    # Enhanced probability
    enhanced_probability = base_probability * capped_enhancement
    
    # Results dictionary
    results = {
        "initial_radius_m": initial_radius,
        "minimum_radius_m": min_radius,
        "compression_ratio": initial_radius / min_radius,
        "collapse_time_s": collapse_time,
        "collapse_temperature_K": collapse_temp,
        "collapse_pressure_Pa": collapse_pressure,
        "shock_energy_J": shock_energy,
        "energy_density_J_m3": energy_density_center,
        "ion_energy_eV": ion_energy_eV,
        "ionization_fraction": ionization_fraction,
        "temperature_enhancement": temp_enhancement,
        "density_factor": density_factor,
        "screening_enhancement": screening_enhancement,
        "shock_enhancement": shock_enhancement,
        "enhancement_factor": capped_enhancement,
        "log_enhancement": log_enhancement,
        "base_probability": base_probability,
        "enhanced_probability": enhanced_probability,
        "metadata": {
            "ambient_pressure_Pa": ambient_pressure,
            "ambient_temperature_K": ambient_temperature,
            "driving_frequency_Hz": frequency,
            "driving_pressure_Pa": driving_pressure_amplitude
        }
    }
    
    return results


def simulate_bubble_dynamics(
    initial_radius: float,
    driving_pressure_amplitude: float,
    frequency: float,
    time_steps: int = 1000,
    total_cycles: float = 2.0,
    water_density: float = WATER_DENSITY,
    sound_speed: float = 1500.0,
    surface_tension: float = 0.072,  # N/m for water-air
    ambient_pressure: float = STANDARD_PRESSURE
) -> Dict[str, Any]:
    """
    Simulate bubble dynamics using a simplified Rayleigh-Plesset model.
    
    Args:
        initial_radius: Initial bubble radius in meters
        driving_pressure_amplitude: Acoustic driving pressure amplitude in Pa
        frequency: Acoustic driving frequency in Hz
        time_steps: Number of time steps for simulation
        total_cycles: Number of acoustic cycles to simulate
        water_density: Density of surrounding liquid in kg/m^3
        sound_speed: Speed of sound in the liquid in m/s
        surface_tension: Surface tension of the liquid in N/m
        ambient_pressure: Ambient pressure in Pa
        
    Returns:
        Dictionary with simulation results
    """
    # Time setup
    period = 1.0 / frequency
    total_time = total_cycles * period
    dt = total_time / time_steps
    time_array = np.linspace(0, total_time, time_steps)
    
    # Initialize arrays
    radius = np.zeros(time_steps)
    velocity = np.zeros(time_steps)
    acceleration = np.zeros(time_steps)
    pressure = np.zeros(time_steps)
    temperature = np.zeros(time_steps)
    
    # Initial conditions
    radius[0] = initial_radius
    velocity[0] = 0.0
    gas_pressure_initial = ambient_pressure  # Simplified
    temperature[0] = STANDARD_TEMPERATURE
    
    # Simulation parameters
    polytropic_exponent = 5/3  # For adiabatic process (monatomic gas)
    viscosity = 1e-3  # Dynamic viscosity of water in Pa·s
    
    # Simple Rayleigh-Plesset simulation
    for i in range(1, time_steps):
        # Current time
        t = time_array[i]
        
        # Driving pressure
        p_driving = -driving_pressure_amplitude * np.sin(2 * np.pi * frequency * t)
        p_infinity = ambient_pressure + p_driving
        
        # Gas pressure inside bubble (adiabatic)
        p_gas = gas_pressure_initial * (initial_radius / radius[i-1])**(3 * polytropic_exponent)
        
        # Surface tension contribution
        p_surface = 2 * surface_tension / radius[i-1]
        
        # Viscous damping
        p_viscous = 4 * viscosity * velocity[i-1] / radius[i-1]
        
        # Net pressure difference
        delta_p = p_gas - p_infinity - p_surface - p_viscous
        
        # Rayleigh-Plesset equation
        acceleration[i] = (delta_p / water_density - 1.5 * velocity[i-1]**2 / radius[i-1] - 
                          4 * viscosity * velocity[i-1] / (water_density * radius[i-1]**2))
        
        # Update velocity and radius
        velocity[i] = velocity[i-1] + acceleration[i] * dt
        radius[i] = max(initial_radius / 100, radius[i-1] + velocity[i] * dt)  # Prevent negative radius
        
        # Calculate instantaneous pressure and temperature
        pressure[i] = p_gas
        temperature[i] = STANDARD_TEMPERATURE * (initial_radius / radius[i])**(3 * (polytropic_exponent - 1))
    
    # Calculate derived quantities
    kinetic_energy = 0.5 * water_density * 4 * np.pi * radius**2 * velocity**2
    
    # Find collapse events
    collapse_indices = []
    collapse_times = []
    min_radii = []
    max_temps = []
    max_pressures = []
    
    for i in range(1, time_steps - 1):
        if radius[i] < radius[i-1] and radius[i] < radius[i+1]:
            collapse_indices.append(i)
            collapse_times.append(time_array[i])
            min_radii.append(radius[i])
            max_temps.append(temperature[i])
            max_pressures.append(pressure[i])
    
    # Results dictionary
    results = {
        "time": time_array.tolist(),
        "radius": radius.tolist(),
        "velocity": velocity.tolist(),
        "acceleration": acceleration.tolist(),
        "pressure": pressure.tolist(),
        "temperature": temperature.tolist(),
        "kinetic_energy": kinetic_energy.tolist(),
        "collapse_times": collapse_times,
        "minimum_radii": min_radii,
        "maximum_temperatures": max_temps,
        "maximum_pressures": max_pressures,
        "metadata": {
            "initial_radius_m": initial_radius,
            "driving_pressure_Pa": driving_pressure_amplitude,
            "frequency_Hz": frequency,
            "ambient_pressure_Pa": ambient_pressure,
            "water_density_kg_m3": water_density,
            "polytropic_exponent": polytropic_exponent
        }
    }
    
    return results 