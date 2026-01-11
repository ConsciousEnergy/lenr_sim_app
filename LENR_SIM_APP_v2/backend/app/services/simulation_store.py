"""
Simulation Store Service for LENR Simulation v2
Manages storage and retrieval of simulation data.
"""

from typing import Dict, List, Optional, Any
from datetime import datetime
import logging
import json
import os
from pathlib import Path

# Set up logging
logger = logging.getLogger(__name__)

class SimulationStore:
    """
    Service for storing and retrieving simulation data.
    In a production environment, this would use a database or other persistent storage.
    For now, it uses in-memory storage with optional file persistence.
    """
    
    def __init__(self, data_dir: Optional[str] = None):
        """
        Initialize the simulation store.
        
        Args:
            data_dir: Optional directory path for persisting simulation data
        """
        self.simulations: Dict[str, Dict[str, Any]] = {}
        self.data_dir = data_dir
        
        if data_dir:
            os.makedirs(data_dir, exist_ok=True)
            logger.info(f"Initialized SimulationStore with data directory: {data_dir}")
        else:
            logger.info("Initialized SimulationStore with in-memory storage only")
    
    async def create_simulation(self, simulation_data: Dict[str, Any]) -> str:
        """
        Create a new simulation record.
        
        Args:
            simulation_data: Dictionary containing simulation data
            
        Returns:
            Simulation ID
        """
        simulation_id = simulation_data["id"]
        self.simulations[simulation_id] = simulation_data
        
        if self.data_dir:
            await self._persist_simulation(simulation_id)
        
        logger.info(f"Created simulation with ID: {simulation_id}")
        return simulation_id
    
    async def get_simulation(self, simulation_id: str) -> Optional[Dict[str, Any]]:
        """
        Get a simulation by ID.
        
        Args:
            simulation_id: Simulation ID
            
        Returns:
            Simulation data if found, None otherwise
        """
        if simulation_id in self.simulations:
            return self.simulations[simulation_id]
        
        if self.data_dir:
            # Try to load from file if not in memory
            data = await self._load_simulation(simulation_id)
            if data:
                self.simulations[simulation_id] = data
                return data
        
        logger.warning(f"Simulation not found: {simulation_id}")
        return None
    
    async def update_simulation(self, simulation_id: str, simulation_data: Dict[str, Any]) -> bool:
        """
        Update an existing simulation.
        
        Args:
            simulation_id: Simulation ID
            simulation_data: Updated simulation data
            
        Returns:
            True if successful, False otherwise
        """
        if simulation_id not in self.simulations:
            return False
        
        self.simulations[simulation_id] = simulation_data
        
        if self.data_dir:
            await self._persist_simulation(simulation_id)
        
        logger.info(f"Updated simulation: {simulation_id}")
        return True
    
    async def delete_simulation(self, simulation_id: str) -> bool:
        """
        Delete a simulation.
        
        Args:
            simulation_id: Simulation ID
            
        Returns:
            True if successful, False otherwise
        """
        if simulation_id not in self.simulations:
            return False
        
        del self.simulations[simulation_id]
        
        if self.data_dir:
            # Also delete persisted file
            file_path = Path(self.data_dir) / f"{simulation_id}.json"
            if file_path.exists():
                file_path.unlink()
        
        logger.info(f"Deleted simulation: {simulation_id}")
        return True
    
    async def list_simulations(self) -> List[Dict[str, Any]]:
        """
        List all simulations.
        
        Returns:
            List of simulation data
        """
        return list(self.simulations.values())
    
    async def _persist_simulation(self, simulation_id: str) -> None:
        """
        Persist a simulation to disk.
        
        Args:
            simulation_id: Simulation ID
        """
        if not self.data_dir:
            return
        
        file_path = Path(self.data_dir) / f"{simulation_id}.json"
        
        try:
            # Convert datetime objects to ISO format strings
            data = self.simulations[simulation_id].copy()
            if "createdAt" in data and isinstance(data["createdAt"], datetime):
                data["createdAt"] = data["createdAt"].isoformat()
            
            with open(file_path, 'w') as f:
                json.dump(data, f, indent=2)
        except Exception as e:
            logger.error(f"Error persisting simulation {simulation_id}: {e}")
    
    async def _load_simulation(self, simulation_id: str) -> Optional[Dict[str, Any]]:
        """
        Load a simulation from disk.
        
        Args:
            simulation_id: Simulation ID
            
        Returns:
            Simulation data if found, None otherwise
        """
        if not self.data_dir:
            return None
        
        file_path = Path(self.data_dir) / f"{simulation_id}.json"
        
        if not file_path.exists():
            return None
        
        try:
            with open(file_path, 'r') as f:
                data = json.load(f)
            
            # Convert ISO format strings back to datetime objects
            if "createdAt" in data and isinstance(data["createdAt"], str):
                data["createdAt"] = datetime.fromisoformat(data["createdAt"])
            
            return data
        except Exception as e:
            logger.error(f"Error loading simulation {simulation_id}: {e}")
            return None

# Instantiate a global store (will be used as a dependency in FastAPI)
simulation_store = SimulationStore()

def get_simulation_store() -> SimulationStore:
    """Dependency for getting the simulation store."""
    return simulation_store 