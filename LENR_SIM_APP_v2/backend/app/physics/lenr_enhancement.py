"""
LENR Multi-Physics Enhancement Engine
======================================

This module implements various enhancement mechanisms proposed for
Low Energy Nuclear Reactions (LENR). These include:

1. Electron Screening Enhancement
2. Phonon-Assisted Tunneling (Oppenheimer-Phillips effect)
3. Heavy Electron / Electron Mass Enhancement
4. Coherent Multi-Body Effects
5. Loading Ratio Enhancement
6. Defect and Nanostructure Enhancement
7. Electromagnetic Field Enhancement

Note: Many of these mechanisms are theoretical and debated in the scientific
community. This implementation provides computational tools for exploring
these hypotheses.
"""

import numpy as np
from typing import Dict, Tuple, Optional, Any, List
from dataclasses import dataclass, field
from enum import Enum

from .core_constants import (
    HBAR, E_CHARGE, EPSILON_0, K_BOLTZMANN, M_ELECTRON, M_PROTON, M_DEUTERON,
    KEV_TO_J, EV_TO_J, A_BOHR, AMU, ALPHA,
    SCREENING_POTENTIALS, MATERIALS, MaterialProperties,
    reduced_mass, sommerfeld_parameter, thermal_energy
)


class EnhancementMechanism(Enum):
    """Available enhancement mechanisms."""
    ELECTRON_SCREENING = "electron_screening"
    PHONON_ASSISTED = "phonon_assisted"
    HEAVY_ELECTRON = "heavy_electron"
    COHERENT_MULTI_BODY = "coherent_multi_body"
    LOADING_RATIO = "loading_ratio"
    DEFECT_ENHANCEMENT = "defect_enhancement"
    EM_FIELD = "electromagnetic_field"


@dataclass
class EnhancementResult:
    """Result of enhancement factor calculation."""
    total_enhancement: float
    individual_factors: Dict[str, float]
    parameters: Dict[str, Any]
    dominant_mechanism: str
    warnings: List[str] = field(default_factory=list)


@dataclass
class LENRConditions:
    """Environmental conditions for LENR calculation."""
    temperature_k: float = 300.0
    pressure_atm: float = 1.0
    loading_ratio: float = 0.8  # H/M ratio
    defect_density: float = 0.01  # Fraction
    magnetic_field_t: float = 0.0  # Tesla
    electric_field_v_m: float = 0.0  # V/m
    current_density_a_cm2: float = 0.0  # A/cm²
    material: str = "palladium"
    nanoparticle_size_nm: float = 0.0  # 0 = bulk


