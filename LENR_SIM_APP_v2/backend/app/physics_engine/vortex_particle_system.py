"""
Vortex Particle Flow Map System for Proton Dynamics

Inspired by arXiv:2505.21946 - "Fluid Simulation on Vortex Particle Flow Maps" (SIGGRAPH 2025)

This module implements a hybrid Eulerian-Lagrangian approach for tracking proton dynamics
during bubble cavitation in LENR systems. The key insight is that vorticity is an ideal
quantity for evolution on particle flow maps, enabling longer coherent trajectories.

Key Physics:
- Vorticity evolution: d(omega)/dt = (omega . grad)v (vorticity stretching)
- Flow map tracking: Maintains particle trajectories over extended time
- MHD coupling: Lorentz force F = q(v x B) for proton confinement
"""

import numpy as np
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple, Any
from enum import Enum
import logging

logger = logging.getLogger(__name__)

# Physical constants
MU_0 = 4 * np.pi * 1e-7  # Vacuum permeability (H/m)
EPSILON_0 = 8.854e-12    # Vacuum permittivity (F/m)
E_CHARGE = 1.602e-19     # Elementary charge (C)
PROTON_MASS = 1.673e-27  # Proton mass (kg)


class VortexState(Enum):
    """Vortex particle states during bubble collapse cycle."""
    DISPERSED = "dispersed"      # Initial scattered state
    CONVERGING = "converging"    # Moving toward cavitation point
    SPIRAL = "spiral"            # Spiral motion during collapse
    CONFINED = "confined"        # At cavitation site
    REEXPANDING = "reexpanding"  # Post-collapse expansion


@dataclass
class VortexParticle:
    """
    A particle carrying vorticity information in the VPFM framework.
    
    Attributes:
        position: 3D position vector [x, y, z] in meters
        velocity: 3D velocity vector [vx, vy, vz] in m/s
        vorticity: 3D vorticity vector (curl of velocity) in 1/s
        circulation: Scalar circulation strength (Gamma)
        flow_map_origin: Original position for flow map tracking
        flow_map_time: Time since flow map reset
        state: Current vortex state
    """
    position: np.ndarray = field(default_factory=lambda: np.zeros(3))
    velocity: np.ndarray = field(default_factory=lambda: np.zeros(3))
    vorticity: np.ndarray = field(default_factory=lambda: np.zeros(3))
    circulation: float = 0.0
    flow_map_origin: np.ndarray = field(default_factory=lambda: np.zeros(3))
    flow_map_time: float = 0.0
    state: VortexState = VortexState.DISPERSED
    
    # Hessian of flow map for accurate vorticity evolution
    flow_map_hessian: np.ndarray = field(default_factory=lambda: np.eye(3))
    
    def __post_init__(self):
        """Ensure arrays are numpy arrays."""
        self.position = np.asarray(self.position, dtype=np.float64)
        self.velocity = np.asarray(self.velocity, dtype=np.float64)
        self.vorticity = np.asarray(self.vorticity, dtype=np.float64)
        self.flow_map_origin = np.asarray(self.flow_map_origin, dtype=np.float64)
        self.flow_map_hessian = np.asarray(self.flow_map_hessian, dtype=np.float64)


@dataclass
class VortexSystemConfig:
    """Configuration for the vortex particle system."""
    # Grid parameters
    grid_size: Tuple[int, int, int] = (32, 32, 32)
    domain_size: Tuple[float, float, float] = (1e-6, 1e-6, 1e-6)  # meters
    
    # Particle parameters
    num_particles: int = 100
    particle_radius: float = 1e-10  # meters (proton scale)
    
    # Flow map parameters
    max_flow_map_time: float = 1e-6  # seconds before flow map reset
    flow_map_reset_threshold: float = 0.1  # Deformation threshold for reset
    
    # Physics parameters
    viscosity: float = 1e-6  # Kinematic viscosity (m^2/s)
    diffusion_coefficient: float = 1e-9  # Vorticity diffusion
    
    # MHD parameters
    magnetic_field_strength: float = 0.1  # Tesla
    electric_field_strength: float = 1e8  # V/m


