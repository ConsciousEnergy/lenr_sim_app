"""
Visualization Utilities Module

This module provides utility functions for extracting regions, computing derived quantities,
and other visualization-related operations.
"""

import numpy as np
from typing import Dict, Any, List, Tuple, Optional, Callable

from .visualization_hooks import default_hooks


# Region Extractors
# -----------------

def extract_slice(data: np.ndarray, params: Tuple) -> np.ndarray:
    """
    Extract a slice from data along a specified axis.
    
    Args:
        data: The full domain data
        params: Tuple containing (axis, index)
            - axis: Axis along which to take the slice (0, 1, or 2)
            - index: Index of the slice
            
    Returns:
        A slice of the data
    """
    axis, index = params
    
    if axis == 0:
        return data[index, :, :]
    elif axis == 1:
        return data[:, index, :]
    elif axis == 2:
        return data[:, :, index]
    else:
        raise ValueError(f"Invalid axis: {axis}, must be 0, 1, or 2")


def extract_point(data: np.ndarray, params: Tuple) -> np.ndarray:
    """
    Extract the value at a specific point.
    
    Args:
        data: The full domain data
        params: Tuple containing point coordinates (x, y, z)
            
    Returns:
        Value at the specified point
    """
    x, y, z = params
    return np.array([data[x, y, z]])


def extract_line(data: np.ndarray, params: Tuple) -> np.ndarray:
    """
    Extract values along a line between two points.
    
    Args:
        data: The full domain data
        params: Tuple containing ((x1, y1, z1), (x2, y2, z2), num_points)
            - (x1, y1, z1): Starting point
            - (x2, y2, z2): Ending point
            - num_points: Number of points to extract
            
    Returns:
        Values along the line
    """
    start_point, end_point, num_points = params
    x1, y1, z1 = start_point
    x2, y2, z2 = end_point
    
    # Create interpolation points
    t = np.linspace(0, 1, num_points)
    x = np.round(x1 + (x2 - x1) * t).astype(int)
    y = np.round(y1 + (y2 - y1) * t).astype(int)
    z = np.round(z1 + (z2 - z1) * t).astype(int)
    
    # Extract values
    return np.array([data[x[i], y[i], z[i]] for i in range(num_points)])


def extract_box(data: np.ndarray, params: Tuple) -> np.ndarray:
    """
    Extract a box-shaped region from the data.
    
    Args:
        data: The full domain data
        params: Tuple containing ((x1, y1, z1), (x2, y2, z2))
            - (x1, y1, z1): Lower corner of the box
            - (x2, y2, z2): Upper corner of the box
            
    Returns:
        Subregion of the data
    """
    min_corner, max_corner = params
    x1, y1, z1 = min_corner
    x2, y2, z2 = max_corner
    
    return data[x1:x2+1, y1:y2+1, z1:z2+1]


def extract_sphere(data: np.ndarray, params: Tuple) -> np.ndarray:
    """
    Extract a spherical region from the data.
    
    Args:
        data: The full domain data
        params: Tuple containing ((x, y, z), radius)
            - (x, y, z): Center of the sphere
            - radius: Radius of the sphere
            
    Returns:
        Values within the sphere
    """
    center, radius = params
    cx, cy, cz = center
    
    # Create a grid of coordinates
    x_range = np.arange(max(0, cx - radius), min(data.shape[0], cx + radius + 1))
    y_range = np.arange(max(0, cy - radius), min(data.shape[1], cy + radius + 1))
    z_range = np.arange(max(0, cz - radius), min(data.shape[2], cz + radius + 1))
    
    xx, yy, zz = np.meshgrid(x_range, y_range, z_range, indexing='ij')
    
    # Calculate squared distance from center
    dist_squared = (xx - cx)**2 + (yy - cy)**2 + (zz - cz)**2
    
    # Create a mask for points inside the sphere
    mask = dist_squared <= radius**2
    
    # Extract values inside the sphere
    return data[x_range[:, None, None], y_range[None, :, None], z_range[None, None, :]][mask]


# Derived Quantities
# -----------------

def compute_temperature_gradient(variables: Dict[str, np.ndarray]) -> np.ndarray:
    """
    Compute the temperature gradient.
    
    Args:
        variables: Dictionary containing temperature data
            
    Returns:
        Temperature gradient magnitude
    """
    if 'temperature' not in variables:
        raise KeyError("Temperature data required to compute gradient")
    
    temperature = variables['temperature']
    
    # Compute gradients using central differences
    grad_x = np.zeros_like(temperature)
    grad_y = np.zeros_like(temperature)
    grad_z = np.zeros_like(temperature)
    
    # X gradient
    grad_x[1:-1, :, :] = (temperature[2:, :, :] - temperature[:-2, :, :]) / 2.0
    grad_x[0, :, :] = temperature[1, :, :] - temperature[0, :, :]
    grad_x[-1, :, :] = temperature[-1, :, :] - temperature[-2, :, :]
    
    # Y gradient
    grad_y[:, 1:-1, :] = (temperature[:, 2:, :] - temperature[:, :-2, :]) / 2.0
    grad_y[:, 0, :] = temperature[:, 1, :] - temperature[:, 0, :]
    grad_y[:, -1, :] = temperature[:, -1, :] - temperature[:, -2, :]
    
    # Z gradient
    grad_z[:, :, 1:-1] = (temperature[:, :, 2:] - temperature[:, :, :-2]) / 2.0
    grad_z[:, :, 0] = temperature[:, :, 1] - temperature[:, :, 0]
    grad_z[:, :, -1] = temperature[:, :, -1] - temperature[:, :, -2]
    
    # Gradient magnitude
    return np.sqrt(grad_x**2 + grad_y**2 + grad_z**2)


