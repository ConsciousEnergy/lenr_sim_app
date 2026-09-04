"""
Unified LENR Simulation API Routes

Provides endpoints for the unified LENR theory simulation,
implementing all mechanisms from the theoretical framework paper.
"""

from fastapi import APIRouter, HTTPException, Query, WebSocket, WebSocketDisconnect, Request
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
import logging
import asyncio
import json
import math
import time
from app.core.config import settings
from app.physics_engine.scientific_guardrails import (
    build_electrolyte_diagnostics,
    classify_molarity_window,
    check_species_family_consistency,
    compute_alkali_activity_factor,
    compute_electrolyte_activity_multiplier,
    get_electrolyte_evidence_weight,
    normalize_electrolyte_species,
)
from app.physics_engine.parkhomov_validation import (
    validate_transmutation,
    infer_default_products,
    infer_default_reactants,
)
from app.physics_engine.constants import MAX_ENHANCEMENT_FACTOR
from app.physics_engine.bubble_mechanism_composition import build_prediction_report
from app.physics_engine.enhancement_saturation import build_saturation_report


def _finalize_enhancement_breakdown(
    raw_breakdown: Dict[str, Any],
    ceiling: float = MAX_ENHANCEMENT_FACTOR,
    mechanism_raw_log10: Optional[Dict[str, float]] = None,
) -> tuple[Dict[str, Any], Dict[str, Any]]:
    """Apply saturation reporting and the three-tier prediction block."""
    capped, saturation = build_saturation_report(
        raw_breakdown,
        ceiling,
        mechanism_raw_log10=mechanism_raw_log10,
    )
    capped["saturation"] = saturation
    capped["prediction"] = build_prediction_report(raw_breakdown, ceiling=ceiling)
    return capped, saturation

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/unified", tags=["unified-simulation"])

# Canonical response contract token for every unified surface (/simulate,
# /bubble-lattice HTTP, and the physics-update websocket). Derived from
# APP_VERSION so a version bump updates all surfaces in lockstep and cannot
# drift (CI version-consistency stays authoritative).
CONTRACT_VERSION = f"v{settings.APP_VERSION}-science-gate-1"

# Production hardening caps for unauthenticated compute surfaces.
MAX_UNCERTAINTY_SAMPLES = 512
MAX_WS_NUM_CYCLES = 10
MAX_WS_CONNECTIONS = 8
_WS_ACTIVE_CONNECTIONS = 0
_EXPORT_RATE_LIMIT_PER_MINUTE = 10
_EXPORT_CLIENT_MAX_ENTRIES = 4096
_export_clients: Dict[str, tuple] = {}


def _client_safe_error(log_message: str, exc: Exception, *, status_code: int = 500) -> HTTPException:
    """Log full exception server-side; return a generic client-facing detail."""
    logger.error("%s: %s", log_message, exc, exc_info=True)
    if status_code == 400:
        return HTTPException(status_code=400, detail="Invalid request parameters.")
    return HTTPException(status_code=500, detail="Simulation failed. Please check parameters and try again.")


def _enforce_export_rate_limit(request: Request) -> None:
    """Stricter per-IP budget for /export (full simulate + envelope)."""
    if not settings.ENABLE_RATE_LIMITING:
        return
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        client_ip = forwarded.split(",")[0].strip()
    else:
        client_ip = request.client.host if request.client else "unknown"
    if client_ip in settings.RATE_LIMIT_WHITELIST_IPS:
        return

    now = time.time()
    # Drop expired windows so the table cannot grow without bound over uptime.
    expired = [
        ip for ip, (_count, window_start) in _export_clients.items()
        if now - window_start >= 60
    ]
    for ip in expired:
        _export_clients.pop(ip, None)
    if len(_export_clients) >= _EXPORT_CLIENT_MAX_ENTRIES and client_ip not in _export_clients:
        # Evict the oldest window when at capacity (rare; scan-defense).
        oldest_ip = min(_export_clients.items(), key=lambda item: item[1][1])[0]
        _export_clients.pop(oldest_ip, None)

    count, window_start = _export_clients.get(client_ip, (0, now))
    if now - window_start >= 60:
        _export_clients[client_ip] = (1, now)
        return
    if count >= _EXPORT_RATE_LIMIT_PER_MINUTE:
        raise HTTPException(
            status_code=429,
            detail="Too Many Requests - export rate limit exceeded",
            headers={"Retry-After": str(max(1, int(60 - (now - window_start))))},
        )
    _export_clients[client_ip] = (count + 1, window_start)


# Request/Response Models
class MaterialConfig(BaseModel):
    """Material system configuration"""
    host_material: str = Field(
        default="palladium",
        description="Host material: palladium, nickel, titanium, lithium, or custom (generic fallback)"
    )
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
    electrolyte_family: str = Field(default="li", description="li, na, k, rb, cs, mixed, other")
    electrolyte_species: Optional[str] = Field(default=None, description="lioh, li2co3, naoh, na2co3, koh, k2co3, mixed, other")
    electrolyte_molarity_mol_l: float = Field(default=0.3, ge=0.0, description="Electrolyte molarity mol/L")
    solvent_type: str = Field(default="d2o", description="Electrolyte solvent type: d2o, h2o, mixed")
    ph_proxy: Optional[float] = Field(default=None, ge=0.0, le=14.0, description="Optional bounded pH proxy (0-14)")
    ionic_strength_proxy: Optional[float] = Field(default=None, ge=0.0, description="Optional bounded ionic-strength proxy")


class QuantumEffectsConfig(BaseModel):
    """Quantum effects toggles"""
    enable_screening: bool = Field(default=True, description="Enable electron screening")
    enable_qed: bool = Field(default=True, description="Enable double-layer QED effects")
    enable_casimir: bool = Field(default=True, description="Enable Casimir force effects")
    enable_coherence: bool = Field(default=True, description="Enable quantum coherence")
    enable_bubble_dynamics: bool = Field(default=True, description="Enable bubble collapse dynamics")
    enable_rydberg: bool = Field(default=True, description="Enable Rydberg matter effects")


class ElectrolyteConfig(BaseModel):
    """Electrolyte and alkali-ion context for electrolytic LENR runs."""
    family: str = Field(default="li", description="li, na, k, rb, cs, mixed, other")
    species: Optional[str] = Field(default=None, description="Electrolyte species, e.g. lioh, k2co3")
    molarity_mol_l: float = Field(
        default=0.3,
        ge=0.0,
        description="Electrolyte molarity (mol/L), recommended 0.01-1.0.",
    )
    solvent_type: str = Field(default="d2o", description="Electrolyte solvent type: d2o, h2o, mixed")
    ph_proxy: Optional[float] = Field(default=None, ge=0.0, le=14.0, description="Optional bounded pH proxy (0-14)")
    ionic_strength_proxy: Optional[float] = Field(default=None, ge=0.0, description="Optional bounded ionic-strength proxy")


class StimulationConfig(BaseModel):
    """Optional stimulation gates for when/how virtual lab (never auto-flips rate_mode)."""
    letts_laser: bool = Field(default=False)
    acoustic_drive: bool = Field(default=False)


