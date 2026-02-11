"""
Heterogeneous Nucleation Site Physics for LENR_Sim_App

This module implements classical nucleation theory with surface heterogeneity,
modeling bubble formation at specific lattice surface sites (cavities, defects).

Key Physics:
- Heterogeneous nucleation at surface cavities
- Contact angle and wettability effects
- Nucleation energy barriers
- Critical radius calculations
- Waiting time statistics
- Active site probability

References:
- Carey, V.P. (2020). Liquid-Vapor Phase-Change Phenomena
- Blander, M. & Katz, J.L. (1975). Bubble nucleation in liquids
- Jones, S.F. et al. (1999). Bubble nucleation from gas cavities
"""

import numpy as np
import scipy.constants as const
from typing import Dict, List, Tuple, Any, Optional, Union
from dataclasses import dataclass, field
import math
import logging

from app.utils.logging import setup_logger

# Set up logger
logger = setup_logger("nucleation_sites", "logs/physics.log")

# Physical constants
KB = const.k  # Boltzmann constant (J/K)
AVOGADRO = const.N_A  # Avogadro's number
PI = np.pi

# Surface physics constants
WATER_SURFACE_TENSION = 0.0728  # N/m at 20°C
HEAVY_WATER_SURFACE_TENSION = 0.0718  # N/m at 20°C (D2O)
PD_SURFACE_ENERGY = 2.0  # J/m² (Palladium solid surface energy)
NI_SURFACE_ENERGY = 2.45  # J/m² (Nickel solid surface energy)
PD_LIQUID_INTERFACE_ENERGY = 0.05  # J/m² (Pd-water interface, estimated)
NI_LIQUID_INTERFACE_ENERGY = 0.045  # J/m² (Ni-water interface, estimated)

# Contact angles (degrees) - water on various surfaces
WATER_CONTACT_ANGLE_PD = 80.0  # Hydrophilic (clean Pd)
WATER_CONTACT_ANGLE_PD_OXIDIZED = 60.0  # More hydrophilic when oxidized
WATER_CONTACT_ANGLE_NI = 70.0  # Hydrophilic (clean Ni)
WATER_CONTACT_ANGLE_PTFE = 115.0  # Hydrophobic reference


