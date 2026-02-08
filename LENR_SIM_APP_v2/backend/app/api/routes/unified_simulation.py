"""
Unified LENR Simulation API Routes

Provides endpoints for the unified LENR theory simulation,
implementing all mechanisms from the theoretical framework paper.
"""

from fastapi import APIRouter, HTTPException, Query, WebSocket, WebSocketDisconnect
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
import logging
import asyncio
import json

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/unified", tags=["unified-simulation"])


# Request/Response Models
class MaterialConfig(BaseModel):
    """Material system configuration"""
    host_material: str = Field(default="palladium", description="Host material: palladium, nickel, titanium")
    reactant: str = Field(default="deuterium", description="Reactant: deuterium, hydrogen")


class EnvironmentalConfig(BaseModel):
    """Environmental conditions"""
    temperature: float = Field(default=300.0, ge=1, le=2000, description="Temperature in Kelvin")
    pressure: float = Field(default=101325.0, ge=1, description="Pressure in Pascal")
    electric_field: float = Field(default=1e6, ge=0, description="Electric field in V/m")


class LatticeConfig(BaseModel):
    """Lattice properties configuration"""
    loading_ratio: float = Field(default=0.9, ge=0, le=2, description="H/M loading ratio")
    defect_density: float = Field(default=1e16, ge=0, description="Defect density in m^-3")
    grain_size: float = Field(default=50e-9, ge=1e-12, description="Grain size in meters")
    surface_roughness: float = Field(default=5e-9, ge=1e-12, description="Surface roughness in meters")


class QuantumEffectsConfig(BaseModel):
    """Quantum effects toggles"""
    enable_screening: bool = Field(default=True, description="Enable electron screening")
    enable_qed: bool = Field(default=True, description="Enable double-layer QED effects")
    enable_casimir: bool = Field(default=True, description="Enable Casimir force effects")
    enable_coherence: bool = Field(default=True, description="Enable quantum coherence")
    enable_bubble_dynamics: bool = Field(default=True, description="Enable bubble collapse dynamics")
    enable_rydberg: bool = Field(default=True, description="Enable Rydberg matter effects")


class SimulationRequest(BaseModel):
    """Full simulation request"""
    material: MaterialConfig = Field(default_factory=MaterialConfig)
    environmental: EnvironmentalConfig = Field(default_factory=EnvironmentalConfig)
    lattice: LatticeConfig = Field(default_factory=LatticeConfig)
    quantum_effects: QuantumEffectsConfig = Field(default_factory=QuantumEffectsConfig)
    time_steps: int = Field(default=100, ge=10, le=1000)
    total_time: float = Field(default=10.0, ge=0.1, le=1000)


class EnhancementFactor(BaseModel):
    """Single enhancement factor result"""
    name: str
    value: float
    threshold_met: bool
    equation: str
    category: str
    parameters: Dict[str, float]


class SimulationResponse(BaseModel):
    """Simulation response"""
    success: bool
    enhancement: Dict[str, Any]
    observables: Dict[str, float]
    thresholds: Dict[str, bool]
    time_series: Dict[str, List[float]]
    confidence: float
    computation_time: float


class MechanismResponse(BaseModel):
    """Response for mechanism breakdown"""
    mechanisms: List[Dict[str, Any]]
    total_enhancement: float
    thresholds: Dict[str, bool]


class CompareRequest(BaseModel):
    """Request to compare two systems"""
    system1: str = Field(default="pd_d", description="First system: pd_d, ni_h, ti_d")
    system2: str = Field(default="ni_h", description="Second system: pd_d, ni_h, ti_d")
    temperature: float = Field(default=300.0)
    pressure: float = Field(default=101325.0)


class CompareResponse(BaseModel):
    """Comparison response"""
    system1: Dict[str, Any]
    system2: Dict[str, Any]
    comparison: Dict[str, Any]


# Helper function to create simulation config
def create_simulation_config(request: SimulationRequest) -> Dict[str, Any]:
    """Convert API request to simulation config dict."""
    return {
        "host_material": request.material.host_material,
        "reactant": request.material.reactant,
        "temperature": request.environmental.temperature,
        "pressure": request.environmental.pressure,
        "electric_field": request.environmental.electric_field,
        "loading_ratio": request.lattice.loading_ratio,
        "defect_density": request.lattice.defect_density,
        "grain_size": request.lattice.grain_size,
        "surface_roughness": request.lattice.surface_roughness,
        "enable_screening": request.quantum_effects.enable_screening,
        "enable_qed": request.quantum_effects.enable_qed,
        "enable_casimir": request.quantum_effects.enable_casimir,
        "enable_coherence": request.quantum_effects.enable_coherence,
        "enable_bubble_dynamics": request.quantum_effects.enable_bubble_dynamics,
        "enable_rydberg": request.quantum_effects.enable_rydberg,
        "time_steps": request.time_steps,
        "total_time": request.total_time
    }


