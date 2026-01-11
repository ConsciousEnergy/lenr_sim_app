"""
Simulation Data Models for LENR Simulation v2
Defines Pydantic models for simulation parameters and responses.
"""

from pydantic import BaseModel, Field, validator, PositiveFloat, NonNegativeFloat, PositiveInt
from typing import Dict, List, Optional, Any, Tuple, Union, Literal, Annotated
from enum import Enum
from datetime import datetime
import uuid

class LatticeType(str, Enum):
    """Enumeration of supported lattice materials."""
    PALLADIUM = "palladium"
    NICKEL = "nickel"
    TITANIUM = "titanium"

class TunnellingModel(str, Enum):
    """Enumeration of supported quantum tunnelling models."""
    WKB = "WKB"
    GAMOW = "Gamow"
    FULL_QUANTUM = "full_quantum"

class ScreeningModel(str, Enum):
    """Enumeration of supported electron screening models."""
    STATIC = "static"
    DYNAMIC = "dynamic"
    HUBBARD = "hubbard"

class SimulationParameters(BaseModel):
    """Parameters for a LENR simulation"""
    
    # Reactor configuration
    reactor_temperature: Annotated[float, Field(ge=0, le=1500)] = Field(
        ..., description="Initial reactor temperature in Celsius"
    )
    reactor_pressure: Annotated[float, Field(ge=0, le=100)] = Field(
        ..., description="Initial reactor pressure in bars"
    )
    reactor_volume: Annotated[float, Field(gt=0, le=10)] = Field(
        ..., description="Reactor volume in liters"
    )
    
    # Material properties
    material_type: str = Field(
        ..., description="Type of material (e.g., 'nickel', 'palladium')"
    )
    lattice_constant: Annotated[float, Field(gt=0)] = Field(
        ..., description="Lattice constant in angstroms"
    )
    loading_ratio: Annotated[float, Field(ge=0, le=1)] = Field(
        ..., description="Loading ratio of hydrogen/deuterium in metal lattice"
    )
    
    # Simulation configuration
    simulation_duration: Annotated[int, Field(ge=1, le=86400)] = Field(
        ..., description="Simulation duration in seconds"
    )
    time_step: Annotated[float, Field(gt=0, le=1)] = Field(
        0.1, description="Time step for simulation in seconds"
    )
    
    # Additional parameters (optional)
    input_power: Annotated[float, Field(ge=0)] = Field(
        0.0, description="Input power in watts"
    )
    catalysts: Optional[List[str]] = Field(
        None, description="List of catalysts used"
    )
    additional_parameters: Optional[Dict[str, Union[float, str, bool]]] = Field(
        None, description="Additional custom parameters"
    )
    
    @validator("material_type")
    def validate_material_type(cls, v):
        allowed_materials = ["nickel", "palladium", "titanium", "custom"]
        if v.lower() not in allowed_materials:
            raise ValueError(f"Material type must be one of: {', '.join(allowed_materials)}")
        return v.lower()

class SimulationRequest(BaseModel):
    """Request to create a new simulation"""
    parameters: SimulationParameters

class SimulationResponse(BaseModel):
    """Response model for simulation operations."""
    id: str = Field(..., alias="simulation_id")
    status: str
    message: str
    created_at: Optional[datetime] = None
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "id": "550e8400-e29b-41d4-a716-446655440000",
                "status": "success",
                "message": "Simulation created successfully",
                "created_at": "2023-04-20T10:30:00"
            }
        },
        "populate_by_name": True
    }

class SimulationMetrics(BaseModel):
    """Key performance metrics from a simulation."""
    excess_heat: float = Field(..., description="Excess heat in Watts")
    cop: float = Field(..., description="Coefficient of Performance")
    reaction_rate: float = Field(..., description="Reaction rate in events per second")
    energy_density: float = Field(..., description="Energy density in Joules per cubic centimeter")
    power_density: float = Field(..., description="Power density in Watts per cubic centimeter")

class TimeSeriesData(BaseModel):
    """Time series data from simulation."""
    time: List[float] = Field(..., description="Time points in seconds")
    temperature: List[float] = Field(..., description="Temperature values in Kelvin")
    pressure: List[float] = Field(..., description="Pressure values in Pascal")
    loading_ratio: List[float] = Field(..., description="Dynamic loading ratio")
    excess_power: List[float] = Field(..., description="Excess power in Watts")
    
    @validator('temperature', 'pressure', 'loading_ratio', 'excess_power')
    def validate_length(cls, v, values):
        if 'time' in values and len(v) != len(values['time']):
            raise ValueError(f"Length of data ({len(v)}) must match length of time ({len(values['time'])})")
        return v

