import logging
from typing import Dict, Any, Tuple, Optional, List, Union, Set
from pydantic import BaseModel, Field, validator, ValidationError, root_validator
import numpy as np
from enum import Enum

logger = logging.getLogger(__name__)

class SimulationType(str, Enum):
    """Simulation types supported by the application."""
    LATTICE = "lattice"
    FLUID_DYNAMICS = "fluid_dynamics"
    REACTION_KINETICS = "reaction_kinetics"
    THERMAL = "thermal"

class ParameterSpec(BaseModel):
    """Specification for a parameter, including validation rules."""
    name: str
    type: str
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    allowed_values: Optional[List[Any]] = None
    default_value: Any = None
    required: bool = True
    description: str = ""
    units: str = ""
    
    class Config:
        extra = "forbid"

# Parameter specifications for different simulation types
LATTICE_PARAMS: List[ParameterSpec] = [
    ParameterSpec(
        name="lattice_constant",
        type="float",
        min_value=1.0,
        max_value=10.0,
        default_value=4.05,
        description="Lattice constant in Angstroms",
        units="Å"
    ),
    ParameterSpec(
        name="lattice_type",
        type="string",
        allowed_values=["FCC", "BCC", "HCP", "Diamond"],
        default_value="FCC",
        description="Crystal lattice structure type"
    ),
    ParameterSpec(
        name="temperature",
        type="float",
        min_value=0.1,
        max_value=2000.0,
        default_value=300.0,
        description="Simulation temperature",
        units="K"
    ),
    ParameterSpec(
        name="num_unit_cells",
        type="int",
        min_value=1,
        max_value=100,
        default_value=5,
        description="Number of unit cells in each dimension"
    ),
    ParameterSpec(
        name="time_steps",
        type="int",
        min_value=10,
        max_value=10000,
        default_value=1000,
        description="Number of simulation time steps"
    ),
    ParameterSpec(
        name="time_step_size",
        type="float",
        min_value=0.0001,
        max_value=1.0,
        default_value=0.001,
        description="Time step size in ps",
        units="ps"
    ),
    ParameterSpec(
        name="deuterium_loading",
        type="float",
        min_value=0.0,
        max_value=1.0,
        default_value=0.6,
        description="Deuterium loading ratio (0-1)"
    )
]

FLUID_DYNAMICS_PARAMS: List[ParameterSpec] = [
    ParameterSpec(
        name="fluid_viscosity",
        type="float",
        min_value=0.0001,
        max_value=10.0,
        default_value=0.001,
        description="Fluid viscosity",
        units="Pa·s"
    ),
    ParameterSpec(
        name="inlet_velocity",
        type="float",
        min_value=0.0,
        max_value=100.0,
        default_value=10.0,
        description="Inlet velocity",
        units="m/s"
    ),
    ParameterSpec(
        name="temperature",
        type="float",
        min_value=273.0,
        max_value=2000.0,
        default_value=300.0,
        description="Initial fluid temperature",
        units="K"
    ),
    ParameterSpec(
        name="pressure",
        type="float",
        min_value=0.1,
        max_value=200.0,
        default_value=1.0,
        description="Initial pressure",
        units="atm"
    ),
    ParameterSpec(
        name="grid_size",
        type="int",
        min_value=10,
        max_value=500,
        default_value=50,
        description="Size of simulation grid"
    ),
    ParameterSpec(
        name="time_steps",
        type="int",
        min_value=10,
        max_value=10000,
        default_value=1000,
        description="Number of simulation time steps"
    )
]

