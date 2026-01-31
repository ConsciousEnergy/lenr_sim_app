"""
Simulation Domain Module for LENR_Sim_App

This module defines the spatial domain for advanced LENR simulations,
including grid generation, boundary conditions, and spatial operators.
"""

import numpy as np
import scipy.sparse as sp
from typing import Dict, Tuple, List, Optional, Union, Literal
import logging

from app.utils.logging import setup_logger

# Set up logger
logger = setup_logger("sim_domain", "logs/simulation.log")

# Available boundary condition types
BoundaryType = Literal["periodic", "dirichlet", "neumann"]

class SimulationDomain:
    """
    Class representing the spatial domain for LENR simulations.
    Provides methods for grid generation, spatial discretization, and
    differential operators needed for physics simulations.
    """
    
    def __init__(
        self, 
        dimensions: Tuple[float, float, float], 
        resolution: Tuple[int, int, int],
        boundary_conditions: Optional[Dict[str, BoundaryType]] = None
    ):
        """
        Initialize the simulation domain.
        
        Args:
            dimensions: Physical dimensions of the domain in meters (x, y, z)
            resolution: Number of grid points in each dimension (nx, ny, nz)
            boundary_conditions: Boundary conditions for each dimension and face
                Possible values: 'periodic', 'dirichlet', 'neumann'
                Default is periodic for all boundaries.
        """
        self.dimensions = dimensions
        self.resolution = resolution
        
        # Create default boundary conditions if not provided
        if boundary_conditions is None:
            self.boundary_conditions = {
                'x_min': 'periodic', 'x_max': 'periodic',
                'y_min': 'periodic', 'y_max': 'periodic',
                'z_min': 'periodic', 'z_max': 'periodic'
            }
        else:
            self.boundary_conditions = boundary_conditions
        
        # Calculate grid spacing
        self.dx = dimensions[0] / resolution[0]
        self.dy = dimensions[1] / resolution[1]
        self.dz = dimensions[2] / resolution[2]
        
        # Total number of grid points
        self.total_points = resolution[0] * resolution[1] * resolution[2]
        
        # Create mesh grid
        x = np.linspace(0, dimensions[0], resolution[0])
        y = np.linspace(0, dimensions[1], resolution[1])
        z = np.linspace(0, dimensions[2], resolution[2])
        self.x_grid, self.y_grid, self.z_grid = np.meshgrid(x, y, z, indexing='ij')
        
        # Cache for operators (computed on demand)
        self._laplacian_matrix = None
        self._gradient_matrices = None
        self._divergence_matrices = None
        
        logger.info(f"Created simulation domain: {dimensions} m with {resolution} grid points")
    
    @property
    def extents(self) -> Tuple[float, float, float]:
        """
        Alias for dimensions for backward compatibility.
        
        Returns:
            Physical dimensions of the domain (same as self.dimensions)
        """
        return self.dimensions
    
    def get_coordinates(self, idx: int) -> Tuple[float, float, float]:
        """
        Get the physical coordinates for a given flat index.
        
        Args:
            idx: Flat index in the grid
            
        Returns:
            Tuple of (x, y, z) coordinates
        """
        # Convert flat index to 3D indices
        nx, ny, nz = self.resolution
        i = idx // (ny * nz)
        j = (idx % (ny * nz)) // nz
        k = idx % nz
        
        # Get physical coordinates
        x = i * self.dx
        y = j * self.dy
        z = k * self.dz
        
        return (x, y, z)
    
    def get_index(self, coords: Tuple[float, float, float]) -> int:
        """
        Get the flat index for given physical coordinates.
        
        Args:
            coords: Physical coordinates (x, y, z)
            
        Returns:
            Flat index in the grid
        """
        # Convert physical coordinates to grid indices
        x, y, z = coords
        i = int(x / self.dx)
        j = int(y / self.dy)
        k = int(z / self.dz)
        
        # Ensure indices are within bounds
        i = max(0, min(i, self.resolution[0] - 1))
        j = max(0, min(j, self.resolution[1] - 1))
        k = max(0, min(k, self.resolution[2] - 1))
        
        # Convert to flat index
        nx, ny, nz = self.resolution
        return i * ny * nz + j * nz + k
    
    def create_laplacian_matrix(self) -> sp.csr_matrix:
        """
        Create a sparse matrix representing the Laplacian operator for the domain.
        This is used for diffusion calculations.
        
        Returns:
            Sparse matrix for the Laplacian operator
        """
        if self._laplacian_matrix is not None:
            return self._laplacian_matrix
            
        nx, ny, nz = self.resolution
        n = nx * ny * nz
        
        # Stencil for 3D Laplacian (7-point stencil)
        stencil = np.zeros((3, 3, 3))
        stencil[1, 1, 0] = 1.0 / (self.dz ** 2)  # z-1
        stencil[1, 0, 1] = 1.0 / (self.dy ** 2)  # y-1
        stencil[0, 1, 1] = 1.0 / (self.dx ** 2)  # x-1
        stencil[1, 1, 1] = -2.0 * (1.0 / (self.dx ** 2) + 1.0 / (self.dy ** 2) + 1.0 / (self.dz ** 2))  # center
        stencil[2, 1, 1] = 1.0 / (self.dx ** 2)  # x+1
        stencil[1, 2, 1] = 1.0 / (self.dy ** 2)  # y+1
        stencil[1, 1, 2] = 1.0 / (self.dz ** 2)  # z+1
        
        # Create sparse matrix
        rows = []
        cols = []
        data = []
        
        # Apply stencil to each point in the grid
        for i in range(nx):
            for j in range(ny):
                for k in range(nz):
                    center_idx = i * ny * nz + j * nz + k
                    
                    # Apply each point in the stencil
                    for di in range(-1, 2):
                        for dj in range(-1, 2):
                            for dk in range(-1, 2):
                                if stencil[di+1, dj+1, dk+1] != 0:
                                    ni, nj, nk = i + di, j + dj, k + dk
                                    
                                    # Handle boundary conditions
                                    is_valid = True
                                    
                                    # Check boundaries for each dimension
                                    if ni < 0:
                                        if self.boundary_conditions['x_min'] == 'periodic':
                                            ni = nx - 1
                                        elif self.boundary_conditions['x_min'] == 'dirichlet':
                                            is_valid = False  # Dirichlet boundary = 0
                                        elif self.boundary_conditions['x_min'] == 'neumann':
                                            ni = 0  # Reflect at boundary
                                    elif ni >= nx:
                                        if self.boundary_conditions['x_max'] == 'periodic':
                                            ni = 0
                                        elif self.boundary_conditions['x_max'] == 'dirichlet':
                                            is_valid = False
                                        elif self.boundary_conditions['x_max'] == 'neumann':
                                            ni = nx - 1
                                            
                                    if nj < 0:
                                        if self.boundary_conditions['y_min'] == 'periodic':
                                            nj = ny - 1
                                        elif self.boundary_conditions['y_min'] == 'dirichlet':
                                            is_valid = False
                                        elif self.boundary_conditions['y_min'] == 'neumann':
                                            nj = 0
                                    elif nj >= ny:
                                        if self.boundary_conditions['y_max'] == 'periodic':
                                            nj = 0
                                        elif self.boundary_conditions['y_max'] == 'dirichlet':
                                            is_valid = False
                                        elif self.boundary_conditions['y_max'] == 'neumann':
                                            nj = ny - 1
                                            
                                    if nk < 0:
                                        if self.boundary_conditions['z_min'] == 'periodic':
                                            nk = nz - 1
                                        elif self.boundary_conditions['z_min'] == 'dirichlet':
                                            is_valid = False
                                        elif self.boundary_conditions['z_min'] == 'neumann':
                                            nk = 0
                                    elif nk >= nz:
                                        if self.boundary_conditions['z_max'] == 'periodic':
                                            nk = 0
                                        elif self.boundary_conditions['z_max'] == 'dirichlet':
                                            is_valid = False
                                        elif self.boundary_conditions['z_max'] == 'neumann':
                                            nk = nz - 1
                                    
                                    if is_valid:
                                        neighbor_idx = ni * ny * nz + nj * nz + nk
                                        rows.append(center_idx)
                                        cols.append(neighbor_idx)
                                        data.append(stencil[di+1, dj+1, dk+1])
        
        # Create sparse matrix
        self._laplacian_matrix = sp.csr_matrix((data, (rows, cols)), shape=(n, n))
        return self._laplacian_matrix
    
    def create_gradient_matrices(self) -> Tuple[sp.csr_matrix, sp.csr_matrix, sp.csr_matrix]:
        """
        Create sparse matrices for gradient operators in x, y, z directions.
        These are used for calculating spatial derivatives.
        
        Returns:
            Tuple of gradient matrices (grad_x, grad_y, grad_z)
        """
        if self._gradient_matrices is not None:
            return self._gradient_matrices
            
        nx, ny, nz = self.resolution
        n = nx * ny * nz
        
        # Create sparse matrices for each direction
        rows_x, cols_x, data_x = [], [], []
        rows_y, cols_y, data_y = [], [], []
        rows_z, cols_z, data_z = [], [], []
        
        # Create gradient stencils (central difference)
        for i in range(nx):
            for j in range(ny):
                for k in range(nz):
                    idx = i * ny * nz + j * nz + k
                    
                    # X direction
                    if i == 0:
                        if self.boundary_conditions['x_min'] == 'periodic':
                            ip = (nx - 1) * ny * nz + j * nz + k
                            rows_x.append(idx)
                            cols_x.append(ip)
                            data_x.append(-1.0 / (2 * self.dx))
                            
                            ip = (i + 1) * ny * nz + j * nz + k
                            rows_x.append(idx)
                            cols_x.append(ip)
                            data_x.append(1.0 / (2 * self.dx))
                        else:
                            # Forward difference for boundary
                            ip = (i + 1) * ny * nz + j * nz + k
                            rows_x.append(idx)
                            cols_x.append(idx)
                            data_x.append(-1.0 / self.dx)
                            
                            rows_x.append(idx)
                            cols_x.append(ip)
                            data_x.append(1.0 / self.dx)
                    elif i == nx - 1:
                        if self.boundary_conditions['x_max'] == 'periodic':
                            ip = (i - 1) * ny * nz + j * nz + k
                            rows_x.append(idx)
                            cols_x.append(ip)
                            data_x.append(-1.0 / (2 * self.dx))
                            
                            ip = 0 * ny * nz + j * nz + k
                            rows_x.append(idx)
                            cols_x.append(ip)
                            data_x.append(1.0 / (2 * self.dx))
                        else:
                            # Backward difference for boundary
                            ip = (i - 1) * ny * nz + j * nz + k
                            rows_x.append(idx)
                            cols_x.append(ip)
                            data_x.append(-1.0 / self.dx)
                            
                            rows_x.append(idx)
                            cols_x.append(idx)
                            data_x.append(1.0 / self.dx)
                    else:
                        # Central difference
                        ip = (i - 1) * ny * nz + j * nz + k
                        rows_x.append(idx)
                        cols_x.append(ip)
                        data_x.append(-1.0 / (2 * self.dx))
                        
                        ip = (i + 1) * ny * nz + j * nz + k
                        rows_x.append(idx)
                        cols_x.append(ip)
                        data_x.append(1.0 / (2 * self.dx))
                    
                    # Similar patterns for Y and Z directions (omitted for brevity)
                    # In a full implementation, you would repeat the pattern for Y and Z
                    
                    # Y direction (example)
                    if j > 0 and j < ny - 1:
                        jp = i * ny * nz + (j - 1) * nz + k
                        rows_y.append(idx)
                        cols_y.append(jp)
                        data_y.append(-1.0 / (2 * self.dy))
                        
                        jp = i * ny * nz + (j + 1) * nz + k
                        rows_y.append(idx)
                        cols_y.append(jp)
                        data_y.append(1.0 / (2 * self.dy))
                    
                    # Z direction (example)
                    if k > 0 and k < nz - 1:
                        kp = i * ny * nz + j * nz + (k - 1)
                        rows_z.append(idx)
                        cols_z.append(kp)
                        data_z.append(-1.0 / (2 * self.dz))
                        
                        kp = i * ny * nz + j * nz + (k + 1)
                        rows_z.append(idx)
                        cols_z.append(kp)
                        data_z.append(1.0 / (2 * self.dz))
        
        # Create sparse matrices
        grad_x = sp.csr_matrix((data_x, (rows_x, cols_x)), shape=(n, n))
        grad_y = sp.csr_matrix((data_y, (rows_y, cols_y)), shape=(n, n))
        grad_z = sp.csr_matrix((data_z, (rows_z, cols_z)), shape=(n, n))
        
        self._gradient_matrices = (grad_x, grad_y, grad_z)
        return self._gradient_matrices
    
    def to_dict(self) -> Dict:
        """
        Convert the domain to a dictionary representation
        
        Returns:
            Dictionary with domain properties
        """
        return {
            'dimensions': self.dimensions,
            'resolution': self.resolution,
            'boundary_conditions': self.boundary_conditions,
            'dx': self.dx,
            'dy': self.dy, 
            'dz': self.dz,
            'total_points': self.total_points
        }
    
    @classmethod
    def from_dict(cls, data: Dict) -> 'SimulationDomain':
        """
        Create a domain from a dictionary representation
        
        Args:
            data: Dictionary with domain properties
            
        Returns:
            SimulationDomain instance
        """
        return cls(
            dimensions=data['dimensions'],
            resolution=data['resolution'],
            boundary_conditions=data.get('boundary_conditions')
        ) 