@dataclass
class NucleationSite:
    """
    Represents a nucleation site on a lattice surface.
    
    Heterogeneous nucleation occurs preferentially at surface defects,
    cavities, and imperfections where the energy barrier is reduced.
    """
    # Cavity geometry
    cavity_radius: float = 1e-7  # meters (100 nm default)
    cavity_depth: float = 1e-7  # meters
    cone_angle: float = 90.0  # degrees (half-angle for conical cavities)
    cavity_geometry: str = "conical"  # "conical", "cylindrical", "re-entrant", "crack"
    
    # Surface properties
    surface_roughness: float = 10.0  # RMS roughness in nm
    contact_angle: float = 80.0  # degrees (0-180, wettability)
    surface_energy: float = PD_LIQUID_INTERFACE_ENERGY  # J/m²
    surface_material: str = "Pd"  # "Pd", "Ni", "Ti", etc.
    
    # Site distribution
    site_density: float = 1e12  # sites per m²
    site_activity: float = 1.0  # fraction of sites that are active (0-1)
    
    # Environmental conditions
    temperature: float = 300.0  # K
    liquid_surface_tension: float = WATER_SURFACE_TENSION  # N/m
    
    # Calculated properties (set by methods)
    critical_radius: float = field(default=0.0, init=False)
    nucleation_barrier: float = field(default=0.0, init=False)
    contact_angle_factor: float = field(default=1.0, init=False)
    
    def __post_init__(self):
        """Calculate derived properties after initialization."""
        self.contact_angle_factor = self._calculate_contact_angle_factor()
    
    def _calculate_contact_angle_factor(self) -> float:
        """
        Calculate the contact angle factor f(θ) that reduces
        the nucleation energy barrier for heterogeneous nucleation.
        
        f(θ) = (2 + cos θ)(1 - cos θ)² / 4
        
        For θ = 180° (complete non-wetting): f = 1 (homogeneous)
        For θ = 90° (neutral): f = 0.5
        For θ = 0° (complete wetting): f = 0
        """
        theta_rad = np.radians(self.contact_angle)
        cos_theta = np.cos(theta_rad)
        
        f_theta = (2 + cos_theta) * (1 - cos_theta)**2 / 4
        
        return float(f_theta)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API responses."""
        return {
            "cavity_radius": self.cavity_radius,
            "cavity_depth": self.cavity_depth,
            "cone_angle": self.cone_angle,
            "cavity_geometry": self.cavity_geometry,
            "surface_roughness": self.surface_roughness,
            "contact_angle": self.contact_angle,
            "surface_energy": self.surface_energy,
            "surface_material": self.surface_material,
            "site_density": self.site_density,
            "site_activity": self.site_activity,
            "temperature": self.temperature,
            "liquid_surface_tension": self.liquid_surface_tension,
            "critical_radius": self.critical_radius,
            "nucleation_barrier": self.nucleation_barrier,
            "contact_angle_factor": self.contact_angle_factor
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'NucleationSite':
        """Create instance from dictionary."""
        return cls(
            cavity_radius=data.get("cavity_radius", 1e-7),
            cavity_depth=data.get("cavity_depth", 1e-7),
            cone_angle=data.get("cone_angle", 90.0),
            cavity_geometry=data.get("cavity_geometry", "conical"),
            surface_roughness=data.get("surface_roughness", 10.0),
            contact_angle=data.get("contact_angle", 80.0),
            surface_energy=data.get("surface_energy", PD_LIQUID_INTERFACE_ENERGY),
            surface_material=data.get("surface_material", "Pd"),
            site_density=data.get("site_density", 1e12),
            site_activity=data.get("site_activity", 1.0),
            temperature=data.get("temperature", 300.0),
            liquid_surface_tension=data.get("liquid_surface_tension", WATER_SURFACE_TENSION)
        )


@dataclass
class NucleationResult:
    """Results from nucleation calculations."""
    critical_radius: float  # meters
    nucleation_barrier: float  # Joules
    nucleation_barrier_kt: float  # in units of kT
    waiting_time: float  # seconds
    nucleation_rate: float  # nucleation events per second per site
    active_site_fraction: float  # fraction of sites activated
    contact_angle_factor: float  # reduction factor from heterogeneous nucleation
    
    # Additional physics
    superheat_required: float  # K above saturation
    supersaturation_required: float  # dimensionless ratio
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API responses."""
        return {
            "critical_radius_m": self.critical_radius,
            "critical_radius_nm": self.critical_radius * 1e9,
            "nucleation_barrier_J": self.nucleation_barrier,
            "nucleation_barrier_eV": self.nucleation_barrier / const.e,
            "nucleation_barrier_kT": self.nucleation_barrier_kt,
            "waiting_time_s": self.waiting_time,
            "nucleation_rate_per_s": self.nucleation_rate,
            "active_site_fraction": self.active_site_fraction,
            "contact_angle_factor": self.contact_angle_factor,
            "superheat_required_K": self.superheat_required,
            "supersaturation_required": self.supersaturation_required
        }


def calculate_critical_radius(
    surface_tension: float,
    pressure_difference: float,
    contact_angle: float = 90.0
) -> float:
    """
    Calculate the critical radius for bubble nucleation.
    
    The critical radius is the minimum size a bubble must reach
    to be thermodynamically stable and grow rather than collapse.
    
    r* = 2γ / ΔP
    
    For heterogeneous nucleation, this is modified by the geometry
    of the nucleation site.
    
    Args:
        surface_tension: Liquid-vapor surface tension (N/m)
        pressure_difference: Pressure difference ΔP = P_vapor - P_liquid (Pa)
        contact_angle: Contact angle in degrees
        
    Returns:
        Critical radius in meters
    """
    if pressure_difference <= 0:
        logger.warning("Pressure difference must be positive for nucleation")
        return float('inf')
    
    # Basic Young-Laplace critical radius
    r_critical = 2 * surface_tension / pressure_difference
    
    logger.debug(f"Critical radius: {r_critical:.2e} m for ΔP={pressure_difference:.2e} Pa")
    
    return r_critical


