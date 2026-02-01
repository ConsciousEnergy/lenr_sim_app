"""
Simulation Presets Routes

Provides CRUD endpoints for managing simulation presets.
Presets store complete simulation configurations that can be
saved, loaded, shared, and used to reproduce experiments.

v0.2.2-beta: Initial implementation
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Dict, Any, Optional, List
from datetime import datetime
import uuid
import json
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/presets", tags=["presets"])


# =============================================================================
# Models
# =============================================================================

class SimulationPreset(BaseModel):
    """Complete simulation preset model."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str = Field(..., min_length=1, max_length=100)
    description: str = Field(default="", max_length=500)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Author/ownership
    author: str = Field(default="anonymous")
    is_builtin: bool = Field(default=False)
    is_public: bool = Field(default=True)
    
    # Simulation parameters
    host_material: str = Field(default="palladium")
    loading_ratio: float = Field(default=0.9, ge=0, le=1)
    
    # Bubble dynamics
    initial_bubble_radius: float = Field(default=10e-6, ge=1e-9, le=1e-3)
    driving_pressure: float = Field(default=1.5e5, ge=0)
    ambient_pressure: float = Field(default=101325, ge=0)
    frequency: float = Field(default=20e3, ge=100, le=1e9)
    
    # Physical conditions
    temperature: float = Field(default=300, ge=1, le=10000)
    electric_field: float = Field(default=1e8, ge=0)
    
    # Lattice parameters
    lattice_constant: float = Field(default=3.89e-10, ge=1e-12, le=1e-8)
    electron_density: float = Field(default=6.8e28, ge=1e20)
    debye_temperature: float = Field(default=275, ge=1)
    
    # Physics toggles
    enable_screening: bool = Field(default=True)
    enable_qed: bool = Field(default=True)
    enable_casimir: bool = Field(default=True)
    enable_coherence: bool = Field(default=True)
    
    # Visualization settings
    show_protons: bool = Field(default=True)
    show_field_lines: bool = Field(default=True)
    show_bubble: bool = Field(default=True)
    show_lattice: bool = Field(default=True)
    
    # Advanced parameters (JSON for flexibility)
    advanced_params: Dict[str, Any] = Field(default_factory=dict)
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class PresetCreate(BaseModel):
    """Schema for creating a new preset."""
    name: str = Field(..., min_length=1, max_length=100)
    description: str = Field(default="")
    author: str = Field(default="anonymous")
    
    host_material: str = Field(default="palladium")
    loading_ratio: float = Field(default=0.9)
    
    initial_bubble_radius: float = Field(default=10e-6)
    driving_pressure: float = Field(default=1.5e5)
    ambient_pressure: float = Field(default=101325)
    frequency: float = Field(default=20e3)
    
    temperature: float = Field(default=300)
    electric_field: float = Field(default=1e8)
    
    lattice_constant: float = Field(default=3.89e-10)
    electron_density: float = Field(default=6.8e28)
    debye_temperature: float = Field(default=275)
    
    enable_screening: bool = Field(default=True)
    enable_qed: bool = Field(default=True)
    enable_casimir: bool = Field(default=True)
    enable_coherence: bool = Field(default=True)
    
    show_protons: bool = Field(default=True)
    show_field_lines: bool = Field(default=True)
    show_bubble: bool = Field(default=True)
    show_lattice: bool = Field(default=True)
    
    advanced_params: Dict[str, Any] = Field(default_factory=dict)


class PresetUpdate(BaseModel):
    """Schema for updating a preset."""
    name: Optional[str] = None
    description: Optional[str] = None
    
    host_material: Optional[str] = None
    loading_ratio: Optional[float] = None
    
    initial_bubble_radius: Optional[float] = None
    driving_pressure: Optional[float] = None
    ambient_pressure: Optional[float] = None
    frequency: Optional[float] = None
    
    temperature: Optional[float] = None
    electric_field: Optional[float] = None
    
    lattice_constant: Optional[float] = None
    electron_density: Optional[float] = None
    debye_temperature: Optional[float] = None
    
    enable_screening: Optional[bool] = None
    enable_qed: Optional[bool] = None
    enable_casimir: Optional[bool] = None
    enable_coherence: Optional[bool] = None
    
    show_protons: Optional[bool] = None
    show_field_lines: Optional[bool] = None
    show_bubble: Optional[bool] = None
    show_lattice: Optional[bool] = None
    
    advanced_params: Optional[Dict[str, Any]] = None


class PresetListResponse(BaseModel):
    """Response for listing presets."""
    presets: List[SimulationPreset]
    total: int
    page: int
    page_size: int


# =============================================================================
# In-Memory Storage (would be database in production)
# =============================================================================

# Preset storage
_presets_db: Dict[str, SimulationPreset] = {}