@router.post("/simulate", response_model=SimulationResponse)
async def run_unified_simulation(request: SimulationRequest):
    """
    Run unified LENR theory simulation.
    
    Calculates all enhancement factors and observables based on
    the unified theoretical framework.
    """
    try:
        # Import here to avoid circular imports
        from app.physics_engine.unified_lenr_model import (
            UnifiedLENRModel, SimulationConfig, MaterialProperties, ReactantProperties
        )
        
        # Create configuration
        config = SimulationConfig()
        
        # Set material
        if request.material.host_material.lower() == "palladium":
            config.host_material = MaterialProperties.palladium()
        elif request.material.host_material.lower() == "nickel":
            config.host_material = MaterialProperties.nickel()
        elif request.material.host_material.lower() == "titanium":
            config.host_material = MaterialProperties.titanium()
        
        # Set reactant
        if request.material.reactant.lower() == "deuterium":
            config.reactant = ReactantProperties.deuterium()
        else:
            config.reactant = ReactantProperties.hydrogen()
        
        # Set environmental conditions
        config.temperature = request.environmental.temperature
        config.pressure = request.environmental.pressure
        config.electric_field = request.environmental.electric_field
        
        # Set lattice properties
        config.loading_ratio = request.lattice.loading_ratio
        config.defect_density = request.lattice.defect_density
        config.grain_size = request.lattice.grain_size
        config.surface_roughness = request.lattice.surface_roughness
        
        # Set quantum effect toggles
        config.enable_screening = request.quantum_effects.enable_screening
        config.enable_qed = request.quantum_effects.enable_qed
        config.enable_casimir = request.quantum_effects.enable_casimir
        config.enable_coherence = request.quantum_effects.enable_coherence
        config.enable_bubble_dynamics = request.quantum_effects.enable_bubble_dynamics
        config.enable_rydberg = request.quantum_effects.enable_rydberg
        
        # Set simulation parameters
        config.time_steps = request.time_steps
        config.total_time = request.total_time
        
        # Run simulation
        model = UnifiedLENRModel(config)
        result = model.run_simulation()
        
        # Format response - ensure all numpy types are converted to Python native types
        enhancement_breakdown = {
            e.name: {
                "value": float(e.value),
                "threshold_met": bool(e.threshold_met),
                "equation": str(e.equation),
                "category": str(e.category),
                "parameters": {k: float(v) for k, v in e.parameters.items()}
            }
            for e in result.enhancement_breakdown
        }
        
        # Convert thresholds to Python bools
        thresholds = {k: bool(v) for k, v in result.thresholds_met.items()}
        
        return SimulationResponse(
            success=True,
            enhancement={
                "total": float(result.total_enhancement),
                "breakdown": enhancement_breakdown
            },
            observables={
                "excess_heat_watts": float(result.excess_heat_watts),
                "tunneling_probability": float(result.tunneling_probability),
                "reaction_rate": float(result.reaction_rate),
                "helium4_rate": float(result.helium4_rate),
                "neutron_rate": float(result.neutron_rate)
            },
            thresholds=thresholds,
            time_series={
                "time": [float(x) for x in result.time_points],
                "heat_output": [float(x) for x in result.heat_output],
                "enhancement": [float(x) for x in result.enhancement_history]
            },
            confidence=float(result.confidence),
            computation_time=float(result.computation_time)
        )
        
    except Exception as e:
        logger.error(f"Unified simulation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/mechanisms", response_model=MechanismResponse)
