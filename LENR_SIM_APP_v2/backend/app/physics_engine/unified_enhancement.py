"""
Enhanced Unified Quantum Effect Calculator for LENR Simulation v2
Implements comprehensive quantum tunneling, electron screening, QED effects,
quantum coherence, and nuclear reaction enhancement calculations based on
the advanced Unified LENR Theory. Includes spatial calculation capabilities.
"""

from typing import Dict, Any, List, Optional, Tuple, Callable, Union
import numpy as np
from scipy import constants, special, integrate
from functools import lru_cache
import asyncio
from concurrent.futures import ThreadPoolExecutor
import logging

# Import the grid class
from .common.grid import SimulationGrid

# Set up logging
logger = logging.getLogger(__name__)

class UnifiedEnhancementCalculator:
    """
    Advanced calculator for unified LENR enhancement effects.
    Provides spatial calculation capabilities if a grid is provided.
    """
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """
        Initialize the unified enhancement calculator.
        
        Args:
            config: Configuration dictionary with physical parameters
        """
        self.config = config or {}
        # Extract physical constants from config or use defaults
        constants_dict = self.config.get("constants", {})
        self.hbar = constants_dict.get("hbar", constants.hbar)
        self.e = constants_dict.get("e", constants.e)
        self.eps0 = constants_dict.get("epsilon_0", constants.epsilon_0)
        self.me = constants_dict.get("m_e", constants.m_e)
        self.mp = constants_dict.get("m_p", constants.m_p)
        self.alpha = constants_dict.get("alpha", constants.alpha)
        self.c = constants_dict.get("c", constants.c)
        self.kb = constants_dict.get("k_B", constants.k)
        
        # Cache settings
        self.cache_size = self.config.get("cache_size", 1024)
        
    @lru_cache(maxsize=1024)
    def calculate_tunneling_enhancement(
        self,
        temperature: float,
        electron_density: float,
        electric_field: float,
        lattice_constant: float
    ) -> Dict[str, Any]:
        """
        Calculate quantum tunneling enhancement factor with improved WKB approximation.
        
        Args:
            temperature: System temperature in Kelvin
            electron_density: Electron density in m^-3
            electric_field: Local electric field strength in V/m
            lattice_constant: Lattice parameter in meters
            
        Returns:
            Dict containing enhancement factor and quantum effects details
        """
        # Calculate thermal de Broglie wavelength
        thermal_wavelength = np.sqrt(2 * np.pi * self.hbar**2 / (self.me * self.kb * temperature))
        
        # Calculate effective potential barrier with improved model
        barrier_height, barrier_width = self._calculate_effective_barrier(
            electron_density, 
            electric_field,
            temperature
        )
        
        # Calculate tunneling probability with improved WKB approximation
        tunnel_prob = self._calculate_tunnel_probability(
            barrier_height, 
            barrier_width,
            temperature
        )
        
        # Calculate coherence effects with enhanced model
        coherence_factor = self._calculate_coherence_factor(
            thermal_wavelength, 
            lattice_constant, 
            temperature
        )
        
        # Calculate phonon-assisted tunneling
        phonon_factor = self._calculate_phonon_assistance(
            barrier_height,
            temperature,
            self.config.get("debye_temperature", 275.0)
        )
        
        # Combined enhancement factor with interdependencies
        enhancement = tunnel_prob * coherence_factor * phonon_factor
        
        # Apply non-linear scaling for high enhancement regimes
        if enhancement > 1e5:
            enhancement = 1e5 * np.log10(1 + enhancement / 1e5)
        
        return {
            "enhancement_factor": enhancement,
            "quantum_effects": {
                "thermal_wavelength": thermal_wavelength,
                "barrier_height": barrier_height,
                "barrier_width": barrier_width,
                "tunnel_probability": tunnel_prob,
                "coherence_factor": coherence_factor,
                "phonon_factor": phonon_factor
            }
        }
    
    def _calculate_effective_barrier(
        self, 
        electron_density: float, 
        electric_field: float,
        temperature: float
    ) -> Tuple[float, float]:
        """
        Calculate effective potential barrier height and width considering 
        electron screening, electric field, and finite temperature effects.
        
        Args:
            electron_density: Electron density in m^-3
            electric_field: Local electric field strength in V/m
            temperature: System temperature in Kelvin
            
        Returns:
            Tuple of (barrier_height, barrier_width) in SI units
        """
        # Calculate Debye screening length
        thermal_energy = self.kb * temperature
        debye_length = np.sqrt(self.eps0 * thermal_energy / 
                              (electron_density * self.e**2))
        
        # Calculate Thomas-Fermi screening length for dense electron gas
        fermi_tf_length = np.sqrt(self.eps0 * self.hbar**2 / 
                                (self.me * electron_density**(1/3) * self.e**2))
        
        # Use the smaller of the two screening lengths (more effective screening)
        screening_length = min(debye_length, fermi_tf_length)
        
        # Calculate modified Coulomb potential with exponential screening
        coulomb_factor = self.e**2 / (4 * np.pi * self.eps0)
        nuclear_radius = 2e-15  # Approximate nuclear radius in meters
        screened_potential = coulomb_factor * np.exp(-nuclear_radius/screening_length) / nuclear_radius
        
        # Electric field contribution to lower barrier
        field_contribution = self.e * electric_field * screening_length
        
        # Effective barrier height
        barrier_height = max(0, screened_potential - field_contribution)
        
        # Effective barrier width estimation
        if barrier_height > 0:
            barrier_width = coulomb_factor / barrier_height
        else:
            barrier_width = nuclear_radius
        
        return barrier_height, barrier_width
    
    def _calculate_tunnel_probability(
        self, 
        barrier_height: float, 
        barrier_width: float, 
        temperature: float
    ) -> float:
        """
        Calculate quantum tunneling probability through the barrier using
        improved WKB approximation that accounts for barrier shape.
        
        Args:
            barrier_height: Effective potential barrier height in J
            barrier_width: Effective barrier width in m
            temperature: System temperature in K
            
        Returns:
            Tunneling probability (dimensionless)
        """
        # Reduced mass for D-D fusion (using deuterium mass from config if available)
        m_d = self.config.get("constants", {}).get("m_d", 2.01410177811 * constants.atomic_mass)
        reduced_mass = m_d / 2
        
        # Calculate wave number through barrier
        if barrier_height <= 0:
            return 1.0  # No barrier
        
        k = np.sqrt(2 * reduced_mass * barrier_height) / self.hbar
        
        # Enhanced WKB approximation with barrier shape factor
        # Using a trapezoidal barrier model
        shape_factor = 0.8  # Shape factor < 1 increases tunneling compared to square barrier
        
        # Temperature-dependent quantum correction for tunneling
        # High temperatures can enhance tunneling via thermal activation
        thermal_correction = 1.0 + 0.1 * np.sqrt(self.kb * temperature / barrier_height)
        
        # Final tunneling probability
        tunneling_prob = np.exp(-2 * shape_factor * k * barrier_width) * thermal_correction
        
        # Apply base tunneling factor from configuration
        base_factor = self.config.get("tunneling_factor", 0.001)
        
        # Enhanced probability capped at 1.0
        return min(1.0, tunneling_prob * base_factor)
    
    def _calculate_coherence_factor(
        self, 
        thermal_wavelength: float, 
        lattice_constant: float, 
        temperature: float
    ) -> float:
        """
        Calculate enhanced quantum coherence factor considering collective effects.
        
        Args:
            thermal_wavelength: Thermal de Broglie wavelength in m
            lattice_constant: Lattice parameter in m
            temperature: System temperature in K
            
        Returns:
            Coherence enhancement factor (dimensionless)
        """
        # Ratio of thermal wavelength to lattice spacing
        wavelength_ratio = thermal_wavelength / lattice_constant
        
        # Base coherence factor
        base_coherence = 1 + wavelength_ratio**2
        
        # Enhanced coherence from quantum correlation
        correlation_term = self.config.get("coherence_factor", 0.5) * np.exp(- temperature / 100)
        
        # Vacancy contribution to coherence
        vacancy_concentration = self.config.get("vacancy_concentration", 0.01)
        vacancy_term = 1 + vacancy_concentration * 10  # Enhanced coherence near vacancies
        
        # Combined coherence factor with non-linear scaling
        coherence = base_coherence * vacancy_term * (1 + correlation_term)
        
        return coherence
    
    def _calculate_phonon_assistance(
        self, 
        barrier_height: float, 
        temperature: float, 
        debye_temp: float
    ) -> float:
        """
        Calculate phonon-assisted tunneling enhancement factor.
        
        Args:
            barrier_height: Effective potential barrier height in J
            temperature: System temperature in K
            debye_temp: Debye temperature in K
            
        Returns:
            Phonon-assisted tunneling factor (dimensionless)
        """
        # Phonon energy at Debye frequency
        phonon_energy = self.kb * debye_temp
        
        # Ratio of phonon energy to barrier height
        energy_ratio = min(0.9, phonon_energy / barrier_height)
        
        # Temperature-dependent phonon occupation
        # Using Bose-Einstein statistics
        if temperature > 0:
            n_phonons = 1 / (np.exp(phonon_energy / (self.kb * temperature)) - 1)
        else:
            n_phonons = 0
            
        # Enhanced tunneling due to phonon assistance
        phonon_factor = 1 + energy_ratio * n_phonons
        
        return phonon_factor
    
    @lru_cache(maxsize=1024)
    def calculate_screening_enhancement(
        self,
        temperature: float,
        electron_density: float
    ) -> Dict[str, Any]:
        """
        Calculate electron screening enhancement factor with improved model.
        
        Args:
            temperature: System temperature in Kelvin
            electron_density: Electron density in m^-3
            
        Returns:
            Dict containing screening potential and related parameters
        """
        # Calculate Debye screening length
        thermal_energy = self.kb * temperature
        debye_length = np.sqrt(self.eps0 * thermal_energy / 
                              (electron_density * self.e**2))
        
        # Calculate Thomas-Fermi screening length for dense electron gas
        fermi_tf_length = np.sqrt(self.eps0 * self.hbar**2 / 
                                (self.me * electron_density**(1/3) * self.e**2))
        
        # Use the smaller of the two screening lengths (more effective screening)
        effective_length = min(debye_length, fermi_tf_length)
        
        # Calculate enhanced screening potential
        screening_potential = -(self.e**2 / (4 * np.pi * self.eps0 * effective_length))
        
        # Dynamic screening enhancement using dielectric function
        plasma_frequency = np.sqrt(electron_density * self.e**2 / 
                                 (self.eps0 * self.me))
        
        # Screening enhancement factor
        # Accounts for nonlinear effects at high temperatures
        if temperature > 0:
            # Clip exponent to prevent overflow
            exponent = np.clip(-screening_potential / thermal_energy, -700, 700)
            enhancement = np.exp(exponent)
            
            # Additional enhancement from dynamic effects
            dynamic_factor = 1 + 0.5 * (self.hbar * plasma_frequency / thermal_energy)**2
            
            # Cap individual factors to prevent overflow in multiplication
            enhancement = min(enhancement, 1e150)
            dynamic_factor = min(dynamic_factor, 1e150)
            
            # Combined enhancement with saturation
            total_enhancement = enhancement * dynamic_factor
            
            # Apply non-linear scaling for very high values
            if not np.isfinite(total_enhancement) or total_enhancement > 1e5:
                total_enhancement = 1e5 * np.log10(1 + min(total_enhancement, 1e300) / 1e5) if np.isfinite(total_enhancement) else 1e5
        else:
            total_enhancement = 1.0
        
        return {
            "screening_potential": screening_potential,
            "debye_length": debye_length,
            "fermi_tf_length": fermi_tf_length,
            "effective_length": effective_length,
            "plasma_frequency": plasma_frequency,
            "enhancement_factor": total_enhancement
        }
    
    @lru_cache(maxsize=512)
    def calculate_qed_enhancement(
        self,
        electron_density: float,
        temperature: float
    ) -> Dict[str, Any]:
        """
        Calculate QED vacuum polarization and related effects.
        
        Args:
            electron_density: Electron density in m^-3
            temperature: System temperature in Kelvin
            
        Returns:
            Dict containing QED enhancement factors
        """
        # Calculate vacuum permittivity modification
        # due to strong field QED effects
        thermal_energy = self.kb * temperature
        
        # Schwinger critical field
        e_critical = self.me**2 * self.c**3 / (self.hbar * self.e)
        
        # Estimate local electric field from electron density
        local_field = np.sqrt(electron_density) * self.e / (4 * np.pi * self.eps0)
        
        # Field ratio (dimensionless)
        field_ratio = local_field / e_critical
        
        # Vacuum polarization effect
        vp_factor = 1 + (2 * self.alpha / (3 * np.pi)) * field_ratio**2
        
        # High temperature correction to vacuum polarization
        temp_correction = 1 + 0.1 * np.tanh(temperature / 1000)
        
        # Total QED enhancement
        qed_enhancement = vp_factor * temp_correction
        
        return {
            "vacuum_polarization": vp_factor,
            "temperature_correction": temp_correction,
            "enhancement_factor": qed_enhancement,
            "field_ratio": field_ratio
        }
    
    @lru_cache(maxsize=512)
    def calculate_casimir_enhancement(
        self,
        lattice_constant: float,
        temperature: float
    ) -> Dict[str, Any]:
        """
        Calculate Casimir effect enhancement for nanoscale geometries.
        
        Args:
            lattice_constant: Lattice parameter in meters
            temperature: System temperature in Kelvin
            
        Returns:
            Dict containing Casimir enhancement factors
        """
        # Calculate thermal wavelength
        thermal_wavelength = self.hbar * self.c / (self.kb * temperature)
        
        # Characteristic length for Casimir effect
        casimir_length = lattice_constant * 0.5  # Effective cavity size
        
        # Calculate Casimir energy
        # Simplified model for spherical cavities
        casimir_energy = -self.hbar * self.c * np.pi / (720 * casimir_length**3)
        
        # Temperature correction (finite temperature Casimir effect)
        if temperature > 0 and thermal_wavelength > 0:
            temp_factor = np.tanh(np.pi * casimir_length / thermal_wavelength)
        else:
            temp_factor = 1.0
            
        # Calculate enhancement factor
        if temperature > 0:
            # Relative to thermal energy - clip exponent to prevent overflow
            exponent = np.clip(abs(casimir_energy) / (self.kb * temperature), 0, 700)
            enhancement = np.exp(exponent)
            
            # Apply temperature-dependent scaling
            casimir_enhancement = 1 + (enhancement - 1) * temp_factor
        else:
            casimir_enhancement = 1.0
            
        # Cap enhancement at reasonable value
        casimir_enhancement = min(10.0, casimir_enhancement)
            
        return {
            "casimir_energy": casimir_energy,
            "thermal_wavelength": thermal_wavelength,
            "temperature_factor": temp_factor,
            "enhancement_factor": casimir_enhancement
        }
    
    @lru_cache(maxsize=256)
    def calculate_coherence_enhancement(
        self,
        temperature: float,
        lattice_constant: float
    ) -> Dict[str, Any]:
        """
        Calculate quantum coherence and collective enhancement effects.
        
        Args:
            temperature: System temperature in Kelvin
            lattice_constant: Lattice parameter in meters
            
        Returns:
            Dict containing coherence enhancement factors
        """
        # Calculate thermal de Broglie wavelength for deuterons
        m_d = self.config.get("constants", {}).get("m_d", 2.01410177811 * constants.atomic_mass)
        thermal_wavelength_d = np.sqrt(2 * np.pi * self.hbar**2 / (m_d * self.kb * temperature))
        
        # Coherence length estimation
        coherence_length = thermal_wavelength_d * self.config.get("coherence_factor", 0.5)
        
        # Coherence volume relative to lattice spacing
        volume_ratio = (coherence_length / lattice_constant)**3
        
        # Calculate enhancement from coherent interactions
        # Number of particles in coherence volume
        if volume_ratio > 0:
            n_coherent = min(100, volume_ratio)  # Cap at realistic value
        else:
            n_coherent = 1.0
            
        # Enhancement scales with coherent particles
        coherence_enhancement = np.sqrt(n_coherent)
        
        # Temperature dependence of coherence
        # Lower temperature increases coherence
        temp_factor = 1 + np.exp(-temperature / 500)
        
        # Combined enhancement
        total_enhancement = coherence_enhancement * temp_factor
        
        return {
            "thermal_wavelength": thermal_wavelength_d,
            "coherence_length": coherence_length,
            "coherent_particles": n_coherent,
            "temperature_factor": temp_factor,
            "enhancement_factor": total_enhancement
        }
    
    async def calculate_spatial_enhancement(
        self, 
        spatial_lattice_state: Dict[str, np.ndarray], 
        grid: SimulationGrid,
        lattice_constant: float 
    ) -> Dict[str, np.ndarray]:
        """
        Calculates enhancement factors spatially across the grid.

        Args:
            spatial_lattice_state: Dict containing spatial grids from LatticeSimulator 
                                  (e.g., "temperature_grid", "density_grid", "electric_field_grid"?).
            grid: The SimulationGrid instance.
            lattice_constant: Overall lattice constant (may vary locally later).

        Returns:
            Dict containing NumPy arrays for spatial enhancement factors, e.g.,
             - "total_enhancement_grid"
             - "screening_grid" 
             - ... (other individual factor grids if desired)
        """
        if not grid:
            logger.error("Cannot calculate spatial enhancement without a grid.")
            # Return empty grids matching expected keys but with None or default values
            return {"total_enhancement_grid": None}

        # Extract input grids (handle potential missing keys)
        temp_grid = spatial_lattice_state.get("temperature_grid")
        density_grid = spatial_lattice_state.get("density_grid")
        # Assume electric field is also provided spatially, or use a default/global value
        efield_grid = spatial_lattice_state.get("electric_field_grid", grid.create_empty_grid_data(fill_value=0.0)) 
        
        if temp_grid is None or density_grid is None:
             logger.error("Missing required temperature or density grids for spatial enhancement calculation.")
             return {"total_enhancement_grid": None}

        # Initialize output grids
        total_enhancement_grid = grid.create_empty_grid_data(dtype=np.float64, fill_value=1.0)
        # Optional: Initialize grids for individual factors if needed for detailed output
        # screening_grid = grid.create_empty_grid_data(dtype=np.float64, fill_value=1.0)
        # tunneling_grid = grid.create_empty_grid_data(dtype=np.float64, fill_value=1.0)
        # ... etc.

        # --- Perform cell-by-cell calculation ---
        # Note: This loop can be slow. Vectorization preferred if possible.
        for index in np.ndindex(grid.shape):
            local_temp = temp_grid[index]
            local_density = density_grid[index]
            local_efield = efield_grid[index]

            # Skip calculation if local density or temp are invalid/zero
            if local_density <= 0 or local_temp <= 0:
                total_enhancement_grid[index] = 1.0 # No enhancement if no density/temp
                continue

            try:
                # Calculate individual factors using local values
                tunneling_f = self._calculate_tunneling_contribution(local_temp, local_density, local_efield, lattice_constant)
                screening_f = self._calculate_screening_contribution(local_temp, local_density)
                qed_f = self._calculate_qed_contribution(local_density, local_temp)
                casimir_f = self._calculate_casimir_contribution(lattice_constant, local_temp) # Uses global lattice const for now
                coherence_f = self._calculate_coherence_contribution(local_temp, lattice_constant) # Uses global lattice const for now
                
                # Combine factors (using geometric mean approach like in original total)
                factors = [f for f in [tunneling_f, screening_f, qed_f, casimir_f, coherence_f] if f > 0]
                if factors:
                     log_f = np.log(factors)
                     combined_local = np.exp(np.sum(log_f) / len(factors)) * len(factors)
                     # Apply global factor and scaling
                     combined_local *= self.config.get("enhancement_factor", 1.0)
                     if combined_local > 1e10: combined_local = 1e10 * np.log10(1 + combined_local / 1e10)
                     total_enhancement_grid[index] = max(1.0, combined_local)
                else:
                     total_enhancement_grid[index] = 1.0

                # Store individual factors if needed
                # screening_grid[index] = screening_f
                # tunneling_grid[index] = tunneling_f
                # ...

            except Exception as cell_error:
                 logger.error(f"Error calculating enhancement for cell {index}: {cell_error}", exc_info=False) # Avoid flooding logs
                 total_enhancement_grid[index] = 1.0 # Default on cell error

        # Return dictionary of result grids
        return {
            "total_enhancement_grid": total_enhancement_grid,
            # "screening_grid": screening_grid, # Uncomment if storing individual factors
            # ... etc ...
        }

    def _calculate_tunneling_contribution(
        self,
        temperature: float,
        electron_density: float,
        electric_field: float,
        lattice_constant: float
    ) -> float:
        """ Calculates the tunneling-related component of enhancement. """
        try:
            if temperature <= 0: return 1.0 # Avoid errors at zero temp
            thermal_wavelength = np.sqrt(2 * np.pi * self.hbar**2 / (self.me * self.kb * temperature))
            barrier_height, barrier_width = self._calculate_effective_barrier(electron_density, electric_field, temperature)
            tunnel_prob = self._calculate_tunnel_probability(barrier_height, barrier_width, temperature)
            coherence_factor = self._calculate_coherence_factor(thermal_wavelength, lattice_constant, temperature)
            phonon_factor = self._calculate_phonon_assistance(barrier_height, temperature, self.config.get("debye_temperature", 275.0))
            
            enhancement = tunnel_prob * coherence_factor * phonon_factor
            # Apply non-linear scaling
            if enhancement > 1e5: enhancement = 1e5 * np.log10(1 + enhancement / 1e5)
            return max(1.0, enhancement) # Ensure factor is at least 1
        except Exception as e:
            logger.error(f"Error in tunneling calculation: {e}", exc_info=True)
            return 1.0 # Default to no enhancement on error

    def _calculate_screening_contribution(self, temperature: float, electron_density: float) -> float:
        """ Calculates the screening-related component of enhancement. """
        try:
             if temperature <= 0 or electron_density <= 0: return 1.0

             thermal_energy = self.kb * temperature
             debye_length = np.sqrt(self.eps0 * thermal_energy / (electron_density * self.e**2))
             fermi_tf_length = np.sqrt(self.eps0 * self.hbar**2 / (self.me * electron_density**(1/3) * self.e**2))
             effective_length = min(debye_length, fermi_tf_length)
             screening_potential = -(self.e**2 / (4 * np.pi * self.eps0 * effective_length)) if effective_length > 1e-20 else -np.inf
             
             # Avoid division by zero/invalid ops
             enhancement = 1.0
             dynamic_factor = 1.0
             if thermal_energy > 1e-30:
                  # Clip exponent to prevent overflow
                  exponent = np.clip(-screening_potential / thermal_energy, -700, 700) if screening_potential > -np.inf else 0.0
                  enhancement = np.exp(exponent)
                  plasma_frequency_sq = (electron_density * self.e**2 / (self.eps0 * self.me))
                  if plasma_frequency_sq > 0:
                       plasma_frequency = np.sqrt(plasma_frequency_sq)
                       dynamic_factor = 1 + 0.5 * (self.hbar * plasma_frequency / thermal_energy)**2
                  
             # Cap individual factors to prevent overflow
             enhancement = min(enhancement, 1e150)
             dynamic_factor = min(dynamic_factor, 1e150)
             total_enhancement = enhancement * dynamic_factor
             if not np.isfinite(total_enhancement) or total_enhancement > 1e5:
                 total_enhancement = 1e5 * np.log10(1 + min(total_enhancement, 1e300) / 1e5) if np.isfinite(total_enhancement) else 1e5
             
             return max(1.0, total_enhancement)
        except Exception as e:
             logger.error(f"Error in screening calculation: {e}", exc_info=True)
             return 1.0

    def _calculate_qed_contribution(self, electron_density: float, temperature: float) -> float:
        """ Calculates the QED-related component of enhancement. """
        try:
             if electron_density <= 0 or temperature <= 0: return 1.0
             e_critical = self.me**2 * self.c**3 / (self.hbar * self.e)
             local_field = np.sqrt(electron_density) * self.e / (4 * np.pi * self.eps0)
             field_ratio = local_field / e_critical
             vp_factor = 1 + (2 * self.alpha / (3 * np.pi)) * field_ratio**2
             temp_correction = 1 + 0.1 * np.tanh(temperature / 1000)
             qed_enhancement = vp_factor * temp_correction
             return max(1.0, qed_enhancement)
        except Exception as e:
             logger.error(f"Error in QED calculation: {e}", exc_info=True)
             return 1.0

    def _calculate_casimir_contribution(self, lattice_constant: float, temperature: float) -> float:
        """ Calculates the Casimir-related component of enhancement. """
        try:
             if lattice_constant <= 0: return 1.0
             casimir_length = lattice_constant * 0.5 
             casimir_energy = -self.hbar * self.c * np.pi / (720 * casimir_length**3)
             
             casimir_enhancement = 1.0
             if temperature > 0:
                  thermal_wavelength = self.hbar * self.c / (self.kb * temperature)
                  temp_factor = np.tanh(np.pi * casimir_length / thermal_wavelength) if thermal_wavelength > 0 else 1.0
                  # Clip exponent to prevent overflow
                  exponent = np.clip(abs(casimir_energy) / (self.kb * temperature), 0, 700)
                  enhancement = np.exp(exponent)
                  casimir_enhancement = 1 + (enhancement - 1) * temp_factor
             
             return min(10.0, max(1.0, casimir_enhancement)) # Cap enhancement
        except Exception as e:
             logger.error(f"Error in Casimir calculation: {e}", exc_info=True)
             return 1.0

    def _calculate_coherence_contribution(self, temperature: float, lattice_constant: float) -> float:
        """ Calculates the coherence-related component of enhancement. """
        try:
             if temperature <= 0 or lattice_constant <= 0: return 1.0
             m_d = self.config.get("constants", {}).get("m_d", 2.01410177811 * constants.atomic_mass)
             thermal_wavelength_d = np.sqrt(2 * np.pi * self.hbar**2 / (m_d * self.kb * temperature))
             coherence_length = thermal_wavelength_d * self.config.get("coherence_factor", 0.5)
             volume_ratio = (coherence_length / lattice_constant)**3
             n_coherent = min(100, max(1.0, volume_ratio)) if volume_ratio > 0 else 1.0
             coherence_enhancement = np.sqrt(n_coherent)
             temp_factor = 1 + np.exp(-temperature / 500)
             total_enhancement = coherence_enhancement * temp_factor
             return max(1.0, total_enhancement)
        except Exception as e:
             logger.error(f"Error in coherence calculation: {e}", exc_info=True)
             return 1.0

    # --- Keep Original Non-Spatial Method (Optional) ---
    # Can be used if grid is not provided or for comparison
    async def calculate_total_enhancement(
        self,
        temperature: float,
        electron_density: float,
        electric_field: float,
        lattice_constant: float,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Calculate OVERALL enhancement factor combining all quantum effects.
        Uses global average parameters.
        """
        logger.warning("Calculating non-spatial total enhancement. Use calculate_spatial_enhancement for grid-based results.")
        
        # Use helper methods with global values
        tunneling_res = self._calculate_tunneling_contribution(temperature, electron_density, electric_field, lattice_constant)
        screening_res = self._calculate_screening_contribution(temperature, electron_density)
        qed_res = self._calculate_qed_contribution(electron_density, temperature)
        casimir_res = self._calculate_casimir_contribution(lattice_constant, temperature)
        coherence_res = self._calculate_coherence_contribution(temperature, lattice_constant)
        
        # Combine factors
        factors = [f for f in [tunneling_res, screening_res, qed_res, casimir_res, coherence_res] if f > 0]
        if factors:
            log_f = np.log(factors)
            total_factor = np.exp(np.sum(log_f) / len(factors)) * len(factors)
            total_factor *= self.config.get("enhancement_factor", 1.0)
            if total_factor > 1e10: total_factor = 1e10 * np.log10(1 + total_factor / 1e10)
        else:
            total_factor = 1.0

        return {
            "total_enhancement": max(1.0, total_factor), # Renamed key slightly for clarity
            "factors": { # Provide individual factors
                 "tunneling": tunneling_res,
                 "screening": screening_res,
                 "qed": qed_res,
                 "casimir": casimir_res,
                 "coherence": coherence_res
            },
            "metadata": { # Metadata about inputs used
                "temperature": temperature,
                "electron_density": electron_density,
                "electric_field": electric_field,
                "lattice_constant": lattice_constant,
                "calculation_type": "non-spatial average"
            }
        }

    # Keep async wrapper if needed elsewhere, but not for internal helpers now
    # @staticmethod
    # async def _async_wrapper(func: Callable, *args, **kwargs) -> Any: ... 