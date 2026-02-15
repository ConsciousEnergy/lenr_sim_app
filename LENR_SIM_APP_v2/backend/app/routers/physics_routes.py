"""
Physics API routes for LENR_Sim_App

This module defines the API routes for physics calculations in the LENR simulation app.
It provides endpoints for calculating fusion rates, enhancement factors, and other
physics-related quantities using the Unified LENR Theory framework.

NOTE (v0.3.3-beta): This router has prefix="/physics" and is mounted at
"/api/physics" in main.py (via routers/__init__.py), so endpoints resolve
to /api/physics/physics/... .  This is a legacy prefix issue. The theory
testbed endpoints (theories, theories/run) live in api/routes/physics.py
at /api/physics/... .  See docs/API_CONSOLIDATION.md for the full map.
"""

from fastapi import APIRouter, HTTPException, Query, Body, Depends, BackgroundTasks
from typing import List, Dict, Any, Optional, Tuple, Literal
from pydantic import BaseModel, Field, model_validator
import numpy as np
import json
import time
import os
import traceback
from scipy import constants as const
import sys

from app.physics.enhanced_fusion import calculate_fusion_rate, EnhancedFusionCalculator
from app.physics.unified_enhancement import (
    calculate_enhancement, 
    get_mechanism_requirements,
    get_default_configuration,
    calculate_enhancement_for_material,
    analyze_parameter_sensitivity,
    get_enhancement_cache_stats,
    clear_enhancement_cache,
    improved_cache_key
)
from app.physics.quantum_tunneling import (
    calculate_advanced_tunneling,
    calculate_temperature_pressure_dependence,
    TunnelingParameters
)
from ..physics.phonon_modes import (
    LatticeParameters,
    calculate_phonon_dispersion,
    calculate_phonon_density_of_states,
    calculate_phonon_spectrum,
    calculate_coherent_phonon_tunneling
)
# New imports for theoretical enhancements
from app.physics.qed_effects import (
    calculate_qed_lagrangian,
    vacuum_polarization_correction,
    field_matter_coupling,
    calculate_full_qed_enhancement,
    QEDLagrangianComponents,
    QEDEnhancementResult
)
from app.physics.phonon_nuclear_coupling import (
    calculate_phonon_nuclear_coupling,
    calculate_for_material as calculate_phonon_coupling_for_material,
    PhononNuclearParameters,
    PhononNuclearCouplingResult
)
from app.physics.non_equilibrium_thermo import (
    calculate_energy_balance,
    excess_power_analysis,
    entropy_production_rate,
    ExcessPowerAnalysis
)
from app.physics.reaction_rates import (
    statistical_reaction_rate,
    StatisticalReactionRateResult,
    EnhancementFactors
)
from ..physics.models import FusionReaction, FusionProduct, ReactionConditions, FusionEnhancementFactors
from ..core.config import get_settings
from ..utils.reaction_storage import ReactionStorage
from ..utils.logging import setup_logger
from app.utils.performance_tracker import PerformanceTracker, track_performance, get_tracker

# Define loggers
router_logger = setup_logger("physics_routes", "logs/physics_routes.log")
timeout_logger = setup_logger("timeout", "logs/timeout.log")
performance_logger = setup_logger("performance", "logs/performance.log")

router = APIRouter(
    prefix="/physics",
    tags=["physics"],
    responses={404: {"description": "Not found"}},
)

# Create data directory if it doesn't exist
data_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "data")
os.makedirs(data_dir, exist_ok=True)

# Initialize the reaction storage
storage_path = os.path.join(data_dir, "custom_reactions.json")
reaction_storage = ReactionStorage(storage_path)
router_logger.info(f"Initialized reaction storage at: {storage_path}")

# Initialize the fusion calculator with storage
fusion_calculator = EnhancedFusionCalculator(storage=reaction_storage)
router_logger.info("Initialized fusion calculator with storage integration")

# Performance tracking
performance_tracker = PerformanceTracker("physics_api")


class FusionRateRequest(BaseModel):
    """Request model for fusion rate calculation."""
    reaction_name: str = Field(..., description="Name of the fusion reaction")
    conditions: ReactionConditions
    enhancement_factors: Optional[FusionEnhancementFactors] = None


class FusionRateResponse(BaseModel):
    reaction_rate: float = Field(..., description="Calculated fusion reaction rate")
    cross_section: float = Field(..., description="Nuclear cross-section")
    enhanced_rate: Optional[float] = Field(None, description="Enhanced reaction rate with quantum effects")
    enhancement_factor: Optional[float] = Field(None, description="Total enhancement factor applied")


class MultiTemperatureRequest(BaseModel):
    """Request model for multi-temperature calculation."""
    reaction_name: str = Field(..., description="Name of the fusion reaction")
    temperatures: List[float] = Field(..., description="List of temperatures in keV")
    density: float = Field(..., description="Particle density in m^-3")
    enhancement_factors: Optional[FusionEnhancementFactors] = None


class ReactionComparisonRequest(BaseModel):
    """Request model for reaction comparison."""
    temperature: float = Field(..., description="Temperature in Kelvin")
    density: float = Field(..., description="Number density of reactants in m^-3")
    mechanisms: Optional[List[str]] = Field(None, description="List of enhancement mechanisms to include")


class OptimizationRequest(BaseModel):
    """Request model for condition optimization."""
    reaction_name: str = Field(..., description="Name of the fusion reaction")
    temperature_range: tuple[float, float] = Field(..., description="Temperature range (min, max) in keV")
    density: float = Field(..., description="Particle density in m^-3")
    enhancement_factors: Optional[FusionEnhancementFactors] = None


class OptimizationResponse(BaseModel):
    optimal_temperature: float = Field(..., description="Temperature that maximizes reaction rate")
    maximum_rate: float = Field(..., description="Maximum achievable reaction rate")
    cross_section: float = Field(..., description="Nuclear cross-section at optimal temperature")
    enhanced_rate: Optional[float] = Field(None, description="Enhanced reaction rate at optimal temperature")
    enhancement_factor: Optional[float] = Field(None, description="Enhancement factor at optimal temperature")


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
    timeout_hint: Optional[float] = Field(None, description="Hint for how long this calculation might take")


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
    
    @model_validator(mode='after')
    def validate_parameter_in_mechanism(self) -> 'ParameterSensitivityRequest':
        """Validate that the parameter exists in the mechanism."""
        if not self.base_config or not self.mechanism or not self.parameter_name:
            return self
        
        if self.mechanism not in self.base_config:
            raise ValueError(f"Mechanism '{self.mechanism}' not found in configuration")
        
        if self.parameter_name not in self.base_config[self.mechanism]:
            raise ValueError(f"Parameter '{self.parameter_name}' not found in mechanism '{self.mechanism}'")
        
        return self


@router.post("/calculate/rate", response_model=FusionRateResponse)
async def calculate_fusion_rate(request: FusionRateRequest):
    """Calculate fusion reaction rate for given conditions"""
    try:
        result = fusion_calculator.calculate_reaction_rate(
            request.reaction_name,
            request.conditions,
            request.enhancement_factors
        )
        return FusionRateResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/calculate/temperature-scan", response_model=Dict[str, List[float]])
