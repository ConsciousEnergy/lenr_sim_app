"""
Electromagnetic Solver component using Finite-Difference Time-Domain (FDTD).

Handles electric and magnetic field calculations, Lorentz forces, etc.
"""

import numpy as np
import logging
from typing import Optional, Tuple, Dict, Any

from .common.grid import SimulationGrid
from .constants import PHYSICAL_CONSTANTS

logger = logging.getLogger(__name__)

class ElectromagneticSolver:
    """Handles electromagnetic field calculations and interactions using FDTD."""

    def __init__(self, config: Dict[str, Any], grid: Optional[SimulationGrid]):
        """Initialize the electromagnetic solver.

        Args:
            config: Dictionary containing simulation configuration.
            grid: Optional SimulationGrid object.
        """
        self.config = config
        self.grid = grid
        self.material_properties = config.get("material_properties", {})

        # Use constants from the central constants module
        self.epsilon_0 = PHYSICAL_CONSTANTS["epsilon_0"] # Permittivity of free space (F/m)
        self.mu_0 = PHYSICAL_CONSTANTS["mu_0"]          # Permeability of free space (H/m)

        # Extract necessary material properties (relative values)
        relative_permittivity = self.material_properties.get("relative_permittivity", 1.0)
        relative_permeability = self.material_properties.get("relative_permeability", 1.0)
        self.permittivity = relative_permittivity * self.epsilon_0
        self.permeability = relative_permeability * self.mu_0

        # Initialize E and B fields, grid spacing
        if self.grid:
            self.grid_shape = self.grid.resolution
            self.dx, self.dy, self.dz = self.grid.cell_size # Use grid.cell_size
            # FDTD Yee grid might require staggered fields, adjust sizes if needed
            self.electric_field = np.zeros(self.grid_shape + (3,), dtype=float) # Ex, Ey, Ez at node centers?
            self.magnetic_field = np.zeros(self.grid_shape + (3,), dtype=float) # Bx, By, Bz at node centers?
            logger.info(f"ElectromagneticSolver initialized with grid. Shape: {self.grid_shape}")
        else:
            self.grid_shape = None
            self.dx = self.dy = self.dz = None
            self.electric_field = np.zeros((1, 3), dtype=float) # Placeholder
            self.magnetic_field = np.zeros((1, 3), dtype=float) # Placeholder
            logger.warning("ElectromagneticSolver initialized without grid.")
        
        # Consider Courant stability condition for FDTD
        # dt <= 1 / (c * sqrt(1/dx^2 + 1/dy^2 + 1/dz^2))
        # Might need to check this in the main loop based on actual dt

        self.boundary_condition_type = self.config.get("em_boundary_condition", "pec") # e.g., 'pec', 'pmc', 'pml'

    # --- Private Helper Methods ---

    def _calculate_curl_E(self) -> np.ndarray:
        """Calculates -∇ × E for the B-field update.
        Uses central differences, assuming fields co-located at grid nodes for simplicity.
        (A full Yee grid implementation would require staggered field storage/indexing).
        Returns: (Nx, Ny, Nz, 3) array representing -curl(E).
        """
        if not self.grid or self.dx is None: return np.zeros_like(self.magnetic_field)

        E = self.electric_field
        neg_curl_E = np.zeros_like(self.magnetic_field, dtype=float)
        nx, ny, nz = self.grid_shape
        dx, dy, dz = self.dx, self.dy, self.dz

        logger.debug(f"Calculating curl E. Input E shape: {E.shape}")

        # Calculate components of -curl(E)
        # Component x: -(dEz/dy - dEy/dz) = dEy/dz - dEz/dy
        if ny > 1 and nz > 1:
            dEy_dz = (np.roll(E[:,:,:,1], -1, axis=2) - np.roll(E[:,:,:,1], 1, axis=2)) / (2 * dz)
            dEz_dy = (np.roll(E[:,:,:,2], -1, axis=1) - np.roll(E[:,:,:,2], 1, axis=1)) / (2 * dy)
            neg_curl_E[:,:,:,0] = dEy_dz - dEz_dy

        # Component y: -(dEx/dz - dEz/dx) = dEz/dx - dEx/dz
        if nx > 1 and nz > 1:
            dEz_dx = (np.roll(E[:,:,:,2], -1, axis=0) - np.roll(E[:,:,:,2], 1, axis=0)) / (2 * dx)
            dEx_dz = (np.roll(E[:,:,:,0], -1, axis=2) - np.roll(E[:,:,:,0], 1, axis=2)) / (2 * dz)
            neg_curl_E[:,:,:,1] = dEz_dx - dEx_dz
            
        # Component z: -(dEy/dx - dEx/dy) = dEx/dy - dEy/dx
        if nx > 1 and ny > 1:
            dEx_dy = (np.roll(E[:,:,:,0], -1, axis=1) - np.roll(E[:,:,:,0], 1, axis=1)) / (2 * dy)
            dEy_dx = (np.roll(E[:,:,:,1], -1, axis=0) - np.roll(E[:,:,:,1], 1, axis=0)) / (2 * dx)
            neg_curl_E[:,:,:,2] = dEx_dy - dEy_dx

        # Apply boundary conditions implicitly? Or handle E before curl? For now, curl is based on E passed in.
        # The B update uses -curl(E).
        logger.debug("Finished calculating -curl(E).")
        return neg_curl_E

    def _calculate_curl_B_over_mu(self) -> np.ndarray:
        """Calculates (∇ × B) / μ for the E-field update.
        Uses central differences, assuming fields co-located at grid nodes.
        Returns: (Nx, Ny, Nz, 3) array representing curl(B)/mu.
        """
        if not self.grid or self.dx is None: return np.zeros_like(self.electric_field)

        B = self.magnetic_field
        curl_B_over_mu = np.zeros_like(self.electric_field, dtype=float)
        nx, ny, nz = self.grid_shape
        dx, dy, dz = self.dx, self.dy, self.dz
        mu = self.permeability

        logger.debug(f"Calculating curl B / mu. Input B shape: {B.shape}")

        # Calculate components of curl(B)
        # Component x: dBz/dy - dBy/dz
        if ny > 1 and nz > 1:
            dBz_dy = (np.roll(B[:,:,:,2], -1, axis=1) - np.roll(B[:,:,:,2], 1, axis=1)) / (2 * dy)
            dBy_dz = (np.roll(B[:,:,:,1], -1, axis=2) - np.roll(B[:,:,:,1], 1, axis=2)) / (2 * dz)
            curl_B_over_mu[:,:,:,0] = (dBz_dy - dBy_dz) / mu

        # Component y: dBx/dz - dBz/dx
        if nx > 1 and nz > 1:
            dBx_dz = (np.roll(B[:,:,:,0], -1, axis=2) - np.roll(B[:,:,:,0], 1, axis=2)) / (2 * dz)
            dBz_dx = (np.roll(B[:,:,:,2], -1, axis=0) - np.roll(B[:,:,:,2], 1, axis=0)) / (2 * dx)
            curl_B_over_mu[:,:,:,1] = (dBx_dz - dBz_dx) / mu

        # Component z: dBy/dx - dBx/dy
        if nx > 1 and ny > 1:
            dBy_dx = (np.roll(B[:,:,:,1], -1, axis=0) - np.roll(B[:,:,:,1], 1, axis=0)) / (2 * dx)
            dBx_dy = (np.roll(B[:,:,:,0], -1, axis=1) - np.roll(B[:,:,:,0], 1, axis=1)) / (2 * dy)
            curl_B_over_mu[:,:,:,2] = (dBx_dy - dBy_dx) / mu
        
        # Apply boundary conditions implicitly? Or handle B before curl?
        logger.debug("Finished calculating curl(B)/mu.")
        return curl_B_over_mu

    def _apply_em_boundary_conditions(self):
        """Applies boundary conditions to the E and B fields.
        Currently implements PEC (Perfect Electric Conductor) by setting tangential E=0.
        Note: Magnetic boundary conditions might need separate handling in the FDTD loop.
        """
        if not self.grid or self.grid_shape is None: return

        nx, ny, nz = self.grid_shape
        E = self.electric_field
        # B = self.magnetic_field # For magnetic BCs if needed later

        if self.boundary_condition_type == "pec": # Perfect Electric Conductor
            # Tangential E = 0 on boundaries.
            # Assumes standard Yee grid where components tangential to a face lie *on* that face.

            # Faces at x=0 and x=nx-1 (YZ planes)
            if nx > 1:
                E[0, :, :, 1] = 0  # Ey on x=0 face
                E[0, :, :, 2] = 0  # Ez on x=0 face
                E[-1, :, :, 1] = 0 # Ey on x=Lx face (index nx-1 or equivalent)
                E[-1, :, :, 2] = 0 # Ez on x=Lx face
            
            # Faces at y=0 and y=ny-1 (XZ planes)
            if ny > 1:
                E[:, 0, :, 0] = 0  # Ex on y=0 face
                E[:, 0, :, 2] = 0  # Ez on y=0 face
                E[:, -1, :, 0] = 0 # Ex on y=Ly face
                E[:, -1, :, 2] = 0 # Ez on y=Ly face

            # Faces at z=0 and z=nz-1 (XY planes)
            if nz > 1:
                E[:, :, 0, 0] = 0  # Ex on z=0 face
                E[:, :, 0, 1] = 0  # Ey on z=0 face
                E[:, :, -1, 0] = 0 # Ex on z=Lz face
                E[:, :, -1, 1] = 0 # Ey on z=Lz face

            # TODO: Add handling for Normal B = 0 if required separately.
            # Example (conceptual, might need adjustment based on staggering):
            # if nx > 1: B[0, :, :, 0] = 0; B[-1, :, :, 0] = 0 
            # if ny > 1: B[:, 0, :, 1] = 0; B[:, -1, :, 1] = 0
            # if nz > 1: B[:, :, 0, 2] = 0; B[:, :, -1, 2] = 0
            
            logger.debug("Applied PEC boundary conditions (Tangential E=0).")
            
        elif self.boundary_condition_type == "pmc": # Perfect Magnetic Conductor
            # Placeholder: Tangential H = 0 (implies Tangential B = 0), Normal E = 0
            logger.warning("PMC boundary conditions not fully implemented.")
            pass
        elif self.boundary_condition_type == "pml": # Perfectly Matched Layer (Absorbing)
            # Placeholder: Requires significant additional implementation
            logger.warning("PML boundary conditions not implemented.")
            pass
        # TODO: Add periodic boundary conditions if needed

    async def update_fields(self, dt: float, charge_density: Optional[np.ndarray], current_density: Optional[np.ndarray]):
        """Update E and B fields over a time step dt using FDTD leapfrog.

        Args:
            dt: Time step duration.
            charge_density: Grid of charge density (C/m^3) [Currently unused].
            current_density: Grid of current density (A/m^2) - vector field (Nx, Ny, Nz, 3).
        """
        if not self.grid or self.dx is None or self.dy is None or self.dz is None:
            logger.warning("Cannot update EM fields without a grid and spacing.")
            return

        # --- CFL Stability Check --- #
        # Speed of light in the medium
        c_medium = 1.0 / np.sqrt(self.permittivity * self.permeability)
        # Inverse square sum of grid spacings
        inv_ds_sq_sum = (1.0 / self.dx**2) + (1.0 / self.dy**2) + (1.0 / self.dz**2)
        # CFL stability limit for dt
        dt_limit = 1.0 / (c_medium * np.sqrt(inv_ds_sq_sum))
        
        if dt > dt_limit:
            logger.warning(
                f"FDTD Stability Warning: Time step dt={dt:.2e} exceeds CFL limit {dt_limit:.2e}. "
                f"Simulation may become unstable. Consider reducing dt or using an implicit solver."
            )
            # Depending on desired behavior, could raise an error or just warn.
            # raise ValueError(f"Time step {dt} exceeds stability limit {dt_limit}")

        # --- FDTD Update (Leapfrog) --- #
        
        # Ensure J has the correct shape, aligned with E-field grid
        J = current_density if current_density is not None else np.zeros_like(self.electric_field)
        if J.shape != self.electric_field.shape:
             logger.error(f"Current density shape {J.shape} does not match E-field shape {self.electric_field.shape}")
             J = np.zeros_like(self.electric_field) # Use zeros as fallback

        # 1. Update B field by half step ( B(n+1/2) = B(n) + (dt/2) * (-∇ × E(n)) )
        neg_curl_E_n = self._calculate_curl_E() # This calculates -curl(E)
        B_half = self.magnetic_field + (dt / 2.0) * neg_curl_E_n 
        # Note: Applying B boundary conditions might ideally happen here or after step 3

        # 2. Update E field by full step ( E(n+1) = E(n) + dt * (1/ε) * (∇ × B(n+1/2)/μ - J(n or n+1/2?)) )
        # Temporarily set B to B_half to calculate curl(B_half)/mu
        # This avoids needing a separate function or passing B_half explicitly
        original_B = self.magnetic_field.copy() # Store original B
        self.magnetic_field = B_half
        curl_B_half_over_mu = self._calculate_curl_B_over_mu()
        self.magnetic_field = original_B # Restore original B
        
        # Assume J is at integer time step n for this simple scheme
        self.electric_field += dt * (1 / self.permittivity) * (curl_B_half_over_mu - J)
        
        # Apply electric boundary conditions (e.g., PEC for tangential E)
        self._apply_em_boundary_conditions() # Modifies self.electric_field in place

        # 3. Update B field by another half step ( B(n+1) = B(n+1/2) + (dt/2) * (-∇ × E(n+1)) )
        neg_curl_E_new = self._calculate_curl_E() # Uses the updated E field
        self.magnetic_field = B_half + (dt / 2.0) * neg_curl_E_new 
        # Apply magnetic boundary conditions to final B here if needed
        # self._apply_magnetic_bcs() # Example call to a potential separate BC method for B

        logger.debug("Electromagnetic fields updated using FDTD step.")

    def get_electric_field(self) -> Optional[np.ndarray]:
        """Return the current electric field grid."""
        return self.electric_field

    def get_magnetic_field(self) -> Optional[np.ndarray]:
        """Return the current magnetic field grid."""
        return self.magnetic_field

    def interpolate_field(self, positions: np.ndarray, field_type: str = 'electric') -> np.ndarray:
        """Interpolates the electric or magnetic field at given particle positions.

        Args:
            positions: (N, 3) array of particle positions in physical coordinates.
            field_type: 'electric' or 'magnetic' to specify which field to interpolate.

        Returns:
            (N, 3) array of interpolated field vectors at each particle position.
        """
        if field_type == 'electric':
            field_grid = self.electric_field
        elif field_type == 'magnetic':
            field_grid = self.magnetic_field
        else:
            raise ValueError("field_type must be 'electric' or 'magnetic'")
        
        if not self.grid or self.dx is None or self.dy is None or self.dz is None:
            logger.warning("Grid/spacing not available for interpolation, returning zeros.")
            return np.zeros_like(positions)

        # Use grid origin and cell_size directly
        origin = np.array(self.grid.get_cell_center(0,0,0)) # Approximate origin from center of first cell? Or add self.grid.origin?
        # Let's assume SimulationGrid needs an origin attribute
        # If grid has xmin, ymin, zmin, use those:
        if hasattr(self.grid, 'xmin'):
            origin = np.array([self.grid.xmin, self.grid.ymin, self.grid.zmin])
        else:
            logger.warning("SimulationGrid does not have xmin/ymin/zmin attributes. Using (0,0,0) as origin for interpolation.")
            origin = np.array([0.0, 0.0, 0.0]) # Fallback if origin is missing

        spacing = np.array(self.grid.cell_size)
        dims = np.array(self.grid_shape)

        num_particles = positions.shape[0]
        if num_particles == 0:
            return np.zeros((0, 3), dtype=float)

        # Check for zero spacing to avoid division by zero
        if np.any(spacing <= 0):
            logger.error(f"Cannot interpolate with non-positive grid spacing: {spacing}")
            return np.zeros_like(positions)
        
        # Normalize positions to grid index coordinates (float)
        norm_pos = (positions - origin) / spacing

        # Get integer indices of the lower-left-front corner cell node
        i = np.floor(norm_pos[:, 0]).astype(int)
        j = np.floor(norm_pos[:, 1]).astype(int)
        k = np.floor(norm_pos[:, 2]).astype(int)

        # Calculate fractional distances within the cell (weights)
        frac_dist = norm_pos - np.floor(norm_pos)
        xd = frac_dist[:, 0, np.newaxis]
        yd = frac_dist[:, 1, np.newaxis]
        zd = frac_dist[:, 2, np.newaxis]

        # Clip indices to prevent out-of-bounds errors.
        # Allow clipping up to the last index (dims - 1).
        i = np.clip(i, 0, dims[0] - 1)
        j = np.clip(j, 0, dims[1] - 1)
        k = np.clip(k, 0, dims[2] - 1)

        # Define indices for the 8 corners, handling potential boundary cases after clipping
        i_plus_1 = np.clip(i + 1, 0, dims[0] - 1)
        j_plus_1 = np.clip(j + 1, 0, dims[1] - 1)
        k_plus_1 = np.clip(k + 1, 0, dims[2] - 1)

        # --- Trilinear Interpolation --- 
        # Fetch values at the 8 corners using potentially clipped indices
        try:
            c000 = field_grid[i,      j,      k     ] 
            c100 = field_grid[i_plus_1, j,      k     ]
            c010 = field_grid[i,      j_plus_1, k     ]
            c001 = field_grid[i,      j,      k_plus_1]
            c110 = field_grid[i_plus_1, j_plus_1, k     ]
            c101 = field_grid[i_plus_1, j,      k_plus_1]
            c011 = field_grid[i,      j_plus_1, k_plus_1]
            c111 = field_grid[i_plus_1, j_plus_1, k_plus_1]
        except IndexError as e:
            # This should ideally not happen with proper clipping, but log just in case
            logger.error(f"IndexError during field interpolation despite clipping: {e}. Grid shape: {field_grid.shape}. Indices: i={i},j={j},k={k}, i+1={i_plus_1}, j+1={j_plus_1}, k+1={k_plus_1}")
            return np.zeros_like(positions)

        # Interpolate along x
        c00 = c000 * (1 - xd) + c100 * xd
        c01 = c001 * (1 - xd) + c101 * xd
        c10 = c010 * (1 - xd) + c110 * xd
        c11 = c011 * (1 - xd) + c111 * xd

        # Interpolate along y
        c0 = c00 * (1 - yd) + c10 * yd
        c1 = c01 * (1 - yd) + c11 * yd

        # Interpolate along z
        interpolated_field = c0 * (1 - zd) + c1 * zd

        # logger.debug(f"Interpolated fields for {num_particles} particles.") # Optional: Can be verbose
        return interpolated_field

    async def calculate_lorentz_force(self, positions: np.ndarray, velocities: np.ndarray, charges: np.ndarray) -> np.ndarray:
        """Calculates Lorentz force F = q*(E + v x B) on particles.

        Args:
            positions: (N, 3) array of particle positions.
            velocities: (N, 3) array of particle velocities.
            charges: (N,) array of particle charges.

        Returns:
            (N, 3) array of forces.
        """
        if not self.grid:
            # Simple calculation using the single E/B field value (placeholder)
            E = self.electric_field[0]
            B = self.magnetic_field[0]
            q = charges[:, np.newaxis] # Reshape for broadcasting
            F = q * E + q * np.cross(velocities, B)
            logger.debug("Calculated Lorentz forces using single field value (no grid).")
            return F
            
        # Interpolate E and B fields at particle positions using the public method
        E_interp = self.interpolate_field(positions, field_type='electric')
        B_interp = self.interpolate_field(positions, field_type='magnetic')

        q = charges[:, np.newaxis] # Ensure charges array is (N, 1) for broadcasting
        
        # Calculate Lorentz force: F = qE + q(v x B)
        forces = q * E_interp + q * np.cross(velocities, B_interp)

        logger.debug(f"Calculated Lorentz forces for {positions.shape[0]} particles using interpolation.")
        return forces 