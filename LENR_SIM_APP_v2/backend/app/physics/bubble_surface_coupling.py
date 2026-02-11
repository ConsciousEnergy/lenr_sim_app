"""
Bubble-Surface Coupling Physics for LENR_Sim_App

This module models the physical relationship between a cavitation bubble
and the lattice surface, including:
- Equilibrium distance from surface
- Attachment and detachment dynamics
- Surface tension forces
- Asymmetric collapse near rigid boundaries
- Jet formation directed toward surface

Key Physics:
- Van der Waals and Casimir forces at nanoscale
- Surface tension and contact line dynamics
- Buoyancy vs attachment forces
- Boundary layer effects on bubble growth

References:
- Brennen, C.E. (2014). Cavitation and Bubble Dynamics
- Blake, J.R. & Gibson, D.C. (1987). Cavitation bubbles near boundaries
- Lauterborn, W. & Kurz, T. (2010). Physics of bubble oscillations
"""

import numpy as np
import scipy.constants as const
from typing import Dict, List, Tuple, Any, Optional, Union
from dataclasses import dataclass, field
import math
import logging

from app.utils.logging import setup_logger

# Set up logger
logger = setup_logger("bubble_surface_coupling", "logs/physics.log")

# Physical constants
HBAR = const.hbar  # Reduced Planck constant (J·s)
C = const.c  # Speed of light (m/s)
KB = const.k  # Boltzmann constant (J/K)
PI = np.pi
EPSILON_0 = const.epsilon_0  # Vacuum permittivity

# Fluid properties (water at 20°C as default)
WATER_DENSITY = 998.0  # kg/m³
WATER_SURFACE_TENSION = 0.0728  # N/m
WATER_VISCOSITY = 1.002e-3  # Pa·s
VAPOR_DENSITY = 0.017  # kg/m³ (water vapor at 20°C)

# Surface physics
HAMAKER_CONSTANT_WATER_PD = 4e-20  # J (approximate for water-Pd system)
HAMAKER_CONSTANT_WATER_NI = 3.5e-20  # J (approximate for water-Ni system)


