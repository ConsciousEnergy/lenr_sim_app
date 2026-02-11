"""
Thermal and Diffusion Boundary Layer Physics for LENR_Sim_App

This module models the thin layers near the lattice surface where
nucleation conditions are met. These boundary layers determine:
- Where bubbles nucleate (superheat/supersaturation region)
- Local temperature and concentration gradients
- Mass and heat transfer rates

Key Physics:
- Thermal boundary layer thickness
- Diffusion (concentration) boundary layer
- Nusselt and Sherwood number correlations
- Supersaturation and superheat profiles

References:
- Incropera, F.P. & DeWitt, D.P. (2011). Fundamentals of Heat and Mass Transfer
- Carey, V.P. (2020). Liquid-Vapor Phase-Change Phenomena
- Bird, R.B. et al. (2007). Transport Phenomena
"""

import numpy as np
import scipy.constants as const
from typing import Dict, List, Tuple, Any, Optional, Union
from dataclasses import dataclass, field
import math
import logging

from app.utils.logging import setup_logger

# Set up logger
logger = setup_logger("boundary_layers", "logs/physics.log")

# Physical constants
KB = const.k  # Boltzmann constant
R_GAS = const.R  # Gas constant
PI = np.pi

# Material properties for common LENR systems

# Palladium (Pd) - primary LENR material
PD_THERMAL_CONDUCTIVITY = 71.8  # W/(m·K)
PD_SPECIFIC_HEAT = 244.0  # J/(kg·K)
PD_DENSITY = 12023.0  # kg/m³
PD_THERMAL_DIFFUSIVITY = PD_THERMAL_CONDUCTIVITY / (PD_DENSITY * PD_SPECIFIC_HEAT)  # m²/s

# Nickel (Ni) - alternative LENR material
NI_THERMAL_CONDUCTIVITY = 90.9  # W/(m·K)
NI_SPECIFIC_HEAT = 444.0  # J/(kg·K)
NI_DENSITY = 8908.0  # kg/m³
NI_THERMAL_DIFFUSIVITY = NI_THERMAL_CONDUCTIVITY / (NI_DENSITY * NI_SPECIFIC_HEAT)

# Heavy water (D2O) at 25°C
D2O_THERMAL_CONDUCTIVITY = 0.595  # W/(m·K)
D2O_VISCOSITY = 1.095e-3  # Pa·s
D2O_DENSITY = 1107.0  # kg/m³
D2O_SPECIFIC_HEAT = 4180.0  # J/(kg·K)
D2O_THERMAL_DIFFUSIVITY = D2O_THERMAL_CONDUCTIVITY / (D2O_DENSITY * D2O_SPECIFIC_HEAT)
D2O_PRANDTL = D2O_VISCOSITY * D2O_SPECIFIC_HEAT / D2O_THERMAL_CONDUCTIVITY  # ~7.7

# Diffusion coefficients
DEUTERIUM_DIFFUSIVITY_PD = 2.9e-11  # m²/s (D in Pd at 300K)
DEUTERIUM_DIFFUSIVITY_NI = 5e-13  # m²/s (D in Ni at 300K)
DEUTERIUM_DIFFUSIVITY_D2O = 2.3e-9  # m²/s (D in D2O)
HYDROGEN_DIFFUSIVITY_D2O = 4.5e-9  # m²/s (H2 in water)

# Schmidt numbers (Sc = ν/D)
SCHMIDT_D_D2O = D2O_VISCOSITY / (D2O_DENSITY * DEUTERIUM_DIFFUSIVITY_D2O)  # ~500


