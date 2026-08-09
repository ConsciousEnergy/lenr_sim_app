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

# Regime-specific reporting ceilings for peak collapse temperature (K).
#
# A ceiling is required: ideal adiabatic compression gives T = T0 * CR^(3(gamma-1)),
# which reaches 3e8 K at CR=1000 for a monatomic gas. That is unphysical because the
# closed form ignores dissociation, ionisation, thermal conduction and the van der
# Waals hard-core radius, all of which absorb energy near minimum radius.
#
# These are upper *bounds* drawn from the hydrodynamic literature, not predictions.
# The previous single_bubble ceiling of 1e4 K was below the top of the measured
# emission band (1.5e4 K), so it truncated experimentally observed temperatures.
# See REGIME_TEMPERATURE_PROVENANCE for the anchoring measurement/simulation of each.
REGIME_MAX_TEMPERATURE = {
    "single_bubble": 2.0e6,   # Moss et al. peak ion temperature, doi:10.1121/1.416948
    "multi_bubble": 2.0e4,    # MBSL ~5e3 K measured; headroom for cloud asymmetry
    "laser_driven": 1.0e5,    # unchanged; consistent with shock-focused hydrodynamics
}

# Provenance for each ceiling so the number is auditable and the UI can state what
# a saturated temperature means. Measured bands are emission temperatures, which are
# lower than peak core ion temperatures; both are recorded to avoid conflating them.
REGIME_TEMPERATURE_PROVENANCE = {
    "single_bubble": {
        "ceiling_k": 2.0e6,
        "measured_emission_band_k": (4.0e3, 1.5e4),
        "measured_citation": (
            "Flannigan & Suslick, Nature 434, 52 (2005), doi:10.1038/nature03361 "
            "(Ar/SO spectroscopic emission temperature, 4000-15000 K)"
        ),
        "simulation_citation": (
            "Moss, Clarke, White & Young, JASA (1996), doi:10.1121/1.416948 "
            "(two-temperature plasma with ion/electron conduction and radiant "
            "transport; peak ion temperature ~2e6 K for a deuterium bubble). "
            "Intermediate value ~1.08e5 K from self-consistent hydrodynamics, "
            "doi:10.1103/physreve.57.4265"
        ),
        "basis": "peak ion temperature upper bound",
    },
    "multi_bubble": {
        "ceiling_k": 2.0e4,
        "measured_emission_band_k": (4.0e3, 5.2e3),
        "measured_citation": (
            "McNamara, Didenko & Suslick, Nature 401, 772 (1999) "
            "(multi-bubble sonoluminescence ~5000 K)"
        ),
        "simulation_citation": "",
        "basis": "measured emission temperature with asymmetry headroom",
    },
    "laser_driven": {
        "ceiling_k": 1.0e5,
        "measured_emission_band_k": (1.0e4, 1.0e5),
        "measured_citation": "",
        "simulation_citation": "doi:10.1103/physreve.57.4265 (shock-focused hydrodynamics)",
        "basis": "shock-focused hydrodynamic simulation",
    },
}


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
    gamma: float = 5/3,  # Adiabatic index (monatomic gas)
    regime: str = "single_bubble"
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

    Note:
        The electric pressure term epsilon_0 E^2/2 is negligible compared
        to GPa-scale collapse pressures in sonofusion regimes.
    """
    # For adiabatic compression:
    # T_final = T_initial * (V_initial/V_final)^(γ-1)
    # Since V ∝ r^3, this becomes:
    # T_final = T_initial * (r_initial/r_final)^(3*(γ-1))
    
    compression_ratio = initial_radius / minimum_radius
    temperature_factor = compression_ratio**(3 * (gamma - 1))
    
    # Calculate final temperature
    final_temperature = initial_temperature * temperature_factor
    
    # Cap temperature at regime-specific maximum
    # Fall back to the single-bubble ceiling for an unknown regime rather than a
    # stale 1e4, which sits below the measured sonoluminescence emission band.
    max_realistic_temp = REGIME_MAX_TEMPERATURE.get(
        regime, REGIME_MAX_TEMPERATURE["single_bubble"]
    )  # K
    final_temperature = min(final_temperature, max_realistic_temp)
    
    logger.debug(f"Collapse temperature: {final_temperature:.2e} K with compression ratio {compression_ratio:.2f}")
    
    return final_temperature


def calculate_collapse_temperature_regime(
    initial_radius: float,
    minimum_radius: float,
    initial_temperature: float = STANDARD_TEMPERATURE,
    gamma: float = 5/3,
    regime: str = "single_bubble"
) -> float:
    """
    Calculate collapse temperature for a specific regime.
    Ceilings come from REGIME_MAX_TEMPERATURE: single_bubble 2e6 K (peak ion
    temperature, Moss et al.), multi_bubble 2e4 K, laser_driven 1e5 K. See
    REGIME_TEMPERATURE_PROVENANCE for the anchoring measurement per regime.
    """
    return calculate_collapse_temperature(
        initial_radius=initial_radius,
        minimum_radius=minimum_radius,
        initial_temperature=initial_temperature,
        gamma=gamma,
        regime=regime
    )


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
    
    # 1. Temperature contribution via proper Gamow tunneling factor.
    # Use the full Sommerfeld-parameter calculation from quantum_tunneling
    # instead of the previous simplified empirical formula.
    # For D-D: Z1=Z2=1, reduced mass ~1 AMU, E_cm = 3/2 kB T
    from app.physics.quantum_tunneling import calculate_gamow_factor

    _dd_cm_energy_eV = 1.5 * KB * collapse_temp / const.e  # CM thermal energy in eV
    _dd_cm_energy_keV = _dd_cm_energy_eV / 1000.0
    if _dd_cm_energy_keV > 1e-6:
        # calculate_gamow_factor expects Z1, Z2, reduced_mass (AMU), energy (keV)
        temp_enhancement = calculate_gamow_factor(
            z1=1, z2=1, reduced_mass=1.0, energy=_dd_cm_energy_keV,
        )
    else:
        temp_enhancement = 0.0
    
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
    
    # Base tunneling probability from Gamow factor at ambient (pre-collapse) temp.
    # This represents bare D-D tunneling without collapse enhancement.
    _ambient_keV = 1.5 * KB * ambient_temperature / const.e / 1000.0
    base_probability = (
        calculate_gamow_factor(z1=1, z2=1, reduced_mass=1.0, energy=max(_ambient_keV, 1e-6))
        if _ambient_keV > 1e-6 else 1e-300
    )
    
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


# ============================================================================
# SURFACE PROXIMITY EFFECTS (Phase 2 Enhancement)
# ============================================================================

def calculate_surface_proximity_factor(
    standoff_ratio: float,
    collapse_phase: bool = True
) -> float:
    """
    Calculate enhancement factor due to proximity to rigid surface.
    
    When a bubble collapses near a rigid boundary, asymmetric flow
    develops leading to:
    - Higher compression ratios
    - Jet formation toward surface
    - Enhanced energy concentration
    
    The standoff ratio γ = h/R where h is distance to surface, R is bubble radius.
    
    Args:
        standoff_ratio: γ = h/R (dimensionless)
        collapse_phase: Whether in collapse (True) or expansion (False)
        
    Returns:
        Enhancement factor (>1 for proximity enhancement)
    """
    gamma = standoff_ratio
    
    if gamma > 3.0:
        # Far from surface - no significant effect
        return 1.0
    
    if not collapse_phase:
        # Expansion phase - slight inhibition near surface
        return 1.0 - 0.1 * max(0, 1 - gamma/3)
    
    # Collapse phase - enhancement from asymmetric dynamics
    # Based on empirical correlations from literature
    if gamma < 0.5:
        # Very close - strong jet formation, high enhancement
        enhancement = 3.0 + 2.0 * (0.5 - gamma)
    elif gamma < 1.0:
        # Close - developing asymmetry
        enhancement = 2.0 + (1.0 - gamma) * 2.0
    elif gamma < 2.0:
        # Moderate - transition zone
        enhancement = 1.0 + (2.0 - gamma) * 1.0
    else:
        # Far - diminishing effect
        enhancement = 1.0 + (3.0 - gamma) * 0.3
    
    return float(enhancement)


def calculate_asymmetric_collapse_pressure(
    symmetric_pressure: float,
    standoff_ratio: float,
    jet_impact: bool = True
) -> float:
    """
    Calculate pressure enhancement from asymmetric collapse near surface.
    
    Near a rigid boundary, bubble collapse becomes asymmetric and
    forms a microjet that impacts the surface, creating localized
    pressure spikes higher than symmetric collapse.
    
    Args:
        symmetric_pressure: Pressure from symmetric collapse (Pa)
        standoff_ratio: γ = h/R
        jet_impact: Whether to include jet impact pressure
        
    Returns:
        Enhanced pressure (Pa)
    """
    # Base asymmetric enhancement
    proximity_factor = calculate_surface_proximity_factor(standoff_ratio)
    
    # Pressure scales approximately with square of enhancement
    # due to increased velocity gradients
    pressure_enhancement = proximity_factor ** 1.5
    
    # Add jet impact pressure contribution
    if jet_impact and standoff_ratio < 2.0:
        # Water hammer pressure from jet impact
        # P_hammer ~ ρ × c × v_jet
        # Typical jet velocity 100-500 m/s, giving factor 2-5 enhancement
        jet_factor = 1.0 + 2.0 * max(0, 1 - standoff_ratio / 2)
        pressure_enhancement *= jet_factor
    
    enhanced_pressure = symmetric_pressure * pressure_enhancement
    
    logger.debug(
        f"Asymmetric collapse pressure: {enhanced_pressure:.2e} Pa "
        f"(γ={standoff_ratio:.2f}, factor={pressure_enhancement:.2f})"
    )
    
    return float(enhanced_pressure)


def calculate_jet_impact_parameters(
    bubble_radius: float,
    standoff_ratio: float,
    collapse_pressure: float,
    water_density: float = WATER_DENSITY,
    sound_speed: float = 1500.0
) -> Dict[str, float]:
    """
    Calculate microjet impact parameters during asymmetric collapse.
    
    When γ < 2, a high-speed liquid jet forms during bubble collapse,
    directed toward the surface. This jet can reach velocities of
    100-500 m/s and creates highly localized pressure on the surface.
    
    Args:
        bubble_radius: Initial bubble radius (m)
        standoff_ratio: γ = h/R
        collapse_pressure: Driving collapse pressure (Pa)
        water_density: Liquid density (kg/m³)
        sound_speed: Speed of sound (m/s)
        
    Returns:
        Dictionary with jet parameters
    """
    if standoff_ratio >= 2.0:
        # No jet formation
        return {
            "jet_forms": False,
            "jet_velocity_m_s": 0.0,
            "jet_diameter_m": 0.0,
            "impact_pressure_Pa": 0.0,
            "impact_area_m2": 0.0,
            "impact_energy_J": 0.0
        }
    
    # Jet velocity estimation
    # v_jet ≈ (2ΔP/ρ)^0.5 × geometry_factor
    v_base = np.sqrt(2 * collapse_pressure / water_density)
    
    # Geometry factor peaks around γ ≈ 0.6-0.8
    if standoff_ratio < 0.5:
        geom_factor = 1.2
    elif standoff_ratio < 1.0:
        geom_factor = 1.5 - 0.6 * standoff_ratio
    else:
        geom_factor = 0.9 - 0.3 * (standoff_ratio - 1)
    
    jet_velocity = v_base * geom_factor
    jet_velocity = min(jet_velocity, 2000.0)  # Cap at 2 km/s
    
    # Jet diameter (approximately R/5 to R/3)
    jet_diameter = bubble_radius * (0.2 + 0.1 * standoff_ratio)
    
    # Water hammer impact pressure
    # P_impact = ρ × c × v for acoustic limit
    # P_impact = 0.5 × ρ × v² for momentum limit
    # Use geometric mean as estimate
    p_acoustic = water_density * sound_speed * jet_velocity
    p_momentum = 0.5 * water_density * jet_velocity**2
    impact_pressure = np.sqrt(p_acoustic * p_momentum)
    
    # Impact area
    impact_area = np.pi * (jet_diameter / 2)**2
    
    # Impact energy (kinetic energy of jet)
    jet_length = bubble_radius * 2  # Approximate
    jet_volume = impact_area * jet_length
    jet_mass = water_density * jet_volume
    impact_energy = 0.5 * jet_mass * jet_velocity**2
    
    return {
        "jet_forms": True,
        "jet_velocity_m_s": float(jet_velocity),
        "jet_diameter_m": float(jet_diameter),
        "jet_diameter_um": float(jet_diameter * 1e6),
        "impact_pressure_Pa": float(impact_pressure),
        "impact_pressure_GPa": float(impact_pressure * 1e-9),
        "impact_area_m2": float(impact_area),
        "impact_energy_J": float(impact_energy),
        "standoff_ratio": float(standoff_ratio)
    }


def simulate_bubble_dynamics_near_surface(
    initial_radius: float,
    surface_distance: float,
    driving_pressure_amplitude: float,
    frequency: float,
    time_steps: int = 1000,
    total_cycles: float = 2.0,
    water_density: float = WATER_DENSITY,
    sound_speed: float = 1500.0,
    surface_tension: float = 0.072,
    ambient_pressure: float = STANDARD_PRESSURE,
    contact_angle: float = 80.0
) -> Dict[str, Any]:
    """
    Simulate bubble dynamics including surface proximity effects.
    
    This extends the basic Rayleigh-Plesset simulation to include:
    - Asymmetric collapse effects
    - Surface-directed jet formation
    - Enhanced pressure concentration
    - Modified added mass for near-surface bubble
    
    Args:
        initial_radius: Initial bubble radius (m)
        surface_distance: Initial distance to surface (m)
        driving_pressure_amplitude: Acoustic pressure amplitude (Pa)
        frequency: Acoustic frequency (Hz)
        time_steps: Number of time steps
        total_cycles: Number of cycles to simulate
        water_density: Liquid density (kg/m³)
        sound_speed: Speed of sound (m/s)
        surface_tension: Surface tension (N/m)
        ambient_pressure: Ambient pressure (Pa)
        contact_angle: Surface contact angle (degrees)
        
    Returns:
        Dictionary with simulation results including surface effects
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
    distance_to_surface = np.zeros(time_steps)
    standoff_ratio = np.zeros(time_steps)
    proximity_factor = np.zeros(time_steps)
    
    # Initial conditions
    radius[0] = initial_radius
    velocity[0] = 0.0
    distance_to_surface[0] = surface_distance
    standoff_ratio[0] = surface_distance / initial_radius
    gas_pressure_initial = ambient_pressure
    temperature[0] = STANDARD_TEMPERATURE
    proximity_factor[0] = calculate_surface_proximity_factor(standoff_ratio[0], False)
    
    # Simulation parameters
    polytropic_exponent = 5/3
    viscosity = 1e-3
    
    # Modified Rayleigh-Plesset with surface effects
    for i in range(1, time_steps):
        t = time_array[i]
        
        # Driving pressure
        p_driving = -driving_pressure_amplitude * np.sin(2 * np.pi * frequency * t)
        p_infinity = ambient_pressure + p_driving
        
        # Gas pressure (adiabatic)
        p_gas = gas_pressure_initial * (initial_radius / radius[i-1])**(3 * polytropic_exponent)
        
        # Surface tension
        p_surface = 2 * surface_tension / radius[i-1]
        
        # Viscous damping
        p_viscous = 4 * viscosity * velocity[i-1] / radius[i-1]
        
        # Net pressure difference
        delta_p = p_gas - p_infinity - p_surface - p_viscous
        
        # Surface proximity correction for added mass
        # Near a wall, added mass coefficient increases
        gamma = standoff_ratio[i-1]
        if gamma < 2.0:
            # Added mass correction (approximate)
            added_mass_factor = 1.0 + 0.5 / max(gamma, 0.1)
        else:
            added_mass_factor = 1.0
        
        # Determine if collapsing
        is_collapsing = velocity[i-1] < 0
        prox_factor = calculate_surface_proximity_factor(gamma, is_collapsing)
        proximity_factor[i] = prox_factor
        
        # Modified Rayleigh-Plesset with surface effects
        # Near surface, asymmetry modifies the effective pressure
        effective_delta_p = delta_p * prox_factor
        
        acceleration[i] = (effective_delta_p / (water_density * added_mass_factor) - 
                          1.5 * velocity[i-1]**2 / radius[i-1])
        
        # Update velocity and radius
        velocity[i] = velocity[i-1] + acceleration[i] * dt
        new_radius = radius[i-1] + velocity[i] * dt
        radius[i] = max(initial_radius / 100, new_radius)
        
        # Update distance to surface (bubble center moves slightly)
        # Simplified: assume center stays fixed, only radius changes
        distance_to_surface[i] = surface_distance - (radius[i] - initial_radius)
        distance_to_surface[i] = max(1e-9, distance_to_surface[i])  # Minimum 1 nm
        standoff_ratio[i] = distance_to_surface[i] / radius[i]
        
        # Calculate pressure and temperature with proximity enhancement
        pressure[i] = p_gas * prox_factor
        temperature[i] = STANDARD_TEMPERATURE * (initial_radius / radius[i])**(3 * (polytropic_exponent - 1))
    
    # Find collapse events and calculate jet parameters
    collapse_events = []
    for i in range(1, time_steps - 1):
        if radius[i] < radius[i-1] and radius[i] < radius[i+1]:
            jet_params = calculate_jet_impact_parameters(
                initial_radius,
                standoff_ratio[i],
                pressure[i],
                water_density,
                sound_speed
            )
            collapse_events.append({
                "time_s": time_array[i],
                "min_radius_m": radius[i],
                "standoff_ratio": standoff_ratio[i],
                "pressure_Pa": pressure[i],
                "temperature_K": temperature[i],
                "proximity_factor": proximity_factor[i],
                "jet_parameters": jet_params
            })
    
    # Results
    results = {
        "time": time_array.tolist(),
        "radius": radius.tolist(),
        "velocity": velocity.tolist(),
        "pressure": pressure.tolist(),
        "temperature": temperature.tolist(),
        "distance_to_surface": distance_to_surface.tolist(),
        "standoff_ratio": standoff_ratio.tolist(),
        "proximity_factor": proximity_factor.tolist(),
        "collapse_events": collapse_events,
        "metadata": {
            "initial_radius_m": initial_radius,
            "initial_surface_distance_m": surface_distance,
            "initial_standoff_ratio": surface_distance / initial_radius,
            "driving_pressure_Pa": driving_pressure_amplitude,
            "frequency_Hz": frequency,
            "ambient_pressure_Pa": ambient_pressure,
            "contact_angle_deg": contact_angle,
            "includes_surface_effects": True
        }
    }
    
    return results


