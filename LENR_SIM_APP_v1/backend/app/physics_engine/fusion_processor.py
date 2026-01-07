"""
Fusion Process Simulator for LENR Simulation
Implements nuclear reaction pathways, energy release calculations,
and particle tracking based on the Unified LENR Theory.
"""

from typing import Dict, Any, List, Optional, Tuple
import numpy as np
from scipy import constants
import asyncio
from dataclasses import dataclass
from concurrent.futures import ThreadPoolExecutor
from enum import Enum

class ReactionType(Enum):
    """Enumeration of possible nuclear reaction types."""
    DEUTERIUM_DEUTERIUM = "D-D"
    DEUTERIUM_HYDROGEN = "D-H"
    HYDROGEN_NICKEL = "H-Ni"
    DEUTERIUM_NICKEL = "D-Ni"

@dataclass
class ReactionProduct:
    """Data class for reaction product properties."""
    particle_type: str
    mass: float
    charge: float
    energy: float
    momentum: np.ndarray

class FusionProcessor:
    """
    Core processor for LENR fusion reactions.
    Handles reaction pathways, energy release, and particle tracking.
    """
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.config = config or {}
        # Physical constants
        self.hbar = constants.hbar
        self.c = constants.c
        self.e = constants.e
        self.eps0 = constants.epsilon_0
        self.u = constants.physical_constants["atomic mass constant"][0]
        
        # Initialize reaction parameters
        self.temperature = self.config.get("temperature", 300)  # Kelvin
        self.pressure = self.config.get("pressure", 1e5)  # Pascal
        self.enhancement_factor = self.config.get("enhancement_factor", 1.0)
        
        # Initialize reaction rates and cross-sections
        self.reaction_rates = {}
        self.cross_sections = {}
        self._initialize_reaction_data()
    
    def _initialize_reaction_data(self):
        """Initialize reaction rates and cross-sections for different pathways."""
        # D-D fusion reaction data
        self.reaction_rates[ReactionType.DEUTERIUM_DEUTERIUM] = {
            "base_rate": 1e-20,  # Base reaction rate in m^3/s
            "activation_energy": 0.1 * self.e,  # Activation energy in Joules
            "branching_ratios": {
                "n_He3": 0.5,    # n + He-3 channel
                "p_T": 0.5       # p + T channel
            }
        }
        
        # D-H fusion reaction data
        self.reaction_rates[ReactionType.DEUTERIUM_HYDROGEN] = {
            "base_rate": 1e-21,
            "activation_energy": 0.15 * self.e,
            "branching_ratios": {
                "He3_gamma": 1.0  # He-3 + gamma channel
            }
        }
        
        # H-Ni fusion reaction data (LENR specific)
        self.reaction_rates[ReactionType.HYDROGEN_NICKEL] = {
            "base_rate": 1e-15,
            "activation_energy": 0.05 * self.e,
            "branching_ratios": {
                "Cu_gamma": 1.0  # Cu + gamma channel
            }
        }
        
        # Initialize cross-sections
        self._initialize_cross_sections()
    
    def _initialize_cross_sections(self):
        """Initialize energy-dependent cross-sections for each reaction type."""
        # Energy range for cross-section calculations (eV)
        energies = np.logspace(0, 6, 1000)
        
        for reaction_type in ReactionType:
            if reaction_type == ReactionType.DEUTERIUM_DEUTERIUM:
                # Gamow factor calculation for D-D
                gamow_factor = 2 * np.pi * constants.alpha * constants.hbar * constants.c
                reduced_mass = (2 * constants.m_p) / 2  # Reduced mass for D-D
                
                # Calculate cross-section using Gamow formula
                cross_section = np.exp(-gamow_factor * np.sqrt(reduced_mass / (2 * energies * self.e)))
                cross_section *= self.enhancement_factor  # Apply LENR enhancement
                
            elif reaction_type == ReactionType.HYDROGEN_NICKEL:
                # Special LENR cross-section for H-Ni
                # Using modified formula based on electron screening and coherent effects
                barrier_penetration = np.exp(-np.sqrt(1000 / energies))
                cross_section = 1e-28 * barrier_penetration * self.enhancement_factor
                
            else:
                # Generic cross-section for other reactions
                cross_section = np.zeros_like(energies)
            
            self.cross_sections[reaction_type] = {
                "energies": energies,
                "values": cross_section
            }
    
    async def calculate_reaction_rate(
        self,
        reaction_type: ReactionType,
        density: float,
        temperature: float
    ) -> Dict[str, Any]:
        """
        Calculate reaction rate for given conditions.
        
        Args:
            reaction_type: Type of nuclear reaction
            density: Number density of reactants (m^-3)
            temperature: Temperature (K)
            
        Returns:
            Dict containing reaction rate and related parameters
        """
        def _calculate_rate():
            # Get reaction parameters
            params = self.reaction_rates[reaction_type]
            base_rate = params["base_rate"]
            activation_energy = params["activation_energy"]
            
            # Calculate thermal velocity
            thermal_velocity = np.sqrt(2 * constants.k * temperature / constants.m_p)
            
            # Calculate tunneling probability
            tunnel_prob = np.exp(-np.sqrt(activation_energy / (constants.k * temperature)))
            
            # Apply enhancement factor
            enhanced_rate = base_rate * self.enhancement_factor * tunnel_prob
            
            # Calculate total reaction rate
            total_rate = enhanced_rate * density**2 * thermal_velocity
            
            return total_rate, tunnel_prob
        
        # Run calculation in thread pool
        with ThreadPoolExecutor() as executor:
            total_rate, tunnel_prob = await asyncio.get_event_loop().run_in_executor(
                executor, _calculate_rate
            )
        
        return {
            "reaction_type": reaction_type.value,
            "total_rate": total_rate,
            "tunneling_probability": tunnel_prob,
            "metadata": {
                "temperature": temperature,
                "density": density,
                "enhancement_factor": self.enhancement_factor
            }
        }
    
    async def simulate_reaction_products(
        self,
        reaction_type: ReactionType,
        n_events: int
    ) -> Dict[str, Any]:
        """
        Simulate reaction products for a given number of events.
        
        Args:
            reaction_type: Type of nuclear reaction
            n_events: Number of reaction events to simulate
            
        Returns:
            Dict containing product distributions and energies
        """
        def _simulate_products():
            products = []
            total_energy = 0.0
            
            for _ in range(n_events):
                # Select reaction channel based on branching ratios
                branching_ratios = self.reaction_rates[reaction_type]["branching_ratios"]
                channel = np.random.choice(list(branching_ratios.keys()),
                                         p=list(branching_ratios.values()))
                
                # Calculate product properties based on channel
                if reaction_type == ReactionType.DEUTERIUM_DEUTERIUM:
                    if channel == "n_He3":
                        # n + He-3 channel
                        products.extend([
                            ReactionProduct(
                                particle_type="neutron",
                                mass=constants.m_n,
                                charge=0,
                                energy=2.45e6 * self.e,  # 2.45 MeV
                                momentum=np.random.randn(3)
                            ),
                            ReactionProduct(
                                particle_type="He-3",
                                mass=3.016 * self.u,
                                charge=2 * self.e,
                                energy=0.82e6 * self.e,  # 0.82 MeV
                                momentum=-np.random.randn(3)
                            )
                        ])
                        total_energy += 3.27e6 * self.e  # Total energy release
                        
                elif reaction_type == ReactionType.HYDROGEN_NICKEL:
                    # H-Ni fusion products (LENR specific)
                    products.append(
                        ReactionProduct(
                            particle_type="Cu",
                            mass=64 * self.u,  # Approximate Cu mass
                            charge=29 * self.e,
                            energy=7.8e6 * self.e,  # Theoretical energy release
                            momentum=np.random.randn(3)
                        )
                    )
                    total_energy += 7.8e6 * self.e
            
            return products, total_energy
        
        # Run simulation in thread pool
        with ThreadPoolExecutor() as executor:
            products, total_energy = await asyncio.get_event_loop().run_in_executor(
                executor, _simulate_products
            )
        
        # Organize products by type
        product_summary = {}
        for product in products:
            if product.particle_type not in product_summary:
                product_summary[product.particle_type] = {
                    "count": 0,
                    "total_energy": 0.0
                }
            product_summary[product.particle_type]["count"] += 1
            product_summary[product.particle_type]["total_energy"] += product.energy
        
        return {
            "reaction_type": reaction_type.value,
            "n_events": n_events,
            "total_energy": total_energy,
            "products": product_summary,
            "metadata": {
                "enhancement_factor": self.enhancement_factor,
                "temperature": self.temperature
            }
        }
    
    def calculate_power_output(
        self,
        reaction_rates: Dict[ReactionType, float],
        volume: float
    ) -> Dict[str, Any]:
        """
        Calculate total power output from all active reactions.
        
        Args:
            reaction_rates: Dictionary of reaction rates for each type
            volume: Reaction volume in m^3
            
        Returns:
            Dict containing power output and efficiency metrics
        """
        total_power = 0.0
        power_by_reaction = {}
        
        for reaction_type, rate in reaction_rates.items():
            # Get energy release per reaction
            if reaction_type == ReactionType.DEUTERIUM_DEUTERIUM:
                energy_per_reaction = 3.27e6 * self.e  # D-D fusion
            elif reaction_type == ReactionType.HYDROGEN_NICKEL:
                energy_per_reaction = 7.8e6 * self.e  # H-Ni fusion
            else:
                energy_per_reaction = 1e6 * self.e  # Generic 1 MeV
            
            # Calculate power for this reaction type
            power = rate * energy_per_reaction * volume
            power_by_reaction[reaction_type.value] = power
            total_power += power
        
        return {
            "total_power": total_power,
            "power_by_reaction": power_by_reaction,
            "volume": volume,
            "efficiency": total_power / (self.pressure * volume),  # Power/input pressure work
            "metadata": {
                "temperature": self.temperature,
                "pressure": self.pressure,
                "enhancement_factor": self.enhancement_factor
            }
        } 