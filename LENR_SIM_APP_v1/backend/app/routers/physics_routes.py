"""
Physics API routes for LENR_Sim_App

This module defines the API routes for physics calculations in the LENR simulation app.
It provides endpoints for calculating fusion rates, enhancement factors, and other
physics-related quantities using the Unified LENR Theory framework.
"""

from fastapi import APIRouter, HTTPException, Query, Body, Depends
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field, root_validator
import numpy as np
import json
import logging
from datetime import datetime

from app.physics.enhanced_fusion import calculate_fusion_rate, calculator as fusion_calculator
from app.physics.unified_enhancement import (
    calculate_enhancement, 
    get_mechanism_requirements,
    get_default_configuration,
    calculate_enhancement_for_material,
    analyze_parameter_sensitivity
)
from app.utils.logging import setup_logger

# Set up logger
logger = setup_logger("physics_routes", "logs/api.log")

router = APIRouter(
    prefix="/physics",
    tags=["physics"],
    responses={404: {"description": "Not found"}},
)


class FusionRateRequest(BaseModel):
    """Request model for fusion rate calculation."""
    reaction_name: str = Field(..., description="Name of the fusion reaction (e.g., 'd-d')")
    temperature: float = Field(..., description="Temperature in Kelvin")
    density1: float = Field(..., description="Number density of reactant 1 in m^-3")
    density2: float = Field(..., description="Number density of reactant 2 in m^-3")
    mechanisms: Optional[List[str]] = Field(None, description="List of enhancement mechanisms to include")


class MultiTemperatureRequest(BaseModel):
    """Request model for multi-temperature calculation."""
    reaction_name: str = Field(..., description="Name of the fusion reaction")
    temperatures: List[float] = Field(..., description="List of temperatures in Kelvin")
    density1: float = Field(..., description="Number density of reactant 1 in m^-3")
    density2: float = Field(..., description="Number density of reactant 2 in m^-3")
    mechanisms: Optional[List[str]] = Field(None, description="List of enhancement mechanisms to include")


class ReactionComparisonRequest(BaseModel):
    """Request model for reaction comparison."""
    temperature: float = Field(..., description="Temperature in Kelvin")
    density: float = Field(..., description="Number density of reactants in m^-3")
    mechanisms: Optional[List[str]] = Field(None, description="List of enhancement mechanisms to include")


class OptimizationRequest(BaseModel):
    """Request model for condition optimization."""
    reaction_name: str = Field(..., description="Name of the fusion reaction")
    temp_min: float = Field(..., description="Minimum temperature in Kelvin")
    temp_max: float = Field(..., description="Maximum temperature in Kelvin")
    density_min: float = Field(..., description="Minimum density in m^-3")
    density_max: float = Field(..., description="Maximum density in m^-3")
    mechanisms: Optional[List[str]] = Field(None, description="List of enhancement mechanisms to include")
    num_points: int = Field(10, description="Number of points to evaluate in each dimension")


class MechanismAnalysisRequest(BaseModel):
    """Request model for mechanism contribution analysis."""
    reaction_name: str = Field(..., description="Name of the fusion reaction")
    temperature: float = Field(..., description="Temperature in Kelvin")
    density: float = Field(..., description="Number density of reactants in m^-3")
    mechanisms: Optional[List[str]] = Field(None, description="List of mechanisms to analyze")


class EnhancementRequest(BaseModel):
    """Request model for enhancement factor calculation."""
    config: Dict[str, Any] = Field(..., description="Configuration parameters for each mechanism")
    mechanisms: Optional[List[str]] = Field(None, description="List of enhancement mechanisms to include")


class MaterialEnhancementRequest(BaseModel):
    """Request model for material-based enhancement calculation."""
    material_name: str = Field(..., description="Name of the material (e.g., 'palladium')")
    temperature: float = Field(..., description="Temperature in Kelvin")
    pressure: float = Field(..., description="Pressure in Pa")
    electric_field: float = Field(0.0, description="Electric field in V/m")
    mechanisms: Optional[List[str]] = Field(None, description="List of mechanisms to include")