class VortexParticleFlowMapSystem:
    """
    Hybrid Eulerian-Lagrangian system for proton dynamics using VPFM methodology.
    
    This system tracks protons as vortex particles, evolving their vorticity
    and using flow maps for accurate trajectory computation. The approach
    enables 3-12x longer coherent flow tracking compared to pure Lagrangian methods.
    """
    
    def __init__(self, config: Optional[VortexSystemConfig] = None):
        """Initialize the vortex particle system."""
        self.config = config or VortexSystemConfig()
        self.particles: List[VortexParticle] = []
        self.time = 0.0
        
        # Eulerian grid for velocity reconstruction
        self.velocity_grid = np.zeros((*self.config.grid_size, 3))
        self.vorticity_grid = np.zeros((*self.config.grid_size, 3))
        self.pressure_grid = np.zeros(self.config.grid_size)
        
        # Cavitation point (updated during simulation)
        self.cavitation_point = np.array([0.0, 0.0, 0.0])
        
        logger.info(f"Initialized VPFM system with {self.config.num_particles} particles")
    
    def initialize_particles(
        self,
        center: np.ndarray,
        radius: float,
        distribution: str = "shell"
    ) -> List[VortexParticle]:
        """
        Initialize vortex particles around a center point.
        
        Args:
            center: Center position for particle distribution
            radius: Radius of initial distribution
            distribution: "shell" for spherical shell, "uniform" for uniform sphere
            
        Returns:
            List of initialized VortexParticle objects
        """
        self.particles = []
        center = np.asarray(center)
        
        for i in range(self.config.num_particles):
            # Generate position based on distribution type
            if distribution == "shell":
                # Uniform distribution on spherical shell
                theta = np.random.uniform(0, 2 * np.pi)
                phi = np.arccos(np.random.uniform(-1, 1))
                r = radius * (0.8 + 0.4 * np.random.random())  # Shell thickness
            else:
                # Uniform distribution in sphere
                theta = np.random.uniform(0, 2 * np.pi)
                phi = np.arccos(np.random.uniform(-1, 1))
                r = radius * np.cbrt(np.random.random())
            
            position = center + r * np.array([
                np.sin(phi) * np.cos(theta),
                np.sin(phi) * np.sin(theta),
                np.cos(phi)
            ])
            
            # Initial velocity: small random + slight inward drift
            to_center = center - position
            to_center_norm = to_center / (np.linalg.norm(to_center) + 1e-12)
            velocity = 0.01 * np.random.randn(3) + 0.001 * to_center_norm
            
            # Initial vorticity: tangential component
            tangent = np.cross(to_center_norm, np.array([0, 0, 1]))
            if np.linalg.norm(tangent) < 0.1:
                tangent = np.cross(to_center_norm, np.array([1, 0, 0]))
            tangent = tangent / (np.linalg.norm(tangent) + 1e-12)
            vorticity = 0.1 * np.random.random() * tangent
            
            particle = VortexParticle(
                position=position,
                velocity=velocity,
                vorticity=vorticity,
                circulation=np.linalg.norm(vorticity) * self.config.particle_radius**2,
                flow_map_origin=position.copy(),
                flow_map_time=0.0,
                state=VortexState.DISPERSED
            )
            self.particles.append(particle)
        
        logger.info(f"Initialized {len(self.particles)} vortex particles around {center}")
        return self.particles
    
    def set_cavitation_point(self, point: np.ndarray):
        """Set the cavitation point (target for proton convergence)."""
        self.cavitation_point = np.asarray(point)
        logger.debug(f"Cavitation point set to {self.cavitation_point}")
    
    def compute_vorticity_stretching(
        self,
        particle: VortexParticle,
        velocity_gradient: np.ndarray
    ) -> np.ndarray:
        """
        Compute vorticity stretching term: (omega . grad)v
        
        This is the key term in vorticity evolution that causes
        vortex tubes to stretch and intensify.
        
        Args:
            particle: VortexParticle with current vorticity
            velocity_gradient: 3x3 gradient tensor of velocity field
            
        Returns:
            Vorticity stretching contribution
        """
        # Vorticity stretching: omega_i * dv_j/dx_i
        stretching = velocity_gradient @ particle.vorticity
        return stretching
    
    def compute_velocity_from_vorticity(self) -> np.ndarray:
        """
        Reconstruct velocity field from vorticity using Biot-Savart law.
        
        This is the Eulerian part of the hybrid approach - we use the
        particle vorticity to reconstruct velocity on the grid.
        
        Returns:
            3D velocity field on the grid
        """
        # Reset velocity grid
        self.velocity_grid.fill(0.0)
        
        # Grid spacing
        dx = self.config.domain_size[0] / self.config.grid_size[0]
        dy = self.config.domain_size[1] / self.config.grid_size[1]
        dz = self.config.domain_size[2] / self.config.grid_size[2]
        
        # For each grid point, sum contributions from all particles
        for i in range(self.config.grid_size[0]):
            for j in range(self.config.grid_size[1]):
                for k in range(self.config.grid_size[2]):
                    grid_pos = np.array([
                        i * dx - self.config.domain_size[0] / 2,
                        j * dy - self.config.domain_size[1] / 2,
                        k * dz - self.config.domain_size[2] / 2
                    ])
                    
                    v = np.zeros(3)
                    for particle in self.particles:
                        r = grid_pos - particle.position
                        r_mag = np.linalg.norm(r) + 1e-12
                        
                        # Biot-Savart kernel (regularized)
                        epsilon = self.config.particle_radius
                        kernel = (r_mag**2 + epsilon**2)**(-1.5) / (4 * np.pi)
                        
                        # v = (Gamma / 4pi) * (omega x r) / |r|^3
                        v += particle.circulation * kernel * np.cross(particle.vorticity, r)
                    
                    self.velocity_grid[i, j, k] = v
        
        return self.velocity_grid
    
    def update_flow_map(self, particle: VortexParticle, dt: float):
        """
        Update flow map quantities for a particle.
        
        The flow map tracks the deformation of fluid elements,
        enabling accurate vorticity evolution over long times.
        
        Args:
            particle: VortexParticle to update
            dt: Time step
        """
        particle.flow_map_time += dt
        
        # Update flow map Hessian (simplified - full implementation would
        # use velocity gradients)
        velocity_gradient = self._estimate_velocity_gradient(particle.position)
        
        # Hessian evolution: dH/dt = (grad v) @ H
        dH = velocity_gradient @ particle.flow_map_hessian
        particle.flow_map_hessian += dH * dt
        
        # Check for flow map reset (when deformation becomes too large)
        hessian_det = np.linalg.det(particle.flow_map_hessian)
        if (particle.flow_map_time > self.config.max_flow_map_time or
            abs(hessian_det - 1.0) > self.config.flow_map_reset_threshold):
            # Reset flow map
            particle.flow_map_origin = particle.position.copy()
            particle.flow_map_time = 0.0
            particle.flow_map_hessian = np.eye(3)
            logger.debug("Flow map reset for particle")
    
    def _estimate_velocity_gradient(self, position: np.ndarray) -> np.ndarray:
        """
        Estimate velocity gradient at a position using finite differences.
        
        Args:
            position: Position to evaluate gradient
            
        Returns:
            3x3 velocity gradient tensor
        """
        h = 1e-10  # Small displacement for finite difference
        grad = np.zeros((3, 3))
        
        for i in range(3):
            pos_plus = position.copy()
            pos_minus = position.copy()
            pos_plus[i] += h
            pos_minus[i] -= h
            
            v_plus = self._interpolate_velocity(pos_plus)
            v_minus = self._interpolate_velocity(pos_minus)
            
            grad[:, i] = (v_plus - v_minus) / (2 * h)
        
        return grad
    
    def _interpolate_velocity(self, position: np.ndarray) -> np.ndarray:
        """
        Interpolate velocity at an arbitrary position from the grid.
        
        Args:
            position: Position to interpolate at
            
        Returns:
            Interpolated velocity vector
        """
        # Simple trilinear interpolation
        dx = self.config.domain_size[0] / self.config.grid_size[0]
        dy = self.config.domain_size[1] / self.config.grid_size[1]
        dz = self.config.domain_size[2] / self.config.grid_size[2]
        
        # Convert to grid coordinates
        x = (position[0] + self.config.domain_size[0] / 2) / dx
        y = (position[1] + self.config.domain_size[1] / 2) / dy
        z = (position[2] + self.config.domain_size[2] / 2) / dz
        
        # Clamp to grid bounds
        x = np.clip(x, 0, self.config.grid_size[0] - 1.001)
        y = np.clip(y, 0, self.config.grid_size[1] - 1.001)
        z = np.clip(z, 0, self.config.grid_size[2] - 1.001)
        
        # Integer and fractional parts
        i, j, k = int(x), int(y), int(z)
        fx, fy, fz = x - i, y - j, z - k
        
        # Trilinear interpolation
        v = (1-fx)*(1-fy)*(1-fz)*self.velocity_grid[i,j,k] + \
            fx*(1-fy)*(1-fz)*self.velocity_grid[min(i+1,self.config.grid_size[0]-1),j,k] + \
            (1-fx)*fy*(1-fz)*self.velocity_grid[i,min(j+1,self.config.grid_size[1]-1),k] + \
            fx*fy*(1-fz)*self.velocity_grid[min(i+1,self.config.grid_size[0]-1),min(j+1,self.config.grid_size[1]-1),k] + \
            (1-fx)*(1-fy)*fz*self.velocity_grid[i,j,min(k+1,self.config.grid_size[2]-1)] + \
            fx*(1-fy)*fz*self.velocity_grid[min(i+1,self.config.grid_size[0]-1),j,min(k+1,self.config.grid_size[2]-1)] + \
            (1-fx)*fy*fz*self.velocity_grid[i,min(j+1,self.config.grid_size[1]-1),min(k+1,self.config.grid_size[2]-1)] + \
            fx*fy*fz*self.velocity_grid[min(i+1,self.config.grid_size[0]-1),min(j+1,self.config.grid_size[1]-1),min(k+1,self.config.grid_size[2]-1)]
        
        return v
    
    def compute_mhd_forces(
        self,
        particle: VortexParticle,
        B_field: np.ndarray,
        E_field: np.ndarray
    ) -> np.ndarray:
        """
        Compute MHD forces on a proton (Lorentz force).
        
        F = q(E + v x B)
        
        Args:
            particle: VortexParticle (proton)
            B_field: Magnetic field vector at particle position
            E_field: Electric field vector at particle position
            
        Returns:
            Force vector in Newtons
        """
        # Lorentz force: F = q(E + v x B)
        v_cross_B = np.cross(particle.velocity, B_field)
        F_lorentz = E_CHARGE * (E_field + v_cross_B)
        
        return F_lorentz
    
    def compute_radial_confinement(
        self,
        particle: VortexParticle,
        pressure_gradient: np.ndarray,
        compression_ratio: float
    ) -> np.ndarray:
        """
        Compute radial confinement force from pressure gradient.
        
        During bubble collapse, the pressure gradient drives particles
        toward the cavitation point.
        
        Args:
            particle: VortexParticle
            pressure_gradient: Pressure gradient at particle position
            compression_ratio: Current bubble compression ratio
            
        Returns:
            Radial confinement force vector
        """
        # Pressure gradient force: F = -V * grad(P)
        V_proton = 4/3 * np.pi * (1e-15)**3  # Proton volume (approx)
        F_pressure = -V_proton * pressure_gradient
        
        # Scale with compression ratio (stronger confinement during collapse)
        F_pressure *= compression_ratio
        
        # Add direct attraction to cavitation point
        to_cavitation = self.cavitation_point - particle.position
        distance = np.linalg.norm(to_cavitation) + 1e-12
        direction = to_cavitation / distance
        
        # Attractive force increases with compression
        F_attraction = 1e-20 * compression_ratio**2 * direction / distance**2
        
        return F_pressure + F_attraction
    
    def update_particle_state(
        self,
        particle: VortexParticle,
        phase: str,
        enhancement: float
    ):
        """
        Update particle state based on collapse phase and enhancement.
        
        Args:
            particle: VortexParticle to update
            phase: Current collapse phase (EXPANSION, COLLAPSE, MINIMUM, etc.)
            enhancement: Current enhancement factor
        """
        distance_to_cavitation = np.linalg.norm(
            particle.position - self.cavitation_point
        )
        
        if phase in ['EXPANSION', 'RECOVERY']:
            particle.state = VortexState.DISPERSED
        elif phase == 'COLLAPSE':
            if distance_to_cavitation < 1e-8:
                particle.state = VortexState.SPIRAL
            else:
                particle.state = VortexState.CONVERGING
        elif phase == 'MINIMUM':
            if distance_to_cavitation < 1e-9:
                particle.state = VortexState.CONFINED
            else:
                particle.state = VortexState.SPIRAL
        elif phase == 'REBOUND':
            particle.state = VortexState.REEXPANDING
    
    def step(
        self,
        dt: float,
        phase: str = "EXPANSION",
        compression_ratio: float = 1.0,
        B_field: Optional[np.ndarray] = None,
        E_field: Optional[np.ndarray] = None,
        pressure_gradient: Optional[np.ndarray] = None,
        enhancement: float = 1.0
    ) -> Dict[str, Any]:
        """
        Advance the vortex particle system by one time step.
        
        Args:
            dt: Time step in seconds
            phase: Current bubble collapse phase
            compression_ratio: Current compression ratio (R_0/R)
            B_field: Magnetic field (default: azimuthal from Z-pinch)
            E_field: Electric field (default: radial toward cavitation)
            pressure_gradient: Pressure gradient field
            enhancement: Current enhancement factor
            
        Returns:
            Dictionary with simulation statistics
        """
        self.time += dt
        
        # Default fields if not provided
        if B_field is None:
            B_field = np.array([0, 0, self.config.magnetic_field_strength])
        if E_field is None:
            E_field = np.array([self.config.electric_field_strength, 0, 0])
        if pressure_gradient is None:
            pressure_gradient = np.zeros(3)
        
        # Statistics
        state_counts = {state: 0 for state in VortexState}
        total_vorticity = np.zeros(3)
        avg_distance = 0.0
        
        for particle in self.particles:
            # Compute forces
            F_mhd = self.compute_mhd_forces(particle, B_field, E_field)
            F_confinement = self.compute_radial_confinement(
                particle, pressure_gradient, compression_ratio
            )
            
            # Total force and acceleration
            F_total = F_mhd + F_confinement
            acceleration = F_total / PROTON_MASS
            
            # Update velocity (with damping for stability)
            damping = 0.99 if phase in ['EXPANSION', 'RECOVERY'] else 0.95
            particle.velocity = damping * particle.velocity + acceleration * dt
            
            # Add spiral motion during collapse
            if phase in ['COLLAPSE', 'MINIMUM']:
                to_cavitation = self.cavitation_point - particle.position
                distance = np.linalg.norm(to_cavitation) + 1e-12
                tangent = np.cross(to_cavitation / distance, np.array([0, 0, 1]))
                tangent_norm = np.linalg.norm(tangent)
                if tangent_norm > 0.1:
                    tangent /= tangent_norm
                    # Spiral velocity component
                    spiral_speed = 0.1 * compression_ratio / (distance * 1e6 + 1)
                    particle.velocity += spiral_speed * tangent * dt
            
            # Update position
            particle.position += particle.velocity * dt
            
            # Update vorticity (stretching term)
            velocity_gradient = self._estimate_velocity_gradient(particle.position)
            stretching = self.compute_vorticity_stretching(particle, velocity_gradient)
            particle.vorticity += stretching * dt
            
            # Vorticity diffusion (viscous effects)
            diffusion = -self.config.diffusion_coefficient * particle.vorticity
            particle.vorticity += diffusion * dt
            
            # Update flow map
            self.update_flow_map(particle, dt)
            
            # Update state
            self.update_particle_state(particle, phase, enhancement)
            
            # Accumulate statistics
            state_counts[particle.state] += 1
            total_vorticity += particle.vorticity
            avg_distance += np.linalg.norm(particle.position - self.cavitation_point)
        
        avg_distance /= len(self.particles)
        
        return {
            "time": self.time,
            "state_counts": {s.value: c for s, c in state_counts.items()},
            "total_vorticity": total_vorticity.tolist(),
            "avg_vorticity_magnitude": np.linalg.norm(total_vorticity) / len(self.particles),
            "avg_distance_to_cavitation": avg_distance,
            "num_confined": state_counts[VortexState.CONFINED],
            "num_spiral": state_counts[VortexState.SPIRAL]
        }
    
    def get_particle_data(self) -> Dict[str, Any]:
        """
        Get current particle data for visualization.
        
        Returns:
            Dictionary with particle positions, velocities, vorticities, and states
        """
        return {
            "positions": [p.position.tolist() for p in self.particles],
            "velocities": [p.velocity.tolist() for p in self.particles],
            "vorticities": [p.vorticity.tolist() for p in self.particles],
            "states": [p.state.value for p in self.particles],
            "circulations": [p.circulation for p in self.particles],
            "cavitation_point": self.cavitation_point.tolist()
        }
    
    def get_vortex_lines(self, num_lines: int = 10) -> List[List[np.ndarray]]:
        """
        Generate vortex lines for visualization.
        
        Traces streamlines through the vorticity field.
        
        Args:
            num_lines: Number of vortex lines to generate
            
        Returns:
            List of vortex lines (each line is a list of points)
        """
        lines = []
        
        # Select seed points from high-vorticity particles
        sorted_particles = sorted(
            self.particles,
            key=lambda p: np.linalg.norm(p.vorticity),
            reverse=True
        )
        
        for i in range(min(num_lines, len(sorted_particles))):
            particle = sorted_particles[i]
            line = self._trace_vortex_line(particle.position, particle.vorticity)
            lines.append(line)
        
        return lines
    
    def _trace_vortex_line(
        self,
        start: np.ndarray,
        direction: np.ndarray,
        steps: int = 50
    ) -> List[np.ndarray]:
        """
        Trace a vortex line from a starting point.
        
        Args:
            start: Starting position
            direction: Initial direction (vorticity)
            steps: Number of integration steps
            
        Returns:
            List of points along the vortex line
        """
        line = [start.copy()]
        pos = start.copy()
        step_size = 1e-9
        
        for _ in range(steps):
            # Get local vorticity direction
            vort = self._interpolate_vorticity(pos)
            vort_mag = np.linalg.norm(vort)
            
            if vort_mag < 1e-10:
                break
            
            # Step along vorticity direction
            pos = pos + step_size * vort / vort_mag
            line.append(pos.copy())
            
            # Boundary check
            if np.any(np.abs(pos) > self.config.domain_size[0]):
                break
        
        return line
    
    def _interpolate_vorticity(self, position: np.ndarray) -> np.ndarray:
        """
        Interpolate vorticity at a position from nearby particles.
        
        Args:
            position: Position to evaluate
            
        Returns:
            Interpolated vorticity vector
        """
        vort = np.zeros(3)
        total_weight = 0.0
        
        for particle in self.particles:
            r = np.linalg.norm(position - particle.position)
            # Gaussian kernel
            sigma = 1e-8
            weight = np.exp(-r**2 / (2 * sigma**2))
            vort += weight * particle.vorticity
            total_weight += weight
        
        if total_weight > 1e-12:
            vort /= total_weight
        
        return vort


def create_vpfm_system_for_lenr(
    bubble_center: np.ndarray,
    bubble_radius: float,
    num_protons: int = 100
) -> VortexParticleFlowMapSystem:
    """
    Factory function to create a VPFM system configured for LENR simulation.
    
    Args:
        bubble_center: Center of the bubble
        bubble_radius: Initial bubble radius
        num_protons: Number of proton particles
        
    Returns:
        Configured VortexParticleFlowMapSystem
    """
    config = VortexSystemConfig(
        grid_size=(16, 16, 16),  # Smaller grid for real-time
        domain_size=(bubble_radius * 10, bubble_radius * 10, bubble_radius * 10),
        num_particles=num_protons,
        particle_radius=1e-15,  # Proton radius
        max_flow_map_time=1e-9,  # Nanosecond timescale
        viscosity=1e-6,
        magnetic_field_strength=0.1,  # 0.1 T
        electric_field_strength=1e8   # 100 MV/m
    )
    
    system = VortexParticleFlowMapSystem(config)
    system.initialize_particles(bubble_center, bubble_radius, distribution="shell")
    system.set_cavitation_point(bubble_center)  # Initial cavitation point at center
    
    return system
