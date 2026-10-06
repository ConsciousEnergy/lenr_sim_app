"""
Enhanced Unified Physics API for LENR Simulation v2
Implements FastAPI routes for advanced quantum enhancement, lattice dynamics,
fusion process simulations, and the LENR Theory Testbed pipeline.
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends, status
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field, validator
import numpy as np
import asyncio
import logging
from enum import Enum
import uuid
from datetime import datetime

# Import core physics modules
from ...physics_engine.unified_enhancement import UnifiedEnhancementCalculator
from ...physics_engine.lattice_dynamics import LatticeSimulator
from ...physics_engine.fusion_processor import FusionProcessor, ReactionType
from ...physics_engine.constants import get_config, calculate_derived_parameters
from ...physics_engine.unified_lenr_solver import UnifiedLENRSolver
from ...physics_engine.fluid_dynamics_solver import FluidDynamicsSolver, FluidDynamicsParameters
from ...models.simulation_models import SimulationParameters, SimulationResponse
from ...services.simulation_store import SimulationStore
from ...physics_engine.theory_pipeline import get_default_pipeline
from ...utils.json_safe import to_json_safe

# Configure logging
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/physics", tags=["Physics"])

# Input/Output Models
class SimulationConfig(BaseModel):
    """Configuration parameters for simulation."""
    temperature: float = Field(..., description="System temperature in Kelvin", ge=0)
    pressure: float = Field(..., description="System pressure in Pascal", ge=0)
    electron_density: float = Field(..., description="Electron density in m^-3", ge=0)
    lattice_constant: float = Field(..., description="Lattice parameter in meters", gt=0)
    dimensions: tuple[int, int, int] = Field(
        default=(10, 10, 10), 
        description="Lattice dimensions (nx, ny, nz)"
    )
    enhancement_factor: float = Field(
        default=1.0, 
        description="Global enhancement factor",
        ge=0
    )
    time_step: float = Field(
        default=1e-15, 
        description="Simulation time step in seconds",
        gt=0
    )
    max_steps: int = Field(
        default=1000, 
        description="Maximum number of simulation steps",
        ge=1
    )
    
    # Validators
    @validator("dimensions")
    def check_dimensions(cls, v):
        """Validate that dimensions are reasonable."""
        if any(d <= 0 for d in v):
            raise ValueError("All dimensions must be positive")
        if any(d > 50 for d in v):
            raise ValueError("Dimensions too large (max 50)")
        return v

class EnhancementRequest(BaseModel):
    """Request model for quantum enhancement calculations."""
    temperature: float = Field(..., description="Temperature in Kelvin", ge=0)
    electron_density: float = Field(..., description="Electron density in m^-3", ge=0)
    electric_field: float = Field(..., description="Electric field in V/m", ge=0)
    lattice_constant: float = Field(..., description="Lattice parameter in meters", gt=0)

class LatticeRequest(BaseModel):
    """Request model for lattice simulations."""
    config: SimulationConfig
    time_steps: int = Field(default=10, description="Number of time steps to simulate", ge=1, le=1000)
    
class ReactionTypeEnum(str, Enum):
    """Enumeration of supported reaction types in string format."""
    DD = "DD"
    DT = "DT"
    PD = "PD"
    PLI6 = "PLI6"
    DNI = "DNI"
    DPD = "DPD"

class FusionRequest(BaseModel):
    """Request model for fusion calculations."""
    reaction_type: ReactionTypeEnum
    density: float = Field(..., description="Reactant density in m^-3", ge=0)
    temperature: float = Field(..., description="Temperature in Kelvin", ge=0)
    enhancement_factor: Optional[float] = Field(
        default=None, 
        description="Optional enhancement factor override"
    )
    n_events: int = Field(
        default=1000, 
        description="Number of events to simulate",
        ge=1, 
        le=10000
    )

class PowerRequest(BaseModel):
    """Request model for power output calculations."""
    reaction_rates: Dict[ReactionTypeEnum, float] = Field(
        ..., 
        description="Reaction rates for different reaction types"
    )
    volume: float = Field(
        ..., 
        description="Reaction volume in m^3",
        gt=0
    )

# Component initialization
_config = None
_enhancement_calculator = None
_lattice_simulator = None
_fusion_processor = None

def preload_physics_components() -> None:
    """
    Eagerly initialize singleton physics components.

    This avoids first-request latency spikes on endpoints that depend on these
    components (e.g., /api/physics/status, /api/physics/enhancement).
    """
    global _config, _enhancement_calculator, _lattice_simulator, _fusion_processor

    if _config is not None:
        return

    _config = get_config()
    _enhancement_calculator = UnifiedEnhancementCalculator(_config)
    _lattice_simulator = LatticeSimulator(_config)
    _fusion_processor = FusionProcessor(_config)

# Dependency to initialize components
async def get_physics_components():
    """
    Initialize physics components if not already done.
    Returns tuple of (config, enhancement_calculator, lattice_simulator, fusion_processor)
    """
    global _config, _enhancement_calculator, _lattice_simulator, _fusion_processor
    
    if _config is None:
        preload_physics_components()
        
    return _config, _enhancement_calculator, _lattice_simulator, _fusion_processor

@router.post("/initialize")
async def initialize_simulation(
    config: SimulationConfig,
    components = Depends(get_physics_components)
) -> Dict[str, Any]:
    """
    Initialize simulation components with provided configuration.
    
    Args:
        config: Simulation configuration parameters
        
    Returns:
        Dictionary with initialization status and derived parameters
    """
    global _config, _enhancement_calculator, _lattice_simulator, _fusion_processor
    
    try:
        # Update config with user parameters
        user_config = config.dict()
        _config = get_config(user_config)
        
        # Initialize components with new config
        _enhancement_calculator = UnifiedEnhancementCalculator(_config)
        _lattice_simulator = LatticeSimulator(_config)
        _fusion_processor = FusionProcessor(_config)
        
        # Calculate derived parameters
        derived_params = calculate_derived_parameters(_config)
        
        return {
            "status": "initialized",
            "config": {k: v for k, v in _config.items() if k != "constants"}, # Omit constants for brevity
            "derived_parameters": derived_params
        }
    
    except Exception as e:
        logger.error(f"Initialization error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/enhancement")
async def calculate_enhancement(
    request: EnhancementRequest,
    components = Depends(get_physics_components)
) -> Dict[str, Any]:
    """
    Calculate quantum enhancement factors for LENR reactions.
    
    Args:
        request: Enhancement calculation parameters
        
    Returns:
        Dictionary with enhancement factors for various mechanisms
    """
    _, enhancement_calculator, _, _ = components
    
    try:
        result = await enhancement_calculator.calculate_total_enhancement(
            temperature=request.temperature,
            electron_density=request.electron_density,
            electric_field=request.electric_field,
            lattice_constant=request.lattice_constant
        )
        return result
    
    except Exception as e:
        logger.error(f"Enhancement calculation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/lattice/simulate")
async def simulate_lattice(
    request: LatticeRequest,
    components = Depends(get_physics_components)
) -> Dict[str, Any]:
    """
    Run lattice dynamics simulation.
    
    Args:
        request: Lattice simulation parameters
        
    Returns:
        Dictionary with lattice simulation results
    """
    # Initialize with config if needed
    await initialize_simulation(request.config)
    
    # Get components
    _, _, lattice_simulator, _ = components
    
    try:
        # Run simulation
        results = await lattice_simulator.run_simulation(
            steps=request.time_steps,
            dt=request.config.time_step
        )
        
        # Get lattice snapshot at final state
        lattice_snapshot = lattice_simulator.get_lattice_snapshot()
        
        # Calculate phonon modes
        phonon_data = await lattice_simulator.calculate_phonon_modes()
        
        # Combine results
        return {
            "time_evolution": results["time_evolution"],
            "energies": results["energies"],
            "temperatures": results["temperatures"],
            "lattice_state": lattice_snapshot,
            "phonon_modes": phonon_data,
            "metadata": results["metadata"]
        }
    
    except Exception as e:
        logger.error(f"Lattice simulation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/fusion/reaction-rate")
async def calculate_fusion_rate(
    request: FusionRequest,
    components = Depends(get_physics_components)
) -> Dict[str, Any]:
    """
    Calculate fusion reaction rate for given conditions.
    
    Args:
        request: Fusion calculation parameters
        
    Returns:
        Dictionary with reaction rate calculations
    """
    _, _, _, fusion_processor = components
    
    try:
        # Map reaction type from string enum to actual enum
        reaction_type = getattr(ReactionType, request.reaction_type.value)
        
        # Calculate reaction rate
        rate_data = await fusion_processor.calculate_reaction_rate(
            reaction_type=reaction_type,
            density=request.density,
            temperature=request.temperature,
            enhancement_factor=request.enhancement_factor
        )
        
        return rate_data
    
    except Exception as e:
        logger.error(f"Fusion rate calculation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/fusion/products")
async def simulate_fusion_products(
    request: FusionRequest,
    components = Depends(get_physics_components)
) -> Dict[str, Any]:
    """
    Simulate fusion reaction products.
    
    Args:
        request: Fusion simulation parameters
        
    Returns:
        Dictionary with product simulation results
    """
    _, _, _, fusion_processor = components
    
    try:
        # Map reaction type from string enum to actual enum
        reaction_type = getattr(ReactionType, request.reaction_type.value)
        
        # Simulate reaction products
        product_data = await fusion_processor.simulate_reaction_products(
            reaction_type=reaction_type,
            n_events=request.n_events
        )
        
        return product_data
    
    except Exception as e:
        logger.error(f"Fusion product simulation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/fusion/power")
async def calculate_power_output(
    request: PowerRequest,
    components = Depends(get_physics_components)
) -> Dict[str, Any]:
    """
    Calculate power output from fusion reactions.
    
    Args:
        request: Power calculation parameters
        
    Returns:
        Dictionary with power output calculations
    """
    _, _, _, fusion_processor = components
    
    try:
        # Convert string enum keys to actual enum keys
        reaction_rates = {
            getattr(ReactionType, rt_str): rate
            for rt_str, rate in request.reaction_rates.items()
        }
        
        # Calculate power output
        power_data = fusion_processor.calculate_power_output(
            reaction_rates=reaction_rates,
            volume=request.volume
        )
        
        return power_data
    
    except Exception as e:
        logger.error(f"Power calculation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/status")
async def get_physics_status(
    components = Depends(get_physics_components)
) -> Dict[str, Any]:
    """
    Get current status of physics components.
    
    Returns:
        Dictionary with component status information
    """
    config, enhancement_calculator, lattice_simulator, fusion_processor = components
    
    return {
        "initialized": config is not None,
        "components": {
            "enhancement_calculator": "ready" if enhancement_calculator is not None else "not_initialized",
            "lattice_simulator": "ready" if lattice_simulator is not None else "not_initialized",
            "fusion_processor": "ready" if fusion_processor is not None else "not_initialized"
        },
        "temperature": config.get("temperature") if config else None,
        "electron_density": config.get("electron_density") if config else None
    }

# ---------------------------------------------------------------------------
# Theory Testbed Models (Phase 2.3)
# ---------------------------------------------------------------------------

class TheoryConditions(BaseModel):
    """Physical conditions passed to theory modules."""
    temperature: float = Field(300.0, description="Temperature in Kelvin", ge=0)
    pressure: float = Field(101325.0, description="Pressure in Pascal", ge=0)
    electron_density: float = Field(6.8e28, description="Electron density in m⁻³", ge=0)
    electric_field: float = Field(1e6, description="Electric field in V/m", ge=0)
    loading_ratio: float = Field(0.9, description="Hydrogen / metal loading ratio", ge=0, le=1.0)
    surface_roughness: float = Field(5e-9, description="Surface roughness (m)", ge=0)
    gap_width_nm: Optional[float] = Field(None, description="NAE gap width in nm")
    crack_width_nm: Optional[float] = Field(None, description="Crack width in nm")
    oxide_coverage_fraction: Optional[float] = Field(None, description="Oxide coverage 0-1")
    hydrogen_loading_purity: Optional[float] = Field(None, description="H-accessible fraction 0-1")
    phonon_frequency: Optional[float] = Field(None, description="Phonon frequency rad/s")
    material_system: Optional[str] = Field(None, description="Material system e.g. 'pd_d', 'ni_h'")
    coherence_domain_radius_m: Optional[float] = Field(None, description="Coherence domain radius m")
    electrolyte_family: Optional[str] = Field(
        "li",
        description="Electrolyte family (li, na, k, rb, cs, mixed, other)",
    )
    electrolyte_molarity_mol_l: Optional[float] = Field(
        0.3,
        description="Electrolyte molarity in mol/L. Validated window 0.01-1.0.",
        ge=0.0,
    )
    beam_energy_kev: Optional[float] = Field(
        None, ge=0.0,
        description="Optional accelerator beam energy (keV) for ion-track theories.",
    )
    molecular_beam_species: Optional[str] = Field(
        None, description="Optional D1/D2/D3 molecular projectile label.",
    )
    host_material: Optional[str] = Field(
        None, description="Optional host key (palladium, graphite, silicon_carbide, ...).",
    )

class TheoryRunRequest(BaseModel):
    """Request to run one or more theories."""
    conditions: TheoryConditions
    enabled_theories: Optional[List[str]] = Field(
        None, description="Theory IDs to run. If null, run all."
    )
    theory_configs: Optional[Dict[str, Dict[str, Any]]] = Field(
        None, description="Per-theory configuration overrides keyed by theory_id"
    )
    persist_session_id: Optional[str] = Field(
        default=None,
        description="Optional analytics session id for auto-persist. Additive.",
    )
    persist_source: Optional[str] = Field(
        default=None,
        description="Optional persist source label (auto_persist or simulation_campaign).",
    )
    campaign_preset: Optional[str] = Field(
        default=None,
        description="Optional campaign preset name stored on persisted rows. Additive.",
    )
    campaign_tag: Optional[str] = Field(
        default=None,
        description="Optional campaign cell tag stored as parameters.tag. Additive.",
    )
    literature_id: Optional[str] = Field(
        default=None,
        description="Optional literature_baselines id for Q-anchored campaign cells. Additive.",
    )
    claim_tag: Optional[str] = Field(
        default=None,
        description="Optional EMP/null/disputed/contested/speculative literature tag. Additive.",
    )
    open_question_ids: Optional[List[str]] = Field(
        default=None,
        description="Optional EQ-OPEN-* ids this cell is meant to stress. Additive.",
    )

class SingleTheoryRunRequest(BaseModel):
    """Request to run a single theory in isolation."""
    conditions: TheoryConditions
    config: Optional[Dict[str, Any]] = Field(
        None, description="Configuration overrides for this theory"
    )


# ---------------------------------------------------------------------------
# Theory Testbed Endpoints
# ---------------------------------------------------------------------------

@router.get("/theories")
async def list_theories() -> List[Dict[str, Any]]:
    """
    List all registered theory modules with metadata.

    Returns a list of theories including id, name, description,
    configurable parameters, and academic references.
    """
    pipeline = get_default_pipeline()
    return pipeline.list_theories()


@router.post("/theories/run")
async def run_theories(request: TheoryRunRequest) -> Dict[str, Any]:
    """
    Run selected theories against the given physical conditions.

    If ``enabled_theories`` is null, all registered theories are executed.
    Returns combined enhancement factors and a per-theory breakdown.
    """
    pipeline = get_default_pipeline()
    conditions = {
        k: v
        for k, v in request.conditions.dict().items()
        if v is not None
    }
    try:
        result = pipeline.run(
            conditions=conditions,
            enabled_theories=request.enabled_theories,
            theory_configs=request.theory_configs,
        )
        payload = result.to_dict()
        from app.services.persist_runs import persist_theory_pipeline
        persistence = await persist_theory_pipeline(
            request,
            result,
            session_id=request.persist_session_id,
            source=request.persist_source or "auto_persist",
        )
        if persistence:
            transparency = dict(payload.get("analytics_transparency") or {})
            transparency["persistence"] = persistence
            payload["analytics_transparency"] = transparency
        return payload
    except Exception as e:
        logger.error("Theory pipeline run error: %s", str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/theories/{theory_id}/run")
async def run_single_theory(
    theory_id: str, request: SingleTheoryRunRequest
) -> Dict[str, Any]:
    """
    Run a single theory in isolation.

    Path parameter ``theory_id`` must match a registered theory.
    """
    pipeline = get_default_pipeline()
    conditions = {
        k: v
        for k, v in request.conditions.dict().items()
        if v is not None
    }
    try:
        contribution = pipeline.run_single(
            theory_id=theory_id,
            conditions=conditions,
            config=request.config,
        )
        return {
            "theory_id": contribution.theory_id,
            "theory_name": contribution.theory_name,
            "enhancement_factor": float(contribution.enhancement_factor),
            "reaction_rate_modifier": float(contribution.reaction_rate_modifier),
            "energy_output_watts": float(contribution.energy_output_watts),
            "observables": to_json_safe(contribution.observables),
            "parameters_used": to_json_safe(contribution.parameters_used),
            "is_applicable": bool(contribution.is_applicable),
            "confidence": float(contribution.confidence),
            "references": list(contribution.references),
        }
    except KeyError:
        raise HTTPException(
            status_code=404,
            detail=f"Theory '{theory_id}' not found. Use GET /theories to list available theories.",
        )
    except Exception as e:
        logger.error("Single theory run error: %s", str(e))
        raise HTTPException(status_code=500, detail=str(e))


# ---------------------------------------------------------------------------
# Existing endpoints (simulation store, fluid dynamics, etc.)
# ---------------------------------------------------------------------------

def get_simulation_store():
    return SimulationStore()

@router.get("/simulations/{simulation_id}/fluid-dynamics")
async def get_fluid_dynamics_data(
    simulation_id: str,
    sim_store: SimulationStore = Depends(get_simulation_store)
) -> Dict[str, Any]:
    """
    Get fluid dynamics data for a specific simulation.
    """
    simulation = sim_store.get_simulation(simulation_id)
    if not simulation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Simulation with ID {simulation_id} not found"
        )
    
    if simulation.status != "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Simulation {simulation_id} has not completed yet"
        )
    
    # Get simulation parameters
    parameters = simulation.parameters
    
    try:
        # Create a fluid dynamics solver based on simulation parameters
        fluid_params = FluidDynamicsParameters(
            nx=50,  # Using a smaller grid for performance
            ny=50,
            nz=50,
            # Adjust density based on simulation pressure
            density=1.0 + parameters.pressure / 101325 * 0.1,
            # Use parameters to determine fluid properties
            kinematic_viscosity=0.01 * (1.0 + parameters.temperature / 1000.0)
        )
        
        solver = FluidDynamicsSolver(fluid_params)
        
        # Set external force based on temperature gradient in the simulation
        if hasattr(simulation.results, "temperature") and len(simulation.results.temperature) > 1:
            # Approximate temperature gradient for force direction
            temp_values = simulation.results.temperature
            max_temp_idx = np.argmax(temp_values)
            force_magnitude = 0.001 * (max(temp_values) - min(temp_values)) / max(1, max(temp_values))
            
            # Apply force in x direction as an example
            solver.set_external_force((force_magnitude, 0, 0))
        
        # Create a simple obstacle in the center representing a catalyst or lattice
        x, y, z = np.meshgrid(
            np.arange(fluid_params.nx),
            np.arange(fluid_params.ny),
            np.arange(fluid_params.nz),
            indexing='ij'
        )
        
        center_x, center_y, center_z = fluid_params.nx // 2, fluid_params.ny // 2, fluid_params.nz // 2
        radius = min(fluid_params.nx, fluid_params.ny, fluid_params.nz) // 5
        
        # Create a spherical obstacle (True for fluid, False for solid)
        obstacle_mask = ((x - center_x)**2 + (y - center_y)**2 + (z - center_z)**2 > radius**2)
        solver.set_obstacle(obstacle_mask)
        
        # Run the simulation for a few steps
        results = solver.run(num_steps=100)
        
        # Convert numpy arrays to Python lists for JSON serialization
        velocity_field = []
        for component in results["velocity"]:
            velocity_field.append(component.tolist())
            
        density_field = results["density"].tolist()
        
        # Get vorticity field for visualization
        vorticity_field = []
        vorticity = solver.get_vorticity()
        for component in vorticity:
            vorticity_field.append(component.tolist())
        
        # Get summary statistics
        summary = solver.get_summary()
        
        # Prepare the response
        response = {
            "simulation_id": simulation_id,
            "grid_size": [fluid_params.nx, fluid_params.ny, fluid_params.nz],
            "velocity": velocity_field,
            "density": density_field,
            "vorticity": vorticity_field,
            "max_velocity": float(summary["velocity"]["max"]),
            "mean_velocity": float(summary["velocity"]["mean"]),
            "reynolds_number": float(summary["reynolds_number"]),
            "kinetic_energy": float(summary["velocity"]["kinetic_energy"])
        }
        
        return response
        
    except Exception as e:
        logger.error(f"Error generating fluid dynamics data: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate fluid dynamics data: {str(e)}"
        ) 