async def get_mechanisms(
    host_material: str = Query(default="palladium"),
    reactant: str = Query(default="deuterium"),
    temperature: float = Query(default=300.0),
    loading_ratio: float = Query(default=0.9)
):
    """
    Get breakdown of all enhancement mechanisms.
    
    Returns detailed information about each mechanism's
    contribution to the total enhancement.
    """
    try:
        from app.physics_engine.unified_lenr_model import (
            UnifiedLENRModel, SimulationConfig, MaterialProperties, ReactantProperties
        )
        
        config = SimulationConfig()
        
        # Set material
        if host_material.lower() == "palladium":
            config.host_material = MaterialProperties.palladium()
        elif host_material.lower() == "nickel":
            config.host_material = MaterialProperties.nickel()
        else:
            config.host_material = MaterialProperties.titanium()
        
        # Set reactant
        if reactant.lower() == "deuterium":
            config.reactant = ReactantProperties.deuterium()
        else:
            config.reactant = ReactantProperties.hydrogen()
        
        config.temperature = temperature
        config.loading_ratio = loading_ratio
        
        model = UnifiedLENRModel(config)
        summary = model.get_mechanism_summary()
        
        # Convert numpy types to Python native types for JSON serialization
        mechanisms = [
            {
                "name": str(m["name"]),
                "value": float(m["value"]),
                "threshold_met": bool(m["threshold_met"]),
                "equation": str(m["equation"]),
                "category": str(m["category"]),
                "parameters": {k: float(v) for k, v in m["parameters"].items()}
            }
            for m in summary["mechanisms"]
        ]
        thresholds = {k: bool(v) for k, v in summary["thresholds"].items()}
        
        return MechanismResponse(
            mechanisms=mechanisms,
            total_enhancement=float(summary["total_enhancement"]),
            thresholds=thresholds
        )
        
    except Exception as e:
        logger.error(f"Get mechanisms error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/compare", response_model=CompareResponse)
async def compare_systems(request: CompareRequest):
    """
    Compare two material systems.
    
    Useful for comparing Pd-D vs Ni-H or other system configurations.
    """
    try:
        from app.physics_engine.unified_lenr_model import create_simulation
        
        # Create simulations for both systems
        model1 = create_simulation(
            request.system1,
            temperature=request.temperature,
            pressure=request.pressure
        )
        model2 = create_simulation(
            request.system2,
            temperature=request.temperature,
            pressure=request.pressure
        )
        
        # Run both simulations
        result1 = model1.run_simulation()
        result2 = model2.run_simulation()
        
        # Format results
        def format_result(result, system_name):
            return {
                "system": system_name,
                "total_enhancement": result.total_enhancement,
                "excess_heat_watts": result.excess_heat_watts,
                "tunneling_probability": result.tunneling_probability,
                "confidence": result.confidence
            }
        
        sys1_data = format_result(result1, request.system1)
        sys2_data = format_result(result2, request.system2)
        
        # Calculate comparison metrics
        comparison = {
            "enhancement_ratio": result1.total_enhancement / max(result2.total_enhancement, 1e-10),
            "heat_ratio": result1.excess_heat_watts / max(result2.excess_heat_watts, 1e-10),
            "recommended_system": request.system1 if result1.total_enhancement > result2.total_enhancement else request.system2
        }
        
        return CompareResponse(
            system1=sys1_data,
            system2=sys2_data,
            comparison=comparison
        )
        
    except Exception as e:
        logger.error(f"Compare systems error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/presets")
async def get_presets():
    """
    Get available preset configurations.
    
    Returns standard configurations for common LENR systems.
    """
    return {
        "presets": [
            {
                "id": "pd_d_standard",
                "name": "Palladium-Deuterium Standard",
                "description": "Classic Fleischmann-Pons configuration",
                "config": {
                    "host_material": "palladium",
                    "reactant": "deuterium",
                    "temperature": 300,
                    "loading_ratio": 0.9
                }
            },
            {
                "id": "ni_h_rossi",
                "name": "Nickel-Hydrogen (Rossi-type)",
                "description": "High-temperature Ni-H configuration",
                "config": {
                    "host_material": "nickel",
                    "reactant": "hydrogen",
                    "temperature": 600,
                    "loading_ratio": 0.85
                }
            },
            {
                "id": "pd_d_high_loading",
                "name": "High Loading Pd-D",
                "description": "Optimized for maximum loading ratio",
                "config": {
                    "host_material": "palladium",
                    "reactant": "deuterium",
                    "temperature": 350,
                    "loading_ratio": 0.95
                }
            },
            {
                "id": "ti_d_gas",
                "name": "Titanium-Deuterium Gas Loading",
                "description": "Gas-phase loading configuration",
                "config": {
                    "host_material": "titanium",
                    "reactant": "deuterium",
                    "temperature": 400,
                    "pressure": 500000
                }
            }
        ]
    }


