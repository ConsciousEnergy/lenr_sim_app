import logging
from typing import Dict, Any, Optional, List
import json
from datetime import datetime

logger = logging.getLogger(__name__)

# In-memory database for results
# In a production environment, this would be replaced with a proper database
_results_db: Dict[str, Dict[str, Any]] = {}

async def save_results(simulation_id: str, results: Dict[str, Any]) -> bool:
    """
    Save simulation results.
    
    Args:
        simulation_id: The ID of the simulation
        results: The simulation results data
        
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        # Add metadata
        results_with_metadata = {
            "data": results,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }
        
        _results_db[simulation_id] = results_with_metadata
        logger.info(f"Saved results for simulation {simulation_id}")
        return True
    except Exception as e:
        logger.error(f"Error saving results for simulation {simulation_id}: {str(e)}")
        return False

async def get_results(simulation_id: str) -> Optional[Dict[str, Any]]:
    """
    Get results for a simulation.
    
    Args:
        simulation_id: The ID of the simulation
        
    Returns:
        Optional[Dict[str, Any]]: The simulation results if found, None otherwise
    """
    try:
        if simulation_id not in _results_db:
            logger.warning(f"Results for simulation {simulation_id} not found")
            return None
            
        return _results_db[simulation_id]
    except Exception as e:
        logger.error(f"Error retrieving results for simulation {simulation_id}: {str(e)}")
        return None

async def delete_results(simulation_id: str) -> bool:
    """
    Delete results for a simulation.
    
    Args:
        simulation_id: The ID of the simulation
        
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        if simulation_id not in _results_db:
            logger.warning(f"Cannot delete: Results for simulation {simulation_id} not found")
            return False
            
        del _results_db[simulation_id]
        logger.info(f"Deleted results for simulation {simulation_id}")
        return True
    except Exception as e:
        logger.error(f"Error deleting results for simulation {simulation_id}: {str(e)}")
        return False

async def update_partial_results(simulation_id: str, partial_results: Dict[str, Any]) -> bool:
    """
    Update partial results for a simulation in progress.
    Useful for tracking simulation progress and intermediate results.
    
    Args:
        simulation_id: The ID of the simulation
        partial_results: The partial results to update
        
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        existing_results = await get_results(simulation_id)
        
        if existing_results is None:
            # If no results exist yet, create new entry
            return await save_results(simulation_id, partial_results)
            
        # Get existing data and merge with new partial results
        existing_data = existing_results.get("data", {})
        
        # For nested dictionaries, we update recursively
        def deep_update(source: Dict, updates: Dict) -> Dict:
            for key, value in updates.items():
                if key in source and isinstance(source[key], dict) and isinstance(value, dict):
                    source[key] = deep_update(source[key], value)
                else:
                    source[key] = value
            return source
            
        updated_data = deep_update(existing_data, partial_results)
        
        # Update the results with merged data
        existing_results["data"] = updated_data
        existing_results["updated_at"] = datetime.utcnow().isoformat()
        
        _results_db[simulation_id] = existing_results
        logger.info(f"Updated partial results for simulation {simulation_id}")
        return True
    except Exception as e:
        logger.error(f"Error updating partial results for simulation {simulation_id}: {str(e)}")
        return False

async def list_results() -> List[str]:
    """
    List all simulation IDs with saved results.
    
    Returns:
        List[str]: List of simulation IDs with saved results
    """
    try:
        return list(_results_db.keys())
    except Exception as e:
        logger.error(f"Error listing results: {str(e)}")
        return []

async def get_result_summary(simulation_id: str) -> Optional[Dict[str, Any]]:
    """
    Get a summary of results without the full data payload.
    
    Args:
        simulation_id: The ID of the simulation
        
    Returns:
        Optional[Dict[str, Any]]: Summary of the simulation results if found, None otherwise
    """
    try:
        results = await get_results(simulation_id)
        if results is None:
            return None
            
        # Create a summary that excludes the potentially large data payload
        summary = {
            "simulation_id": simulation_id,
            "created_at": results.get("created_at", ""),
            "updated_at": results.get("updated_at", ""),
            "has_results": True
        }
        
        # Add some metadata about the results if available
        data = results.get("data", {})
        if isinstance(data, dict):
            # Include size information
            summary["data_keys"] = list(data.keys())
            summary["data_size"] = len(json.dumps(data))
            
        return summary
    except Exception as e:
        logger.error(f"Error getting result summary for simulation {simulation_id}: {str(e)}")
        return None 