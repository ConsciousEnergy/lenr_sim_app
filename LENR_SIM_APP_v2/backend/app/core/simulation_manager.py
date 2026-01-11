"""
Simulation manager for coordinating LENR simulations
"""

import asyncio
import logging
import uuid
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Union

from ..models.simulation_models import SimulationParameters, SimulationStatus, SimulationResult, SimulationResultData

# Configure logging
logger = logging.getLogger(__name__)

class SimulationManager:
    """
    Manages LENR simulations, including creation, monitoring, and results storage.
    Acts as a singleton to maintain state across API calls.
    """
    
    def __init__(self):
        """Initialize the simulation manager."""
        self._simulations: Dict[str, SimulationStatus] = {}
        self._results: Dict[str, SimulationResult] = {}
        self._tasks: Dict[str, asyncio.Task] = {}
        self._simulation_timeouts: Dict[str, datetime] = {}  # Track when simulations should timeout
        
        # Keep track of last progress update time to detect stuck simulations
        self._last_progress_update: Dict[str, datetime] = {}
        
        # Start a background task for timeout monitoring
        asyncio.create_task(self._monitor_timeouts())
        logger.info("Simulation manager initialized with timeout monitoring")
    
    async def _monitor_timeouts(self):
        """Background task to check for stuck or timed out simulations"""
        logger.info("Starting timeout monitoring task")
        while True:
            now = datetime.now()
            to_process = []
            to_trigger = []
            
            # Find any stuck simulations
            for sim_id, timeout_time in list(self._simulation_timeouts.items()):
                # Check if simulation has reached timeout
                if now > timeout_time:
                    to_process.append(sim_id)
                    continue
                
                # Check if simulation is stuck in initializing state for > 15 sec
                if sim_id in self._simulations:
                    status = self._simulations[sim_id]
                    if status.status == "initializing":
                        init_time = None
                        if status.started_at:
                            init_time = status.started_at
                        elif status.created_at:
                            init_time = status.created_at
                            
                        if init_time and (now - init_time) > timedelta(seconds=15):
                            logger.warning(f"Simulation {sim_id} stuck in initializing state for >15s, will trigger progress")
                            to_trigger.append(sim_id)
            
            # Process timeouts
            for sim_id in to_process:
                if sim_id in self._simulations:
                    status = self._simulations[sim_id]
                    
                    # Check if it's still in initializing or hasn't progressed
                    if status.status == "initializing" or (status.status == "processing" and status.overall_progress < 10.0):
                        # Log that this simulation appears stuck
                        logger.warning(f"Simulation {sim_id} appears stuck in {status.status} state. Completing with timeout.")
                        
                        # Create simple results for the simulation
                        self._generate_minimal_results(sim_id, status.parameters)
                        
                        # Mark as timed out but completed (client can see it has timed out from message)
                        status.status = "completed"
                        status.current_stage = "completed"
                        status.stage_progress = 100.0
                        status.overall_progress = 100.0
                        status.completed_at = now
                        status.updated_at = now
                        status.message = "Simulation timed out but default results generated"
                        
                    # Remove from timeout tracking
                    self._simulation_timeouts.pop(sim_id, None)
                    self._last_progress_update.pop(sim_id, None)
            
            # Process simulations that need triggering
            for sim_id in to_trigger:
                success = self.force_trigger_progress(sim_id)
                if success:
                    logger.info(f"Successfully triggered progress for stuck simulation {sim_id}")
                else:
                    logger.warning(f"Failed to trigger progress for simulation {sim_id}")
            
            # Sleep for a while before checking again (more frequent checks)
            await asyncio.sleep(3)  # Check every 3 seconds
    
    def register_simulation(self, simulation_id: str, parameters: SimulationParameters) -> None:
        """
        Register a new simulation with the manager.
        
        Args:
            simulation_id: Unique ID for the simulation
            parameters: Simulation parameters
        """
        # Create initial status object with proper fields
        now = datetime.now()
        status = SimulationStatus(
            id=simulation_id,
            status="initializing",
            current_stage="initializing",
            stage_progress=0.0,
            overall_progress=0.0,
            created_at=now,
            updated_at=now,
            started_at=now,  # Important - mark as started immediately
            message="Simulation registered and initializing",
            parameters=parameters.dict() if hasattr(parameters, 'dict') else parameters
        )
        
        # Store in manager
        self._simulations[simulation_id] = status
        
        # Set a timeout for this simulation (1 minute instead of 2 minutes)
        self._simulation_timeouts[simulation_id] = now + timedelta(minutes=1)
        self._last_progress_update[simulation_id] = now
        
        logger.info(f"Registered simulation {simulation_id} with timeout at {self._simulation_timeouts[simulation_id].isoformat()}")
    
    async def run_simulation(self, simulation_id: str) -> None:
        """
        Run a registered simulation asynchronously.
        
        Args:
            simulation_id: ID of the simulation to run
        """
        if simulation_id not in self._simulations:
            logger.error(f"Cannot run simulation {simulation_id}: not registered")
            return
        
        logger.info(f"Starting simulation run for {simulation_id}")
        
        # Mark simulation as running
        status = self._simulations[simulation_id]
        status.status = "processing"
        status.current_stage = "setup"
        status.stage_progress = 0.0
        status.overall_progress = 5.0
        status.updated_at = datetime.now()
        status.message = "Setting up simulation parameters"
        
        # Update last progress time
        self._last_progress_update[simulation_id] = datetime.now()
        
        try:
            # Create a task for the simulation
            task = asyncio.create_task(self._run_simulation_task(simulation_id))
            self._tasks[simulation_id] = task
            
            # Wait for completion
            await task
            
            # Update on success (if not already marked as completed)
            if simulation_id in self._simulations and self._simulations[simulation_id].status != "completed":
                self._simulations[simulation_id].status = "completed"
                self._simulations[simulation_id].current_stage = "completed"
                self._simulations[simulation_id].stage_progress = 100.0
                self._simulations[simulation_id].overall_progress = 100.0
                self._simulations[simulation_id].completed_at = datetime.now()
                self._simulations[simulation_id].updated_at = datetime.now()
                self._simulations[simulation_id].message = "Simulation completed successfully"
                logger.info(f"Simulation {simulation_id} completed successfully")
            
            # Remove timeout tracking
            self._simulation_timeouts.pop(simulation_id, None)
            self._last_progress_update.pop(simulation_id, None)
        
        except asyncio.CancelledError:
            # Simulation was cancelled
            logger.info(f"Simulation {simulation_id} was cancelled")
            if simulation_id in self._simulations:
                self._simulations[simulation_id].status = "cancelled"
                self._simulations[simulation_id].current_stage = "cancelled"
                self._simulations[simulation_id].completed_at = datetime.now()
                self._simulations[simulation_id].updated_at = datetime.now()
                self._simulations[simulation_id].message = "Simulation was cancelled by user"
            
            # Remove timeout tracking
            self._simulation_timeouts.pop(simulation_id, None)
            self._last_progress_update.pop(simulation_id, None)
        
        except Exception as e:
            # Handle any other exceptions
            logger.error(f"Error in simulation {simulation_id}: {str(e)}", exc_info=True)
            if simulation_id in self._simulations:
                self._simulations[simulation_id].status = "failed"
                self._simulations[simulation_id].current_stage = "failed"
                self._simulations[simulation_id].error_message = str(e)
                self._simulations[simulation_id].completed_at = datetime.now()
                self._simulations[simulation_id].updated_at = datetime.now()
                self._simulations[simulation_id].message = f"Error: {str(e)}"
            
            # Remove timeout tracking
            self._simulation_timeouts.pop(simulation_id, None)
            self._last_progress_update.pop(simulation_id, None)
    
    async def _run_simulation_task(self, simulation_id: str) -> None:
        """
        Internal method to run the actual simulation computation.
        
        Args:
            simulation_id: ID of the simulation to run
        """
        if simulation_id not in self._simulations:
            logger.error(f"Cannot run simulation task {simulation_id}: not found")
            return
            
        parameters = self._simulations[simulation_id].parameters
        logger.info(f"Starting simulation task processing for {simulation_id} with parameters: {parameters}")
        
        # Define simulation stages
        stages = ["setup", "processing", "analyzing", "finalizing"]
        stage_weights = [0.1, 0.6, 0.2, 0.1]  # Relative importance of each stage
        
        # Run through each stage
        overall_progress = 0.0
        
        for i, stage in enumerate(stages):
            # Update stage
            if simulation_id not in self._simulations:
                logger.warning(f"Simulation {simulation_id} no longer exists during execution")
                return
                
            self._simulations[simulation_id].current_stage = stage
            self._simulations[simulation_id].stage_progress = 0.0
            self._simulations[simulation_id].status = "processing"  # Ensure status stays as processing
            self._simulations[simulation_id].updated_at = datetime.now()
            self._last_progress_update[simulation_id] = datetime.now()
            
            logger.info(f"Simulation {simulation_id} entered stage: {stage}")
            
            if stage == "setup":
                self._simulations[simulation_id].message = "Setting up simulation parameters"
            elif stage == "processing":
                self._simulations[simulation_id].message = "Running core simulation calculations"
            elif stage == "analyzing":
                self._simulations[simulation_id].message = "Analyzing simulation results"
            elif stage == "finalizing":
                self._simulations[simulation_id].message = "Finalizing outputs and generating visualizations"
            
            # Simulate progress for this stage
            steps = 5  # Reduce from 10 to 5 steps per stage for faster completion
            previous_stages_weight = sum(stage_weights[:i])
            
            for step in range(1, steps + 1):
                # Check for cancellation
                if asyncio.current_task().cancelled():
                    raise asyncio.CancelledError()
                
                # Check if simulation still exists
                if simulation_id not in self._simulations:
                    logger.warning(f"Simulation {simulation_id} no longer exists during execution")
                    return
                
                # Update stage progress
                stage_progress = (step / steps) * 100.0
                self._simulations[simulation_id].stage_progress = stage_progress
                
                # Update overall progress
                current_stage_contribution = (stage_progress / 100.0) * stage_weights[i] * 100
                overall_progress = previous_stages_weight * 100 + current_stage_contribution
                self._simulations[simulation_id].overall_progress = overall_progress
                self._simulations[simulation_id].updated_at = datetime.now()
                self._last_progress_update[simulation_id] = datetime.now()
                
                logger.debug(f"Simulation {simulation_id} progress: stage={stage}, step={step}/{steps}, " +
                          f"stage_progress={stage_progress:.1f}%, overall_progress={overall_progress:.1f}%")
                
                # Simulate work - shorter delay to prevent timeouts (reduce times further)
                delay = 0.2 if stage == "processing" else 0.1
                await asyncio.sleep(delay)  # Simulating computation
        
        # Generate dummy results for now (to be replaced with actual physics simulations)
        logger.info(f"Simulation {simulation_id} completed all stages, generating results")
        self._generate_dummy_results(simulation_id, parameters)
    
    def _generate_minimal_results(self, simulation_id: str, parameters: Any) -> None:
        """
        Generate minimal simulation results for timeouts.
        
        Args:
            simulation_id: ID of the simulation
            parameters: Parameters used for the simulation
        """
        import numpy as np
        logger.info(f"Generating minimal results for timed out simulation {simulation_id}")
        
        # Create a minimal result data object
        try:
            # Extract basic parameters we need
            simulation_duration = float(parameters.get('simulation_duration', 100))
            time_step = float(parameters.get('time_step', 0.1))
            
            # Generate empty time series data
            time_points = np.linspace(0, simulation_duration, 10)
            temperature = np.ones_like(time_points) * 20
            pressure = np.ones_like(time_points) * 1.0
            excess_power = np.zeros_like(time_points)
            energy = np.zeros_like(time_points)
            efficiency = np.ones_like(time_points)
            
            # Create result data object
            result_data = SimulationResultData(
                time=time_points.tolist(),
                temperature=temperature.tolist(),
                pressure=pressure.tolist(),
                excess_power=excess_power.tolist(),
                energy_produced=energy.tolist(),
                efficiency=efficiency.tolist()
            )
            
            # Create summary statistics
            summary = {
                "max_temperature": 20.0,
                "max_pressure": 1.0,
                "max_excess_power": 0.0,
                "total_energy_produced": 0.0,
                "average_cop": 1.0
            }
            
            # Create complete result object
            result = SimulationResult(
                simulation_id=simulation_id,
                parameters=parameters,
                data=result_data,
                summary=summary,
                created_at=datetime.now()
            )
            
            # Store result
            self._results[simulation_id] = result
            logger.info(f"Successfully generated minimal results for timed out simulation {simulation_id}")
            
        except Exception as e:
            logger.error(f"Error generating minimal results for timed out simulation {simulation_id}: {str(e)}", exc_info=True)
            # Create an ultra-minimal empty result
            self._results[simulation_id] = {
                "simulation_id": simulation_id,
                "error": "Simulation timed out and could not generate results"
            }
    
    def _generate_dummy_results(self, simulation_id: str, parameters: Any) -> None:
        """
        Generate dummy simulation results for testing.
        
        Args:
            simulation_id: ID of the simulation
            parameters: Parameters used for the simulation
        """
        import numpy as np
        logger.info(f"Generating dummy results for simulation {simulation_id}")
        
        try:
            # Extract parameters safely
            reactor_temperature = float(parameters.get('reactor_temperature', 300))
            reactor_pressure = float(parameters.get('reactor_pressure', 1.0))
            simulation_duration = float(parameters.get('simulation_duration', 100))
            time_step = float(parameters.get('time_step', 0.1))
            input_power = float(parameters.get('input_power', 100))
            
            # Generate time series data
            time_points = np.linspace(0, simulation_duration, 100)
            temperature = 20 + reactor_temperature * (1 + 0.1 * np.sin(0.1 * time_points))
            pressure = reactor_pressure * (1 + 0.05 * np.cos(0.08 * time_points))
            excess_power = input_power * 0.2 * (1 - np.exp(-0.01 * time_points))
            energy = np.cumsum(excess_power) * time_step
            efficiency = 1.0 + 0.2 * (1 - np.exp(-0.01 * time_points))
            
            # Create result data object
            result_data = SimulationResultData(
                time=time_points.tolist(),
                temperature=temperature.tolist(),
                pressure=pressure.tolist(),
                excess_power=excess_power.tolist(),
                energy_produced=energy.tolist(),
                efficiency=efficiency.tolist()
            )
            
            # Create summary statistics
            summary = {
                "max_temperature": float(np.max(temperature)),
                "max_pressure": float(np.max(pressure)),
                "max_excess_power": float(np.max(excess_power)),
                "total_energy_produced": float(energy[-1]),
                "average_cop": float(np.mean(efficiency))
            }
            
            # Create complete result object
            result = SimulationResult(
                simulation_id=simulation_id,
                parameters=parameters,
                data=result_data,
                summary=summary,
                created_at=datetime.now()
            )
            
            # Store result
            self._results[simulation_id] = result
            logger.info(f"Successfully generated dummy results for simulation {simulation_id}")
            
        except Exception as e:
            logger.error(f"Error generating dummy results for simulation {simulation_id}: {str(e)}", exc_info=True)
            # Create an ultra-minimal empty result to avoid further errors
            self._results[simulation_id] = {
                "simulation_id": simulation_id,
                "error": f"Failed to generate results: {str(e)}"
            }
    
    def force_trigger_progress(self, simulation_id: str) -> bool:
        """
        Force a simulation to advance from the initializing state.
        Useful for addressing stuck simulations.
        
        Args:
            simulation_id: ID of the simulation to advance
            
        Returns:
            bool: True if simulation was advanced, False otherwise
        """
        if simulation_id not in self._simulations:
            logger.warning(f"Cannot trigger progress for simulation {simulation_id}: not found")
            return False
            
        status = self._simulations[simulation_id]
        logger.info(f"Attempting to force trigger progress for simulation {simulation_id} in state {status.status}")
        
        # Check if the simulation is in the initializing state
        if status.status == "initializing":
            # Update status to processing
            status.status = "processing"
            status.current_stage = "setup"
            status.stage_progress = 10.0
            status.overall_progress = 5.0
            status.updated_at = datetime.now()
            status.message = "Simulation processing started (manually triggered)"
            
            # Update last progress time
            self._last_progress_update[simulation_id] = datetime.now()
            
            # Create a new task if needed
            if simulation_id not in self._tasks or self._tasks[simulation_id].done():
                logger.info(f"Creating new task for triggered simulation {simulation_id}")
                self._tasks[simulation_id] = asyncio.create_task(self._run_simulation_task(simulation_id))
                
            return True
        
        # Also try to trigger progress if the simulation is stuck in processing but not progressing
        if status.status == "processing":
            # Check if it has been a while since the last progress update
            last_update = self._last_progress_update.get(simulation_id)
            if last_update and (datetime.now() - last_update) > timedelta(seconds=30):
                logger.info(f"Simulation {simulation_id} stuck in processing state, restarting task")
                
                # Cancel the existing task if it exists
                if simulation_id in self._tasks and not self._tasks[simulation_id].done():
                    self._tasks[simulation_id].cancel()
                
                # Create a new task
                self._tasks[simulation_id] = asyncio.create_task(self._run_simulation_task(simulation_id))
                return True
        
        logger.warning(f"Could not trigger progress for simulation {simulation_id}: not in suitable state")
        return False
    
    def simulation_exists(self, simulation_id: str) -> bool:
        """
        Check if a simulation exists.
        
        Args:
            simulation_id: ID to check
            
        Returns:
            bool: True if the simulation exists
        """
        return simulation_id in self._simulations
    
    def get_simulation_status(self, simulation_id: str) -> str:
        """
        Get the status of a simulation.
        
        Args:
            simulation_id: ID of the simulation
            
        Returns:
            str: Status string
        """
        if simulation_id not in self._simulations:
            return "not_found"
        return self._simulations[simulation_id].status
    
    def get_simulation_progress(self, simulation_id: str) -> float:
        """
        Get the progress of a simulation.
        
        Args:
            simulation_id: ID of the simulation
            
        Returns:
            float: Progress percentage (0-100)
        """
        if simulation_id not in self._simulations:
            return 0.0
        return self._simulations[simulation_id].overall_progress
    
    def get_simulation_start_time(self, simulation_id: str) -> Optional[datetime]:
        """
        Get the start time of a simulation.
        
        Args:
            simulation_id: ID of the simulation
            
        Returns:
            Optional[datetime]: Start time or None
        """
        if simulation_id not in self._simulations:
            return None
        return self._simulations[simulation_id].started_at
    
    def get_simulation_end_time(self, simulation_id: str) -> Optional[datetime]:
        """
        Get the end time of a simulation.
        
        Args:
            simulation_id: ID of the simulation
            
        Returns:
            Optional[datetime]: End time or None
        """
        if simulation_id not in self._simulations:
            return None
        return self._simulations[simulation_id].completed_at
    
    def get_simulation_results(self, simulation_id: str) -> Optional[SimulationResult]:
        """
        Get the results of a simulation.
        
        Args:
            simulation_id: ID of the simulation
            
        Returns:
            Optional[SimulationResult]: Results or None
        """
        return self._results.get(simulation_id)
    
    def get_simulation_full_status(self, simulation_id: str) -> Optional[SimulationStatus]:
        """
        Get the full status object for a simulation.
        
        Args:
            simulation_id: ID of the simulation
            
        Returns:
            Optional[SimulationStatus]: Full status or None
        """
        return self._simulations.get(simulation_id)
    
    def stop_simulation(self, simulation_id: str) -> bool:
        """
        Stop a running simulation.
        
        Args:
            simulation_id: ID of the simulation to stop
            
        Returns:
            bool: True if successfully stopped
        """
        if (
            simulation_id not in self._simulations or
            self._simulations[simulation_id].status not in ["initializing", "pending", "running", "processing"] or
            simulation_id not in self._tasks
        ):
            return False
        
        # Cancel the task
        task = self._tasks[simulation_id]
        if not task.done():
            task.cancel()
            return True
        
        return False
    
    def delete_simulation(self, simulation_id: str) -> bool:
        """
        Delete a simulation and its results.
        
        Args:
            simulation_id: ID of the simulation to delete
            
        Returns:
            bool: True if successfully deleted
        """
        if simulation_id not in self._simulations:
            return False
        
        # Stop if running
        if simulation_id in self._tasks and not self._tasks[simulation_id].done():
            self._tasks[simulation_id].cancel()
        
        # Remove from storage
        self._simulations.pop(simulation_id, None)
        self._results.pop(simulation_id, None)
        self._tasks.pop(simulation_id, None)
        self._simulation_timeouts.pop(simulation_id, None)
        self._last_progress_update.pop(simulation_id, None)
        
        return True
    
    def list_simulations(self) -> List[SimulationStatus]:
        """
        List all simulations.
        
        Returns:
            List[SimulationStatus]: List of all simulation statuses
        """
        return list(self._simulations.values()) 