class SimulationRequest(BaseModel):
    """Full simulation request"""
    material: MaterialConfig = Field(default_factory=MaterialConfig)
    environmental: EnvironmentalConfig = Field(default_factory=EnvironmentalConfig)
    lattice: LatticeConfig = Field(default_factory=LatticeConfig)
    quantum_effects: QuantumEffectsConfig = Field(default_factory=QuantumEffectsConfig)
    electrolyte: ElectrolyteConfig = Field(default_factory=ElectrolyteConfig)
    use_theory_pipeline: bool = Field(default=False, description="Enable theory-pipeline execution path")
    enabled_theories: Optional[List[str]] = Field(default=None, description="Optional list of theory IDs")
    theory_configs: Optional[Dict[str, Dict[str, Any]]] = Field(default=None, description="Optional per-theory config overrides")
    time_steps: int = Field(default=100, ge=10, le=1000)
    total_time: float = Field(default=10.0, ge=0.1, le=1000)
    # --- Additive reaction-rate engine / UQ controls (Phase 8, RR-006). ---
    # Defaults preserve legacy behaviour: conservative two_body mode, no UQ.
    rate_mode: str = Field(
        default="two_body",
        description="Reaction-rate formalism: 'two_body' (reference baseline), "
        "'trapped_state' (speculative TSC), or 'three_body' (speculative "
        "p+e+d cavitation chain).",
    )
    include_uncertainty: bool = Field(
        default=False,
        description="If true, run Sobol UQ on the reaction rate and return credible intervals.",
    )
    uncertainty_samples: int = Field(default=256, ge=16, le=MAX_UNCERTAINTY_SAMPLES)
    random_seed: Optional[int] = Field(default=None, description="Deterministic UQ seed.")
    experimental_band: Optional[List[float]] = Field(
        default=None,
        description="Optional [low, high] rate band (m^-3 s^-1) for Bayesian posterior weighting.",
    )
    # Optional lab ingest for Oracle B. None defaults; never auto-flips rate_mode.
    excess_power_W: Optional[float] = Field(default=None, ge=0)
    sigma_Q_W: Optional[float] = Field(default=None, ge=0)
    he4_atoms_per_s: Optional[float] = Field(default=None, ge=0)
    gamma_cps_ul: Optional[float] = Field(default=None, ge=0)
    gamma_efficiency: Optional[float] = Field(default=None, ge=0, le=1)
    p_4_occupation: Optional[float] = Field(default=None, ge=0, le=1)
    duty_fraction: Optional[float] = Field(
        default=None, ge=0, le=1,
        description="Fraction of total_time with active stimulation (when block).",
    )
    geometry_mode: Optional[str] = Field(
        default=None,
        description="Trap geometry rival: 'fcc_tetrahedral' or 'trap_25pm'.",
    )
    stimulation: Optional[StimulationConfig] = Field(
        default=None,
        description="Optional laser/acoustic stimulation flags for when block.",
    )
    persist_session_id: Optional[str] = Field(
        default=None,
        description="Optional analytics session id for auto-persist. Additive.",
    )
    persist_source: Optional[str] = Field(
        default=None,
        description="Optional persist source label (auto_persist or simulation_campaign).",
    )
    campaign_preset: Optional[str] = Field(
        default=None,
        description="Optional campaign preset name stored on persisted rows. Additive.",
    )
    campaign_tag: Optional[str] = Field(
        default=None,
        description="Optional campaign cell tag stored as parameters.tag. Additive.",
    )
    literature_id: Optional[str] = Field(
        default=None,
        description="Optional literature_baselines id for Q-anchored campaign cells. Additive.",
    )
    claim_tag: Optional[str] = Field(
        default=None,
        description="Optional EMP/null/disputed/contested/speculative literature tag. Additive.",
    )
    open_question_ids: Optional[List[str]] = Field(
        default=None,
        description="Optional EQ-OPEN-* ids this cell is meant to stress. Additive.",
    )


class EnhancementFactor(BaseModel):
    """Single enhancement factor result"""
    name: str
    value: float
    threshold_met: bool
    equation: str
    category: str
    # Numeric diagnostics plus string provenance (e.g. screening_model id).
    parameters: Dict[str, Any]


def _jsonable_mechanism_parameters(parameters: Dict[str, Any]) -> Dict[str, Any]:
    """Coerce mechanism parameter values for JSON without dropping provenance strings.

    The /mechanisms endpoint previously forced every value through ``float()``,
    which 500'd as soon as a mechanism reported a model identifier.
    """
    out: Dict[str, Any] = {}
    for key, value in (parameters or {}).items():
        if isinstance(value, bool):
            out[key] = value
            continue
        if isinstance(value, (int, float)):
            out[key] = float(value)
            continue
        if isinstance(value, str):
            try:
                out[key] = float(value)
            except ValueError:
                out[key] = value
            continue
        out[key] = value
    return out


class SimulationResponse(BaseModel):
    """Simulation response"""
    success: bool
    enhancement: Dict[str, Any]
    observables: Dict[str, float]
    thresholds: Dict[str, bool]
    time_series: Dict[str, List[float]]
    confidence: float
    contract_version: str
    validation: Dict[str, Any]
    analytics_transparency: Dict[str, Any]
    uncertainty_interval: Dict[str, float]
    falsification_conditions: List[str]
    observables_bridge: Dict[str, Any]
    computation_time: float
    transmutation_validation: Dict[str, Any] = Field(
        default_factory=dict,
        description=(
            "Parkhomov (2018) database lookup for the host/reactant "
            "transmutation pathway. See parkhomov_validation.py."
        ),
    )
    reaction_rate_engine: Dict[str, Any] = Field(
        default_factory=dict,
        description=(
            "Selectable reaction-rate formalism result (claim-tier labelled), "
            "optional Sobol/Bayesian uncertainty summary, and shell-pairing "
            "branching prior. Additive; empty unless requested. See "
            "reaction_rate_engine.py / reaction_rate_uq.py / shell_pairing_prior.py."
        ),
    )
    open_questions: Dict[str, Any] = Field(
        default_factory=dict,
        description=(
            "Additive researcher virtual lab (lenr-open-questions-v1): two-oracle "
            "determination, Q1–Q5 ledger, three-engine composition. Does not "
            "change contract_version. Never LENR_PROVED."
        ),
    )


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
    # Preserve top-level electrolyte as authoritative; lattice values are fallback-compatible.
    electrolyte_family = (request.electrolyte.family or request.lattice.electrolyte_family).lower()
    electrolyte_species = normalize_electrolyte_species(
        electrolyte_family,
        request.electrolyte.species or request.lattice.electrolyte_species,
    )
    electrolyte_molarity = request.electrolyte.molarity_mol_l
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
        "electrolyte_family": electrolyte_family,
        "electrolyte_species": electrolyte_species,
        "electrolyte_molarity_mol_l": electrolyte_molarity,
        "electrolyte_solvent_type": request.electrolyte.solvent_type,
        "electrolyte_ph_proxy": request.electrolyte.ph_proxy,
        "electrolyte_ionic_strength_proxy": request.electrolyte.ionic_strength_proxy,
        "use_theory_pipeline": request.use_theory_pipeline,
        "enabled_theories": request.enabled_theories,
        "theory_configs": request.theory_configs,
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
        hm = request.material.host_material.lower()
        if hm == "palladium":
            config.host_material = MaterialProperties.palladium()
        elif hm == "nickel":
            config.host_material = MaterialProperties.nickel()
        elif hm == "titanium":
            config.host_material = MaterialProperties.titanium()
        elif hm == "lithium":
            config.host_material = MaterialProperties.lithium()
        else:
            config.host_material = MaterialProperties.generic(request.material.host_material)
        
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
        config.electrolyte_family = (request.electrolyte.family or request.lattice.electrolyte_family).lower()
        config.electrolyte_species = normalize_electrolyte_species(
            config.electrolyte_family,
            request.electrolyte.species or request.lattice.electrolyte_species,
        )
        config.electrolyte_molarity_mol_l = request.electrolyte.molarity_mol_l
        config.use_theory_pipeline = request.use_theory_pipeline
        config.enabled_theories = request.enabled_theories
        config.theory_configs = request.theory_configs
        electrolyte_diagnostics = build_electrolyte_diagnostics(
            electrolyte_family=config.electrolyte_family,
            electrolyte_species=config.electrolyte_species,
            electrolyte_molarity_mol_l=config.electrolyte_molarity_mol_l,
        )
        
        # Run simulation
        model = UnifiedLENRModel(config)
        result = model.run_simulation()
        
        # Format response - ensure all numpy types are converted to Python native types
        enhancement_breakdown = {}
        for e in result.enhancement_breakdown:
            enhancement_breakdown[e.name] = {
                "value": float(e.value),
                "threshold_met": bool(e.threshold_met),
                "equation": str(e.equation),
                "category": str(e.category),
                "parameters": {
                    k: (float(v) if isinstance(v, (int, float)) else v)
                    for k, v in e.parameters.items()
                },
            }
        
        # Convert thresholds to Python bools
        thresholds = {k: bool(v) for k, v in result.thresholds_met.items()}

        # Parkhomov transmutation validation (v0.3.6-beta §3B)
        nuclear_reactants = infer_default_reactants(
            request.material.host_material, request.material.reactant
        )
        inferred_products = infer_default_products(
            request.material.host_material, request.material.reactant
        )
        transmutation_validation = validate_transmutation(
            reactants=nuclear_reactants,
            products=inferred_products,
        )

        # Additive reaction-rate engine + optional UQ + shell-pairing branching.
        # Non-fatal: a failure here must not break the core simulation response.
        reaction_rate_engine_block = _build_rate_engine_block(
            config, float(result.tunneling_probability), request,
            transmutation_validation,
        )
        route_mode = "theory_pipeline" if config.use_theory_pipeline else "legacy_unified_model"
        open_questions = _build_simulate_open_questions(
            request=request,
            model=model,
            result=result,
            rate_block=reaction_rate_engine_block,
            route_mode=route_mode,
        )

        response = SimulationResponse(
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
            contract_version=CONTRACT_VERSION,
            validation={
                "route_mode": "theory_pipeline" if config.use_theory_pipeline else "legacy_unified_model",
                "enabled_theories": config.enabled_theories or [],
                "electrolyte_species_family_consistent": electrolyte_diagnostics["species_family_consistent"],
                "electrolyte_support_level": electrolyte_diagnostics["support_level"],
            },
            analytics_transparency={
                "model_version": settings.APP_VERSION,
                "electrolyte_family": config.electrolyte_family,
                "electrolyte_species": config.electrolyte_species,
                "electrolyte_molarity_mol_l": float(config.electrolyte_molarity_mol_l),
                "electrolyte_diagnostics": electrolyte_diagnostics,
            },
            uncertainty_interval=result.uncertainty_interval,
            falsification_conditions=result.falsification_conditions,
            observables_bridge=result.observables_bridge,
            computation_time=float(result.computation_time),
            transmutation_validation=transmutation_validation,
            reaction_rate_engine=reaction_rate_engine_block,
            open_questions=open_questions,
        )
        from app.services.persist_runs import persist_unified_simulation
        persistence = await persist_unified_simulation(
            request,
            response,
            getattr(model, "last_pipeline_result", None),
            session_id=request.persist_session_id,
            source=request.persist_source or "auto_persist",
        )
        if persistence:
            transparency = dict(response.analytics_transparency or {})
            transparency["persistence"] = persistence
            response.analytics_transparency = transparency
        return response
        
    except Exception as e:
        raise _client_safe_error("Unified simulation error", e)