async def calculate_temperature_scan(request: MultiTemperatureRequest):
    """Calculate fusion rates across multiple temperatures"""
    try:
        return fusion_calculator.calculate_temperature_scan(
            request.reaction_name,
            request.temperatures,
            request.density,
            request.enhancement_factors
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/optimize/temperature", response_model=OptimizationResponse)
async def optimize_temperature(request: OptimizationRequest):
    """Find optimal temperature for maximum reaction rate"""
    try:
        result = fusion_calculator.optimize_temperature(
            request.reaction_name,
            request.temperature_range,
            request.density,
            request.enhancement_factors
        )
        return OptimizationResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


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
@track_performance("calculate_enhancement_api")
async def calculate_enhancement_api(
    request: EnhancementRequest,
    background_tasks: BackgroundTasks
):
    """
    Calculate enhancement factor from multiple mechanisms.
    
    This endpoint provides enhancement factor calculations based on LENR theory mechanisms.
    Results are cached for improved performance on repeated calculations.
    
    Extended timeout is possible for complex calculations by providing a timeout_hint.
    """
    try:
        # Start timing
        start_time = time.time()
        
        # Log request information for debugging timeouts
        mechanism_count = len(request.mechanisms or [])
        config_size = sum(len(mech_config) for mech_config in request.config.values())
        complexity_estimate = mechanism_count * config_size
        
        # Add request information to response metadata
        request_metadata = {
            "mechanism_count": mechanism_count,
            "config_parameters": config_size,
            "complexity_estimate": complexity_estimate,
            "start_time": start_time,
            "timeout_hint": request.timeout_hint
        }
        
        # Log potentially expensive calculations 
        if complexity_estimate > 100 or (request.timeout_hint and request.timeout_hint > 60):
            timeout_logger.info(
                f"High complexity enhancement calculation: {mechanism_count} mechanisms, "
                f"{config_size} parameters, complexity={complexity_estimate}, "
                f"timeout_hint={request.timeout_hint}s"
            )
        
        # For very complex calculations, do early validation
        if complexity_estimate > 200:
            # Validation: Check if requested mechanisms exist
            if request.mechanisms:
                for mechanism in request.mechanisms:
                    if mechanism not in {"electron_screening", "coherent_tunneling", 
                                        "rydberg_matter", "interface_field", 
                                        "casimir_force", "shock_confinement", 
                                        "oppenheimer_phillips"}:
                        error_msg = f"Unknown mechanism: {mechanism}"
                        router_logger.warning(error_msg)
                        raise HTTPException(status_code=400, detail=error_msg)
            
            # Validation: Check if config contains requested mechanisms
            if request.mechanisms:
                missing_configs = [m for m in request.mechanisms if m not in request.config]
                if missing_configs:
                    error_msg = f"Missing configuration for mechanisms: {', '.join(missing_configs)}"
                    router_logger.warning(error_msg)
                    raise HTTPException(status_code=400, detail=error_msg)
        
        # Use optimized cached implementation with enhanced error handling
        try:
            # Set a soft timeout for calculation
            soft_timeout = request.timeout_hint or 120  # default 120s
            if complexity_estimate > 150:
                soft_timeout = max(soft_timeout, 180)  # minimum 180s for complex calcs
            
            # Check if this is likely to be a cache hit first
            cache_key = improved_cache_key(request.config, request.mechanisms)
            cached_result = get_enhancement_cache_stats().get("hit_ratio", 0) > 0.5
            
            # For complex calculations that might timeout, use performance tracker
            if complexity_estimate > 200 and not cached_result:
                # Log that we're starting a potentially long calculation
                timeout_logger.info(
                    f"Starting complex enhancement calculation (complexity={complexity_estimate}), "
                    f"expected duration: {soft_timeout}s"
                )
            
            # Added a memory check before calculation
            perform_gc_cleanup = getattr(sys.modules.get('app.utils.memory_monitor', None), 'perform_gc_cleanup', None)
            if perform_gc_cleanup and complexity_estimate > 300:
                # Run garbage collection before large calculations
                perform_gc_cleanup()
            
            result = calculate_enhancement(request.config, request.mechanisms)
        except Exception as e:
            # Detailed error logging for calculation issues
            error_msg = f"Enhancement calculation error: {str(e)}"
            timeout_logger.error(f"{error_msg}\n{traceback.format_exc()}")
            
            # Check if we have a partial result from cache
            try:
                # Try with fewer mechanisms if there are more than one
                if request.mechanisms and len(request.mechanisms) > 1:
                    # Try with the first half of the mechanisms
                    half_mechanisms = request.mechanisms[:len(request.mechanisms)//2]
                    partial_result = calculate_enhancement(request.config, half_mechanisms)
                    
                    # Return partial result with warning
                    partial_result["warning"] = f"Partial result with reduced mechanisms due to error: {str(e)}"
                    partial_result["mechanisms_used"] = half_mechanisms
                    
                    # Log the fallback
                    router_logger.warning(f"Returned partial result with {len(half_mechanisms)} mechanisms")
                    
                    return partial_result
            except Exception:
                # If partial result fails, raise the original error
                pass
                
            raise HTTPException(status_code=500, detail=error_msg)
        
        # Add process time and metadata to result
        process_time = time.time() - start_time
        
        # Update metadata
        if "metadata" not in result:
            result["metadata"] = {}
        
        result["metadata"]["process_time_ms"] = round(process_time * 1000, 2)
        result["metadata"]["request_info"] = request_metadata
        
        # Log if calculation took longer than expected
        if process_time > 10:  # Consider anything over 10 seconds slow
            background_tasks.add_task(
                performance_tracker.track_slow_operation,
                "enhancement_calculation",
                process_time,
                {
                    "mechanisms": mechanism_count,
                    "parameters": config_size,
                    "complexity": complexity_estimate,
                    "cache_hit": result.get("metadata", {}).get("cache_hit", False)
                }
            )
            
            # Also log to timeout logger for monitoring
            log_level = "warning" if process_time > 60 else "info"
            if log_level == "warning":
                timeout_logger.warning(
                    f"Long enhancement calculation: {process_time:.2f}s with " +
                    f"{mechanism_count} mechanisms, complexity={complexity_estimate}"
                )
            else:
                timeout_logger.info(
                    f"Enhancement calculation took {process_time:.2f}s with " +
                    f"{mechanism_count} mechanisms, complexity={complexity_estimate}"
                )
        
        return result
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        # Catch all other errors
        error_detail = f"Unexpected error in enhancement calculation: {str(e)}"
        router_logger.error(f"{error_detail}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=error_detail)


@router.get("/enhancement-cache-stats")
async def enhancement_cache_statistics():
    """
    Get statistics on enhancement calculation cache
    
    Returns cache size, hit/miss counts, and performance statistics
    """
    return get_enhancement_cache_stats()


@router.post("/enhancement-cache-clear")
async def enhancement_cache_clear():
    """
    Clear the enhancement calculation cache
    
    Removes all cached calculations and returns count of cleared entries
    """
    cleared = clear_enhancement_cache()
    return {"cleared_entries": cleared, "status": "ok"}


@router.post("/material-enhancement")
async def material_enhancement(request: MaterialEnhancementRequest):
    """
    Calculate enhancement factors for a specific material.
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


@router.post("/analyze-parameter-sensitivity")
async def parameter_sensitivity(request: ParameterSensitivityRequest):
    """
    Analyze the sensitivity of enhancement to a specific parameter.
    """
    try:
        result = analyze_parameter_sensitivity(
            request.parameter_name,
            request.mechanism,
            request.min_value,
            request.max_value,
            request.num_points,
            request.base_config,
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
            "references": [
                "Holmlid, L. & Olafsson, S. (2015). 'Spontaneous ejection of high-energy particles from ultra-dense deuterium D(0).' Int. J. Hydrogen Energy, 40(33), 10559-10567.",
                "Acs, D. et al. (2025). 'A Unified Theoretical Framework for Low-Energy Nuclear Reactions.' Sec. 2.1"
            ]
        },
        "electron_screening": {
            "name": "Electron Screening Effects",
            "description": "Enhancement due to valence and conduction electrons partially screening the " +
                         "Coulomb barrier between reacting nuclei, effectively reducing the repulsion.",
            "key_parameters": ["atomic_number_1", "atomic_number_2", "electron_density", "temperature"],
            "typical_enhancement": "10^1 - 10^3",
            "references": [
                "Assenbaum, H.J., Langanke, K. & Rolfs, C. (1987). 'Effects of electron screening on low-energy fusion cross sections.' Z. Phys. A, 327, 461-468.",
                "Acs, D. et al. (2025). 'A Unified Theoretical Framework for Low-Energy Nuclear Reactions.' Sec. 2.2"
            ]
        },
        "qed_effects": {
            "name": "Double-Layer QED Effects",
            "description": "Enhancement due to quantum electrodynamic effects in double layer structures, " +
                         "including vacuum polarization and modification of vacuum energy states.",
            "key_parameters": ["electric_field", "frequency", "temperature"],
            "typical_enhancement": "10^2 - 10^5",
            "references": [
                "Preparata, G. (1991). 'A New Look at Solid-State Fractures, Particle Emission and Cold Nuclear Fusion.' Il Nuovo Cimento, 104A(8), 1259-1263.",
                "Acs, D. et al. (2025). 'A Unified Theoretical Framework for Low-Energy Nuclear Reactions.' Sec. 2.3"
            ]
        },
        "casimir_forces": {
            "name": "Casimir Forces",
            "description": "Enhancement due to attractive forces between conducting materials in close proximity, " +
                         "arising from quantum vacuum fluctuations and modifying local energy landscapes.",
            "key_parameters": ["separation", "area", "temperature"],
            "typical_enhancement": "10^1 - 10^3",
            "references": [
                "Bordag, M., Mohideen, U. & Mostepanenko, V.M. (2001). 'New developments in the Casimir effect.' Phys. Reports, 353(1-3), 1-205.",
                "Acs, D. et al. (2025). 'A Unified Theoretical Framework for Low-Energy Nuclear Reactions.' Sec. 2.4"
            ]
        },
        "quantum_coherence": {
            "name": "Quantum Coherence Effects",
            "description": "Enhancement due to coherent collective behavior of particles, including phonon " +
                         "coupling and phase coherence across multiple atomic sites.",
            "key_parameters": ["temperature", "lattice_constant", "electric_field"],
            "typical_enhancement": "10^3 - 10^5",
            "references": [
                "Preparata, G. & Del Giudice, E. (1993). 'Coherent Electrodynamics of Multi-Mode Excitations of Polar Molecules.' Mod. Phys. Lett. B, 7(27), 1779-1788.",
                "Acs, D. et al. (2025). 'A Unified Theoretical Framework for Low-Energy Nuclear Reactions.' Sec. 2.5"
            ]
        },
        "oppenheimer_phillips": {
            "name": "Oppenheimer-Phillips Process",
            "description": "Enhancement due to stripping reactions where a neutron is transferred from a " +
                         "projectile to the target nucleus, bypassing the full Coulomb barrier.",
            "key_parameters": ["projectile_z", "target_z", "projectile_a", "target_a", "energy_kev"],
            "typical_enhancement": "10^2 - 10^4",
            "references": [
                "Oppenheimer, J.R. & Phillips, M. (1935). 'Note on the Transmutation Function for Deuterons.' Phys. Rev., 48, 500-502.",
                "Acs, D. et al. (2025). 'A Unified Theoretical Framework for Low-Energy Nuclear Reactions.' Sec. 2.6"
            ]
        },
        "bubble_collapse": {
            "name": "Bubble Collapse and Shock Effects",
            "description": "Enhancement due to extreme conditions created during cavitation bubble collapse, " +
                         "including high temperatures, pressures, and energy focusing.",
            "key_parameters": ["initial_radius", "driving_pressure", "frequency"],
            "typical_enhancement": "10^3 - 10^30",
            "references": [
                "Taleyarkhan, R.P. et al. (2002). 'Evidence for Nuclear Emissions During Acoustic Cavitation.' Science, 295(5561), 1868-1873.",
                "Acs, D. et al. (2025). 'A Unified Theoretical Framework for Low-Energy Nuclear Reactions.' Sec. 2.7"
            ]
        }
    }
    
    if mechanism_name not in mechanism_descriptions:
        raise HTTPException(status_code=404, detail=f"Mechanism {mechanism_name} not found")
    
    return mechanism_descriptions[mechanism_name]


# Advanced Quantum Tunneling API endpoints

class AdvancedTunnelingRequest(BaseModel):
    """Request model for advanced quantum tunneling calculations."""
    temperature: float = Field(300.0, description="Temperature in Kelvin")
    potential_type: Literal["coulomb", "yukawa"] = Field("coulomb", description="Type of potential barrier")
    particle_mass: Optional[float] = Field(None, description="Particle mass in kg (defaults to deuteron)")
    barrier_width: float = Field(1e-10, description="Width of potential barrier in meters")
    z1: int = Field(1, description="Atomic number of first nucleus")
    z2: int = Field(1, description="Atomic number of second nucleus")
    energy_min_ev: float = Field(0.01, description="Minimum energy to consider (eV)")
    energy_max_ev: float = Field(10.0, description="Maximum energy to consider (eV)")
    energy_points: int = Field(100, description="Number of energy points to calculate")
    electron_screening: bool = Field(True, description="Whether to include electron screening effects")
    screening_length: Optional[float] = Field(None, description="Screening length in meters (for yukawa potential)")
    phonon_assisted: bool = Field(False, description="Whether to include phonon-assisted tunneling")
    lattice_sites: int = Field(1, description="Number of coherent lattice sites for multi-site tunneling")
    model_type: Literal["wkb", "gamow"] = Field("wkb", description="Quantum tunneling calculation method")


class TemperaturePressureDependenceRequest(BaseModel):
    """Request model for temperature-pressure dependence calculations."""
    base_parameters: Dict[str, Any] = Field(..., description="Base tunneling parameters")
    temperature_min: float = Field(100.0, description="Minimum temperature (K)")
    temperature_max: float = Field(1000.0, description="Maximum temperature (K)")
    include_pressure: bool = Field(False, description="Whether to include pressure dependence")
    pressure_min: Optional[float] = Field(None, description="Minimum pressure (Pa)")
    pressure_max: Optional[float] = Field(None, description="Maximum pressure (Pa)")
    points: int = Field(10, description="Number of points to calculate")


@router.post("/quantum-tunneling")
async def quantum_tunneling(request: AdvancedTunnelingRequest):
    """
    Calculate quantum tunneling probability with advanced models.
    
    This endpoint provides detailed quantum tunneling calculations using:
    - Advanced WKB approximation
    - Energy-dependent screening effects
    - Phonon-assisted tunneling
    - Coherent multi-site effects
    
    Returns detailed energy-dependent tunneling probabilities and enhancement factors.
    """
    try:
        start_time = time.time()
        
        # Prepare tunneling parameters
        params = TunnelingParameters(
            temperature=request.temperature,
            potential_type=request.potential_type,
            barrier_width=request.barrier_width,
            energy_range=(request.energy_min_ev, request.energy_max_ev),
            energy_points=request.energy_points,
            electron_screening=request.electron_screening,
            phonon_assisted=request.phonon_assisted,
            lattice_sites=request.lattice_sites,
            model_type=request.model_type
        )
        
        # Set particle mass if provided, otherwise use default (deuteron)
        if request.particle_mass is not None:
            params.particle_mass = request.particle_mass
            
        # Set potential parameters
        params.potential_params = {
            "Z1": request.z1,
            "Z2": request.z2
        }
        
        # Set screening length if provided
        if request.screening_length is not None:
            params.screening_length = request.screening_length
        
        # Calculate tunneling probability
        result = calculate_advanced_tunneling(params)
        
        # Add processing time to metadata
        result["metadata"]["processing_time_ms"] = round((time.time() - start_time) * 1000, 2)
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/tunneling-temperature-pressure")
async def tunneling_temperature_pressure(request: TemperaturePressureDependenceRequest):
    """
    Calculate tunneling probability as a function of temperature and pressure.
    
    This endpoint analyzes how tunneling probability changes with temperature 
    and optionally with pressure, providing insights into optimal conditions
    for LENR experiments.
    """
    try:
        start_time = time.time()
        
        # Convert dictionary to TunnelingParameters
        base_params = TunnelingParameters(**request.base_parameters)
        
        # Prepare temperature range
        temp_range = (request.temperature_min, request.temperature_max)
        
        # Prepare pressure range if requested
        pressure_range = None
        if request.include_pressure and request.pressure_min is not None and request.pressure_max is not None:
            pressure_range = (request.pressure_min, request.pressure_max)
        
        # Calculate dependencies
        result = calculate_temperature_pressure_dependence(
            base_params,
            temp_range,
            pressure_range,
            request.points
        )
        
        # Add processing time to metadata
        result["metadata"]["processing_time_ms"] = round((time.time() - start_time) * 1000, 2)
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/tunneling-presets")
async def tunneling_presets():
    """
    Get predefined parameter presets for quantum tunneling calculations.
    
    These presets provide starting points for different materials and scenarios
    relevant to LENR experiments.
    """
    presets = {
        "palladium_deuterium": {
            "name": "Palladium-Deuterium System",
            "description": "Typical parameters for D in Pd lattice",
            "parameters": {
                "temperature": 300.0,
                "potential_type": "yukawa",
                "barrier_width": 1.5e-10,
                "z1": 1,
                "z2": 1,
                "electron_screening": True,
                "screening_length": 2.5e-11,
                "phonon_assisted": True,
                "lattice_sites": 3,
                "model_type": "wkb"
            }
        },
        "nickel_hydrogen": {
            "name": "Nickel-Hydrogen System",
            "description": "Typical parameters for H in Ni lattice",
            "parameters": {
                "temperature": 350.0,
                "potential_type": "yukawa",
                "barrier_width": 1.2e-10,
                "z1": 1,
                "z2": 1,
                "electron_screening": True,
                "screening_length": 3.0e-11,
                "phonon_assisted": True,
                "lattice_sites": 2,
                "model_type": "wkb"
            }
        },
        "titanium_deuterium": {
            "name": "Titanium-Deuterium System",
            "description": "Typical parameters for D in Ti lattice",
            "parameters": {
                "temperature": 320.0,
                "potential_type": "yukawa",
                "barrier_width": 1.4e-10,
                "z1": 1,
                "z2": 1,
                "electron_screening": True,
                "screening_length": 2.8e-11,
                "phonon_assisted": True,
                "lattice_sites": 2,
                "model_type": "wkb"
            }
        },
        "high_pressure": {
            "name": "High Pressure Environment",
            "description": "Parameters for high-pressure LENR experiments",
            "parameters": {
                "temperature": 400.0,
                "potential_type": "yukawa",
                "barrier_width": 1.1e-10,
                "z1": 1,
                "z2": 1,
                "electron_screening": True,
                "screening_length": 1.8e-11,  # Shorter screening length due to higher pressure
                "phonon_assisted": True,
                "lattice_sites": 4,
                "model_type": "wkb"
            }
        },
        "basic_dd_fusion": {
            "name": "Basic D-D Fusion",
            "description": "Classical D-D fusion with Gamow factor",
            "parameters": {
                "temperature": 300.0,
                "potential_type": "coulomb",
                "barrier_width": 1e-10,
                "z1": 1,
                "z2": 1,
                "electron_screening": False,
                "screening_length": None,
                "phonon_assisted": False,
                "lattice_sites": 1,
                "model_type": "gamow"
            }
        }
    }
    
    return {"presets": presets}


# Phonon Mode API endpoints

class LatticeParametersRequest(BaseModel):
    """Request model for lattice parameters."""
    lattice_type: Literal["sc", "bcc", "fcc", "hcp", "custom"] = Field("fcc", description="Type of lattice structure")
    lattice_constant: float = Field(3.89e-10, description="Lattice constant in meters")
    dimensions: Tuple[int, int, int] = Field((10, 10, 10), description="Number of unit cells in each dimension")
    atomic_mass: Optional[float] = Field(None, description="Atomic mass in kg (defaults to element-specific value)")
    debye_temperature: float = Field(275.0, description="Debye temperature in Kelvin")
    spring_constant: float = Field(20.0, description="Effective spring constant in N/m")
    anharmonicity: float = Field(0.05, description="Anharmonicity correction factor")
    has_loading: bool = Field(True, description="Whether the lattice has loaded elements (H, D, T)")
    loading_element: Literal["H", "D", "T"] = Field("D", description="Type of loaded element")
    loading_ratio: float = Field(0.8, description="Loading ratio (atoms per metal atom)")
    loading_sites: Literal["octahedral", "tetrahedral", "mixed"] = Field("octahedral", description="Loading sites in the lattice")
    temperature: float = Field(300.0, description="Temperature in Kelvin")
    max_wavenumber: float = Field(10.0, description="Maximum wavenumber in simulation")
    wavenumber_points: int = Field(50, description="Number of points in wavenumber grid")


class PhononDispersionRequest(BaseModel):
    """Request model for phonon dispersion calculation."""
    lattice_params: Dict[str, Any] = Field(..., description="Lattice parameters")
    direction: Literal["100", "110", "111"] = Field("100", description="Direction in the Brillouin zone")


class PhononNuclearCouplingRequest(BaseModel):
    """Request model for phonon-nuclear coupling calculation."""
    lattice_params: Dict[str, Any] = Field(..., description="Lattice parameters")
    energy_transfer_ev: float = Field(1.0, description="Energy transferred between phonon and nucleus (eV)")


@router.post("/phonon-dispersion")
async def phonon_dispersion(request: PhononDispersionRequest):
    """
    Calculate phonon dispersion relation along a specific direction in the Brillouin zone.
    
    This endpoint provides phonon frequency vs. wavenumber information, which is essential
    for understanding lattice dynamics and energy transport in LENR systems.
    """
    try:
        start_time = time.time()
        
        # Convert dictionary to LatticeParameters
        lattice_params = LatticeParameters(**request.lattice_params)
        
        # Calculate phonon dispersion
        result = calculate_phonon_dispersion(
            params=lattice_params,
            q_direction=request.direction
        )
        
        # Add processing time to metadata
        result["metadata"]["processing_time_ms"] = round((time.time() - start_time) * 1000, 2)
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/phonon-density-of-states")
async def phonon_density_of_states(request: LatticeParametersRequest):
    """
    Calculate phonon density of states (DOS) for a given lattice structure.
    
    The phonon DOS describes the number of phonon modes per unit frequency interval,
    which is crucial for understanding thermal properties and energy distributions.
    """
    try:
        start_time = time.time()
        
        # Create LatticeParameters object
        params_dict = request.dict()
        
        # Convert atomic_mass to kg if provided in AMU
        if params_dict.get("atomic_mass_amu"):
            params_dict["atomic_mass"] = params_dict["atomic_mass_amu"] * const.atomic_mass
            del params_dict["atomic_mass_amu"]
            
        lattice_params = LatticeParameters(**params_dict)
        
        # Calculate phonon DOS
        result = calculate_phonon_density_of_states(params=lattice_params)
        
        # Add processing time to metadata
        result["metadata"]["processing_time_ms"] = round((time.time() - start_time) * 1000, 2)
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/thermal-properties")
async def thermal_properties(request: LatticeParametersRequest):
    """
    Calculate thermal properties based on phonon spectrum.
    
    This endpoint computes heat capacity, thermal conductivity, and other thermal
    properties essential for understanding heat transfer in LENR systems.
    """
    try:
        start_time = time.time()
        
        # Create LatticeParameters object
        params_dict = request.dict()
        
        # Convert atomic_mass to kg if provided in AMU
        if params_dict.get("atomic_mass_amu"):
            params_dict["atomic_mass"] = params_dict["atomic_mass_amu"] * const.atomic_mass
            del params_dict["atomic_mass_amu"]
            
        lattice_params = LatticeParameters(**params_dict)
        
        # Calculate thermal properties
        result = calculate_phonon_spectrum(params=lattice_params)
        
        # Add processing time to metadata
        result["metadata"]["processing_time_ms"] = round((time.time() - start_time) * 1000, 2)
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/phonon-nuclear-coupling")
async def phonon_nuclear_coupling(request: PhononNuclearCouplingRequest):
    """
    Calculate coupling between phonons and nuclear processes.
    
    This endpoint assesses how lattice vibrations can influence nuclear reactions
    through energy and momentum transfer, which is crucial for LENR mechanisms.
    """
    try:
        start_time = time.time()
        
        # Convert dictionary to LatticeParameters
        lattice_params = LatticeParameters(**request.lattice_params)
        
        # Calculate phonon-nuclear coupling
        result = calculate_coherent_phonon_tunneling(
            params=lattice_params,
            energy_transfer_eV=request.energy_transfer_ev
        )
        
        # Add processing time to metadata
        result["metadata"]["processing_time_ms"] = round((time.time() - start_time) * 1000, 2)
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/lattice-presets")
async def lattice_presets():
    """
    Get predefined lattice parameter presets for common LENR materials.
    
    These presets provide starting points for simulating various material systems
    relevant to LENR research.
    """
    presets = {
        "pd_d": {
            "name": "Palladium-Deuterium",
            "description": "Typical parameters for deuterium-loaded palladium",
            "parameters": {
                "lattice_type": "fcc",
                "lattice_constant": 3.89e-10,
                "debye_temperature": 275.0,
                "has_loading": True,
                "loading_element": "D",
                "loading_ratio": 0.8,
                "loading_sites": "octahedral",
                "temperature": 300.0
            }
        },
        "ni_h": {
            "name": "Nickel-Hydrogen",
            "description": "Typical parameters for hydrogen-loaded nickel",
            "parameters": {
                "lattice_type": "fcc",
                "lattice_constant": 3.52e-10,
                "debye_temperature": 450.0,
                "has_loading": True,
                "loading_element": "H",
                "loading_ratio": 0.6,
                "loading_sites": "octahedral",
                "temperature": 350.0
            }
        },
        "ti_d": {
            "name": "Titanium-Deuterium",
            "description": "Typical parameters for deuterium-loaded titanium",
            "parameters": {
                "lattice_type": "hcp",
                "lattice_constant": 2.95e-10,
                "debye_temperature": 380.0,
                "has_loading": True,
                "loading_element": "D",
                "loading_ratio": 0.7,
                "loading_sites": "tetrahedral",
                "temperature": 320.0
            }
        },
        "zr_d": {
            "name": "Zirconium-Deuterium",
            "description": "Typical parameters for deuterium-loaded zirconium",
            "parameters": {
                "lattice_type": "hcp",
                "lattice_constant": 3.23e-10,
                "debye_temperature": 291.0,
                "has_loading": True,
                "loading_element": "D",
                "loading_ratio": 0.5,
                "loading_sites": "tetrahedral",
                "temperature": 310.0
            }
        },
        "pure_pd": {
            "name": "Pure Palladium",
            "description": "Reference parameters for pure palladium lattice",
            "parameters": {
                "lattice_type": "fcc",
                "lattice_constant": 3.89e-10,
                "debye_temperature": 275.0,
                "has_loading": False,
                "temperature": 300.0
            }
        }
    }
    
    return {"presets": presets}


@router.get("/reactions", response_model=List[FusionReaction])
async def list_reactions():
    """List all available fusion reactions (both default and custom)"""
    return fusion_calculator.list_all_reactions()

@router.get("/reactions/default", response_model=List[FusionReaction])
async def list_default_reactions():
    """List only default fusion reactions"""
    return fusion_calculator.list_default_reactions()

@router.get("/reactions/custom", response_model=List[FusionReaction])
async def list_custom_reactions():
    """List only custom fusion reactions"""
    return fusion_calculator.list_custom_reactions()

@router.post("/reactions/custom", response_model=FusionReaction)
async def add_custom_reaction(reaction: FusionReaction):
    """Add a new custom fusion reaction"""
    try:
        return fusion_calculator.add_custom_reaction(reaction)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/reactions/custom/{reaction_name}")
async def remove_custom_reaction(reaction_name: str):
    """Remove a custom fusion reaction"""
    try:
        fusion_calculator.remove_custom_reaction(reaction_name)
        return {"message": f"Successfully removed custom reaction: {reaction_name}"}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/reactions/{reaction_name}", response_model=FusionReaction)
async def get_reaction(reaction_name: str):
    """Get details of a specific fusion reaction"""
    try:
        return fusion_calculator.get_reaction(reaction_name)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

# Add a new endpoint to view performance metrics
@router.get("/performance-metrics")
async def get_performance_metrics():
    """
    Get performance metrics for physics calculations
    
    Returns data about slow operations and potential timeout risks
    """
    tracker = get_tracker()
    
    # Get all metrics and slow operations
    all_metrics = tracker.get_all_metrics()
    slow_ops = tracker.get_slow_operations(threshold=1.0)
    
    # Get timeout risks for new addition
    timeout_risks = []
    if hasattr(tracker, 'get_timeout_risks'):
        timeout_risks = tracker.get_timeout_risks()
    
    return {
        "slow_operations": slow_ops,
        "all_metrics": all_metrics,
        "operation_count": len(all_metrics),
        "timeout_risks": timeout_risks,
        "high_risk_count": sum(1 for risk in timeout_risks if risk.get("risk_score", 0) > 3.0)
    }


# =============================================================================
# NEW THEORETICAL ENHANCEMENT ENDPOINTS
# Based on Unified LENR Theory Paper Sections 2.3.1, 2.8.1, 3.3, 5.1.1
# =============================================================================

# Request/Response models for new endpoints

class QEDLagrangianRequest(BaseModel):
    """Request model for QED Lagrangian calculation."""
    electric_field: float = Field(1e8, description="Electric field strength in V/m")
    magnetic_field: float = Field(0.0, description="Magnetic field strength in Tesla")
    electron_density: float = Field(1e29, description="Electron number density in m^-3")
    fermi_energy_eV: float = Field(5.0, description="Fermi energy in eV")
    temperature: float = Field(300.0, description="Temperature in K")


class QEDEnhancementRequest(BaseModel):
    """Request model for full QED enhancement calculation."""
    distance: float = Field(1e-10, description="Characteristic distance in meters")
    epsilon1: float = Field(12.0, description="Dielectric constant of first material")
    epsilon2: float = Field(80.0, description="Dielectric constant of second material")
    temperature: float = Field(300.0, description="Temperature in K")
    applied_field: float = Field(1e8, description="Applied electric field in V/m")
    electron_density: float = Field(1e29, description="Electron density in m^-3")
    phonon_frequency: float = Field(1e13, description="Phonon frequency in rad/s")


class PhononNuclearRequest(BaseModel):
    """Request model for phonon-nuclear coupling calculation."""
    material: str = Field("Pd", description="Material name (Pd, Ni, Ti)")
    temperature: float = Field(300.0, description="Temperature in K")
    target_energy_MeV: float = Field(1.0, description="Target nuclear energy in MeV")
    nuclear_potential_gradient: float = Field(1.0, description="dV/du in eV/Å")
    phonon_frequency: Optional[float] = Field(None, description="Phonon frequency in rad/s")


class EnergyBalanceRequest(BaseModel):
    """Request model for energy balance calculation."""
    reaction_rate: float = Field(1e10, description="Nuclear reaction rate in reactions/s")
    energy_per_reaction_MeV: float = Field(23.8, description="Energy per reaction in MeV")
    volume_m3: float = Field(1e-9, description="Active volume in m^3")
    temperature_K: float = Field(300.0, description="System temperature in K")
    material: str = Field("Pd", description="Material name")
    electrical_input_W: float = Field(1.0, description="Electrical input power in W")


class ExcessPowerRequest(BaseModel):
    """Request model for excess power analysis."""
    measured_output_W: float = Field(..., description="Measured thermal output in W")
    electrical_input_W: float = Field(..., description="Electrical input power in W")
    chemical_power_W: float = Field(0.0, description="Chemical power contribution in W")
    mass_kg: float = Field(0.1, description="Sample mass in kg")
    specific_heat: float = Field(244.0, description="Specific heat in J/(kg·K)")
    temperature_rate_K_s: float = Field(0.0, description="Temperature change rate in K/s")
    heat_loss_coefficient_W_K: float = Field(1.0, description="UA value in W/K")
    temperature_K: float = Field(300.0, description="Current temperature in K")
    ambient_K: float = Field(300.0, description="Ambient temperature in K")
    measurement_uncertainty_W: float = Field(0.1, description="Measurement uncertainty in W")


class StatisticalRateRequest(BaseModel):
    """Request model for statistical reaction rate calculation."""
    temperature_keV: float = Field(0.1, description="Temperature in keV")
    density_m3: float = Field(1e28, description="Number density in m^-3")
    z1: int = Field(1, description="Atomic number of first nucleus")
    z2: int = Field(1, description="Atomic number of second nucleus")
    reduced_mass_amu: float = Field(1.0, description="Reduced mass in AMU")
    s_factor_keV_barn: float = Field(50.0, description="S-factor in keV·barn")
    screening_potential_eV: float = Field(0.0, description="Screening potential in eV")
    coherence_factor: float = Field(1.0, description="Coherence enhancement factor")
    field_strength_V_m: float = Field(0.0, description="Electric field strength in V/m")
    phonon_coupling: float = Field(0.0, description="Phonon coupling strength")
    density_uncertainty: float = Field(0.1, description="Relative uncertainty in density")
    run_monte_carlo: bool = Field(False, description="Whether to run Monte Carlo validation")
    n_mc_samples: int = Field(1000, description="Number of MC samples")


# QED Endpoints

@router.post("/qed/lagrangian")
async def calculate_qed_lagrangian_endpoint(request: QEDLagrangianRequest):
    """
    Calculate QED Lagrangian density components.
    
    Based on Section 2.3.1 of the Unified LENR Theory paper.
    Calculates the full QED Lagrangian: L = ψ̄(iγᵘDμ - m)ψ - (1/4)FμνFᵘᵛ + L_int
    """
    try:
        start_time = time.time()
        
        # Calculate Lagrangian components
        lagrangian = calculate_qed_lagrangian(
            electric_field=request.electric_field,
            magnetic_field=request.magnetic_field,
            electron_density=request.electron_density,
            fermi_energy_eV=request.fermi_energy_eV
        )
        
        # Get vacuum polarization
        vac_pol = vacuum_polarization_correction(
            request.electric_field,
            request.temperature
        )
        
        # Get field-matter coupling
        coupling = field_matter_coupling(
            electric_field=request.electric_field,
            electron_density=request.electron_density
        )
        
        result = {
            "lagrangian_components": {
                "dirac_kinetic_J_m3": lagrangian.dirac_kinetic,
                "electromagnetic_J_m3": lagrangian.electromagnetic,
                "interaction_J_m3": lagrangian.interaction,
                "total_density_J_m3": lagrangian.total_density,
            },
            "vacuum_polarization": vac_pol,
            "field_matter_coupling": coupling,
            "effective_dielectric": lagrangian.effective_dielectric,
            "metadata": {
                "processing_time_ms": round((time.time() - start_time) * 1000, 2),
                "electric_field_V_m": request.electric_field,
                "electron_density_m3": request.electron_density
            }
        }
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/qed/enhancement")
async def calculate_qed_enhancement_endpoint(request: QEDEnhancementRequest):
    """
    Calculate full QED enhancement using Lagrangian formulation.
    
    Combines QED Lagrangian, vacuum polarization, and field-matter coupling
    to calculate tunneling enhancement factors.
    """
    try:
        start_time = time.time()
        
        result = calculate_full_qed_enhancement(
            distance=request.distance,
            epsilon1=request.epsilon1,
            epsilon2=request.epsilon2,
            temperature=request.temperature,
            applied_field=request.applied_field,
            electron_density=request.electron_density,
            phonon_frequency=request.phonon_frequency
        )
        
        return {
            "enhancement_factor": result.enhancement_factor,
            "barrier_modification_eV": result.barrier_modification_eV,
            "tunneling_enhancement": result.tunneling_enhancement,
            "lagrangian": {
                "total_density_J_m3": result.lagrangian.total_density,
                "vacuum_polarization": result.lagrangian.vacuum_polarization,
                "effective_dielectric": result.lagrangian.effective_dielectric,
                "field_matter_coupling": result.lagrangian.field_matter_coupling,
            },
            "metadata": {
                **result.metadata,
                "processing_time_ms": round((time.time() - start_time) * 1000, 2)
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Phonon-Nuclear Coupling Endpoints

@router.post("/phonon-nuclear/coupling")
async def calculate_phonon_nuclear_coupling_endpoint(request: PhononNuclearRequest):
    """
    Calculate phonon-nuclear coupling strength.
    
    Based on Section 2.8.1 of the Unified LENR Theory paper.
    Calculates g_ph-nuc = (∂V/∂u)·√(ℏ/2Mω_ph) and related quantities.
    """
    try:
        start_time = time.time()
        
        # Use material-specific calculation if material provided
        result = calculate_phonon_coupling_for_material(
            material=request.material,
            temperature=request.temperature,
            target_energy_MeV=request.target_energy_MeV
        )
        
        return {
            "coupling_strength_eV_per_angstrom": result.coupling_strength_eV_per_angstrom,
            "coupling_strength_J_per_m": result.coupling_strength_J_per_m,
            "energy_transfer_rate_Hz": result.energy_transfer_rate_Hz,
            "multi_phonon_probability": result.multi_phonon_probability,
            "phonons_required": result.phonons_required,
            "coherence_factor": result.coherence_factor,
            "effective_coupling_enhanced": result.effective_coupling_enhanced,
            "metadata": {
                **result.metadata,
                "processing_time_ms": round((time.time() - start_time) * 1000, 2)
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Non-Equilibrium Thermodynamics Endpoints

@router.post("/thermodynamics/energy-balance")
async def calculate_energy_balance_endpoint(request: EnergyBalanceRequest):
    """
    Calculate complete energy balance for LENR system.
    
    Based on Section 3.3 of the Unified LENR Theory paper.
    Implements: ∂ρ_E/∂t + ∇·J_E = σ_source
    """
    try:
        start_time = time.time()
        
        result = calculate_energy_balance(
            reaction_rate=request.reaction_rate,
            energy_per_reaction_MeV=request.energy_per_reaction_MeV,
            volume_m3=request.volume_m3,
            temperature_K=request.temperature_K,
            material=request.material,
            electrical_input_W=request.electrical_input_W
        )
        
        result["metadata"]["processing_time_ms"] = round((time.time() - start_time) * 1000, 2)
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/thermodynamics/excess-power")
async def calculate_excess_power_endpoint(request: ExcessPowerRequest):
    """
    Analyze excess power from calorimetric measurements.
    
    Calculates: P_excess = P_out - P_in - P_chem
    With statistical significance analysis.
    """
    try:
        start_time = time.time()
        
        result = excess_power_analysis(
            measured_output_W=request.measured_output_W,
            electrical_input_W=request.electrical_input_W,
            chemical_power_W=request.chemical_power_W,
            mass_kg=request.mass_kg,
            specific_heat=request.specific_heat,
            temperature_rate_K_s=request.temperature_rate_K_s,
            heat_loss_coefficient_W_K=request.heat_loss_coefficient_W_K,
            temperature_K=request.temperature_K,
            ambient_K=request.ambient_K,
            measurement_uncertainty_W=request.measurement_uncertainty_W
        )
        
        return {
            "excess_power_W": result.excess_power_W,
            "input_power_W": result.input_power_W,
            "output_power_W": result.output_power_W,
            "chemical_power_W": result.chemical_power_W,
            "cop": result.cop,
            "statistical_significance_sigma": result.statistical_significance,
            "is_significant": result.statistical_significance >= 5.0,
            "time_constant_s": result.time_constant_s,
            "metadata": {
                **result.metadata,
                "processing_time_ms": round((time.time() - start_time) * 1000, 2)
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Statistical Mechanics Endpoints

@router.post("/statistics/reaction-rate")
async def calculate_statistical_reaction_rate(request: StatisticalRateRequest):
    """
    Calculate reaction rate with full statistical mechanics treatment.
    
    Based on Section 5.1.1 of the Unified LENR Theory paper.
    Implements: R = n₁n₂<σv>_thermal × f_enhancement × P_threshold
    """
    try:
        start_time = time.time()
        
        result = statistical_reaction_rate(
            temperature_keV=request.temperature_keV,
            density_m3=request.density_m3,
            z1=request.z1,
            z2=request.z2,
            reduced_mass_amu=request.reduced_mass_amu,
            s_factor_keV_barn=request.s_factor_keV_barn,
            screening_potential_eV=request.screening_potential_eV,
            coherence_factor=request.coherence_factor,
            field_strength_V_m=request.field_strength_V_m,
            phonon_coupling=request.phonon_coupling,
            density_uncertainty=request.density_uncertainty,
            run_monte_carlo=request.run_monte_carlo,
            n_mc_samples=request.n_mc_samples
        )
        
        response = {
            "rate_per_m3_s": result.rate_per_m3_s,
            "rate_uncertainty": result.rate_uncertainty,
            "thermal_averaged_sigma_v_cm3_s": result.thermal_averaged_sigma_v,
            "enhancement_factors": {
                "screening": result.enhancement_factors.screening,
                "coherence": result.enhancement_factors.coherence,
                "field": result.enhancement_factors.field,
                "phonon": result.enhancement_factors.phonon,
                "total": result.enhancement_factors.total
            },
            "uncertainty_budget": {
                "density": result.uncertainty_budget.density_uncertainty,
                "cross_section": result.uncertainty_budget.cross_section_uncertainty,
                "enhancement": result.uncertainty_budget.enhancement_uncertainty,
                "total_relative": result.uncertainty_budget.total_relative_uncertainty
            },
            "gamow_energy_keV": result.gamow_energy_keV,
            "gamow_peak_keV": result.gamow_peak_keV,
            "statistical_significance": result.statistical_significance,
            "metadata": {
                **result.metadata,
                "processing_time_ms": round((time.time() - start_time) * 1000, 2)
            }
        }
        
        if result.monte_carlo_results:
            response["monte_carlo"] = result.monte_carlo_results
        
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/theoretical-enhancements-info")
async def theoretical_enhancements_info():
    """
    Get information about the new theoretical enhancement modules.
    
    Based on the Unified LENR Theoretical Framework paper.
    """
    return {
        "modules": {
            "qed_lagrangian": {
                "section": "2.3.1",
                "name": "Quantum Field Theory Foundation",
                "description": "Full QED Lagrangian formulation for double-layer effects",
                "key_equations": [
                    "L = ψ̄(iγᵘDμ - m)ψ - (1/4)FμνFᵘᵛ + L_int",
                    "ε_eff = 1 + (2α/45π)(E/E_cr)²"
                ],
                "endpoints": ["/api/physics/qed/lagrangian", "/api/physics/qed/enhancement"]
            },
            "phonon_nuclear_coupling": {
                "section": "2.8.1",
                "name": "Phonon-Nuclear Coupling Strength",
                "description": "Coupling between lattice phonons and nuclear degrees of freedom",
                "key_equations": [
                    "g_ph-nuc = (∂V/∂u)·√(ℏ/2Mω_ph)",
                    "Γ = (2π/ℏ)|g|²ρ(ω)n_ph(ω)"
                ],
                "endpoints": ["/api/physics/phonon-nuclear/coupling"]
            },
            "non_equilibrium_thermodynamics": {
                "section": "3.3",
                "name": "Non-Equilibrium Thermodynamics",
                "description": "Energy flow, entropy production, and calorimetric analysis",
                "key_equations": [
                    "∂ρ_E/∂t + ∇·J_E = σ_source",
                    "P_excess = P_out - P_in - P_chem"
                ],
                "endpoints": ["/api/physics/thermodynamics/energy-balance", 
                             "/api/physics/thermodynamics/excess-power"]
            },
            "statistical_mechanics": {
                "section": "5.1.1",
                "name": "Statistical Mechanics of Reaction Rates",
                "description": "Thermal averaging, error propagation, and Monte Carlo validation",
                "key_equations": [
                    "R = n₁n₂<σv>_thermal × f_enhancement",
                    "<σv> = √(8/πμ(kT)³)∫σ(E)E·exp(-E/kT)dE"
                ],
                "endpoints": ["/api/physics/statistics/reaction-rate"]
            }
        },
        "paper_reference": "A Unified Theoretical Framework for Low-Energy Nuclear Reactions"
    }


# =============================================================================
# PLASMA PHYSICS ENDPOINTS (Plasma-scale Fusion)
# =============================================================================

class LawsonCriterionRequest(BaseModel):
    """Request model for Lawson criterion calculation"""
    plasma_density: float = Field(..., gt=0, description="Plasma density in m^-3")
    temperature: float = Field(..., gt=0, description="Ion temperature in keV")
    confinement_time: float = Field(..., gt=0, description="Energy confinement time in seconds")
    fuel_type: str = Field(default="d-t", description="Fuel type: d-t, d-d, or d-He3")


class PlasmaEquilibriumRequest(BaseModel):
    """Request model for plasma equilibrium calculation"""
    major_radius: float = Field(..., gt=0, description="Major radius R in meters")
    minor_radius: float = Field(..., gt=0, description="Minor radius a in meters")
    magnetic_field: float = Field(..., gt=0, description="Toroidal field B_T in Tesla")
    plasma_current: float = Field(..., gt=0, description="Plasma current I_p in MA")
    beta: float = Field(default=0.05, ge=0, le=1, description="Plasma beta (pressure ratio)")
    elongation: float = Field(default=1.7, ge=1, description="Plasma elongation kappa")


class ICFCompressionRequest(BaseModel):
    """Request model for ICF compression calculation"""
    laser_power: float = Field(..., gt=0, description="Peak laser power in TW")
    target_radius: float = Field(..., gt=0, description="Initial target radius in meters")
    fuel_mass: float = Field(..., gt=0, description="DT fuel mass in kg")
    pulse_duration: float = Field(..., gt=0, description="Laser pulse duration in ns")
    wavelength: float = Field(default=351, gt=0, description="Laser wavelength in nm")


@router.post("/plasma/lawson-criterion")
async def calculate_lawson_criterion(request: LawsonCriterionRequest):
    """
    Calculate Lawson criterion triple product and ignition proximity.
    
    The Lawson criterion is nTτ >= threshold, where:
    - n: plasma density (m^-3)
    - T: temperature (keV)
    - τ: confinement time (s)
    
    For D-T: nTτ >= 3×10²¹ m^-3 keV s (approximate ignition threshold)
    """
    try:
        # Lawson thresholds for different fuels (m^-3 keV s)
        thresholds = {
            "d-t": 3e21,      # Deuterium-Tritium
            "d-d": 1e23,      # Deuterium-Deuterium (harder to ignite)
            "d-He3": 5e22,    # Deuterium-Helium-3
        }
        
        fuel = request.fuel_type.lower()
        if fuel not in thresholds:
            fuel = "d-t"
        
        threshold = thresholds[fuel]
        
        # Calculate triple product
        triple_product = request.plasma_density * request.temperature * request.confinement_time
        
        # Calculate Q (fusion gain) estimate
        # Simplified: Q ≈ (nTτ / threshold)^2 for nTτ < threshold
        # Q → infinity at ignition
        ignition_fraction = triple_product / threshold
        
        if ignition_fraction >= 1.0:
            q_value = float('inf')
            status = "ignition"
        elif ignition_fraction > 0.1:
            # Approaching breakeven
            q_value = 5 * (ignition_fraction ** 2)
            status = "approaching_breakeven" if ignition_fraction > 0.5 else "sub_breakeven"
        else:
            q_value = 0.1 * ignition_fraction
            status = "far_from_ignition"
        
        # Calculate fusion power density (simplified)
        # P_fusion ≈ n² <σv> E_fusion / 4 (for 50-50 D-T mix)
        # Using approximate <σv> at given temperature
        sigma_v = 1e-22 * np.exp(-20 / np.sqrt(request.temperature))  # Simplified
        fusion_power_density = 0.25 * (request.plasma_density ** 2) * sigma_v * 17.6e6 * 1.6e-19  # W/m³
        
        # Calculate bremsstrahlung losses
        brem_loss = 5.35e-37 * np.sqrt(request.temperature) * (request.plasma_density ** 2)  # W/m³
        
        return {
            "triple_product": triple_product,
            "triple_product_formatted": f"{triple_product:.2e} m⁻³ keV s",
            "ignition_threshold": threshold,
            "ignition_threshold_formatted": f"{threshold:.2e} m⁻³ keV s",
            "ignition_fraction": min(ignition_fraction, 10.0),  # Cap for display
            "ignition_percentage": min(ignition_fraction * 100, 1000.0),
            "estimated_q_value": q_value if np.isfinite(q_value) else None,
            "is_ignition": q_value == float('inf') or not np.isfinite(q_value),
            "status": status,
            "fusion_power_density_MW_m3": fusion_power_density / 1e6,
            "bremsstrahlung_loss_MW_m3": brem_loss / 1e6,
            "net_power_density_MW_m3": (fusion_power_density - brem_loss) / 1e6,
            "fuel_type": fuel,
            "input_parameters": {
                "plasma_density_m3": request.plasma_density,
                "temperature_keV": request.temperature,
                "confinement_time_s": request.confinement_time
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lawson calculation error: {str(e)}")


@router.post("/plasma/equilibrium")
async def calculate_plasma_equilibrium(request: PlasmaEquilibriumRequest):
    """
    Calculate tokamak plasma equilibrium parameters.
    
    Includes safety factor, beta limits, and stability metrics.
    """
    try:
        R = request.major_radius
        a = request.minor_radius
        B_T = request.magnetic_field
        I_p = request.plasma_current
        kappa = request.elongation
        
        # Aspect ratio
        aspect_ratio = R / a
        
        # Safety factor at edge (q_95 approximation)
        # q = (5 a² B_T κ) / (R I_p) [with I_p in MA, others in SI]
        q_95 = (5 * a**2 * B_T * kappa) / (R * I_p)
        
        # Greenwald density limit (n_G in 10²⁰ m⁻³)
        n_greenwald = I_p / (np.pi * a**2)  # 10²⁰ m⁻³
        
        # Troyon beta limit
        # β_max = g × I_p / (a × B_T) where g ≈ 2.8-3.5%
        beta_troyon = 0.028 * I_p / (a * B_T)
        
        # Plasma volume and surface area
        volume = 2 * np.pi**2 * R * a**2 * kappa  # m³
        surface = 4 * np.pi**2 * R * a * np.sqrt((1 + kappa**2) / 2)  # m² (approx)
        
        # Normalized beta
        beta_N = request.beta * a * B_T / I_p * 100  # %·m·T/MA
        
        # Stability assessment
        stability = "stable"
        warnings = []
        
        if q_95 < 2:
            stability = "unstable"
            warnings.append("q_95 < 2: susceptible to major disruptions")
        elif q_95 < 3:
            warnings.append("q_95 < 3: edge stability marginal")
            
        if request.beta > beta_troyon:
            stability = "unstable" if stability != "unstable" else stability
            warnings.append(f"Beta exceeds Troyon limit ({beta_troyon:.3f})")
            
        if beta_N > 3.5:
            warnings.append("High normalized beta: potential instabilities")
        
        return {
            "geometry": {
                "major_radius_m": R,
                "minor_radius_m": a,
                "aspect_ratio": aspect_ratio,
                "elongation": kappa,
                "plasma_volume_m3": volume,
                "plasma_surface_m2": surface
            },
            "magnetic_field": {
                "toroidal_field_T": B_T,
                "plasma_current_MA": I_p,
                "safety_factor_q95": q_95
            },
            "limits": {
                "greenwald_density_1e20_m3": n_greenwald,
                "troyon_beta_limit": beta_troyon,
                "normalized_beta": beta_N,
                "current_beta": request.beta
            },
            "stability": {
                "status": stability,
                "warnings": warnings
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Equilibrium calculation error: {str(e)}")


@router.post("/plasma/icf-compression")
async def calculate_icf_compression(request: ICFCompressionRequest):
    """
    Calculate Inertial Confinement Fusion compression parameters.
    
    Estimates compression ratio, areal density, and ignition metrics.
    """
    try:
        P_laser = request.laser_power * 1e12  # Convert TW to W
        r_0 = request.target_radius
        m_fuel = request.fuel_mass
        t_pulse = request.pulse_duration * 1e-9  # Convert ns to s
        
        # Laser energy
        E_laser = P_laser * t_pulse  # Joules
        
        # Ablation pressure (simplified scaling)
        # P_abl ≈ 8.6 × (I/10¹⁴)^(2/3) × (λ/0.35)^(-2/3) Mbar
        # I = intensity in W/cm²
        intensity = P_laser / (4 * np.pi * r_0**2) / 1e4  # W/cm²
        wavelength_um = request.wavelength / 1000
        P_ablation = 8.6 * (intensity / 1e14)**(2/3) * (wavelength_um / 0.35)**(-2/3)  # Mbar
        
        # Implosion velocity estimate
        # v_imp ≈ (2 P_abl t / ρ_shell)^(1/2)
        rho_DT_solid = 0.25e3  # kg/m³ (DT ice)
        shell_thickness = r_0 * 0.1  # Assume 10% of radius
        v_imp = np.sqrt(2 * P_ablation * 1e11 * t_pulse / (rho_DT_solid * shell_thickness))
        
        # Compression ratio estimate
        # For isentropic compression: ρ/ρ₀ ≈ (v_imp / c_s)^3
        c_s = 3e5  # Sound speed in compressed DT (m/s)
        compression = min((v_imp / c_s)**3, 1000)  # Cap at 1000x
        
        # Final density
        rho_final = rho_DT_solid * compression
        
        # Final radius
        r_final = r_0 / compression**(1/3)
        
        # Areal density (ρR)
        rho_R = rho_final * r_final
        
        # Ignition threshold: ρR > 0.3 g/cm²
        rho_R_gcm2 = rho_R / 10  # Convert kg/m² to g/cm²
        ignition_threshold = 0.3  # g/cm²
        
        # Confinement time (inertial)
        tau_conf = r_final / (3 * c_s)
        
        # Yield estimate (simplified)
        # Burn fraction ≈ ρR / (ρR + 6 g/cm²)
        burn_fraction = rho_R_gcm2 / (rho_R_gcm2 + 6)
        E_per_DT = 17.6e6 * 1.6e-19  # J per DT reaction
        n_DT = m_fuel / (5 * 1.67e-27)  # Number of DT pairs
        yield_energy = burn_fraction * n_DT * E_per_DT  # Joules
        gain = yield_energy / E_laser
        
        return {
            "input_parameters": {
                "laser_power_TW": request.laser_power,
                "laser_energy_MJ": E_laser / 1e6,
                "target_radius_mm": request.target_radius * 1000,
                "fuel_mass_mg": request.fuel_mass * 1e6,
                "pulse_duration_ns": request.pulse_duration
            },
            "compression": {
                "ablation_pressure_Mbar": P_ablation,
                "implosion_velocity_km_s": v_imp / 1000,
                "compression_ratio": compression,
                "final_density_kg_m3": rho_final,
                "final_radius_um": r_final * 1e6
            },
            "ignition_metrics": {
                "areal_density_g_cm2": rho_R_gcm2,
                "ignition_threshold_g_cm2": ignition_threshold,
                "ignition_fraction": rho_R_gcm2 / ignition_threshold,
                "confinement_time_ps": tau_conf * 1e12,
                "burn_fraction": burn_fraction
            },
            "performance": {
                "yield_MJ": yield_energy / 1e6,
                "gain_Q": gain,
                "status": "ignition" if rho_R_gcm2 >= ignition_threshold else "sub_ignition"
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"ICF calculation error: {str(e)}")


# ============================================================================
# NUCLEATION AND SURFACE PHYSICS ENDPOINTS (Phase 7 Enhancement)
# ============================================================================

class NucleationSiteRequest(BaseModel):
    """Request model for nucleation site calculations."""
    cavity_radius_nm: float = Field(100.0, ge=1, le=100000, description="Cavity radius in nm")
    cavity_depth_nm: float = Field(200.0, ge=1, le=100000, description="Cavity depth in nm")
    contact_angle_deg: float = Field(80.0, ge=0, le=180, description="Contact angle in degrees")
    surface_material: str = Field("Pd", description="Surface material (Pd, Ni, Ti, W)")
    temperature_K: float = Field(300.0, ge=200, le=1000, description="Temperature in Kelvin")
    supersaturation: float = Field(1.1, ge=1.0, le=10.0, description="Supersaturation ratio")
    pressure_Pa: float = Field(1e5, ge=1e3, le=1e9, description="Ambient pressure in Pa")


class BoundaryLayerRequest(BaseModel):
    """Request model for boundary layer calculations."""
    surface_temperature_K: float = Field(350.0, ge=200, le=1000, description="Surface temperature")
    bulk_temperature_K: float = Field(300.0, ge=200, le=1000, description="Bulk temperature")
    surface_concentration: float = Field(1.5, ge=0.1, le=10, description="Surface concentration (mol/m³)")
    bulk_concentration: float = Field(1.0, ge=0.1, le=10, description="Bulk concentration (mol/m³)")
    saturation_temperature_K: float = Field(340.0, ge=200, le=1000, description="Saturation temperature")
    saturation_concentration: float = Field(1.0, ge=0.1, le=10, description="Saturation concentration")
    characteristic_length_mm: float = Field(1.0, ge=0.01, le=100, description="Characteristic length in mm")
    surface_material: str = Field("Pd", description="Surface material")
    fluid: str = Field("D2O", description="Surrounding fluid")


class SurfaceReactionRateRequest(BaseModel):
    """Request model for surface reaction rate calculation."""
    # Nucleation site
    cavity_radius_nm: float = Field(100.0, ge=1, le=10000, description="Nucleation cavity radius in nm")
    contact_angle_deg: float = Field(80.0, ge=0, le=180, description="Contact angle")
    surface_material: str = Field("Pd", description="Surface material")
    site_density_per_m2: float = Field(1e12, ge=1e8, le=1e15, description="Site density")
    
    # Bubble parameters
    bubble_radius_um: float = Field(10.0, ge=0.1, le=1000, description="Bubble radius in μm")
    surface_distance_nm: float = Field(100.0, ge=1, le=10000, description="Surface distance in nm")
    
    # Environmental
    temperature_K: float = Field(350.0, ge=200, le=1000, description="Temperature")
    pressure_Pa: float = Field(1e5, ge=1e3, le=1e9, description="Pressure")
    supersaturation: float = Field(1.2, ge=1.0, le=5.0, description="Supersaturation")
    superheat_K: float = Field(10.0, ge=0, le=100, description="Superheat")
    
    # Acoustic
    acoustic_pressure_bar: float = Field(1.5, ge=0, le=20, description="Acoustic pressure in bar")
    acoustic_frequency_kHz: float = Field(25.0, ge=1, le=1000, description="Acoustic frequency in kHz")
    
    # Reaction
    loading_ratio: float = Field(0.9, ge=0.1, le=1.0, description="H/M loading ratio")


@router.post("/nucleation/calculate", response_model=Dict[str, Any])
@track_performance("nucleation_calculate")
async def calculate_nucleation_parameters(request: NucleationSiteRequest):
    """
    Calculate nucleation parameters for a surface site.
    
    Returns critical radius, energy barrier, waiting time, and
    active site probability based on classical nucleation theory
    with heterogeneous nucleation corrections.
    """
    try:
        from app.physics.nucleation_sites import (
            create_nucleation_site_from_material,
            calculate_full_nucleation_analysis
        )
        
        # Create site
        site = create_nucleation_site_from_material(
            material=request.surface_material,
            temperature=request.temperature_K,
            cavity_radius=request.cavity_radius_nm * 1e-9,
            cavity_geometry="conical"
        )
        site.contact_angle = request.contact_angle_deg
        site.cavity_depth = request.cavity_depth_nm * 1e-9
        
        # Calculate pressure difference from supersaturation
        delta_p = max((request.supersaturation - 1) * request.pressure_Pa, 1000)
        
        # Full analysis
        result = calculate_full_nucleation_analysis(site, delta_p, request.supersaturation)
        
        return {
            "site_parameters": site.to_dict(),
            "nucleation_results": result.to_dict(),
            "input_parameters": request.model_dump()
        }
    except ImportError as e:
        raise HTTPException(status_code=500, detail=f"Nucleation module not available: {str(e)}")
    except Exception as e:
        router_logger.error(f"Nucleation calculation error: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Nucleation calculation error: {str(e)}")


@router.post("/boundary-layer/profile", response_model=Dict[str, Any])
@track_performance("boundary_layer_calculate")
async def calculate_boundary_layer_profile(request: BoundaryLayerRequest):
    """
    Calculate thermal and diffusion boundary layer profiles.
    
    Returns layer thicknesses, temperature/concentration gradients,
    heat/mass fluxes, and the nucleation zone thickness where
    conditions favor bubble formation.
    """
    try:
        from app.physics.boundary_layers import (
            calculate_full_boundary_layer_analysis,
            calculate_temperature_profile,
            calculate_concentration_profile
        )
        
        # Full analysis
        bl_state = calculate_full_boundary_layer_analysis(
            surface_temperature=request.surface_temperature_K,
            bulk_temperature=request.bulk_temperature_K,
            surface_concentration=request.surface_concentration,
            bulk_concentration=request.bulk_concentration,
            saturation_temperature=request.saturation_temperature_K,
            saturation_concentration=request.saturation_concentration,
            characteristic_length=request.characteristic_length_mm * 1e-3,
            material=request.surface_material,
            fluid=request.fluid
        )
        
        # Generate profiles at several distances
        distances = [0, 0.1, 0.2, 0.5, 1.0, 2.0, 5.0, 10.0]  # in μm
        profiles = {
            "distance_um": distances,
            "temperature_K": [],
            "concentration": []
        }
        
        for d_um in distances:
            d_m = d_um * 1e-6
            t = calculate_temperature_profile(
                d_m, bl_state.thermal_layer_thickness,
                request.surface_temperature_K, request.bulk_temperature_K
            )
            c = calculate_concentration_profile(
                d_m, bl_state.diffusion_layer_thickness,
                request.surface_concentration, request.bulk_concentration
            )
            profiles["temperature_K"].append(t)
            profiles["concentration"].append(c)
        
        return {
            "boundary_layer_state": bl_state.to_dict(),
            "profiles": profiles,
            "input_parameters": request.model_dump()
        }
    except ImportError as e:
        raise HTTPException(status_code=500, detail=f"Boundary layer module not available: {str(e)}")
    except Exception as e:
        router_logger.error(f"Boundary layer calculation error: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Boundary layer calculation error: {str(e)}")


@router.post("/surface-reaction-rate", response_model=Dict[str, Any])
@track_performance("surface_reaction_rate")
async def calculate_surface_reaction_rate_endpoint(request: SurfaceReactionRateRequest):
    """
    Calculate LENR reaction rate at a surface nucleation site.
    
    This integrates all physics enhancements:
    - Nucleation probability at surface cavities
    - Bubble-surface proximity effects
    - Thermal/diffusion boundary layer
    - Acoustic enhancement
    - Standard LENR enhancement mechanisms
    
    Returns reaction rate per site, per area, and all contributing factors.
    """
    try:
        from app.physics.integrated_mechanisms import calculate_surface_reaction_rate
        
        result = calculate_surface_reaction_rate(
            cavity_radius=request.cavity_radius_nm * 1e-9,
            contact_angle=request.contact_angle_deg,
            surface_material=request.surface_material,
            site_density=request.site_density_per_m2,
            bubble_radius=request.bubble_radius_um * 1e-6,
            surface_distance=request.surface_distance_nm * 1e-9,
            temperature=request.temperature_K,
            pressure=request.pressure_Pa,
            supersaturation=request.supersaturation,
            superheat=request.superheat_K,
            acoustic_pressure=request.acoustic_pressure_bar * 1e5,
            acoustic_frequency=request.acoustic_frequency_kHz * 1000,
            loading_ratio=request.loading_ratio
        )
        
        return {
            "reaction_rate": result.to_dict(),
            "summary": {
                "rate_per_site": result.reaction_rate_per_site,
                "rate_per_area": result.reaction_rate_per_area,
                "log_rate": np.log10(result.reaction_rate_per_site) if result.reaction_rate_per_site > 0 else -100,
                "total_enhancement": result.total_enhancement,
                "log_enhancement": result.log_enhancement
            },
            "input_parameters": request.model_dump()
        }
    except ImportError as e:
        raise HTTPException(status_code=500, detail=f"Integrated mechanisms module not available: {str(e)}")
    except Exception as e:
        router_logger.error(f"Surface reaction rate error: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Surface reaction rate calculation error: {str(e)}")


@router.get("/surface-physics/materials", response_model=Dict[str, Any])
async def get_surface_material_properties():
    """
    Get surface physics properties for available materials.
    
    Returns contact angles, surface energies, typical cavity densities,
    and other surface parameters for LENR host materials.
    """
    try:
        from app.physics.nucleation_sites import get_material_surface_properties
        from app.physics.boundary_layers import get_material_properties
        
        materials = ["Pd", "Ni", "Ti", "W"]
        result = {}
        
        for mat in materials:
            surface_props = get_material_surface_properties(mat)
            thermal_props = get_material_properties(mat)
            result[mat] = {
                "surface_properties": surface_props,
                "thermal_properties": thermal_props
            }
        
        return {
            "materials": result,
            "notes": {
                "contact_angle": "Lower values = more hydrophilic = easier nucleation",
                "surface_energy": "J/m² at solid-liquid interface",
                "cavity_density": "Typical nucleation sites per m²"
            }
        }
    except ImportError as e:
        raise HTTPException(status_code=500, detail=f"Surface physics modules not available: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Material properties error: {str(e)}") 