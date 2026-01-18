"""
Shared Simulation Service

Business logic for managing shared simulations, including saving, searching,
and matching algorithms for finding similar experimental conditions.
"""

from typing import List, Optional, Dict, Any
from datetime import datetime
import logging
import math

from app.models.simulation_models import (
    SharedSimulation, MatchResult, SimulationSearchParams,
    MaterialType, ReactantType
)

logger = logging.getLogger(__name__)


class SharedSimulationService:
    """
    Service for managing shared simulations.
    
    Currently uses in-memory storage. Will be extended with SQLite/PostgreSQL
    for persistent storage in production.
    """
    
    def __init__(self):
        """Initialize the service with in-memory storage"""
        self._simulations: Dict[str, SharedSimulation] = {}
        logger.info("SharedSimulationService initialized")
    
    async def save_simulation(self, simulation: SharedSimulation) -> SharedSimulation:
        """
        Save a simulation.
        
        If simulation has an ID that already exists, updates it.
        Otherwise creates a new one.
        """
        # Update timestamp
        simulation.updated_at = datetime.utcnow()
        
        # If new simulation, ensure created_at is set
        if simulation.id not in self._simulations:
            simulation.created_at = datetime.utcnow()
        
        self._simulations[simulation.id] = simulation
        logger.info(f"Saved simulation: {simulation.id} ({simulation.name})")
        
        return simulation
    
    async def get_simulation(self, simulation_id: str) -> Optional[SharedSimulation]:
        """Get a simulation by ID"""
        return self._simulations.get(simulation_id)
    
    async def get_user_simulations(
        self,
        session_id: str,
        limit: int = 50,
        offset: int = 0
    ) -> List[SharedSimulation]:
        """Get all simulations for a user (by session_id)"""
        user_sims = [
            s for s in self._simulations.values()
            if s.session_id == session_id
        ]
        
        # Sort by created_at (newest first), with defensive handling for None
        from datetime import datetime
        user_sims.sort(
            key=lambda x: x.created_at if x.created_at is not None else datetime.min,
            reverse=True
        )
        
        return user_sims[offset:offset + limit]
    
    async def update_sharing_status(
        self,
        simulation_id: str,
        session_id: str,
        is_public: bool
    ) -> Optional[SharedSimulation]:
        """Update the sharing status of a simulation (only if user owns it)"""
        simulation = self._simulations.get(simulation_id)
        
        if not simulation:
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="Simulation not found")
        
        # Verify ownership
        if simulation.session_id != session_id:
            from fastapi import HTTPException
            logger.warning(f"Access denied: session_id mismatch for simulation {simulation_id}")
            raise HTTPException(status_code=403, detail="Access denied: simulation belongs to different user")
        
        simulation.is_public = is_public
        simulation.updated_at = datetime.utcnow()
        
        logger.info(f"Updated sharing status for {simulation_id}: is_public={is_public}")
        return simulation
    
    async def search_simulations(
        self,
        search_params: SimulationSearchParams
    ) -> List[SharedSimulation]:
        """Search simulations based on parameters"""
        results = []
        
        for sim in self._simulations.values():
            # Filter by public status
            if search_params.is_public is not None:
                if sim.is_public != search_params.is_public:
                    continue
            
            # Filter by material type
            if search_params.material_type and sim.material_type != search_params.material_type:
                continue
            
            # Filter by reactant
            if search_params.reactant and sim.reactant != search_params.reactant:
                continue
            
            # Filter by temperature range
            if search_params.min_temperature_k and sim.temperature_k < search_params.min_temperature_k:
                continue
            if search_params.max_temperature_k and sim.temperature_k > search_params.max_temperature_k:
                continue
            
            # Filter by excess heat range
            if search_params.min_excess_heat and sim.excess_heat_watts < search_params.min_excess_heat:
                continue
            if search_params.max_excess_heat and sim.excess_heat_watts > search_params.max_excess_heat:
                continue
            
            # Filter by tags (if any tag matches)
            if search_params.tags:
                if not any(tag in sim.tags for tag in search_params.tags):
                    continue
            
            results.append(sim)
        
        # Sort by created_at (newest first)
        results.sort(key=lambda x: x.created_at, reverse=True)
        
        # Apply pagination
        return results[search_params.offset:search_params.offset + search_params.limit]
    
    async def find_best_matches(
        self,
        material_type: Optional[MaterialType] = None,
        reactant: Optional[ReactantType] = None,
        temperature_k: Optional[float] = None,
        pressure_pa: Optional[float] = None,
        loading_ratio: Optional[float] = None,
        tolerance: float = 0.1,
        limit: int = 10
    ) -> List[MatchResult]:
        """
        Find simulations with similar parameters for experimental replication.
        
        Matching criteria:
        - Material type: Exact match required
        - Temperature, pressure, loading ratio: Within tolerance
        - Excess heat: Similarity score based on relative difference
        
        Returns list of MatchResult sorted by similarity_score (highest first).
        """
        if material_type is None:
            logger.warning("find_best_matches called without material_type - required for meaningful matches")
            return []
        
        matches = []
        
        for sim in self._simulations.values():
            # Must be public to be matched
            if not sim.is_public:
                continue
            
            # Material type must match exactly
            if sim.material_type != material_type:
                continue
            
            # Reactant must match if specified
            if reactant and sim.reactant != reactant:
                continue
            
            # Calculate similarity score
            similarity = 1.0
            matching_criteria = {}
            differences = {}
            
            # Temperature matching (within tolerance)
            if temperature_k is not None:
                temp_diff = abs(sim.temperature_k - temperature_k) / max(temperature_k, 1.0)
                if temp_diff <= tolerance:
                    temp_similarity = 1.0 - (temp_diff / tolerance)
                    similarity *= temp_similarity
                    matching_criteria['temperature'] = True
                    differences['temperature_k'] = sim.temperature_k - temperature_k
                else:
                    continue  # Outside tolerance, skip this simulation
            
            # Pressure matching (within tolerance)
            if pressure_pa is not None:
                pressure_diff = abs(sim.pressure_pa - pressure_pa) / max(pressure_pa, 1.0)
                if pressure_diff <= tolerance:
                    pressure_similarity = 1.0 - (pressure_diff / tolerance)
                    similarity *= pressure_similarity
                    matching_criteria['pressure'] = True
                    differences['pressure_pa'] = sim.pressure_pa - pressure_pa
                else:
                    continue
            
            # Loading ratio matching (within tolerance)
            if loading_ratio is not None:
                loading_diff = abs(sim.loading_ratio - loading_ratio)
                if loading_diff <= tolerance:
                    loading_similarity = 1.0 - (loading_diff / tolerance)
                    similarity *= loading_similarity
                    matching_criteria['loading_ratio'] = True
                    differences['loading_ratio'] = sim.loading_ratio - loading_ratio
                else:
                    continue
            
            # Only include matches with similarity > 0
            if similarity > 0:
                matches.append(MatchResult(
                    simulation=sim,
                    similarity_score=similarity,
                    matching_criteria=matching_criteria,
                    differences=differences
                ))
        
        # Sort by similarity score (highest first)
        matches.sort(key=lambda x: x.similarity_score, reverse=True)
        
        return matches[:limit]


# Global service instance
_simulation_service: Optional[SharedSimulationService] = None


def get_simulation_service() -> SharedSimulationService:
    """Dependency function for FastAPI to get the simulation service"""
    global _simulation_service
    if _simulation_service is None:
        _simulation_service = SharedSimulationService()
    return _simulation_service