class LatticeVisualizationData(BaseModel):
    """Data for visualizing lattice structure and dynamics."""
    positions: List[List[float]] = Field(..., description="Atom positions [x,y,z]")
    elements: List[str] = Field(..., description="Element symbols")
    displacements: Optional[List[List[float]]] = Field(None, description="Atom displacements [dx,dy,dz]")
    connectivity: Optional[List[List[int]]] = Field(None, description="Bond connectivity matrix")
    energy_sites: Optional[List[List[float]]] = Field(None, description="Energy hotspot locations [x,y,z,intensity]")

class FluidVisualizationData(BaseModel):
    """Data for fluid dynamics visualization."""
    grid_dimensions: List[int] = Field(..., description="Grid dimensions [nx,ny,nz]")
    temperature_field: List[List[List[float]]] = Field(..., description="3D temperature field")
    velocity_field: Optional[List[List[List[List[float]]]]] = Field(None, description="3D velocity field [vx,vy,vz]")
    pressure_field: Optional[List[List[List[float]]]] = Field(None, description="3D pressure field")
    density_field: Optional[List[List[List[float]]]] = Field(None, description="3D density field")

class SimulationStage(str, Enum):
    INITIALIZING = "initializing"
    SETUP = "setup"
    PROCESSING = "processing"
    ANALYZING = "analyzing"
    FINALIZING = "finalizing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class SimulationStatus(BaseModel):
    """Simulation status information"""
    
    id: str = Field(..., description="Unique identifier for the simulation")
    status: str = Field(..., description="Current status of the simulation")
    created_at: datetime = Field(default_factory=datetime.now, description="When the simulation was created")
    updated_at: datetime = Field(default_factory=datetime.now, description="When the simulation status was last updated")
    started_at: Optional[datetime] = Field(None, description="When the simulation started running")
    completed_at: Optional[datetime] = Field(None, description="When the simulation completed or failed")
    current_stage: str = Field(default="initializing", description="Current stage of the simulation")
    stage_progress: float = Field(default=0.0, ge=0.0, le=100.0, description="Progress percentage within the current stage")
    overall_progress: float = Field(default=0.0, ge=0.0, le=100.0, description="Overall progress percentage of the simulation")
    error_message: Optional[str] = Field(None, description="Error message if status is 'failed'")
    message: Optional[str] = Field(None, description="Additional status message")
    parameters: Optional[Dict[str, Any]] = Field(None, description="Parameters used for the simulation")
    results: Optional[Dict[str, Any]] = Field(None, description="Results from the simulation")
    
    @validator("status")
    def validate_status(cls, v):
        allowed_statuses = ["initializing", "setup", "processing", "analyzing", "finalizing", "completed", "failed", "cancelled", "pending", "running"]
        if v not in allowed_statuses:
            raise ValueError(f"Status must be one of: {', '.join(allowed_statuses)}")
        return v

class SimulationSummary(BaseModel):
    """Summary of simulation results."""
    id: str
    duration: float
    total_energy: float
    peak_energy_rate: float
    peak_temperature: float
    reactions_count: int
    parameters: SimulationParameters

class SimulationRunResponse(BaseModel):
    """Response after initiating a simulation run."""
    simulation_id: str
    message: str = Field(default="Simulation run started/completed", description="Status message")
    status: str = Field(default="running/completed", description="Indicates if run is in background or finished")

class SimulationParams(BaseModel):
    """Parameters to initialize a new simulation."""
    temperature: float = Field(..., example=300.0, description="Initial temperature in Kelvin")
    pressure: float = Field(..., example=101325.0, description="Initial pressure in Pascals")
    material: str = Field(..., example="Palladium", description="Lattice material (e.g., Palladium, Nickel)")
    simulation_duration: float = Field(..., example=100.0, description="Total simulation duration in seconds")
    time_step: float = Field(..., example=0.1, description="Simulation time step in seconds")
    # Add spatial domain parameters
    grid_resolution: Optional[List[int]] = Field([10, 10, 10], example=[10, 10, 10], description="Grid resolution (Nx, Ny, Nz) for spatial calculations")
    domain_boundaries: Optional[List[float]] = Field([-5.0, 5.0, -5.0, 5.0, -5.0, 5.0], example=[-5.0, 5.0, -5.0, 5.0, -5.0, 5.0], description="Physical domain boundaries [xmin, xmax, ymin, ymax, zmin, zmax]")
    # Add any other necessary parameters from the frontend form or PRD
    # e.g., lattice_size, specific reactant densities, etc.
    config_override: Optional[Dict[str, Any]] = Field(None, description="Optional dictionary to override default physics config")