def calculate_surface_enhanced_collapse(
    initial_radius: float = 10e-6,
    minimum_radius: float = 1e-6,
    surface_distance: float = 5e-6,
    ambient_pressure: float = STANDARD_PRESSURE,
    ambient_temperature: float = STANDARD_TEMPERATURE,
    driving_pressure_amplitude: float = 1.5e5,
    frequency: float = 25000.0
) -> Dict[str, Any]:
    """
    Calculate bubble collapse parameters with surface proximity enhancement.
    
    This wraps the standard collapse calculation with surface effects,
    providing enhanced values for temperature, pressure, and energy
    concentration due to asymmetric collapse near a rigid boundary.
    
    Args:
        initial_radius: Initial bubble radius (m)
        minimum_radius: Minimum radius at collapse (m)
        surface_distance: Distance to surface (m)
        ambient_pressure: Ambient pressure (Pa)
        ambient_temperature: Ambient temperature (K)
        driving_pressure_amplitude: Acoustic pressure amplitude (Pa)
        frequency: Acoustic frequency (Hz)
        
    Returns:
        Dictionary with enhanced collapse parameters
    """
    # Calculate standoff ratio
    standoff_ratio = surface_distance / initial_radius
    
    # Get base collapse parameters
    from app.physics.bubble_collapse import calculate_collapse_and_enhancement
    base_results = calculate_collapse_and_enhancement(
        initial_radius=initial_radius,
        minimum_radius=minimum_radius,
        ambient_pressure=ambient_pressure,
        ambient_temperature=ambient_temperature,
        driving_pressure_amplitude=driving_pressure_amplitude,
        frequency=frequency
    )
    
    # Apply surface proximity enhancements
    proximity_factor = calculate_surface_proximity_factor(standoff_ratio, True)
    
    # Enhanced pressure
    enhanced_pressure = calculate_asymmetric_collapse_pressure(
        base_results["collapse_pressure_Pa"],
        standoff_ratio
    )
    
    # Enhanced temperature (scales approximately with pressure ratio)
    pressure_ratio = enhanced_pressure / base_results["collapse_pressure_Pa"]
    enhanced_temperature = base_results["collapse_temperature_K"] * pressure_ratio**0.4
    enhanced_temperature = min(
        enhanced_temperature, REGIME_MAX_TEMPERATURE["single_bubble"]
    )
    
    # Jet impact parameters
    jet_params = calculate_jet_impact_parameters(
        initial_radius,
        standoff_ratio,
        enhanced_pressure
    )
    
    # Enhanced energy density
    enhanced_energy_density = base_results["energy_density_J_m3"] * proximity_factor**2
    
    # Overall enhancement factor increase
    surface_enhancement_boost = proximity_factor * (1 + jet_params.get("jet_forms", 0) * 0.5)
    total_enhancement = base_results["enhancement_factor"] * surface_enhancement_boost
    total_enhancement = min(total_enhancement, 1e50)  # Cap
    
    # Compile results
    results = {
        **base_results,  # Include all base results
        
        # Surface-enhanced values
        "surface_distance_m": surface_distance,
        "standoff_ratio": standoff_ratio,
        "proximity_factor": proximity_factor,
        
        "enhanced_collapse_pressure_Pa": enhanced_pressure,
        "enhanced_collapse_temperature_K": enhanced_temperature,
        "enhanced_energy_density_J_m3": enhanced_energy_density,
        
        "surface_enhancement_factor": surface_enhancement_boost,
        "total_enhancement_factor": total_enhancement,
        "total_log_enhancement": float(np.log10(total_enhancement)) if total_enhancement > 0 else 0,
        
        "jet_parameters": jet_params,
        
        "metadata": {
            **base_results.get("metadata", {}),
            "includes_surface_effects": True,
            "surface_distance_m": surface_distance,
            "standoff_ratio": standoff_ratio
        }
    }
    
    logger.info(
        f"Surface-enhanced collapse: P={enhanced_pressure:.2e} Pa, "
        f"T={enhanced_temperature:.2e} K, γ={standoff_ratio:.2f}"
    )
    
    return results


