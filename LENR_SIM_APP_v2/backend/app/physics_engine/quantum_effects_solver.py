"""
Quantum Effects Solver for LENR Simulation v2

Calculates quantum phenomena including tunneling enhancement, electron screening,
QED effects, and Ultra-Dense Hydrogen physics from arxiv paper 2505.21946.
"""

import numpy as np
import logging
from typing import Optional, Dict, Any

from .common.grid import SimulationGrid
from .unified_enhancement import UnifiedEnhancementCalculator
from .udh_physics import UltraDenseHydrogenModel

logger = logging.getLogger(__name__)


class QuantumEffectsSolver:
    """
    Handles quantum effect calculations relevant to LENR.
    
    Integrates:
    - UnifiedEnhancementCalculator for base tunneling/screening/QED/Casimir effects
    - UltraDenseHydrogenModel for UDH cluster physics (arxiv 2505.21946)
    """

    def __init__(self, config: Dict[str, Any], grid: Optional[SimulationGrid]):
        """Initialize the quantum effects solver with physics calculators."""
        self.config = config
        self.grid = grid
        self.quantum_params = config.get("quantum_model_params", {})
        
        # Initialize physics calculators
        self.enhancement_calc = UnifiedEnhancementCalculator(config)
        self.udh_model = UltraDenseHydrogenModel(config)

        # Feature toggles from config
        self.enable_udh = config.get("enable_udh_physics", True)
        self.enable_vacuum_squeezing = config.get("vacuum_squeezing_enabled", True)
        
        # Default physical parameters
        self.default_pressure = config.get("pressure", 101325.0)
        self.lattice_constant = config.get("lattice_constant", 3.89e-10)

        # Initialize output grids
        if self.grid:
            self.grid_shape = self.grid.resolution
            self.tunneling_enhancement_grid = np.ones(self.grid_shape, dtype=float)
            self.udh_enhancement_grid = np.ones(self.grid_shape, dtype=float)
            logger.info(f"QuantumEffectsSolver initialized with grid. Shape: {self.grid_shape}")
        else:
            self.grid_shape = None
            self.tunneling_enhancement_grid = np.array([1.0], dtype=float)
            self.udh_enhancement_grid = np.array([1.0], dtype=float)
            logger.info("QuantumEffectsSolver initialized without grid (scalar mode).")

    async def calculate_tunneling_enhancement(self, local_state: Dict[str, np.ndarray]):
        """Calculate spatial tunneling enhancement factors combining all quantum effects."""
        if not self.grid:
            await self._calculate_scalar_enhancement(local_state)
            return
        await self._calculate_spatial_enhancement(local_state)


    async def _calculate_scalar_enhancement(self, local_state: Dict[str, np.ndarray]):
        """Calculate non-spatial enhancement using average values."""
        temp = float(np.mean(local_state.get("temperature_grid", np.array([300.0]))))
        density = float(np.mean(local_state.get("density_grid", np.array([1e28]))))
        e_field = float(np.mean(local_state.get("electric_field_grid", np.array([1e6]))))
        
        # Calculate combined enhancement using UnifiedEnhancementCalculator helper methods
        tunneling_f = self.enhancement_calc._calculate_tunneling_contribution(
            temp, density, e_field, self.lattice_constant)
        screening_f = self.enhancement_calc._calculate_screening_contribution(temp, density)
        qed_f = self.enhancement_calc._calculate_qed_contribution(density, temp)
        casimir_f = self.enhancement_calc._calculate_casimir_contribution(self.lattice_constant, temp)
        coherence_f = self.enhancement_calc._calculate_coherence_contribution(temp, self.lattice_constant)
        
        # Combine factors using geometric mean approach
        factors = [f for f in [tunneling_f, screening_f, qed_f, casimir_f, coherence_f] if f > 0]
        if factors:
            log_f = np.log(factors)
            base_enhancement = np.exp(np.sum(log_f) / len(factors)) * len(factors)
        else:
            base_enhancement = 1.0
        
        # Add UDH enhancement if enabled
        udh_enhancement = 1.0
        if self.enable_udh:
            udh_result = self.udh_model.calculate_total_udh_enhancement(
                temperature=temp, pressure=self.default_pressure,
                em_field=e_field, local_density=density
            )
            udh_enhancement = udh_result["total_enhancement"]
        
        total = base_enhancement * udh_enhancement
        self.tunneling_enhancement_grid[0] = max(1.0, min(total, 1e12))
        self.udh_enhancement_grid[0] = udh_enhancement
        logger.debug(f"Scalar enhancement: base={base_enhancement:.2e}, udh={udh_enhancement:.2e}")


    async def _calculate_spatial_enhancement(self, local_state: Dict[str, np.ndarray]):
        """Calculate spatial enhancement across the grid."""
        temp_grid = local_state.get("temperature_grid", np.full(self.grid_shape, 300.0))
        density_grid = local_state.get("density_grid", np.full(self.grid_shape, 1e28))
        e_field_grid = local_state.get("electric_field_grid", np.full(self.grid_shape, 1e6))
        
        for idx in np.ndindex(*self.grid_shape):
            temp = float(temp_grid[idx])
            density = float(density_grid[idx])
            e_field = float(e_field_grid[idx])
            
            # Skip invalid cells
            if temp <= 0 or density <= 0:
                self.tunneling_enhancement_grid[idx] = 1.0
                self.udh_enhancement_grid[idx] = 1.0
                continue
            
            # Calculate combined enhancement using helper methods
            tunneling_f = self.enhancement_calc._calculate_tunneling_contribution(
                temp, density, e_field, self.lattice_constant)
            screening_f = self.enhancement_calc._calculate_screening_contribution(temp, density)
            qed_f = self.enhancement_calc._calculate_qed_contribution(density, temp)
            
            factors = [f for f in [tunneling_f, screening_f, qed_f] if f > 0]
            if factors:
                log_f = np.log(factors)
                base = np.exp(np.sum(log_f) / len(factors)) * len(factors)
            else:
                base = 1.0
            
            udh = 1.0
            if self.enable_udh:
                result = self.udh_model.calculate_total_udh_enhancement(
                    temp, self.default_pressure, e_field, density)
                udh = result["total_enhancement"]
            
            total = max(1.0, min(base * udh, 1e12))
            self.tunneling_enhancement_grid[idx] = total
            self.udh_enhancement_grid[idx] = udh

    def get_tunneling_enhancement_grid(self) -> Optional[np.ndarray]:
        """Return the current tunneling enhancement factor grid."""
        return self.tunneling_enhancement_grid

    def get_udh_enhancement_grid(self) -> Optional[np.ndarray]:
        """Return the UDH-specific enhancement grid."""
        return self.udh_enhancement_grid