def calculate_nucleation_energy_barrier(
    surface_tension: float,
    pressure_difference: float,
    contact_angle: float = 90.0,
    cavity_geometry: str = "flat"
) -> Tuple[float, float]:
    """
    Calculate the nucleation energy barrier (Gibbs free energy).
    
    For homogeneous nucleation:
        ΔG* = (16π γ³) / (3 ΔP²)
    
    For heterogeneous nucleation on a flat surface:
        ΔG*_het = ΔG*_hom × f(θ)
    
    where f(θ) = (2 + cos θ)(1 - cos θ)² / 4
    
    Args:
        surface_tension: Surface tension (N/m)
        pressure_difference: Supersaturation pressure difference (Pa)
        contact_angle: Contact angle in degrees
        cavity_geometry: "flat", "conical", "cylindrical", "re-entrant"
        
    Returns:
        Tuple of (heterogeneous barrier, contact angle factor)
    """
    if pressure_difference <= 0:
        return float('inf'), 1.0
    
    # Homogeneous nucleation barrier
    delta_g_hom = (16 * PI * surface_tension**3) / (3 * pressure_difference**2)
    
    # Contact angle factor
    theta_rad = np.radians(contact_angle)
    cos_theta = np.cos(theta_rad)
    f_theta = (2 + cos_theta) * (1 - cos_theta)**2 / 4
    
    # Geometry correction factor
    geometry_factor = _get_geometry_factor(cavity_geometry, contact_angle)
    
    # Heterogeneous barrier
    delta_g_het = delta_g_hom * f_theta * geometry_factor
    
    logger.debug(
        f"Nucleation barrier: ΔG*_hom={delta_g_hom:.2e} J, "
        f"f(θ)={f_theta:.3f}, ΔG*_het={delta_g_het:.2e} J"
    )
    
    return delta_g_het, f_theta


def _get_geometry_factor(cavity_geometry: str, contact_angle: float) -> float:
    """
    Get the geometry correction factor for different cavity types.
    
    Re-entrant cavities can significantly reduce the nucleation barrier.
    """
    theta_rad = np.radians(contact_angle)
    
    if cavity_geometry == "flat":
        return 1.0
    
    elif cavity_geometry == "conical":
        # Conical cavities - depends on cone half-angle
        # Approximation: slight reduction
        return 0.8
    
    elif cavity_geometry == "cylindrical":
        # Cylindrical pores - can trap gas
        return 0.6
    
    elif cavity_geometry == "re-entrant":
        # Re-entrant (ink-bottle) cavities - strong reduction
        # These are particularly effective nucleation sites
        return 0.3
    
    elif cavity_geometry == "crack":
        # Sharp cracks - very effective nucleation sites
        return 0.2
    
    else:
        logger.warning(f"Unknown cavity geometry: {cavity_geometry}")
        return 1.0


def calculate_nucleation_rate(
    nucleation_barrier: float,
    temperature: float,
    prefactor: float = 1e30  # typical value in m⁻³s⁻¹
) -> float:
    """
    Calculate the nucleation rate using classical nucleation theory.
    
    J = J₀ × exp(-ΔG*/kT)
    
    Args:
        nucleation_barrier: Free energy barrier (J)
        temperature: Temperature (K)
        prefactor: Kinetic prefactor J₀ (m⁻³s⁻¹)
        
    Returns:
        Nucleation rate (events per m³ per second)
    """
    kt = KB * temperature
    
    if nucleation_barrier <= 0:
        return prefactor
    
    # Exponential factor
    exp_factor = np.exp(-nucleation_barrier / kt)
    
    # Nucleation rate
    j = prefactor * exp_factor
    
    logger.debug(
        f"Nucleation rate: J={j:.2e} m⁻³s⁻¹, "
        f"ΔG*/kT={nucleation_barrier/kt:.1f}"
    )
    
    return j