# ============================================================================
# ACOUSTIC FORCING AND POSITIONING (Phase 4 Enhancement)
# ============================================================================

def calculate_minnaert_frequency(
    bubble_radius: float,
    ambient_pressure: float = STANDARD_PRESSURE,
    liquid_density: float = WATER_DENSITY,
    polytropic_exponent: float = 1.4
) -> float:
    """
    Calculate the Minnaert (natural) frequency of a bubble.
    
    f_0 = (1/2πR) × sqrt(3γP_0/ρ)
    
    This is the resonant frequency at which bubble oscillations
    are most vigorous.
    
    Args:
        bubble_radius: Bubble radius (m)
        ambient_pressure: Ambient pressure (Pa)
        liquid_density: Liquid density (kg/m³)
        polytropic_exponent: γ for gas in bubble
        
    Returns:
        Natural frequency (Hz)
    """
    if bubble_radius <= 0:
        return float('inf')
    
    f_0 = (1 / (2 * np.pi * bubble_radius)) * \
          np.sqrt(3 * polytropic_exponent * ambient_pressure / liquid_density)
    
    logger.debug(f"Minnaert frequency: {f_0:.0f} Hz for R={bubble_radius*1e6:.1f} μm")
    
    return float(f_0)


def calculate_blake_critical_radius(
    initial_radius: float,
    ambient_pressure: float = STANDARD_PRESSURE,
    surface_tension: float = 0.0728
) -> float:
    """
    Calculate the Blake critical radius for unstable (inertial) bubble growth.

    Quasi-static equilibrium of a gas bubble requires the far-field liquid pressure

        p_L(R) = p_g0 (R_0/R)^3 - 2*sigma/R,     p_g0 = P_0 + 2*sigma/R_0

    where the isothermal gas exponent is used, as is conventional for the
    quasi-static Blake analysis. Equilibrium is lost where p_L(R) is stationary:

        dp_L/dR = -3 p_g0 R_0^3 / R^4 + 2*sigma/R^2 = 0
        =>  R_crit = sqrt( 3 p_g0 R_0^3 / (2*sigma) )

    Beyond R_crit surface tension can no longer restrain the bubble and growth runs
    away, which is the onset of inertial cavitation.

    Args:
        initial_radius: Equilibrium bubble radius in meters
        ambient_pressure: Ambient pressure in Pa
        surface_tension: Liquid surface tension in N/m

    Returns:
        Blake critical radius in meters

    Reference:
        Blake (1949); Brennen, *Cavitation and Bubble Dynamics*, section 2.4
    """
    if initial_radius <= 0 or surface_tension <= 0:
        return float('inf')

    p_gas_0 = ambient_pressure + 2 * surface_tension / initial_radius
    return float(np.sqrt(3 * p_gas_0 * initial_radius ** 3 / (2 * surface_tension)))


