"""
Simulation Models

Contains both legacy simulation models and new shared simulation storage models.
"""

from typing import Optional, List, Dict, Any
from datetime import datetime
from dataclasses import dataclass, field, asdict
from enum import Enum
from pydantic import BaseModel, Field
import uuid
import json


# ============================================================================
# Legacy Simulation Models (for backward compatibility)
# ============================================================================

class SimulationStatus(str, Enum):
    """Status of a simulation"""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class LatticeType(str, Enum):
    """Type of lattice structure"""
    FCC = "fcc"
    BCC = "bcc"
    HCP = "hcp"
    SIMPLE = "simple"


class TunnellingModel(str, Enum):
    """Type of tunneling model"""
    WKB = "wkb"
    GAMOW = "gamow"
    ENHANCED = "enhanced"


class ScreeningModel(str, Enum):
    """Type of electron screening model"""
    THOMAS_FERMI = "thomas_fermi"
    DEBYE_HUCKEL = "debye_huckel"
    SIMPLE = "simple"


class SimulationParameters(BaseModel):
    """Parameters for running a simulation"""
    temperature: float = Field(300.0, description="Temperature in Kelvin")
    pressure: float = Field(1.0, description="Pressure in atmospheres")
    material_type: str = Field("palladium", description="Material type")
    loading_ratio: float = Field(0.8, description="Loading ratio (0-1)")
    enhancement_factor: float = Field(1.0, description="Enhancement factor")
    simulation_duration: float = Field(60.0, description="Simulation duration in seconds")
    time_step: float = Field(0.1, description="Time step in seconds")
    lattice_type: Optional[LatticeType] = None
    tunnelling_model: Optional[TunnellingModel] = None
    screening_model: Optional[ScreeningModel] = None


class SimulationResultData(BaseModel):
    """Time series data from simulation"""
    time_points: List[float] = Field(default_factory=list, description="Time points")
    temperature: List[float] = Field(default_factory=list, description="Temperature values")
    pressure: List[float] = Field(default_factory=list, description="Pressure values")
    reaction_rate: List[float] = Field(default_factory=list, description="Reaction rates")
    energy_output: List[float] = Field(default_factory=list, description="Energy output")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")


class SimulationResult(BaseModel):
    """Model for simulation results"""
    simulation_id: str = Field(..., description="Unique identifier for the simulation")
    status: str = Field(..., description="Status of the simulation")
    results: Dict[str, Any] = Field(default_factory=dict, description="Simulation results")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Simulation metadata")
    completed_at: Optional[datetime] = Field(None, description="Time when the simulation completed")
    elapsed_time: Optional[float] = Field(None, description="Time taken to run the simulation in seconds")


class SimulationResponse(BaseModel):
    """Model for simulation response"""
    simulation_id: str = Field(..., description="Unique identifier for the simulation")
    status: str = Field(..., description="Status of the simulation")
    message: Optional[str] = Field(None, description="Additional information about the simulation")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Time when the simulation was created")


# ============================================================================
# Shared Simulation Storage Models (New)
# ============================================================================

class MaterialType(str, Enum):
    """Supported material types for simulations"""
    PALLADIUM = "palladium"
    NICKEL = "nickel"
    TITANIUM = "titanium"
    OTHER = "other"


class ReactantType(str, Enum):
    """Supported reactant types"""
    DEUTERIUM = "deuterium"
    HYDROGEN = "hydrogen"


@dataclass
class SharedSimulation:
    """
    Model for shared simulation data.
    
    Represents a simulation that can be saved, shared publicly, and used
    for finding matching experimental conditions.
    """
    # Core identifiers
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    user_id: Optional[str] = None  # None until user auth implemented
    session_id: str = ""  # Browser session ID for anonymous users
    
    # Simulation metadata
    name: str = ""
    description: str = ""
    tags: List[str] = field(default_factory=list)
    is_public: bool = False  # Whether shared with community
    
    # Full simulation configuration and results
    parameters: Dict[str, Any] = field(default_factory=dict)  # Full simulation config
    results: Dict[str, Any] = field(default_factory=dict)  # Simulation results
    
    # Matching metadata (indexed for fast search)
    material_type: MaterialType = MaterialType.PALLADIUM
    reactant: ReactantType = ReactantType.DEUTERIUM
    temperature_k: float = 300.0
    pressure_pa: float = 101325.0  # Standard atmospheric pressure
    loading_ratio: float = 0.9
    excess_heat_watts: float = 0.0
    tunneling_probability: float = 0.0
    reaction_rate: float = 0.0
    
    # Timestamps
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        data = asdict(self)
        # Convert datetime to ISO format strings
        data['created_at'] = self.created_at.isoformat() if isinstance(self.created_at, datetime) else self.created_at
        data['updated_at'] = self.updated_at.isoformat() if isinstance(self.updated_at, datetime) else self.updated_at
        # Convert enums to strings
        if isinstance(self.material_type, MaterialType):
            data['material_type'] = self.material_type.value
        if isinstance(self.reactant, ReactantType):
            data['reactant'] = self.reactant.value
        return data
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'SharedSimulation':
        """Create instance from dictionary"""
        # Convert ISO strings back to datetime
        if 'created_at' in data and isinstance(data['created_at'], str):
            data['created_at'] = datetime.fromisoformat(data['created_at'])
        if 'updated_at' in data and isinstance(data['updated_at'], str):
            data['updated_at'] = datetime.fromisoformat(data['updated_at'])
        # Convert strings back to enums
        if 'material_type' in data and isinstance(data['material_type'], str):
            data['material_type'] = MaterialType(data['material_type'])
        if 'reactant' in data and isinstance(data['reactant'], str):
            data['reactant'] = ReactantType(data['reactant'])
        return cls(**data)


@dataclass
class MatchResult:
    """
    Result from matching algorithm showing similarity to target parameters.
    """
    simulation: SharedSimulation
    similarity_score: float  # 0.0 to 1.0, higher = more similar
    matching_criteria: Dict[str, Any]  # Which parameters matched
    differences: Dict[str, float]  # Parameter differences


@dataclass
class SimulationSearchParams:
    """Parameters for searching/filtering simulations"""
    material_type: Optional[MaterialType] = None
    reactant: Optional[ReactantType] = None
    min_temperature_k: Optional[float] = None
    max_temperature_k: Optional[float] = None
    min_excess_heat: Optional[float] = None
    max_excess_heat: Optional[float] = None
    tags: Optional[List[str]] = None
    is_public: Optional[bool] = None
    limit: int = 50
    offset: int = 0
