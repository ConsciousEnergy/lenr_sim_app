"""
Cluster visualization module for LENR_Sim_App

Generates 3D visualizations of particle clusters and their electrostatic potential fields.
Exports data in VTK format for visualization in web browsers via Three.js.
"""

import numpy as np
from typing import Dict, List, Any, Optional, Tuple
import json
import os
import time
from scipy.constants import e, epsilon_0

try:
    import pyvista as pv
except ImportError:
    pv = None

from app.utils.logging import setup_logger

# Set up logger
logger = setup_logger("cluster_vtk", "logs/app.log")

def compute_electrostatic_potential(
    positions: List[List[float]],
    charges: List[float],
    grid_points: np.ndarray
) -> np.ndarray:
    """
    Compute electrostatic potential at grid points due to set of charged particles
    
    Args:
        positions: List of [x,y,z] positions in meters
        charges: List of charges in elementary charge units
        grid_points: Array of shape (N, 3) with grid point coordinates
        
    Returns:
        Array of potential values at each grid point
    """
    # Coulomb's constant
    k_e = 1 / (4 * np.pi * epsilon_0)
    
    # Initialize potential array
    potential = np.zeros(len(grid_points))
    
    # Convert charges to coulombs
    charges_coulomb = np.array(charges) * e
    
    # For each charge, compute contribution to potential
    for i, (pos, q) in enumerate(zip(positions, charges_coulomb)):
        pos_array = np.array(pos)
        
        # Calculate distance from each grid point to this charge
        # Using broadcasting to compute distances efficiently
        distances = np.linalg.norm(grid_points - pos_array, axis=1)
        
        # Avoid division by zero by setting a minimum distance
        distances = np.maximum(distances, 1e-15)
        
        # Add contribution to potential
        potential += k_e * q / distances
    
    return potential

def generate_particles_on_sphere(
    num_particles: int,
    radius: float,
    center: List[float] = [0, 0, 0]
) -> List[List[float]]:
    """
    Generate uniformly distributed particles on a sphere
    
    Args:
        num_particles: Number of particles
        radius: Sphere radius in meters
        center: Center coordinates of sphere
        
    Returns:
        List of [x,y,z] particle positions
    """
    positions = []
    
    # For very small numbers, use preset configurations
    if num_particles == 2:
        # Dipole along z-axis
        positions = [
            [center[0], center[1], center[2] - radius],
            [center[0], center[1], center[2] + radius]
        ]
    elif num_particles == 3:
        # Triangle in xy-plane
        angles = np.linspace(0, 2*np.pi, num_particles, endpoint=False)
        for angle in angles:
            x = center[0] + radius * np.cos(angle)
            y = center[1] + radius * np.sin(angle)
            z = center[2]
            positions.append([x, y, z])
    elif num_particles == 4:
        # Tetrahedron vertices
        # Normalize coordinates to ensure they're on a sphere
        coords = [
            [1, 1, 1],
            [1, -1, -1],
            [-1, 1, -1],
            [-1, -1, 1]
        ]
        
        for c in coords:
            norm = np.sqrt(sum(x**2 for x in c))
            normalized = [x * radius / norm for x in c]
            positions.append([
                center[0] + normalized[0],
                center[1] + normalized[1],
                center[2] + normalized[2]
            ])
    else:
        # Use Fibonacci sphere algorithm for arbitrary numbers
        golden_ratio = (1 + np.sqrt(5)) / 2
        
        for i in range(num_particles):
            y = 1 - (i / (num_particles - 1)) * 2 if num_particles > 1 else 0
            radius_at_y = np.sqrt(1 - y**2)
            
            theta = 2 * np.pi * i / golden_ratio
            
            x = np.cos(theta) * radius_at_y
            z = np.sin(theta) * radius_at_y
            
            positions.append([
                center[0] + x * radius,
                center[1] + y * radius,
                center[2] + z * radius
            ])
    
    return positions

def generate_grid(
    size: float,
    resolution: int,
    center: List[float] = [0, 0, 0]
) -> Tuple[np.ndarray, tuple]:
    """
    Generate 3D grid for potential calculation
    
    Args:
        size: Half-size of the cubic grid in meters
        resolution: Number of points along each dimension
        center: Center coordinates of the grid
        
    Returns:
        Tuple of (grid_points, grid_shape)
        grid_points is array of shape (N, 3) with coordinates
        grid_shape is tuple (nx, ny, nz) with grid dimensions
    """
    # Create coordinate arrays
    x = np.linspace(center[0] - size, center[0] + size, resolution)
    y = np.linspace(center[1] - size, center[1] + size, resolution)
    z = np.linspace(center[2] - size, center[2] + size, resolution)
    
    # Create meshgrid
    X, Y, Z = np.meshgrid(x, y, z, indexing='ij')
    
    # Reshape into array of points
    grid_points = np.column_stack((X.flatten(), Y.flatten(), Z.flatten()))
    
    return grid_points, (resolution, resolution, resolution)

