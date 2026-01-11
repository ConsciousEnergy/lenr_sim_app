from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Dict, List, Any, Optional, Union
import logging
from ..utils.param_validation import (
    SimulationType, 
    validate_parameters, 
    get_default_parameters,
    get_parameter_metadata
)

logger = logging.getLogger(__name__)

# Define simulation types with their parameters
SIMULATION_TYPES = {
    "lattice": {
        "display_name": "Lattice Simulation",
        "description": "Simulation of nuclear reactions in metal lattices",
        "parameters": {
            "lattice_constant": {
                "display_name": "Lattice Constant",
                "description": "Lattice constant in Angstroms",
                "type": "number",
                "default_value": 4.05,
                "min_value": 1.0,
                "max_value": 10.0,
                "units": "Å",
                "required": True
            },
            "lattice_type": {
                "display_name": "Lattice Type",
                "description": "Crystal lattice structure type",
                "type": "string",
                "default_value": "FCC",
                "options": ["FCC", "BCC", "HCP", "Diamond"],
                "required": True
            },
            "temperature": {
                "display_name": "Temperature",
                "description": "Simulation temperature",
                "type": "number",
                "default_value": 300.0,
                "min_value": 0.1,
                "max_value": 2000.0,
                "units": "K",
                "required": True
            },
            "num_unit_cells": {
                "display_name": "Unit Cells",
                "description": "Number of unit cells in each dimension",
                "type": "integer",
                "default_value": 5,
                "min_value": 1,
                "max_value": 100,
                "required": True
            },
            "time_steps": {
                "display_name": "Time Steps",
                "description": "Number of simulation time steps",
                "type": "integer",
                "default_value": 1000,
                "min_value": 10,
                "max_value": 10000,
                "required": True
            },
            "time_step_size": {
                "display_name": "Time Step Size",
                "description": "Time step size in ps",
                "type": "number",
                "default_value": 0.001,
                "min_value": 0.0001,
                "max_value": 1.0,
                "units": "ps",
                "required": True
            },
            "deuterium_loading": {
                "display_name": "Deuterium Loading",
                "description": "Deuterium loading ratio (0-1)",
                "type": "number",
                "default_value": 0.6,
                "min_value": 0.0,
                "max_value": 1.0,
                "required": True
            }
        }
    },
    "fluid_dynamics": {
        "display_name": "Fluid Dynamics Simulation",
        "description": "Simulation of fluid flow and heat transfer in LENR systems",
        "parameters": {
            "fluid_viscosity": {
                "display_name": "Fluid Viscosity",
                "description": "Fluid viscosity",
                "type": "number",
                "default_value": 0.001,
                "min_value": 0.0001,
                "max_value": 10.0,
                "units": "Pa·s",
                "required": True
            },
            "inlet_velocity": {
                "display_name": "Inlet Velocity",
                "description": "Inlet velocity",
                "type": "number",
                "default_value": 10.0,
                "min_value": 0.0,
                "max_value": 100.0,
                "units": "m/s",
                "required": True
            },
            "temperature": {
                "display_name": "Temperature",
                "description": "Initial fluid temperature",
                "type": "number",
                "default_value": 300.0,
                "min_value": 273.0,
                "max_value": 2000.0,
                "units": "K",
                "required": True
            },
            "pressure": {
                "display_name": "Pressure",
                "description": "Initial pressure",
                "type": "number",
                "default_value": 1.0,
                "min_value": 0.1,
                "max_value": 200.0,
                "units": "atm",
                "required": True
            },
            "grid_size": {
                "display_name": "Grid Size",
                "description": "Size of simulation grid",
                "type": "integer",
                "default_value": 50,
                "min_value": 10,
                "max_value": 500,
                "required": True
            },
            "time_steps": {
                "display_name": "Time Steps",
                "description": "Number of simulation time steps",
                "type": "integer",
                "default_value": 1000,
                "min_value": 10,
                "max_value": 10000,
                "required": True
            }
        }
    },
    "reaction_kinetics": {
        "display_name": "Reaction Kinetics Simulation",
        "description": "Simulation of nuclear reaction kinetics in LENR",
        "parameters": {
            "activation_energy": {
                "display_name": "Activation Energy",
                "description": "Activation energy",
                "type": "number",
                "default_value": 50.0,
                "min_value": 0.0,
                "max_value": 1000.0,
                "units": "kJ/mol",
                "required": True
            },
            "temperature": {
                "display_name": "Temperature",
                "description": "Reaction temperature",
                "type": "number",
                "default_value": 300.0,
                "min_value": 273.0,
                "max_value": 2000.0,
                "units": "K",
                "required": True
            },
            "catalyst_loading": {
                "display_name": "Catalyst Loading",
                "description": "Catalyst loading (0-1)",
                "type": "number",
                "default_value": 0.1,
                "min_value": 0.0,
                "max_value": 1.0,
                "required": True
            },
            "time_steps": {
                "display_name": "Time Steps",
                "description": "Number of simulation time steps",
                "type": "integer",
                "default_value": 1000,
                "min_value": 10,
                "max_value": 10000,
                "required": True
            },
            "reaction_rate_constant": {
                "display_name": "Reaction Rate Constant",
                "description": "Reaction rate constant",
                "type": "number",
                "default_value": 0.01,
                "min_value": 0.0,
                "max_value": 1.0,
                "units": "s^-1",
                "required": True
            }
        }
    },
    "thermal": {
        "display_name": "Thermal Simulation",
        "description": "Simulation of heat transfer in LENR systems",
        "parameters": {
            "thermal_conductivity": {
                "display_name": "Thermal Conductivity",
                "description": "Thermal conductivity",
                "type": "number",
                "default_value": 25.0,
                "min_value": 0.1,
                "max_value": 500.0,
                "units": "W/(m·K)",
                "required": True
            },
            "heat_capacity": {
                "display_name": "Heat Capacity",
                "description": "Heat capacity",
                "type": "number",
                "default_value": 500.0,
                "min_value": 1.0,
                "max_value": 10000.0,
                "units": "J/(kg·K)",
                "required": True
            },
            "initial_temperature": {
                "display_name": "Initial Temperature",
                "description": "Initial temperature",
                "type": "number",
                "default_value": 300.0,
                "min_value": 273.0,
                "max_value": 2000.0,
                "units": "K",
                "required": True
            },
            "boundary_temperature": {
                "display_name": "Boundary Temperature",
                "description": "Boundary temperature",
                "type": "number",
                "default_value": 300.0,
                "min_value": 273.0,
                "max_value": 2000.0,
                "units": "K",
                "required": True
            },
            "grid_points": {
                "display_name": "Grid Points",
                "description": "Number of spatial grid points",
                "type": "integer",
                "default_value": 100,
                "min_value": 10,
                "max_value": 500,
                "required": True
            },
            "time_steps": {
                "display_name": "Time Steps",
                "description": "Number of simulation time steps",
                "type": "integer",
                "default_value": 1000,
                "min_value": 10,
                "max_value": 10000,
                "required": True
            },
            "heat_source_power": {
                "display_name": "Heat Source Power",
                "description": "Power of heat source",
                "type": "number",
                "default_value": 100.0,
                "min_value": 0.0,
                "max_value": 10000.0,
                "units": "W",
                "required": True
            }
        }
    }
}

