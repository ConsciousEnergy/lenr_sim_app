import logging
from typing import Dict, List, Optional
from datetime import datetime
import uuid

from ..models.simulation_models import SimulationStatus

logger = logging.getLogger(__name__)

# In-memory database for simulations
# In a production environment, this would be replaced with a real database
_simulations_db: Dict[str, SimulationStatus] = {}

async def save_simulation(simulation: SimulationStatus) -> bool:
    """
    Save a simulation to storage.
    
    Args:
        simulation: The simulation to save
        
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        _simulations_db[simulation.id] = simulation
        return True
    except Exception as e:
        logger.error(f"Error saving simulation: {str(e)}")
        return False

async def update_simulation(simulation: SimulationStatus) -> bool:
    """
    Update an existing simulation in storage.
    
    Args:
        simulation: The simulation to update
        
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        if simulation.id not in _simulations_db:
            logger.warning(f"Simulation {simulation.id} not found for update")
            return False
            
        _simulations_db[simulation.id] = simulation
        return True
    except Exception as e:
        logger.error(f"Error updating simulation: {str(e)}")
        return False

async def get_simulation(simulation_id: str) -> Optional[SimulationStatus]:
    """
    Get a simulation by ID.
    
    Args:
        simulation_id: The ID of the simulation to get
        
    Returns:
        Optional[SimulationStatus]: The simulation if found, None otherwise
    """
    return _simulations_db.get(simulation_id)

async def get_simulations_by_status(
    status: Optional[str] = None,
    limit: int = 10,
    offset: int = 0
) -> List[SimulationStatus]:
    """
    Get simulations filtered by status.
    
    Args:
        status: Optional status to filter by
        limit: Maximum number of simulations to return
        offset: Number of simulations to skip
        
    Returns:
        List[SimulationStatus]: A list of simulations
    """
    simulations = list(_simulations_db.values())
    
    # Filter by status if specified
    if status:
        simulations = [s for s in simulations if s.status == status]
    
    # Sort by creation time (most recent first)
    simulations.sort(key=lambda s: s.created_at, reverse=True)
    
    # Apply pagination
    return simulations[offset:offset+limit]

async def delete_simulation(simulation_id: str) -> bool:
    """
    Delete a simulation by ID.
    
    Args:
        simulation_id: The ID of the simulation to delete
        
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        if simulation_id not in _simulations_db:
            logger.warning(f"Simulation {simulation_id} not found for deletion")
            return False
            
        del _simulations_db[simulation_id]
        return True
    except Exception as e:
        logger.error(f"Error deleting simulation: {str(e)}")
        return False

async def generate_simulation_id() -> str:
    """
    Generate a unique simulation ID.
    
    Returns:
        str: A unique simulation ID
    """
    return str(uuid.uuid4()) 