class LENREnhancementCalculator:
    """
    Calculator for LENR enhancement factors.
    
    This class computes various enhancement mechanisms that may
    contribute to increased reaction rates in LENR systems.
    """
    
    def __init__(self):
        """Initialize the LENR enhancement calculator."""
        self.mechanism_calculators = {
            EnhancementMechanism.ELECTRON_SCREENING: self._calc_electron_screening,
            EnhancementMechanism.PHONON_ASSISTED: self._calc_phonon_assisted,
            EnhancementMechanism.HEAVY_ELECTRON: self._calc_heavy_electron,
            EnhancementMechanism.COHERENT_MULTI_BODY: self._calc_coherent_multi_body,
            EnhancementMechanism.LOADING_RATIO: self._calc_loading_ratio,
            EnhancementMechanism.DEFECT_ENHANCEMENT: self._calc_defect_enhancement,
            EnhancementMechanism.EM_FIELD: self._calc_em_field_enhancement,
        }
    
    def calculate_total_enhancement(
        self,
        energy_kev: float,
        conditions: LENRConditions,
        z1: int = 1,
        z2: int = 1,
        mechanisms: Optional[List[EnhancementMechanism]] = None
    ) -> EnhancementResult:
        """
        Calculate total enhancement factor from all mechanisms.
        
        Args:
            energy_kev: Collision energy in keV
            conditions: LENR environmental conditions
            z1: Charge number of particle 1
            z2: Charge number of particle 2
            mechanisms: List of mechanisms to include (None = all)
            
        Returns:
            EnhancementResult with total and individual factors
        """
        if mechanisms is None:
            mechanisms = list(EnhancementMechanism)
        
        individual_factors = {}
        warnings = []
        total = 1.0
        
        for mechanism in mechanisms:
            try:
                factor = self.mechanism_calculators[mechanism](
                    energy_kev, conditions, z1, z2
                )
                # Cap extreme values
                factor = min(max(factor, 1e-10), 1e20)
                individual_factors[mechanism.value] = factor
                total *= factor
            except Exception as e:
                warnings.append(f"{mechanism.value}: {str(e)}")
                individual_factors[mechanism.value] = 1.0
        
        # Find dominant mechanism
        dominant = max(individual_factors, key=individual_factors.get)
        
        return EnhancementResult(
            total_enhancement=total,
            individual_factors=individual_factors,
            parameters={
                "energy_kev": energy_kev,
                "temperature_k": conditions.temperature_k,
                "loading_ratio": conditions.loading_ratio,
                "material": conditions.material,
            },
            dominant_mechanism=dominant,
            warnings=warnings
        )
    
    def _calc_electron_screening(
        self,
        energy_kev: float,
        conditions: LENRConditions,
        z1: int,
        z2: int
    ) -> float:
        """
        Calculate electron screening enhancement.
        
        In a metal lattice, conduction electrons screen the nuclear
        charges, effectively reducing the Coulomb barrier.
        
        Enhancement = exp(π * η * U_e / E)
        
        where U_e is the screening potential.
        """
        if energy_kev <= 0:
            return 1.0
        
        # Get screening potential for material
        material_data = MATERIALS.get(conditions.material)
        if material_data:
            screening_ev = material_data.screening_potential
        else:
            screening_ev = SCREENING_POTENTIALS.get(conditions.material, 400)
        
        # Convert to keV
        screening_kev = screening_ev / 1000.0
        
        # Calculate reduced mass
        mu = reduced_mass(M_DEUTERON, M_DEUTERON)
        
        # Sommerfeld parameter
        eta = sommerfeld_parameter(z1, z2, energy_kev, mu)
        
        # Enhancement factor
        enhancement = np.exp(np.pi * eta * screening_kev / energy_kev)
        
        return min(enhancement, 1e15)  # Cap at reasonable value
    
    def _calc_phonon_assisted(
        self,
        energy_kev: float,
        conditions: LENRConditions,
        z1: int,
        z2: int
    ) -> float:
        """
        Calculate phonon-assisted tunneling enhancement.
        
        Lattice phonons can provide additional energy to assist
        tunneling through the Coulomb barrier.
        
        This is related to the Oppenheimer-Phillips process.
        """
        # Get Debye temperature for material
        material_data = MATERIALS.get(conditions.material)
        if material_data:
            debye_temp = material_data.debye_temperature
        else:
            debye_temp = 300.0  # Default
        
        T = conditions.temperature_k
        
        if T <= 0:
            return 1.0
        
        # Average phonon energy
        phonon_energy_j = K_BOLTZMANN * debye_temp
        phonon_energy_kev = phonon_energy_j / KEV_TO_J
        
        # Enhancement factor based on phonon population
        # n_phonon = 1 / (exp(ℏω/kT) - 1)
        x = debye_temp / T
        if x > 50:
            n_phonon = np.exp(-x)
        else:
            n_phonon = 1.0 / (np.exp(x) - 1)
        
        # Multiple phonon contribution
        # Enhancement scales with available phonon energy
        energy_boost_ratio = phonon_energy_kev / max(energy_kev, 0.001)
        
        enhancement = 1.0 + n_phonon * energy_boost_ratio * 0.1
        
        return max(enhancement, 1.0)
    
    def _calc_heavy_electron(
        self,
        energy_kev: float,
        conditions: LENRConditions,
        z1: int,
        z2: int
    ) -> float:
        """
        Calculate heavy electron enhancement.
        
        In certain condensed matter systems, electron effective mass
        can be enhanced (heavy fermion systems), which modifies
        screening properties.
        
        This is a theoretical mechanism proposed by some LENR researchers.
        """
        # Base electron mass ratio
        # In heavy fermion systems, m* can be 10-1000 times m_e
        
        material_data = MATERIALS.get(conditions.material)
        if material_data:
            # Estimate mass enhancement from Fermi energy
            # Higher Fermi energy typically means less enhancement
            fermi_ev = material_data.fermi_energy
            # Simple model: enhancement inversely related to Fermi energy
            mass_ratio = max(1.0, 10.0 / fermi_ev)
        else:
            mass_ratio = 1.0
        
        # Enhancement scales with sqrt of mass ratio for screening
        enhancement = np.sqrt(mass_ratio)
        
        return max(enhancement, 1.0)
    
    def _calc_coherent_multi_body(
        self,
        energy_kev: float,
        conditions: LENRConditions,
        z1: int,
        z2: int
    ) -> float:
        """
        Calculate coherent multi-body enhancement.
        
        In a crystal lattice with high loading, coherent effects
        between multiple hydrogen atoms may enhance reaction rates.
        
        This is one of the more speculative enhancement mechanisms.
        """
        loading = conditions.loading_ratio
        
        if loading < 0.5:
            return 1.0
        
        # Coherence factor increases with loading
        # Simple model: coherence builds above critical loading
        critical_loading = 0.7
        
        if loading > critical_loading:
            # Number of coherently coupled nuclei (rough estimate)
            n_coherent = 1 + 10 * (loading - critical_loading)**2
            
            # Coherent enhancement scales as n^2 for fully coherent
            # but realistically much less
            coherence_factor = 0.1  # Degree of coherence
            enhancement = 1 + coherence_factor * n_coherent
        else:
            enhancement = 1.0
        
        return max(enhancement, 1.0)
    
    def _calc_loading_ratio(
        self,
        energy_kev: float,
        conditions: LENRConditions,
        z1: int,
        z2: int
    ) -> float:
        """
        Calculate loading ratio enhancement.
        
        Higher hydrogen loading increases the local density and
        probability of nuclear encounters.
        """
        loading = conditions.loading_ratio
        
        if loading <= 0:
            return 0.0
        
        # Enhancement scales approximately as loading^2 for binary collisions
        # with a critical loading threshold
        critical_loading = 0.85
        
        if loading >= critical_loading:
            # Super-stoichiometric loading gives additional enhancement
            excess = loading - critical_loading
            enhancement = loading**2 * (1 + 10 * excess)
        else:
            enhancement = loading**2
        
        return max(enhancement, 0.01)
    
    def _calc_defect_enhancement(
        self,
        energy_kev: float,
        conditions: LENRConditions,
        z1: int,
        z2: int
    ) -> float:
        """
        Calculate defect and nanostructure enhancement.
        
        Crystal defects and nanostructures can create local
        environments with enhanced reaction rates.
        """
        defect_density = conditions.defect_density
        nanoparticle_size = conditions.nanoparticle_size_nm
        
        enhancement = 1.0
        
        # Defect enhancement
        # More defects = more active sites
        if defect_density > 0:
            enhancement *= (1 + 5 * defect_density)
        
        # Nanoparticle enhancement
        # Smaller particles have higher surface-to-volume ratio
        # and potentially enhanced local fields
        if nanoparticle_size > 0 and nanoparticle_size < 100:
            size_factor = 100 / nanoparticle_size
            enhancement *= (1 + 0.1 * np.log(size_factor))
        
        return max(enhancement, 1.0)
    
    def _calc_em_field_enhancement(
        self,
        energy_kev: float,
        conditions: LENRConditions,
        z1: int,
        z2: int
    ) -> float:
        """
        Calculate electromagnetic field enhancement.
        
        External electric and magnetic fields may influence
        reaction dynamics through various mechanisms.
        """
        B = conditions.magnetic_field_t
        E = conditions.electric_field_v_m
        J = conditions.current_density_a_cm2
        
        enhancement = 1.0
        
        # Magnetic field contribution
        # Could influence nuclear spin alignment
        if B > 0:
            # Cyclotron energy for deuteron
            cyclotron_kev = (E_CHARGE * B * HBAR) / (M_DEUTERON * KEV_TO_J)
            if cyclotron_kev > 0:
                enhancement *= (1 + 0.01 * B)  # Small effect
        
        # Electric field contribution
        # Could influence local charge distribution
        if E > 0:
            # Electric field effect on screening
            field_ev = E * 1e-10  # Field over atomic distance
            enhancement *= (1 + 0.001 * field_ev / 1000)
        
        # Current density contribution
        # Electromigration and joule heating effects
        if J > 0:
            enhancement *= (1 + 0.005 * J)
        
        return max(enhancement, 1.0)