@dataclass
class BoundaryLayerState:
    """
    Represents the state of thermal and diffusion boundary layers
    near the lattice surface.
    """
    # Layer thicknesses
    thermal_layer_thickness: float = 1e-6  # δ_th in meters
    diffusion_layer_thickness: float = 1e-6  # δ_D in meters
    velocity_layer_thickness: float = 1e-6  # δ (momentum) in meters
    
    # Gradients at surface
    temperature_gradient: float = 0.0  # K/m (dT/dy at y=0)
    concentration_gradient: float = 0.0  # mol/m⁴ (dC/dy at y=0)
    
    # Dimensionless numbers
    nusselt_number: float = 1.0
    sherwood_number: float = 1.0
    prandtl_number: float = 7.0
    schmidt_number: float = 500.0
    
    # Surface conditions
    surface_temperature: float = 300.0  # K
    bulk_temperature: float = 300.0  # K
    superheat: float = 0.0  # K above saturation
    
    surface_concentration: float = 1.0  # mol/m³
    bulk_concentration: float = 0.5  # mol/m³
    supersaturation: float = 1.0  # C_surface / C_saturation
    
    # Heat and mass flux
    heat_flux: float = 0.0  # W/m²
    mass_flux: float = 0.0  # mol/(m²·s)
    
    # Nucleation zone
    nucleation_zone_thickness: float = 0.0  # m (where conditions allow nucleation)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API responses."""
        return {
            "thicknesses": {
                "thermal_m": self.thermal_layer_thickness,
                "thermal_um": self.thermal_layer_thickness * 1e6,
                "diffusion_m": self.diffusion_layer_thickness,
                "diffusion_um": self.diffusion_layer_thickness * 1e6,
                "velocity_m": self.velocity_layer_thickness,
                "velocity_um": self.velocity_layer_thickness * 1e6
            },
            "gradients": {
                "temperature_K_m": self.temperature_gradient,
                "concentration_mol_m4": self.concentration_gradient
            },
            "dimensionless_numbers": {
                "nusselt": self.nusselt_number,
                "sherwood": self.sherwood_number,
                "prandtl": self.prandtl_number,
                "schmidt": self.schmidt_number
            },
            "thermal": {
                "surface_T_K": self.surface_temperature,
                "bulk_T_K": self.bulk_temperature,
                "superheat_K": self.superheat,
                "heat_flux_W_m2": self.heat_flux
            },
            "concentration": {
                "surface_mol_m3": self.surface_concentration,
                "bulk_mol_m3": self.bulk_concentration,
                "supersaturation": self.supersaturation,
                "mass_flux_mol_m2_s": self.mass_flux
            },
            "nucleation_zone_thickness_m": self.nucleation_zone_thickness,
            "nucleation_zone_thickness_um": self.nucleation_zone_thickness * 1e6
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'BoundaryLayerState':
        """Create instance from dictionary."""
        thicknesses = data.get("thicknesses", {})
        return cls(
            thermal_layer_thickness=thicknesses.get("thermal_m", 1e-6),
            diffusion_layer_thickness=thicknesses.get("diffusion_m", 1e-6),
            surface_temperature=data.get("thermal", {}).get("surface_T_K", 300.0),
            bulk_temperature=data.get("thermal", {}).get("bulk_T_K", 300.0),
            supersaturation=data.get("concentration", {}).get("supersaturation", 1.0)
        )


def calculate_thermal_boundary_thickness(
    characteristic_length: float,
    nusselt_number: float
) -> float:
    """
    Calculate thermal boundary layer thickness from Nusselt number.
    
    δ_th = L / Nu
    
    where L is characteristic length and Nu is Nusselt number.
    
    Args:
        characteristic_length: Characteristic length scale (m)
        nusselt_number: Nusselt number (dimensionless)
        
    Returns:
        Thermal boundary layer thickness (m)
    """
    if nusselt_number <= 0:
        return characteristic_length  # Default to characteristic length
    
    delta_th = characteristic_length / nusselt_number
    
    return float(delta_th)


def calculate_diffusion_boundary_thickness(
    thermal_layer_thickness: float,
    schmidt_number: float,
    prandtl_number: float
) -> float:
    """
    Calculate diffusion boundary layer thickness from thermal layer.
    
    The ratio of thermal to diffusion boundary layer depends on
    the Lewis number (Le = Sc/Pr):
    
    δ_D / δ_th ≈ (Pr/Sc)^(1/3) = Le^(-1/3)
    
    For Sc >> Pr (typical in liquids), δ_D << δ_th
    
    Args:
        thermal_layer_thickness: Thermal boundary layer thickness (m)
        schmidt_number: Schmidt number Sc = ν/D
        prandtl_number: Prandtl number Pr = ν/α
        
    Returns:
        Diffusion boundary layer thickness (m)
    """
    if schmidt_number <= 0 or prandtl_number <= 0:
        return thermal_layer_thickness
    
    # Lewis number
    lewis = schmidt_number / prandtl_number
    
    # Diffusion layer thickness
    delta_d = thermal_layer_thickness * lewis**(-1/3)
    
    return float(delta_d)


def calculate_nusselt_natural_convection(
    rayleigh_number: float,
    geometry: str = "vertical_plate"
) -> float:
    """
    Calculate Nusselt number for natural convection.
    
    Various correlations depending on geometry:
    - Vertical plate: Nu = 0.59 Ra^0.25 (laminar)
    - Horizontal plate (hot up): Nu = 0.54 Ra^0.25
    - Horizontal plate (hot down): Nu = 0.27 Ra^0.25
    
    Args:
        rayleigh_number: Rayleigh number Ra = Gr × Pr
        geometry: Surface geometry type
        
    Returns:
        Nusselt number
    """
    ra = max(rayleigh_number, 1.0)
    
    if geometry == "vertical_plate":
        if ra < 1e9:
            # Laminar
            nu = 0.59 * ra**0.25
        else:
            # Turbulent
            nu = 0.1 * ra**(1/3)
    
    elif geometry == "horizontal_hot_up":
        if ra < 1e7:
            nu = 0.54 * ra**0.25
        else:
            nu = 0.15 * ra**(1/3)
    
    elif geometry == "horizontal_hot_down":
        nu = 0.27 * ra**0.25
    
    elif geometry == "sphere":
        # For small spheres (typical nucleation sites)
        nu = 2.0 + 0.6 * ra**0.25
    
    else:
        # Default
        nu = 0.5 * ra**0.25
    
    return float(max(nu, 1.0))


def calculate_sherwood_number(
    nusselt_number: float,
    schmidt_number: float,
    prandtl_number: float
) -> float:
    """
    Calculate Sherwood number from heat-mass transfer analogy.
    
    Sh/Nu = (Sc/Pr)^n where n ≈ 1/3
    
    Args:
        nusselt_number: Nusselt number
        schmidt_number: Schmidt number
        prandtl_number: Prandtl number
        
    Returns:
        Sherwood number
    """
    if prandtl_number <= 0:
        return nusselt_number
    
    ratio = schmidt_number / prandtl_number
    sh = nusselt_number * ratio**(1/3)
    
    return float(sh)


def calculate_rayleigh_number(
    temperature_difference: float,
    characteristic_length: float,
    beta: float = 2.1e-4,  # Thermal expansion coefficient for water (1/K)
    gravity: float = 9.81,
    kinematic_viscosity: float = 1e-6,
    thermal_diffusivity: float = 1.4e-7
) -> float:
    """
    Calculate Rayleigh number for natural convection.
    
    Ra = (g × β × ΔT × L³) / (ν × α)
    
    Args:
        temperature_difference: Temperature difference (K)
        characteristic_length: Characteristic length (m)
        beta: Thermal expansion coefficient (1/K)
        gravity: Gravitational acceleration (m/s²)
        kinematic_viscosity: Kinematic viscosity (m²/s)
        thermal_diffusivity: Thermal diffusivity (m²/s)
        
    Returns:
        Rayleigh number
    """
    ra = (gravity * beta * abs(temperature_difference) * characteristic_length**3) / \
         (kinematic_viscosity * thermal_diffusivity)
    
    return float(ra)


def calculate_temperature_profile(
    distance_from_surface: float,
    thermal_layer_thickness: float,
    surface_temperature: float,
    bulk_temperature: float
) -> float:
    """
    Calculate temperature at a given distance from the surface.
    
    Uses error function profile for thermal boundary layer:
    T(y) = T_s + (T_∞ - T_s) × erf(y / δ_th)
    
    Args:
        distance_from_surface: Distance from surface (m)
        thermal_layer_thickness: Thermal boundary layer thickness (m)
        surface_temperature: Surface temperature (K)
        bulk_temperature: Bulk fluid temperature (K)
        
    Returns:
        Local temperature (K)
    """
    if thermal_layer_thickness <= 0:
        return bulk_temperature
    
    from scipy.special import erf
    
    eta = distance_from_surface / thermal_layer_thickness
    t_local = surface_temperature + (bulk_temperature - surface_temperature) * erf(eta)
    
    return float(t_local)


def calculate_concentration_profile(
    distance_from_surface: float,
    diffusion_layer_thickness: float,
    surface_concentration: float,
    bulk_concentration: float
) -> float:
    """
    Calculate concentration at a given distance from surface.
    
    Uses error function profile for diffusion boundary layer:
    C(y) = C_s + (C_∞ - C_s) × erf(y / δ_D)
    
    Args:
        distance_from_surface: Distance from surface (m)
        diffusion_layer_thickness: Diffusion boundary layer thickness (m)
        surface_concentration: Surface concentration (mol/m³)
        bulk_concentration: Bulk concentration (mol/m³)
        
    Returns:
        Local concentration (mol/m³)
    """
    if diffusion_layer_thickness <= 0:
        return bulk_concentration
    
    from scipy.special import erf
    
    eta = distance_from_surface / diffusion_layer_thickness
    c_local = surface_concentration + (bulk_concentration - surface_concentration) * erf(eta)
    
    return float(c_local)


def calculate_superheat_profile(
    distance_from_surface: float,
    thermal_layer_thickness: float,
    surface_superheat: float
) -> float:
    """
    Calculate local superheat at distance from surface.
    
    Superheat decreases as we move away from the hot surface.
    
    Args:
        distance_from_surface: Distance from surface (m)
        thermal_layer_thickness: Thermal boundary layer thickness (m)
        surface_superheat: Superheat at surface (K above saturation)
        
    Returns:
        Local superheat (K)
    """
    if thermal_layer_thickness <= 0 or surface_superheat <= 0:
        return 0.0
    
    from scipy.special import erfc
    
    eta = distance_from_surface / thermal_layer_thickness
    local_superheat = surface_superheat * erfc(eta)
    
    return float(max(0, local_superheat))


def calculate_supersaturation_profile(
    distance_from_surface: float,
    diffusion_layer_thickness: float,
    surface_supersaturation: float
) -> float:
    """
    Calculate local supersaturation ratio at distance from surface.
    
    For gas evolution from a surface, supersaturation is highest
    at the surface and decreases into the bulk.
    
    Args:
        distance_from_surface: Distance from surface (m)
        diffusion_layer_thickness: Diffusion boundary layer thickness (m)
        surface_supersaturation: Supersaturation at surface (ratio)
        
    Returns:
        Local supersaturation ratio
    """
    if diffusion_layer_thickness <= 0:
        return 1.0
    
    from scipy.special import erfc
    
    eta = distance_from_surface / diffusion_layer_thickness
    # Supersaturation decreases from surface value to 1 (saturation) in bulk
    local_ss = 1.0 + (surface_supersaturation - 1.0) * erfc(eta)
    
    return float(max(1.0, local_ss))


def calculate_nucleation_zone_thickness(
    thermal_layer_thickness: float,
    diffusion_layer_thickness: float,
    surface_superheat: float,
    required_superheat: float,
    surface_supersaturation: float,
    required_supersaturation: float = 1.1
) -> float:
    """
    Calculate the thickness of the zone where nucleation can occur.
    
    Nucleation requires either:
    - Local superheat > required superheat (for boiling), OR
    - Local supersaturation > required supersaturation (for gas evolution)
    
    The nucleation zone is where these conditions are met.
    
    Args:
        thermal_layer_thickness: Thermal boundary layer thickness (m)
        diffusion_layer_thickness: Diffusion boundary layer thickness (m)
        surface_superheat: Superheat at surface (K)
        required_superheat: Minimum superheat for nucleation (K)
        surface_supersaturation: Supersaturation at surface
        required_supersaturation: Minimum supersaturation for nucleation
        
    Returns:
        Nucleation zone thickness (m)
    """
    from scipy.special import erfcinv
    
    nucleation_thickness = 0.0
    
    # Check thermal nucleation (boiling)
    if surface_superheat > required_superheat and required_superheat > 0:
        # Find where local superheat drops to required value
        ratio = required_superheat / surface_superheat
        if ratio < 1:
            eta_th = erfcinv(ratio)
            nucleation_thickness = max(nucleation_thickness, eta_th * thermal_layer_thickness)
    
    # Check concentration nucleation (gas evolution)
    if surface_supersaturation > required_supersaturation:
        # Find where supersaturation drops to required value
        excess = surface_supersaturation - 1.0
        required_excess = required_supersaturation - 1.0
        if excess > 0 and required_excess > 0:
            ratio = required_excess / excess
            if ratio < 1:
                eta_d = erfcinv(ratio)
                nucleation_thickness = max(nucleation_thickness, eta_d * diffusion_layer_thickness)
    
    return float(nucleation_thickness)


def calculate_heat_flux(
    thermal_conductivity: float,
    temperature_gradient: float
) -> float:
    """
    Calculate heat flux using Fourier's law.
    
    q = -k × (dT/dy)
    
    Args:
        thermal_conductivity: Thermal conductivity (W/(m·K))
        temperature_gradient: Temperature gradient at surface (K/m)
        
    Returns:
        Heat flux (W/m²), positive = into fluid
    """
    return float(-thermal_conductivity * temperature_gradient)


def calculate_mass_flux(
    diffusion_coefficient: float,
    concentration_gradient: float
) -> float:
    """
    Calculate mass flux using Fick's law.
    
    J = -D × (dC/dy)
    
    Args:
        diffusion_coefficient: Diffusion coefficient (m²/s)
        concentration_gradient: Concentration gradient at surface (mol/m⁴)
        
    Returns:
        Mass flux (mol/(m²·s)), positive = into fluid
    """
    return float(-diffusion_coefficient * concentration_gradient)


def calculate_full_boundary_layer_analysis(
    surface_temperature: float,
    bulk_temperature: float,
    surface_concentration: float,
    bulk_concentration: float,
    saturation_temperature: float,
    saturation_concentration: float,
    characteristic_length: float = 1e-3,
    material: str = "Pd",
    fluid: str = "D2O"
) -> BoundaryLayerState:
    """
    Perform complete boundary layer analysis.
    
    Args:
        surface_temperature: Surface temperature (K)
        bulk_temperature: Bulk fluid temperature (K)
        surface_concentration: Surface concentration (mol/m³)
        bulk_concentration: Bulk concentration (mol/m³)
        saturation_temperature: Saturation temperature (K)
        saturation_concentration: Saturation concentration (mol/m³)
        characteristic_length: Characteristic length scale (m)
        material: Surface material ("Pd", "Ni")
        fluid: Surrounding fluid ("D2O", "H2O")
        
    Returns:
        Complete BoundaryLayerState object
    """
    # Get material properties
    if fluid == "D2O":
        prandtl = D2O_PRANDTL
        schmidt = SCHMIDT_D_D2O
        thermal_conductivity = D2O_THERMAL_CONDUCTIVITY
        thermal_diffusivity = D2O_THERMAL_DIFFUSIVITY
        kinematic_viscosity = D2O_VISCOSITY / D2O_DENSITY
        diffusion_coeff = DEUTERIUM_DIFFUSIVITY_D2O
    else:
        # Default to water-like properties
        prandtl = 7.0
        schmidt = 500.0
        thermal_conductivity = 0.6
        thermal_diffusivity = 1.4e-7
        kinematic_viscosity = 1e-6
        diffusion_coeff = 2e-9
    
    # Calculate temperature difference and Rayleigh number
    delta_t = surface_temperature - bulk_temperature
    ra = calculate_rayleigh_number(
        delta_t, characteristic_length,
        kinematic_viscosity=kinematic_viscosity,
        thermal_diffusivity=thermal_diffusivity
    )
    
    # Calculate Nusselt number
    nu = calculate_nusselt_natural_convection(ra, "vertical_plate")
    
    # Calculate Sherwood number
    sh = calculate_sherwood_number(nu, schmidt, prandtl)
    
    # Calculate layer thicknesses
    delta_th = calculate_thermal_boundary_thickness(characteristic_length, nu)
    delta_d = calculate_diffusion_boundary_thickness(delta_th, schmidt, prandtl)
    delta_v = delta_th * prandtl**(1/3)  # Velocity boundary layer
    
    # Calculate gradients
    temp_gradient = -delta_t / delta_th if delta_th > 0 else 0
    conc_gradient = -(surface_concentration - bulk_concentration) / delta_d if delta_d > 0 else 0
    
    # Calculate superheat and supersaturation
    superheat = max(0, surface_temperature - saturation_temperature)
    supersaturation = surface_concentration / saturation_concentration if saturation_concentration > 0 else 1.0
    
    # Calculate nucleation zone
    required_superheat = 5.0  # K (typical for bubble nucleation)
    required_supersaturation = 1.1  # 10% supersaturation
    
    nucleation_zone = calculate_nucleation_zone_thickness(
        delta_th, delta_d,
        superheat, required_superheat,
        supersaturation, required_supersaturation
    )
    
    # Calculate fluxes
    heat_flux = calculate_heat_flux(thermal_conductivity, temp_gradient)
    mass_flux = calculate_mass_flux(diffusion_coeff, conc_gradient)
    
    # Create state object
    state = BoundaryLayerState(
        thermal_layer_thickness=delta_th,
        diffusion_layer_thickness=delta_d,
        velocity_layer_thickness=delta_v,
        temperature_gradient=temp_gradient,
        concentration_gradient=conc_gradient,
        nusselt_number=nu,
        sherwood_number=sh,
        prandtl_number=prandtl,
        schmidt_number=schmidt,
        surface_temperature=surface_temperature,
        bulk_temperature=bulk_temperature,
        superheat=superheat,
        surface_concentration=surface_concentration,
        bulk_concentration=bulk_concentration,
        supersaturation=supersaturation,
        heat_flux=heat_flux,
        mass_flux=mass_flux,
        nucleation_zone_thickness=nucleation_zone
    )
    
    logger.debug(
        f"Boundary layer analysis: δ_th={delta_th:.2e} m, δ_D={delta_d:.2e} m, "
        f"nucleation zone={nucleation_zone:.2e} m"
    )
    
    return state


def get_material_properties(material: str) -> Dict[str, float]:
    """
    Get thermal and transport properties for common materials.
    
    Args:
        material: Material name ("Pd", "Ni", "D2O", etc.)
        
    Returns:
        Dictionary of material properties
    """
    properties = {
        "Pd": {
            "thermal_conductivity": PD_THERMAL_CONDUCTIVITY,
            "specific_heat": PD_SPECIFIC_HEAT,
            "density": PD_DENSITY,
            "thermal_diffusivity": PD_THERMAL_DIFFUSIVITY,
            "deuterium_diffusivity": DEUTERIUM_DIFFUSIVITY_PD
        },
        "Ni": {
            "thermal_conductivity": NI_THERMAL_CONDUCTIVITY,
            "specific_heat": NI_SPECIFIC_HEAT,
            "density": NI_DENSITY,
            "thermal_diffusivity": NI_THERMAL_DIFFUSIVITY,
            "deuterium_diffusivity": DEUTERIUM_DIFFUSIVITY_NI
        },
        "D2O": {
            "thermal_conductivity": D2O_THERMAL_CONDUCTIVITY,
            "specific_heat": D2O_SPECIFIC_HEAT,
            "density": D2O_DENSITY,
            "thermal_diffusivity": D2O_THERMAL_DIFFUSIVITY,
            "viscosity": D2O_VISCOSITY,
            "prandtl": D2O_PRANDTL,
            "deuterium_diffusivity": DEUTERIUM_DIFFUSIVITY_D2O,
            "schmidt_d": SCHMIDT_D_D2O
        }
    }
    
    return properties.get(material, properties["Pd"])
