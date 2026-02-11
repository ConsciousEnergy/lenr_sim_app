"""
MHD Proton Confinement Module for LENR Simulation

This module implements magnetohydrodynamic (MHD) forces for proton confinement
during bubble cavitation. The key physics includes:

1. Lorentz Force: F = q(E + v × B)
2. Z-Pinch Effect: Azimuthal B-field creates radially inward force
3. Pressure Gradient: Bubble collapse drives particles toward cavitation
4. Coulomb Focusing: Electric field concentration at cavitation site

The goal is to realistically model proton convergence toward the cavitation
point where bubble meets lattice at inter-atomic spacing.
"""

import numpy as np
from dataclasses import dataclass
from typing import Dict, Tuple, Optional, Any
from enum import Enum
import logging

logger = logging.getLogger(__name__)

# Physical Constants (SI units)
MU_0 = 4 * np.pi * 1e-7          # Vacuum permeability (H/m)
EPSILON_0 = 8.854187817e-12      # Vacuum permittivity (F/m)
E_CHARGE = 1.602176634e-19       # Elementary charge (C)
PROTON_MASS = 1.67262192e-27     # Proton mass (kg)
K_BOLTZMANN = 1.380649e-23       # Boltzmann constant (J/K)
HBAR = 1.054571817e-34           # Reduced Planck constant (J·s)

# Lattice constants (meters)
LATTICE_CONSTANTS = {
    "palladium": 3.89e-10,  # FCC Pd
    "nickel": 3.52e-10,     # FCC Ni
    "titanium": 2.95e-10,   # HCP Ti (a-axis)
}


class ConfinementRegime(Enum):
    """Proton confinement regimes during bubble collapse."""
    WEAK = "weak"           # Initial state, protons dispersed
    MODERATE = "moderate"   # Compression starting, slight confinement
    STRONG = "strong"       # Near minimum radius, strong confinement
    EXTREME = "extreme"     # At cavitation, maximum confinement


@dataclass
class MHDFieldConfiguration:
    """Configuration of MHD fields for proton confinement."""
    # Z-pinch parameters
    pinch_current: float = 1.0           # Current in Amperes
    pinch_radius: float = 1e-6           # Characteristic radius (m)
    
    # Electric field parameters
    radial_field_strength: float = 1e8   # V/m at reference distance
    reference_distance: float = 1e-6     # Reference distance for field (m)
    
    # Magnetic field parameters  
    axial_field: float = 0.0             # Axial B-field component (T)
    azimuthal_factor: float = 1.0        # Factor for azimuthal field
    
    # Pressure parameters
    ambient_pressure: float = 1e5        # Pa
    peak_pressure: float = 1e10          # Pa at maximum compression
    
    # Geometry
    cavitation_point: np.ndarray = None  # Target convergence point
    
    def __post_init__(self):
        if self.cavitation_point is None:
            self.cavitation_point = np.zeros(3)
        self.cavitation_point = np.asarray(self.cavitation_point)


