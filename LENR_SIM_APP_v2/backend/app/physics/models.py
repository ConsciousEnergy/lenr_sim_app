"""
Physics model classes for LENR simulations based on the Unified LENR Theory
"""

from typing import Dict, Any, Optional, List, Tuple, Union
from dataclasses import dataclass, field
from pydantic import BaseModel, Field, field_validator, model_validator
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


class FusionProduct(BaseModel):
    """Model for a fusion reaction product"""
    name: str = Field(..., description="Name of the product particle")
    z: int = Field(..., description="Atomic number of the product")
    a: int = Field(..., description="Mass number of the product")
    branch_ratio: float = Field(..., description="Branching ratio for this product")
    
    @field_validator('branch_ratio')
    @classmethod
    def validate_branch_ratio(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("Branch ratio must be positive")
        return v


class FusionReaction(BaseModel):
    """Model for a fusion reaction with validation"""
    name: str = Field(..., description="Unique name of the reaction")
    reactant1_z: int = Field(..., description="Atomic number of first reactant")
    reactant1_a: int = Field(..., description="Mass number of first reactant")
    reactant2_z: int = Field(..., description="Atomic number of second reactant")
    reactant2_a: int = Field(..., description="Mass number of second reactant")
    products: List[FusionProduct] = Field(..., description="List of reaction products")
    q_value: float = Field(..., description="Energy release in MeV")
    
    @field_validator('reactant1_z', 'reactant2_z')
    @classmethod
    def validate_atomic_numbers(cls, v: int) -> int:
        if v < 0:
            raise ValueError("Atomic number must be non-negative")
        return v
        
    @field_validator('reactant1_a', 'reactant2_a')
    @classmethod
    def validate_mass_numbers(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("Mass number must be positive")
        return v
        
    @field_validator('q_value')
    @classmethod
    def validate_q_value(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("Q-value must be positive")
        return v
        
    @model_validator(mode='after')
    def validate_products(self) -> 'FusionReaction':
        """Validate conservation laws for the reaction products"""
        if not self.products:
            raise ValueError("Must have at least one product")
            
        # Get reactant values
        reactant1_z = self.reactant1_z
        reactant1_a = self.reactant1_a
        reactant2_z = self.reactant2_z
        reactant2_a = self.reactant2_a
        
        if all(x is not None for x in [reactant1_z, reactant1_a, reactant2_z, reactant2_a]):
            # Check charge conservation
            total_z_in = reactant1_z + reactant2_z
            total_z_out = sum(p.z * p.branch_ratio for p in self.products)
            if abs(total_z_in - total_z_out) > 1e-10:
                raise ValueError("Charge is not conserved in reaction")
                
            # Check mass number conservation
            total_a_in = reactant1_a + reactant2_a
            total_a_out = sum(p.a * p.branch_ratio for p in self.products)
            if abs(total_a_in - total_a_out) > 1e-10:
                raise ValueError("Mass number is not conserved in reaction")
                
        return self
        
    def to_dict(self) -> Dict[str, Any]:
        """Convert reaction to dictionary format"""
        return {
            "name": self.name,
            "reactant1": {
                "z": self.reactant1_z,
                "a": self.reactant1_a
            },
            "reactant2": {
                "z": self.reactant2_z,
                "a": self.reactant2_a
            },
            "products": [
                {
                    "name": p.name,
                    "z": p.z,
                    "a": p.a,
                    "branch_ratio": p.branch_ratio
                }
                for p in self.products
            ],
            "q_value": self.q_value
        }
        
    def get_reduced_mass(self) -> float:
        """Calculate reduced mass of the reactants in atomic mass units"""
        mass1 = self.reactant1_a  # Approximate mass in amu
        mass2 = self.reactant2_a  # Approximate mass in amu
        return (mass1 * mass2) / (mass1 + mass2)
        
    def get_coulomb_barrier(self) -> float:
        """Calculate classical Coulomb barrier in MeV"""
        # Conversion factor from e^2/r to MeV
        e2_to_mev = 1.44  # MeV·fm
        
        # Approximate nuclear radius in fm
        r1 = 1.2 * pow(self.reactant1_a, 1/3)
        r2 = 1.2 * pow(self.reactant2_a, 1/3)
        
        # Classical Coulomb barrier
        return e2_to_mev * self.reactant1_z * self.reactant2_z / (r1 + r2) 