def calculate_lenr_enhancement(
    energy_kev: float,
    temperature_k: float = 300.0,
    loading_ratio: float = 0.8,
    material: str = "palladium",
    defect_density: float = 0.01,
    mechanisms: Optional[List[str]] = None
) -> Dict[str, Any]:
    """
    Convenience function to calculate LENR enhancement.
    
    Args:
        energy_kev: Collision energy in keV
        temperature_k: Temperature in Kelvin
        loading_ratio: Hydrogen to metal ratio (H/M)
        material: Host material name
        defect_density: Fraction of lattice defects
        mechanisms: List of mechanism names to include
        
    Returns:
        Dictionary with enhancement factors and details
    """
    conditions = LENRConditions(
        temperature_k=temperature_k,
        loading_ratio=loading_ratio,
        material=material,
        defect_density=defect_density
    )
    
    calc = LENREnhancementCalculator()
    
    if mechanisms:
        mech_list = [EnhancementMechanism(m) for m in mechanisms]
    else:
        mech_list = None
    
    result = calc.calculate_total_enhancement(
        energy_kev=energy_kev,
        conditions=conditions,
        mechanisms=mech_list
    )
    
    return {
        "total_enhancement": result.total_enhancement,
        "individual_factors": result.individual_factors,
        "dominant_mechanism": result.dominant_mechanism,
        "parameters": result.parameters,
        "warnings": result.warnings
    }


