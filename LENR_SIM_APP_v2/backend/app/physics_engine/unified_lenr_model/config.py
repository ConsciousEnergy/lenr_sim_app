"""
SimulationConfig, MaterialProperties, ReactantProperties and related dataclasses
for the Unified LENR Model.
"""

from typing import Dict, Any, Optional, List
from dataclasses import dataclass, field
from enum import Enum
import numpy as np
from scipy import constants as const

H2_WORK_FUNCTION_EV = 4.5
DEFAULT_DELTA_V_FALLBACK_V = 0.1
N_REF_M3 = 1e28


def get_material_work_function(material_name: str) -> float:
    """Work function in eV. Lithium ~2.9 eV. Generic fallback 5.0 eV."""
    lookup = {
        "palladium": 5.12,
        "nickel": 5.15,
        "titanium": 4.33,
        "lithium": 2.9,
    }
    return lookup.get((material_name or "").strip().lower(), 5.0)


def get_double_layer_potential(material, electron_density: float, T: float) -> float:
    """Double-layer potential (V). Uses work function from MaterialProperties or lookup."""
    if hasattr(material, "work_function"):
        phi_M = float(material.work_function)
    else:
        phi_M = get_material_work_function(str(material))  # includes Li, generic fallback
    delta_V = phi_M - H2_WORK_FUNCTION_EV
    try:
        if electron_density > 0 and T > 0 and N_REF_M3 > 0:
            delta_V += (const.k / const.e) * T * np.log(electron_density / N_REF_M3)
    except (ValueError, FloatingPointError):
        pass
    if not np.isfinite(delta_V) or delta_V <= 0:
        delta_V = DEFAULT_DELTA_V_FALLBACK_V
    return float(delta_V)


class MaterialSystem(Enum):
    PALLADIUM_DEUTERIUM = "pd_d"
    NICKEL_HYDROGEN = "ni_h"
    TITANIUM_DEUTERIUM = "ti_d"
    CUSTOM = "custom"


@dataclass
class MaterialProperties:
    name: str
    atomic_number: int
    atomic_mass: float
    lattice_constant: float
    debye_temperature: float
    work_function: float
    electron_density: float

    @classmethod
    def palladium(cls) -> "MaterialProperties":
        return cls(name="Palladium", atomic_number=46, atomic_mass=106.42,
            lattice_constant=3.89e-10, debye_temperature=274, work_function=5.12,
            electron_density=6.8e28)

    @classmethod
    def nickel(cls) -> "MaterialProperties":
        return cls(name="Nickel", atomic_number=28, atomic_mass=58.69,
            lattice_constant=3.52e-10, debye_temperature=450, work_function=5.15,
            electron_density=9.1e28)

    @classmethod
    def titanium(cls) -> "MaterialProperties":
        return cls(name="Titanium", atomic_number=22, atomic_mass=47.87,
            lattice_constant=2.95e-10, debye_temperature=420, work_function=4.33,
            electron_density=5.7e28)

    @classmethod
    def lithium(cls) -> "MaterialProperties":
        return cls(name="Lithium", atomic_number=3, atomic_mass=6.94,
            lattice_constant=3.51e-10, debye_temperature=344, work_function=2.9,
            electron_density=4.7e28)

    @classmethod
    def generic(cls, material_name: str) -> "MaterialProperties":
        """Generic/custom material using work-function lookup. Unknown materials fallback to 5.0 eV."""
        name = (material_name or "custom").strip()
        if not name:
            name = "custom"
        wf = get_material_work_function(name)
        return cls(name=name.title(), atomic_number=46, atomic_mass=106.42,
            lattice_constant=3.89e-10, debye_temperature=274, work_function=wf,
            electron_density=6.8e28)


@dataclass
class ReactantProperties:
    name: str
    atomic_number: int
    atomic_mass: float
    is_isotope: bool = False

    @classmethod
    def deuterium(cls) -> "ReactantProperties":
        return cls(name="Deuterium", atomic_number=1, atomic_mass=2.014, is_isotope=True)

    @classmethod
    def hydrogen(cls) -> "ReactantProperties":
        return cls(name="Hydrogen", atomic_number=1, atomic_mass=1.008, is_isotope=False)

    @classmethod
    def proton(cls) -> "ReactantProperties":
        return cls(name="Proton", atomic_number=1, atomic_mass=1.007, is_isotope=False)


@dataclass
class SimulationConfig:
    host_material: MaterialProperties = field(default_factory=MaterialProperties.palladium)
    reactant: ReactantProperties = field(default_factory=ReactantProperties.deuterium)
    temperature: float = 300.0
    pressure: float = 101325.0
    electric_field: float = 1e6
    loading_ratio: float = 0.9
    defect_density: float = 1e16
    grain_size: float = 50e-9
    surface_roughness: float = 5e-9
    enable_screening: bool = True
    enable_qed: bool = True
    enable_casimir: bool = True
    enable_coherence: bool = True
    enable_bubble_dynamics: bool = True
    enable_rydberg: bool = True
    use_theory_pipeline: bool = False
    enabled_theories: Optional[List[str]] = None
    theory_configs: Optional[Dict[str, Dict[str, Any]]] = None
    time_steps: int = 100
    total_time: float = 10.0
    random_seed: Optional[int] = None


@dataclass
class EnhancementResult:
    name: str
    value: float
    threshold_met: bool
    equation: str
    parameters: Dict[str, float]
    category: str


@dataclass
class UnifiedSimulationResult:
    total_enhancement: float
    enhancement_breakdown: List[EnhancementResult]
    excess_heat_watts: float
    tunneling_probability: float
    reaction_rate: float
    helium4_rate: float
    neutron_rate: float
    thresholds_met: Dict[str, bool]
    time_points: List[float]
    heat_output: List[float]
    enhancement_history: List[float]
    confidence: float
    config: SimulationConfig
    computation_time: float