class MHDProtonConfinement:
    """
    MHD-based proton confinement calculator.
    
    Computes forces on protons during bubble cavitation to achieve
    realistic convergence toward the cavitation site.
    """
    
    def __init__(self, config: Optional[MHDFieldConfiguration] = None):
        """Initialize MHD confinement calculator."""
        self.config = config or MHDFieldConfiguration()
        self.regime = ConfinementRegime.WEAK
        
        logger.info("Initialized MHD proton confinement module")
    
    def set_cavitation_point(self, point: np.ndarray):
        """Set the cavitation point (proton convergence target)."""
        self.config.cavitation_point = np.asarray(point)
    
    def compute_z_pinch_field(self, position: np.ndarray) -> np.ndarray:
        """
        Compute azimuthal magnetic field from Z-pinch effect.
        
        B_θ = μ₀I / (2πr)
        
        The Z-pinch creates an azimuthal (circumferential) magnetic field
        that, combined with axial current, produces a radially inward force.
        
        Args:
            position: Position vector relative to cavitation point
            
        Returns:
            Magnetic field vector (azimuthal component)
        """
        r_vec = position - self.config.cavitation_point
        r_perp = np.sqrt(r_vec[0]**2 + r_vec[1]**2)  # Perpendicular distance
        
        if r_perp < 1e-15:  # Avoid singularity at axis
            return np.zeros(3)
        
        # Azimuthal unit vector (perpendicular to r and z)
        theta_hat = np.array([-r_vec[1], r_vec[0], 0]) / r_perp
        
        # Azimuthal field magnitude
        B_theta = (MU_0 * self.config.pinch_current * 
                   self.config.azimuthal_factor / (2 * np.pi * r_perp))
        
        # Add axial component if present
        B = B_theta * theta_hat
        B[2] += self.config.axial_field
        
        return B
    
    def compute_radial_electric_field(self, position: np.ndarray) -> np.ndarray:
        """
        Compute radial electric field pointing toward cavitation point.
        
        The electric field is strongest at the cavitation site due to
        charge accumulation and field concentration.
        
        E(r) = E_0 * (r_ref / r)^2 * r_hat
        
        Args:
            position: Position vector
            
        Returns:
            Electric field vector
        """
        r_vec = position - self.config.cavitation_point
        r = np.linalg.norm(r_vec)
        
        if r < 1e-15:  # At cavitation point
            return np.zeros(3)
        
        r_hat = r_vec / r
        
        # Field magnitude with 1/r^2 falloff (Coulomb-like)
        # Regularized to avoid singularity
        r_effective = max(r, 1e-12)
        E_magnitude = (self.config.radial_field_strength * 
                       (self.config.reference_distance / r_effective)**2)
        
        # Field points inward (toward cavitation)
        E = -E_magnitude * r_hat
        
        return E
    
    def compute_pressure_gradient(
        self,
        position: np.ndarray,
        compression_ratio: float,
        bubble_radius: float
    ) -> np.ndarray:
        """
        Compute pressure gradient from bubble collapse.
        
        The Rayleigh-Plesset collapse creates enormous pressure gradients
        that drive fluid (and protons) toward the cavitation point.
        
        Args:
            position: Position vector
            compression_ratio: R_0 / R (initial/current radius)
            bubble_radius: Current bubble radius
            
        Returns:
            Pressure gradient vector (Pa/m)
        """
        r_vec = position - self.config.cavitation_point
        r = np.linalg.norm(r_vec)
        
        if r < 1e-15:
            return np.zeros(3)
        
        r_hat = r_vec / r
        
        # Pressure scales with compression^4 (adiabatic)
        # P = P_ambient * (R_0/R)^(3*gamma) where gamma ~ 5/3
        gamma = 5/3
        P_current = min(
            self.config.ambient_pressure * compression_ratio**(3*gamma),
            self.config.peak_pressure
        )
        
        # Pressure gradient: dP/dr ~ -P / bubble_radius (characteristic length)
        # Points inward
        grad_P_magnitude = P_current / max(bubble_radius, 1e-12)
        
        # Gradient is strongest at bubble surface, decreases outside
        if r < bubble_radius:
            # Inside bubble: gradient increases toward center
            spatial_factor = (r / bubble_radius)**2
        else:
            # Outside bubble: gradient decreases
            spatial_factor = (bubble_radius / r)**2
        
        grad_P = -grad_P_magnitude * spatial_factor * r_hat
        
        return grad_P
    
    def compute_lorentz_force(
        self,
        position: np.ndarray,
        velocity: np.ndarray,
        B_field: Optional[np.ndarray] = None,
        E_field: Optional[np.ndarray] = None
    ) -> np.ndarray:
        """
        Compute Lorentz force on a proton.
        
        F = q(E + v × B)
        
        Args:
            position: Proton position
            velocity: Proton velocity
            B_field: Magnetic field (computed if None)
            E_field: Electric field (computed if None)
            
        Returns:
            Lorentz force vector (N)
        """
        if B_field is None:
            B_field = self.compute_z_pinch_field(position)
        if E_field is None:
            E_field = self.compute_radial_electric_field(position)
        
        # F = q(E + v × B)
        v_cross_B = np.cross(velocity, B_field)
        F_lorentz = E_CHARGE * (E_field + v_cross_B)
        
        return F_lorentz
    
    def compute_pinch_force(
        self,
        position: np.ndarray,
        velocity: np.ndarray
    ) -> np.ndarray:
        """
        Compute Z-pinch confinement force.
        
        The pinch force arises from J × B where J is the current density
        and B is the azimuthal field. For a Z-pinch:
        
        F_pinch = -ρ * v_θ^2 / r (radially inward)
        
        Args:
            position: Proton position
            velocity: Proton velocity
            
        Returns:
            Pinch force vector (N)
        """
        r_vec = position - self.config.cavitation_point
        r_perp = np.sqrt(r_vec[0]**2 + r_vec[1]**2)
        
        if r_perp < 1e-15:
            return np.zeros(3)
        
        # Tangential velocity component
        r_perp_hat = np.array([r_vec[0], r_vec[1], 0]) / r_perp
        theta_hat = np.array([-r_vec[1], r_vec[0], 0]) / r_perp
        v_theta = np.dot(velocity, theta_hat)
        
        # Centripetal acceleration for circular motion
        # a = v^2 / r, F = m * a
        F_centripetal = PROTON_MASS * v_theta**2 / r_perp
        
        # Pinch force is inward
        F_pinch = -F_centripetal * r_perp_hat
        
        # Additional magnetic pinch from J × B
        B_theta = self.compute_z_pinch_field(position)
        B_magnitude = np.linalg.norm(B_theta)
        
        # Current density estimate from proton motion
        J_effective = E_CHARGE * velocity[2] / (np.pi * r_perp**2 + 1e-30)
        F_JxB_magnitude = abs(J_effective) * B_magnitude * r_perp
        
        F_pinch -= F_JxB_magnitude * r_perp_hat
        
        return F_pinch
    
    def compute_total_confinement_force(
        self,
        position: np.ndarray,
        velocity: np.ndarray,
        compression_ratio: float = 1.0,
        bubble_radius: float = 1e-6,
        include_pressure: bool = True
    ) -> Dict[str, np.ndarray]:
        """
        Compute total MHD confinement force with all components.
        
        Args:
            position: Proton position
            velocity: Proton velocity
            compression_ratio: Current compression ratio
            bubble_radius: Current bubble radius
            include_pressure: Whether to include pressure gradient
            
        Returns:
            Dictionary with force components and total
        """
        # Individual force components
        B_field = self.compute_z_pinch_field(position)
        E_field = self.compute_radial_electric_field(position)
        
        F_lorentz = self.compute_lorentz_force(position, velocity, B_field, E_field)
        F_pinch = self.compute_pinch_force(position, velocity)
        
        if include_pressure:
            grad_P = self.compute_pressure_gradient(
                position, compression_ratio, bubble_radius
            )
            # Force from pressure gradient: F = -V * grad(P)
            V_proton = 4/3 * np.pi * (0.87e-15)**3  # Proton volume
            F_pressure = -V_proton * grad_P
        else:
            F_pressure = np.zeros(3)
            grad_P = np.zeros(3)
        
        # Total force
        F_total = F_lorentz + F_pinch + F_pressure
        
        return {
            "total": F_total,
            "lorentz": F_lorentz,
            "pinch": F_pinch,
            "pressure": F_pressure,
            "B_field": B_field,
            "E_field": E_field,
            "pressure_gradient": grad_P
        }
    
    def update_confinement_regime(self, compression_ratio: float):
        """
        Update confinement regime based on compression.
        
        Args:
            compression_ratio: Current R_0/R ratio
        """
        if compression_ratio < 2:
            self.regime = ConfinementRegime.WEAK
        elif compression_ratio < 5:
            self.regime = ConfinementRegime.MODERATE
        elif compression_ratio < 10:
            self.regime = ConfinementRegime.STRONG
        else:
            self.regime = ConfinementRegime.EXTREME
    
    def compute_spiral_trajectory_params(
        self,
        position: np.ndarray,
        velocity: np.ndarray,
        compression_ratio: float
    ) -> Dict[str, float]:
        """
        Compute parameters for spiral trajectory toward cavitation.
        
        During collapse, protons spiral inward due to combined
        radial and azimuthal forces.
        
        Args:
            position: Current position
            velocity: Current velocity
            compression_ratio: Compression ratio
            
        Returns:
            Dictionary with spiral parameters
        """
        r_vec = position - self.config.cavitation_point
        r = np.linalg.norm(r_vec)
        v_mag = np.linalg.norm(velocity)
        
        if r < 1e-15 or v_mag < 1e-15:
            return {
                "radial_velocity": 0.0,
                "angular_velocity": 0.0,
                "spiral_pitch": 0.0,
                "turns_to_center": 0.0
            }
        
        r_hat = r_vec / r
        
        # Decompose velocity into radial and tangential
        v_radial = np.dot(velocity, r_hat)
        v_perp = velocity - v_radial * r_hat
        v_tangential = np.linalg.norm(v_perp)
        
        # Angular velocity
        omega = v_tangential / r if r > 1e-12 else 0.0
        
        # Spiral pitch (ratio of inward to tangential motion)
        pitch = abs(v_radial) / (v_tangential + 1e-15)
        
        # Estimate turns to reach center
        if abs(v_radial) > 1e-15:
            time_to_center = r / abs(v_radial)
            turns = omega * time_to_center / (2 * np.pi)
        else:
            turns = float('inf')
        
        return {
            "radial_velocity": v_radial,
            "angular_velocity": omega,
            "spiral_pitch": pitch,
            "turns_to_center": turns,
            "distance_to_cavitation": r
        }