@router.get("/equations")
async def get_equations():
    """
    Get all theoretical equations used in the model.
    
    Returns LaTeX-formatted equations with descriptions.
    """
    return {
        "equations": [
            {
                "id": "tunneling_wkb",
                "name": "WKB Tunneling Probability",
                "latex": r"P_{tunnel} = \exp\left(-\frac{2}{\hbar}\int_a^b\sqrt{2m(V(x)-E)}\,dx\right)",
                "description": "Semiclassical tunneling through Coulomb barrier"
            },
            {
                "id": "poisson",
                "name": "Poisson's Equation",
                "latex": r"\nabla^2\phi = -\frac{\rho}{\epsilon_0}",
                "description": "Electric potential from charge distribution"
            },
            {
                "id": "schrodinger",
                "name": "Schrödinger Equation",
                "latex": r"-\frac{\hbar^2}{2m}\nabla^2\psi + V(\mathbf{r})\psi = E\psi",
                "description": "Quantum state of particles"
            },
            {
                "id": "casimir",
                "name": "Casimir Force",
                "latex": r"F_{Casimir} = -\frac{\pi^2\hbar c}{240}\frac{A}{d^4}",
                "description": "Vacuum fluctuation force between surfaces"
            },
            {
                "id": "screening",
                "name": "Screening Enhancement",
                "latex": r"f_{screen} = \exp\left(\frac{\pi\eta U_s}{E}\right)",
                "description": "Electron screening enhancement factor"
            },
            {
                "id": "double_layer",
                "name": "Double Layer Field",
                "latex": r"E = \frac{\Delta V}{d}",
                "description": "Electric field in charge double layer"
            },
            {
                "id": "rydberg_energy",
                "name": "Rydberg Energy Levels",
                "latex": r"E_n = -\frac{13.6\,\text{eV}}{n^2}",
                "description": "Energy of excited atomic states"
            },
            {
                "id": "rayleigh_plesset",
                "name": "Rayleigh-Plesset Equation",
                "latex": r"R\ddot{R} + \frac{3}{2}\dot{R}^2 = \frac{1}{\rho}\left(P_b - P_\infty - \frac{2\sigma}{R}\right)",
                "description": "Bubble collapse dynamics"
            },
            {
                "id": "overlap_probability",
                "name": "Halo Electron Overlap",
                "latex": r"P_{overlap} = \int|\psi_{halo}(r)\psi_{nucleus}(r)|^2\,dr",
                "description": "Electron-nucleus wavefunction overlap"
            },
            {
                "id": "gamow_factor",
                "name": "Gamow Factor",
                "latex": r"G = \exp(-2\pi\eta)",
                "description": "Coulomb barrier penetration factor"
            }
        ]
    }


# ============================================================================
# Bubble-Lattice Unified Simulation Endpoints
# ============================================================================

class BubbleConfig(BaseModel):
    """Bubble parameters for collapse simulation."""
    initial_radius_um: float = Field(default=10.0, ge=0.1, le=100, description="Initial radius in micrometers")
    driving_pressure_bar: float = Field(default=1.5, ge=0.1, le=10, description="Driving pressure amplitude in bar")
    frequency_khz: float = Field(default=20.0, ge=1, le=100, description="Acoustic frequency in kHz")
    # Extended range to 2000 K to support high-temperature Ni-H and elevated experiments
    ambient_temperature_k: float = Field(default=298.0, ge=0, le=2000, description="Ambient temperature in Kelvin")


class BubbleLatticeRequest(BaseModel):
    """Request for unified bubble-lattice simulation."""
    bubble: BubbleConfig = Field(default_factory=BubbleConfig)
    material: MaterialConfig = Field(default_factory=MaterialConfig)
    lattice: LatticeConfig = Field(default_factory=LatticeConfig)
    num_cycles: int = Field(default=2, ge=1, le=10, description="Number of acoustic cycles to simulate")


class BubbleLatticeResponse(BaseModel):
    """Response from bubble-lattice simulation."""
    success: bool
    collapse_results: Dict[str, Any]
    proton_phases: Dict[str, float]
    enhancement_timeline: List[Dict[str, Any]]
    peak_conditions: Dict[str, Any]  # Changed from Dict[str, float] to allow enhancement_breakdown dict


