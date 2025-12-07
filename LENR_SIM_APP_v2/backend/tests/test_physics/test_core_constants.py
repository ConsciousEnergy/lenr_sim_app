"""
Unit Tests for Core Physics Constants
=====================================

Tests to verify that physics constants are correctly defined
and utility functions work as expected.
"""

import pytest
import numpy as np
from app.physics.core_constants import (
    # Fundamental constants
    HBAR, C, E_CHARGE, EPSILON_0, K_BOLTZMANN, A_BOHR, ALPHA,
    M_ELECTRON, M_PROTON, M_NEUTRON, M_DEUTERON, M_TRITON, M_ALPHA,
    AMU,
    # Conversion factors
    EV_TO_J, KEV_TO_J, MEV_TO_J, J_TO_EV, J_TO_KEV, J_TO_MEV,
    # Materials
    MATERIALS, SCREENING_POTENTIALS,
    # Utility functions
    reduced_mass, sommerfeld_parameter, coulomb_barrier, gamow_energy,
    thermal_energy
)


class TestFundamentalConstants:
    """Test fundamental physics constants."""
    
    def test_hbar_value(self):
        """Test reduced Planck constant."""
        assert abs(HBAR - 1.054571817e-34) < 1e-43
    
    def test_speed_of_light(self):
        """Test speed of light."""
        assert C == 299792458.0
    
    def test_electron_charge(self):
        """Test elementary charge."""
        assert abs(E_CHARGE - 1.602176634e-19) < 1e-28
    
    def test_boltzmann_constant(self):
        """Test Boltzmann constant."""
        assert abs(K_BOLTZMANN - 1.380649e-23) < 1e-32
    
    def test_fine_structure_constant(self):
        """Test fine structure constant is approximately 1/137."""
        assert abs(ALPHA - 1/137.035999) < 1e-9


class TestParticleMasses:
    """Test particle mass values."""
    
    def test_electron_mass(self):
        """Test electron mass."""
        assert abs(M_ELECTRON - 9.1093837015e-31) < 1e-40
    
    def test_proton_mass(self):
        """Test proton mass."""
        assert abs(M_PROTON - 1.67262192369e-27) < 1e-36
    
    def test_mass_ordering(self):
        """Test that masses are in correct order."""
        assert M_ELECTRON < M_PROTON < M_NEUTRON
        assert M_PROTON < M_DEUTERON < M_TRITON < M_ALPHA
    
    def test_deuteron_mass(self):
        """Test deuteron is approximately proton + neutron."""
        expected = M_PROTON + M_NEUTRON
        # Allow for binding energy (about 2.2 MeV)
        assert abs(M_DEUTERON - expected) / expected < 0.002


class TestConversionFactors:
    """Test energy conversion factors."""
    
    def test_ev_to_j_roundtrip(self):
        """Test eV conversion roundtrip."""
        energy_ev = 1.0
        energy_j = energy_ev * EV_TO_J
        back_to_ev = energy_j * J_TO_EV
        assert abs(back_to_ev - energy_ev) < 1e-10
    
    def test_kev_to_j_roundtrip(self):
        """Test keV conversion roundtrip."""
        energy_kev = 100.0
        energy_j = energy_kev * KEV_TO_J
        back_to_kev = energy_j * J_TO_KEV
        assert abs(back_to_kev - energy_kev) < 1e-10
    
    def test_mev_to_j_roundtrip(self):
        """Test MeV conversion roundtrip."""
        energy_mev = 10.0
        energy_j = energy_mev * MEV_TO_J
        back_to_mev = energy_j * J_TO_MEV
        assert abs(back_to_mev - energy_mev) < 1e-10
    
    def test_unit_consistency(self):
        """Test that keV = 1000 eV."""
        assert abs(KEV_TO_J - 1000 * EV_TO_J) < 1e-25