def compute_reaction_energy_density(variables: Dict[str, np.ndarray]) -> np.ndarray:
    """
    Compute the energy density from reactions.
    
    Args:
        variables: Dictionary containing reaction_rate and Q_value
            
    Returns:
        Energy density
    """
    if 'reaction_rate' not in variables or 'Q_value' not in variables:
        raise KeyError("Reaction rate and Q value required to compute energy density")
    
    reaction_rate = variables['reaction_rate']
    Q_value = variables['Q_value']
    
    # Simple case - single Q value for all reactions
    if np.isscalar(Q_value):
        return reaction_rate * Q_value
    else:
        # Multiple reaction rates and Q values
        energy_density = np.zeros_like(reaction_rate[0])
        for i, rate in enumerate(reaction_rate):
            energy_density += rate * Q_value[i]
        return energy_density


def compute_heat_flux(variables: Dict[str, np.ndarray]) -> np.ndarray:
    """
    Compute heat flux using Fourier's law.
    
    Args:
        variables: Dictionary containing temperature and thermal_conductivity
            
    Returns:
        Heat flux magnitude
    """
    if 'temperature' not in variables or 'thermal_conductivity' not in variables:
        raise KeyError("Temperature and thermal conductivity required to compute heat flux")
    
    temperature = variables['temperature']
    k = variables['thermal_conductivity']
    
    # Compute temperature gradient
    grad_temp = compute_temperature_gradient({'temperature': temperature})
    
    # Compute heat flux magnitude
    return k * grad_temp


def compute_reaction_potential(variables: Dict[str, np.ndarray]) -> np.ndarray:
    """
    Compute a reaction potential metric based on temperature and species concentration.
    
    Args:
        variables: Dictionary containing temperature and concentration
            
    Returns:
        Reaction potential metric
    """
    if 'temperature' not in variables or 'concentration' not in variables:
        raise KeyError("Temperature and concentration required to compute reaction potential")
    
    temperature = variables['temperature']
    concentration = variables['concentration']
    
    # Simple Arrhenius-like model
    activation_energy = 0.5  # Example value in eV
    kb = 8.617333262e-5  # Boltzmann constant in eV/K
    
    # Compute reaction potential
    return concentration * np.exp(-activation_energy / (kb * temperature))


def compute_energy_distribution_entropy(variables: Dict[str, np.ndarray]) -> float:
    """
    Compute the entropy of the energy distribution.
    
    Args:
        variables: Dictionary containing energy_distribution
            
    Returns:
        Entropy value
    """
    if 'energy_distribution' not in variables:
        raise KeyError("Energy distribution required to compute entropy")
    
    energy_dist = variables['energy_distribution']
    
    # Normalize the distribution
    energy_dist = energy_dist / np.sum(energy_dist)
    
    # Remove zeros to avoid log(0)
    energy_dist = energy_dist[energy_dist > 0]
    
    # Compute entropy
    return -np.sum(energy_dist * np.log(energy_dist))


# Register extractors and derived quantities with default hooks
# ------------------------------------------------------------

def register_default_extractors_and_quantities():
    """Register default region extractors and derived quantities."""
    
    # Register region extractors
    default_hooks.register_region_extractor("slice", extract_slice)
    default_hooks.register_region_extractor("point", extract_point)
    default_hooks.register_region_extractor("line", extract_line)
    default_hooks.register_region_extractor("box", extract_box)
    default_hooks.register_region_extractor("sphere", extract_sphere)
    
    # Register derived quantities
    default_hooks.register_derived_quantity("temperature_gradient", compute_temperature_gradient)
    default_hooks.register_derived_quantity("reaction_energy_density", compute_reaction_energy_density)
    default_hooks.register_derived_quantity("heat_flux", compute_heat_flux)
    default_hooks.register_derived_quantity("reaction_potential", compute_reaction_potential)
    default_hooks.register_derived_quantity("energy_distribution_entropy", compute_energy_distribution_entropy)
    
    # Register some additional statistics for convenience
    default_hooks.register_statistic("median", np.median)
    default_hooks.register_statistic("percentile_25", lambda x: np.percentile(x, 25))
    default_hooks.register_statistic("percentile_75", lambda x: np.percentile(x, 75))
    default_hooks.register_statistic("sum", np.sum)


# Register the default extractors and derived quantities
register_default_extractors_and_quantities() 