def calculate_waiting_time(
    nucleation_rate: float,
    site_area: float = 1e-14  # m² (typical active site area)
) -> float:
    """
    Calculate the mean waiting time for a nucleation event at a single site.
    
    τ = 1 / (J × A)
    
    Args:
        nucleation_rate: Volumetric nucleation rate (m⁻³s⁻¹)
        site_area: Active site area (m²)
        
    Returns:
        Mean waiting time (seconds)
    """
    if nucleation_rate <= 0:
        return float('inf')
    
    # Convert volumetric rate to areal rate (assume boundary layer thickness ~1 μm)
    boundary_layer_thickness = 1e-6  # m
    areal_rate = nucleation_rate * boundary_layer_thickness
    
    # Waiting time for single site
    waiting_time = 1.0 / (areal_rate * site_area)
    
    return waiting_time


def calculate_active_site_probability(
    site: NucleationSite,
    supersaturation: float,
    temperature: float
) -> float:
    """
    Calculate the probability that a nucleation site is active.
    
    Based on the cavity size distribution and local supersaturation,
    some sites will be active while others remain dormant.
    
    Args:
        site: NucleationSite object
        supersaturation: Local supersaturation ratio (> 1 for nucleation)
        temperature: Local temperature (K)
        
    Returns:
        Probability (0-1) that the site is active
    """
    if supersaturation <= 1.0:
        return 0.0
    
    # Pressure difference from supersaturation
    # For gas evolution: ΔP ≈ (S - 1) × P_sat
    # Approximate saturation pressure
    p_sat = 1e5  # Pa (approximate)
    delta_p = (supersaturation - 1) * p_sat
    
    # Critical radius for this supersaturation
    r_crit = calculate_critical_radius(
        site.liquid_surface_tension,
        delta_p,
        site.contact_angle
    )
    
    # Site is active if cavity radius > critical radius
    if site.cavity_radius >= r_crit:
        # High probability of activation
        # Probability increases with ratio of cavity to critical radius
        ratio = site.cavity_radius / r_crit
        probability = 1.0 - np.exp(-ratio)
    else:
        # Low probability - requires fluctuation
        ratio = r_crit / site.cavity_radius
        probability = np.exp(-ratio)
    
    # Apply site activity factor
    probability *= site.site_activity
    
    return float(np.clip(probability, 0.0, 1.0))


def calculate_superheat_for_nucleation(
    site: NucleationSite,
    saturation_temperature: float,
    latent_heat: float = 2.26e6,  # J/kg for water
    liquid_density: float = 1000.0  # kg/m³
) -> float:
    """
    Calculate the required superheat for nucleation at a given site.
    
    Uses the Clausius-Clapeyron relation and Young-Laplace equation.
    
    ΔT = (2γ T_sat) / (r × ρ_v × h_fg)
    
    Args:
        site: NucleationSite object
        saturation_temperature: Saturation temperature (K)
        latent_heat: Latent heat of vaporization (J/kg)
        liquid_density: Liquid density (kg/m³)
        
    Returns:
        Required superheat (K above saturation)
    """
    # Vapor density from ideal gas (approximate)
    # ρ_v ≈ P_sat / (R_specific × T)
    r_specific = 461.5  # J/(kg·K) for water vapor
    p_sat = 1e5  # Pa (approximate)
    vapor_density = p_sat / (r_specific * saturation_temperature)
    
    # Use cavity radius as effective nucleation radius
    effective_radius = site.cavity_radius
    
    # Required superheat
    if effective_radius > 0:
        delta_t = (2 * site.liquid_surface_tension * saturation_temperature) / \
                  (effective_radius * vapor_density * latent_heat)
    else:
        delta_t = float('inf')
    
    return delta_t


