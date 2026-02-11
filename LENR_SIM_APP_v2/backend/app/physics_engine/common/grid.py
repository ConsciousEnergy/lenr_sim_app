"""
Defines the SimulationGrid class for managing spatial domain information.
"""

from typing import Tuple, Optional
import numpy as np
import logging

logger = logging.getLogger(__name__)

class SimulationGrid:
    """
    Represents the spatial grid used for the simulation domain.
    Handles grid resolution, boundaries, and coordinate conversions.
    """

    def __init__(
        self,
        resolution: Tuple[int, int, int],
        boundaries: Tuple[float, float, float, float, float, float]
    ):
        """
        Initializes the simulation grid.

        Args:
            resolution: Tuple of integers (nx, ny, nz) representing grid points along each axis.
            boundaries: Tuple of floats (xmin, xmax, ymin, ymax, zmin, zmax) for physical domain.
        """
        if not (isinstance(resolution, (list, tuple)) and len(resolution) == 3 and all(isinstance(n, int) and n > 0 for n in resolution)):
            raise ValueError("Resolution must be a tuple/list of 3 positive integers (nx, ny, nz)")
        if not (isinstance(boundaries, (list, tuple)) and len(boundaries) == 6 and all(isinstance(b, (float, int)) for b in boundaries)):
            raise ValueError("Boundaries must be a tuple/list of 6 numbers (xmin, xmax, ymin, ymax, zmin, zmax)")
        if not (boundaries[1] > boundaries[0] and boundaries[3] > boundaries[2] and boundaries[5] > boundaries[4]):
            raise ValueError("Boundary maxima must be greater than minima (xmax > xmin, etc.)")
            
        self.resolution = resolution
        self.nx, self.ny, self.nz = resolution
        self.boundaries = boundaries
        self.xmin, self.xmax, self.ymin, self.ymax, self.zmin, self.zmax = boundaries

        self.dx = (self.xmax - self.xmin) / (self.nx - 1) if self.nx > 1 else 0
        self.dy = (self.ymax - self.ymin) / (self.ny - 1) if self.ny > 1 else 0
        self.dz = (self.zmax - self.zmin) / (self.nz - 1) if self.nz > 1 else 0
        self.cell_size = (self.dx, self.dy, self.dz)
        self.cell_volume = self.dx * self.dy * self.dz if all(c > 0 for c in self.cell_size) else 0
        
        logger.info(f"Initialized SimulationGrid: Res=({self.nx}x{self.ny}x{self.nz}), CellSize=({self.dx:.2e}, {self.dy:.2e}, {self.dz:.2e})")

    def get_cell_center(self, i: int, j: int, k: int) -> Optional[Tuple[float, float, float]]:
        """Get the physical coordinates of the center of a grid cell (i, j, k)."""
        if not (0 <= i < self.nx and 0 <= j < self.ny and 0 <= k < self.nz):
            logger.warning(f"Grid index ({i},{j},{k}) out of bounds ({self.nx},{self.ny},{self.nz})")
            return None
            
        x = self.xmin + i * self.dx
        y = self.ymin + j * self.dy
        z = self.zmin + k * self.dz
        return (x, y, z)
        
    def get_grid_index(self, x: float, y: float, z: float) -> Optional[Tuple[int, int, int]]:
        """Get the grid indices (i, j, k) corresponding to physical coordinates (x, y, z)."""
        if not (self.xmin <= x <= self.xmax and self.ymin <= y <= self.ymax and self.zmin <= z <= self.zmax):
             logger.debug(f"Coordinates ({x:.2f},{y:.2f},{z:.2f}) are outside domain boundaries.")
             return None # Coordinates outside domain
        
        # Handle edge case where dx/dy/dz is zero
        i = int(round((x - self.xmin) / self.dx)) if self.dx > 0 else 0
        j = int(round((y - self.ymin) / self.dy)) if self.dy > 0 else 0
        k = int(round((z - self.zmin) / self.dz)) if self.dz > 0 else 0

        # Clamp indices to be within valid range [0, N-1]
        i = max(0, min(i, self.nx - 1))
        j = max(0, min(j, self.ny - 1))
        k = max(0, min(k, self.nz - 1))
        
        return (i, j, k)

    def get_spacing(self) -> Tuple[float, float, float]:
        """Returns (dx, dy, dz) for FDM solvers."""
        return (self.dx, self.dy, self.dz)

    def create_empty_grid_data(self, dtype=np.float64, fill_value=0.0) -> np.ndarray:
        """Creates a NumPy array matching the grid resolution, initialized with a fill value."""
        return np.full(self.resolution, fill_value=fill_value, dtype=dtype)
        
    def shape(self) -> Tuple[int, int, int]:
        """Returns the shape of the grid (nx, ny, nz)."""
        return self.resolution
        
    def __repr__(self) -> str:
        return (
            f"SimulationGrid(resolution={self.resolution}, "
            f"boundaries=[{self.xmin:.2f}:{self.xmax:.2f}, {self.ymin:.2f}:{self.ymax:.2f}, {self.zmin:.2f}:{self.zmax:.2f}])"
        )

# Example Usage (can be removed later or put under if __name__ == '__main__'):
# grid = SimulationGrid(resolution=(10, 10, 10), boundaries=(-5.0, 5.0, -5.0, 5.0, -5.0, 5.0))
# center = grid.get_cell_center(5, 5, 5)
# index = grid.get_grid_index(0.1, -2.3, 4.9)
# data_array = grid.create_empty_grid_data()
# print(grid)
# print(f"Center of cell (5,5,5): {center}")
# print(f"Index for (0.1, -2.3, 4.9): {index}")
# print(f"Data array shape: {data_array.shape}") 