"""
Unified LENR Solver for LENR Simulation v2
Integrates lattice dynamics, fusion processes, and enhancement effects
into a coherent physics simulation framework.
"""

from typing import Dict, Any, List, Optional, Tuple
import numpy as np
import asyncio
import logging
from datetime import datetime

from .unified_enhancement import UnifiedEnhancementCalculator
from .lattice_dynamics import LatticeSimulator
from .fusion_processor import FusionProcessor, ReactionType
from .constants import get_config
from .thermal_solver import ThermalSolver
from .electromagnetic_solver import ElectromagneticSolver
from .quantum_effects_solver import QuantumEffectsSolver

# Import the grid class
from .common.grid import SimulationGrid 

# Set up logging
logger = logging.getLogger(__name__)

class UnifiedLENRSolver:
    """
    Unified solver that integrates all LENR physics components.
    Coordinates the interaction between lattice dynamics, fusion processes,
    and enhancement effects. Handles spatial domain if configured.
    """
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """
        Initialize the unified LENR solver.
        
        Args:
            config: Configuration dictionary with parameters for all components
        """
        self.base_config = get_config(config) 
        self.config = self.base_config.copy() 
        
        # Grid parameters (will be set properly in initialize_simulation)
        self.grid_resolution: Optional[Tuple[int, int, int]] = None
        self.domain_boundaries: Optional[Tuple[float, float, float, float, float, float]] = None
        self.grid: Optional[SimulationGrid] = None # Grid object
        
        # Initialize components - these will be re-initialized in initialize_simulation
        # Pass None for grid initially
        self.enhancement_calculator = UnifiedEnhancementCalculator(self.config)
        self.lattice_simulator = LatticeSimulator(self.config, grid=None) 
        self.fusion_processor = FusionProcessor(self.config)
        self.thermal_solver: Optional[ThermalSolver] = None
        self.electromagnetic_solver: Optional[ElectromagneticSolver] = None
        self.quantum_effects_solver: Optional[QuantumEffectsSolver] = None
        
        # Simulation state
        self.time = 0.0
        self.step_count = 0
        self.simulation_id = None
        self.start_time = None 
        self.status = "idle" 
        self.results = []
        
        logger.info("Initialized UnifiedLENRSolver instance structure")
    
    async def initialize_simulation(self, parameters: Dict[str, Any]) -> str:
        """
        Initialize or re-initialize a simulation with the given parameters.
        Instantiates the SimulationGrid and passes it to relevant components.
        
        Args:
            parameters: Simulation parameters (matching SimulationParams model)
            
        Returns:
            Simulation ID (UUID string)
        """
        self.simulation_id = parameters.get('id', str(datetime.now().timestamp()))
        self.start_time = datetime.now().isoformat()
        self.time = 0.0
        self.step_count = 0
        self.results = []
        self.status = "initialized"
        self.grid = None # Reset grid
        
        # Reset config to base and update with new parameters
        self.config = self.base_config.copy()
        for key, value in parameters.items():
            if hasattr(self, key):
                 setattr(self, key, value)

        # Store grid parameters directly
        self.grid_resolution = self.config.get('grid_resolution')
        self.domain_boundaries = self.config.get('domain_boundaries')

        logger.info(f"Grid Resolution from config: {self.grid_resolution}")
        logger.info(f"Domain Boundaries from config: {self.domain_boundaries}")

        # --- Initialize the Grid helper class --- 
        if self.grid_resolution and self.domain_boundaries:
            try:
                self.grid = SimulationGrid(self.grid_resolution, self.domain_boundaries)
                logger.info(f"Initialized SimulationGrid: {self.grid}")
            except ValueError as e:
                 logger.error(f"Invalid grid parameters: {e}. Proceeding without spatial grid.")
                 self.grid = None
        else:
            self.grid = None
            logger.warning("Spatial grid parameters not fully provided. Spatial calculations disabled.")

        # --- Re-initialize components with final config and grid --- 
        # Enhancement calculator doesn't store grid, but uses config
        self.enhancement_calculator = UnifiedEnhancementCalculator(self.config)
        # Lattice simulator *does* use the grid instance
        self.lattice_simulator = LatticeSimulator(self.config, grid=self.grid) 
        # Fusion processor uses config only
        self.fusion_processor = FusionProcessor(self.config)
        # Initialize Thermal Solver after grid is ready
        self.thermal_solver = ThermalSolver(self.config, self.grid)
        self.electromagnetic_solver = ElectromagneticSolver(self.config, self.grid)
        self.quantum_effects_solver = QuantumEffectsSolver(self.config, self.grid)
        
        logger.info(f"Simulation {self.simulation_id} initialized/re-initialized. Spatial Grid: {'Enabled' if self.grid else 'Disabled'}.")
        return self.simulation_id
    
    async def run_step(self, dt: float) -> Dict[str, Any]:
        """
        Run a single time step of the unified simulation, performing spatial calculations if grid is enabled.
        
        Args:
            dt: Time step in seconds
            
        Returns:
            Dictionary with step results, including spatial data if available.
        """
        if self.status != "running":
             logger.warning(f"run_step called but simulation status is {self.status}")
        
        self.step_count += 1
        self.time += dt
        
        # --- Core simulation step --- 
        
        # 1. Advance lattice state (updates internal positions/velocities)
        # This returns overall properties, not needed here if using snapshot
        _ = await self.lattice_simulator.update_lattice_state(dt)
        
        # 2. Get snapshot including spatial properties (if grid enabled)
        lattice_snapshot = self.lattice_simulator.get_lattice_snapshot()
        spatial_lattice_state = lattice_snapshot.get("spatial_properties", {})
        lattice_constant = lattice_snapshot.get("lattice_constant", 3.89e-10)
        overall_temperature = lattice_snapshot.get("overall_temperature", 300)
        
        # Initialize results containers
        spatial_enhancement = {}
        spatial_rates = {}
        reaction_events = []
        total_power_output = {"total_power": 0.0}
        avg_enhancement_factor = 1.0 # Default

        # --- ADDED: Calculate Quantum Effects (before Enhancement) --- #
        if self.quantum_effects_solver:
            try:
                # Pass relevant local state data needed for quantum calculations
                # Example: only pass necessary grids
                quantum_input_state = {
                    key: val for key, val in spatial_lattice_state.items() 
                    if key in ["temperature_grid", "density_grid"] # Add others if needed
                }
                # Add fields if they influence quantum effects
                if self.electromagnetic_solver:
                     quantum_input_state["electric_field_grid"] = self.electromagnetic_solver.get_electric_field()
                     quantum_input_state["magnetic_field_grid"] = self.electromagnetic_solver.get_magnetic_field()
                     
                await self.quantum_effects_solver.calculate_tunneling_enhancement(quantum_input_state)
                # Store/retrieve results (e.g., updated enhancement grid)
                tunneling_enhancement_grid = self.quantum_effects_solver.get_tunneling_enhancement_grid()
                # Make this grid available for the main enhancement calculation?
                # This depends on how UnifiedEnhancementCalculator uses these results.
                # Maybe pass it directly?
                spatial_enhancement["quantum_tunneling_enhancement_grid"] = tunneling_enhancement_grid # Example 
                
            except Exception as e:
                 logger.error(f"Error during quantum effects calculation: {e}", exc_info=True)
        # --- END ADDED --- #

        # 3. Perform spatial calculations ONLY if grid is enabled
        if self.grid and spatial_lattice_state.get("temperature_grid") is not None:
            logger.debug(f"Step {self.step_count}: Running spatial calculations.")
            # Calculate spatial enhancement factors
            try:
                 spatial_enhancement = await self.enhancement_calculator.calculate_spatial_enhancement(
                     spatial_lattice_state, 
                     self.grid, 
                     lattice_constant
                 )
                 enhancement_grid = spatial_enhancement.get("total_enhancement_grid")
                 if enhancement_grid is not None:
                      avg_enhancement_factor = np.mean(enhancement_grid[np.isfinite(enhancement_grid)]) # Calculate mean of valid numbers
                 else: 
                      logger.warning("Spatial enhancement calculation did not return total_enhancement_grid.")
                      avg_enhancement_factor = 1.0

            except Exception as e:
                 logger.error(f"Error during spatial enhancement calculation: {e}", exc_info=True)
                 # Use default enhancement if calculation fails
                 enhancement_grid = self.grid.create_empty_grid_data(fill_value=1.0)
                 spatial_enhancement["total_enhancement_grid"] = enhancement_grid 
                 avg_enhancement_factor = 1.0

            # Calculate spatial fusion rates using spatial enhancement
            try:
                 # Pass the spatial_enhancement dict which contains the needed grid(s)
                 spatial_rates = await self.fusion_processor.calculate_spatial_reaction_rates(
                     spatial_lattice_state, 
                     spatial_enhancement,  
                     self.grid
                 )
            except Exception as e:
                 logger.error(f"Error during spatial rate calculation: {e}", exc_info=True)
                 spatial_rates = {} # Empty dict if fails

            # Aggregate reaction events from spatial rates
            try:
                 reaction_events = self._aggregate_reaction_events(spatial_rates, self.grid)
            except Exception as e:
                 logger.error(f"Error aggregating reaction events: {e}", exc_info=True)
                 reaction_events = []
                 
            # Calculate total power from spatial rates
            try:
                 total_power_output = self.fusion_processor.calculate_power_output(
                     spatial_rates, 
                     self.grid
                 )
            except Exception as e:
                 logger.error(f"Error calculating power output from spatial rates: {e}", exc_info=True)
                 total_power_output = {"total_power": 0.0} 

        else:
             # --- Fallback to Non-Spatial Calculation --- 
             logger.debug(f"Step {self.step_count}: Grid not available or lattice snapshot missing spatial data. Using non-spatial calculation.")
             # Use overall properties calculated by lattice simulator
             avg_electron_density = self.config.get('electron_density', 1e28)

             # Average electric field for non-spatial enhancement calculation.
             # Priority: (1) EM solver's current state, (2) lattice snapshot,
             # (3) config value, (4) zero.
             if self.electromagnetic_solver is not None:
                 _E = self.electromagnetic_solver.get_electric_field()
                 avg_electric_field = float(np.mean(np.linalg.norm(_E, axis=-1)))
             else:
                 avg_electric_field = float(
                     lattice_snapshot.get('_original_lattice_state', {}).get(
                         'electric_field',
                         self.config.get('electric_field', 0.0),
                     )
                 )
             
             try:
                 enhancement_result = await self.enhancement_calculator.calculate_total_enhancement(
                     temperature=overall_temperature,
                     electron_density=avg_electron_density,
                     electric_field=avg_electric_field,
                     lattice_constant=lattice_constant
                 )
                 avg_enhancement_factor = enhancement_result.get('total_enhancement', 1.0)
             except Exception as e:
                 logger.error(f"Error during non-spatial enhancement calculation: {e}", exc_info=True)
                 avg_enhancement_factor = 1.0
             
             try:
                 # Calculate overall rates (returns dict like {"DD": {rate_coeff: ..., total_rate: ...}})
                 overall_rates_result = {} # Store full result dict per type
                 overall_rates_value_only = {} # Store only rate value for power calc
                 default_reactions = [ReactionType.DD, ReactionType.DNI, ReactionType.DPD]
                 for r_type in self.config.get("simulated_reactions", default_reactions):
                     rate_data = await self.fusion_processor.calculate_reaction_rate(
                         reaction_type=r_type,
                         density=self.config.get('reactant_density', 1e22), # Needs avg reactant density
                         temperature=overall_temperature,
                         enhancement_factor=avg_enhancement_factor
                     )
                     overall_rates_result[r_type.name] = rate_data # Store full dict
                     overall_rates_value_only[r_type] = rate_data.get('total_rate', 0.0)
        
                 # Calculate power using overall rates and total volume
                 total_power_output = self.fusion_processor.calculate_power_output(
                     overall_rates_value_only, # Pass dict[ReactionType, float]
                     volume=self.config.get('volume', 1e-6) # Need effective volume
                 )
             except Exception as e:
                 logger.error(f"Error during non-spatial rate/power calculation: {e}", exc_info=True)
                 total_power_output = {"total_power": 0.0}
             
             # No spatial events in non-spatial mode
             reaction_events = []

        # --- 3. Update Electromagnetic Fields --- #
        if self.electromagnetic_solver:
            try:
                charge_density_grid = None
                current_density_grid = None

                # Build charge / current density grids from the lattice
                # snapshot when spatial data is available.  Uses nearest-
                # grid-point (NGP) deposition: each ion contributes its
                # charge (or charge * velocity) to the cell it occupies.
                if self.grid and lattice_snapshot:
                    positions = lattice_snapshot.get("positions")  # (N, 3)
                    velocities = lattice_snapshot.get("velocities")  # (N, 3)
                    charges = lattice_snapshot.get("charges")  # (N,)

                    if positions is not None and charges is not None:
                        charge_density_grid = self.grid.create_empty_grid_data()
                        current_density_grid = np.zeros(
                            self.grid.resolution + (3,), dtype=float,
                        )
                        cell_vol = self.grid.get_cell_volume()
                        for i in range(len(charges)):
                            try:
                                idx = self.grid.get_cell_index(
                                    positions[i, 0],
                                    positions[i, 1],
                                    positions[i, 2],
                                )
                                if idx is not None:
                                    charge_density_grid[idx] += charges[i] / cell_vol
                                    if velocities is not None:
                                        current_density_grid[idx + (slice(None),)] += (
                                            charges[i] * velocities[i] / cell_vol
                                        )
                            except (IndexError, Exception):
                                continue  # particle outside grid

                await self.electromagnetic_solver.update_fields(
                    dt, charge_density_grid, current_density_grid,
                )
            except Exception as e:
                 logger.error(f"Error during electromagnetic field update: {e}", exc_info=True)
        
        # --- Combine results --- 
        step_results = {
            'time': self.time,
            'step': self.step_count,
            # Spatial data (empty list if not calculated)
            'reaction_events': reaction_events, 
            # Overall metrics
            'overall_temperature': overall_temperature, 
            'total_power': total_power_output.get('total_power', 0), 
            'avg_enhancement_factor': avg_enhancement_factor,
            # Optionally include raw spatial grids if needed for API response (Task A6)
            # Note: Grids themselves can be large, consider returning only if requested?
            # 'spatial_grids': {
            #     'temperature': spatial_lattice_state.get("temperature_grid"),
            #     'density': spatial_lattice_state.get("density_grid"),
            #     'enhancement': spatial_enhancement.get("total_enhancement_grid"),
            #     **spatial_rates # Merge rate grids
            # }
            # Keep raw atom data? (Potentially large)
            # 'atoms': lattice_snapshot.get("atoms", []) 
        }
        
        # --- 4. Update Temperature based on Heat Sources --- #
        if self.thermal_solver and self.grid:
            try:
                # Calculate heat source grid (W/m^3) from fusion processor results
                # This is a placeholder - needs actual implementation based on FusionProcessor output
                heat_source_grid = self._calculate_heat_source_grid(spatial_rates, reaction_events, dt)
                
                await self.thermal_solver.update_temperature(dt, heat_source_grid)
                
                # Update the snapshot and overall temperature with new thermal data
                updated_temperature_grid = self.thermal_solver.get_temperature_grid()
                if updated_temperature_grid is not None:
                     spatial_lattice_state["temperature_grid"] = updated_temperature_grid
                     # Update the overall temperature used in results and potentially next step non-spatial calcs
                     overall_temperature = np.mean(updated_temperature_grid[np.isfinite(updated_temperature_grid)])
                     step_results['overall_temperature'] = overall_temperature # Update results dict
                     # Optionally include the grid in results if needed (uncomment/modify below)
                     # step_results.setdefault('spatial_grids', {})['temperature'] = updated_temperature_grid
                else:
                     logger.warning("Thermal solver did not return an updated temperature grid.")
                     
            except Exception as e:
                logger.error(f"Error during thermal update: {e}", exc_info=True)
                # Continue simulation but log error
        elif self.thermal_solver and not self.grid: # Handle non-spatial case
             try:
                  # Calculate total heat power (W) from non-spatial rates
                  total_heat_power = total_power_output.get("total_power", 0.0)
                  # Convert to power density assuming uniform distribution over a notional volume
                  # This is a rough approximation for the non-spatial case
                  volume = self.config.get('volume', 1e-6)
                  heat_source_density = total_heat_power / volume if volume > 0 else 0
                  heat_source_array = np.array([heat_source_density])
                  
                  await self.thermal_solver.update_temperature(dt, heat_source_array)
                  updated_temp_value = self.thermal_solver.get_temperature_grid()[0]
                  overall_temperature = updated_temp_value # Update the single value
                  step_results['overall_temperature'] = overall_temperature # Update results dict
                  
             except Exception as e:
                 logger.error(f"Error during non-spatial thermal update: {e}", exc_info=True)

        # Update the step results with potentially modified overall temperature
        step_results['overall_temperature'] = overall_temperature 

        # --- 5. Apply Forces (e.g., Lorentz) back to Lattice --- #
        if self.electromagnetic_solver and self.lattice_simulator and self.grid:
            try:
                # Get particle data needed for force calculation
                positions = lattice_snapshot.get("positions") # Assuming shape (N, 3)
                velocities = lattice_snapshot.get("velocities") # Assuming shape (N, 3)
                charges = lattice_snapshot.get("charges") # Assuming shape (N,)
                atom_ids = lattice_snapshot.get("atom_ids") # Need IDs to apply forces correctly

                if positions is not None and velocities is not None and charges is not None and atom_ids is not None:
                     forces = await self.electromagnetic_solver.calculate_lorentz_force(positions, velocities, charges)

                     # Apply Lorentz forces to the lattice particles.
                     # The lattice simulator may expose apply_external_forces();
                     # if not, store forces on the snapshot for the next step.
                     if hasattr(self.lattice_simulator, 'apply_external_forces'):
                         self.lattice_simulator.apply_external_forces(atom_ids, forces)
                         logger.debug(f"Applied Lorentz forces to {forces.shape[0]} particles.")
                     else:
                         # Fallback: store forces in snapshot for downstream use
                         lattice_snapshot["external_forces"] = forces
                         lattice_snapshot["external_force_ids"] = atom_ids
                         logger.debug(
                             f"Calculated {forces.shape[0]} Lorentz forces "
                             "(stored on snapshot; lattice_simulator lacks "
                             "apply_external_forces)."
                         )
                else:
                     logger.warning("Missing required data (positions, velocities, charges, atom_ids) for Lorentz force calculation.")
                     
            except Exception as e:
                 logger.error(f"Error calculating/applying Lorentz forces: {e}", exc_info=True)
        
        self.results.append(step_results)
        return step_results

    # --- Helper Methods --- #
    
    # Placeholder: Needs proper implementation based on FusionProcessor output
    def _calculate_heat_source_grid(self, spatial_rates: Dict[str, Any], reaction_events: List[Dict], dt: float) -> np.ndarray:
        """Calculates the heat source grid (W/m^3) based on fusion results."""
        if not self.grid: return np.array([0.0]) # Return single zero for non-spatial
        
        heat_grid = self.grid.create_empty_grid_data()
        
        # Option 1: Use spatial_rates if FusionProcessor provides heat generation rate per cell
        if "total_heat_rate_grid" in spatial_rates and spatial_rates["total_heat_rate_grid"] is not None:
            heat_grid += spatial_rates["total_heat_rate_grid"] # Assuming W/m^3
            logger.debug(f"Calculated heat grid from spatial_rates. Sum: {np.sum(heat_grid):.2e} W/m^3")
            return heat_grid
        
        # Option 2: Use reaction_events if they contain energy released per event
        elif reaction_events:
            logger.warning("_calculate_heat_source_grid using reaction_events - needs energy per event data.")
            cell_volume = self.grid.get_cell_volume()
            if dt <= 0 or cell_volume <= 0:
                 logger.error(f"Cannot calculate heat source density: dt={dt}, cell_volume={cell_volume}")
                 return heat_grid # Return zeros
                 
            for event in reaction_events:
                energy_released = event.get("energy_released_J") # **ASSUMPTION**: Event dict has this key (Joules)
                if energy_released is None:
                     # Fallback: Use default energy per reaction type if energy_released is missing
                     reaction_type = ReactionType.from_string(event.get("type"))
                     if reaction_type:
                         energy_released = self.fusion_processor.energy_per_reaction.get(reaction_type, 0)
                     else:
                         energy_released = 0 
                         logger.warning(f"Unknown reaction type or missing energy in event: {event.get('type')}")

                if energy_released > 0:
                    # Convert event energy (J) to power density (W/m^3)
                    # Power = Energy / dt ; Power Density = Power / Volume
                    power_density = energy_released / (dt * cell_volume)
                    pos = event.get("pos")
                    if pos:
                        try:
                            idx = self.grid.get_cell_index(pos[0], pos[1], pos[2])
                            if idx:
                                heat_grid[idx] += power_density
                        except IndexError:
                             logger.warning(f"Event position {pos} out of grid bounds.")
                        except Exception as e:
                             logger.error(f"Error adding event heat source: {e}")
            logger.debug(f"Calculated heat grid from {len(reaction_events)} events. Sum: {np.sum(heat_grid):.2e} W/m^3")
            return heat_grid
            
        # Fallback if neither spatial rates nor events provide heat data
        logger.debug("No specific heat source data found, returning zero heat grid.")
        return heat_grid

    # Helper function to aggregate reaction events from spatial rates
    def _aggregate_reaction_events(self, spatial_rates: Dict[str, np.ndarray], grid: SimulationGrid, threshold_factor=1e-3) -> List[Dict[str, Any]]:
        """Process spatial rates grid to create a list of reaction events above a threshold."""
        if not grid: return []
        
        events = []
        max_rate_overall = 0
        # Find max rate across all reaction types for relative thresholding
        for rate_grid in spatial_rates.values():
            if rate_grid is not None and rate_grid.size > 0:
                 try:
                      current_max = np.max(rate_grid)
                      if np.isfinite(current_max) and current_max > max_rate_overall:
                           max_rate_overall = current_max
                 except ValueError: # Handle case where grid might be empty after filtering NaNs etc.
                      pass 
                      
        if max_rate_overall <= 0: return [] # No reactions happening
        
        threshold = max_rate_overall * threshold_factor
        
        for reaction_key, rate_grid in spatial_rates.items():
            if rate_grid is None or not reaction_key.endswith("_rate_grid"): continue
            
            try:
                reaction_type_name = reaction_key.replace("_rate_grid", "")
                # Find indices where rate exceeds threshold
                hot_spots_indices = np.argwhere(rate_grid > threshold)
                
                for index_tuple in hot_spots_indices:
                    i, j, k = index_tuple
                    rate_value = rate_grid[i, j, k]
                    # Get physical position of the cell center
                    pos = grid.get_cell_center(i, j, k)
                    if pos:
                        events.append({
                            "pos": list(pos), # Convert tuple to list for JSON serialization
                            "intensity": float(rate_value), # Convert numpy float
                            "type": reaction_type_name
                        })
            except Exception as agg_err:
                 logger.error(f"Error aggregating events for {reaction_key}: {agg_err}", exc_info=False)
                    
        logger.debug(f"Aggregated {len(events)} reaction events above threshold {threshold:.2e}")
        return events
    
    async def run_simulation(self, steps: int, dt: float) -> Dict[str, Any]:
        """
        Run the full simulation for the specified number of steps.
        """
        if self.status == "running":
             logger.warning(f"Simulation {self.simulation_id} is already running.")
             # Should prevent concurrent runs on the same instance
             return {"status": "already_running", "message": "Simulation is already running."}
             
        logger.info(f"Starting simulation run: {self.simulation_id}, {steps} steps with dt={dt}")
        self.status = "running"
        
        # Store results temporarily during run
        run_results_list = []
        
        try:
            for i in range(steps):
                # Allow breaking loop if status changes externally (e.g., stop request)
                if self.status != "running":
                     logger.info(f"Simulation {self.simulation_id} run interrupted. Status: {self.status}")
                     break
                
                step_result = await self.run_step(dt)
                run_results_list.append(step_result)
                # Optional: yield progress update here if needed
                # logger.debug(f"Step {self.step_count}/{steps} completed.")

            if self.status == "running": # If not interrupted
                 self.status = "completed"
                 logger.info(f"Completed simulation run: {self.simulation_id}, {self.step_count} steps, final time {self.time}")
            
            # Compile final summary after run completion or interruption
            summary = self.get_summary() # Use internal method to get latest summary
            summary['results'] = self.results # Ensure summary includes all results up to this point
            return summary

        except Exception as e:
            self.status = "failed"
            logger.error(f"Simulation {self.simulation_id} failed during run: {e}", exc_info=True)
            # Return error state
            summary = self.get_summary() # Get summary even on failure
            summary['error'] = str(e)
        return summary
    
    def get_results(self) -> List[Dict[str, Any]]:
        """
        Get all accumulated simulation step results.
        """
        return self.results
    
    def get_summary(self) -> Dict[str, Any]:
        """
        Get a summary of the simulation state and results.
        """
        summary = {
                'simulation_id': self.simulation_id,
            'status': self.status,
            'steps_completed': self.step_count,
            'total_time_simulated': self.time,
            'initialized_at': self.start_time,
            'grid_resolution': self.grid_resolution,
            'domain_boundaries': self.domain_boundaries,
            # Include parameters used?
            # 'parameters': self.config # Be careful not to expose sensitive info if any
        }
        
        if not self.results:
            summary['message'] = 'No results generated yet.'
            return summary
        
        try:
             last_result = self.results[-1]
             # Calculate peak/avg values (adapt based on new result structure later)
             temperatures = [r.get('overall_temperature', 0) for r in self.results]
             energies = [r.get('total_power', 0) for r in self.results] # Use new key if changed
            
             summary.update({
                 'final_temperature': temperatures[-1] if temperatures else None,
                 'final_energy_rate': energies[-1] if energies else None,
                 'peak_temperature': max(temperatures) if temperatures else None,
                 'peak_energy_rate': max(energies) if energies else None,
                 'avg_temperature': sum(temperatures) / len(temperatures) if temperatures else None,
                 'avg_energy_rate': sum(energies) / len(energies) if energies else None,
             })
        except Exception as e:
             logger.error(f"Error calculating summary statistics for {self.simulation_id}: {e}")
             summary['summary_error'] = str(e)
             
        return summary 