def calculate_blake_threshold_pressure(
    initial_radius: float,
    ambient_pressure: float = STANDARD_PRESSURE,
    surface_tension: float = 0.0728
) -> float:
    """
    Calculate the Blake threshold acoustic pressure amplitude.

    Evaluating the quasi-static equilibrium curve at the critical radius (see
    :func:`calculate_blake_critical_radius`) gives the lowest far-field pressure the
    bubble can withstand:

        p_L,min = p_g0 (R_0/R_crit)^3 - 2*sigma/R_crit

    The acoustic amplitude needed to reach it from ambient is

        P_Blake = P_0 - p_L,min

    Below this drive amplitude the bubble oscillates stably; above it, growth is
    inertial and a violent collapse follows.

    Args:
        initial_radius: Equilibrium bubble radius in meters
        ambient_pressure: Ambient pressure in Pa
        surface_tension: Liquid surface tension in N/m

    Returns:
        Threshold acoustic pressure amplitude in Pa

    Reference:
        Blake (1949); Brennen, *Cavitation and Bubble Dynamics*, section 2.4
    """
    r_crit = calculate_blake_critical_radius(
        initial_radius, ambient_pressure, surface_tension
    )
    if not np.isfinite(r_crit):
        return float('inf')

    p_gas_0 = ambient_pressure + 2 * surface_tension / initial_radius
    p_liquid_min = (
        p_gas_0 * (initial_radius / r_crit) ** 3 - 2 * surface_tension / r_crit
    )
    return float(ambient_pressure - p_liquid_min)


