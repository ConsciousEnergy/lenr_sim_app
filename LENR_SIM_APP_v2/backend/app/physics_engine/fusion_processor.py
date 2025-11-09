"""
Enhanced Fusion Processor for LENR Simulation v2
Implements advanced nuclear reaction rate calculations, product simulations,
and energy output predictions based on the Unified LENR Theory.
Includes spatial calculation capabilities.
"""

from typing import Dict, Any, List, Optional, Tuple, Union
import numpy as np
from scipy import constants, integrate
from enum import Enum, auto
import asyncio
from concurrent.futures import ThreadPoolExecutor
import logging

# Import the grid class
from .common.grid import SimulationGrid

# Set up logging
logger = logging.getLogger(__name__)

class ReactionType(Enum):
    """Enumeration of supported nuclear reaction types."""
    DD = auto()  # Deuterium-Deuterium
    DT = auto()  # Deuterium-Tritium
    PD = auto()  # Proton-Deuterium
    PLI6 = auto()  # Proton-Lithium6
    DNI = auto()  # Deuterium-Nickel (LENR specific)
    DPD = auto()  # Deuterium-Palladium (LENR specific)

class ProductType(Enum):
    """Enumeration of reaction product types."""
    NEUTRON = auto()
    PROTON = auto()
    DEUTERON = auto()
    TRITON = auto()
    HELIUM3 = auto()
    HELIUM4 = auto()
    GAMMA = auto()
    ELECTRON = auto()
    ENERGY = auto()  # For energy-only products