def _dummy_vtk_export(
    grid_points: np.ndarray,
    grid_shape: tuple,
    potential: np.ndarray,
    vtk_file_path: str
) -> None:
    """
    Dummy function for when PyVista is not available
    Creates a simple JSON file with grid information
    
    Args:
        grid_points: Array of shape (N, 3) with grid point coordinates
        grid_shape: Tuple (nx, ny, nz) with grid dimensions
        potential: Array of potential values at each grid point
        vtk_file_path: Path where VTK file would be saved
    """
    # Extract a subset of points to make the file manageable
    stride = max(1, len(grid_points) // 1000)
    subset_points = grid_points[::stride]
    subset_potential = potential[::stride]
    
    # Create a JSON structure
    data = {
        "points": subset_points.tolist(),
        "potential": subset_potential.tolist(),
        "grid_shape": grid_shape,
        "note": "PyVista not available - using basic JSON format instead"
    }
    
    # Save to JSON file (same name as VTK but with .json extension)
    json_path = os.path.splitext(vtk_file_path)[0] + ".json"
    with open(json_path, 'w') as f:
        json.dump(data, f)
    
    # Create an empty file for the VTK path to avoid errors
    with open(vtk_file_path, 'w') as f:
        f.write("# PyVista not available - see JSON file\n")
    
    logger.warning(f"PyVista not available. Created simplified JSON at {json_path}")

def save_potential_to_vtk(
    grid_points: np.ndarray,
    grid_shape: tuple,
    potential: np.ndarray,
    vtk_file_path: str
) -> None:
    """
    Save potential field to VTK file
    
    Args:
        grid_points: Array of shape (N, 3) with grid point coordinates
        grid_shape: Tuple (nx, ny, nz) with grid dimensions
        potential: Array of potential values at each grid point
        vtk_file_path: Path where VTK file will be saved
    """
    if pv is None:
        _dummy_vtk_export(grid_points, grid_shape, potential, vtk_file_path)
        return
    
    # Reshape grid points into structured grid format expected by PyVista
    x = grid_points[:, 0].reshape(grid_shape)
    y = grid_points[:, 1].reshape(grid_shape)
    z = grid_points[:, 2].reshape(grid_shape)
    
    # Create structured grid
    grid = pv.StructuredGrid(x, y, z)
    
    # Add potential as scalar field
    grid["potential"] = potential.reshape(grid_shape).flatten(order='F')
    
    # Save to VTK file
    grid.save(vtk_file_path)
    
    logger.info(f"Saved potential field to VTK file: {vtk_file_path}")

def export_particles_and_field_to_json(
    positions: List[List[float]],
    charges: List[float],
    potential_range: List[float],
    json_file_path: str
) -> None:
    """
    Export particle positions, charges, and field range to JSON
    
    Args:
        positions: List of [x,y,z] positions in meters
        charges: List of charges in elementary charge units
        potential_range: [min, max] of potential values
        json_file_path: Path where JSON will be saved
    """
    # Create data structure
    data = {
        "particles": [
            {"position": pos, "charge": q}
            for pos, q in zip(positions, charges)
        ],
        "potential_range": potential_range
    }
    
    # Save to JSON file
    with open(json_file_path, 'w') as f:
        json.dump(data, f)
    
    logger.info(f"Saved particle data to JSON file: {json_file_path}")

def generate_cluster_vtk(
    num_particles: int,
    charge: float,
    cluster_radius: float,
    grid_resolution: int = 50,
    vtk_file_path: str = "static/cluster_fields/cluster.vtk",
    json_file_path: str = "static/cluster_fields/cluster.json"
) -> Dict[str, Any]:
    """
    Generate 3D visualization of particle cluster and electrostatic potential
    
    Args:
        num_particles: Number of particles in cluster
        charge: Charge of each particle in elementary charge units
        cluster_radius: Radius of cluster in meters
        grid_resolution: Resolution of 3D grid for potential calculation
        vtk_file_path: Path where VTK file will be saved
        json_file_path: Path where JSON data will be saved
        
    Returns:
        Dictionary with visualization metadata
    """
    start_time = time.time()
    
    # Ensure output directories exist
    os.makedirs(os.path.dirname(vtk_file_path), exist_ok=True)
    os.makedirs(os.path.dirname(json_file_path), exist_ok=True)
    
    # Generate particle positions
    positions = generate_particles_on_sphere(num_particles, cluster_radius)
    
    # Set charges (same charge for all particles for now)
    charges = [charge] * num_particles
    
    # Generate grid for potential calculation
    # Make grid size 3x the cluster radius to show field extent
    grid_size = 3 * cluster_radius
    grid_points, grid_shape = generate_grid(grid_size, grid_resolution)
    
    # Calculate potential field
    potential = compute_electrostatic_potential(positions, charges, grid_points)
    
    # Get min and max potential values for visualization scaling
    potential_range = [float(np.min(potential)), float(np.max(potential))]
    
    # Save to VTK file
    save_potential_to_vtk(grid_points, grid_shape, potential, vtk_file_path)
    
    # Export particle data to JSON
    export_particles_and_field_to_json(positions, charges, potential_range, json_file_path)
    
    # Total computation time
    computation_time = time.time() - start_time
    
    result = {
        "vtk_file_url": f"/{vtk_file_path}",  # Leading slash will be added by caller
        "json_data_url": f"/{json_file_path}",
        "particle_positions": positions,
        "potential_range": potential_range,
        "metadata": {
            "num_particles": num_particles,
            "charge": charge,
            "cluster_radius": cluster_radius,
            "grid_resolution": grid_resolution,
            "computation_time_ms": computation_time * 1000
        }
    }
    
    logger.info(f"Generated cluster visualization with {num_particles} particles in {computation_time:.2f}s")
    return result 