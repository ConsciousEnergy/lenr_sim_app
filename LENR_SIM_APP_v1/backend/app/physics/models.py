"""
Physics model classes for LENR simulations based on the Unified LENR Theory
"""

from typing import Dict, Any, Optional, List
from dataclasses import dataclass
from pydantic import BaseModel
import numpy as np


@dataclass
class FusionEnhancementFactors:
    """
    Class to hold enhancement factors for fusion calculations
    based on the Unified LENR Theory framework
    """
    # Primary enhancement mechanisms
    rydberg_matter: float = 1.0  # Rydberg Matter enhancement
    electron_screening: float = 1.0  # Electron screening effects
    interface_field: float = 1.0  # Interface electric field enhancement
    coherent_tunneling: float = 1.0  # Coherent tunneling effects
    
    # Secondary enhancement mechanisms
    casimir_force: float = 1.0  # Casimir force enhancements
    shock_confinement: float = 1.0  # Bubble collapse and shock-induced enhancements
    dislocation_energy: float = 1.0  # Energy localization at dislocations
    oppenheimer_phillips: float = 1.0  # O-P process enhancement
    double_layer_qed: float = 1.0  # QED effects at interfaces
    
    # Legacy factors (maintained for backward compatibility)
    proximity: float = 1.0
    screening: float = 1.0
    fluctuation: float = 1.0
    resonance: float = 1.0
    quantum: float = 1.0
    
    # Aggregated values
    total: float = 1.0
    log_enhancement: float = 0.0
    
    def calculate_total(self) -> float:
        """Calculate total enhancement from all mechanisms"""
        # Primary mechanisms have multiplicative effects
        primary = (self.rydberg_matter * 
                  self.electron_screening * 
                  self.interface_field * 
                  self.coherent_tunneling)
        
        # Secondary mechanisms also contribute multiplicatively
        secondary = (self.casimir_force * 
                    self.shock_confinement * 
                    self.dislocation_energy * 
                    self.oppenheimer_phillips * 
                    self.double_layer_qed)
        
        # Legacy factors (included for backward compatibility)
        legacy = (self.proximity * 
                 self.screening * 
                 self.fluctuation * 
                 self.resonance * 
                 self.quantum)
        
        # Calculate total enhancement
        self.total = primary * secondary * legacy
        
        # Calculate log enhancement for easier representation
        if self.total > 0:
            self.log_enhancement = float(np.log10(self.total))
        else:
            self.log_enhancement = 0.0
            
        return self.total
    
    def to_dict(self) -> Dict[str, float]:
        """Convert to dictionary for API responses"""
        return {
            # Primary mechanisms
            "rydberg_matter": self.rydberg_matter,
            "electron_screening": self.electron_screening,
            "interface_field": self.interface_field,
            "coherent_tunneling": self.coherent_tunneling,
            
            # Secondary mechanisms
            "casimir_force": self.casimir_force,
            "shock_confinement": self.shock_confinement,
            "dislocation_energy": self.dislocation_energy,
            "oppenheimer_phillips": self.oppenheimer_phillips,
            "double_layer_qed": self.double_layer_qed,
            
            # Legacy factors
            "proximity": self.proximity,
            "screening": self.screening,
            "fluctuation": self.fluctuation,
            "resonance": self.resonance,
            "quantum": self.quantum,
            
            # Aggregated values
            "total": self.total,
            "log_enhancement": self.log_enhancement
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, float]) -> 'FusionEnhancementFactors':
        """Create instance from dictionary"""
        return cls(
            # Primary mechanisms
            rydberg_matter=data.get("rydberg_matter", 1.0),
            electron_screening=data.get("electron_screening", 1.0),
            interface_field=data.get("interface_field", 1.0),
            coherent_tunneling=data.get("coherent_tunneling", 1.0),
            
            # Secondary mechanisms
            casimir_force=data.get("casimir_force", 1.0),
            shock_confinement=data.get("shock_confinement", 1.0),
            dislocation_energy=data.get("dislocation_energy", 1.0),
            oppenheimer_phillips=data.get("oppenheimer_phillips", 1.0),
            double_layer_qed=data.get("double_layer_qed", 1.0),
            
            # Legacy factors
            proximity=data.get("proximity", 1.0),
            screening=data.get("screening", 1.0),
            fluctuation=data.get("fluctuation", 1.0),
            resonance=data.get("resonance", 1.0),
            quantum=data.get("quantum", 1.0),
            
            # Aggregated values
            total=data.get("total", 1.0),
            log_enhancement=data.get("log_enhancement", 0.0)
        )


