"""
Potential models for LENR_Sim_App

Implements various potential energy functions:
- Harmonic oscillator
- Morse potential
- Coulomb barrier

Used for calculating energy levels and tunneling probabilities.
"""

import numpy as np
from typing import Callable, Literal, Dict, Any, Tuple
from scipy.constants import e, epsilon_0

def harmonic_potential(
    x: np.ndarray,
    r0: float,
    k_spring: float
) -> np.ndarray:
    """
    Harmonic oscillator potential
    
    Args:
        x: Position array in meters
        r0: Equilibrium position in meters
        k_spring: Spring constant in N/m
        
    Returns:
        Potential energy in joules
    """
    return 0.5 * k_spring * (x - r0)**2

def morse_potential(
    x: np.ndarray,
    r0: float,
    k_spring: float,
    De: float = None
) -> np.ndarray:
    """
    Morse potential for anharmonic oscillator
    
    Args:
        x: Position array in meters
        r0: Equilibrium position in meters
        k_spring: Spring constant in N/m (used to calculate alpha if De is provided)
        De: Dissociation energy in joules (if None, calculated from k_spring)
        
    Returns:
        Potential energy in joules
    """
    # Calculate dissociation energy if not provided
    if De is None:
        De = k_spring * r0**2 / 2
    
    # Calculate alpha parameter
    # For small oscillations around r0, the Morse potential approximates harmonic with k_spring
    alpha = np.sqrt(k_spring / (2 * De))
    
    # Morse potential formula
    return De * (1 - np.exp(-alpha * (x - r0)))**2

def coulomb_barrier(
    x: np.ndarray,
    Z1: float,
    Z2: float
) -> np.ndarray:
    """
    Coulomb barrier between two charged nuclei
    
    Args:
        x: Distance array in meters
        Z1: Atomic number of first nucleus
        Z2: Atomic number of second nucleus
        
    Returns:
        Potential energy in joules
    """
    # Coulomb's constant
    k_e = 1 / (4 * np.pi * epsilon_0)
    
    # Calculate potential energy: k_e * (Z1*e) * (Z2*e) / r
    potential = k_e * Z1 * Z2 * e**2 / x
    
    # Handle singularity at x=0
    potential[x < 1e-15] = np.inf
    
    return potential

def combined_potential(
    x: np.ndarray,
    r0: float,
    k_spring: float,
    Z1: float = 1.0,
    Z2: float = 1.0,
    potential_type: Literal["harmonic", "morse"] = "harmonic",
    include_coulomb: bool = True
) -> np.ndarray:
    """
    Combined potential including oscillator and Coulomb terms
    
    Args:
        x: Position array in meters
        r0: Equilibrium position in meters
        k_spring: Spring constant in N/m
        Z1: Atomic number of first nucleus
        Z2: Atomic number of second nucleus
        potential_type: Type of oscillator potential
        include_coulomb: Whether to include Coulomb barrier
        
    Returns:
        Potential energy in joules
    """
    # Calculate oscillator potential
    if potential_type == "harmonic":
        osc_potential = harmonic_potential(x, r0, k_spring)
    elif potential_type == "morse":
        osc_potential = morse_potential(x, r0, k_spring)
    else:
        raise ValueError(f"Unknown potential type: {potential_type}")
    
    # Add Coulomb term if requested
    if include_coulomb:
        coul_potential = coulomb_barrier(x, Z1, Z2)
        return osc_potential + coul_potential
    else:
        return osc_potential

def get_potential_function(
    potential_type: Literal["harmonic", "morse", "coulomb", "combined"],
    params: Dict[str, Any]
) -> Callable[[np.ndarray], np.ndarray]:
    """
    Get a potential function for given type and parameters
    
    Args:
        potential_type: Type of potential function
        params: Parameters for the potential
        
    Returns:
        Callable that takes position array and returns potential energy
    """
    if potential_type == "harmonic":
        return lambda x: harmonic_potential(x, params["r0"], params["k_spring"])
    
    elif potential_type == "morse":
        return lambda x: morse_potential(
            x, 
            params["r0"], 
            params["k_spring"], 
            params.get("De", None)
        )
    
    elif potential_type == "coulomb":
        return lambda x: coulomb_barrier(
            x,
            params.get("Z1", 1.0),
            params.get("Z2", 1.0)
        )
    
    elif potential_type == "combined":
        return lambda x: combined_potential(
            x,
            params["r0"],
            params["k_spring"],
            params.get("Z1", 1.0),
            params.get("Z2", 1.0),
            params.get("oscillator_type", "harmonic"),
            params.get("include_coulomb", True)
        )
    
    else:
        raise ValueError(f"Unknown potential type: {potential_type}")

def find_classical_turning_points(
    energy: float,
    potential_func: Callable[[np.ndarray], np.ndarray],
    x_min: float,
    x_max: float,
    num_points: int = 1000
) -> Tuple[float, float]:
    """
    Find classical turning points for a given energy and potential
    
    Args:
        energy: Energy level in joules
        potential_func: Potential energy function
        x_min: Minimum position to search
        x_max: Maximum position to search
        num_points: Number of points for numerical search
        
    Returns:
        Tuple of (left_turning_point, right_turning_point)
    """
    # Generate position grid
    x = np.linspace(x_min, x_max, num_points)
    
    # Calculate potential
    V = potential_func(x)
    
    # Find indices where V - energy changes sign (crossing points)
    sign_changes = np.where(np.diff(np.signbit(V - energy)))[0]
    
    if len(sign_changes) < 2:
        # Not enough turning points found
        return (None, None)
    
    # Get positions of first two sign changes
    idx1, idx2 = sign_changes[0], sign_changes[-1]
    
    # Linear interpolation to get more precise turning points
    x1 = x[idx1] + (x[idx1 + 1] - x[idx1]) * (energy - V[idx1]) / (V[idx1 + 1] - V[idx1])
    x2 = x[idx2] + (x[idx2 + 1] - x[idx2]) * (energy - V[idx2]) / (V[idx2 + 1] - V[idx2])
    
    return (x1, x2) 