def calculate_resonant_radius(
    frequency: float,
    ambient_pressure: float = STANDARD_PRESSURE,
    liquid_density: float = WATER_DENSITY,
    polytropic_exponent: float = 1.4
) -> float:
    """
    Calculate bubble radius that resonates at given frequency.
    
    R_res = (1/2πf) × sqrt(3γP_0/ρ)
    
    Args:
        frequency: Driving frequency (Hz)
        ambient_pressure: Ambient pressure (Pa)
        liquid_density: Liquid density (kg/m³)
        polytropic_exponent: γ for gas in bubble
        
    Returns:
        Resonant radius (m)
    """
    if frequency <= 0:
        return float('inf')
    
    r_res = (1 / (2 * np.pi * frequency)) * \
            np.sqrt(3 * polytropic_exponent * ambient_pressure / liquid_density)
    
    return float(r_res)


def calculate_primary_bjerknes_force(
    bubble_radius: float,
    acoustic_pressure: float,
    frequency: float,
    position_in_wave: float,  # 0 to 1 (0=node, 0.5=antinode)
    ambient_pressure: float = STANDARD_PRESSURE,
    liquid_density: float = WATER_DENSITY,
    sound_speed: float = 1500.0
) -> float:
    """
    Calculate primary Bjerknes force on bubble in acoustic field.
    
    The primary Bjerknes force arises from the interaction between
    the bubble volume oscillation and the pressure gradient in the
    acoustic field.
    
    F = -⟨V(t) × ∇p(t)⟩ (time-averaged)
    
    For standing waves:
    - Bubbles smaller than resonant → pushed to pressure antinodes
    - Bubbles larger than resonant → pushed to pressure nodes
    
    Args:
        bubble_radius: Bubble radius (m)
        acoustic_pressure: Acoustic pressure amplitude (Pa)
        frequency: Acoustic frequency (Hz)
        position_in_wave: Position (0=node, 0.5=antinode, 1=node)
        ambient_pressure: Ambient pressure (Pa)
        liquid_density: Liquid density (kg/m³)
        sound_speed: Speed of sound (m/s)
        
    Returns:
        Primary Bjerknes force (N), positive = toward antinode
    """
    # Resonant radius
    r_res = calculate_resonant_radius(frequency, ambient_pressure, liquid_density)
    
    # Wavelength
    wavelength = sound_speed / frequency
    
    # Bubble volume
    volume = (4/3) * np.pi * bubble_radius**3
    
    # Pressure gradient in standing wave (maximum at quarter wavelength points)
    # ∇p_max = p_a × k where k = 2π/λ
    k = 2 * np.pi / wavelength
    # Gradient varies sinusoidally with position
    gradient_factor = np.sin(2 * np.pi * position_in_wave)  # Max at 0.25, 0.75
    pressure_gradient = acoustic_pressure * k * gradient_factor
    
    # Direction factor based on bubble size relative to resonance
    if bubble_radius < r_res:
        # Below resonance: phase with pressure → toward antinode
        direction = 1.0
    else:
        # Above resonance: out of phase → toward node
        direction = -1.0
    
    # Force magnitude (simplified - full calculation requires complex analysis)
    # F ≈ V × ∇p × (phase factor)
    # Include compressibility correction
    compressibility = bubble_radius / r_res
    phase_factor = np.abs(np.sin(np.pi * compressibility / 2))
    
    f_bjerknes = volume * pressure_gradient * direction * phase_factor
    
    logger.debug(
        f"Primary Bjerknes force: {f_bjerknes:.2e} N, "
        f"R/R_res={bubble_radius/r_res:.2f}, direction={direction}"
    )
    
    return float(f_bjerknes)