@router.post("/bubble-lattice", response_model=BubbleLatticeResponse)
async def run_bubble_lattice_simulation(request: BubbleLatticeRequest):
    """
    Run unified bubble-lattice interaction simulation.
    
    Models electrodynamic ionic double-layer bubble collapse onto lattice-loaded
    materials, with proton phase transitions through force regimes.
    
    This endpoint simulates the core LENR mechanism where acoustic cavitation
    creates extreme conditions at bubble collapse, potentially enabling
    nuclear reactions through multiple enhancement mechanisms.
    
    ## Request Parameters
    
    ### Bubble Configuration (bubble)
    - **initial_radius_um** (float, 0.1-100): Initial bubble radius in micrometers.
      Typical values: 5-20 μm for sonoluminescence.
    - **driving_pressure_bar** (float, 0.1-10): Acoustic driving pressure amplitude.
      Higher values = more violent collapse.
    - **frequency_khz** (float, 1-100): Acoustic frequency. 20-40 kHz typical for LENR.
    - **ambient_temperature_k** (float, 0-2000): Ambient liquid temperature in Kelvin.
      Supports room temperature through high-temperature Ni-H / Rossi-type experiments.
    
    ### Material Configuration (material)
    - **host_material** (str): "palladium", "nickel", or "titanium"
    - **reactant** (str): "deuterium", "hydrogen", or "proton"
    
    ### Lattice Configuration (lattice)
    - **loading_ratio** (float, 0-1): H/M or D/M atomic ratio. 0.9+ for LENR activity.
    - **defect_density** (float, ≥0): Defect density in m⁻³. Higher = more reaction sites.
    - **grain_size** (float, ≥1e-12): Grain size in meters.
    - **surface_roughness** (float, ≥1e-12): Surface roughness in meters.
    
    ### Simulation Parameters
    - **num_cycles** (int, 1-10): Number of acoustic cycles to simulate.
    
    ## Response Format
    
    ### collapse_results
    - **min_radius_um**: Minimum radius achieved during collapse (μm)
    - **max_temperature_k**: Peak temperature at collapse (K)
    - **max_pressure_bar**: Peak pressure at collapse (bar)
    - **compression_ratio**: Ratio of initial to minimum radius
    - **collapse_time_us**: Time to reach minimum radius (μs)
    - **peak_field_v_m**: Peak electric field at double layer (V/m)
    - **peak_enhancement**: Total enhancement factor at collapse
    
    ### proton_phases
    Distribution of protons across phase states:
    - **FREE**: Electromagnetic force dominant
    - **SCREENED**: Electron screening active
    - **CAPTURE_READY**: Strong force becoming significant
    - **NUCLEAR**: Nuclear reaction conditions met
    
    ### enhancement_timeline
    List of enhancement factors over the bubble cycle, each containing:
    - **time**: Time in seconds
    - **phase**: Current collapse phase (EXPANSION, COLLAPSE, MINIMUM, REBOUND, RECOVERY)
    - **radius**: Current bubble radius (m)
    - **total_enhancement**: Combined enhancement factor
    - **screening**, **qed**, **casimir**, **rydberg**, **compression**: Individual factors
    
    ### peak_conditions
    Conditions at the moment of maximum enhancement:
    - **temperature_k**, **pressure_gpa**, **electric_field_v_m**
    - **enhancement_factor**: Peak total enhancement
    - **enhancement_breakdown**: Detailed breakdown of all contributing factors
    """
    # Log incoming request for debugging
    logger.info(f"Bubble-lattice request received:")
    logger.info(f"  Bubble: radius={request.bubble.initial_radius_um}μm, pressure={request.bubble.driving_pressure_bar}bar, freq={request.bubble.frequency_khz}kHz, temp={request.bubble.ambient_temperature_k}K")
    logger.info(f"  Material: host={request.material.host_material}, reactant={request.material.reactant}")
    logger.info(f"  Lattice: loading={request.lattice.loading_ratio}, defects={request.lattice.defect_density}, roughness={request.lattice.surface_roughness}")
    logger.info(f"  Cycles: {request.num_cycles}")
    
    try:
        # Input validation
        if request.bubble.initial_radius_um <= 0 or request.bubble.initial_radius_um > 1000:
            raise HTTPException(
                status_code=400,
                detail="Initial bubble radius must be between 0 and 1000 μm"
            )
        
        if request.bubble.driving_pressure_bar < 0 or request.bubble.driving_pressure_bar > 10:
            raise HTTPException(
                status_code=400,
                detail="Driving pressure must be between 0 and 10 bar"
            )
        
        if request.bubble.frequency_khz < 1 or request.bubble.frequency_khz > 100:
            raise HTTPException(
                status_code=400,
                detail="Frequency must be between 1 and 100 kHz"
            )
        
        if request.bubble.ambient_temperature_k < 0 or request.bubble.ambient_temperature_k > 2000:
            raise HTTPException(
                status_code=400,
                detail="Temperature must be between 0 and 2000 K"
            )
        
        if request.lattice.loading_ratio < 0 or request.lattice.loading_ratio > 1:
            raise HTTPException(
                status_code=400,
                detail="Loading ratio must be between 0 and 1"
            )
        
        if request.lattice.defect_density < 0:
            raise HTTPException(
                status_code=400,
                detail="Defect density must be non-negative"
            )
        
        if request.lattice.surface_roughness < 0:
            raise HTTPException(
                status_code=400,
                detail="Surface roughness must be non-negative"
            )
        
        if request.material.host_material not in ['palladium', 'nickel', 'titanium']:
            raise HTTPException(
                status_code=400,
                detail="Host material must be one of: palladium, nickel, titanium"
            )
        
        if request.material.reactant not in ['deuterium', 'hydrogen', 'proton']:
            raise HTTPException(
                status_code=400,
                detail="Reactant must be one of: deuterium, hydrogen, proton"
            )
        
        from app.physics_engine.bubble_lattice_interaction import (
            BubbleLatticeInteraction, BubbleParameters, LatticeParameters
        )
        from app.physics_engine.proton_phase_model import ProtonPhaseModel
        
        # Create bubble parameters
        bubble_params = BubbleParameters(
            initial_radius=request.bubble.initial_radius_um * 1e-6,
            driving_pressure=request.bubble.driving_pressure_bar * 1e5,
            frequency=request.bubble.frequency_khz * 1e3,
            ambient_temperature=request.bubble.ambient_temperature_k
        )
        
        # Create lattice parameters
        lattice_params = LatticeParameters(
            host_material=request.material.host_material,
            loading_ratio=request.lattice.loading_ratio,
            defect_density=request.lattice.defect_density,
            surface_roughness=request.lattice.surface_roughness
        )
        
        # Run bubble collapse simulation
        model = BubbleLatticeInteraction(bubble_params, lattice_params)
        collapse_result = model.simulate_collapse(num_cycles=request.num_cycles)
        
        # Calculate enhancement breakdown at peak conditions
        peak_enhancement_breakdown = model._calculate_enhancement_breakdown(
            collapse_result.max_temperature,
            collapse_result.max_pressure,
            collapse_result.double_layer_field_peak,
            collapse_result.compression_ratio
        )
        
        # Generate enhancement timeline with breakdown
        import numpy as np
        import math
        
        def sanitize_float(value, default=0.0):
            """Sanitize float values to ensure JSON compatibility."""
            if value is None or (isinstance(value, float) and (math.isnan(value) or math.isinf(value))):
                return default
            return float(value)
        
        def sanitize_dict(d, default=0.0):
            """Recursively sanitize a dict of float values."""
            return {k: sanitize_float(v, default) if isinstance(v, (int, float)) else v for k, v in d.items()}
        
        timeline = []
        for t in np.linspace(0, 1, 50):
            instant = model.calculate_instantaneous_enhancement(t)
            # Calculate breakdown for this time point
            instant_breakdown = model._calculate_enhancement_breakdown(
                instant["conditions"]["temperature"],
                request.bubble.ambient_temperature_k * 101325 * instant["conditions"]["compression"] ** 4.2,
                instant["conditions"]["electric_field"],
                instant["conditions"]["compression"]
            )
            timeline.append({
                "normalized_time": sanitize_float(t, 0.0),
                "phase": instant["phase"],
                "enhancement": sanitize_float(instant["enhancement"], 1.0),
                "enhancement_breakdown": sanitize_dict(instant_breakdown, 1.0),
                "proton_distribution": instant["proton_distribution"],
                "radius_factor": sanitize_float(instant["conditions"]["radius_factor"], 1.0),
                "temperature": sanitize_float(instant["conditions"]["temperature"], 300.0),
                "electric_field": sanitize_float(instant["conditions"]["electric_field"], 0.0)
            })
        
        # Sanitize all float values to ensure JSON compliance
        return BubbleLatticeResponse(
            success=True,
            collapse_results={
                "min_radius_um": sanitize_float(collapse_result.min_radius * 1e6, 0.1),
                "max_temperature_k": sanitize_float(collapse_result.max_temperature, 300.0),
                "max_pressure_bar": sanitize_float(collapse_result.max_pressure / 1e5, 1.0),
                "compression_ratio": sanitize_float(collapse_result.compression_ratio, 1.0),
                "collapse_time_us": sanitize_float(collapse_result.collapse_time * 1e6, 0.0),
                "peak_field_v_m": sanitize_float(collapse_result.double_layer_field_peak, 0.0),
                "peak_enhancement": sanitize_float(collapse_result.enhancement_factor, 1.0)
            },
            proton_phases=collapse_result.proton_phase_distribution,
            enhancement_timeline=timeline,
            peak_conditions={
                "temperature_k": sanitize_float(collapse_result.max_temperature, 300.0),
                "pressure_gpa": sanitize_float(collapse_result.max_pressure / 1e9, 0.0001),
                "electric_field_v_m": sanitize_float(collapse_result.double_layer_field_peak, 0.0),
                "enhancement_factor": sanitize_float(collapse_result.enhancement_factor, 1.0),
                "enhancement_breakdown": sanitize_dict(peak_enhancement_breakdown, 1.0)
            }
        )
        
    except HTTPException:
        # Re-raise HTTP exceptions (validation errors)
        raise
    except ValueError as e:
        # Handle value errors (invalid physics parameters)
        logger.error(f"Invalid physics parameters: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Invalid physics parameters: {str(e)}")
    except Exception as e:
        # Handle unexpected errors
        logger.error(f"Bubble-lattice simulation error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Simulation failed: {str(e)}. Please check parameters and try again."
        )