def calculate_full_nucleation_analysis(
    site: NucleationSite,
    pressure_difference: float,
    supersaturation: float = 1.1
) -> NucleationResult:
    """
    Perform a complete nucleation analysis for a given site.
    
    Args:
        site: NucleationSite object with site properties
        pressure_difference: Driving pressure difference (Pa)
        supersaturation: Supersaturation ratio
        
    Returns:
        NucleationResult with all calculated values
    """
    # Critical radius
    r_crit = calculate_critical_radius(
        site.liquid_surface_tension,
        pressure_difference,
        site.contact_angle
    )
    site.critical_radius = r_crit
    
    # Nucleation barrier
    delta_g, f_theta = calculate_nucleation_energy_barrier(
        site.liquid_surface_tension,
        pressure_difference,
        site.contact_angle,
        site.cavity_geometry
    )
    site.nucleation_barrier = delta_g
    
    # Barrier in units of kT
    kt = KB * site.temperature
    barrier_kt = delta_g / kt if kt > 0 else float('inf')
    
    # Nucleation rate
    j = calculate_nucleation_rate(delta_g, site.temperature)
    
    # Waiting time
    site_area = PI * site.cavity_radius**2
    tau = calculate_waiting_time(j, site_area)
    
    # Active site probability
    p_active = calculate_active_site_probability(
        site, supersaturation, site.temperature
    )
    
    # Superheat required
    delta_t = calculate_superheat_for_nucleation(site, site.temperature)
    
    return NucleationResult(
        critical_radius=r_crit,
        nucleation_barrier=delta_g,
        nucleation_barrier_kt=barrier_kt,
        waiting_time=tau,
        nucleation_rate=j,
        active_site_fraction=p_active,
        contact_angle_factor=f_theta,
        superheat_required=delta_t,
        supersaturation_required=supersaturation
    )


def get_material_surface_properties(material: str) -> Dict[str, float]:
    """
    Get default surface properties for common LENR host materials.
    
    Args:
        material: Material name ("Pd", "Ni", "Ti", etc.)
        
    Returns:
        Dictionary of surface properties
    """
    properties = {
        "Pd": {
            "surface_energy": PD_LIQUID_INTERFACE_ENERGY,
            "solid_surface_energy": PD_SURFACE_ENERGY,
            "contact_angle_water": WATER_CONTACT_ANGLE_PD,
            "typical_roughness_nm": 5.0,
            "typical_cavity_density": 1e12
        },
        "Ni": {
            "surface_energy": NI_LIQUID_INTERFACE_ENERGY,
            "solid_surface_energy": NI_SURFACE_ENERGY,
            "contact_angle_water": WATER_CONTACT_ANGLE_NI,
            "typical_roughness_nm": 8.0,
            "typical_cavity_density": 5e11
        },
        "Ti": {
            "surface_energy": 0.04,
            "solid_surface_energy": 2.1,
            "contact_angle_water": 75.0,
            "typical_roughness_nm": 10.0,
            "typical_cavity_density": 8e11
        },
        "W": {
            "surface_energy": 0.06,
            "solid_surface_energy": 3.3,
            "contact_angle_water": 85.0,
            "typical_roughness_nm": 3.0,
            "typical_cavity_density": 2e11
        }
    }
    
    return properties.get(material, properties["Pd"])


def create_nucleation_site_from_material(
    material: str,
    temperature: float = 300.0,
    cavity_radius: float = 1e-7,
    cavity_geometry: str = "conical"
) -> NucleationSite:
    """
    Create a NucleationSite with material-specific properties.
    
    Args:
        material: Material name
        temperature: Temperature in K
        cavity_radius: Cavity radius in meters
        cavity_geometry: Cavity geometry type
        
    Returns:
        Configured NucleationSite object
    """
    props = get_material_surface_properties(material)
    
    return NucleationSite(
        cavity_radius=cavity_radius,
        cavity_depth=cavity_radius * 2,  # Typical aspect ratio
        cone_angle=60.0,  # Typical for natural cavities
        cavity_geometry=cavity_geometry,
        surface_roughness=props["typical_roughness_nm"],
        contact_angle=props["contact_angle_water"],
        surface_energy=props["surface_energy"],
        surface_material=material,
        site_density=props["typical_cavity_density"],
        temperature=temperature
    )