@dataclass
class ReactionConditions:
    """
    Describes the necessary conditions for LENR reactions
    based on the Unified LENR Theory
    """
    loading_ratio: float = 0.0  # H/Pd or H/Ni ratio
    surface_roughness: float = 0.0  # Surface roughness in nm
    defect_density: float = 0.0  # Defects per cm³
    field_strength: float = 0.0  # Local electric field in V/m
    coherence_length: float = 0.0  # Quantum coherence length in nm
    
    def meets_threshold(self) -> bool:
        """Check if conditions meet LENR thresholds"""
        # Thresholds identified in the paper
        loading_threshold = 0.9  # H/Pd > 0.90 or H/Ni > 0.85
        roughness_threshold = 10.0  # < 10 nm
        defect_threshold = 1e10  # > 10^10 /cm³
        field_threshold = 1e8  # > 10^8 V/m
        
        return (self.loading_ratio > loading_threshold and
                self.surface_roughness < roughness_threshold and
                self.defect_density > defect_threshold and
                self.field_strength > field_threshold)
                
    def to_dict(self) -> Dict[str, float]:
        """Convert to dictionary for API responses"""
        return {
            "loading_ratio": self.loading_ratio,
            "surface_roughness": self.surface_roughness,
            "defect_density": self.defect_density,
            "field_strength": self.field_strength,
            "coherence_length": self.coherence_length,
            "meets_threshold": self.meets_threshold()
        }


@dataclass
class FusionPathways:
    """
    Defines the relative probabilities of different fusion pathways
    based on the Unified LENR Theory
    """
    dd_neutron: float = 0.0  # D + D → ³He + n
    dd_proton: float = 0.0   # D + D → T + p
    dd_alpha: float = 0.0    # D + D → ⁴He (direct)
    op_process: float = 0.0  # Oppenheimer-Phillips stripping reactions
    transmutation: float = 0.0  # Various transmutation pathways
    
    def to_dict(self) -> Dict[str, float]:
        """Convert to dictionary for API responses"""
        return {
            "dd_neutron": self.dd_neutron,
            "dd_proton": self.dd_proton,
            "dd_alpha": self.dd_alpha,
            "op_process": self.op_process,
            "transmutation": self.transmutation
        }


@dataclass
class FusionReaction:
    """
    Class to represent a fusion reaction according to the Unified LENR Theory
    """
    name: str  # Reaction name (e.g., "D-D", "H-Ni", "D-Pd")
    reactants: List[str] = None  # List of reactants
    products: List[str] = None  # List of potential products
    q_value: float = 0.0  # Energy release in MeV
    cross_section_base: float = 0.0  # Base cross-section in barns
    activation_energy: float = 0.0  # Activation energy in eV
    enhancement_factors: Optional[FusionEnhancementFactors] = None  # Enhancement factors
    pathways: Optional[FusionPathways] = None  # Reaction pathways
    
    # Additional parameters for detailed reaction specification
    reactant1_z: int = 0  # Atomic number of first reactant
    reactant1_a: int = 0  # Mass number of first reactant
    reactant2_z: int = 0  # Atomic number of second reactant
    reactant2_a: int = 0  # Mass number of second reactant
    products_detail: List[Dict[str, Any]] = None  # Detailed product information including branching ratios
    
    def __post_init__(self):
        """Initialize default objects and lists if None"""
        if self.enhancement_factors is None:
            self.enhancement_factors = FusionEnhancementFactors()
        if self.pathways is None:
            self.pathways = FusionPathways()
        if self.reactants is None:
            self.reactants = []
        if self.products is None:
            self.products = []
        if self.products_detail is None:
            self.products_detail = []
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API responses"""
        return {
            "name": self.name,
            "reactants": self.reactants,
            "products": self.products,
            "q_value": self.q_value,
            "cross_section_base": self.cross_section_base,
            "activation_energy": self.activation_energy,
            "reactant1_z": self.reactant1_z,
            "reactant1_a": self.reactant1_a,
            "reactant2_z": self.reactant2_z,
            "reactant2_a": self.reactant2_a,
            "products_detail": self.products_detail,
            "enhancement_factors": self.enhancement_factors.to_dict() if self.enhancement_factors else None,
            "pathways": self.pathways.to_dict() if self.pathways else None
        } 