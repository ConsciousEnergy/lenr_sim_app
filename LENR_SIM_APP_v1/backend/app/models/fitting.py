"""
Pydantic models for experimental data fitting
"""

from typing import Dict, List, Literal, Any, Optional
from pydantic import BaseModel, Field

class ExperimentalDataPoint(BaseModel):
    """Single experimental data point"""
    temperature: float = Field(..., description="Temperature in Kelvin", ge=0)
    power: float = Field(..., description="Power output in Watts", ge=0)

class ExperimentalDataSet(BaseModel):
    """Set of experimental data points"""
    data: List[ExperimentalDataPoint]
    metadata: Optional[Dict[str, Any]] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "data": [
                    {"temperature": 300, "power": 0.02},
                    {"temperature": 400, "power": 0.04},
                    {"temperature": 500, "power": 0.07}
                ],
                "metadata": {
                    "experiment_name": "Ni-H experiment",
                    "date": "2023-04-20"
                }
            }
        }

class FittingParams(BaseModel):
    """Parameters for fitting experimental data"""
    model: Literal["tunneling", "arrhenius", "custom"] = Field(
        "tunneling", 
        description="Fitting model type"
    )
    fixed_params: Optional[Dict[str, float]] = Field(
        None, 
        description="Parameters to keep fixed during fitting"
    )
    bounds: Optional[Dict[str, List[float]]] = Field(
        None, 
        description="Parameter bounds for optimization"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "model": "tunneling",
                "fixed_params": {
                    "r0": 1e-10
                },
                "bounds": {
                    "lambda": [1e-11, 1e-9],
                    "k_spring": [100, 10000]
                }
            }
        }

class FittingResult(BaseModel):
    """Result of experimental data fitting"""
    fitted_params: Dict[str, float]
    goodness_of_fit: Dict[str, float]
    predictions: List[Dict[str, float]]
    residuals: List[float]
    model_type: str
    metadata: Dict[str, Any]
    
    class Config:
        json_schema_extra = {
            "example": {
                "fitted_params": {
                    "lambda": 5.2e-10,
                    "k_spring": 1234
                },
                "goodness_of_fit": {
                    "r_squared": 0.98,
                    "rmse": 0.003
                },
                "predictions": [
                    {"temperature": 300, "power": 0.019},
                    {"temperature": 400, "power": 0.041},
                    {"temperature": 500, "power": 0.068}
                ],
                "residuals": [0.001, -0.001, 0.002],
                "model_type": "tunneling",
                "metadata": {
                    "calculation_time_ms": 532,
                    "iterations": 150
                }
            }
        } 