class ParameterSensitivityRequest(BaseModel):
    """Request model for parameter sensitivity analysis."""
    parameter_name: str = Field(..., description="Name of the parameter to analyze")
    mechanism: str = Field(..., description="Name of the mechanism the parameter belongs to")
    min_value: float = Field(..., description="Minimum parameter value")
    max_value: float = Field(..., description="Maximum parameter value")
    num_points: int = Field(10, description="Number of points to evaluate")
    base_config: Dict[str, Any] = Field(..., description="Base configuration for enhancement calculation")
    mechanisms: Optional[List[str]] = Field(None, description="List of mechanisms to include in calculation")
    
    @root_validator
    def validate_parameter_in_mechanism(cls, values):
        """Validate that the parameter exists in the mechanism."""
        if not values.get("base_config") or not values.get("mechanism") or not values.get("parameter_name"):
            return values
        
        mechanism = values["mechanism"]
        parameter = values["parameter_name"]
        config = values["base_config"]
        
        if mechanism not in config:
            raise ValueError(f"Mechanism '{mechanism}' not found in configuration")
        
        if parameter not in config[mechanism]:
            raise ValueError(f"Parameter '{parameter}' not found in mechanism '{mechanism}'")
        
        return values


@router.post("/fusion-rate")
async def fusion_rate(request: FusionRateRequest):
    """
    Calculate fusion reaction rate for a specific reaction.
    """
    try:
        result = calculate_fusion_rate(
            request.reaction_name,
            request.temperature,
            request.density1,
            request.density2,
            request.mechanisms
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/multiple-temperatures")
async def multiple_temperatures(request: MultiTemperatureRequest):
    """
    Calculate fusion rates across multiple temperatures.
    """
    try:
        result = fusion_calculator.calculate_multiple_temperatures(
            request.reaction_name,
            request.temperatures,
            request.density1,
            request.density2,
            request.mechanisms
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/compare-reactions")
async def compare_reactions(request: ReactionComparisonRequest):
    """
    Compare different fusion reactions under the same conditions.
    """
    try:
        result = fusion_calculator.compare_reactions(
            request.temperature,
            request.density,
            request.mechanisms
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/optimize-conditions")
async def optimize_conditions(request: OptimizationRequest):
    """
    Find optimal conditions for a specific reaction.
    """
    try:
        result = fusion_calculator.optimize_conditions(
            request.reaction_name,
            (request.temp_min, request.temp_max),
            (request.density_min, request.density_max),
            request.mechanisms,
            request.num_points
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/analyze-mechanisms")
async def analyze_mechanisms(request: MechanismAnalysisRequest):
    """
    Analyze the contribution of each mechanism to the total enhancement.
    """
    try:
        result = fusion_calculator.analyze_mechanism_contributions(
            request.reaction_name,
            request.temperature,
            request.density,
            request.mechanisms
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/available-reactions")
async def available_reactions():
    """
    Get list of available fusion reactions.
    """
    reactions = list(fusion_calculator.reactions.keys())
    reaction_details = {
        name: {
            "reactants": f"{rxn.reactant1_z}-{rxn.reactant1_a} + {rxn.reactant2_z}-{rxn.reactant2_a}",
            "products": [f"{p['name']} ({p['branch_ratio']})" for p in rxn.products],
            "q_value_MeV": rxn.q_value
        } for name, rxn in fusion_calculator.reactions.items()
    }
    return {"reactions": reactions, "details": reaction_details}


@router.get("/available-mechanisms")
async def available_mechanisms():
    """
    Get list of available enhancement mechanisms.
    """
    mechanisms = get_mechanism_requirements()
    return {"mechanisms": list(mechanisms.keys()), "requirements": mechanisms}


@router.get("/default-configuration")
async def default_configuration():
    """
    Get default configuration for enhancement calculations.
    """
    return {"config": get_default_configuration()}


@router.post("/calculate-enhancement")
async def calculate_enhancement_api(request: EnhancementRequest):
    """
    Calculate enhancement factor from multiple mechanisms.
    """
    try:
        result = calculate_enhancement(request.config, request.mechanisms)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/material-enhancement")
async def material_enhancement(request: MaterialEnhancementRequest):
    """
    Calculate enhancement factors based on material properties.
    """
    try:
        result = calculate_enhancement_for_material(
            request.material_name,
            request.temperature,
            request.pressure,
            request.electric_field,
            request.mechanisms
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/parameter-sensitivity")
async def parameter_sensitivity(request: ParameterSensitivityRequest):
    """
    Analyze the sensitivity of enhancement to a parameter.
    """
    try:
        # Generate parameter values
        values = np.linspace(request.min_value, request.max_value, request.num_points).tolist()
        
        result = analyze_parameter_sensitivity(
            request.base_config,
            request.parameter_name,
            request.mechanism,
            values,
            request.mechanisms
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/mechanism-info/{mechanism_name}")
async def mechanism_info(mechanism_name: str):
    """
    Get information about a specific enhancement mechanism.
    """
    mechanism_descriptions = {
        "rydberg_matter": {
            "name": "Rydberg Matter Effects",
            "description": "Enhancement due to highly excited electronic states with principal quantum number n>>1, " +
                         "leading to extended electron orbits, strong polarizability, and energy localization.",
            "key_parameters": ["principal_quantum_number", "temperature", "electric_field", "density"],
            "typical_enhancement": "10^3 - 10^10",
            "references": ["Holmlid et al. (2015)", "Unified LENR Theory Sec. 2.1"]
        },
        "electron_screening": {
            "name": "Electron Screening Effects",
            "description": "Enhancement due to valence and conduction electrons partially screening the " +
                         "Coulomb barrier between reacting nuclei, effectively reducing the repulsion.",
            "key_parameters": ["atomic_number_1", "atomic_number_2", "electron_density", "temperature"],
            "typical_enhancement": "10^1 - 10^3",
            "references": ["Assenbaum et al. (1987)", "Unified LENR Theory Sec. 2.2"]
        },
        "qed_effects": {
            "name": "Double-Layer QED Effects",
            "description": "Enhancement due to quantum electrodynamic effects in double layer structures, " +
                         "including vacuum polarization and modification of vacuum energy states.",
            "key_parameters": ["electric_field", "frequency", "temperature"],
            "typical_enhancement": "10^2 - 10^5",
            "references": ["Preparata (1991)", "Unified LENR Theory Sec. 2.3"]
        },
        "casimir_forces": {
            "name": "Casimir Forces",
            "description": "Enhancement due to attractive forces between conducting materials in close proximity, " +
                         "arising from quantum vacuum fluctuations and modifying local energy landscapes.",
            "key_parameters": ["separation", "area", "temperature"],
            "typical_enhancement": "10^1 - 10^3",
            "references": ["Bordag et al. (2001)", "Unified LENR Theory Sec. 2.4"]
        },
        "quantum_coherence": {
            "name": "Quantum Coherence Effects",
            "description": "Enhancement due to coherent collective behavior of particles, including phonon " +
                         "coupling and phase coherence across multiple atomic sites.",
            "key_parameters": ["temperature", "lattice_constant", "electric_field"],
            "typical_enhancement": "10^3 - 10^5",
            "references": ["Preparata & Del Giudice (1993)", "Unified LENR Theory Sec. 2.5"]
        },
        "oppenheimer_phillips": {
            "name": "Oppenheimer-Phillips Process",
            "description": "Enhancement due to stripping reactions where a neutron is transferred from a " +
                         "projectile to the target nucleus, bypassing the full Coulomb barrier.",
            "key_parameters": ["projectile_z", "target_z", "projectile_a", "target_a", "energy_kev"],
            "typical_enhancement": "10^2 - 10^4",
            "references": ["Oppenheimer & Phillips (1935)", "Unified LENR Theory Sec. 2.6"]
        },
        "bubble_collapse": {
            "name": "Bubble Collapse and Shock Effects",
            "description": "Enhancement due to extreme conditions created during cavitation bubble collapse, " +
                         "including high temperatures, pressures, and energy focusing.",
            "key_parameters": ["initial_radius", "driving_pressure", "frequency"],
            "typical_enhancement": "10^3 - 10^30",
            "references": ["Taleyarkhan et al. (2002)", "Unified LENR Theory Sec. 2.7"]
        }
    }
    
    if mechanism_name not in mechanism_descriptions:
        raise HTTPException(status_code=404, detail=f"Mechanism {mechanism_name} not found")
    
    return mechanism_descriptions[mechanism_name]


@router.get("/unified-theory/enhancement-mechanisms")
async def unified_theory_enhancement_mechanisms():
    """
    Get all enhancement mechanisms and their descriptions from the Unified LENR Theory.
    
    Returns detailed information about all available enhancement mechanisms,
    including their physical basis, parameters, and expected enhancement ranges.
    """
    # Log that this endpoint is being called
    logger.info("API: GET /physics/unified-theory/enhancement-mechanisms endpoint called")
    
    try:
        all_mechanisms = {
            "rydberg_matter": {
                "name": "Rydberg Matter Effects",
                "description": "Enhancement due to highly excited electronic states with principal quantum number n>>1, leading to extended electron orbits, strong polarizability, and energy localization.",
                "key_parameters": ["principal_quantum_number", "temperature", "electric_field", "density"],
                "typical_enhancement": "10^3 - 10^10",
                "physical_basis": "Extended electron orbits in Rydberg states create delocalized electron structures that can modify nuclear-nuclear interaction potentials.",
                "references": ["Holmlid et al. (2015)", "Unified LENR Theory Sec. 2.1"],
                "order_of_magnitude": 6
            },
            "electron_screening": {
                "name": "Electron Screening Effects",
                "description": "Enhancement due to valence and conduction electrons partially screening the Coulomb barrier between reacting nuclei, effectively reducing the repulsion.",
                "key_parameters": ["atomic_number_1", "atomic_number_2", "electron_density", "temperature"],
                "typical_enhancement": "10^1 - 10^3",
                "physical_basis": "Electrons positioned between nuclei reduce the effective Coulomb barrier, increasing tunneling probability.",
                "references": ["Assenbaum et al. (1987)", "Unified LENR Theory Sec. 2.2"],
                "order_of_magnitude": 2
            },
            "qed_effects": {
                "name": "Double-Layer QED Effects",
                "description": "Enhancement due to quantum electrodynamic effects in double layer structures, including vacuum polarization and modification of vacuum energy states.",
                "key_parameters": ["electric_field", "frequency", "temperature"],
                "typical_enhancement": "10^2 - 10^5",
                "physical_basis": "Quantum electrodynamic effects at interfaces can modify vacuum energy states and influence nuclear tunneling rates.",
                "references": ["Preparata (1991)", "Unified LENR Theory Sec. 2.3"],
                "order_of_magnitude": 3
            },
            "casimir_forces": {
                "name": "Casimir Forces",
                "description": "Enhancement due to attractive forces between conducting materials in close proximity, arising from quantum vacuum fluctuations and modifying local energy landscapes.",
                "key_parameters": ["separation", "area", "temperature"],
                "typical_enhancement": "10^1 - 10^3",
                "physical_basis": "Vacuum energy modifications at small separations can influence nuclear interaction dynamics.",
                "references": ["Bordag et al. (2001)", "Unified LENR Theory Sec. 2.4"],
                "order_of_magnitude": 2
            },
            "quantum_coherence": {
                "name": "Quantum Coherence Effects",
                "description": "Enhancement due to coherent collective behavior of particles, including phonon coupling and phase coherence across multiple atomic sites.",
                "key_parameters": ["temperature", "lattice_constant", "electric_field"],
                "typical_enhancement": "10^3 - 10^5",
                "physical_basis": "Coherent quantum states can create extended wavefunctions that enhance tunneling across multiple sites.",
                "references": ["Preparata & Del Giudice (1993)", "Unified LENR Theory Sec. 2.5"],
                "order_of_magnitude": 4
            },
            "oppenheimer_phillips": {
                "name": "Oppenheimer-Phillips Process",
                "description": "Enhancement due to stripping reactions where a neutron is transferred from a projectile to the target nucleus, bypassing the full Coulomb barrier.",
                "key_parameters": ["projectile_z", "target_z", "projectile_a", "target_a", "energy_kev"],
                "typical_enhancement": "10^2 - 10^4",
                "physical_basis": "Neutron stripping reactions face lower barriers than complete fusion, providing alternative reaction pathways.",
                "references": ["Oppenheimer & Phillips (1935)", "Unified LENR Theory Sec. 2.6"],
                "order_of_magnitude": 3
            },
            "bubble_collapse": {
                "name": "Bubble Collapse and Shock Effects",
                "description": "Enhancement due to extreme conditions created during cavitation bubble collapse, including high temperatures, pressures, and energy focusing.",
                "key_parameters": ["initial_radius", "driving_pressure", "frequency"],
                "typical_enhancement": "10^3 - 10^30",
                "physical_basis": "Sonoluminescence and sonofusion conditions can create extreme local conditions that dramatically enhance reaction rates.",
                "references": ["Taleyarkhan et al. (2002)", "Unified LENR Theory Sec. 2.7"],
                "order_of_magnitude": 10
            }
        }
        
        logger.info(f"Successfully returned data for {len(all_mechanisms)} mechanisms")
        return {"mechanisms": all_mechanisms}
    except Exception as e:
        logger.error(f"Error in enhancement_mechanisms endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


class EnhancementConfigRequest(BaseModel):
    """Request model for unified theory enhancement calculation."""
    config: Dict[str, Dict[str, Any]] = Field(..., description="Configuration parameters for each mechanism")
    mechanisms: Optional[List[str]] = Field(None, description="List of mechanisms to include in the calculation")
    
    @root_validator
    def validate_config(cls, values):
        """Validate the enhancement configuration."""
        config = values.get("config", {})
        mechanisms = values.get("mechanisms")
        
        if not config:
            raise ValueError("Configuration cannot be empty")
        
        if mechanisms:
            # Check that all specified mechanisms exist in the config
            for mech in mechanisms:
                if mech not in config:
                    raise ValueError(f"Mechanism '{mech}' specified but not found in configuration")
        
        # Validate each mechanism's parameters
        mechanism_requirements = {
            "rydberg_matter": ["principal_quantum_number", "temperature", "electric_field", "density"],
            "electron_screening": ["atomic_number_1", "atomic_number_2", "electron_density", "temperature"],
            "qed_effects": ["electric_field", "frequency", "temperature"],
            "casimir_forces": ["separation", "area", "temperature"],
            "quantum_coherence": ["temperature", "lattice_constant", "electric_field"],
            "oppenheimer_phillips": ["projectile_z", "target_z", "projectile_a", "target_a", "energy_kev"],
            "bubble_collapse": ["initial_radius", "driving_pressure", "frequency"]
        }
        
        for mech_name, mech_config in config.items():
            if mech_name in mechanism_requirements:
                required_params = mechanism_requirements[mech_name]
                for param in required_params:
                    if param not in mech_config:
                        raise ValueError(f"Required parameter '{param}' missing for mechanism '{mech_name}'")
        
        return values


@router.post("/unified-theory/calculate-combined-enhancement")
async def calculate_combined_enhancement(
    request: EnhancementConfigRequest
):
    """
    Calculate the combined enhancement factor for a specific configuration.
    
    This endpoint allows detailed exploration of how different mechanisms
    combine to enhance fusion reactions according to the Unified LENR Theory.
    
    Args:
        request: EnhancementConfigRequest with configuration and mechanisms
        
    Returns:
        Dictionary with detailed enhancement results
    """
    try:
        # Log the request
        logger.info(f"API: POST /physics/unified-theory/calculate-combined-enhancement called with {len(request.config)} mechanisms")
        
        # Use the unified enhancement calculator
        from app.physics.unified_enhancement import calculate_enhancement
        
        # Validate mechanism names
        if request.mechanisms:
            valid_mechanisms = set(get_mechanism_requirements().keys())
            for mech in request.mechanisms:
                if mech not in valid_mechanisms:
                    raise HTTPException(
                        status_code=400, 
                        detail=f"Invalid mechanism: '{mech}'. Valid mechanisms are: {', '.join(valid_mechanisms)}"
                    )
        
        # Calculate combined enhancement
        result = calculate_enhancement(request.config, request.mechanisms)
        
        # Add timestamp and version info
        result["metadata"] = {
            "model_version": "1.0.0",
            "timestamp": datetime.now().isoformat(),
            "mechanisms_included": request.mechanisms if request.mechanisms else list(request.config.keys())
        }
        
        logger.info(f"Successfully calculated enhancement with factors: {result.get('log_combined_enhancement', 'N/A')}")
        return result
    
    except ValueError as e:
        # Handle validation errors
        logger.error(f"Validation error in calculate_combined_enhancement: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        # Handle other errors
        logger.error(f"Error calculating combined enhancement: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/unified-theory/parameter-ranges")
async def unified_theory_parameter_ranges():
    """
    Get typical parameter ranges for each enhancement mechanism.
    
    Returns the expected ranges for each parameter in the different
    enhancement mechanisms, useful for UI sliders and input validation.
    """
    # Log that this endpoint is being called
    logger.info("API: GET /physics/unified-theory/parameter-ranges endpoint called")
    
    try:
        parameter_ranges = {
            "rydberg_matter": {
                "principal_quantum_number": {"min": 10, "max": 100, "default": 20, "unit": ""},
                "temperature": {"min": 273, "max": 1273, "default": 300, "unit": "K"},
                "electric_field": {"min": 1e3, "max": 1e8, "default": 1e5, "unit": "V/m"},
                "density": {"min": 1e26, "max": 1e30, "default": 1e28, "unit": "m^-3"}
            },
            "electron_screening": {
                "atomic_number_1": {"min": 1, "max": 10, "default": 1, "unit": ""},
                "atomic_number_2": {"min": 1, "max": 92, "default": 46, "unit": ""},
                "electron_density": {"min": 1e26, "max": 1e30, "default": 1e28, "unit": "m^-3"},
                "temperature": {"min": 273, "max": 1273, "default": 300, "unit": "K"}
            },
            "qed_effects": {
                "electric_field": {"min": 1e5, "max": 1e9, "default": 1e7, "unit": "V/m"},
                "frequency": {"min": 1e9, "max": 1e15, "default": 1e12, "unit": "Hz"},
                "temperature": {"min": 273, "max": 1273, "default": 300, "unit": "K"}
            },
            "casimir_forces": {
                "separation": {"min": 1e-11, "max": 1e-8, "default": 1e-10, "unit": "m"},
                "area": {"min": 1e-20, "max": 1e-16, "default": 1e-18, "unit": "m^2"},
                "temperature": {"min": 273, "max": 1273, "default": 300, "unit": "K"}
            },
            "quantum_coherence": {
                "temperature": {"min": 4, "max": 1273, "default": 300, "unit": "K"},
                "lattice_constant": {"min": 1e-10, "max": 1e-9, "default": 4e-10, "unit": "m"},
                "electric_field": {"min": 1e3, "max": 1e7, "default": 1e5, "unit": "V/m"}
            },
            "oppenheimer_phillips": {
                "projectile_z": {"min": 1, "max": 10, "default": 1, "unit": ""},
                "target_z": {"min": 1, "max": 92, "default": 3, "unit": ""},
                "projectile_a": {"min": 1, "max": 20, "default": 2, "unit": ""},
                "target_a": {"min": 1, "max": 238, "default": 7, "unit": ""},
                "energy_kev": {"min": 0.01, "max": 100, "default": 1.0, "unit": "keV"}
            },
            "bubble_collapse": {
                "initial_radius": {"min": 1e-6, "max": 1e-3, "default": 1e-5, "unit": "m"},
                "driving_pressure": {"min": 1e4, "max": 1e7, "default": 1e5, "unit": "Pa"},
                "frequency": {"min": 1e3, "max": 1e6, "default": 2e4, "unit": "Hz"}
            }
        }
        
        logger.info(f"Successfully returned parameter ranges for {len(parameter_ranges)} mechanisms")
        return {"parameter_ranges": parameter_ranges}
    except Exception as e:
        logger.error(f"Error in parameter_ranges endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}") 