class FusionProcessor:
    """
    Advanced processor for nuclear fusion and LENR reactions.
    Handles both non-spatial and spatial reaction rate calculations.
    """
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """
        Initialize the fusion processor with configuration.
        
        Args:
            config: Configuration dictionary
        """
        self.config = config or {}
        # Extract physical constants from config or use defaults
        constants_dict = self.config.get("constants", {})
        self.hbar = constants_dict.get("hbar", constants.hbar)
        self.e = constants_dict.get("e", constants.e)
        self.eps0 = constants_dict.get("epsilon_0", constants.epsilon_0)
        self.kb = constants_dict.get("k_B", constants.k)
        self.c = constants_dict.get("c", constants.c)
        
        # Nuclear masses from constants or config
        self.m_p = constants_dict.get("m_p", constants.m_p)
        self.m_n = constants_dict.get("m_n", constants.m_n)
        self.m_d = constants_dict.get("m_d", 2.01410177811 * constants.atomic_mass)
        self.m_t = constants_dict.get("m_t", 3.0160492 * constants.atomic_mass)
        self.m_he3 = constants_dict.get("m_He3", 3.0160293 * constants.atomic_mass)
        self.m_he4 = constants_dict.get("m_He4", 4.0026032497 * constants.atomic_mass)
        self.m_li6 = constants_dict.get("m_Li6", 6.0151223 * constants.atomic_mass)
        self.m_pd = constants_dict.get("m_Pd", 106.42 * constants.atomic_mass)
        self.m_ni = constants_dict.get("m_Ni", 58.6934 * constants.atomic_mass)
        
        # Initialize reaction cross-section data
        self._initialize_cross_sections()
        
        # Define branching ratios for different reactions
        self.branching_ratios = self.config.get("branching_ratios", {
            "DD": {"He3_n": 0.5, "T_p": 0.5},
            "DT": {"He4_n": 1.0},
            "PD": {"He3_gamma": 1.0},
            "PLI6": {"He4_He3": 1.0},
            "DNI": {"energy": 0.8, "He4": 0.2},  # LENR specific
            "DPD": {"energy": 0.9, "He4": 0.1}   # LENR specific
        })
        
        # Initialize energy release values (MeV) for each reaction
        self.reaction_energies = {
            ReactionType.DD: 3.27,  # Average of the two branches
            ReactionType.DT: 17.6,
            ReactionType.PD: 5.5,
            ReactionType.PLI6: 4.0,
            ReactionType.DNI: 10.0,  # Estimated for LENR
            ReactionType.DPD: 8.0    # Estimated for LENR
        }
        
    def _initialize_cross_sections(self) -> None:
        """Initialize fusion cross-section parameters."""
        # Cross-section parameters for common fusion reactions
        # Format: a0, a1, a2, a3, a4 for parametrized cross-sections
        # Based on analytical fits to experimental data
        self.cross_section_params = {
            ReactionType.DD: [5.5576e4, 2.1054e2, -3.2638e-2, 1.4987e-6, 1.8181e-10],
            ReactionType.DT: [1.3835e5, 1.1262e3, 1.5247e-1, 0.0, 0.0],
            ReactionType.PD: [5.5e3, 6.39e1, 0.0, 0.0, 0.0],
            ReactionType.PLI6: [2.7e3, 3.15e1, 0.0, 0.0, 0.0],
            # Parameterized models for LENR reactions (theoretical)
            ReactionType.DNI: [1.0e3, 5.0e1, 1.0e-2, 0.0, 0.0],
            ReactionType.DPD: [8.0e2, 4.0e1, 8.0e-3, 0.0, 0.0]
        }
        
        # Energy (keV) at which each reaction cross-section peaks
        self.peak_energy = {
            ReactionType.DD: 650.0,
            ReactionType.DT: 70.0,
            ReactionType.PD: 500.0,
            ReactionType.PLI6: 300.0,
            ReactionType.DNI: 8.0,   # Much lower for LENR
            ReactionType.DPD: 5.0    # Much lower for LENR
        }
    
    def _calculate_cross_section(
        self, 
        reaction_type: ReactionType, 
        energy_keV: float
    ) -> float:
        """
        Calculate fusion cross-section using parameterized formulas.
        
        Args:
            reaction_type: Type of nuclear reaction
            energy_keV: Center-of-mass energy in keV
            
        Returns:
            Cross-section in barns (1e-28 m²)
        """
        # Avoid negative or zero energies
        if energy_keV <= 0:
            return 0.0
            
        # Get parameters for the specific reaction
        params = self.cross_section_params.get(reaction_type)
        if not params:
            return 0.0
            
        # Calculate cross-section using common parameterization
        # σ(E) = S(E)/(E * exp(B_G/√E))
        # Where S(E) is the astrophysical S-factor
        # and B_G is related to the Gamow factor
        
        # For standard fusion reactions
        if reaction_type in [ReactionType.DD, ReactionType.DT, ReactionType.PD, ReactionType.PLI6]:
            # Calculate S-factor polynomial: S(E) = a0 + a1*E + a2*E² + a3*E³ + a4*E⁴
            s_factor = params[0]
            for i in range(1, len(params)):
                s_factor += params[i] * energy_keV**i
                
            # Calculate Gamow factor for the specific reaction
            gamow_factor = self._calculate_gamow_factor(reaction_type)
            
            # Calculate cross-section
            cross_section = s_factor / (energy_keV * np.exp(gamow_factor / np.sqrt(energy_keV)))
            
            return cross_section
        
        # For LENR-specific reactions, use modified model with enhancement
        else:
            # Get enhancement factor
            enhancement = self.config.get("enhancement_factor", 1.0)
            
            # Modified cross-section model for low-energy LENR reactions
            # Includes tunneling enhancement and resonance effects
            s_factor = params[0] * (1 + params[1] * np.exp(-(energy_keV - self.peak_energy[reaction_type])**2 / params[2]))
            
            # Calculate modified Gamow factor (reduced for LENR)
            gamow_factor = self._calculate_gamow_factor(reaction_type) * 0.1
            
            # Calculate enhanced cross-section
            cross_section = enhancement * s_factor / (energy_keV * np.exp(gamow_factor / np.sqrt(energy_keV)))
            
            return cross_section
    
    def _calculate_gamow_factor(self, reaction_type: ReactionType) -> float:
        """
        Calculate Gamow factor for tunneling through Coulomb barrier.
        
        Args:
            reaction_type: Type of nuclear reaction
            
        Returns:
            Gamow factor (dimensionless)
        """
        # Reduced mass and charges for different reactions
        if reaction_type == ReactionType.DD:
            reduced_mass = self.m_d / 2
            z1, z2 = 1, 1
        elif reaction_type == ReactionType.DT:
            reduced_mass = (self.m_d * self.m_t) / (self.m_d + self.m_t)
            z1, z2 = 1, 1
        elif reaction_type == ReactionType.PD:
            reduced_mass = (self.m_p * self.m_d) / (self.m_p + self.m_d)
            z1, z2 = 1, 1
        elif reaction_type == ReactionType.PLI6:
            reduced_mass = (self.m_p * self.m_li6) / (self.m_p + self.m_li6)
            z1, z2 = 1, 3
        elif reaction_type == ReactionType.DNI:
            reduced_mass = (self.m_d * self.m_ni) / (self.m_d + self.m_ni)
            z1, z2 = 1, 28
        elif reaction_type == ReactionType.DPD:
            reduced_mass = (self.m_d * self.m_pd) / (self.m_d + self.m_pd)
            z1, z2 = 1, 46
        else:
            return 0.0
            
        # Calculate Gamow factor: B_G = π * α * Z1 * Z2 * √(2 * μ * c²)/sqrt(unit_energy)
        alpha = constants.alpha  # Fine structure constant
        unit_energy = 1000 * constants.e  # 1 keV in Joules
        
        gamow_factor = np.pi * alpha * z1 * z2 * np.sqrt(2 * reduced_mass * self.c**2 / unit_energy)
        
        return gamow_factor
    
    # --- NEW: Synchronous helper for local rate coefficient --- 
    def _calculate_rate_coefficient_local(self, reaction_type: ReactionType, temperature_keV: float) -> float:
        """Calculates the Maxwell-Boltzmann averaged rate coefficient <σv> for local temperature."""
        if temperature_keV <= 0:
            return 0.0
            
        try:
            # Define integrand function σ(E) * v * f(E,T) / (Integral[E*f(E,T) dE])
            # Note: Normalization factor is calculated separately
            def integrand(energy_keV):
                if energy_keV <= 0: return 0.0
                energy_J = energy_keV * 1000 * constants.e
                # Call the existing cross-section method
                cross_section = self._calculate_cross_section(reaction_type, energy_keV)
                cross_section_m2 = cross_section * 1e-28
                
                # Determine reduced mass for velocity calculation
                if reaction_type == ReactionType.DD: reduced_mass = self.m_d / 2
                elif reaction_type == ReactionType.DT: reduced_mass = (self.m_d * self.m_t) / (self.m_d + self.m_t)
                # Add other reaction types for accurate reduced mass if needed
                else: reduced_mass = self.m_p # Approximation for others
                
                # Avoid sqrt of negative or zero
                if energy_J <= 0 or reduced_mass <= 0: return 0.0
                velocity = np.sqrt(2 * energy_J / reduced_mass)
                
                # Maxwell-Boltzmann factor (unnormalized distribution * energy)
                exp_arg = -energy_keV / temperature_keV
                # Avoid overflow/underflow in exp
                if exp_arg < -700: return 0.0
                maxwell_factor = energy_keV * np.exp(exp_arg)
                return cross_section_m2 * velocity * maxwell_factor

            # Calculate normalization factor: Integral[E * exp(-E/T)] dE = T^2
            norm = temperature_keV**2 
            if norm <= 0: return 0.0

            # Integrate over energy range
            energy_min_keV = 0.01 # Start slightly above zero
            # Integrate out to multiple times the thermal energy, prevent excessively large ranges
            energy_max_keV = min(1000.0, max(10.0, 20 * temperature_keV)) 
            integral, abserr = integrate.quad(integrand, energy_min_keV, energy_max_keV, limit=100, epsabs=1e-10, epsrel=1e-8)
            
            # Rate coefficient = Integral / Normalization
            rate_coefficient = integral / norm # m^3/s
            return max(0.0, rate_coefficient) # Ensure non-negative
            
        except (FloatingPointError, OverflowError, integrate.IntegrationWarning) as e:
            logger.warning(f"Integration issue for {reaction_type.name} at T={temperature_keV:.2f} keV: {e}")
            return 0.0 # Return 0 on integration error/warning
        except Exception as e:
            # Log less severe error for calculation issues
            logger.error(f"Error calculating local rate coefficient for {reaction_type.name} at T={temperature_keV:.2f} keV: {e}", exc_info=False)
            return 0.0
    
    # --- NEW: Spatial Rate Calculation Method --- 
    async def calculate_spatial_reaction_rates(
        self,
        spatial_lattice_state: Dict[str, np.ndarray],
        spatial_enhancement_results: Dict[str, np.ndarray],
        grid: SimulationGrid,
        reaction_types: Optional[List[ReactionType]] = None # Specify which reactions to calculate
    ) -> Dict[str, np.ndarray]:
        """
        Calculates reaction rates spatially across the grid.

        Args:
            spatial_lattice_state: Dict containing spatial grids (e.g., temperature_grid, density_grid).
            spatial_enhancement_results: Dict containing spatial enhancement grids (e.g., total_enhancement_grid).
            grid: The SimulationGrid instance.
            reaction_types: Optional list of ReactionType enums to calculate. Defaults to DD, DNI, DPD.

        Returns:
            Dict mapping reaction type names (e.g., "DD_rate_grid") to NumPy arrays of reaction rates (reactions/m³/s).
        """
        if not grid:
            logger.error("Cannot calculate spatial rates without a grid.")
            return {}

        # Extract required input grids
        temp_grid = spatial_lattice_state.get("temperature_grid")
        # Assuming density_grid represents the mobile reactant (e.g., Deuterium)
        reactant_density_grid = spatial_lattice_state.get("density_grid") 
        enhancement_grid = spatial_enhancement_results.get("total_enhancement_grid")
        # Placeholder for host atom density grid - needs to be generated by LatticeSimulator
        host_density_grid = spatial_lattice_state.get("host_density_grid", grid.create_empty_grid_data(fill_value=1e28)) # Default placeholder
        
        if temp_grid is None or reactant_density_grid is None or enhancement_grid is None:
             logger.error("Missing required input grids (temperature, density, or enhancement) for spatial rate calculation.")
             return {}
             
        if not (temp_grid.shape == grid.shape and 
                reactant_density_grid.shape == grid.shape and 
                enhancement_grid.shape == grid.shape and
                host_density_grid.shape == grid.shape) : # Check host grid shape too
            logger.error("Input grid shapes do not match simulation grid shape.")
            return {}

        if reaction_types is None:
            # Default to common LENR types if not specified
            reaction_types = [ReactionType.DD, ReactionType.DNI, ReactionType.DPD]
            
        output_rates = {}
        # Initialize output grids
        for r_type in reaction_types:
             output_rates[f"{r_type.name}_rate_grid"] = grid.create_empty_grid_data(dtype=np.float64)
        
        # --- Perform cell-by-cell calculation --- 
        # TODO: Consider vectorization or parallel execution for performance.
        for index in np.ndindex(grid.shape):
            local_temp = temp_grid[index]
            local_reactant_density = reactant_density_grid[index] 
            local_host_density = host_density_grid[index] # Needed for D-Host reactions
            local_enhancement = enhancement_grid[index]

            # Skip if densities or temperature are non-physical
            if local_reactant_density <= 0 or local_temp <= 0:
                continue

            local_temp_keV = local_temp * self.kb / (1000 * constants.e)
            if local_temp_keV <= 0: continue
            
            for r_type in reaction_types:
                # Get local rate coefficient <σv>
                rate_coeff = self._calculate_rate_coefficient_local(r_type, local_temp_keV)
                
                # Calculate local rate = <σv> * n1 * n2 * enhancement
                if r_type == ReactionType.DD:
                    # Factor of 0.5 for identical particles D + D ->
                    n_factor = 0.5 * local_reactant_density**2 
                elif r_type in [ReactionType.DNI, ReactionType.DPD]:
                    # For D + Host -> 
                    if local_host_density <= 0: continue # Skip if no host atoms
                    n_factor = local_reactant_density * local_host_density
                elif r_type == ReactionType.DT:
                    # Requires Tritium density grid (n_T)
                    # n_T = spatial_lattice_state.get("tritium_density_grid")[index]
                    # n_factor = local_reactant_density * n_T
                    n_factor = 0 # Placeholder - DT requires tritium density
                elif r_type == ReactionType.PD or r_type == ReactionType.PLI6:
                    # Requires Proton density grid (n_P)
                    # n_P = spatial_lattice_state.get("proton_density_grid")[index]
                    # n_factor = n_P * local_reactant_density (for PD)
                    n_factor = 0 # Placeholder
                else:
                     n_factor = local_reactant_density**2 # Fallback, maybe log warning
                
                local_rate = rate_coeff * n_factor * local_enhancement
                
                output_rates[f"{r_type.name}_rate_grid"][index] = max(0.0, local_rate)
                
        logger.info(f"Completed spatial reaction rate calculation for types: {[rt.name for rt in reaction_types]}")
        return output_rates
        
    # --- Keep Original Non-Spatial Method (Modified) --- 
    async def calculate_reaction_rate(
        self,
        reaction_type: ReactionType,
        density: float,
        temperature: float,
        enhancement_factor: Optional[float] = 1.0 # Default to 1 if None
    ) -> Dict[str, Any]:
        """
        Calculate the OVERALL nuclear reaction rate for given average conditions.
        Uses the synchronous local rate coefficient helper.
        """
        logger.warning("Calculating non-spatial reaction rate. Use calculate_spatial_reaction_rates for grid-based results.")
        if enhancement_factor is None: enhancement_factor = 1.0
        if temperature <= 0 or density <= 0: 
            return {"total_rate": 0.0, "rate_coefficient": 0.0, "enhancement": enhancement_factor}
            
        temperature_keV = temperature * self.kb / (1000 * constants.e)
        if temperature_keV <= 0: 
             return {"total_rate": 0.0, "rate_coefficient": 0.0, "enhancement": enhancement_factor}

        # Call the synchronous helper with average values
        rate_coefficient = self._calculate_rate_coefficient_local(reaction_type, temperature_keV)
                    
        # Calculate total rate
        # Assuming density is n_D. Apply 0.5 factor for identical reactants (DD).
        if reaction_type == ReactionType.DD:
            n_factor = 0.5 * density**2 
        # For D-Host reactions, this requires avg host density from config/params
        elif reaction_type in [ReactionType.DNI, ReactionType.DPD]:
             # This needs refinement - where does avg host density come from?
             avg_host_density = self.config.get("average_host_density", 1e28) # Example placeholder
             n_factor = density * avg_host_density
        # Add other reaction types (DT, PD, PLI6) if needed, requiring n_T, n_P etc.
        else:
            n_factor = density**2 # Fallback assumes n1=n2=density
            
        total_rate = rate_coefficient * n_factor * enhancement_factor
                
        rate_data = {
                    "rate_coefficient": rate_coefficient,
            "total_rate": max(0.0, total_rate),
                    "enhancement": enhancement_factor
                }
        
        # Add metadata
        rate_data.update({
            "reaction_type": reaction_type.name,
            "density": density,
            "temperature": temperature,
            "temperature_keV": temperature_keV,
            "energy_release": self.reaction_energies.get(reaction_type, 0.0),
            "calculation_type": "non-spatial average"
        })
        
        return rate_data
    
    async def simulate_reaction_products(
        self,
        reaction_type: ReactionType,
        n_events: int = 1000
    ) -> Dict[str, Any]:
        """
        Simulate the products of fusion reactions with energy and angle distributions.
        
        Args:
            reaction_type: Type of nuclear reaction
            n_events: Number of reaction events to simulate
            
        Returns:
            Dict containing reaction products data
        """
        # Define product channels and energy distributions
        product_channels = self._get_reaction_channels(reaction_type)
        
        # Use thread pool for simulation
        def _simulate_products():
            try:
                # Randomly select channels based on branching ratios
                channel_counts = {}
                selected_channels = []
                
                # Get branching ratios for this reaction
                branching_key = reaction_type.name
                branching = self.branching_ratios.get(branching_key, {"energy": 1.0})
                
                # Initialize counts
                for channel in branching:
                    channel_counts[channel] = 0
                
                # Select channels based on probabilities
                for _ in range(n_events):
                    # Random selection based on branching ratios
                    r = np.random.random()
                    cumulative = 0
                    selected = None
                    
                    for channel, ratio in branching.items():
                        cumulative += ratio
                        if r <= cumulative:
                            selected = channel
                            break
                    
                    if selected:
                        selected_channels.append(selected)
                        channel_counts[selected] = channel_counts.get(selected, 0) + 1
                
                # Calculate energy distributions for each product
                product_data = {}
                for channel, products in product_channels.items():
                    if channel_counts.get(channel, 0) > 0:
                        # Calculate energy distributions
                        energies = {}
                        for product, energy_fraction in products.items():
                            # Total reaction energy
                            total_energy = self.reaction_energies.get(reaction_type, 0.0)
                            
                            # Calculate product energy (slightly randomized)
                            product_energies = []
                            for _ in range(channel_counts[channel]):
                                # Add some energy spread (±5%)
                                energy = total_energy * energy_fraction * (1 + np.random.normal(0, 0.05))
                                product_energies.append(energy)
                            
                            energies[product] = product_energies
                        
                        product_data[channel] = energies
                
                return {
                    "n_events": n_events,
                    "channel_counts": channel_counts,
                    "product_data": product_data
                }
            except Exception as e:
                logger.error(f"Error in reaction product simulation: {str(e)}")
                return {
                    "n_events": n_events,
                    "error": str(e)
                }
        
        # Run simulation in thread pool
        with ThreadPoolExecutor() as executor:
            product_data = await asyncio.get_event_loop().run_in_executor(
                executor, _simulate_products
            )
        
        # Add metadata
        product_data.update({
            "reaction_type": reaction_type.name,
            "total_energy_release": self.reaction_energies.get(reaction_type, 0.0)
        })
        
        return product_data
    
    def _get_reaction_channels(
        self, 
        reaction_type: ReactionType
    ) -> Dict[str, Dict[str, float]]:
        """
        Get reaction channels and product energy fractions.
        
        Args:
            reaction_type: Type of nuclear reaction
            
        Returns:
            Dict mapping channel names to product energy fractions
        """
        # Energy fractions for different products based on kinematics
        if reaction_type == ReactionType.DD:
            return {
                "He3_n": {"He3": 0.75, "n": 0.25},
                "T_p": {"T": 0.75, "p": 0.25}
            }
        elif reaction_type == ReactionType.DT:
            return {
                "He4_n": {"He4": 0.2, "n": 0.8}
            }
        elif reaction_type == ReactionType.PD:
            return {
                "He3_gamma": {"He3": 0.98, "gamma": 0.02}
            }
        elif reaction_type == ReactionType.PLI6:
            return {
                "He4_He3": {"He4": 0.5, "He3": 0.5}
            }
        elif reaction_type == ReactionType.DNI:
            return {
                "energy": {"energy": 1.0},
                "He4": {"He4": 1.0}
            }
        elif reaction_type == ReactionType.DPD:
            return {
                "energy": {"energy": 1.0},
                "He4": {"He4": 1.0}
            }
        else:
            return {"energy": {"energy": 1.0}}
    
    # --- Modified Power Output for Spatial Data --- 
    def calculate_power_output(
        self,
        # Either accept spatial rates OR non-spatial rates for flexibility
        reaction_rates: Union[Dict[str, np.ndarray], Dict[ReactionType, float]], 
        # Grid is needed only if spatial rates are provided
        grid: Optional[SimulationGrid] = None, 
        # Volume needed only if non-spatial rates are provided
        volume: Optional[float] = None        
    ) -> Dict[str, Any]:
        """
        Calculate total power output by integrating spatial reaction rates over the grid volume,
        OR by using average rates and a total volume.
        
        Args:
            reaction_rates: Either Dict mapping reaction type names (e.g., "DD_rate_grid") 
                              to NumPy arrays of reaction rates (reactions/m³/s) for spatial calculation,
                              OR Dict mapping ReactionType enums to average rates (reactions/m³/s) 
                              for non-spatial calculation.
            grid: The SimulationGrid instance (required for spatial calculation).
            volume: Total reaction volume in m³ (required for non-spatial calculation).
            
        Returns:
            Dict containing total power output data.
        """
        total_power = 0.0
        power_by_reaction = {}
        calculation_mode = "unknown"
        processed_volume = 0.0

        # --- Spatial Calculation Path --- 
        # Check if first value in dict is a numpy array and grid is provided
        first_val = next(iter(reaction_rates.values()), None)
        if isinstance(first_val, np.ndarray) and grid and grid.cell_volume > 0:
            calculation_mode = "spatial"
            volume_element = grid.cell_volume # m^3
            processed_volume = grid.nx * grid.ny * grid.nz * volume_element
            
            for reaction_key, rate_grid in reaction_rates.items():
                 # Check if the key corresponds to a rate grid and the grid is not None
                 if rate_grid is None or not isinstance(rate_grid, np.ndarray) or not reaction_key.endswith("_rate_grid"): 
                     continue
                 
                 try:
                     # Extract reaction type from key
                     reaction_type_name = reaction_key.replace("_rate_grid", "")
                     reaction_type = ReactionType[reaction_type_name] # Convert string back to enum
                     
                     # Get energy release per reaction (MeV)
                     energy_MeV = self.reaction_energies.get(reaction_type, 0.0)
                     energy_J = energy_MeV * 1.602e-13 # Joules per reaction
            
                     # Integrate rate over volume: Sum(rate_in_cell * cell_volume)
                     # Ensure rates are non-negative before summing
                     total_rate_in_volume = np.sum(np.maximum(0.0, rate_grid)) * volume_element # reactions/s in total volume
            
                     # Calculate power for this reaction type
                     power = total_rate_in_volume * energy_J # Watts
            
                     power_by_reaction[reaction_type_name] = power
                     total_power += power
            
                 except KeyError: 
                      logger.warning(f"Reaction type '{reaction_type_name}' derived from key '{reaction_key}' not found in ReactionType enum.")
                 except ValueError as e:
                      logger.warning(f"Could not process reaction type {reaction_key}: {e}")
                 except Exception as e:
                      logger.error(f"Error calculating power for {reaction_key}: {e}", exc_info=True)
        
        # --- Non-Spatial Calculation Path --- 
        # Check if keys are ReactionType enums and volume is provided
        elif isinstance(next(iter(reaction_rates.keys()), None), ReactionType) and volume is not None:
             calculation_mode = "non-spatial"
             processed_volume = volume
             for reaction_type, rate in reaction_rates.items():
                 try:
                      energy_MeV = self.reaction_energies.get(reaction_type, 0.0)
                      energy_J = energy_MeV * 1.602e-13
                      power = rate * volume * energy_J 
                      power_by_reaction[reaction_type.name] = power
                      total_power += power
                 except Exception as e:
                      logger.error(f"Error calculating non-spatial power for {reaction_type.name}: {e}", exc_info=True)
        
        # --- Error / Unknown Path --- 
        else:
             logger.error("Invalid input for calculate_power_output. Provide spatial rates with grid OR non-spatial rates with volume.")
             calculation_mode = "error"
        
        # Return power data
        return {
            "total_power": total_power,
            "power_by_reaction": power_by_reaction,
            "processed_volume": processed_volume,
            "calculation_mode": calculation_mode,
            "units": "W"
        }