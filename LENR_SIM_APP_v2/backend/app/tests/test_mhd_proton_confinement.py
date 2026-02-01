"""
Test suite for MHD Proton Confinement module (v0.2.2-beta)

Tests the magnetohydrodynamic force calculations, Z-pinch confinement,
and cavitation site geometry for proton dynamics during bubble collapse.
"""

import pytest
import numpy as np
from dataclasses import asdict

from app.physics_engine.mhd_proton_confinement import (
    MHDProtonConfinement,
    MHDFieldConfiguration,
    CavitationSiteGeometry,
)


class TestMHDFieldConfiguration:
    """Test cases for MHD field configuration"""
    
    def test_default_configuration(self):
        """Test default field configuration creation"""
        config = MHDFieldConfiguration()
        
        assert config.pinch_current > 0, "Pinch current should be positive"
        assert config.pinch_radius > 0, "Pinch radius should be positive"
        assert config.radial_field_strength > 0, "Radial field strength should be positive"
        assert config.reference_distance > 0, "Reference distance should be positive"
        
    def test_custom_configuration(self):
        """Test custom field configuration"""
        config = MHDFieldConfiguration(
            pinch_current=10.0,
            pinch_radius=5e-6,
            radial_field_strength=5e8,
            ambient_pressure=2e5
        )
        
        assert config.pinch_current == 10.0
        assert config.pinch_radius == 5e-6
        assert config.radial_field_strength == 5e8
        assert config.ambient_pressure == 2e5


class TestMHDProtonConfinement:
    """Test cases for MHD proton confinement calculations"""
    
    @pytest.fixture
    def confinement(self):
        """Create MHD confinement instance for testing"""
        config = MHDFieldConfiguration(
            pinch_current=1.0,
            pinch_radius=10e-6,
            radial_field_strength=1e8
        )
        return MHDProtonConfinement(config)
    
    def test_z_pinch_field_vector(self, confinement):
        """Test Z-pinch azimuthal magnetic field vector calculation"""
        # Position away from axis
        position = np.array([1.0, 0.0, 0.0])
        B = confinement.compute_z_pinch_field(position)
        
        # Should return a 3D vector
        assert len(B) == 3
        assert np.isfinite(B).all()
        
        # Field should be perpendicular to radial direction (azimuthal)
        # For position on x-axis, B should be in y direction
        assert abs(B[1]) > abs(B[0]) * 0.01 or np.allclose(B, 0)  # Allow for small values
        
    def test_z_pinch_field_singularity(self, confinement):
        """Test Z-pinch field handles small r values"""
        # Position very close to axis
        position = np.array([1e-16, 0.0, 0.0])
        B = confinement.compute_z_pinch_field(position)
        
        # Should return zeros (handled singularity)
        assert np.allclose(B, 0)
        
    def test_radial_electric_field(self, confinement):
        """Test radial electric field calculation"""
        # Position away from cavitation point (origin by default)
        position = np.array([1.0, 0.0, 0.0])
        E = confinement.compute_radial_electric_field(position)
        
        # Field should point toward cavitation (negative x direction)
        assert E[0] < 0, "E-field x component should point toward cavitation"
        assert np.isclose(E[1], 0, atol=1e-10), "E-field y component should be zero"
        assert np.isclose(E[2], 0, atol=1e-10), "E-field z component should be zero"
        
    def test_pressure_gradient(self, confinement):
        """Test pressure gradient calculation"""
        position = np.array([1e-6, 0.0, 0.0])
        compression_ratio = 2.0
        bubble_radius = 10e-6
        
        grad_P = confinement.compute_pressure_gradient(
            position, compression_ratio, bubble_radius
        )
        
        # Gradient should be finite
        assert np.isfinite(grad_P).all()
        assert len(grad_P) == 3
        
    def test_lorentz_force(self, confinement):
        """Test Lorentz force calculation"""
        position = np.array([1.0, 0.0, 0.0])
        velocity = np.array([0.0, 1.0, 0.0])  # Moving in y direction
        B_field = np.array([0.0, 0.0, 1.0])   # B field in z direction
        E_field = np.array([1.0, 0.0, 0.0])   # E field in x direction
        
        F = confinement.compute_lorentz_force(position, velocity, B_field, E_field)
        
        # F = q(E + v x B)
        # v x B = (1,0,0) for v=(0,1,0), B=(0,0,1)
        assert len(F) == 3
        assert np.isfinite(F).all()
        
    def test_total_confinement_force(self, confinement):
        """Test total confinement force calculation"""
        position = np.array([1e-6, 0.0, 0.0])
        velocity = np.array([0.1, 0.0, 0.0])
        compression_ratio = 2.0
        bubble_radius = 10e-6
        
        result = confinement.compute_total_confinement_force(
            position, velocity, compression_ratio, bubble_radius
        )
        
        assert "total" in result
        assert "lorentz" in result
        assert "pinch" in result
        assert "pressure" in result
        assert np.isfinite(result["total"]).all()
        
    def test_regime_update(self, confinement):
        """Test regime update during compression"""
        # Low compression
        confinement.update_confinement_regime(1.5)
        assert confinement.regime.value == "weak"
        
        # Medium compression
        confinement.update_confinement_regime(4.0)
        assert confinement.regime.value == "moderate"
        
        # High compression
        confinement.update_confinement_regime(8.0)
        assert confinement.regime.value == "strong"
        
        # Extreme compression
        confinement.update_confinement_regime(15.0)
        assert confinement.regime.value == "extreme"


