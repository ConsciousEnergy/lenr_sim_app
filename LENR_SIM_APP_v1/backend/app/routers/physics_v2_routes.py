"""
API Routes for LENR Physics Engine V2
Implements endpoints for quantum enhancement calculations,
lattice dynamics, and fusion processes.
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
import numpy as np
from ..physics_engine.unified_enhancement import UnifiedEnhancementCalculator
from ..physics_engine.lattice_dynamics import LatticeSimulator
from ..physics_engine.fusion_processor import FusionProcessor, ReactionType
from ..physics_engine.constants import get_config, calculate_derived_parameters
import asyncio
import logging

# Configure logging
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(
    prefix="/api/v2/physics",
    tags=["physics-v2"]
)

# Input/Output Models
class SimulationConfig(BaseModel):
    """Configuration parameters for simulation."""
    temperature: float = Field(..., description="System temperature in Kelvin")
    pressure: float = Field(..., description="System pressure in Pascal")
    electron_density: float = Field(..., description="Electron density in m^-3")
    lattice_constant: float = Field(..., description="Lattice parameter in meters")
    dimensions: tuple[int, int, int] = Field(default=(10, 10, 10), 
                                           description="Lattice dimensions")
    enhancement_factor: float = Field(default=1.0, 
                                    description="Global enhancement factor")
    time_step: float = Field(default=1e-15, 
                            description="Simulation time step in seconds")
    max_steps: int = Field(default=1000, 
                          description="Maximum number of simulation steps")

class EnhancementRequest(BaseModel):
    """Request model for enhancement calculations."""
    temperature: float
    electron_density: float
    electric_field: float
    lattice_constant: float

class LatticeRequest(BaseModel):
    """Request model for lattice calculations."""
    config: SimulationConfig
    time_steps: int = Field(default=1, description="Number of time steps to simulate")

class FusionRequest(BaseModel):
    """Request model for fusion calculations."""
    reaction_type: str
    density: float
    temperature: float
    n_events: int = Field(default=1000, description="Number of events to simulate")

# Initialize components
enhancement_calculator = UnifiedEnhancementCalculator()
lattice_simulator = None  # Will be initialized with config
fusion_processor = None   # Will be initialized with config

@router.post("/initialize")
async def initialize_simulation(config: SimulationConfig) -> Dict[str, Any]:
    """Initialize simulation components with configuration."""
    global lattice_simulator, fusion_processor
    
    try:
        # Create configuration dictionary
        sim_config = get_config({
            "temperature": config.temperature,
            "pressure": config.pressure,
            "electron_density": config.electron_density,
            "lattice_constant": config.lattice_constant,
            "dimensions": config.dimensions,
            "enhancement_factor": config.enhancement_factor,
            "time_step": config.time_step,
            "max_steps": config.max_steps
        })
        
        # Initialize components
        lattice_simulator = LatticeSimulator(sim_config)
        fusion_processor = FusionProcessor(sim_config)
        
        # Calculate derived parameters
        derived_params = calculate_derived_parameters(sim_config)
        
        return {
            "status": "initialized",
            "config": sim_config,
            "derived_parameters": derived_params
        }
    
    except Exception as e:
        logger.error(f"Initialization error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/enhancement/calculate")
async def calculate_enhancement(request: EnhancementRequest) -> Dict[str, Any]:
    """Calculate quantum enhancement factors."""
    try:
        return await enhancement_calculator.calculate_total_enhancement(
            temperature=request.temperature,
            electron_density=request.electron_density,
            electric_field=request.electric_field,
            lattice_constant=request.lattice_constant
        )
    
    except Exception as e:
        logger.error(f"Enhancement calculation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/lattice/simulate")
async def simulate_lattice(request: LatticeRequest) -> Dict[str, Any]:
    """Run lattice dynamics simulation."""
    global lattice_simulator
    
    try:
        if lattice_simulator is None:
            # Initialize with provided config if not already initialized
            await initialize_simulation(request.config)
        
        results = []
        for _ in range(request.time_steps):
            # Update lattice state
            state = await lattice_simulator.update_lattice_state(
                request.config.time_step
            )
            results.append(state)
        
        # Calculate phonon modes
        phonon_data = await lattice_simulator.calculate_phonon_modes()
        
        return {
            "time_evolution": results,
            "phonon_modes": phonon_data
        }
    
    except Exception as e:
        logger.error(f"Lattice simulation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/fusion/simulate")
async def simulate_fusion(request: FusionRequest) -> Dict[str, Any]:
    """Simulate fusion reactions and calculate products."""
    global fusion_processor
    
    try:
        if fusion_processor is None:
            raise HTTPException(
                status_code=400,
                detail="Fusion processor not initialized. Call /initialize first."
            )
        
        # Get reaction type
        try:
            reaction_type = ReactionType[request.reaction_type.upper()]
        except KeyError:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid reaction type: {request.reaction_type}"
            )
        
        # Calculate reaction rate
        rate_data = await fusion_processor.calculate_reaction_rate(
            reaction_type=reaction_type,
            density=request.density,
            temperature=request.temperature
        )
        
        # Simulate reaction products
        product_data = await fusion_processor.simulate_reaction_products(
            reaction_type=reaction_type,
            n_events=request.n_events
        )
        
        # Calculate power output
        power_data = fusion_processor.calculate_power_output(
            reaction_rates={reaction_type: rate_data["total_rate"]},
            volume=1e-6  # Default volume, can be made configurable
        )
        
        return {
            "reaction_rate": rate_data,
            "products": product_data,
            "power_output": power_data
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Fusion simulation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/status")
async def get_simulation_status() -> Dict[str, Any]:
    """Get current status of simulation components."""
    return {
        "enhancement_calculator": "ready",
        "lattice_simulator": "ready" if lattice_simulator is not None else "not_initialized",
        "fusion_processor": "ready" if fusion_processor is not None else "not_initialized"
    } 