@router.websocket("/bubble-lattice/stream")
async def bubble_lattice_websocket(websocket: WebSocket):
    """
    WebSocket endpoint for real-time bubble-lattice simulation updates.
    
    Streams physics data (enhancement factors, phase transitions, field strengths)
    in real-time as the simulation progresses.
    
    Client should send initial parameters as JSON:
    {
        "bubble": {...},
        "material": {...},
        "lattice": {...},
        "num_cycles": 2
    }
    """
    await websocket.accept()
    logger.info("WebSocket connection established for bubble-lattice simulation")
    
    try:
        # Receive initial parameters
        params = await websocket.receive_json()
        
        from app.physics_engine.bubble_lattice_interaction import (
            BubbleLatticeInteraction, BubbleParameters, LatticeParameters
        )
        
        # Create parameters
        bubble_params = BubbleParameters(
            initial_radius=params["bubble"]["initial_radius_um"] * 1e-6,
            driving_pressure=params["bubble"]["driving_pressure_bar"] * 1e5,
            frequency=params["bubble"]["frequency_khz"] * 1e3,
            ambient_temperature=params["bubble"]["ambient_temperature_k"]
        )
        
        lattice_params = LatticeParameters(
            host_material=params["material"]["host_material"],
            loading_ratio=params["lattice"]["loading_ratio"],
            defect_density=params["lattice"].get("defect_density", 1e16),
            surface_roughness=params["lattice"].get("surface_roughness", 5e-9)
        )
        
        # Create model
        model = BubbleLatticeInteraction(bubble_params, lattice_params)
        
        # Stream real-time updates
        num_points = 100  # Points per cycle
        num_cycles = params.get("num_cycles", 2)
        
        for cycle in range(num_cycles):
            for i in range(num_points):
                normalized_time = (cycle * num_points + i) / (num_cycles * num_points)
                if normalized_time > 1.0:
                    normalized_time = normalized_time % 1.0
                
                # Calculate instantaneous conditions
                instant = model.calculate_instantaneous_enhancement(normalized_time)
                breakdown = model._calculate_enhancement_breakdown(
                    instant["conditions"]["temperature"],
                    params["bubble"]["ambient_temperature_k"] * 101325 * instant["conditions"]["compression"] ** 4.2,
                    instant["conditions"]["electric_field"],
                    instant["conditions"]["compression"]
                )
                
                # Send update
                await websocket.send_json({
                    "type": "physics_update",
                    "cycle": cycle,
                    "normalized_time": normalized_time,
                    "phase": instant["phase"],
                    "enhancement": float(instant["enhancement"]),
                    "enhancement_breakdown": breakdown,
                    "proton_distribution": instant["proton_distribution"],
                    "conditions": {
                        "radius_factor": float(instant["conditions"]["radius_factor"]),
                        "compression": float(instant["conditions"]["compression"]),
                        "temperature": float(instant["conditions"]["temperature"]),
                        "electric_field": float(instant["conditions"]["electric_field"])
                    }
                })
                
                # Small delay to prevent overwhelming the client
                await asyncio.sleep(0.05)  # ~20 updates per second
        
        # Send completion message
        await websocket.send_json({
            "type": "simulation_complete",
            "message": "Simulation finished"
        })
        
    except WebSocketDisconnect:
        logger.info("WebSocket disconnected for bubble-lattice simulation")
    except Exception as e:
        logger.error(f"WebSocket error in bubble-lattice simulation: {e}", exc_info=True)
        try:
            await websocket.send_json({
                "type": "error",
                "message": str(e)
            })
        except:
            pass