router = APIRouter(
    prefix="/api/parameters",
    tags=["Parameters"],
    responses={404: {"description": "Not found"}},
)

class ParameterValidationRequest(BaseModel):
    simulation_type: str = Field(..., description="Type of simulation to validate parameters for")
    parameters: Dict[str, Any] = Field(..., description="Parameters to validate")

class ParameterValidationResponse(BaseModel):
    is_valid: bool = Field(..., description="Whether the parameters are valid")
    errors: Dict[str, str] = Field(default_factory=dict, description="Validation errors by parameter name")
    warnings: Dict[str, str] = Field(default_factory=dict, description="Warnings by parameter name")

class ParameterMetadataItem(BaseModel):
    name: str = Field(..., description="Parameter name")
    display_name: str = Field(..., description="Human-readable display name")
    description: str = Field(..., description="Description of the parameter")
    type: str = Field(..., description="Data type (number, string, boolean, etc.)")
    default_value: Any = Field(..., description="Default value")
    min_value: Optional[float] = Field(None, description="Minimum value (for numeric parameters)")
    max_value: Optional[float] = Field(None, description="Maximum value (for numeric parameters)")
    units: Optional[str] = Field(None, description="Units of measurement (if applicable)")
    options: Optional[List[Any]] = Field(None, description="Available options (for enum types)")
    required: bool = Field(True, description="Whether the parameter is required")
    advanced: bool = Field(False, description="Whether this is an advanced parameter")
    depends_on: Optional[Dict[str, Any]] = Field(None, description="Parameter dependencies")

class ParameterMetadataResponse(BaseModel):
    parameters: List[ParameterMetadataItem] = Field(..., description="Metadata for all parameters")

class SimulationTypeInfo(BaseModel):
    id: str = Field(..., description="Simulation type identifier")
    display_name: str = Field(..., description="Human-readable display name")
    description: str = Field(..., description="Brief description of the simulation type")

class SimulationTypesResponse(BaseModel):
    simulation_types: List[SimulationTypeInfo] = Field(..., description="Available simulation types")

