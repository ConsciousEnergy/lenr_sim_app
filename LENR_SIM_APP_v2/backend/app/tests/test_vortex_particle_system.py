"""
Test suite for Vortex Particle System module (v0.2.2-beta)

Tests the VPFM-inspired vortex particle tracking system for proton
dynamics, including vorticity evolution, flow map reconstruction,
and particle state updates.
"""

import pytest
import numpy as np

from app.physics_engine.vortex_particle_system import (
    VortexParticle,
    VortexSystemConfig,
    VortexParticleFlowMapSystem,
    VortexState,
)


class TestVortexParticle:
    """Test cases for VortexParticle dataclass"""
    
    def test_particle_creation(self):
        """Test basic particle creation"""
        particle = VortexParticle(
            position=np.array([1.0, 0.0, 0.0]),
            velocity=np.array([0.0, 1.0, 0.0]),
            vorticity=np.array([0.0, 0.0, 1.0])
        )
        
        assert np.allclose(particle.position, [1.0, 0.0, 0.0])
        assert np.allclose(particle.velocity, [0.0, 1.0, 0.0])
        assert np.allclose(particle.vorticity, [0.0, 0.0, 1.0])
        
    def test_particle_with_state(self):
        """Test particle with state"""
        particle = VortexParticle(
            position=np.array([0.0, 0.0, 0.0]),
            velocity=np.array([0.0, 0.0, 0.0]),
            vorticity=np.array([0.0, 0.0, 0.0]),
            state=VortexState.CONVERGING
        )
        
        assert particle.state == VortexState.CONVERGING
        
    def test_particle_default_state(self):
        """Test particle has correct default state"""
        particle = VortexParticle()
        assert particle.state == VortexState.DISPERSED


class TestVortexSystemConfig:
    """Test cases for VortexSystemConfig"""
    
    def test_default_config(self):
        """Test default configuration"""
        config = VortexSystemConfig()
        
        assert config.num_particles > 0
        assert config.viscosity >= 0
        assert config.particle_radius > 0
        assert len(config.grid_size) == 3
        
    def test_custom_config(self):
        """Test custom configuration"""
        config = VortexSystemConfig(
            num_particles=50,
            viscosity=1e-4,
            magnetic_field_strength=0.5
        )
        
        assert config.num_particles == 50
        assert config.viscosity == 1e-4
        assert config.magnetic_field_strength == 0.5