# Add other simulation parameter types as needed
REACTION_KINETICS_PARAMS: List[ParameterSpec] = [
    ParameterSpec(
        name="activation_energy",
        type="float",
        min_value=0.0,
        max_value=1000.0,
        default_value=50.0,
        description="Activation energy",
        units="kJ/mol"
    ),
    ParameterSpec(
        name="temperature",
        type="float",
        min_value=273.0,
        max_value=2000.0,
        default_value=300.0,
        description="Reaction temperature",
        units="K"
    ),
    ParameterSpec(
        name="catalyst_loading",
        type="float",
        min_value=0.0,
        max_value=1.0,
        default_value=0.1,
        description="Catalyst loading (0-1)"
    ),
    ParameterSpec(
        name="time_steps",
        type="int",
        min_value=10,
        max_value=10000,
        default_value=1000,
        description="Number of simulation time steps"
    ),
    ParameterSpec(
        name="reaction_rate_constant",
        type="float",
        min_value=0.0,
        max_value=1.0,
        default_value=0.01,
        description="Reaction rate constant",
        units="s^-1"
    )
]

THERMAL_PARAMS: List[ParameterSpec] = [
    ParameterSpec(
        name="thermal_conductivity",
        type="float",
        min_value=0.1,
        max_value=500.0,
        default_value=25.0,
        description="Thermal conductivity",
        units="W/(m·K)"
    ),
    ParameterSpec(
        name="heat_capacity",
        type="float",
        min_value=1.0,
        max_value=10000.0,
        default_value=500.0,
        description="Heat capacity",
        units="J/(kg·K)"
    ),
    ParameterSpec(
        name="initial_temperature",
        type="float",
        min_value=273.0,
        max_value=2000.0,
        default_value=300.0,
        description="Initial temperature",
        units="K"
    ),
    ParameterSpec(
        name="boundary_temperature",
        type="float",
        min_value=273.0,
        max_value=2000.0,
        default_value=300.0,
        description="Boundary temperature",
        units="K"
    ),
    ParameterSpec(
        name="grid_points",
        type="int",
        min_value=10,
        max_value=500,
        default_value=100,
        description="Number of spatial grid points"
    ),
    ParameterSpec(
        name="time_steps",
        type="int",
        min_value=10,
        max_value=10000,
        default_value=1000,
        description="Number of simulation time steps"
    ),
    ParameterSpec(
        name="heat_source_power",
        type="float",
        min_value=0.0,
        max_value=10000.0,
        default_value=100.0,
        description="Power of heat source",
        units="W"
    )
]

# Map simulation types to their parameter specifications
PARAMETER_SPECS = {
    SimulationType.LATTICE: LATTICE_PARAMS,
    SimulationType.FLUID_DYNAMICS: FLUID_DYNAMICS_PARAMS,
    SimulationType.REACTION_KINETICS: REACTION_KINETICS_PARAMS,
    SimulationType.THERMAL: THERMAL_PARAMS
}

def get_parameter_specs(simulation_type: SimulationType) -> List[ParameterSpec]:
    """
    Get parameter specifications for a given simulation type.
    
    Args:
        simulation_type: Type of simulation
        
    Returns:
        List of parameter specifications
    """
    return PARAMETER_SPECS.get(simulation_type, [])