def calculate_secondary_bjerknes_force(
    radius_1: float,
    radius_2: float,
    separation: float,
    acoustic_pressure: float,
    frequency: float,
    liquid_density: float = WATER_DENSITY,
    ambient_pressure: float = STANDARD_PRESSURE
) -> float:
    """
    Calculate secondary Bjerknes force between two bubbles.
    
    This force arises from the mutual interaction of oscillating bubbles.
    - Bubbles oscillating in phase → attract
    - Bubbles oscillating out of phase → repel
    
    F_12 ≈ -(4πρ ω² R₁³ R₂³ ε₁ ε₂ cos(φ)) / (3 d²)
    
    where ε is amplitude ratio and φ is phase difference.
    
    Args:
        radius_1: First bubble radius (m)
        radius_2: Second bubble radius (m)  
        separation: Distance between bubble centers (m)
        acoustic_pressure: Acoustic pressure amplitude (Pa)
        frequency: Acoustic frequency (Hz)
        liquid_density: Liquid density (kg/m³)
        ambient_pressure: Ambient pressure (Pa)
        
    Returns:
        Secondary Bjerknes force (N), negative = attraction
    """
    if separation <= 0:
        return 0.0
    
    omega = 2 * np.pi * frequency
    r_res = calculate_resonant_radius(frequency, ambient_pressure, liquid_density)
    
    # Amplitude ratios (simplified)
    epsilon_1 = acoustic_pressure / (3 * ambient_pressure) * (r_res / radius_1)**2
    epsilon_2 = acoustic_pressure / (3 * ambient_pressure) * (r_res / radius_2)**2
    
    # Clamp amplitude ratios
    epsilon_1 = min(epsilon_1, 0.5)
    epsilon_2 = min(epsilon_2, 0.5)
    
    # Phase difference (simplified - both either above or below resonance)
    both_below = radius_1 < r_res and radius_2 < r_res
    both_above = radius_1 > r_res and radius_2 > r_res
    
    if both_below or both_above:
        cos_phi = 1.0  # In phase → attract
    else:
        cos_phi = -1.0  # Out of phase → repel
    
    # Secondary Bjerknes force
    f_secondary = -(4 * np.pi * liquid_density * omega**2 * 
                   radius_1**3 * radius_2**3 * epsilon_1 * epsilon_2 * cos_phi) / \
                  (3 * separation**2)
    
    return float(f_secondary)


