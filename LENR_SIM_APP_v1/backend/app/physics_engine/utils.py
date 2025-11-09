"""
Utility Functions for LENR Simulation
Contains common functions and helper methods used across
the physics engine components.
"""

from typing import Dict, Any, List, Optional, Tuple, Callable
import numpy as np
from scipy import constants, integrate, interpolate
import asyncio
from concurrent.futures import ThreadPoolExecutor
from functools import lru_cache
import logging
from dataclasses import dataclass
from .constants import CONSTANTS, NUMERICAL_PARAMETERS

# Configure logging
logger = logging.getLogger(__name__)

@dataclass
class NumericalGrid:
    """Data class for numerical grid parameters."""
    points: np.ndarray
    spacing: float
    range: Tuple[float, float]

def create_numerical_grid(
    start: float,
    end: float,
    num_points: int,
    log_scale: bool = False
) -> NumericalGrid:
    """
    Create a numerical grid for calculations.
    
    Args:
        start: Start value
        end: End value
        num_points: Number of grid points
        log_scale: Whether to use logarithmic spacing
        
    Returns:
        NumericalGrid object
    """
    if log_scale:
        points = np.logspace(np.log10(start), np.log10(end), num_points)
    else:
        points = np.linspace(start, end, num_points)
    
    spacing = (end - start) / (num_points - 1)
    
    return NumericalGrid(
        points=points,
        spacing=spacing,
        range=(start, end)
    )

@lru_cache(maxsize=1024)
def calculate_gamow_factor(
    z1: int,
    z2: int,
    reduced_mass: float,
    energy: float
) -> float:
    """
    Calculate Gamow factor for nuclear reaction barrier penetration.
    
    Args:
        z1: Atomic number of first nucleus
        z2: Atomic number of second nucleus
        reduced_mass: Reduced mass of the system (kg)
        energy: Center of mass energy (J)
        
    Returns:
        Gamow factor value
    """
    # Calculate Sommerfeld parameter
    eta = (z1 * z2 * CONSTANTS["e"]**2 /
          (4 * np.pi * CONSTANTS["eps0"] * CONSTANTS["hbar"]) *
          np.sqrt(reduced_mass / (2 * energy)))
    
    # Calculate Gamow factor
    return np.exp(-2 * np.pi * eta)

def calculate_maxwell_boltzmann_distribution(
    energy_grid: np.ndarray,
    temperature: float,
    mass: float
) -> np.ndarray:
    """
    Calculate Maxwell-Boltzmann energy distribution.
    
    Args:
        energy_grid: Array of energy values (J)
        temperature: Temperature (K)
        mass: Particle mass (kg)
        
    Returns:
        Array of distribution values
    """
    # Calculate distribution
    distribution = (2 / np.sqrt(np.pi)) * (energy_grid / (CONSTANTS["kb"] * temperature))**(3/2) * \
                  np.exp(-energy_grid / (CONSTANTS["kb"] * temperature))
    
    # Normalize
    return distribution / np.trapz(distribution, energy_grid)

async def integrate_reaction_rate(
    cross_section: Callable[[float], float],
    energy_range: Tuple[float, float],
    temperature: float,
    reduced_mass: float
) -> float:
    """
    Integrate reaction rate over energy distribution.
    
    Args:
        cross_section: Cross-section function
        energy_range: (min_energy, max_energy) in J
        temperature: Temperature in K
        reduced_mass: Reduced mass in kg
        
    Returns:
        Reaction rate in m^3/s
    """
    def _integrate():
        # Create energy grid
        energy_grid = create_numerical_grid(
            energy_range[0],
            energy_range[1],
            NUMERICAL_PARAMETERS["energy_grid_points"],
            log_scale=True
        ).points
        
        # Calculate Maxwell-Boltzmann distribution
        distribution = calculate_maxwell_boltzmann_distribution(
            energy_grid, temperature, reduced_mass
        )
        
        # Calculate velocity
        velocity = np.sqrt(2 * energy_grid / reduced_mass)
        
        # Calculate integrand
        integrand = cross_section(energy_grid) * velocity * distribution
        
        # Perform integration
        rate = np.trapz(integrand, energy_grid)
        
        return rate
    
    # Run integration in thread pool
    with ThreadPoolExecutor() as executor:
        rate = await asyncio.get_event_loop().run_in_executor(
            executor, _integrate
        )
    
    return rate