def _initialize_default_presets():
    """Initialize built-in default presets."""
    global _presets_db
    
    # Fleischmann-Pons Classic (Pd/D)
    fp_classic = SimulationPreset(
        id="builtin-fleischmann-pons",
        name="Fleischmann-Pons Classic",
        description="Original Pd-D electrolysis conditions from the 1989 experiment. "
                    "Features high loading ratio and moderate temperature.",
        author="LENR Simulation Team",
        is_builtin=True,
        host_material="palladium",
        loading_ratio=0.9,
        initial_bubble_radius=10e-6,
        driving_pressure=1.5e5,
        ambient_pressure=101325,
        frequency=20e3,
        temperature=330,
        electric_field=1e8,
        lattice_constant=3.89e-10,
        electron_density=6.8e28,
        debye_temperature=275,
        enable_screening=True,
        enable_qed=True,
        enable_casimir=True,
        enable_coherence=True,
        advanced_params={
            "screening_energy_ev": 310,
            "work_function_ev": 5.12
        }
    )
    
    # Ni-H System (Rossi-type)
    nih_system = SimulationPreset(
        id="builtin-nih-system",
        name="Ni-H System",
        description="Nickel-Hydrogen system similar to Rossi E-Cat conditions. "
                    "Higher temperature with hydrogen instead of deuterium.",
        author="LENR Simulation Team",
        is_builtin=True,
        host_material="nickel",
        loading_ratio=0.85,
        initial_bubble_radius=8e-6,
        driving_pressure=2e5,
        ambient_pressure=101325,
        frequency=25e3,
        temperature=500,
        electric_field=5e7,
        lattice_constant=3.52e-10,
        electron_density=9.1e28,
        debye_temperature=450,
        enable_screening=True,
        enable_qed=True,
        enable_casimir=True,
        enable_coherence=True,
        advanced_params={
            "screening_energy_ev": 200,
            "work_function_ev": 5.15,
            "use_hydrogen": True
        }
    )
    
    # High Frequency Collapse
    high_freq = SimulationPreset(
        id="builtin-high-frequency",
        name="High Frequency Collapse",
        description="Sonofusion-style high frequency acoustic driving. "
                    "Achieves rapid bubble cycling for maximum enhancement.",
        author="LENR Simulation Team",
        is_builtin=True,
        host_material="palladium",
        loading_ratio=0.88,
        initial_bubble_radius=5e-6,
        driving_pressure=3e5,
        ambient_pressure=101325,
        frequency=50e3,
        temperature=350,
        electric_field=2e8,
        lattice_constant=3.89e-10,
        electron_density=6.8e28,
        debye_temperature=275,
        enable_screening=True,
        enable_qed=True,
        enable_casimir=True,
        enable_coherence=True,
        advanced_params={
            "collapse_speed_factor": 1.5,
            "multi_bubble": False
        }
    )
    
    # Maximum Enhancement
    max_enhancement = SimulationPreset(
        id="builtin-max-enhancement",
        name="Maximum Enhancement",
        description="Optimized parameters for maximum tunneling enhancement. "
                    "Theoretical best-case scenario for demonstration.",
        author="LENR Simulation Team",
        is_builtin=True,
        host_material="palladium",
        loading_ratio=0.95,
        initial_bubble_radius=12e-6,
        driving_pressure=2.5e5,
        ambient_pressure=80000,  # Reduced ambient
        frequency=30e3,
        temperature=280,  # Slightly cooler for coherence
        electric_field=3e8,
        lattice_constant=3.89e-10,
        electron_density=8e28,  # Enhanced density
        debye_temperature=275,
        enable_screening=True,
        enable_qed=True,
        enable_casimir=True,
        enable_coherence=True,
        advanced_params={
            "coherence_factor": 0.8,
            "screening_energy_ev": 400,
            "optimized": True
        }
    )
    
    # Titanium-Deuterium System
    tid_system = SimulationPreset(
        id="builtin-tid-system",
        name="Titanium-Deuterium",
        description="Titanium host lattice with deuterium loading. "
                    "Alternative material system for comparative studies.",
        author="LENR Simulation Team",
        is_builtin=True,
        host_material="titanium",
        loading_ratio=0.8,
        initial_bubble_radius=10e-6,
        driving_pressure=1.5e5,
        ambient_pressure=101325,
        frequency=20e3,
        temperature=320,
        electric_field=8e7,
        lattice_constant=2.95e-10,
        electron_density=3.8e28,
        debye_temperature=420,
        enable_screening=True,
        enable_qed=True,
        enable_casimir=True,
        enable_coherence=True,
        advanced_params={
            "screening_energy_ev": 65,
            "work_function_ev": 4.33
        }
    )
    
    # Store built-in presets
    _presets_db[fp_classic.id] = fp_classic
    _presets_db[nih_system.id] = nih_system
    _presets_db[high_freq.id] = high_freq
    _presets_db[max_enhancement.id] = max_enhancement
    _presets_db[tid_system.id] = tid_system
    
    logger.info(f"Initialized {len(_presets_db)} default presets")


# Initialize on module load
_initialize_default_presets()


# =============================================================================
# Routes
# =============================================================================

