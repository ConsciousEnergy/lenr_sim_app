import logging
from typing import Dict, List, Optional, Any
from datetime import datetime
import uuid
from enum import Enum
from pydantic import BaseModel

logger = logging.getLogger(__name__)

class SimulationStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class SimulationMetadata(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    status: SimulationStatus = SimulationStatus.PENDING
    created_at: str
    updated_at: str
    parameters: Dict[str, Any]
    progress: float = 0.0
    error_message: Optional[str] = None

# In-memory database for simulations
# In a production environment, this would be replaced with a proper database
_simulations_db: Dict[str, SimulationMetadata] = {}

def generate_simulation_id() -> str:
    """
    Generate a unique simulation ID.
    
    Returns:
        str: A unique simulation ID
    """
    return str(uuid.uuid4())

async def save_simulation(
    name: str,
    parameters: Dict[str, Any],
    description: Optional[str] = None
) -> SimulationMetadata:
    """
    Save a new simulation to storage.
    
    Args:
        name: Name of the simulation
        parameters: Simulation parameters
        description: Optional description of the simulation
        
    Returns:
        SimulationMetadata: The created simulation metadata
    """
    simulation_id = generate_simulation_id()
    timestamp = datetime.utcnow().isoformat()
    
    simulation = SimulationMetadata(
        id=simulation_id,
        name=name,
        description=description,
        status=SimulationStatus.PENDING,
        created_at=timestamp,
        updated_at=timestamp,
        parameters=parameters
    )
    
    _simulations_db[simulation_id] = simulation
    logger.info(f"Created new simulation with ID: {simulation_id}")
    return simulation

async def get_simulation(simulation_id: str) -> Optional[SimulationMetadata]:
    """
    Get simulation metadata by ID.
    
    Args:
        simulation_id: The ID of the simulation to retrieve
        
    Returns:
        Optional[SimulationMetadata]: The simulation metadata if found, None otherwise
    """
    try:
        if simulation_id not in _simulations_db:
            logger.warning(f"Simulation with ID {simulation_id} not found")
            return None
            
        return _simulations_db[simulation_id]
    except Exception as e:
        logger.error(f"Error retrieving simulation {simulation_id}: {str(e)}")
        return None

async def update_simulation(
    simulation_id: str, 
    updates: Dict[str, Any]
) -> Optional[SimulationMetadata]:
    """
    Update simulation metadata.
    
    Args:
        simulation_id: The ID of the simulation to update
        updates: Dictionary containing updates to apply
        
    Returns:
        Optional[SimulationMetadata]: The updated simulation if successful, None otherwise
    """
    try:
        if simulation_id not in _simulations_db:
            logger.warning(f"Cannot update: Simulation with ID {simulation_id} not found")
            return None
            
        simulation = _simulations_db[simulation_id]
        
        # Apply updates to mutable copy
        simulation_dict = simulation.dict()
        simulation_dict.update(updates)
        simulation_dict["updated_at"] = datetime.utcnow().isoformat()
        
        # Create new instance with updates
        updated_simulation = SimulationMetadata(**simulation_dict)
        _simulations_db[simulation_id] = updated_simulation
        
        logger.info(f"Updated simulation {simulation_id}")
        return updated_simulation
    except Exception as e:
        logger.error(f"Error updating simulation {simulation_id}: {str(e)}")
        return None

async def delete_simulation(simulation_id: str) -> bool:
    """
    Delete a simulation.
    
    Args:
        simulation_id: The ID of the simulation to delete
        
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        if simulation_id not in _simulations_db:
            logger.warning(f"Cannot delete: Simulation with ID {simulation_id} not found")
            return False
            
        del _simulations_db[simulation_id]
        logger.info(f"Deleted simulation {simulation_id}")
        return True
    except Exception as e:
        logger.error(f"Error deleting simulation {simulation_id}: {str(e)}")
        return False

async def list_simulations() -> List[SimulationMetadata]:
    """
    List all simulations.
    
    Returns:
        List[SimulationMetadata]: List of all simulations
    """
    try:
        return list(_simulations_db.values())
    except Exception as e:
        logger.error(f"Error listing simulations: {str(e)}")
        return []

async def update_simulation_status(
    simulation_id: str,
    status: SimulationStatus,
    progress: Optional[float] = None,
    error_message: Optional[str] = None
) -> Optional[SimulationMetadata]:
    """
    Update the status of a simulation.
    
    Args:
        simulation_id: The ID of the simulation
        status: The new status
        progress: Optional progress value (0-100)
        error_message: Optional error message for failed simulations
        
    Returns:
        Optional[SimulationMetadata]: The updated simulation if successful, None otherwise
    """
    updates = {"status": status}
    
    if progress is not None:
        updates["progress"] = max(0.0, min(100.0, progress))
        
    if error_message is not None:
        updates["error_message"] = error_message
        
    return await update_simulation(simulation_id, updates) 