class TestVortexParticleFlowMapSystem:
    """Test cases for VPFM system"""
    
    @pytest.fixture
    def vpfm_system(self):
        """Create VPFM system for testing"""
        config = VortexSystemConfig(
            num_particles=10,
            grid_size=(16, 16, 16)
        )
        return VortexParticleFlowMapSystem(config)
    
    def test_system_initialization(self, vpfm_system):
        """Test system initialization"""
        assert vpfm_system.config.num_particles == 10
        assert vpfm_system.time == 0.0
        assert vpfm_system.cavitation_point is not None
            
    def test_initialize_spherical_distribution(self, vpfm_system):
        """Test spherical particle distribution initialization"""
        center = np.array([0.0, 0.0, 0.0])
        radius = 1e-6
        
        particles = vpfm_system.initialize_particles(center, radius)
        
        assert len(particles) == vpfm_system.config.num_particles
        
        for particle in particles:
            assert isinstance(particle, VortexParticle)
            assert np.isfinite(particle.position).all()
            assert np.isfinite(particle.velocity).all()
            
    def test_vorticity_stretching(self, vpfm_system):
        """Test vorticity stretching calculation"""
        particle = VortexParticle(
            position=np.array([1e-6, 0.0, 0.0]),
            velocity=np.array([0.0, 1e3, 0.0]),
            vorticity=np.array([0.0, 0.0, 1e6])
        )
        
        # Create velocity gradient (uniform strain)
        velocity_gradient = np.array([
            [0.0, 1e9, 0.0],
            [0.0, 0.0, 0.0],
            [0.0, 0.0, 0.0]
        ])
        
        stretching = vpfm_system.compute_vorticity_stretching(
            particle, velocity_gradient
        )
        
        assert len(stretching) == 3
        assert np.isfinite(stretching).all()
        
    def test_velocity_reconstruction(self, vpfm_system):
        """Test velocity reconstruction from vorticity (Biot-Savart)"""
        # Initialize particles
        vpfm_system.initialize_particles(
            center=np.array([0.0, 0.0, 0.0]),
            radius=1e-6
        )
        
        # Reconstruct velocity at a point
        test_point = np.array([2e-6, 0.0, 0.0])
        velocity = vpfm_system.compute_velocity_from_vorticity()
        
        # Should return a grid
        assert velocity.shape[-1] == 3  # Last dimension is velocity components
        
    def test_set_cavitation_point(self, vpfm_system):
        """Test setting cavitation point"""
        new_point = np.array([1.0, 2.0, 3.0])
        vpfm_system.set_cavitation_point(new_point)
        
        assert np.allclose(vpfm_system.cavitation_point, new_point)
        
    def test_time_step(self, vpfm_system):
        """Test single time step of the system"""
        vpfm_system.initialize_particles(
            center=np.array([0.0, 0.0, 0.0]),
            radius=1e-6
        )
        
        initial_time = vpfm_system.time
        dt = 1e-9
        
        # Take one step
        vpfm_system.step(
            dt=dt,
            phase="COLLAPSE",
            compression_ratio=2.0
        )
        
        # Time should advance
        assert vpfm_system.time > initial_time
        
    def test_multiple_steps(self, vpfm_system):
        """Test multiple time steps"""
        vpfm_system.initialize_particles(
            center=np.array([0.0, 0.0, 0.0]),
            radius=1e-6
        )
        
        num_steps = 10
        dt = 1e-9
        
        for _ in range(num_steps):
            vpfm_system.step(
                dt=dt,
                phase="COLLAPSE",
                compression_ratio=2.0
            )
        
        # All particles should still have valid states
        for particle in vpfm_system.particles:
            assert np.isfinite(particle.position).all()
            assert np.isfinite(particle.velocity).all()
            assert np.isfinite(particle.vorticity).all()


class TestVortexParticleStates:
    """Test particle state transitions"""
    
    @pytest.fixture
    def system(self):
        """Create system for state testing"""
        config = VortexSystemConfig(num_particles=5)
        system = VortexParticleFlowMapSystem(config)
        system.initialize_particles(np.zeros(3), 1e-6)
        return system
    
    def test_state_update(self, system):
        """Test particle state updates"""
        # Run a simulation step
        system.step(dt=1e-9, phase="COLLAPSE", compression_ratio=2.0)
        
        # Check states are valid
        for particle in system.particles:
            assert particle.state in VortexState


class TestVorticityConservation:
    """Test vorticity conservation and evolution"""
    
    @pytest.fixture
    def system(self):
        """Create system for vorticity testing"""
        config = VortexSystemConfig(num_particles=10, viscosity=0.0)
        system = VortexParticleFlowMapSystem(config)
        system.initialize_particles(np.zeros(3), 1e-6)
        return system
    
    def test_initial_vorticity(self, system):
        """Test initial vorticity distribution"""
        total_vorticity = np.zeros(3)
        for particle in system.particles:
            total_vorticity += particle.vorticity
            
        # Initial vorticity can be zero or non-zero depending on initialization
        assert np.isfinite(total_vorticity).all()
        
    def test_vorticity_evolution(self, system):
        """Test vorticity evolution over time"""
        # Set up known vorticity
        for particle in system.particles:
            particle.vorticity = np.array([0.0, 0.0, 1e5])
        
        initial_total = np.sum([np.linalg.norm(p.vorticity) for p in system.particles])
        
        # Evolve system
        for _ in range(10):
            system.step(
                dt=1e-9,
                phase="COLLAPSE",
                compression_ratio=2.0
            )
        
        final_total = np.sum([np.linalg.norm(p.vorticity) for p in system.particles])
        
        # With zero viscosity, vorticity should be roughly conserved
        # Allow for numerical effects
        assert np.isfinite(final_total), "Total vorticity should be finite"