@dataclass
class BubbleSurfaceState:
    """
    Represents the state of a bubble relative to a surface.
    
    Tracks position, attachment state, and forces between
    the bubble and the lattice surface.
    """
    # Bubble geometry
    bubble_radius: float = 1e-6  # Current radius (m)
    bubble_radius_initial: float = 1e-6  # Initial radius before collapse (m)
    
    # Position relative to surface
    surface_distance: float = 1e-7  # Distance from bubble wall to surface (m)
    standoff_ratio: float = 1.0  # γ = h/R (standoff distance / bubble radius)
    
    # Attachment state
    attachment_state: str = "free"  # "nucleating", "attached", "detaching", "free", "collapsing"
    penetration_depth: float = 0.0  # How deep into cavity (m)
    contact_line_radius: float = 0.0  # Radius of contact line for attached bubbles (m)
    
    # Forces (all in Newtons)
    surface_tension_force: float = 0.0
    buoyancy_force: float = 0.0
    casimir_force: float = 0.0
    van_der_waals_force: float = 0.0
    acoustic_force: float = 0.0
    net_force: float = 0.0
    
    # Dynamics
    velocity_toward_surface: float = 0.0  # m/s (positive = toward surface)
    jet_velocity: float = 0.0  # m/s (microjet velocity during asymmetric collapse)
    
    # Surface properties
    contact_angle: float = 80.0  # degrees
    surface_tension: float = WATER_SURFACE_TENSION  # N/m
    
    def __post_init__(self):
        """Calculate derived quantities."""
        if self.bubble_radius > 0:
            self.standoff_ratio = self.surface_distance / self.bubble_radius
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API responses."""
        return {
            "bubble_radius_m": self.bubble_radius,
            "bubble_radius_um": self.bubble_radius * 1e6,
            "surface_distance_m": self.surface_distance,
            "surface_distance_nm": self.surface_distance * 1e9,
            "standoff_ratio": self.standoff_ratio,
            "attachment_state": self.attachment_state,
            "penetration_depth_m": self.penetration_depth,
            "contact_line_radius_m": self.contact_line_radius,
            "forces": {
                "surface_tension_N": self.surface_tension_force,
                "buoyancy_N": self.buoyancy_force,
                "casimir_N": self.casimir_force,
                "van_der_waals_N": self.van_der_waals_force,
                "acoustic_N": self.acoustic_force,
                "net_N": self.net_force
            },
            "velocity_toward_surface_m_s": self.velocity_toward_surface,
            "jet_velocity_m_s": self.jet_velocity,
            "contact_angle": self.contact_angle
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'BubbleSurfaceState':
        """Create instance from dictionary."""
        return cls(
            bubble_radius=data.get("bubble_radius_m", data.get("bubble_radius", 1e-6)),
            surface_distance=data.get("surface_distance_m", data.get("surface_distance", 1e-7)),
            attachment_state=data.get("attachment_state", "free"),
            contact_angle=data.get("contact_angle", 80.0)
        )


def calculate_equilibrium_distance(
    bubble_radius: float,
    contact_angle: float,
    hamaker_constant: float = HAMAKER_CONSTANT_WATER_PD,
    surface_tension: float = WATER_SURFACE_TENSION,
    temperature: float = 300.0
) -> float:
    """
    Calculate the equilibrium distance between bubble and surface.
    
    Balance of forces:
    - Casimir/van der Waals attraction
    - Electrostatic double layer repulsion
    - Surface tension effects
    
    For a bubble near a surface, equilibrium is typically at
    distances of 1-100 nm during nucleation/attachment.
    
    Args:
        bubble_radius: Bubble radius (m)
        contact_angle: Contact angle (degrees)
        hamaker_constant: Hamaker constant for the system (J)
        surface_tension: Surface tension (N/m)
        temperature: Temperature (K)
        
    Returns:
        Equilibrium distance (m)
    """
    # Van der Waals attraction scales as ~A*R/(6*d) for sphere-plate
    # Equilibrium when attractive force balances thermal fluctuations
    
    # Thermal energy scale
    kt = KB * temperature
    
    # Estimate equilibrium from force balance
    # F_vdW = A*R/(6*d²) ~ kT/d for thermal equilibrium
    # This gives d ~ (A*R/(6*kT))^(1/2) for order of magnitude
    
    # More refined estimate considering contact angle
    theta_rad = np.radians(contact_angle)
    cos_theta = np.cos(theta_rad)
    
    # Contact angle correction - hydrophobic surfaces push bubble closer
    angle_factor = 1.0 + 0.5 * (1 - cos_theta)  # ~1 for θ=0, ~1.5 for θ=90
    
    # Base equilibrium distance (order of magnitude)
    if hamaker_constant > 0 and kt > 0:
        d_eq = np.sqrt(hamaker_constant * bubble_radius / (6 * kt)) * angle_factor
    else:
        d_eq = 10e-9  # Default 10 nm
    
    # Bound to physically reasonable range
    d_eq = np.clip(d_eq, 1e-9, bubble_radius)  # 1 nm to bubble radius
    
    logger.debug(
        f"Equilibrium distance: {d_eq:.2e} m for R={bubble_radius:.2e} m, "
        f"θ={contact_angle}°"
    )
    
    return float(d_eq)


def calculate_van_der_waals_force(
    bubble_radius: float,
    surface_distance: float,
    hamaker_constant: float = HAMAKER_CONSTANT_WATER_PD
) -> float:
    """
    Calculate van der Waals force between bubble and flat surface.
    
    Using sphere-plate approximation (Derjaguin approximation):
    F_vdW = -A × R / (6 × d²)
    
    Negative sign indicates attraction.
    
    Args:
        bubble_radius: Bubble radius (m)
        surface_distance: Distance from bubble to surface (m)
        hamaker_constant: Hamaker constant (J)
        
    Returns:
        Van der Waals force (N), negative = attractive
    """
    if surface_distance <= 0:
        surface_distance = 1e-10  # Minimum cutoff
    
    # Sphere-plate van der Waals force
    f_vdw = -hamaker_constant * bubble_radius / (6 * surface_distance**2)
    
    return float(f_vdw)


def calculate_casimir_force_bubble(
    bubble_radius: float,
    surface_distance: float,
    dielectric_contrast: float = 0.1  # Approximate for water-metal
) -> float:
    """
    Calculate Casimir force on a bubble near a surface.
    
    The Casimir effect creates an attractive force between surfaces
    due to quantum vacuum fluctuations. For a bubble (essentially a
    dielectric discontinuity), this is modified by the dielectric contrast.
    
    F_Casimir ≈ -π³ ħc R / (360 d³) × dielectric_factor
    
    Args:
        bubble_radius: Bubble radius (m)
        surface_distance: Distance to surface (m)
        dielectric_contrast: Contrast in dielectric properties
        
    Returns:
        Casimir force (N)
    """
    if surface_distance <= 0:
        surface_distance = 1e-10
    
    # Casimir force for sphere-plate geometry
    # F = -π³ ħc R / (360 d³) for perfect conductors
    f_casimir = -PI**3 * HBAR * C * bubble_radius / (360 * surface_distance**3)
    
    # Apply dielectric contrast factor (reduces force for real materials)
    f_casimir *= dielectric_contrast
    
    return float(f_casimir)


def calculate_surface_tension_force(
    bubble_radius: float,
    contact_angle: float,
    surface_tension: float = WATER_SURFACE_TENSION
) -> float:
    """
    Calculate surface tension force keeping bubble attached to surface.
    
    For an attached bubble with contact line radius r_c:
    F_st = 2π × r_c × γ × sin(θ)
    
    This force acts to keep the bubble attached.
    
    Args:
        bubble_radius: Bubble radius (m)
        contact_angle: Contact angle (degrees)
        surface_tension: Liquid-vapor surface tension (N/m)
        
    Returns:
        Surface tension force (N), positive = keeping attached
    """
    theta_rad = np.radians(contact_angle)
    sin_theta = np.sin(theta_rad)
    
    # Approximate contact line radius for hemispherical cap
    # r_c ≈ R × sin(θ) for small bubbles
    contact_line_radius = bubble_radius * sin_theta
    
    # Surface tension force
    f_st = 2 * PI * contact_line_radius * surface_tension * sin_theta
    
    return float(f_st)


def calculate_buoyancy_force(
    bubble_radius: float,
    liquid_density: float = WATER_DENSITY,
    vapor_density: float = VAPOR_DENSITY,
    gravity: float = 9.81
) -> float:
    """
    Calculate buoyancy force on bubble.
    
    F_b = (4/3)π R³ × (ρ_l - ρ_v) × g
    
    This force acts to detach bubble from surface.
    
    Args:
        bubble_radius: Bubble radius (m)
        liquid_density: Surrounding liquid density (kg/m³)
        vapor_density: Vapor density inside bubble (kg/m³)
        gravity: Gravitational acceleration (m/s²)
        
    Returns:
        Buoyancy force (N)
    """
    volume = (4/3) * PI * bubble_radius**3
    density_diff = liquid_density - vapor_density
    
    f_buoyancy = volume * density_diff * gravity
    
    return float(f_buoyancy)


def calculate_detachment_radius(
    contact_angle: float,
    surface_tension: float = WATER_SURFACE_TENSION,
    liquid_density: float = WATER_DENSITY,
    vapor_density: float = VAPOR_DENSITY,
    gravity: float = 9.81
) -> float:
    """
    Calculate critical bubble radius for detachment from surface.
    
    Detachment occurs when buoyancy > surface tension attachment force.
    
    R_detach = (3γsin²θ / (2(ρ_l - ρ_v)g))^(1/3)
    
    Args:
        contact_angle: Contact angle (degrees)
        surface_tension: Surface tension (N/m)
        liquid_density: Liquid density (kg/m³)
        vapor_density: Vapor density (kg/m³)
        gravity: Gravitational acceleration (m/s²)
        
    Returns:
        Critical detachment radius (m)
    """
    theta_rad = np.radians(contact_angle)
    sin_theta = np.sin(theta_rad)
    
    density_diff = liquid_density - vapor_density
    
    if density_diff <= 0 or gravity <= 0:
        return float('inf')
    
    # Fritz equation for bubble detachment
    r_detach = (3 * surface_tension * sin_theta**2 / (2 * density_diff * gravity))**(1/3)
    
    logger.debug(f"Detachment radius: {r_detach:.2e} m for θ={contact_angle}°")
    
    return float(r_detach)


def calculate_growth_rate_at_surface(
    bubble_radius: float,
    supersaturation: float,
    diffusion_coefficient: float = 2e-9,  # m²/s for dissolved gas
    boundary_layer_thickness: float = 1e-6,  # m
    saturation_concentration: float = 1.0  # mol/m³
) -> float:
    """
    Calculate bubble growth rate when attached to surface.
    
    Growth is limited by diffusion through the boundary layer.
    
    dR/dt = D × (C - C_sat) / (R × C_sat) for diffusion-limited growth
    
    Near a surface, this is modified by the boundary layer thickness.
    
    Args:
        bubble_radius: Current bubble radius (m)
        supersaturation: Supersaturation ratio (> 1)
        diffusion_coefficient: Diffusion coefficient (m²/s)
        boundary_layer_thickness: Thickness of diffusion layer (m)
        saturation_concentration: Saturation concentration (mol/m³)
        
    Returns:
        Growth rate dR/dt (m/s)
    """
    if supersaturation <= 1.0:
        return 0.0  # No growth below saturation
    
    # Concentration difference
    delta_c = (supersaturation - 1) * saturation_concentration
    
    # Epstein-Plesset diffusion-limited growth
    # Modified for surface proximity
    if bubble_radius > 0 and saturation_concentration > 0:
        # Basic growth rate
        dr_dt = diffusion_coefficient * delta_c / (bubble_radius * saturation_concentration)
        
        # Surface proximity enhancement (bubble sees higher gradient near surface)
        # Factor increases as boundary layer becomes thinner than bubble
        if boundary_layer_thickness > 0:
            surface_factor = 1 + bubble_radius / boundary_layer_thickness
        else:
            surface_factor = 2.0
        
        dr_dt *= surface_factor
    else:
        dr_dt = 0.0
    
    return float(dr_dt)


def calculate_jet_velocity(
    bubble_radius: float,
    standoff_ratio: float,
    collapse_pressure: float = 1e6,  # Pa
    liquid_density: float = WATER_DENSITY
) -> float:
    """
    Calculate microjet velocity during asymmetric bubble collapse near surface.
    
    When a bubble collapses near a rigid surface (γ = h/R < 2), it forms
    a high-speed liquid jet directed toward the surface.
    
    Jet velocity depends on standoff ratio:
    v_jet ≈ (2 × ΔP / ρ)^0.5 × f(γ)
    
    Args:
        bubble_radius: Initial bubble radius before collapse (m)
        standoff_ratio: γ = h/R (distance/radius)
        collapse_pressure: Driving pressure difference (Pa)
        liquid_density: Liquid density (kg/m³)
        
    Returns:
        Jet velocity (m/s)
    """
    # Base jet velocity from pressure
    v_base = np.sqrt(2 * collapse_pressure / liquid_density)
    
    # Standoff ratio factor - jet forms for γ < ~2
    # Jet velocity increases as γ decreases (closer to surface)
    if standoff_ratio < 2.0:
        # Empirical correlation from literature
        # v_jet peaks around γ ≈ 0.6-0.8
        if standoff_ratio > 0.5:
            gamma_factor = 2.0 - standoff_ratio
        else:
            # Very close - jet still forms but may be broader
            gamma_factor = 1.5 + standoff_ratio
    else:
        # Symmetric collapse, no jet
        gamma_factor = 0.0
    
    v_jet = v_base * gamma_factor
    
    # Cap at realistic maximum (supersonic in some cases)
    v_jet = min(v_jet, 2000.0)  # ~2 km/s max from literature
    
    logger.debug(f"Jet velocity: {v_jet:.1f} m/s for γ={standoff_ratio:.2f}")
    
    return float(v_jet)


def calculate_full_bubble_surface_state(
    bubble_radius: float,
    surface_distance: float,
    contact_angle: float = 80.0,
    surface_tension: float = WATER_SURFACE_TENSION,
    acoustic_pressure: float = 0.0,
    temperature: float = 300.0,
    collapse_phase: bool = False
) -> BubbleSurfaceState:
    """
    Calculate complete bubble-surface state including all forces.
    
    Args:
        bubble_radius: Current bubble radius (m)
        surface_distance: Distance from bubble to surface (m)
        contact_angle: Contact angle (degrees)
        surface_tension: Surface tension (N/m)
        acoustic_pressure: Driving acoustic pressure (Pa)
        temperature: Temperature (K)
        collapse_phase: Whether bubble is collapsing
        
    Returns:
        Complete BubbleSurfaceState object
    """
    state = BubbleSurfaceState(
        bubble_radius=bubble_radius,
        surface_distance=surface_distance,
        contact_angle=contact_angle,
        surface_tension=surface_tension
    )
    
    # Update standoff ratio
    if bubble_radius > 0:
        state.standoff_ratio = surface_distance / bubble_radius
    
    # Determine attachment state
    d_eq = calculate_equilibrium_distance(
        bubble_radius, contact_angle, temperature=temperature
    )
    r_detach = calculate_detachment_radius(contact_angle, surface_tension)
    
    if surface_distance < d_eq * 2:
        if bubble_radius < r_detach:
            state.attachment_state = "attached"
        else:
            state.attachment_state = "detaching"
    elif surface_distance < bubble_radius * 3:
        state.attachment_state = "nucleating" if not collapse_phase else "collapsing"
    else:
        state.attachment_state = "free"
    
    # Calculate all forces
    state.van_der_waals_force = calculate_van_der_waals_force(
        bubble_radius, surface_distance
    )
    
    state.casimir_force = calculate_casimir_force_bubble(
        bubble_radius, surface_distance
    )
    
    if state.attachment_state in ["attached", "nucleating"]:
        state.surface_tension_force = calculate_surface_tension_force(
            bubble_radius, contact_angle, surface_tension
        )
    
    state.buoyancy_force = calculate_buoyancy_force(bubble_radius)
    
    # Acoustic force (Bjerknes force) - calculated elsewhere
    if acoustic_pressure > 0:
        state.acoustic_force = calculate_acoustic_radiation_force(
            bubble_radius, acoustic_pressure
        )
    
    # Net force (positive = toward surface)
    state.net_force = (
        -state.van_der_waals_force  # Attraction (negative vdW -> positive toward)
        - state.casimir_force  # Attraction
        - state.buoyancy_force  # Away from surface if below
        + state.acoustic_force  # Can be toward or away
    )
    
    # Jet velocity during collapse
    if collapse_phase and state.standoff_ratio < 2.0:
        state.jet_velocity = calculate_jet_velocity(
            bubble_radius, state.standoff_ratio
        )
    
    return state


def calculate_acoustic_radiation_force(
    bubble_radius: float,
    acoustic_pressure: float,
    frequency: float = 25000.0,  # Hz
    liquid_density: float = WATER_DENSITY,
    sound_speed: float = 1500.0  # m/s
) -> float:
    """
    Calculate primary Bjerknes force on bubble in acoustic field.
    
    F = -4πR³ρ/(3) × ∇⟨p²⟩/(ρc²)
    
    For standing waves, this pushes bubbles toward pressure antinodes
    (for bubbles smaller than resonant size) or nodes (larger bubbles).
    
    Args:
        bubble_radius: Bubble radius (m)
        acoustic_pressure: Acoustic pressure amplitude (Pa)
        frequency: Acoustic frequency (Hz)
        liquid_density: Liquid density (kg/m³)
        sound_speed: Speed of sound (m/s)
        
    Returns:
        Acoustic radiation force (N)
    """
    # Resonant radius (Minnaert radius)
    # f_0 = (1/2πR) × sqrt(3γP_0/ρ), so R_res ≈ 3/f for water
    r_resonant = 3.0 / frequency  # Approximate
    
    # Pressure gradient in standing wave (order of magnitude)
    wavelength = sound_speed / frequency
    pressure_gradient = acoustic_pressure / (wavelength / 4)  # ~gradient scale
    
    # Primary Bjerknes force
    volume = (4/3) * PI * bubble_radius**3
    
    # Direction depends on size relative to resonance
    if bubble_radius < r_resonant:
        # Pushed toward pressure antinode (maximum)
        direction = 1.0
    else:
        # Pushed toward pressure node (minimum)
        direction = -1.0
    
    # Force magnitude
    f_bjerknes = volume * pressure_gradient * direction * bubble_radius / wavelength
    
    return float(f_bjerknes)


def get_surface_distance_for_visualization(
    physics_distance_m: float,
    bubble_radius_m: float,
    visualization_scale: float = 1e6  # 1 unit = 1 μm
) -> Dict[str, float]:
    """
    Convert physics distances to visualization coordinates.
    
    The visualization needs to show nanometer-scale physics
    in a comprehensible way while maintaining relationships.
    
    Args:
        physics_distance_m: Actual surface distance in meters
        bubble_radius_m: Bubble radius in meters
        visualization_scale: Units per meter (default: μm)
        
    Returns:
        Dictionary with visualization coordinates
    """
    # Convert to visualization units (μm by default)
    viz_distance = physics_distance_m * visualization_scale
    viz_radius = bubble_radius_m * visualization_scale
    
    # For very small distances, apply a log scaling for visibility
    # but maintain the relationship that distance << radius for nucleation
    min_visible = 0.1  # Minimum visible distance in viz units
    
    if viz_distance < min_visible:
        # Log-scale for very small distances to keep visible
        # but show that bubble is very close to surface
        viz_distance = min_visible * (1 + np.log10(1 + viz_distance / min_visible))
    
    return {
        "surface_distance_viz": viz_distance,
        "bubble_radius_viz": viz_radius,
        "standoff_ratio": physics_distance_m / bubble_radius_m if bubble_radius_m > 0 else 0,
        "is_near_surface": physics_distance_m < bubble_radius_m,
        "scale_factor": visualization_scale,
        "scale_description": "1 unit = 1 μm"
    }
