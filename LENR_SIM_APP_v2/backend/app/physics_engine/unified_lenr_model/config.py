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
        "graphite": 4.6,  # polycrystalline graphite; CRC handbook
        "carbon": 4.6,
        "silicon_carbide": 4.6,  # 4H/3C-SiC typical; model assumption band
        "zirconium": 4.05,
        "iridium": 5.27,
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
    def graphite(cls) -> "MaterialProperties":
        # In-plane a = 2.46 Å; n from graphite density 2.26 g cm^-3 (model assumption
        # for π-electron screening, not a metal-like free-electron gas).
        return cls(name="Graphite", atomic_number=6, atomic_mass=12.011,
            lattice_constant=2.46e-10, debye_temperature=413, work_function=4.6,
            electron_density=1.13e29)

    @classmethod
    def silicon_carbide(cls) -> "MaterialProperties":
        # 3C-SiC a = 4.36 Å; Debye ~1200 K. Electron density is a valence estimate
        # (model assumption), labelled cross-regime for LENR rates.
        return cls(name="Silicon Carbide", atomic_number=14, atomic_mass=40.1,
            lattice_constant=4.36e-10, debye_temperature=1200, work_function=4.6,
            electron_density=9.6e28)

    @classmethod
    def zirconium(cls) -> "MaterialProperties":
        return cls(name="Zirconium", atomic_number=40, atomic_mass=91.224,
            lattice_constant=3.23e-10, debye_temperature=291, work_function=4.05,
            electron_density=4.3e28)

    @classmethod
    def from_name(cls, material_name: str) -> "MaterialProperties":
        """Resolve a host key to cited properties; unknown names use generic()."""
        key = (material_name or "palladium").strip().lower()
        aliases = {"carbon": "graphite", "sic": "silicon_carbide", "zr": "zirconium"}
        key = aliases.get(key, key)
        factories = {
            "palladium": cls.palladium,
            "nickel": cls.nickel,
            "titanium": cls.titanium,
            "lithium": cls.lithium,
            "graphite": cls.graphite,
            "silicon_carbide": cls.silicon_carbide,
            "zirconium": cls.zirconium,
        }
        factory = factories.get(key)
        if factory is not None:
            return factory()
        return cls.generic(material_name)

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
    electrolyte_family: str = "li"
    electrolyte_species: str = "lioh"
    electrolyte_molarity_mol_l: float = 0.3
    # Additive ICCF-27 protocol fields (legacy None / False).
    beam_energy_kev: Optional[float] = None
    molecular_beam_species: Optional[str] = None
    h2_absorb_pressure_pa: Optional[float] = None
    radiant_calorimetry: bool = False


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
    uncertainty_interval: Dict[str, float]
    falsification_conditions: List[str]
    observables_bridge: Dict[str, Any]
    config: SimulationConfig
    computation_time: float