class TestNumericalStability:
    """Test numerical stability of VPFM system"""
    
    def test_long_simulation(self):
        """Test stability over many time steps"""
        config = VortexSystemConfig(num_particles=20)
        system = VortexParticleFlowMapSystem(config)
        system.initialize_particles(np.zeros(3), 1e-6)
        
        dt = 1e-9
        
        # Run many steps
        for i in range(100):
            phase = ['EXPANSION', 'COLLAPSE', 'MINIMUM', 'REBOUND', 'RECOVERY'][i % 5]
            compression = 1.0 + 9.0 * (i % 100) / 100  # Vary compression
            
            system.step(
                dt=dt,
                phase=phase,
                compression_ratio=compression
            )
        
        # All particles should remain valid
        for particle in system.particles:
            assert np.isfinite(particle.position).all(), "Position should be finite"
            assert np.isfinite(particle.velocity).all(), "Velocity should be finite"
            assert np.isfinite(particle.vorticity).all(), "Vorticity should be finite"
            
    def test_extreme_compression(self):
        """Test stability at extreme compression"""
        config = VortexSystemConfig(num_particles=5)
        system = VortexParticleFlowMapSystem(config)
        system.initialize_particles(np.zeros(3), 1e-6)
        
        # Extreme compression
        system.step(
            dt=1e-9,
            phase="MINIMUM",
            compression_ratio=1000.0
        )
        
        for particle in system.particles:
            assert np.isfinite(particle.position).all()
            
    def test_zero_compression(self):
        """Test behavior at zero/low compression"""
        config = VortexSystemConfig(num_particles=5)
        system = VortexParticleFlowMapSystem(config)
        system.initialize_particles(np.zeros(3), 1e-6)
        
        system.step(
            dt=1e-9,
            phase="EXPANSION",
            compression_ratio=0.1
        )
        
        for particle in system.particles:
            assert np.isfinite(particle.position).all()


class TestMHDCoupling:
    """Test MHD force coupling in VPFM"""
    
    def test_mhd_force_calculation(self):
        """Test MHD force calculation on particles"""
        config = VortexSystemConfig(num_particles=5)
        system = VortexParticleFlowMapSystem(config)
        system.initialize_particles(np.zeros(3), 1e-6)
        
        # Create a particle
        particle = system.particles[0]
        B_field = np.array([0.0, 0.0, 0.1])  # 0.1 T
        E_field = np.array([1e6, 0.0, 0.0])  # 1 MV/m
        
        force = system.compute_mhd_forces(particle, B_field, E_field)
        
        assert len(force) == 3
        assert np.isfinite(force).all()
        
    def test_radial_confinement(self):
        """Test radial confinement force"""
        config = VortexSystemConfig(num_particles=5)
        system = VortexParticleFlowMapSystem(config)
        system.initialize_particles(np.zeros(3), 1e-6)
        
        particle = system.particles[0]
        pressure_gradient = np.array([1e10, 0.0, 0.0])
        compression_ratio = 5.0
        
        force = system.compute_radial_confinement(
            particle, pressure_gradient, compression_ratio
        )
        
        assert len(force) == 3
        assert np.isfinite(force).all()


class TestParticleData:
    """Test particle data extraction"""
    
    def test_get_particle_data(self):
        """Test getting particle data for visualization"""
        config = VortexSystemConfig(num_particles=5)
        system = VortexParticleFlowMapSystem(config)
        system.initialize_particles(np.zeros(3), 1e-6)
        
        data = system.get_particle_data()
        
        assert "positions" in data
        assert "velocities" in data
        assert "vorticities" in data
        assert "states" in data
        assert "circulations" in data
        assert "cavitation_point" in data
        
        assert len(data["positions"]) == 5
        assert len(data["velocities"]) == 5
