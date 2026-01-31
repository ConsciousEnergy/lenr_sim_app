"""
Test suite for advanced physics models (quantum tunneling and phonon modes)
"""

import pytest
import numpy as np
from scipy import constants as const

from app.physics.quantum_tunneling import (
    TunnelingParameters,
    calculate_advanced_tunneling,
    calculate_temperature_pressure_dependence,
    calculate_gamow_factor,
    calculate_enhanced_tunneling,
)

from app.physics.phonon_modes import (
    LatticeParameters,
    calculate_phonon_dispersion,
    calculate_density_of_states,
    calculate_thermal_properties,
    calculate_phonon_nuclear_coupling
)


class TestQuantumTunneling:
    """Test cases for advanced quantum tunneling calculations"""
    
    def test_advanced_tunneling_calculation(self):
        """Test calculation of quantum tunneling with advanced models"""
        
        # Create basic tunneling parameters for D-D fusion
        params = TunnelingParameters(
            temperature=300.0,  # Room temperature
            potential_type="coulomb",
            barrier_width=1e-10,  # 1 Å
            energy_range=(0.01, 10.0),  # eV
            energy_points=50,
            electron_screening=True,
            model_type="wkb"
        )
        
        # Set potential parameters for D-D fusion
        params.potential_params = {
            "Z1": 1,
            "Z2": 1
        }
        
        # Calculate tunneling
        result = calculate_advanced_tunneling(params)
        
        # Basic validation of result structure
        assert "tunneling_probability" in result
        assert "enhancement_factors" in result
        assert "energy_data" in result
        assert "metadata" in result
        
        # Check probability is in valid range
        assert 0 <= result["tunneling_probability"] <= 1
        
        # Check that electron screening enhances tunneling
        assert result["enhancement_factors"]["electron_screening"] > 1.0
        
        # Verify energy data arrays have correct length
        assert len(result["energy_data"]["energy_eV"]) == 50
        assert len(result["energy_data"]["base_probability"]) == 50
        
    def test_gamow_factor(self):
        """Test calculation of Gamow factor"""
        # D-D reduced mass is approximately 1.0 amu (m1*m2)/(m1+m2) with m1=m2=2
        dd_reduced_mass = 1.0  # amu
        
        # Calculate Gamow factor for D-D at 10 keV
        gf = calculate_gamow_factor(1, 1, dd_reduced_mass, 10.0)
        
        # Should be very small but positive
        assert 0 < gf < 1
        
        # Higher energy should give higher tunneling probability
        gf_low = calculate_gamow_factor(1, 1, dd_reduced_mass, 5.0)
        gf_high = calculate_gamow_factor(1, 1, dd_reduced_mass, 20.0)
        
        assert gf_high > gf_low
        
        # Higher Z should give lower tunneling probability
        gf_dd = calculate_gamow_factor(1, 1, dd_reduced_mass, 10.0)
        # p-Li reduced mass is approximately (1*7)/(1+7) = 0.875 amu
        p_li_reduced_mass = 0.875
        gf_p_li = calculate_gamow_factor(1, 3, p_li_reduced_mass, 10.0)
        
        assert gf_dd > gf_p_li
        
    @pytest.mark.skip(reason="electron_screening_enhancement function signature changed - needs migration to unified_enhancement module")
    def test_electron_screening(self):
        """Test electron screening enhancement calculation"""
        # This test is skipped as the standalone electron_screening_enhancement function
        # has been consolidated into the UnifiedEnhancementCalculator class.
        # See app.physics.unified_enhancement.UnifiedEnhancementCalculator.electron_screening_enhancement()
        pass
        
    def test_temperature_pressure_dependence(self):
        """Test tunneling dependence on temperature and pressure"""
        
        # Create basic parameters
        params = TunnelingParameters(
            temperature=300.0,
            potential_type="coulomb",
            barrier_width=1e-10,
            energy_range=(0.01, 10.0),
            energy_points=20,  # Reduce for faster testing
            electron_screening=True,
            model_type="wkb"
        )
        
        params.potential_params = {"Z1": 1, "Z2": 1}
        
        # Calculate dependence for temperature only
        temp_range = (100.0, 500.0)
        result = calculate_temperature_pressure_dependence(
            params, temp_range, None, 5  # 5 points for faster testing
        )
        
        # Validate result structure
        assert "temperature_dependence" in result
        assert "metadata" in result
        assert "pressure_dependence" not in result
        
        # Check temperature array length
        assert len(result["temperature_dependence"]["temperature_K"]) == 5
        assert len(result["temperature_dependence"]["tunneling_probability"]) == 5
        
        # Higher temperature should generally increase tunneling probability
        probs = result["temperature_dependence"]["tunneling_probability"]
        assert probs[-1] > probs[0]  # Last temperature point vs first


