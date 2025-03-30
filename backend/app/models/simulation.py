"""
Pydantic models for simulation input and output
"""

from typing import Dict, List, Literal, Any, Optional
from pydantic import BaseModel, Field

class ThermalSimulationParams(BaseModel):
    """Parameters for thermal tunneling simulation"""
    T: float = Field(..., description="Temperature in Kelvin", ge=0)
    lambda_param: float = Field(..., alias="lambda", description="Tunneling parameter in meters", gt=0)
    r0: float = Field(..., description="Equilibrium separation in meters", gt=0)
    k_spring: float = Field(..., description="Spring constant in N/m", gt=0)
    potential: Literal["harmonic", "morse"] = Field(
        "harmonic", 
        description="Potential model type: harmonic or Morse"
    )
    
    class Config:
        populate_by_name = True
        json_schema_extra = {
            "example": {
                "T": 300,
                "lambda": 1e-10,
                "r0": 1e-10,
                "k_spring": 1000,
                "potential": "harmonic"
            }
        }

class ImpactSimulationParams(BaseModel):
    """Parameters for impact energy tunneling simulation"""
    T_impact: float = Field(..., description="Impact temperature in Kelvin", ge=0)
    lambda_param: float = Field(..., alias="lambda", description="Tunneling parameter in meters", gt=0)
    r0: float = Field(..., description="Equilibrium separation in meters", gt=0)
    k_spring: float = Field(..., description="Spring constant in N/m", gt=0)
    potential: Literal["harmonic", "morse"] = Field(
        "harmonic", 
        description="Potential model type: harmonic or Morse"
    )
    impact_duration: float = Field(
        1e-12, 
        description="Duration of impact in seconds",
        gt=0
    )
    
    class Config:
        populate_by_name = True
        json_schema_extra = {
            "example": {
                "T_impact": 5000,
                "lambda": 1e-10,
                "r0": 1e-10,
                "k_spring": 1000,
                "potential": "harmonic",
                "impact_duration": 1e-12
            }
        }

class HeatmapParams(BaseModel):
    """Parameters for generating 2D heatmap"""
    T_min: float = Field(..., description="Minimum temperature in Kelvin", ge=0)
    T_max: float = Field(..., description="Maximum temperature in Kelvin", gt=0)
    lambda_min: float = Field(..., description="Minimum tunneling parameter in meters", gt=0)
    lambda_max: float = Field(..., description="Maximum tunneling parameter in meters", gt=0)
    r0: float = Field(..., description="Equilibrium separation in meters", gt=0)
    k_spring: float = Field(..., description="Spring constant in N/m", gt=0)
    potential: Literal["harmonic", "morse"] = Field(
        "harmonic", 
        description="Potential model type: harmonic or Morse"
    )
    resolution: int = Field(
        20, 
        description="Grid resolution for each dimension",
        ge=5,
        le=100
    )
    
    class Config:
        populate_by_name = True
        json_schema_extra = {
            "example": {
                "T_min": 100,
                "T_max": 1000,
                "lambda_min": 1e-11,
                "lambda_max": 1e-9,
                "r0": 1e-10,
                "k_spring": 1000,
                "potential": "harmonic",
                "resolution": 20
            }
        }

class ClusterParams(BaseModel):
    """Parameters for 3D cluster potential visualization"""
    num_particles: int = Field(..., description="Number of particles in cluster", ge=2, le=10)
    charge: float = Field(..., description="Charge of each particle in elementary charge units")
    cluster_radius: float = Field(..., description="Approximate radius of cluster in meters", gt=0)
    grid_resolution: int = Field(
        50, 
        description="Resolution of 3D grid",
        ge=20,
        le=200
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "num_particles": 3,
                "charge": 1.0,
                "cluster_radius": 1e-10,
                "grid_resolution": 50
            }
        }

class EnergyLevel(BaseModel):
    """Single energy level with quantum numbers"""
    n: int
    energy: float
    wavefunction_extent: Optional[List[float]] = None

class TunnelingResult(BaseModel):
    """Result of tunneling simulation"""
    probability: float
    energy_levels: List[EnergyLevel]
    metadata: Dict[str, Any]
    input_params: Dict[str, Any]
    
    class Config:
        json_schema_extra = {
            "example": {
                "probability": 1.23e-20,
                "energy_levels": [
                    {"n": 0, "energy": 0.01},
                    {"n": 1, "energy": 0.03}
                ],
                "metadata": {
                    "calculation_time_ms": 125,
                    "model_version": "0.1.0"
                },
                "input_params": {
                    "T": 300,
                    "lambda": 1e-10,
                    "r0": 1e-10,
                    "k_spring": 1000
                }
            }
        }

class HeatmapResult(BaseModel):
    """Result of heatmap calculation"""
    grid_values: List[List[float]]
    x_values: List[float]
    y_values: List[float]
    x_label: str
    y_label: str
    metadata: Dict[str, Any]
    
    class Config:
        json_schema_extra = {
            "example": {
                "grid_values": [[1e-20, 2e-20], [3e-20, 4e-20]],
                "x_values": [1e-11, 1e-10],
                "y_values": [100, 200],
                "x_label": "Lambda (m)",
                "y_label": "Temperature (K)",
                "metadata": {
                    "calculation_time_ms": 325,
                    "resolution": 20
                }
            }
        }

class ClusterVisualizationResult(BaseModel):
    """Result of cluster visualization"""
    vtk_file_url: str
    json_data_url: Optional[str] = None
    particle_positions: List[List[float]]
    potential_range: List[float]
    metadata: Dict[str, Any]
    
    class Config:
        json_schema_extra = {
            "example": {
                "vtk_file_url": "/static/cluster_fields/cluster_123456.vtk",
                "json_data_url": "/static/cluster_fields/cluster_123456.json",
                "particle_positions": [[0, 0, 0], [1e-10, 0, 0], [0, 1e-10, 0]],
                "potential_range": [-10, 0],
                "metadata": {
                    "calculation_time_ms": 532,
                    "grid_resolution": 50
                }
            }
        } 