def _build_simulate_open_questions(
    *,
    request: "SimulationRequest",
    model: Any,
    result: Any,
    rate_block: Dict[str, Any],
    route_mode: str,
) -> Dict[str, Any]:
    """Additive virtual lab for /simulate. Empty dict on failure."""
    from app.physics_engine.open_questions import (
        observations_from_obj,
        safe_build_open_questions,
    )

    pipe = getattr(model, "last_pipeline_result", None)
    pipe_enh = float(pipe.combined_enhancement) if pipe is not None else None
    legacy = None if pipe is not None else float(result.total_enhancement)
    enabled = list(request.enabled_theories or [])
    if not enabled and pipe is not None:
        enabled = list(pipe.enabled_theories or [])
    hag = None
    if pipe is not None:
        for contrib in pipe.contributions:
            if getattr(contrib, "theory_id", "") == "hagelstein_phonon":
                hag = contrib.observables
                break
    return safe_build_open_questions(
        route_mode=route_mode,
        rate_mode=request.rate_mode,
        pipeline_combined_enhancement=pipe_enh,
        legacy_geometric_mean=legacy,
        rate_block=rate_block,
        two_body_reference=rate_block.get("two_body_reference"),
        enabled_theories=enabled,
        hagelstein_observables=hag,
        observations=observations_from_obj(request),
        loading_ratio=float(request.lattice.loading_ratio),
        total_time=float(request.total_time),
        duty_fraction=request.duty_fraction,
        geometry_mode=request.geometry_mode,
        stimulation=(
            request.stimulation.model_dump() if request.stimulation else None
        ),
    )


def _compose_rate_block(
    config: Any,
    tunneling_probability: float,
    *,
    mode: str,
    include_uncertainty: bool,
    uncertainty_samples: int,
    random_seed: Optional[int],
    experimental_band: Optional[List[float]],
    material_key: str,
    transmutation_validation: Dict[str, Any],
    geometry_mode: Optional[str] = None,
    p4_occupation: Optional[float] = None,
) -> Dict[str, Any]:
    """Shared reaction-rate engine core (RORO), reused by /simulate and /bubble-lattice.

    Computes the claim-tier-labelled rate, optional Sobol/Bayesian UQ, and the
    shell-pairing branching prior over matched transmutation products. Raises on
    failure so callers can apply their own defensive fallback.
    """
    from app.physics_engine.unified_lenr_model.reaction_rate_engine import (
        compute_reaction_rate,
    )
    from app.physics_engine.shell_pairing_prior import annotate_branching

    mode = (mode or "two_body").strip().lower()
    if mode not in {"two_body", "trapped_state", "three_body"}:
        mode = "two_body"

    rate_result = compute_reaction_rate(
        config,
        tunneling_probability,
        mode=mode,
        geometry_mode=geometry_mode,
        p4_occupation=p4_occupation,
    )
    block: Dict[str, Any] = {"rate": rate_result.as_dict()}

    if mode != "two_body":
        two_body_result = compute_reaction_rate(
            config, tunneling_probability, mode="two_body"
        )
        block["two_body_reference"] = two_body_result.as_dict()

    if include_uncertainty:
        from app.physics_engine.unified_lenr_model.reaction_rate_uq import (
            propagate_rate_uncertainty,
        )

        band = None
        if experimental_band and len(experimental_band) == 2:
            band = (float(experimental_band[0]), float(experimental_band[1]))
        uq = propagate_rate_uncertainty(
            config,
            mode=mode,
            n_samples=int(uncertainty_samples),
            seed=random_seed,
            experimental_band=band,
            material_key=material_key,
        )
        block["uncertainty"] = uq.as_dict()

    # Shell-pairing branching prior over the matched transmutation products.
    matches = (transmutation_validation or {}).get("matching_reactions", [])
    if matches:
        block["shell_pairing_branching"] = annotate_branching(matches)

    return block


def _build_rate_engine_block(
    config: Any,
    tunneling_probability: float,
    request: "SimulationRequest",
    transmutation_validation: Dict[str, Any],
) -> Dict[str, Any]:
    """Build the additive reaction-rate-engine response block for /simulate (RORO).

    Returns an empty dict on any failure so the core response is never affected.
    """
    try:
        return _compose_rate_block(
            config,
            tunneling_probability,
            mode=request.rate_mode,
            include_uncertainty=request.include_uncertainty,
            uncertainty_samples=request.uncertainty_samples,
            random_seed=request.random_seed,
            experimental_band=request.experimental_band,
            material_key=(request.material.host_material or "palladium").lower(),
            transmutation_validation=transmutation_validation,
            geometry_mode=request.geometry_mode,
            p4_occupation=request.p_4_occupation,
        )
    except Exception as exc:  # pragma: no cover - defensive, must not break core
        logger.warning("Reaction-rate engine block skipped: %s", exc)
        return {}


def _kgrp_block_from_timeline(
    timeline: List[Dict[str, Any]], drive_frequency_hz: float
) -> Dict[str, Any]:
    """KG-RP harmonic-locking diagnostics (6a) from the collapse timeline (RORO).

    The 50-point timeline spans one normalized acoustic cycle, so normalized_time
    in [0, 1] is mapped onto a single drive period for the harmonic analysis.
    Returns an empty dict if diagnostics cannot be computed.
    """
    try:
        import numpy as np
        from app.physics_engine.cavitation_kgrp import compute_kgrp_diagnostics

        if not timeline or len(timeline) < 4 or drive_frequency_hz <= 0:
            return {}
        period_s = 1.0 / float(drive_frequency_hz)
        times = np.array(
            [float(p.get("normalized_time", 0.0)) * period_s for p in timeline]
        )
        radii_m = np.array(
            [float(p.get("radius_um", 0.0)) * 1e-6 for p in timeline]
        )
        diagnostics = compute_kgrp_diagnostics(times, radii_m, float(drive_frequency_hz))
        return diagnostics.as_dict()
    except Exception as exc:  # pragma: no cover - defensive, must not break core
        logger.warning("KG-RP diagnostics skipped: %s", exc)
        return {}


