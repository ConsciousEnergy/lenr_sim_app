"""
Simulation Manager Service

This module provides a service for managing simulations, including creating,
running, and retrieving simulation results.
"""

import logging
import asyncio
from typing import Dict, Any, Optional, List
import uuid
import time
from datetime import datetime

from app.utils.logging import setup_logger
from app.simulation.engine import SimulationEngine

# Set up logger
logger = setup_logger("simulation_manager", "logs/simulation.log")

class SimulationManager:
    """
    Manager for LENR simulations, providing methods to create,
    run, and retrieve simulations and their results.
    """
    
    def __init__(self):
        """Initialize the simulation manager."""
        self._simulations: Dict[str, SimulationEngine] = {}
        self._results: Dict[str, Any] = {}
        self._running_tasks: Dict[str, asyncio.Task] = {}
        
        logger.info("Simulation manager initialized")
    
    def add_simulation(self, simulation_id: str, simulation: SimulationEngine) -> None:
        """
        Add a simulation to the manager.
        
        Args:
            simulation_id: Unique identifier for the simulation
            simulation: Simulation engine instance
        """
        self._simulations[simulation_id] = simulation
        logger.info(f"Added simulation {simulation_id}")
    
    async def run_simulation(self, simulation_id: str) -> Any:
        """
        Run a simulation and store its results.
        
        Args:
            simulation_id: ID of the simulation to run
            
        Returns:
            Simulation results
        """
        if simulation_id not in self._simulations:
            logger.error(f"Simulation {simulation_id} not found")
            return None
        
        try:
            logger.info(f"Starting simulation {simulation_id}")
            
            # Get the simulation
            simulation = self._simulations[simulation_id]
            
            # Create a task to run the simulation
            start_time = time.time()
            
            # Run in a separate thread to avoid blocking
            loop = asyncio.get_event_loop()
            results = await loop.run_in_executor(None, simulation.run)
            
            elapsed_time = time.time() - start_time
            
            # Store results
            self._results[simulation_id] = {
                "simulation_id": simulation_id,
                "results": results,
                "status": "completed",
                "completed_at": datetime.now(),
                "elapsed_time": elapsed_time
            }
            
            logger.info(f"Simulation {simulation_id} completed in {elapsed_time:.2f} seconds")
            
            return results
        
        except Exception as e:
            logger.error(f"Error running simulation {simulation_id}: {str(e)}")
            
            # Store error result
            self._results[simulation_id] = {
                "simulation_id": simulation_id,
                "status": "failed",
                "error": str(e),
                "completed_at": datetime.now()
            }
            
            return {
                "status": "failed",
                "error": str(e)
            }
    
    def cancel_simulation(self, simulation_id: str) -> bool:
        """
        Cancel a running simulation.
        
        Args:
            simulation_id: ID of the simulation to cancel
            
        Returns:
            True if successfully canceled, False otherwise
        """
        if simulation_id not in self._running_tasks:
            logger.warning(f"No running task found for simulation {simulation_id}")
            return False
        
        task = self._running_tasks[simulation_id]
        if not task.done():
            task.cancel()
            logger.info(f"Canceled simulation {simulation_id}")
            
            # Store cancellation result
            self._results[simulation_id] = {
                "simulation_id": simulation_id,
                "status": "canceled",
                "completed_at": datetime.now()
            }
            
            return True
        
        return False
    
    def get_simulation(self, simulation_id: str) -> Optional[SimulationEngine]:
        """
        Get a simulation by ID.
        
        Args:
            simulation_id: ID of the simulation to retrieve
            
        Returns:
            Simulation engine if found, None otherwise
        """
        return self._simulations.get(simulation_id)
    
    def get_simulation_status(self, simulation_id: str) -> Dict[str, Any]:
        """
        Get the status of a simulation.
        
        Args:
            simulation_id: ID of the simulation to check
            
        Returns:
            Status information
        """
        if simulation_id in self._results:
            return self._results[simulation_id]
        
        if simulation_id in self._simulations:
            sim = self._simulations[simulation_id]
            
            return {
                "simulation_id": simulation_id,
                "status": "running" if simulation_id in self._running_tasks else "initialized"
            }
        
        return {
            "simulation_id": simulation_id,
            "status": "not_found"
        }
    
    def get_simulation_results(self, simulation_id: str) -> Optional[Dict[str, Any]]:
        """
        Get the results of a simulation.
        
        Args:
            simulation_id: ID of the simulation
            
        Returns:
            Simulation results if completed, None otherwise
        """
        if simulation_id in self._results:
            return self._results[simulation_id]
        
        return None
    
    def list_simulations(self) -> List[Dict[str, Any]]:
        """
        List all simulations.
        
        Returns:
            List of simulation information
        """
        simulations = []
        
        for sim_id, sim in self._simulations.items():
            status = "running" if sim_id in self._running_tasks else "initialized"
            
            if sim_id in self._results:
                status = self._results[sim_id].get("status", status)
            
            simulations.append({
                "simulation_id": sim_id,
                "status": status,
                "created_at": getattr(sim, "created_at", None)
            })
        
        return simulations

# Create a singleton instance
simulation_manager = SimulationManager() 