def validate_parameter(param_value: Any, param_spec: ParameterSpec) -> Tuple[bool, Optional[str]]:
    """
    Validate a single parameter against its specification.
    
    Args:
        param_value: The parameter value to validate
        param_spec: The parameter specification
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    try:
        # Check if parameter is required
        if param_spec.required and param_value is None:
            return False, f"Parameter '{param_spec.name}' is required"
            
        # If not required and None, it's valid
        if not param_spec.required and param_value is None:
            return True, None
            
        # Validate type
        if param_spec.type == "float":
            try:
                value = float(param_value)
            except (ValueError, TypeError):
                return False, f"Parameter '{param_spec.name}' must be a float"
                
            # Validate range if specified
            if param_spec.min_value is not None and value < param_spec.min_value:
                return False, f"Parameter '{param_spec.name}' must be >= {param_spec.min_value}"
                
            if param_spec.max_value is not None and value > param_spec.max_value:
                return False, f"Parameter '{param_spec.name}' must be <= {param_spec.max_value}"
                
        elif param_spec.type == "int":
            try:
                value = int(param_value)
            except (ValueError, TypeError):
                return False, f"Parameter '{param_spec.name}' must be an integer"
                
            # Validate range if specified
            if param_spec.min_value is not None and value < param_spec.min_value:
                return False, f"Parameter '{param_spec.name}' must be >= {param_spec.min_value}"
                
            if param_spec.max_value is not None and value > param_spec.max_value:
                return False, f"Parameter '{param_spec.name}' must be <= {param_spec.max_value}"
                
        elif param_spec.type == "string":
            if not isinstance(param_value, str):
                return False, f"Parameter '{param_spec.name}' must be a string"
                
            # Validate allowed values if specified
            if param_spec.allowed_values is not None and param_value not in param_spec.allowed_values:
                allowed_str = ", ".join(str(v) for v in param_spec.allowed_values)
                return False, f"Parameter '{param_spec.name}' must be one of: {allowed_str}"
                
        # Add more type validations as needed (bool, list, etc.)
            
        return True, None
    except Exception as e:
        logger.error(f"Error validating parameter '{param_spec.name}': {str(e)}")
        return False, f"Error validating parameter '{param_spec.name}': {str(e)}"

def validate_parameters(params: Dict[str, Any], simulation_type: SimulationType) -> Tuple[bool, List[str], Dict[str, Any]]:
    """
    Validate simulation parameters against specifications for a given simulation type.
    
    Args:
        params: Dictionary of parameter names and values
        simulation_type: Type of simulation
        
    Returns:
        Tuple of (is_valid, error_messages, validated_params)
        - is_valid: True if all parameters are valid
        - error_messages: List of error messages (empty if valid)
        - validated_params: Dictionary of validated parameters with default values for missing parameters
    """
    errors = []
    validated_params = {}
    
    # Get parameter specs for the simulation type
    param_specs = get_parameter_specs(simulation_type)
    if not param_specs:
        return False, [f"No parameter specifications found for simulation type '{simulation_type}'"], {}
    
    # Check for unknown parameters
    param_names = {spec.name for spec in param_specs}
    unknown_params = set(params.keys()) - param_names
    if unknown_params:
        unknown_str = ", ".join(unknown_params)
        errors.append(f"Unknown parameters: {unknown_str}")
    
    # Validate each parameter
    for spec in param_specs:
        if spec.name in params:
            # Parameter is provided, validate it
            is_valid, error = validate_parameter(params[spec.name], spec)
            if not is_valid:
                errors.append(error)
            else:
                # Convert to the correct type
                try:
                    if spec.type == "float":
                        validated_params[spec.name] = float(params[spec.name])
                    elif spec.type == "int":
                        validated_params[spec.name] = int(params[spec.name])
                    else:
                        validated_params[spec.name] = params[spec.name]
                except (ValueError, TypeError):
                    errors.append(f"Error converting parameter '{spec.name}' to type {spec.type}")
        else:
            # Parameter is not provided
            if spec.required:
                errors.append(f"Required parameter '{spec.name}' is missing")
            elif spec.default_value is not None:
                # Use default value
                validated_params[spec.name] = spec.default_value
    
    is_valid = len(errors) == 0
    return is_valid, errors, validated_params

def get_default_parameters(simulation_type: SimulationType) -> Dict[str, Any]:
    """
    Get default parameters for a given simulation type.
    
    Args:
        simulation_type: Type of simulation
        
    Returns:
        Dictionary of default parameter values
    """
    param_specs = get_parameter_specs(simulation_type)
    return {
        spec.name: spec.default_value 
        for spec in param_specs 
        if spec.default_value is not None
    }

def get_parameter_metadata(simulation_type: SimulationType) -> List[Dict[str, Any]]:
    """
    Get metadata for all parameters of a given simulation type.
    Useful for generating UI components.
    
    Args:
        simulation_type: Type of simulation
        
    Returns:
        List of parameter metadata dictionaries
    """
    param_specs = get_parameter_specs(simulation_type)
    return [
        {
            "name": spec.name,
            "type": spec.type,
            "min_value": spec.min_value,
            "max_value": spec.max_value,
            "allowed_values": spec.allowed_values,
            "default_value": spec.default_value,
            "required": spec.required,
            "description": spec.description,
            "units": spec.units
        }
        for spec in param_specs
    ] 