@router.get("/", response_model=PresetListResponse)
async def list_presets(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    include_builtin: bool = Query(True),
    search: Optional[str] = Query(None)
):
    """
    List all available presets with pagination.
    
    - **page**: Page number (1-indexed)
    - **page_size**: Number of items per page
    - **include_builtin**: Whether to include built-in presets
    - **search**: Optional search string for name/description
    """
    presets = list(_presets_db.values())
    
    # Filter by builtin flag
    if not include_builtin:
        presets = [p for p in presets if not p.is_builtin]
    
    # Search filter
    if search:
        search_lower = search.lower()
        presets = [
            p for p in presets
            if search_lower in p.name.lower() or search_lower in p.description.lower()
        ]
    
    # Sort by name
    presets.sort(key=lambda p: (not p.is_builtin, p.name.lower()))
    
    # Pagination
    total = len(presets)
    start = (page - 1) * page_size
    end = start + page_size
    paginated = presets[start:end]
    
    return PresetListResponse(
        presets=paginated,
        total=total,
        page=page,
        page_size=page_size
    )


@router.get("/{preset_id}", response_model=SimulationPreset)
async def get_preset(preset_id: str):
    """
    Get a specific preset by ID.
    """
    preset = _presets_db.get(preset_id)
    if not preset:
        raise HTTPException(status_code=404, detail=f"Preset {preset_id} not found")
    return preset


@router.post("/", response_model=SimulationPreset, status_code=201)
async def create_preset(preset_data: PresetCreate):
    """
    Create a new simulation preset.
    """
    preset = SimulationPreset(
        **preset_data.model_dump(),
        is_builtin=False,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    
    _presets_db[preset.id] = preset
    logger.info(f"Created preset: {preset.id} - {preset.name}")
    
    return preset


@router.put("/{preset_id}", response_model=SimulationPreset)
async def update_preset(preset_id: str, update_data: PresetUpdate):
    """
    Update an existing preset.
    
    Built-in presets cannot be modified.
    """
    preset = _presets_db.get(preset_id)
    if not preset:
        raise HTTPException(status_code=404, detail=f"Preset {preset_id} not found")
    
    if preset.is_builtin:
        raise HTTPException(
            status_code=403,
            detail="Built-in presets cannot be modified. Create a copy instead."
        )
    
    # Update only provided fields
    update_dict = update_data.model_dump(exclude_unset=True)
    for field, value in update_dict.items():
        setattr(preset, field, value)
    
    preset.updated_at = datetime.utcnow()
    _presets_db[preset_id] = preset
    
    logger.info(f"Updated preset: {preset_id}")
    return preset


@router.delete("/{preset_id}", status_code=204)
async def delete_preset(preset_id: str):
    """
    Delete a preset.
    
    Built-in presets cannot be deleted.
    """
    preset = _presets_db.get(preset_id)
    if not preset:
        raise HTTPException(status_code=404, detail=f"Preset {preset_id} not found")
    
    if preset.is_builtin:
        raise HTTPException(
            status_code=403,
            detail="Built-in presets cannot be deleted."
        )
    
    del _presets_db[preset_id]
    logger.info(f"Deleted preset: {preset_id}")


@router.post("/{preset_id}/duplicate", response_model=SimulationPreset, status_code=201)
async def duplicate_preset(preset_id: str, new_name: Optional[str] = Query(None)):
    """
    Create a copy of an existing preset.
    
    Useful for customizing built-in presets.
    """
    original = _presets_db.get(preset_id)
    if not original:
        raise HTTPException(status_code=404, detail=f"Preset {preset_id} not found")
    
    # Create copy with new ID
    copy_data = original.model_dump()
    copy_data["id"] = str(uuid.uuid4())
    copy_data["name"] = new_name or f"{original.name} (Copy)"
    copy_data["is_builtin"] = False
    copy_data["created_at"] = datetime.utcnow()
    copy_data["updated_at"] = datetime.utcnow()
    
    copy = SimulationPreset(**copy_data)
    _presets_db[copy.id] = copy
    
    logger.info(f"Duplicated preset {preset_id} to {copy.id}")
    return copy


@router.post("/import", response_model=SimulationPreset, status_code=201)
async def import_preset(preset_json: Dict[str, Any]):
    """
    Import a preset from JSON.
    """
    try:
        # Remove system fields that shouldn't be imported
        preset_json.pop("id", None)
        preset_json.pop("is_builtin", None)
        preset_json.pop("created_at", None)
        preset_json.pop("updated_at", None)
        
        preset = SimulationPreset(
            **preset_json,
            is_builtin=False,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        _presets_db[preset.id] = preset
        logger.info(f"Imported preset: {preset.id}")
        
        return preset
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid preset data: {str(e)}")


@router.get("/{preset_id}/export")
async def export_preset(preset_id: str):
    """
    Export a preset as JSON for sharing.
    """
    preset = _presets_db.get(preset_id)
    if not preset:
        raise HTTPException(status_code=404, detail=f"Preset {preset_id} not found")
    
    # Export without system fields
    export_data = preset.model_dump()
    export_data.pop("id", None)
    export_data.pop("is_builtin", None)
    
    return export_data


@router.get("/builtin/list", response_model=List[SimulationPreset])
async def list_builtin_presets():
    """
    List only built-in presets.
    """
    return [p for p in _presets_db.values() if p.is_builtin]