class SimulationConfig(BaseModel):
    """Configuration for running the simulation steps."""
    steps: int = Field(..., example=1000, description="Number of simulation steps to run")
    dt: float = Field(..., example=0.1, description="Time step duration in seconds for each simulation step")

# --- NEW: Model for individual reaction events --- 
class ReactionEvent(BaseModel):
    """Represents a single reaction event occurring at a specific location."""
    pos: List[float] = Field(..., description="Coordinates [x, y, z] of the event")
    intensity: float = Field(..., description="Intensity or rate of the reaction at this location")
    type: str = Field(..., description="Type of reaction (e.g., DD, DNI)")

class SimulationStepResult(BaseModel):
    """Schema for the results of a single simulation step, including spatial events."""
    time: float
    step: int
    # Overall metrics
    overall_temperature: Optional[float] = None
    total_power: Optional[float] = None 
    avg_enhancement_factor: Optional[float] = None
    # Spatial data
    reaction_events: List[ReactionEvent] = Field(default=[], description="List of significant reaction events in this step")
    # Optionally include atom data if needed by frontend per step (can be large)
    # atoms: Optional[List[Dict[str, Any]]] = None 
    
    # Remove old non-spatial fields if they are fully replaced
    # enhancement_factors: Dict[str, Any] # Replaced by avg_enhancement_factor / spatial grid
    # reaction_rates: Dict[str, Any] # Replaced by reaction_events / spatial grid
    # lattice_state: Dict[str, Any] # Replaced by overall metrics / atoms list

class SimulationResultsResponse(BaseModel):
    """Response containing the full results or summary of a simulation."""
    simulation_id: str
    status: str = Field(default="completed", description="Current status of the simulation run")
    steps_completed: int
    total_time: float
    results: List[SimulationStepResult]
    # Or potentially add summary fields if preferred for large results
    # final_temperature: Optional[float] = None
    # final_energy: Optional[float] = None
    # peak_temperature: Optional[float] = None
    # ... other summary fields ... 

class TemperatureData(BaseModel):
    """Time series data for temperature."""
    times: List[float]
    values: List[float]

class PressureData(BaseModel):
    """Time series data for pressure."""
    times: List[float]
    values: List[float]

class ExcessPowerData(BaseModel):
    """Time series data for excess power."""
    times: List[float]
    values: List[float]

class SimulationResultData(BaseModel):
    """Data structure for time series results"""
    
    time: List[float] = Field(..., description="Time points in seconds")
    temperature: List[float] = Field(..., description="Temperature in Celsius over time")
    pressure: List[float] = Field(..., description="Pressure in bars over time")
    excess_power: List[float] = Field(..., description="Excess power in watts over time")
    energy_produced: List[float] = Field(..., description="Cumulative energy produced in joules")
    efficiency: List[float] = Field(..., description="Efficiency ratio (output/input) over time")

class SimulationResult(BaseModel):
    """Complete simulation results"""
    
    simulation_id: str = Field(..., description="ID of the simulation")
    parameters: SimulationParameters = Field(..., description="Parameters used for the simulation")
    data: SimulationResultData = Field(..., description="Time series data from the simulation")
    summary: Dict[str, float] = Field(..., description="Summary statistics of the simulation")
    created_at: datetime = Field(..., description="When the results were created")
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "simulation_id": "123e4567-e89b-12d3-a456-426614174000",
                "parameters": {
                    "reactor_temperature": 200,
                    "reactor_pressure": 5,
                    "reactor_volume": 1,
                    "material_type": "nickel",
                    "lattice_constant": 3.52,
                    "loading_ratio": 0.7,
                    "simulation_duration": 3600,
                    "time_step": 0.1,
                    "input_power": 100
                },
                "data": {
                    "time": [0, 1, 2, 3],
                    "temperature": [200, 205, 210, 215],
                    "pressure": [5, 5.2, 5.4, 5.5],
                    "excess_power": [0, 5, 10, 15],
                    "energy_produced": [0, 5, 15, 30],
                    "efficiency": [1.0, 1.05, 1.1, 1.15]
                },
                "summary": {
                    "max_temperature": 215,
                    "max_pressure": 5.5,
                    "max_excess_power": 15,
                    "total_energy_produced": 30,
                    "average_cop": 1.075
                },
                "created_at": "2023-05-15T14:30:00"
            }
        }
    }