@router.post("/validate", response_model=ParameterValidationResponse)
async def validate_parameters(request: ParameterValidationRequest):
    """
    Validate simulation parameters against defined constraints.
    """
    simulation_type = request.simulation_type
    parameters = request.parameters
    
    # Check if simulation type exists
    if simulation_type not in SIMULATION_TYPES:
        logger.warning(f"Validation failed: Unknown simulation type '{simulation_type}'")
        raise HTTPException(
            status_code=404,
            detail=f"Simulation type '{simulation_type}' not found"
        )
    
    valid_parameters = SIMULATION_TYPES[simulation_type]["parameters"]
    errors = {}
    warnings = {}
    
    # Validate each parameter
    for param_name, param_value in parameters.items():
        # Check if parameter exists
        if param_name not in valid_parameters:
            warnings[param_name] = f"Unknown parameter '{param_name}'"
            continue
        
        param_meta = valid_parameters[param_name]
        param_type = param_meta["type"]
        
        # Type validation
        if param_type == "number" or param_type == "integer":
            if not isinstance(param_value, (int, float)):
                errors[param_name] = f"Parameter '{param_name}' must be a number"
                continue
            
            # Integer specific validation
            if param_type == "integer" and not isinstance(param_value, int):
                errors[param_name] = f"Parameter '{param_name}' must be an integer"
                continue
            
            # Range validation
            if "min_value" in param_meta and param_value < param_meta["min_value"]:
                errors[param_name] = f"Parameter '{param_name}' must be at least {param_meta['min_value']}"
            
            if "max_value" in param_meta and param_value > param_meta["max_value"]:
                errors[param_name] = f"Parameter '{param_name}' must be at most {param_meta['max_value']}"
                
        elif param_type == "string":
            if not isinstance(param_value, str):
                errors[param_name] = f"Parameter '{param_name}' must be a string"
                continue
            
            # Options validation
            if "options" in param_meta and param_value not in param_meta["options"]:
                options_str = ", ".join([str(opt) for opt in param_meta["options"]])
                errors[param_name] = f"Parameter '{param_name}' must be one of: {options_str}"
                
        elif param_type == "boolean":
            if not isinstance(param_value, bool):
                errors[param_name] = f"Parameter '{param_name}' must be a boolean"
    
    # Check for missing required parameters
    for param_name, param_meta in valid_parameters.items():
        if param_meta.get("required", True) and param_name not in parameters:
            errors[param_name] = f"Required parameter '{param_name}' is missing"
    
    # Create response
    is_valid = len(errors) == 0
    
    if is_valid:
        logger.info(f"Parameters for '{simulation_type}' validated successfully")
    else:
        logger.warning(f"Parameter validation for '{simulation_type}' failed with errors: {errors}")
    
    return ParameterValidationResponse(
        is_valid=is_valid,
        errors=errors,
        warnings=warnings
    )

@router.get("/defaults/{simulation_type}", response_model=Dict[str, Any])
async def get_default_parameters(simulation_type: str):
    """
    Get default parameters for a specific simulation type.
    """
    # Check if simulation type exists
    if simulation_type not in SIMULATION_TYPES:
        logger.warning(f"Default parameters request failed: Unknown simulation type '{simulation_type}'")
        raise HTTPException(
            status_code=404,
            detail=f"Simulation type '{simulation_type}' not found"
        )
    
    # Extract and return default values
    valid_parameters = SIMULATION_TYPES[simulation_type]["parameters"]
    defaults = {
        param_name: param_meta["default_value"] 
        for param_name, param_meta in valid_parameters.items()
    }
    
    logger.info(f"Default parameters for '{simulation_type}' retrieved successfully")
    return defaults

@router.get("/metadata/{simulation_type}", response_model=ParameterMetadataResponse)
async def get_parameter_metadata(simulation_type: str):
    """
    Get metadata about parameters for a specific simulation type.
    """
    # Check if simulation type exists
    if simulation_type not in SIMULATION_TYPES:
        logger.warning(f"Parameter metadata request failed: Unknown simulation type '{simulation_type}'")
        raise HTTPException(
            status_code=404,
            detail=f"Simulation type '{simulation_type}' not found"
        )
    
    # Extract parameter metadata
    valid_parameters = SIMULATION_TYPES[simulation_type]["parameters"]
    
    # Convert to response model format
    parameters = []
    for param_name, param_meta in valid_parameters.items():
        parameters.append(
            ParameterMetadataItem(
                name=param_name,
                display_name=param_meta["display_name"],
                description=param_meta["description"],
                type=param_meta["type"],
                default_value=param_meta["default_value"],
                min_value=param_meta.get("min_value"),
                max_value=param_meta.get("max_value"),
                units=param_meta.get("units"),
                options=param_meta.get("options"),
                required=param_meta.get("required", True),
                advanced=param_meta.get("advanced", False),
                depends_on=param_meta.get("depends_on")
            )
        )
    
    logger.info(f"Parameter metadata for '{simulation_type}' retrieved successfully")
    return ParameterMetadataResponse(parameters=parameters)

@router.get("/simulation-types", response_model=SimulationTypesResponse)
async def get_simulation_types():
    """
    Get a list of all available simulation types.
    """
    simulation_types = []
    
    for sim_id, sim_data in SIMULATION_TYPES.items():
        simulation_types.append(
            SimulationTypeInfo(
                id=sim_id,
                display_name=sim_data["display_name"],
                description=sim_data["description"]
            )
        )
    
    logger.info("Available simulation types retrieved successfully")
    return SimulationTypesResponse(simulation_types=simulation_types) 