@router.get("/bubble-lattice/instant")
async def get_instant_conditions(
    normalized_time: float = Query(default=0.5, ge=0, le=1, description="Normalized time in cycle (0=start, 0.5=collapse, 1=recovery)"),
    initial_radius_um: float = Query(default=10.0, ge=0.1, le=100, description="Initial bubble radius in micrometers"),
    driving_pressure_bar: float = Query(default=1.5, ge=0.1, le=10, description="Acoustic driving pressure in bar"),
    frequency_khz: float = Query(default=20.0, ge=1, le=100, description="Acoustic frequency in kHz"),
    loading_ratio: float = Query(default=0.9, ge=0, le=1, description="H/M or D/M loading ratio")
):
    """
    Get instantaneous conditions at a specific point in the collapse cycle.
    
    Useful for real-time visualization updates without running a full simulation.
    Returns the bubble state, proton distribution, and enhancement factors
    at any point during the acoustic cycle.
    
    ## Query Parameters
    
    - **normalized_time** (float, 0-1): Position in the acoustic cycle
      - 0.0: Start of expansion phase
      - 0.3: Mid-expansion
      - 0.5: Peak collapse (minimum radius)
      - 0.7: Rebound phase
      - 1.0: Recovery (cycle complete)
    
    - **initial_radius_um** (float): Starting bubble radius in micrometers
    - **driving_pressure_bar** (float): Acoustic pressure amplitude
    - **frequency_khz** (float): Acoustic driving frequency
    - **loading_ratio** (float): Hydrogen/deuterium loading in the lattice
    
    ## Response Format
    
    ```json
    {
        "normalized_time": 0.5,
        "phase": "COLLAPSE",
        "enhancement": {
            "total": 1.5e6,
            "screening": 100,
            "qed": 15,
            "casimir": 1.2,
            "compression": 1000
        },
        "proton_distribution": {
            "FREE": 0.1,
            "SCREENED": 0.3,
            "CAPTURE_READY": 0.4,
            "NUCLEAR": 0.2
        },
        "conditions": {
            "radius_um": 0.5,
            "compression": 20.0,
            "electric_field": 1e9,
            "temperature": 5000,
            "is_critical": true
        }
    }
    ```
    """
    try:
        from app.physics_engine.bubble_lattice_interaction import (
            BubbleLatticeInteraction, BubbleParameters, LatticeParameters
        )
        
        bubble_params = BubbleParameters(
            initial_radius=initial_radius_um * 1e-6,
            driving_pressure=driving_pressure_bar * 1e5,
            frequency=frequency_khz * 1e3
        )
        
        lattice_params = LatticeParameters(loading_ratio=loading_ratio)
        
        model = BubbleLatticeInteraction(bubble_params, lattice_params)
        result = model.calculate_instantaneous_enhancement(normalized_time)
        
        return {
            "normalized_time": normalized_time,
            "phase": result["phase"],
            "enhancement": result["enhancement"],
            "proton_distribution": result["proton_distribution"],
            "conditions": {
                "radius_um": result["conditions"]["radius"] * 1e6,
                "compression": result["conditions"]["compression"],
                "electric_field": result["conditions"]["electric_field"],
                "temperature": result["conditions"]["temperature"],
                "is_critical": result["conditions"]["is_critical"]
            }
        }
        
    except ValueError as e:
        logger.error(f"Invalid parameters for instant conditions: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Invalid parameters: {str(e)}")
    except Exception as e:
        logger.error(f"Instant conditions error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to calculate instant conditions: {str(e)}"
        )