def build_bubble_rate_engine_block(
    request: "BubbleLatticeRequest",
    collapse_result: Any,
    peak_enhancement: float,
    timeline: List[Dict[str, Any]],
    transmutation_validation: Dict[str, Any],
    *,
    electrolyte_family: str,
    electrolyte_species: Optional[str],
    electrolyte_molarity: float,
) -> Dict[str, Any]:
    """Build the additive reaction-rate-engine block for /bubble-lattice (RORO).

    Adapts the bubble-lattice request into a ``SimulationConfig`` evaluated at the
    LENR-active collapse instant (peak temperature + peak capped enhancement),
    derives the tunneling probability from the existing cross-section utility,
    then reuses ``_compose_rate_block`` (rate + UQ + shell-pairing) and appends
    KG-RP harmonic-locking diagnostics from the collapse timeline.

    Returns an empty dict on any failure so the core response is never affected.
    """
    try:
        from app.physics_engine.unified_lenr_model import (
            SimulationConfig, MaterialProperties, ReactantProperties,
        )
        from app.physics_engine.unified_lenr_model.cross_sections import (
            calculate_tunneling_probability,
        )

        config = SimulationConfig()
        hm = (request.material.host_material or "palladium").strip().lower()
        if hm == "palladium":
            config.host_material = MaterialProperties.palladium()
        elif hm == "nickel":
            config.host_material = MaterialProperties.nickel()
        elif hm == "titanium":
            config.host_material = MaterialProperties.titanium()
        elif hm == "lithium":
            config.host_material = MaterialProperties.lithium()
        else:
            config.host_material = MaterialProperties.generic(request.material.host_material)

        reactant = (request.material.reactant or "deuterium").strip().lower()
        if reactant == "deuterium":
            config.reactant = ReactantProperties.deuterium()
        elif reactant == "proton":
            config.reactant = ReactantProperties.proton()
        else:
            config.reactant = ReactantProperties.hydrogen()

        # Evaluate the rate at the LENR-active collapse instant rather than at
        # ambient conditions: peak collapse temperature + peak capped enhancement.
        collapse_temperature_k = max(
            float(getattr(collapse_result, "max_temperature", 0.0)),
            float(request.bubble.ambient_temperature_k),
            1.0,
        )
        config.temperature = collapse_temperature_k
        config.loading_ratio = request.lattice.loading_ratio
        config.electrolyte_family = electrolyte_family
        config.electrolyte_species = electrolyte_species
        config.electrolyte_molarity_mol_l = electrolyte_molarity
        config.random_seed = request.random_seed

        tunneling_probability = float(
            calculate_tunneling_probability(config, max(float(peak_enhancement), 1.0))
        )

        block = _compose_rate_block(
            config,
            tunneling_probability,
            mode=request.rate_mode,
            include_uncertainty=request.include_uncertainty,
            uncertainty_samples=request.uncertainty_samples,
            random_seed=request.random_seed,
            experimental_band=request.experimental_band,
            material_key=hm,
            transmutation_validation=transmutation_validation,
            geometry_mode=request.geometry_mode,
            p4_occupation=request.p_4_occupation,
        )

        # Transparency: record the collapse-instant inputs used for the rate.
        block["inputs"] = {
            "evaluated_at": "collapse_peak",
            "temperature_k": collapse_temperature_k,
            "peak_enhancement": float(peak_enhancement),
            "tunneling_probability": tunneling_probability,
        }

        # KG-RP harmonic-locking diagnostics (speculative_exploratory tier).
        kgrp = _kgrp_block_from_timeline(timeline, request.bubble.frequency_khz * 1e3)
        if kgrp:
            block["kgrp"] = kgrp

        return block
    except Exception as exc:  # pragma: no cover - defensive, must not break core
        logger.warning("Bubble reaction-rate engine block skipped: %s", exc)
        return {}


@router.post("/export")
async def export_unified_run(request: SimulationRequest, http_request: Request) -> Dict[str, Any]:
    """Run a simulation and return a reproducible ``lenr-run-export-v1`` envelope.

    Wraps the standard simulate response with seeds, claim tiers, an uncertainty
    summary, provenance, and a deduplicated per-run citation list (RR-017).
    """
    _enforce_export_rate_limit(http_request)
    from app.physics_engine.run_export import build_run_export

    response = await run_unified_simulation(request)
    try:
        env_value = settings.ENVIRONMENT.value  # EnvironmentType enum
    except AttributeError:
        env_value = str(getattr(settings, "ENVIRONMENT", "development"))

    return build_run_export(
        simulation_parameters=request.model_dump(),
        results=response.model_dump(),
        environment=env_value,
        system_preset=f"{request.material.host_material}_{request.material.reactant}",
        seed=request.random_seed,
        model_version=settings.APP_VERSION,
    )


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
        hm = host_material.lower()
        if hm == "palladium":
            config.host_material = MaterialProperties.palladium()
        elif hm == "nickel":
            config.host_material = MaterialProperties.nickel()
        elif hm == "titanium":
            config.host_material = MaterialProperties.titanium()
        elif hm == "lithium":
            config.host_material = MaterialProperties.lithium()
        else:
            config.host_material = MaterialProperties.generic(host_material)
        
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
                "parameters": _jsonable_mechanism_parameters(m.get("parameters") or {}),
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
        raise _client_safe_error("Get mechanisms error", e)


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
        raise _client_safe_error("Compare systems error", e)


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
    # Additive, opt-in. Default keeps the incompressible Rayleigh-Plesset path so
    # every stored baseline stays valid; 'keller_miksis' adds acoustic radiation
    # damping, which matters once the peak wall Mach number approaches ~0.1
    # (reported under collapse_results.bubble_dynamics).
    bubble_dynamics_mode: str = Field(
        default="rayleigh_plesset",
        description="Bubble-dynamics model: 'rayleigh_plesset' (incompressible, "
        "default) or 'keller_miksis' (weakly compressible, retains acoustic "
        "radiation damping).",
    )
    sound_speed_m_s: float = Field(
        default=1481.0,
        gt=0,
        description="Speed of sound in the surrounding liquid (water at 20 C by default).",
    )