def calculate_lenr_reaction_rate(
    temperature_k: float,
    loading_ratio: float,
    material: str = "palladium",
    defect_density: float = 0.01,
    volume_cm3: float = 1.0,
    include_enhancements: bool = True
) -> Dict[str, float]:
    """
    Calculate LENR reaction rate with all enhancements.
    
    Args:
        temperature_k: Temperature in Kelvin
        loading_ratio: Hydrogen loading ratio
        material: Host material
        defect_density: Defect density fraction
        volume_cm3: Sample volume in cm³
        include_enhancements: Whether to include enhancement factors
        
    Returns:
        Dictionary with reaction rates and related quantities
    """
    # Thermal energy
    kT_kev = thermal_energy(temperature_k)
    
    # Material properties
    mat_data = MATERIALS.get(material)
    if mat_data:
        density = mat_data.density  # kg/m³
        atomic_mass = mat_data.atomic_mass
    else:
        density = 12000
        atomic_mass = 100
    
    # Number density of metal atoms
    n_metal = (density * 1e6) / (atomic_mass * AMU) / 1e6  # per cm³
    
    # Number density of hydrogen
    n_h = n_metal * loading_ratio
    
    # Base reaction rate (very rough estimate)
    # Uses Gamow factor approximation
    from .wkb_tunneling import calculate_dd_tunneling
    
    tunneling_result = calculate_dd_tunneling(
        energy_kev=kT_kev,
        temperature_k=temperature_k,
        material=material
    )
    
    # Calculate enhancement if requested
    if include_enhancements:
        enhancement_result = calculate_lenr_enhancement(
            energy_kev=kT_kev,
            temperature_k=temperature_k,
            loading_ratio=loading_ratio,
            material=material,
            defect_density=defect_density
        )
        total_enhancement = enhancement_result["total_enhancement"]
    else:
        total_enhancement = 1.0
        enhancement_result = {"individual_factors": {}}
    
    # Enhanced tunneling probability
    p_tunnel = tunneling_result.probability * total_enhancement
    
    # Collision rate (rough estimate)
    # σv ≈ σ * sqrt(8kT/πm)
    from .core_constants import M_DEUTERON
    v_thermal = np.sqrt(8 * kT_kev * KEV_TO_J / (np.pi * M_DEUTERON))
    
    # Nuclear cross section at thermal energy (very small)
    sigma_cm2 = tunneling_result.probability * 1e-24  # barn to cm²
    
    # Reaction rate per cm³
    # R = n1 * n2 * <σv>
    reaction_rate = 0.5 * n_h**2 * sigma_cm2 * v_thermal * total_enhancement
    
    # Total reactions in volume
    total_rate = reaction_rate * volume_cm3
    
    # Power output (assuming D-D → He-3 + n, Q = 3.27 MeV)
    q_value_j = 3.27 * 1.602e-13
    power_w = total_rate * q_value_j
    
    return {
        "reaction_rate_per_cm3_s": float(reaction_rate),
        "total_reaction_rate_s": float(total_rate),
        "power_output_w": float(power_w),
        "tunneling_probability": float(p_tunnel),
        "total_enhancement": float(total_enhancement),
        "hydrogen_density_per_cm3": float(n_h),
        "thermal_energy_kev": float(kT_kev),
        "enhancement_factors": enhancement_result.get("individual_factors", {})
    }


# Export
__all__ = [
    'EnhancementMechanism',
    'EnhancementResult',
    'LENRConditions',
    'LENREnhancementCalculator',
    'calculate_lenr_enhancement',
    'calculate_lenr_reaction_rate',
]