class CavitationSiteGeometry:
    """
    Calculator for cavitation site geometry in the lattice.
    
    Determines the exact location where bubble meets lattice and
    identifies target inter-atomic sites for proton convergence.
    """
    
    def __init__(self, host_material: str = "palladium"):
        """Initialize with host material."""
        self.host_material = host_material
        self.lattice_constant = LATTICE_CONSTANTS.get(host_material, 3.89e-10)
        
        # FCC lattice: octahedral and tetrahedral sites
        self.octahedral_sites = self._generate_octahedral_sites()
        self.tetrahedral_sites = self._generate_tetrahedral_sites()
        
        logger.info(f"Initialized cavitation geometry for {host_material}")
    
    def _generate_octahedral_sites(self) -> np.ndarray:
        """Generate octahedral interstitial sites in FCC unit cell."""
        a = self.lattice_constant
        # Octahedral sites in FCC: edge centers and body center
        sites = np.array([
            [0.5, 0.0, 0.0],
            [0.0, 0.5, 0.0],
            [0.0, 0.0, 0.5],
            [0.5, 0.5, 0.0],
            [0.5, 0.0, 0.5],
            [0.0, 0.5, 0.5],
            [0.5, 0.5, 0.5],  # Body center
        ]) * a
        return sites
    
    def _generate_tetrahedral_sites(self) -> np.ndarray:
        """Generate tetrahedral interstitial sites in FCC unit cell."""
        a = self.lattice_constant
        # Tetrahedral sites in FCC: at 1/4 positions
        sites = np.array([
            [0.25, 0.25, 0.25],
            [0.75, 0.75, 0.25],
            [0.75, 0.25, 0.75],
            [0.25, 0.75, 0.75],
            [0.75, 0.25, 0.25],
            [0.25, 0.75, 0.25],
            [0.25, 0.25, 0.75],
            [0.75, 0.75, 0.75],
        ]) * a
        return sites
    
    def find_nearest_sites(
        self,
        cavitation_point: np.ndarray,
        site_type: str = "octahedral",
        num_sites: int = 6
    ) -> np.ndarray:
        """
        Find nearest interstitial sites to cavitation point.
        
        Args:
            cavitation_point: Position of cavitation
            site_type: "octahedral" or "tetrahedral"
            num_sites: Number of nearest sites to return
            
        Returns:
            Array of site positions
        """
        if site_type == "octahedral":
            base_sites = self.octahedral_sites
        else:
            base_sites = self.tetrahedral_sites
        
        # Generate sites in multiple unit cells around cavitation point
        a = self.lattice_constant
        all_sites = []
        
        for i in range(-2, 3):
            for j in range(-2, 3):
                for k in range(-2, 3):
                    offset = np.array([i, j, k]) * a
                    shifted_sites = base_sites + offset + cavitation_point
                    all_sites.extend(shifted_sites)
        
        all_sites = np.array(all_sites)
        
        # Find nearest to cavitation point
        distances = np.linalg.norm(all_sites - cavitation_point, axis=1)
        nearest_indices = np.argsort(distances)[:num_sites]
        
        return all_sites[nearest_indices]
    
    def compute_cavitation_point(
        self,
        bubble_center: np.ndarray,
        bubble_radius: float,
        lattice_surface_y: float
    ) -> np.ndarray:
        """
        Compute exact cavitation point where bubble meets lattice.
        
        Args:
            bubble_center: Center of bubble
            bubble_radius: Current bubble radius
            lattice_surface_y: Y-coordinate of lattice surface
            
        Returns:
            Cavitation point coordinates
        """
        # Cavitation occurs where bubble contacts lattice surface
        # In our coordinate system, lattice is below bubble
        
        # Point on bubble surface closest to lattice
        direction_to_lattice = np.array([0, -1, 0])  # Downward
        
        cavitation_point = bubble_center + bubble_radius * direction_to_lattice
        
        # Clamp to lattice surface if bubble has reached it
        if cavitation_point[1] > lattice_surface_y:
            cavitation_point[1] = lattice_surface_y
        
        return cavitation_point
    
    def get_target_sites_for_protons(
        self,
        cavitation_point: np.ndarray,
        num_protons: int
    ) -> np.ndarray:
        """
        Get target interstitial sites for proton convergence.
        
        Protons should converge on the nearest octahedral sites
        to the cavitation point, as these are the most energetically
        favorable for hydrogen/proton occupation.
        
        Args:
            cavitation_point: Cavitation point coordinates
            num_protons: Number of protons to place
            
        Returns:
            Array of target site positions
        """
        # Octahedral sites are preferred for hydrogen in Pd
        sites = self.find_nearest_sites(
            cavitation_point, 
            site_type="octahedral",
            num_sites=num_protons
        )
        
        return sites


