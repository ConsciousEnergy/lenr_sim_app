"""
Physics Simulation Router
=========================

API endpoints for running real physics calculations using the LENR
simulation engine.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
import numpy as np

from ..physics.core_constants import (
    MATERIALS, SCREENING_POTENTIALS, REACTION_Q_VALUES, S_FACTORS,
    coulomb_barrier, gamow_energy, thermal_energy
)
from ..physics.wkb_tunneling import (
    WKBTunnelingCalculator,
    calculate_dd_tunneling,
    calculate_dt_tunneling
)

router = APIRouter(prefix="/api/physics", tags=["physics"])


# ============================================================================
# REQUEST/RESPONSE MODELS
# ============================================================================

class QuantumTunnelingRequest(BaseModel):
    """Request parameters for quantum tunneling calculation."""
    z1: int = Field(default=1, description="Charge number of nucleus 1")
    z2: int = Field(default=1, description="Charge number of nucleus 2")
    a1: float = Field(default=2.0, description="Mass number of nucleus 1")
    a2: float = Field(default=2.0, description="Mass number of nucleus 2")
    energy_kev: float = Field(default=0.1, description="Center-of-mass energy (keV)")
    temperature_k: float = Field(default=300.0, description="Temperature (K)")
    potential_type: str = Field(default="screened", description="Potential model")
    screening_enhancement: float = Field(default=1.0, description="Screening enhancement factor")
    material: Optional[str] = Field(default="palladium", description="Host material")
    pressure_atm: float = Field(default=1.0, description="Pressure (atm)")


class QuantumTunnelingResponse(BaseModel):
    """Response from quantum tunneling calculation."""
    tunneling_probability: float
    gamow_factor: float
    barrier_height_kev: float
    classical_turning_point_m: float
    screening_energy_kev: float
    enhancement_factor: float
    electron_screening_enhancement: float
    temperature_enhancement: float
    method: str
    # Visualization data
    potential_curve: List[Dict[str, float]]
    wave_function: List[Dict[str, float]]
    parameters: Dict[str, Any]


class FusionRateRequest(BaseModel):
    """Request for fusion rate calculation."""
    reaction_type: str = Field(default="d-d", description="Reaction type (d-d, d-t, p-b11, etc.)")
    temperature_k: float = Field(default=300.0, description="Temperature (K)")
    density_per_cm3: float = Field(default=1e22, description="Number density (particles/cm³)")
    material: Optional[str] = Field(default="palladium", description="Host material")
    loading_ratio: float = Field(default=0.8, description="Hydrogen loading ratio (H/M)")


class FusionRateResponse(BaseModel):
    """Response from fusion rate calculation."""
    reaction_rate_per_s: float
    cross_section_barn: float
    s_factor_kev_barn: float
    mean_energy_kev: float
    q_value_mev: float
    power_density_w_cm3: float
    enhancement_factors: Dict[str, float]
    parameters: Dict[str, Any]


# ============================================================================
# QUANTUM TUNNELING ENDPOINT
# ============================================================================

@router.post("/quantum-tunneling", response_model=QuantumTunnelingResponse)
async def calculate_quantum_tunneling(request: QuantumTunnelingRequest):
    """
    Calculate quantum tunneling probability through the Coulomb barrier.
    
    Uses the WKB approximation with optional electron screening.
    """
    try:
        # Validate input parameters
        if request.energy_kev <= 0:
            raise HTTPException(
                status_code=422,
                detail=f"Energy must be positive. Received: {request.energy_kev} keV"
            )
        
        if request.temperature_k <= 0:
            raise HTTPException(
                status_code=422,
                detail=f"Temperature must be positive. Received: {request.temperature_k} K"
            )
        
        if request.z1 <= 0 or request.z2 <= 0:
            raise HTTPException(
                status_code=422,
                detail=f"Atomic numbers must be positive. Received: z1={request.z1}, z2={request.z2}"
            )
        
        # Get base screening energy from material
        base_screening_ev = SCREENING_POTENTIALS.get(request.material, 0)
        
        # Apply enhancement factor
        effective_screening_ev = base_screening_ev * request.screening_enhancement
        
        # Create calculator
        calc = WKBTunnelingCalculator()
        
        # Calculate tunneling
        result = calc.calculate_tunneling_probability(
            z1=request.z1,
            z2=request.z2,
            a1=request.a1,
            a2=request.a2,
            energy_kev=request.energy_kev,
            potential_type=request.potential_type,
            screening_energy_ev=effective_screening_ev,
            temperature_k=request.temperature_k,
            material=request.material
        )
        
        # Calculate individual enhancement factors
        electron_enhancement = 1.0
        if effective_screening_ev > 0 and request.energy_kev > 0:
            from ..physics.core_constants import AMU, sommerfeld_parameter
            mu = (request.a1 * request.a2 * AMU) / (request.a1 + request.a2)
            eta = sommerfeld_parameter(request.z1, request.z2, request.energy_kev, mu)
            # Clip exponent to prevent overflow (max safe exp arg ~700)
            exponent = np.pi * eta * (effective_screening_ev/1000) / request.energy_kev
            exponent = np.clip(exponent, -700, 700)
            electron_enhancement = np.exp(exponent)
            electron_enhancement = min(electron_enhancement, 1e10)
        
        temp_enhancement = 1.0 + 0.001 * (request.temperature_k - 300.0) / 300.0
        temp_enhancement = max(temp_enhancement, 0.5)
        
        # Generate visualization data
        potential_curve = _generate_potential_curve(
            request.z1, request.z2, 
            request.energy_kev, 
            effective_screening_ev
        )
        
        wave_function = _generate_wave_function(
            request.energy_kev,
            result.barrier_height,
            result.classical_turning_point
        )
        
        return QuantumTunnelingResponse(
            tunneling_probability=result.probability,
            gamow_factor=result.gamow_factor,
            barrier_height_kev=result.barrier_height,
            classical_turning_point_m=result.classical_turning_point,
            screening_energy_kev=result.screening_energy,
            enhancement_factor=result.enhancement_factor,
            electron_screening_enhancement=float(electron_enhancement),
            temperature_enhancement=float(temp_enhancement),
            method=result.method,
            potential_curve=potential_curve,
            wave_function=wave_function,
            parameters=result.parameters
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Calculation error: {str(e)}")


@router.get("/quantum-tunneling/defaults")
async def get_tunneling_defaults():
    """Get default parameters and available options for tunneling calculations."""
    return {
        "defaults": {
            "z1": 1,
            "z2": 1,
            "a1": 2.0,
            "a2": 2.0,
            "energy_kev": 0.1,
            "temperature_k": 300.0,
            "potential_type": "screened",
            "screening_enhancement": 1.0,
            "material": "palladium",
            "pressure_atm": 1.0
        },
        "options": {
            "potential_types": ["coulomb", "screened", "woods_saxon"],
            "materials": list(MATERIALS.keys()),
            "screening_potentials": SCREENING_POTENTIALS
        },
        "limits": {
            "energy_kev": {"min": 0.001, "max": 1000},
            "temperature_k": {"min": 1, "max": 10000},
            "screening_enhancement": {"min": 0.1, "max": 100}
        }
    }


# ============================================================================
# FUSION RATE ENDPOINT
# ============================================================================

@router.post("/fusion-rate", response_model=FusionRateResponse)
async def calculate_fusion_rate(request: FusionRateRequest):
    """
    Calculate fusion reaction rate for a given configuration.
    
    Uses the astrophysical S-factor formulation.
    """
    try:
        # Get reaction parameters
        q_value = REACTION_Q_VALUES.get(request.reaction_type, 3.27)  # MeV
        s_factor = S_FACTORS.get(request.reaction_type, 52.9)  # keV·barn
        
        # Calculate thermal energy
        kT = thermal_energy(request.temperature_k)  # keV
        
        # Mean energy (approximately kT for thermal distribution)
        mean_energy = kT
        
        # Calculate cross section using S-factor
        # σ(E) = S(E)/E * exp(-sqrt(E_G/E))
        if mean_energy > 0:
            from ..physics.core_constants import AMU, gamow_energy as calc_gamow
            
            # Get reaction masses based on type
            if request.reaction_type.startswith('d-d'):
                mu = AMU * 2 * 2 / 4  # D-D reduced mass
                z1, z2 = 1, 1
            elif request.reaction_type.startswith('d-t'):
                mu = AMU * 2 * 3 / 5  # D-T reduced mass
                z1, z2 = 1, 1
            else:
                mu = AMU  # Default
                z1, z2 = 1, 1
            
            e_gamow = calc_gamow(z1, z2, mu)
            gamow_peak_e = (e_gamow * kT**2 / 4)**(1/3)  # Gamow peak energy
            
            # Cross section at Gamow peak
            cross_section = (s_factor / gamow_peak_e) * np.exp(-np.sqrt(e_gamow / gamow_peak_e))
            cross_section = max(cross_section, 1e-50)  # barn
        else:
            cross_section = 1e-50
            gamow_peak_e = 0.001
        
        # Get screening enhancement
        screening_ev = SCREENING_POTENTIALS.get(request.material, 0)
        screening_enhancement = 1.0
        if screening_ev > 0 and mean_energy > 0:
            # Clip exponent to prevent overflow (max safe exp arg ~700)
            exponent = screening_ev / 1000 / mean_energy
            exponent = np.clip(exponent, -700, 700)
            screening_enhancement = np.exp(exponent)
            screening_enhancement = min(screening_enhancement, 1e6)
        
        # Calculate reaction rate
        # R = n1 * n2 * <σv> where n is number density
        density_per_m3 = request.density_per_cm3 * 1e6
        
        # Maxwell-averaged cross section times velocity
        # <σv> ≈ σ(E_peak) * sqrt(8*E_peak/(π*μ))
        from ..physics.core_constants import KEV_TO_J
        v_thermal = np.sqrt(8 * gamow_peak_e * KEV_TO_J / (np.pi * mu))
        sigma_v = cross_section * 1e-28 * v_thermal * screening_enhancement  # m³/s
        
        # Reaction rate (assuming equal densities)
        reaction_rate = 0.5 * density_per_m3**2 * sigma_v  # reactions per m³ per s
        reaction_rate_per_s = reaction_rate  # per second
        
        # Power density
        q_value_j = q_value * 1.602e-13  # Convert MeV to J
        power_density = reaction_rate * q_value_j / 1e6  # W/cm³
        
        return FusionRateResponse(
            reaction_rate_per_s=float(reaction_rate_per_s),
            cross_section_barn=float(cross_section),
            s_factor_kev_barn=float(s_factor),
            mean_energy_kev=float(gamow_peak_e),
            q_value_mev=float(q_value),
            power_density_w_cm3=float(power_density),
            enhancement_factors={
                "screening": float(screening_enhancement),
                "loading": float(request.loading_ratio),
                "total": float(screening_enhancement * request.loading_ratio)
            },
            parameters={
                "reaction_type": request.reaction_type,
                "temperature_k": request.temperature_k,
                "density_per_cm3": request.density_per_cm3,
                "material": request.material,
                "loading_ratio": request.loading_ratio
            }
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Calculation error: {str(e)}")


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def _generate_potential_curve(
    z1: int, 
    z2: int, 
    energy_kev: float,
    screening_ev: float = 0
) -> List[Dict[str, float]]:
    """Generate potential barrier curve for visualization."""
    from ..physics.core_constants import E_CHARGE, EPSILON_0, KEV_TO_J
    
    # Generate distance points (logarithmic scale from 1 fm to 1 nm)
    r_points = np.logspace(-15, -9, 100)  # meters
    
    potential_data = []
    energy_j = energy_kev * KEV_TO_J
    
    for r in r_points:
        # Coulomb potential
        v_coulomb = (z1 * z2 * E_CHARGE**2) / (4 * np.pi * EPSILON_0 * r)
        v_kev = v_coulomb / KEV_TO_J
        
        # Apply screening (exponential decay)
        if screening_ev > 0:
            screening_length = 1e-10  # Approximate Thomas-Fermi length
            v_kev *= np.exp(-r / screening_length)
        
        potential_data.append({
            "distance_m": float(r),
            "potential_kev": float(min(v_kev, 1000)),  # Cap for visualization
            "energy_kev": float(energy_kev)
        })
    
    return potential_data


def _generate_wave_function(
    energy_kev: float,
    barrier_kev: float,
    turning_point_m: float
) -> List[Dict[str, float]]:
    """Generate approximate wave function for visualization."""
    # Generate distance points
    r_points = np.logspace(-15, -9, 100)  # meters
    
    wave_data = []
    for r in r_points:
        # Simple exponential decay inside barrier
        if r < turning_point_m:
            # Tunneling region - exponential decay
            decay_factor = np.exp(-r / turning_point_m * 10)
            amplitude = decay_factor
        else:
            # Outside barrier - oscillating
            k = 2 * np.pi / (turning_point_m * 10)
            amplitude = 0.5 * np.cos(k * (r - turning_point_m))
        
        wave_data.append({
            "distance_m": float(r),
            "amplitude": float(amplitude),
            "probability": float(amplitude**2)
        })
    
    return wave_data


@router.get("/materials")
async def get_available_materials():
    """Get list of available host materials and their properties."""
    materials_list = []
    for key, mat in MATERIALS.items():
        materials_list.append({
            "id": key,
            "name": mat.name,
            "symbol": mat.symbol,
            "atomic_number": mat.atomic_number,
            "density_kg_m3": mat.density,
            "lattice_type": mat.lattice_type,
            "debye_temperature_k": mat.debye_temperature,
            "screening_potential_ev": mat.screening_potential
        })
    return {"materials": materials_list}


@router.get("/reactions")
async def get_available_reactions():
    """Get list of available fusion reactions and their parameters."""
    reactions = []
    for reaction, q_value in REACTION_Q_VALUES.items():
        reactions.append({
            "id": reaction,
            "q_value_mev": q_value,
            "s_factor_kev_barn": S_FACTORS.get(reaction, 0)
        })
    return {"reactions": reactions}


# ============================================================================
# LENR ENHANCEMENT ENDPOINTS
# ============================================================================

class LENREnhancementRequest(BaseModel):
    """Request for LENR enhancement calculation."""
    energy_kev: float = Field(default=0.025, description="Collision energy (keV)")
    temperature_k: float = Field(default=300.0, description="Temperature (K)")
    loading_ratio: float = Field(default=0.8, description="H/M loading ratio")
    material: str = Field(default="palladium", description="Host material")
    defect_density: float = Field(default=0.01, description="Defect density fraction")
    mechanisms: Optional[List[str]] = Field(default=None, description="Enhancement mechanisms to include")


class LENREnhancementResponse(BaseModel):
    """Response from LENR enhancement calculation."""
    total_enhancement: float
    individual_factors: Dict[str, float]
    dominant_mechanism: str
    parameters: Dict[str, Any]
    warnings: List[str]


@router.post("/lenr-enhancement", response_model=LENREnhancementResponse)
async def calculate_lenr_enhancement_endpoint(request: LENREnhancementRequest):
    """
    Calculate LENR enhancement factors from multiple mechanisms.
    
    Enhancement mechanisms include:
    - Electron screening
    - Phonon-assisted tunneling
    - Heavy electron effects
    - Coherent multi-body effects
    - Loading ratio enhancement
    - Defect enhancement
    - Electromagnetic field effects
    """
    try:
        from ..physics.lenr_enhancement import calculate_lenr_enhancement
        
        result = calculate_lenr_enhancement(
            energy_kev=request.energy_kev,
            temperature_k=request.temperature_k,
            loading_ratio=request.loading_ratio,
            material=request.material,
            defect_density=request.defect_density,
            mechanisms=request.mechanisms
        )
        
        return LENREnhancementResponse(
            total_enhancement=result["total_enhancement"],
            individual_factors=result["individual_factors"],
            dominant_mechanism=result["dominant_mechanism"],
            parameters=result["parameters"],
            warnings=result["warnings"]
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LENR calculation error: {str(e)}")


class LENRReactionRateRequest(BaseModel):
    """Request for LENR reaction rate calculation."""
    temperature_k: float = Field(default=300.0, description="Temperature (K)")
    loading_ratio: float = Field(default=0.85, description="H/M loading ratio")
    material: str = Field(default="palladium", description="Host material")
    defect_density: float = Field(default=0.01, description="Defect density fraction")
    volume_cm3: float = Field(default=1.0, description="Sample volume (cm³)")
    include_enhancements: bool = Field(default=True, description="Include enhancement factors")


@router.post("/lenr-reaction-rate")
async def calculate_lenr_reaction_rate_endpoint(request: LENRReactionRateRequest):
    """Calculate LENR reaction rate with all enhancements."""
    try:
        from ..physics.lenr_enhancement import calculate_lenr_reaction_rate
        
        result = calculate_lenr_reaction_rate(
            temperature_k=request.temperature_k,
            loading_ratio=request.loading_ratio,
            material=request.material,
            defect_density=request.defect_density,
            volume_cm3=request.volume_cm3,
            include_enhancements=request.include_enhancements
        )
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LENR rate calculation error: {str(e)}")


@router.get("/lenr-enhancement/mechanisms")
async def get_enhancement_mechanisms():
    """Get list of available enhancement mechanisms."""
    return {
        "mechanisms": [
            {"id": "electron_screening", "name": "Electron Screening", "description": "Conduction electron screening of nuclear charges"},
            {"id": "phonon_assisted", "name": "Phonon-Assisted Tunneling", "description": "Lattice phonons provide energy for tunneling"},
            {"id": "heavy_electron", "name": "Heavy Electron Effects", "description": "Enhanced electron mass in condensed matter"},
            {"id": "coherent_multi_body", "name": "Coherent Multi-Body", "description": "Coherent effects at high loading"},
            {"id": "loading_ratio", "name": "Loading Ratio", "description": "Hydrogen concentration effects"},
            {"id": "defect_enhancement", "name": "Defect Enhancement", "description": "Crystal defects and nanostructure effects"},
            {"id": "electromagnetic_field", "name": "EM Field Enhancement", "description": "External field effects"}
        ]
    }


# ============================================================================
# BUBBLE FUSION ENDPOINTS
# ============================================================================

class BubbleFusionRequest(BaseModel):
    """Request for bubble fusion simulation."""
    initial_radius_um: float = Field(default=10.0, description="Initial bubble radius (μm)")
    acoustic_pressure_bar: float = Field(default=1.2, description="Acoustic pressure amplitude (bar)")
    frequency_khz: float = Field(default=20.0, description="Acoustic frequency (kHz)")
    ambient_pressure_bar: float = Field(default=1.0, description="Ambient pressure (bar)")
    ambient_temperature_k: float = Field(default=298.0, description="Ambient temperature (K)")
    fluid_type: str = Field(default="water", description="Working fluid type")
    gas_type: str = Field(default="deuterium", description="Bubble gas type")
    gas_fraction: float = Field(default=0.8, description="Fraction of fusible gas")


@router.post("/bubble-fusion")
async def simulate_bubble_fusion_endpoint(request: BubbleFusionRequest):
    """
    Simulate acoustic cavitation (bubble) fusion.
    
    Calculates bubble dynamics using Rayleigh-Plesset approximation
    and estimates peak conditions and fusion probability during collapse.
    """
    try:
        from ..physics.bubble_fusion import simulate_bubble_fusion
        
        result = simulate_bubble_fusion(
            initial_radius_um=request.initial_radius_um,
            acoustic_pressure_bar=request.acoustic_pressure_bar,
            frequency_khz=request.frequency_khz,
            ambient_pressure_bar=request.ambient_pressure_bar,
            ambient_temperature_k=request.ambient_temperature_k,
            fluid_type=request.fluid_type,
            gas_type=request.gas_type,
            gas_fraction=request.gas_fraction
        )
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Bubble fusion simulation error: {str(e)}")


@router.get("/bubble-fusion/defaults")
async def get_bubble_fusion_defaults():
    """Get default parameters and available options for bubble fusion."""
    return {
        "defaults": {
            "initial_radius_um": 10.0,
            "acoustic_pressure_bar": 1.2,
            "frequency_khz": 20.0,
            "ambient_pressure_bar": 1.0,
            "ambient_temperature_k": 298.0,
            "fluid_type": "water",
            "gas_type": "deuterium",
            "gas_fraction": 0.8
        },
        "options": {
            "fluid_types": ["water", "d2o", "acetone", "d_acetone"],
            "gas_types": ["air", "argon", "deuterium", "xenon"]
        },
        "limits": {
            "initial_radius_um": {"min": 0.1, "max": 1000},
            "acoustic_pressure_bar": {"min": 0.1, "max": 100},
            "frequency_khz": {"min": 1, "max": 1000},
            "gas_fraction": {"min": 0, "max": 1}
        }
    }