class BubbleLatticeRequest(BaseModel):
    """Request for unified bubble-lattice simulation."""
    bubble: BubbleConfig = Field(default_factory=BubbleConfig)
    material: MaterialConfig = Field(default_factory=MaterialConfig)
    lattice: LatticeConfig = Field(default_factory=LatticeConfig)
    electrolyte: ElectrolyteConfig = Field(default_factory=ElectrolyteConfig)
    num_cycles: int = Field(default=2, ge=1, le=10, description="Number of acoustic cycles to simulate")
    # --- Additive reaction-rate engine / UQ controls (Phase 1, RR-006). ---
    # Defaults preserve legacy behaviour: conservative two_body mode, no UQ, and
    # an empty reaction_rate_engine block unless a non-default mode/UQ is requested.
    rate_mode: str = Field(
        default="two_body",
        description="Reaction-rate formalism: 'two_body' (reference baseline), "
        "'trapped_state' (speculative TSC), or 'three_body' (speculative "
        "p+e+d cavitation chain).",
    )
    include_uncertainty: bool = Field(
        default=False,
        description="If true, run Sobol UQ on the reaction rate and return credible intervals.",
    )
    uncertainty_samples: int = Field(default=256, ge=16, le=MAX_UNCERTAINTY_SAMPLES)
    random_seed: Optional[int] = Field(default=None, description="Deterministic UQ seed.")
    experimental_band: Optional[List[float]] = Field(
        default=None,
        description="Optional [low, high] rate band (m^-3 s^-1) for Bayesian posterior weighting.",
    )
    excess_power_W: Optional[float] = Field(default=None, ge=0)
    sigma_Q_W: Optional[float] = Field(default=None, ge=0)
    he4_atoms_per_s: Optional[float] = Field(default=None, ge=0)
    gamma_cps_ul: Optional[float] = Field(default=None, ge=0)
    gamma_efficiency: Optional[float] = Field(default=None, ge=0, le=1)
    p_4_occupation: Optional[float] = Field(default=None, ge=0, le=1)
    duty_fraction: Optional[float] = Field(default=None, ge=0, le=1)
    geometry_mode: Optional[str] = Field(default=None)
    stimulation: Optional[StimulationConfig] = Field(default=None)
    persist_session_id: Optional[str] = Field(
        default=None,
        description="Optional analytics session id for auto-persist. Additive.",
    )
    persist_source: Optional[str] = Field(
        default=None,
        description="Optional persist source label (auto_persist or simulation_campaign).",
    )
    literature_id: Optional[str] = Field(
        default=None,
        description="Optional literature_baselines id stored on persisted rows. Additive.",
    )
    campaign_preset: Optional[str] = Field(
        default=None,
        description="Optional campaign preset name stored on persisted rows. Additive.",
    )
    campaign_tag: Optional[str] = Field(
        default=None,
        description="Optional campaign cell tag stored as parameters.tag. Additive.",
    )
    claim_tag: Optional[str] = Field(
        default=None,
        description="Optional EMP/null/disputed/contested/speculative literature tag. Additive.",
    )
    open_question_ids: Optional[List[str]] = Field(
        default=None,
        description="Optional EQ-OPEN-* ids this cell is meant to stress. Additive.",
    )
    theory_result: Optional[Dict[str, Any]] = Field(
        default=None,
        description=(
            "Optional Theory Testbed result already computed in the client. "
            "Persisted as labeled pipeline_scores; not multiplied into peak enhancement."
        ),
    )
    pipeline_scores: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Optional pre-built pipeline_scores. Not multiplied into peak enhancement.",
    )


