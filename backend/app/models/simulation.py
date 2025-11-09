"""
Simulation Models

This module defines the models for simulation requests and responses.
"""

from pydantic import BaseModel, Field
from typing import Dict, List, Any, Optional
from enum import Enum
from datetime import datetime


class GeometryType(str, Enum):
    """Type of geometry for simulation domain"""
    CYLINDER = "cylinder"
    BOX = "box"
    SPHERE = "sphere"
    RECTANGLE = "rectangle"


class SimulationRequest(BaseModel):
    """Model for simulation request"""
    geometry: GeometryType = Field(..., description="Geometry type of the simulation domain")
    dimensions: List[float] = Field(..., description="Dimensions of the simulation domain")
    properties: Optional[Dict[str, Any]] = Field(None, description="Additional simulation properties")
    config: Optional[Dict[str, Any]] = Field(None, description="Simulation engine configuration")
    run_immediately: bool = Field(True, description="Whether to run the simulation immediately")


class SimulationStatus(str, Enum):
    """Status of a simulation"""
    INITIALIZED = "initialized"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELED = "canceled"


class SimulationResponse(BaseModel):
    """Model for simulation response"""
    simulation_id: str = Field(..., description="Unique identifier for the simulation")
    status: str = Field(..., description="Status of the simulation")
    message: Optional[str] = Field(None, description="Additional information about the simulation")
    created_at: datetime = Field(default_factory=datetime.now, description="Time when the simulation was created")


class SimulationResult(BaseModel):
    """Model for simulation results"""
    simulation_id: str = Field(..., description="Unique identifier for the simulation")
    status: str = Field(..., description="Status of the simulation")
    results: Dict[str, Any] = Field({}, description="Simulation results")
    metadata: Dict[str, Any] = Field({}, description="Simulation metadata")
    completed_at: Optional[datetime] = Field(None, description="Time when the simulation completed")
    elapsed_time: Optional[float] = Field(None, description="Time taken to run the simulation in seconds")


class FEMVisualizationOptions(BaseModel):
    """Options for FEM visualization"""
    show_mesh: bool = Field(True, description="Whether to show the mesh")
    show_temperature: bool = Field(True, description="Whether to show temperature field")
    show_fusion_rate: bool = Field(True, description="Whether to show fusion rate field")
    show_power_density: bool = Field(True, description="Whether to show power density field")
    colormap: str = Field("viridis", description="Colormap for visualization")
    scaling: str = Field("linear", description="Value scaling (linear or logarithmic)")


class FEMVisualizationRequest(BaseModel):
    """Request for FEM visualization"""
    simulation_id: str = Field(..., description="Simulation ID to visualize")
    options: FEMVisualizationOptions = Field(default_factory=FEMVisualizationOptions, description="Visualization options") 