def calculate_acoustic_streaming_velocity(
    acoustic_pressure: float,
    frequency: float,
    characteristic_length: float = 1e-3,
    liquid_density: float = WATER_DENSITY,
    sound_speed: float = 1500.0,
    viscosity: float = 1e-3
) -> float:
    """
    Calculate acoustic streaming velocity near surface.
    
    Acoustic streaming creates steady circulation patterns that can
    transport bubbles and affect nucleation. Near surfaces, Rayleigh
    streaming creates flows along the boundary.
    
    v_streaming ≈ (3/8) × (p_a²/(ρc²)) × (L/δ_v)
    
    where δ_v is the viscous boundary layer thickness.
    
    Args:
        acoustic_pressure: Acoustic pressure amplitude (Pa)
        frequency: Frequency (Hz)
        characteristic_length: Length scale (m)
        liquid_density: Liquid density (kg/m³)
        sound_speed: Speed of sound (m/s)
        viscosity: Dynamic viscosity (Pa·s)
        
    Returns:
        Streaming velocity (m/s)
    """
    # Viscous boundary layer thickness
    omega = 2 * np.pi * frequency
    kinematic_viscosity = viscosity / liquid_density
    delta_v = np.sqrt(2 * kinematic_viscosity / omega)
    
    # Streaming velocity (Rayleigh streaming)
    v_streaming = (3/8) * (acoustic_pressure**2 / (liquid_density * sound_speed**2)) * \
                  (characteristic_length / delta_v)
    
    # Limit to realistic values
    v_streaming = min(v_streaming, 1.0)  # Cap at 1 m/s
    
    return float(v_streaming)