def create_mhd_confinement_for_bubble(
    bubble_center: np.ndarray,
    bubble_radius: float,
    lattice_surface_y: float,
    host_material: str = "palladium",
    pinch_current: float = 1.0
) -> Tuple[MHDProtonConfinement, CavitationSiteGeometry]:
    """
    Factory function to create MHD confinement system for bubble cavitation.
    
    Args:
        bubble_center: Center of bubble
        bubble_radius: Initial bubble radius
        lattice_surface_y: Y-coordinate of lattice surface
        host_material: Host material type
        pinch_current: Z-pinch current
        
    Returns:
        Tuple of (MHDProtonConfinement, CavitationSiteGeometry)
    """
    geometry = CavitationSiteGeometry(host_material)
    
    cavitation_point = geometry.compute_cavitation_point(
        bubble_center, bubble_radius, lattice_surface_y
    )
    
    config = MHDFieldConfiguration(
        pinch_current=pinch_current,
        pinch_radius=bubble_radius,
        radial_field_strength=1e8,
        reference_distance=bubble_radius,
        cavitation_point=cavitation_point
    )
    
    confinement = MHDProtonConfinement(config)
    
    logger.info(
        f"Created MHD confinement: cavitation at {cavitation_point}, "
        f"material={host_material}"
    )
    
    return confinement, geometry