def calculate_tunneling_probability(
    barrier_height: float,
    barrier_width: float,
    particle_mass: float,
    particle_energy: float
) -> float:
    """
    Calculate quantum tunneling probability using WKB approximation.
    
    Args:
        barrier_height: Potential barrier height (J)
        barrier_width: Barrier width (m)
        particle_mass: Particle mass (kg)
        particle_energy: Particle energy (J)
        
    Returns:
        Tunneling probability
    """
    if particle_energy >= barrier_height:
        return 1.0
    
    # Calculate wave number in barrier region
    k = np.sqrt(2 * particle_mass * (barrier_height - particle_energy)) / CONSTANTS["hbar"]
    
    # WKB approximation for tunneling probability
    return np.exp(-2 * k * barrier_width)

def calculate_screening_potential(
    atomic_number: int,
    electron_density: float,
    temperature: float
) -> float:
    """
    Calculate electron screening potential.
    
    Args:
        atomic_number: Nuclear charge number
        electron_density: Electron density (m^-3)
        temperature: Temperature (K)
        
    Returns:
        Screening potential (J)
    """
    # Calculate Debye length
    debye_length = np.sqrt(
        CONSTANTS["eps0"] * CONSTANTS["kb"] * temperature /
        (electron_density * CONSTANTS["e"]**2)
    )
    
    # Calculate screening potential
    return -(atomic_number * CONSTANTS["e"]**2 /
            (4 * np.pi * CONSTANTS["eps0"] * debye_length))

def calculate_coherence_length(
    temperature: float,
    particle_mass: float
) -> float:
    """
    Calculate quantum coherence length.
    
    Args:
        temperature: Temperature (K)
        particle_mass: Particle mass (kg)
        
    Returns:
        Coherence length (m)
    """
    # Calculate thermal de Broglie wavelength
    return np.sqrt(2 * np.pi * CONSTANTS["hbar"]**2 /
                  (particle_mass * CONSTANTS["kb"] * temperature))

def calculate_energy_conservation(
    initial_energy: float,
    final_energy: float,
    tolerance: float = NUMERICAL_PARAMETERS["energy_tolerance"]
) -> bool:
    """
    Check energy conservation within tolerance.
    
    Args:
        initial_energy: Initial system energy (J)
        final_energy: Final system energy (J)
        tolerance: Relative tolerance
        
    Returns:
        True if energy is conserved within tolerance
    """
    relative_error = abs(final_energy - initial_energy) / abs(initial_energy)
    return relative_error <= tolerance

def interpolate_cross_section(
    energies: np.ndarray,
    cross_sections: np.ndarray,
    kind: str = 'cubic'
) -> Callable[[float], float]:
    """
    Create interpolation function for cross-section data.
    
    Args:
        energies: Energy values (J)
        cross_sections: Cross-section values (m^2)
        kind: Interpolation type
        
    Returns:
        Interpolation function
    """
    # Create interpolation function
    interp_func = interpolate.interp1d(
        energies,
        cross_sections,
        kind=kind,
        bounds_error=False,
        fill_value=(cross_sections[0], cross_sections[-1])
    )
    
    return interp_func

def calculate_reaction_q_value(
    reactant_masses: List[float],
    product_masses: List[float]
) -> float:
    """
    Calculate Q-value (energy release) for nuclear reaction.
    
    Args:
        reactant_masses: List of reactant masses (kg)
        product_masses: List of product masses (kg)
        
    Returns:
        Q-value in Joules
    """
    # Calculate mass difference
    delta_m = sum(reactant_masses) - sum(product_masses)
    
    # Convert to energy using E = mc^2
    return delta_m * CONSTANTS["c"]**2

def log_calculation_step(
    step_name: str,
    parameters: Dict[str, Any],
    results: Dict[str, Any]
) -> None:
    """
    Log calculation step for debugging and monitoring.
    
    Args:
        step_name: Name of calculation step
        parameters: Input parameters
        results: Calculation results
    """
    logger.debug(
        f"Calculation step: {step_name}\n"
        f"Parameters: {parameters}\n"
        f"Results: {results}"
    ) 