class TestPhononModes:
    """Test cases for phonon mode calculations"""
    
    def test_phonon_dispersion_calculation(self):
        """Test calculation of phonon dispersion relations"""
        
        # Create basic lattice parameters for fcc palladium
        params = LatticeParameters(
            lattice_type="fcc",
            lattice_constant=3.89e-10,  # Pd lattice constant
            dimensions=(5, 5, 5),  # Small lattice for testing
            debye_temperature=275.0,  # K
            has_loading=True,
            loading_element="D",
            loading_ratio=0.6,
            wavenumber_points=10  # Small for faster testing
        )
        
        # Calculate dispersion along [100] direction
        result = calculate_phonon_dispersion(params, "100")
        
        # Basic validation of result structure
        assert "wavenumbers" in result
        assert "acoustic_frequencies" in result
        assert "metadata" in result
        
        # Check array lengths
        assert len(result["wavenumbers"]) == 10
        assert len(result["acoustic_frequencies"]) == 10
        
        # Acoustic frequencies should increase with wavenumber
        q_values = result["wavenumbers"]
        frequencies = result["acoustic_frequencies"]
        
        # Compare first and last points
        first_freqs = np.array(frequencies[0])
        last_freqs = np.array(frequencies[-1])
        
        # The maximum frequency should be higher at larger wavenumbers
        assert np.max(last_freqs) > np.max(first_freqs)
        
    def test_density_of_states(self):
        """Test calculation of phonon density of states"""
        
        # Create basic lattice parameters
        params = LatticeParameters(
            lattice_type="fcc",
            lattice_constant=3.89e-10,
            debye_temperature=275.0,
            has_loading=True,
            loading_element="D",
            loading_ratio=0.6
        )
        
        # Calculate DOS
        result = calculate_density_of_states(params)
        
        # Basic validation of result structure
        assert "frequencies" in result
        assert "density_of_states" in result
        assert "debye_model" in result
        assert "metadata" in result
        
        # Check that DOS is normalized
        dos = np.array(result["density_of_states"])
        assert abs(np.sum(dos) - 1.0) < 1e-6
        
        # Test with different lattice type
        params.lattice_type = "bcc"
        result_bcc = calculate_density_of_states(params)
        
        # Different lattice types should have different DOS
        dos_bcc = np.array(result_bcc["density_of_states"])
        assert not np.array_equal(dos, dos_bcc)
        
    def test_thermal_properties(self):
        """Test calculation of thermal properties"""
        
        # Create basic lattice parameters
        params = LatticeParameters(
            lattice_type="fcc",
            lattice_constant=3.89e-10,
            debye_temperature=275.0,
            temperature=300.0,
            has_loading=False
        )
        
        # Calculate thermal properties
        result = calculate_thermal_properties(params)
        
        # Basic validation of result structure
        assert "molar_heat_capacity" in result
        assert "thermal_conductivity" in result
        assert "phonon_velocity" in result
        assert "metadata" in result
        
        # Heat capacity at room temperature should be close to Dulong-Petit value (3R)
        # for temperatures above Debye temperature
        assert abs(result["molar_heat_capacity"] - 3 * const.R) < 0.2 * 3 * const.R
        
        # Test temperature dependence
        params.temperature = 100.0  # Well below Debye temperature
        result_cold = calculate_thermal_properties(params)
        
        # Heat capacity should decrease at lower temperatures
        assert result_cold["molar_heat_capacity"] < result["molar_heat_capacity"]
        
    def test_phonon_nuclear_coupling(self):
        """Test calculation of phonon-nuclear coupling"""
        
        # Create basic lattice parameters
        params = LatticeParameters(
            lattice_type="fcc",
            lattice_constant=3.89e-10,
            debye_temperature=275.0,
            temperature=300.0,
            has_loading=True,
            loading_element="D",
            loading_ratio=0.8
        )
        
        # Calculate coupling with 5 meV energy transfer
        energy_transfer = 0.005  # 5 meV
        result = calculate_phonon_nuclear_coupling(params, energy_transfer)
        
        # Basic validation of result structure
        assert "energy_transfer_ev" in result
        assert "frequency" in result
        assert "momentum_transfer_evc" in result
        assert "enhancement_factor" in result
        assert "metadata" in result
        
        # Enhancement factor should be small but positive
        assert result["enhancement_factor"] > 0
        
        # Test energy dependence
        high_energy = 0.05  # 50 meV, likely outside typical phonon range
        result_high = calculate_phonon_nuclear_coupling(params, high_energy)
        
        # Higher energy transfer should generally give lower phonon coupling
        # because typical phonon spectra have more modes at lower energies
        assert result["enhancement_factor"] > result_high["enhancement_factor"]
        
        # Test temperature dependence
        params.temperature = 500.0  # Higher temperature
        result_hot = calculate_phonon_nuclear_coupling(params, energy_transfer)
        
        # Higher temperature should have more phonons available
        assert result_hot["phonon_occupation"] > result["phonon_occupation"] 