def compute_proton_trajectory(
    initial_position: np.ndarray,
    initial_velocity: np.ndarray,
    confinement: MHDProtonConfinement,
    compression_ratio: float,
    bubble_radius: float,
    dt: float = 1e-12,
    num_steps: int = 1000
) -> Dict[str, np.ndarray]:
    """
    Compute proton trajectory under MHD confinement.
    
    Uses Velocity Verlet integration for accurate trajectory.
    
    Args:
        initial_position: Starting position
        initial_velocity: Starting velocity
        confinement: MHDProtonConfinement instance
        compression_ratio: Compression ratio
        bubble_radius: Current bubble radius
        dt: Time step (seconds)
        num_steps: Number of integration steps
        
    Returns:
        Dictionary with trajectory arrays
    """
    positions = np.zeros((num_steps, 3))
    velocities = np.zeros((num_steps, 3))
    times = np.zeros(num_steps)
    
    pos = initial_position.copy()
    vel = initial_velocity.copy()
    
    for i in range(num_steps):
        positions[i] = pos
        velocities[i] = vel
        times[i] = i * dt
        
        # Compute force
        forces = confinement.compute_total_confinement_force(
            pos, vel, compression_ratio, bubble_radius
        )
        F = forces["total"]
        
        # Velocity Verlet integration
        acc = F / PROTON_MASS
        pos_new = pos + vel * dt + 0.5 * acc * dt**2
        
        # Force at new position
        forces_new = confinement.compute_total_confinement_force(
            pos_new, vel, compression_ratio, bubble_radius
        )
        acc_new = forces_new["total"] / PROTON_MASS
        
        vel_new = vel + 0.5 * (acc + acc_new) * dt
        
        pos = pos_new
        vel = vel_new
    
    return {
        "positions": positions,
        "velocities": velocities,
        "times": times,
        "final_distance": np.linalg.norm(pos - confinement.config.cavitation_point)
    }