class TestMaterials:
    """Test material definitions."""
    
    def test_palladium_exists(self):
        """Test palladium is defined."""
        assert 'palladium' in MATERIALS
    
    def test_palladium_properties(self):
        """Test palladium properties are reasonable."""
        pd = MATERIALS['palladium']
        assert pd.symbol == 'Pd'
        assert pd.atomic_number == 46
        assert 10000 < pd.density < 15000  # kg/m³
        assert 100 < pd.debye_temperature < 500  # K
        assert pd.screening_potential > 0
    
    def test_all_materials_have_required_fields(self):
        """Test all materials have required fields."""
        required_fields = [
            'name', 'symbol', 'atomic_number', 'density',
            'debye_temperature', 'screening_potential'
        ]
        for name, mat in MATERIALS.items():
            for field in required_fields:
                assert hasattr(mat, field), f"{name} missing {field}"


class TestReducedMass:
    """Test reduced mass calculation."""
    
    def test_equal_masses(self):
        """Test reduced mass of equal masses."""
        m = 1.0
        result = reduced_mass(m, m)
        assert abs(result - m/2) < 1e-15
    
    def test_proton_electron(self):
        """Test proton-electron reduced mass."""
        mu = reduced_mass(M_PROTON, M_ELECTRON)
        # Should be close to electron mass
        assert abs(mu - M_ELECTRON) / M_ELECTRON < 0.001
    
    def test_dd_system(self):
        """Test D-D reduced mass."""
        mu = reduced_mass(M_DEUTERON, M_DEUTERON)
        assert abs(mu - M_DEUTERON/2) < 1e-35


class TestSommerfeldParameter:
    """Test Sommerfeld parameter calculation."""
    
    def test_positive_values(self):
        """Test Sommerfeld parameter is positive."""
        eta = sommerfeld_parameter(1, 1, 1.0, M_DEUTERON/2)
        assert eta > 0
    
    def test_scaling_with_z(self):
        """Test eta scales linearly with Z."""
        eta1 = sommerfeld_parameter(1, 1, 1.0, M_DEUTERON/2)
        eta2 = sommerfeld_parameter(2, 2, 1.0, M_DEUTERON/2)
        assert abs(eta2 / eta1 - 4) < 0.01  # Z1*Z2 = 4 vs 1
    
    def test_scaling_with_energy(self):
        """Test eta scales as 1/sqrt(E)."""
        eta1 = sommerfeld_parameter(1, 1, 1.0, M_DEUTERON/2)
        eta4 = sommerfeld_parameter(1, 1, 4.0, M_DEUTERON/2)
        assert abs(eta1 / eta4 - 2) < 0.01


class TestCoulombBarrier:
    """Test Coulomb barrier calculation."""
    
    def test_positive_barrier(self):
        """Test barrier height is positive."""
        Vb = coulomb_barrier(1, 1)
        assert Vb > 0
    
    def test_dd_barrier(self):
        """Test D-D Coulomb barrier."""
        Vb = coulomb_barrier(1, 1)
        # Should be around 300-500 keV for nuclear radius
        assert 100 < Vb < 1000
    
    def test_scaling_with_z(self):
        """Test barrier scales with Z1*Z2."""
        Vb1 = coulomb_barrier(1, 1)
        Vb2 = coulomb_barrier(2, 2)
        assert Vb2 > Vb1


class TestGamowEnergy:
    """Test Gamow energy calculation."""
    
    def test_positive_energy(self):
        """Test Gamow energy is positive."""
        Eg = gamow_energy(1, 1, M_DEUTERON/2)
        assert Eg > 0
    
    def test_dd_gamow_energy(self):
        """Test D-D Gamow energy is reasonable."""
        mu = M_DEUTERON / 2
        Eg = gamow_energy(1, 1, mu)
        # Should be around 1 MeV for D-D
        assert 100 < Eg < 2000  # keV


class TestThermalEnergy:
    """Test thermal energy calculation."""
    
    def test_room_temperature(self):
        """Test thermal energy at room temperature."""
        kT = thermal_energy(300)
        # kT at 300K should be about 0.026 eV = 26 meV
        assert 0.020 < kT < 0.030
    
    def test_scaling_with_temperature(self):
        """Test linear scaling with temperature."""
        kT1 = thermal_energy(300)
        kT2 = thermal_energy(600)
        assert abs(kT2 / kT1 - 2) < 0.01
    
    def test_zero_temperature(self):
        """Test thermal energy at 0 K."""
        kT = thermal_energy(0)
        assert kT == 0