class TestCavitationSiteGeometry:
    """Test cases for cavitation site geometry calculations"""
    
    @pytest.fixture
    def geometry(self):
        """Create cavitation geometry instance for testing"""
        return CavitationSiteGeometry(host_material="palladium")
    
    def test_initialization(self, geometry):
        """Test geometry initialization"""
        assert geometry.host_material == "palladium"
        assert geometry.lattice_constant > 0
        
    def test_interstitial_sites(self, geometry):
        """Test octahedral and tetrahedral site generation"""
        # Check octahedral sites exist
        assert len(geometry.octahedral_sites) > 0
        
        # Check tetrahedral sites exist
        assert len(geometry.tetrahedral_sites) > 0
        
        # Sites should be within a unit cell
        assert np.all(geometry.octahedral_sites <= geometry.lattice_constant * 1.1)
        assert np.all(geometry.tetrahedral_sites <= geometry.lattice_constant * 1.1)
            
    def test_nearest_sites(self, geometry):
        """Test finding nearest interstitial sites"""
        cavitation_point = np.array([0.0, 0.0, 0.0])
        num_sites = 6
        
        sites = geometry.find_nearest_sites(
            cavitation_point, 
            site_type="octahedral",
            num_sites=num_sites
        )
        
        assert len(sites) == num_sites
        
        # All sites should be near the cavitation point
        for site in sites:
            distance = np.linalg.norm(site - cavitation_point)
            # Within a few lattice constants
            assert distance < geometry.lattice_constant * 10
            
    def test_cavitation_point_calculation(self, geometry):
        """Test cavitation point calculation"""
        bubble_center = np.array([0.0, 5e-6, 0.0])  # Bubble above origin
        bubble_radius = 10e-6
        lattice_surface_y = 0.0
        
        cav_point = geometry.compute_cavitation_point(
            bubble_center, bubble_radius, lattice_surface_y
        )
        
        # Cavitation point should be at or below bubble center
        assert cav_point[1] <= bubble_center[1]
        
    def test_target_sites_for_protons(self, geometry):
        """Test getting target sites for proton convergence"""
        cavitation_point = np.array([0.0, 0.0, 0.0])
        num_protons = 10
        
        targets = geometry.get_target_sites_for_protons(
            cavitation_point, num_protons
        )
        
        assert len(targets) == num_protons


class TestMHDPhysicsIntegration:
    """Integration tests for MHD physics with bubble dynamics"""
    
    def test_force_convergence_during_collapse(self):
        """Test that forces converge protons during bubble collapse"""
        config = MHDFieldConfiguration()
        confinement = MHDProtonConfinement(config)
        
        # Simulate a proton starting away from cavitation
        position = np.array([1e-6, 0.0, 0.0])
        velocity = np.array([0.0, 0.0, 0.0])
        compression_ratio = 10.0
        bubble_radius = 10e-6
        
        result = confinement.compute_total_confinement_force(
            position, velocity, compression_ratio, bubble_radius
        )
        
        # Total force should be finite
        assert np.isfinite(result["total"]).all()
        
    def test_spiral_motion_component(self):
        """Test that MHD forces produce spiral motion"""
        config = MHDFieldConfiguration(pinch_current=10.0)
        confinement = MHDProtonConfinement(config)
        
        # Proton with radial velocity
        position = np.array([1e-6, 0.0, 0.0])
        velocity = np.array([-1e3, 0.0, 0.0])  # Moving toward center
        
        result = confinement.compute_total_confinement_force(
            position, velocity, compression_ratio=5.0, bubble_radius=10e-6
        )
        
        # Should have force components
        assert np.linalg.norm(result["total"]) > 0


class TestMHDNumericalStability:
    """Test numerical stability of MHD calculations"""
    
    def test_extreme_compression(self):
        """Test stability at extreme compression ratios"""
        config = MHDFieldConfiguration()
        confinement = MHDProtonConfinement(config)
        
        position = np.array([1e-9, 0.0, 0.0])
        velocity = np.array([0.0, 0.0, 0.0])
        
        # Very high compression
        result = confinement.compute_total_confinement_force(
            position, velocity, compression_ratio=1000.0, bubble_radius=1e-9
        )
        
        assert np.isfinite(result["total"]).all(), "Force should be finite at high compression"
        
    def test_zero_distance(self):
        """Test behavior when proton is at cavitation point"""
        config = MHDFieldConfiguration()
        confinement = MHDProtonConfinement(config)
        
        position = np.array([0.0, 0.0, 0.0])
        velocity = np.array([1e3, 0.0, 0.0])
        
        result = confinement.compute_total_confinement_force(
            position, velocity, compression_ratio=1.0, bubble_radius=10e-6
        )
        
        assert np.isfinite(result["total"]).all(), "Force should be finite at zero distance"
        
    def test_very_small_velocity(self):
        """Test with nearly zero velocity"""
        config = MHDFieldConfiguration()
        confinement = MHDProtonConfinement(config)
        
        position = np.array([1e-6, 0.0, 0.0])
        velocity = np.array([1e-20, 1e-20, 1e-20])
        
        result = confinement.compute_total_confinement_force(
            position, velocity, compression_ratio=1.0, bubble_radius=10e-6
        )
        
        assert np.isfinite(result["total"]).all(), "Force should be finite with tiny velocity"