class BubbleLatticeResponse(BaseModel):
    """Response from bubble-lattice simulation."""
    success: bool
    contract_version: str = Field(
        default=CONTRACT_VERSION,
        description="Canonical response contract version for unified bubble-lattice payload.",
    )
    collapse_results: Dict[str, Any]
    proton_phases: Dict[str, float]
    enhancement_timeline: List[Dict[str, Any]]
    collapse_trajectory: Dict[str, Any] = Field(
        default_factory=dict,
        description=(
            "Additive downsampled Rayleigh-Plesset trajectory (time, radius, "
            "wall velocity) from the integrated solution the peak conditions "
            "came from. Previously the series never left the engine, so no "
            "client could plot the actual collapse curve."
        ),
    )
    collapse_uncertainty: Dict[str, Any] = Field(
        default_factory=dict,
        description=(
            "Additive, opt-in Sobol predictive intervals for the collapse "
            "observables and the mechanism breakdown. Populated only when "
            "include_uncertainty is true; previously only the reaction rate "
            "carried an interval while peak T/P/R_min were bare point estimates."
        ),
    )
    peak_conditions: Dict[str, Any]  # Changed from Dict[str, float] to allow enhancement_breakdown dict
    electrolyte_diagnostics: Dict[str, Any] = {}
    validation: Dict[str, Any] = {}
    observables_bridge: Dict[str, Any] = {}
    regime_validity_flags: Dict[str, bool] = {}
    unsupported_extrapolation_flags: Dict[str, bool] = {}
    transmutation_validation: Dict[str, Any] = Field(
        default_factory=dict,
        description=(
            "Parkhomov (2018) database lookup for the host/reactant "
            "transmutation pathway."
        ),
    )
    reaction_rate_engine: Dict[str, Any] = Field(
        default_factory=dict,
        description=(
            "Additive collapse-instant reaction-rate result (claim-tier "
            "labelled), optional Sobol/Bayesian uncertainty summary, shell-pairing "
            "branching prior, and KG-RP harmonic-locking diagnostics. Empty unless "
            "the engine could be evaluated. See build_bubble_rate_engine_block."
        ),
    )
    open_questions: Dict[str, Any] = Field(
        default_factory=dict,
        description=(
            "Additive researcher virtual lab (lenr-open-questions-v1). "
            "Does not change contract_version. Never LENR_PROVED."
        ),
    )


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
    - **host_material** (str): "palladium", "nickel", "titanium", "lithium", or custom (generic fallback)
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
    - **phase**: Current collapse phase (EXPANSION, COLLAPSE, MINIMUM, REBOUND; then repeats)
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
        
        # Accept any host material (palladium, nickel, titanium, lithium use specific props; others use generic fallback)
        hm = request.material.host_material.strip().lower()
        if not hm:
            raise HTTPException(
                status_code=400,
                detail="Host material is required"
            )
        
        if request.material.reactant not in ['deuterium', 'hydrogen', 'proton']:
            raise HTTPException(
                status_code=400,
                detail="Reactant must be one of: deuterium, hydrogen, proton"
            )
        
        from app.physics_engine.bubble_lattice_interaction import (
            SCHWINGER_CRITICAL_FIELD_V_M,
            BubbleLatticeInteraction,
            BubbleParameters,
            LatticeParameters,
        )

        # Create bubble parameters
        # An unrecognised mode falls back to the incompressible default rather than
        # erroring, matching how rate_mode handles bad input.
        requested_dynamics_mode = str(request.bubble.bubble_dynamics_mode or "").lower()
        dynamics_mode = (
            requested_dynamics_mode
            if requested_dynamics_mode in {"rayleigh_plesset", "keller_miksis"}
            else "rayleigh_plesset"
        )
        bubble_params = BubbleParameters(
            initial_radius=request.bubble.initial_radius_um * 1e-6,
            driving_pressure=request.bubble.driving_pressure_bar * 1e5,
            frequency=request.bubble.frequency_khz * 1e3,
            ambient_temperature=request.bubble.ambient_temperature_k,
            bubble_dynamics_mode=dynamics_mode,
            sound_speed=request.bubble.sound_speed_m_s,
        )
        
        # Create lattice parameters (use for_material for Li/custom; unknown → Pd fallback).
        # bulk_modulus must be copied through: Casimir strain is P/K, and Li's K is
        # ~16x softer than Pd — dropping it silently forced every host onto Pd.
        base = LatticeParameters.for_material(request.material.host_material)
        lattice_params = LatticeParameters(
            host_material=request.material.host_material,
            loading_ratio=request.lattice.loading_ratio,
            defect_density=request.lattice.defect_density,
            surface_roughness=request.lattice.surface_roughness,
            lattice_constant=base.lattice_constant,
            electron_density=base.electron_density,
            debye_temperature=base.debye_temperature,
            work_function=base.work_function,
            fermi_energy=base.fermi_energy,
            screening_potential=base.screening_potential,
            bulk_modulus=base.bulk_modulus,
        )
        
        # Run bubble collapse simulation. When the caller left the default
        # Rayleigh-Plesset mode and peak Mach exceeds the compressibility
        # threshold, re-run with Keller-Miksis so bounds and peak conditions
        # reflect acoustic radiation damping (EQ-BBL-LIM-01 / §9C.11).
        _KM_AUTO_MACH_THRESHOLD = 0.3
        model = BubbleLatticeInteraction(bubble_params, lattice_params)
        collapse_result = model.simulate_collapse(num_cycles=request.num_cycles)
        bounds_solver_used = dynamics_mode
        km_auto_selected = False
        if (
            dynamics_mode == "rayleigh_plesset"
            and float(collapse_result.bubble_dynamics.get("peak_mach", 0.0)) >= _KM_AUTO_MACH_THRESHOLD
        ):
            bubble_params.bubble_dynamics_mode = "keller_miksis"
            model = BubbleLatticeInteraction(bubble_params, lattice_params)
            collapse_result = model.simulate_collapse(num_cycles=request.num_cycles)
            bounds_solver_used = "keller_miksis"
            km_auto_selected = True
        bubble_dynamics_report = dict(collapse_result.bubble_dynamics or {})
        bubble_dynamics_report["bounds_solver_used"] = bounds_solver_used
        bubble_dynamics_report["km_auto_selected"] = km_auto_selected
        
        # Clamp peak enhancement to the theory-level cap (constants.py)
        # Canonical electrolyte source is top-level request.electrolyte; lattice fields
        # remain fallback-compatible for older clients.
        family = (
            request.electrolyte.family
            or request.lattice.electrolyte_family
            or "li"
        ).lower()
        species = normalize_electrolyte_species(
            family,
            request.electrolyte.species or request.lattice.electrolyte_species,
        )
        molarity = float(
            request.electrolyte.molarity_mol_l
            if request.electrolyte.molarity_mol_l is not None
            else (request.lattice.electrolyte_molarity_mol_l or 0.0)
        )
        solvent_type = request.electrolyte.solvent_type or request.lattice.solvent_type
        ph_proxy = request.electrolyte.ph_proxy if request.electrolyte.ph_proxy is not None else request.lattice.ph_proxy
        ionic_strength_proxy = (
            request.electrolyte.ionic_strength_proxy
            if request.electrolyte.ionic_strength_proxy is not None
            else request.lattice.ionic_strength_proxy
        )
        evidence_weight = get_electrolyte_evidence_weight(family)
        alkali_activity_factor = compute_alkali_activity_factor(molarity)
        electrolyte_multiplier = compute_electrolyte_activity_multiplier(family, molarity, species)
        species_family_consistent = check_species_family_consistency(family, species)
        electrolyte_diagnostics = build_electrolyte_diagnostics(
            electrolyte_family=family,
            electrolyte_species=species,
            electrolyte_molarity_mol_l=molarity,
        )
        electrolyte_diagnostics.update({
            "solvent_type": solvent_type,
            "ph_proxy": ph_proxy,
            "ionic_strength_proxy": ionic_strength_proxy,
        })

        # Calculate enhancement breakdown at peak conditions. Fold the electrolyte
        # multiplier into the same product as the other mechanisms so
        # peak_conditions.enhancement_factor and enhancement_breakdown.total agree.
        peak_enhancement_breakdown = model._calculate_enhancement_breakdown(
            collapse_result.max_temperature,
            collapse_result.max_pressure,
            collapse_result.double_layer_field_peak,
            collapse_result.compression_ratio
        )
        peak_enhancement_breakdown["electrolyte"] = float(electrolyte_multiplier)

        # Mechanism-level provenance: which screening kernel and cited potential
        # were used, and whether the Casimir term is inside its continuum domain.
        # Both were previously unreported, so a client could not tell that every
        # host screened identically or that Casimir was being extrapolated.
        from app.physics_engine.screening_kernel import compute_screening_enhancement

        peak_screening = compute_screening_enhancement(
            temperature_k=collapse_result.max_temperature,
            material=request.material.host_material,
            screening_potential_ev=lattice_params.screening_potential,
        )
        mechanism_provenance = {
            "screening": {
                "model": peak_screening["model"],
                "screening_potential_ev": peak_screening["screening_potential_ev"],
                "screening_potential_range_ev": peak_screening["screening_potential_range_ev"],
                "thermal_energy_ev": peak_screening["thermal_energy_ev"],
                "sommerfeld_parameter": peak_screening["sommerfeld_parameter"],
                # Uncapped magnitude in log space: exp() of the raw exponent
                # overflows float64 at collapse temperatures.
                "log10_enhancement_raw": peak_screening["log10_enhancement_raw"],
                "is_saturated": peak_screening["is_saturated"],
                "exceeds_adiabatic_limit": peak_screening["exceeds_adiabatic_limit"],
                "citations": peak_screening["citations"],
            },
            "casimir": model.casimir_domain_validity(collapse_result.max_pressure),
            "qed": {
                "model": "heisenberg_euler_weak_field",
                "critical_field_v_m": SCHWINGER_CRITICAL_FIELD_V_M,
                "note": (
                    "eps_eff = 1 + (2 alpha / 45 pi)(E/E_cr)^2 with E_cr the "
                    "Schwinger limit; negligible at attainable collapse fields."
                ),
            },
            "rydberg": {
                "model": "log_bounded_orbital_overlap",
                "max_enhancement": BubbleLatticeInteraction.RYDBERG_MAX_ENHANCEMENT,
            },
        }
        # Apply the theory display ceiling, but keep the raw value and an explicit
        # saturation flag per mechanism. Clamping alone made unrelated mechanisms
        # (qed/casimir/rydberg/compression) all print the ceiling, erasing the
        # breakdown's information content.
        peak_enhancement_breakdown, peak_saturation = _finalize_enhancement_breakdown(
            peak_enhancement_breakdown,
            MAX_ENHANCEMENT_FACTOR,
            mechanism_raw_log10={
                "screening": peak_screening["log10_enhancement_raw"],
            },
        )
        capped_enhancement = float(
            peak_enhancement_breakdown.get("prediction", {})
            .get("claim_tier_display", {})
            .get("total", peak_enhancement_breakdown.get("total", MAX_ENHANCEMENT_FACTOR))
        )
        corrected_proton_phases = model._calculate_proton_phases(
            collapse_result.max_temperature,
            collapse_result.double_layer_field_peak,
            capped_enhancement,
        )
        nuclear_fraction = float(corrected_proton_phases.get("NUCLEAR", 0.0))
        contradiction_reason_code = "none"
        has_contradiction = False
        if capped_enhancement >= MAX_ENHANCEMENT_FACTOR and nuclear_fraction <= 0.0:
            contradiction_reason_code = "threshold_boundary"
            has_contradiction = True
        elif "NUCLEAR" not in corrected_proton_phases:
            contradiction_reason_code = "missing_phase_data"
            has_contradiction = True
        elif not species_family_consistent:
            contradiction_reason_code = "inconsistent_mode"
            has_contradiction = True
        
        # Generate enhancement timeline with breakdown
        import numpy as np
        
        def sanitize_float(value, default=0.0):
            """Sanitize float values to ensure JSON compatibility."""
            if value is None or (isinstance(value, float) and (math.isnan(value) or math.isinf(value))):
                return default
            return float(value)
        
        def sanitize_dict(d, default=0.0):
            """Recursively sanitize a dict of float values.

            Nested dicts must be walked too, otherwise a non-finite float inside
            a sub-dict (e.g. the saturation report) reaches the JSON encoder and
            fails the response.
            """
            sanitized = {}
            for k, v in d.items():
                if isinstance(v, dict):
                    sanitized[k] = sanitize_dict(v, default)
                elif isinstance(v, bool) or not isinstance(v, (int, float)):
                    sanitized[k] = v
                else:
                    sanitized[k] = sanitize_float(v, default)
            return sanitized
        
        timeline = []
        for t in np.linspace(0, 1, 50):
            instant = model.calculate_instantaneous_enhancement(t)
            # Pressure comes from thermo-consistent conditions — never from
            # ambient_temperature_k (that bug overstated timeline pressure ~300x
            # and corrupted Casimir on the chart).
            pressure_pa = float(
                instant["conditions"].get("pressure")
                or (
                    bubble_params.ambient_pressure
                    * instant["conditions"]["compression"]
                    ** (3.0 * bubble_params.polytropic_index)
                )
            )
            instant_breakdown = model._calculate_enhancement_breakdown(
                instant["conditions"]["temperature"],
                pressure_pa,
                instant["conditions"]["electric_field"],
                instant["conditions"]["compression"]
            )
            instant_breakdown["electrolyte"] = float(electrolyte_multiplier)
            instant_screening = compute_screening_enhancement(
                temperature_k=instant["conditions"]["temperature"],
                material=request.material.host_material,
                screening_potential_ev=lattice_params.screening_potential,
            )
            capped_instant_breakdown, instant_saturation = _finalize_enhancement_breakdown(
                instant_breakdown,
                MAX_ENHANCEMENT_FACTOR,
                mechanism_raw_log10={
                    "screening": instant_screening["log10_enhancement_raw"],
                },
            )
            capped_instant_enhancement = float(
                capped_instant_breakdown.get("prediction", {})
                .get("claim_tier_display", {})
                .get("total", capped_instant_breakdown.get("total", MAX_ENHANCEMENT_FACTOR))
            )
            timeline.append({
                "normalized_time": sanitize_float(t, 0.0),
                "phase": instant["phase"],
                "enhancement": sanitize_float(capped_instant_enhancement, 1.0),
                # Uncapped magnitude, so a timeline plot is not a flat line at the
                # display ceiling. Additive.
                "enhancement_log10_raw": sanitize_float(
                    instant_saturation.get("mechanisms", {})
                    .get("total", {})
                    .get("log10_value_raw", instant.get("enhancement_log10_raw")),
                    0.0,
                ),
                "enhancement_is_saturated": bool(
                    instant_saturation.get("mechanisms", {})
                    .get("total", {})
                    .get("is_saturated", instant.get("enhancement_is_saturated", False))
                ),
                "collapse_model": instant["conditions"].get("source", "unknown"),
                "electrolyte_multiplier": sanitize_float(electrolyte_multiplier, 1.0),
                "enhancement_breakdown": sanitize_dict(capped_instant_breakdown, 1.0),
                "proton_distribution": instant["proton_distribution"],
                "radius_factor": sanitize_float(instant["conditions"]["radius_factor"], 1.0),
                # Canonical aliases for frontend consumers (avoid divergent field names).
                "radius_um": sanitize_float(
                    instant["conditions"]["radius_factor"] * request.bubble.initial_radius_um,
                    request.bubble.initial_radius_um,
                ),
                "temperature": sanitize_float(instant["conditions"]["temperature"], 300.0),
                "temperature_k": sanitize_float(instant["conditions"]["temperature"], 300.0),
                "electric_field": sanitize_float(instant["conditions"]["electric_field"], 0.0),
                "electric_field_v_m": sanitize_float(instant["conditions"]["electric_field"], 0.0),
                "pressure_bar": sanitize_float(pressure_pa / 1e5, 1.0),
            })
        
        # Opt-in Sobol intervals for the collapse observables and mechanisms.
        # Non-fatal by construction: a UQ failure must not break the core response.
        collapse_uncertainty: Dict[str, Any] = {}
        if request.include_uncertainty:
            try:
                from app.physics_engine.collapse_uq import propagate_collapse_uncertainty

                collapse_uncertainty = sanitize_dict(
                    propagate_collapse_uncertainty(
                        model=model,
                        compression_ratio=collapse_result.compression_ratio,
                        temperature_ceiling=float(
                            (collapse_result.limits.get("temperature_k") or {}).get(
                                "ceiling", 2.0e6
                            )
                        ),
                        pressure_ceiling=float(
                            (collapse_result.limits.get("pressure_pa") or {}).get(
                                "ceiling", 1.0e10
                            )
                        ),
                        # Bounded independently of the rate-engine sample count: each
                        # sample re-evaluates the mechanism breakdown.
                        n_samples=min(request.uncertainty_samples, 256),
                        seed=request.random_seed,
                        material=request.material.host_material,
                    ),
                    0.0,
                )
            except Exception:
                logger.exception("Collapse UQ failed; continuing without it")

        validated_window, soft_window, outside_supported_range = classify_molarity_window(molarity)

        # Parkhomov transmutation validation (v0.3.6-beta §3B)
        nuclear_reactants = infer_default_reactants(
            request.material.host_material, request.material.reactant
        )
        inferred_products = infer_default_products(
            request.material.host_material, request.material.reactant
        )
        transmutation_validation = validate_transmutation(
            reactants=nuclear_reactants,
            products=inferred_products,
        )

        # Additive reaction-rate engine + optional UQ + shell-pairing + KG-RP.
        # Non-fatal: a failure here must not break the core bubble-lattice response.
        reaction_rate_engine_block = build_bubble_rate_engine_block(
            request,
            collapse_result,
            capped_enhancement,
            timeline,
            transmutation_validation,
            electrolyte_family=family,
            electrolyte_species=species,
            electrolyte_molarity=molarity,
        )
        from app.physics_engine.open_questions import (
            observations_from_obj,
            safe_build_open_questions,
        )
        open_questions = safe_build_open_questions(
            route_mode="bubble_lattice_legacy",
            rate_mode=request.rate_mode,
            bubble_peak_enhancement=float(capped_enhancement),
            rate_block=reaction_rate_engine_block,
            two_body_reference=reaction_rate_engine_block.get("two_body_reference"),
            observations=observations_from_obj(request),
            loading_ratio=float(request.lattice.loading_ratio),
            total_time=float(request.num_cycles),
            duty_fraction=request.duty_fraction,
            geometry_mode=request.geometry_mode,
            stimulation=(
                {**(request.stimulation.model_dump() if request.stimulation else {}),
                 "acoustic_drive": True}
            ),
            kgrp_locked=bool(
                (reaction_rate_engine_block.get("kgrp") or {}).get("is_locked")
            ),
        )

        # Sanitize all float values to ensure JSON compliance
        response = BubbleLatticeResponse(
            success=True,
            contract_version=CONTRACT_VERSION,
            collapse_results={
                "min_radius_um": sanitize_float(collapse_result.min_radius * 1e6, 0.1),
                "max_temperature_k": sanitize_float(collapse_result.max_temperature, 300.0),
                "max_pressure_bar": sanitize_float(collapse_result.max_pressure / 1e5, 1.0),
                "compression_ratio": sanitize_float(collapse_result.compression_ratio, 1.0),
                "collapse_time_us": sanitize_float(collapse_result.collapse_time * 1e6, 0.0),
                "peak_field_v_m": sanitize_float(collapse_result.double_layer_field_peak, 0.0),
                "peak_enhancement": sanitize_float(capped_enhancement, 1.0),
                # Which reporting ceilings bound this result (additive; see
                # REGIME_TEMPERATURE_PROVENANCE for the anchoring literature).
                "limits": sanitize_dict(collapse_result.limits or {}, 0.0),
                # Which screening kernel and cited potential produced the screening
                # term, and whether the Casimir term is inside its continuum domain.
                "mechanism_provenance": mechanism_provenance,
                # Solver, dynamics model and peak wall Mach number, so a client can
                # tell whether the incompressible model was admissible.
                "bubble_dynamics": sanitize_dict(bubble_dynamics_report, 0.0),
            },
            proton_phases=corrected_proton_phases,
            enhancement_timeline=timeline,
            # Additive: the integrated collapse curve behind the peak conditions.
            collapse_trajectory=model.get_collapse_trajectory(),
            collapse_uncertainty=collapse_uncertainty,
            peak_conditions={
                "temperature_k": sanitize_float(collapse_result.max_temperature, 300.0),
                "pressure_gpa": sanitize_float(collapse_result.max_pressure / 1e9, 0.0001),
                "electric_field_v_m": sanitize_float(collapse_result.double_layer_field_peak, 0.0),
                "enhancement_factor": sanitize_float(capped_enhancement, 1.0),
                "enhancement_breakdown": sanitize_dict(
                    {**peak_enhancement_breakdown, "saturation": peak_saturation}, 1.0
                ),
                "alkali_activity_factor": sanitize_float(alkali_activity_factor, 1.0),
                "electrolyte_multiplier": sanitize_float(electrolyte_multiplier, 1.0),
                "electrolyte_species": species,
                "electrolyte_family": family,
                "electrolyte_molarity_mol_l": molarity,
            },
            electrolyte_diagnostics=electrolyte_diagnostics,
            validation={
                "route_mode": "bubble_lattice_legacy",
                "contradiction": has_contradiction,
                "contradiction_reason_code": contradiction_reason_code,
                "nuclear_threshold_policy": "nuclear_fraction > 0 expected when enhancement_factor >= 1e5",
                # Composition contract: this route reports a phenomenological
                # product of bubble-lattice mechanisms. The theory pipeline
                # reports a grouped-winner product from a different engine.
                # Neither is a factor of the other.
                "composition_contract": {
                    "engine": "bubble_lattice_mechanism_product",
                    "combination_rule": "phenomenological_multiplicative",
                    "not_combinable_with": [
                        "theory_pipeline.combined_enhancement",
                    ],
                    "note": (
                        "peak_conditions.enhancement_factor is the product of "
                        "this route's mechanism breakdown (including the "
                        "electrolyte multiplier). Do not multiply it by the "
                        "theory pipeline's combined_enhancement."
                    ),
                },
            },
            observables_bridge={
                "electrolyte_family": family,
                "electrolyte_species": species,
                "electrolyte_molarity_mol_l": molarity,
                "electrolyte_solvent_type": solvent_type,
                "electrolyte_ph_proxy": ph_proxy,
                "electrolyte_ionic_strength_proxy": ionic_strength_proxy,
                "electrolyte_activity_multiplier": sanitize_float(electrolyte_multiplier, 1.0),
                "evidence_weight": sanitize_float(evidence_weight, 1.0),
                "alkali_activity_factor": sanitize_float(alkali_activity_factor, 1.0),
            },
            regime_validity_flags={
                "electrolyte_molarity_validated_window": validated_window,
                "electrolyte_molarity_soft_window": soft_window,
                "electrolyte_species_family_consistent": species_family_consistent,
                "electrolyte_ph_proxy_provided": ph_proxy is not None,
                "electrolyte_ionic_strength_proxy_provided": ionic_strength_proxy is not None,
            },
            unsupported_extrapolation_flags={
                "electrolyte_molarity_outside_supported_range": outside_supported_range,
                "low_support_alkali_family": bool(family in {"rb", "cs", "other"}),
                "inconsistent_electrolyte_species_family": not species_family_consistent,
            },
            transmutation_validation=transmutation_validation,
            reaction_rate_engine=reaction_rate_engine_block,
            open_questions=open_questions,
        )
        from app.services.persist_runs import persist_bubble_lattice
        persistence = await persist_bubble_lattice(
            request,
            response,
            session_id=request.persist_session_id,
            source=request.persist_source or "auto_persist",
        )
        if persistence:
            validation = dict(response.validation or {})
            validation["persistence"] = persistence
            response.validation = validation
        return response
        
    except HTTPException:
        # Re-raise HTTP exceptions (validation errors)
        raise
    except ValueError as e:
        raise _client_safe_error("Invalid physics parameters", e, status_code=400)
    except Exception as e:
        raise _client_safe_error("Bubble-lattice simulation error", e)


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
    global _WS_ACTIVE_CONNECTIONS

    # Reserve a slot before the awaitable accept() so concurrent connects
    # cannot race past MAX_WS_CONNECTIONS.
    if _WS_ACTIVE_CONNECTIONS >= MAX_WS_CONNECTIONS:
        await websocket.close(code=1013, reason="Too many concurrent streams")
        return

    _WS_ACTIVE_CONNECTIONS += 1
    try:
        await websocket.accept()
    except Exception:
        _WS_ACTIVE_CONNECTIONS = max(0, _WS_ACTIVE_CONNECTIONS - 1)
        raise

    logger.info(
        "WebSocket connection established for bubble-lattice simulation (%s/%s)",
        _WS_ACTIVE_CONNECTIONS,
        MAX_WS_CONNECTIONS,
    )
    
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
        
        base = LatticeParameters.for_material(params["material"]["host_material"])
        lattice_params = LatticeParameters(
            host_material=params["material"]["host_material"],
            loading_ratio=params["lattice"]["loading_ratio"],
            defect_density=params["lattice"].get("defect_density", 1e16),
            surface_roughness=params["lattice"].get("surface_roughness", 5e-9),
            lattice_constant=base.lattice_constant,
            electron_density=base.electron_density,
            debye_temperature=base.debye_temperature,
            work_function=base.work_function,
            fermi_energy=base.fermi_energy,
            screening_potential=base.screening_potential,
            bulk_modulus=base.bulk_modulus,
        )
        electrolyte_payload = params.get("electrolyte", {}) or {}
        lattice_payload = params.get("lattice", {}) or {}
        family = (
            electrolyte_payload.get("family")
            or lattice_payload.get("electrolyte_family")
            or "li"
        ).lower()
        species = normalize_electrolyte_species(
            family,
            electrolyte_payload.get("species") or lattice_payload.get("electrolyte_species"),
        )
        molarity = float(
            electrolyte_payload.get("molarity_mol_l")
            if electrolyte_payload.get("molarity_mol_l") is not None
            else lattice_payload.get("electrolyte_molarity_mol_l", 0.3)
        )
        electrolyte_multiplier = compute_electrolyte_activity_multiplier(family, molarity, species)
        
        # Create model
        model = BubbleLatticeInteraction(bubble_params, lattice_params)
        
        # Stream real-time updates — cap cycles to match HTTP BubbleLatticeRequest.
        num_points = 100  # Points per cycle
        try:
            requested_cycles = int(params.get("num_cycles", 2))
        except (TypeError, ValueError):
            requested_cycles = 2
        num_cycles = max(1, min(MAX_WS_NUM_CYCLES, requested_cycles))
        
        for cycle in range(num_cycles):
            for i in range(num_points):
                normalized_time = (cycle * num_points + i) / (num_cycles * num_points)
                if normalized_time > 1.0:
                    normalized_time = normalized_time % 1.0
                
                # Calculate instantaneous conditions
                instant = model.calculate_instantaneous_enhancement(normalized_time)
                pressure_pa = float(
                    instant["conditions"].get("pressure")
                    or (
                        bubble_params.ambient_pressure
                        * instant["conditions"]["compression"]
                        ** (3.0 * bubble_params.polytropic_index)
                    )
                )
                breakdown = model._calculate_enhancement_breakdown(
                    instant["conditions"]["temperature"],
                    pressure_pa,
                    instant["conditions"]["electric_field"],
                    instant["conditions"]["compression"]
                )
                breakdown["electrolyte"] = float(electrolyte_multiplier)
                breakdown, breakdown_saturation = _finalize_enhancement_breakdown(
                    breakdown, MAX_ENHANCEMENT_FACTOR
                )
                
                # Send update
                # Additive fields matching the HTTP timeline contract so the
                # live stream can report saturation instead of clients
                # recomputing log10 from the already-capped display value.
                total_saturation = breakdown_saturation.get("mechanisms", {}).get("total", {})
                raw_log10 = total_saturation.get("log10_value_raw")
                if not isinstance(raw_log10, (int, float)) or not math.isfinite(raw_log10):
                    raw_log10 = None
                claim_total = (
                    breakdown.get("prediction", {})
                    .get("claim_tier_display", {})
                    .get("total", breakdown.get("total", MAX_ENHANCEMENT_FACTOR))
                )
                await websocket.send_json({
                    "type": "physics_update",
                    "contract_version": CONTRACT_VERSION,
                    "cycle": cycle,
                    "normalized_time": normalized_time,
                    "phase": instant["phase"],
                    "enhancement": float(claim_total),
                    "enhancement_log10_raw": raw_log10,
                    "enhancement_is_saturated": bool(
                        total_saturation.get("is_saturated", False)
                    ),
                    "enhancement_breakdown": breakdown,
                    "proton_distribution": instant["proton_distribution"],
                    "radius_um": float(instant["conditions"]["radius_factor"] * params["bubble"]["initial_radius_um"]),
                    "temperature_k": float(instant["conditions"]["temperature"]),
                    "electric_field_v_m": float(instant["conditions"]["electric_field"]),
                    "pressure_bar": float(pressure_pa / 1e5),
                    "conditions": {
                        "radius_factor": float(instant["conditions"]["radius_factor"]),
                        "compression": float(instant["conditions"]["compression"]),
                        "temperature": float(instant["conditions"]["temperature"]),
                        "pressure": float(pressure_pa),
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
        logger.error("WebSocket error in bubble-lattice simulation: %s", e, exc_info=True)
        try:
            await websocket.send_json({
                "type": "error",
                "message": "Simulation stream failed. Please check parameters and try again."
            })
        except Exception:
            pass
    finally:
        _WS_ACTIVE_CONNECTIONS = max(0, _WS_ACTIVE_CONNECTIONS - 1)


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
        raise _client_safe_error("Invalid parameters for instant conditions", e, status_code=400)
    except Exception as e:
        raise _client_safe_error("Instant conditions error", e)