def calculate_standing_wave_positions(
    frequency: float,
    sound_speed: float = 1500.0,
    num_positions: int = 5,
    container_length: float = 0.1  # m
) -> Dict[str, Any]:
    """
    Calculate pressure node and antinode positions in standing wave.
    
    For a standing wave:
    - Pressure antinodes at x = nλ/2
    - Pressure nodes at x = (2n+1)λ/4
    
    Bubble behavior depends on position:
    - Bubbles < resonant size → accumulate at antinodes
    - Bubbles > resonant size → accumulate at nodes
    
    Args:
        frequency: Acoustic frequency (Hz)
        sound_speed: Speed of sound (m/s)
        num_positions: Number of node/antinode pairs to calculate
        container_length: Container length (m)
        
    Returns:
        Dictionary with node and antinode positions
    """
    wavelength = sound_speed / frequency
    
    # Antinode positions (pressure maxima)
    antinodes = [n * wavelength / 2 for n in range(num_positions + 1)]
    antinodes = [x for x in antinodes if x <= container_length]
    
    # Node positions (pressure minima)
    nodes = [(2 * n + 1) * wavelength / 4 for n in range(num_positions)]
    nodes = [x for x in nodes if x <= container_length]
    
    return {
        "wavelength_m": wavelength,
        "frequency_Hz": frequency,
        "pressure_antinodes_m": antinodes,
        "pressure_nodes_m": nodes,
        "bubble_accumulation_small": "antinodes",
        "bubble_accumulation_large": "nodes",
        "resonant_radius_m": calculate_resonant_radius(frequency),
        "container_length_m": container_length
    }


def calculate_acoustic_nucleation_enhancement(
    acoustic_pressure: float,
    frequency: float,
    nucleation_barrier: float,
    temperature: float = 300.0,
    liquid_density: float = WATER_DENSITY
) -> float:
    """
    Calculate enhancement of nucleation rate due to acoustic field.
    
    Acoustic pressure fluctuations transiently reduce the local pressure,
    lowering the nucleation barrier. This is quantified as:
    
    Enhancement ≈ exp((p_a - p_threshold) / (k_B T / V_critical))
    
    Args:
        acoustic_pressure: Acoustic pressure amplitude (Pa)
        frequency: Acoustic frequency (Hz)
        nucleation_barrier: Nucleation energy barrier (J)
        temperature: Temperature (K)
        liquid_density: Liquid density (kg/m³)
        
    Returns:
        Enhancement factor for nucleation rate
    """
    kb_t = KB * temperature
    
    # Critical nucleus volume (estimate)
    # For typical conditions, critical radius ~1 nm
    r_critical = 1e-9  # m
    v_critical = (4/3) * np.pi * r_critical**3
    
    # Pressure threshold for nucleation (from barrier)
    if v_critical > 0:
        p_threshold = nucleation_barrier / v_critical
    else:
        p_threshold = 1e6  # Default 1 MPa
    
    # Enhancement when acoustic pressure exceeds threshold
    if acoustic_pressure > 0:
        # Effective barrier reduction
        barrier_reduction = min(acoustic_pressure * v_critical, nucleation_barrier * 0.5)
        
        if kb_t > 0:
            enhancement = np.exp(barrier_reduction / kb_t)
        else:
            enhancement = 1.0
    else:
        enhancement = 1.0
    
    # Cap enhancement at realistic values
    enhancement = min(enhancement, 1e10)
    
    logger.debug(
        f"Acoustic nucleation enhancement: {enhancement:.2e} for "
        f"p_a={acoustic_pressure/1e5:.1f} bar, f={frequency/1000:.0f} kHz"
    )
    
    return float(enhancement)


def calculate_rectified_diffusion_rate(
    bubble_radius: float,
    acoustic_pressure: float,
    frequency: float,
    gas_concentration: float,
    saturation_concentration: float,
    diffusion_coefficient: float = 2e-9,
    liquid_density: float = WATER_DENSITY,
    surface_tension: float = 0.072
) -> float:
    """
    Calculate bubble growth rate from rectified diffusion.
    
    During acoustic oscillation, the bubble surface area is larger
    during expansion (low internal pressure) than during compression.
    This asymmetry causes net gas influx - rectified diffusion.
    
    dR/dt ≈ D × C_sat × (C/C_sat - 1 + 2σ/(P_0 R)) × amplitude_factor / R
    
    Args:
        bubble_radius: Bubble radius (m)
        acoustic_pressure: Acoustic pressure amplitude (Pa)
        frequency: Frequency (Hz)
        gas_concentration: Dissolved gas concentration (mol/m³)
        saturation_concentration: Saturation concentration (mol/m³)
        diffusion_coefficient: Diffusion coefficient (m²/s)
        liquid_density: Liquid density (kg/m³)
        surface_tension: Surface tension (N/m)
        
    Returns:
        Growth rate dR/dt (m/s)
    """
    if bubble_radius <= 0 or saturation_concentration <= 0:
        return 0.0
    
    # Supersaturation ratio
    supersaturation = gas_concentration / saturation_concentration
    
    # Surface tension pressure
    p_surface = 2 * surface_tension / bubble_radius
    
    # Effective driving force
    driving_force = supersaturation - 1 + p_surface / STANDARD_PRESSURE
    
    # Amplitude factor (related to acoustic pressure ratio)
    amplitude_ratio = acoustic_pressure / STANDARD_PRESSURE
    # Rectified diffusion is enhanced by oscillation amplitude
    amplitude_factor = 1 + 3 * amplitude_ratio**2  # Quadratic in amplitude
    
    # Growth rate
    dr_dt = diffusion_coefficient * saturation_concentration * driving_force * \
            amplitude_factor / bubble_radius
    
    return float(dr_dt)