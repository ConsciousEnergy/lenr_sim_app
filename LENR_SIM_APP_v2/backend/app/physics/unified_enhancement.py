"""
Unified Enhancement Module for LENR_Sim_App

This module implements the Unified LENR Theory enhancement mechanisms,
which explain low-energy nuclear reactions through various quantum effects
that can enhance nuclear reaction rates by many orders of magnitude.
"""

import numpy as np
import scipy.constants as const
from typing import Dict, List, Tuple, Any, Optional, Union
import math
import logging
import time
import hashlib
import json
import functools
from collections import OrderedDict
from functools import lru_cache

from app.utils.logging import setup_logger

# Set up logger
logger = setup_logger("unified_enhancement", "logs/physics.log")

# Physical constants
HBAR = const.hbar  # Reduced Planck constant
KB = const.k  # Boltzmann constant
ELECTRON_MASS = const.m_e  # Electron mass
ELECTRON_CHARGE = const.e  # Elementary charge
PROTON_MASS = const.m_p  # Proton mass
NEUTRON_MASS = const.m_n  # Neutron mass
VACUUM_PERMITTIVITY = const.epsilon_0  # Vacuum permittivity
AMU = const.u  # Atomic mass unit
EV_TO_J = const.e  # Conversion factor from eV to Joules
KEV_TO_J = 1e3 * EV_TO_J  # Conversion from keV to Joules
MEV_TO_J = 1e6 * EV_TO_J  # Conversion from MeV to Joules
FINE_STRUCTURE = const.alpha  # Fine structure constant

# Add the missing function that's imported in main.py
def get_mechanism_requirements(mechanism_name: str) -> Dict[str, Any]:
    """
    Get the parameter requirements for a specific enhancement mechanism.
    
    Args:
        mechanism_name: Name of the enhancement mechanism
        
    Returns:
        Dictionary with parameter requirements and descriptions
    """
    # Define requirements for each mechanism
    requirements = {
        "electron_screening": {
            "temperature": {
                "type": "float",
                "description": "Temperature in Kelvin",
                "default": 300.0,
                "min": 1.0,
                "max": 1e6
            },
            "atomic_number_1": {
                "type": "int",
                "description": "Atomic number of first reactant",
                "default": 1,
                "min": 1,
                "max": 92
            },
            "atomic_number_2": {
                "type": "int",
                "description": "Atomic number of second reactant",
                "default": 1,
                "min": 1,
                "max": 92
            },
            "energy_kev": {
                "type": "float",
                "description": "Energy in keV",
                "default": 1.0,
                "min": 0.001,
                "max": 1000
            },
            "electron_density": {
                "type": "float",
                "description": "Electron density in m^-3",
                "default": 1e30,
                "min": 1e20,
                "max": 1e35,
                "optional": True
            }
        },
        "coherent_tunneling": {
            "temperature": {
                "type": "float",
                "description": "Temperature in Kelvin",
                "default": 300.0,
                "min": 1.0,
                "max": 1e6
            },
            "atoms_per_cluster": {
                "type": "int",
                "description": "Number of atoms in coherent cluster",
                "default": 1,
                "min": 1,
                "max": 10000
            },
            "correlation_length": {
                "type": "float",
                "description": "Correlation length in meters",
                "default": 1e-10,
                "min": 1e-12,
                "max": 1e-8
            },
            "energy_kev": {
                "type": "float",
                "description": "Energy in keV",
                "default": 1.0,
                "min": 0.001,
                "max": 1000
            }
        },
        "rydberg_matter": {
            "temperature": {
                "type": "float",
                "description": "Temperature in Kelvin",
                "default": 300.0,
                "min": 1.0,
                "max": 1e6
            },
            "loading_ratio": {
                "type": "float",
                "description": "Loading ratio (H/Pd or similar)",
                "default": 0.6,
                "min": 0.0,
                "max": 1.0
            },
            "minimum_ratio": {
                "type": "float",
                "description": "Minimum ratio for effect to occur",
                "default": 0.7,
                "min": 0.0,
                "max": 1.0,
                "optional": True
            },
            "principal_quantum_number": {
                "type": "int",
                "description": "Principal quantum number n",
                "default": 4,
                "min": 1,
                "max": 20,
                "optional": True
            }
        },
        "interface_field": {
            "electric_field": {
                "type": "float",
                "description": "Electric field strength in V/m",
                "default": 1e8,
                "min": 1e6,
                "max": 1e12
            },
            "atomic_number_1": {
                "type": "int",
                "description": "Atomic number of first reactant",
                "default": 1,
                "min": 1,
                "max": 92
            },
            "atomic_number_2": {
                "type": "int",
                "description": "Atomic number of second reactant",
                "default": 1,
                "min": 1,
                "max": 92
            }
        },
        "casimir_force": {
            "cavity_size": {
                "type": "float",
                "description": "Cavity size in meters",
                "default": 1e-9,
                "min": 1e-12,
                "max": 1e-6
            },
            "temperature": {
                "type": "float",
                "description": "Temperature in Kelvin",
                "default": 300.0,
                "min": 1.0,
                "max": 1e6
            }
        },
        "shock_confinement": {
            "pressure": {
                "type": "float",
                "description": "Pressure in Pa",
                "default": 1e9,
                "min": 1e6,
                "max": 1e12
            },
            "bubble_diameter": {
                "type": "float",
                "description": "Bubble diameter in meters",
                "default": 1e-6,
                "min": 1e-9,
                "max": 1e-3,
                "optional": True
            }
        },
        "oppenheimer_phillips": {
            "energy_kev": {
                "type": "float",
                "description": "Energy in keV",
                "default": 10.0,
                "min": 0.001,
                "max": 1000
            },
            "atomic_number": {
                "type": "int",
                "description": "Atomic number of the target nucleus",
                "default": 6,
                "min": 3,
                "max": 92
            },
            "neutron_rich": {
                "type": "bool",
                "description": "Whether the target is neutron-rich",
                "default": False,
                "optional": True
            }
        }
    }
    
    # Return requirements for the requested mechanism
    if mechanism_name in requirements:
        return requirements[mechanism_name]
    else:
        logger.warning(f"Unknown mechanism: {mechanism_name}")
        return {}

# Improved cache key generator with performance optimization
def improved_cache_key(config, mechanisms):
    """
    Generate a deterministic cache key from parameters
    
    This optimized version reduces string processing and uses a more efficient
    hash calculation to improve performance
    """
    # Use a more efficient approach to create a stable representation
    key_parts = []
    
    # Process mechanisms first (usually smaller)
    if mechanisms:
        # Sort mechanisms for consistent ordering
        mech_list = sorted(mechanisms)
        key_parts.append(','.join(mech_list))
        
        # Only include config items for used mechanisms
        for mech in mech_list:
            if mech in config:
                mech_config = config[mech]
                # Sort keys for consistent ordering
                for k in sorted(mech_config.keys()):
                    v = mech_config[k]
                    # Convert different types to strings consistently
                    if isinstance(v, (int, float)):
                        # Round float values to reduce excessive cache variations
                        if isinstance(v, float):
                            v = round(v, 6)
                        key_parts.append(f"{mech}.{k}:{v}")
                    elif isinstance(v, bool):
                        key_parts.append(f"{mech}.{k}:{'1' if v else '0'}")
                    elif v is None:
                        key_parts.append(f"{mech}.{k}:null")
                    else:
                        key_parts.append(f"{mech}.{k}:{str(v)}")
    else:
        # Process all config items
        for mech in sorted(config.keys()):
            mech_config = config[mech]
            for k in sorted(mech_config.keys()):
                v = mech_config[k]
                # Convert different types to strings consistently
                if isinstance(v, (int, float)):
                    # Round float values to reduce excessive cache variations
                    if isinstance(v, float):
                        v = round(v, 6)
                    key_parts.append(f"{mech}.{k}:{v}")
                elif isinstance(v, bool):
                    key_parts.append(f"{mech}.{k}:{'1' if v else '0'}")
                elif v is None:
                    key_parts.append(f"{mech}.{k}:null")
                else:
                    key_parts.append(f"{mech}.{k}:{str(v)}")
    
    # Create the key string
    key_string = "|".join(key_parts)
    
    # Use a faster hash function if the key is very long
    if len(key_string) > 1000:
        # For very long keys, use a faster hash
        import hashlib
        return hashlib.md5(key_string.encode()).hexdigest()
    else:
        # For normal keys, use a cryptographic hash for better distribution
        import hashlib
        return hashlib.sha256(key_string.encode()).hexdigest()

# Enhanced LRUCache implementation
class LRUCache:
    """
    An improved LRU cache implementation for enhancement calculations
    with better memory management and performance optimization
    """
    def __init__(self, capacity=1000, max_item_size=1024*1024):
        """
        Initialize the cache with capacity and size limits
        
        Args:
            capacity: Maximum number of items in the cache
            max_item_size: Maximum size of a single item in bytes
        """
        self.capacity = capacity
        self.max_item_size = max_item_size
        self.cache = OrderedDict()
        self.hits = 0
        self.misses = 0
        self.size_evictions = 0
        self.computation_time_saved = 0  # seconds
        self.total_memory = 0  # estimated memory usage
        
        # Create a cleanup thread that runs every 5 minutes
        self._cleanup_timer = None
        self._start_cleanup_timer()
    
    def _start_cleanup_timer(self):
        """Start the cleanup timer"""
        import threading
        
        def cleanup():
            """Perform cache cleanup"""
            # Remove excess items if we're over capacity
            overflow = len(self.cache) - self.capacity
            if overflow > 0:
                for _ in range(overflow):
                    self.cache.popitem(last=False)
                    
            # Schedule the next cleanup
            self._cleanup_timer = threading.Timer(300, cleanup)
            self._cleanup_timer.daemon = True
            self._cleanup_timer.start()
        
        # Start the initial timer
        self._cleanup_timer = threading.Timer(300, cleanup)
        self._cleanup_timer.daemon = True
        self._cleanup_timer.start()
    
    def get(self, key):
        """Get item from cache and update its position"""
        if key in self.cache:
            self.hits += 1
            # Move to end to show it was recently used
            value = self.cache.pop(key)
            self.cache[key] = value
            return value
        self.misses += 1
        return None
        
    def put(self, key, value, computation_time=0):
        """
        Add item to cache with optional computation time metric
        
        This method checks the size of the value and may reject extremely
        large values to prevent memory issues
        """
        # Estimate the size of the value
        try:
            # Fast size estimation using sys.getsizeof
            import sys
            value_size = sys.getsizeof(value)
            
            # If value is a dict, add the size of its contents
            if isinstance(value, dict):
                for k, v in value.items():
                    value_size += sys.getsizeof(k)
                    value_size += sys.getsizeof(v)
        except:
            # Default to an estimated size if getsizeof fails
            value_size = 1000  # default estimate
        
        # Check if the value is too large
        if value_size > self.max_item_size:
            self.size_evictions += 1
            logger.warning(f"Cache item too large ({value_size} bytes > {self.max_item_size} bytes)")
            return
            
        # Update the total memory usage
        self.total_memory += value_size
            
        if key in self.cache:
            # Move to end (recently used)
            old_value = self.cache.pop(key)
            # Estimate and subtract the size of the old value
            try:
                import sys
                old_size = sys.getsizeof(old_value)
                if isinstance(old_value, dict):
                    for k, v in old_value.items():
                        old_size += sys.getsizeof(k)
                        old_size += sys.getsizeof(v)
                self.total_memory -= old_size
            except:
                # If estimation fails, use a default
                self.total_memory -= 1000
        elif len(self.cache) >= self.capacity:
            # Remove oldest item
            _, old_value = self.cache.popitem(last=False)
            # Estimate and subtract the size of the old value
            try:
                import sys
                old_size = sys.getsizeof(old_value)
                if isinstance(old_value, dict):
                    for k, v in old_value.items():
                        old_size += sys.getsizeof(k)
                        old_size += sys.getsizeof(v)
                self.total_memory -= old_size
            except:
                # If estimation fails, use a default
                self.total_memory -= 1000
        
        self.cache[key] = value
        self.computation_time_saved += computation_time
        
    def clear(self):
        """Clear the cache and return the number of items cleared"""
        size = len(self.cache)
        self.cache.clear()
        self.total_memory = 0
        return size
        
    def get_stats(self):
        """Get detailed cache statistics"""
        total_requests = self.hits + self.misses
        hit_ratio = self.hits / max(total_requests, 1)
        
        return {
            "size": len(self.cache),
            "capacity": self.capacity,
            "hits": self.hits,
            "misses": self.misses,
            "hit_ratio": hit_ratio,
            "total_requests": total_requests,
            "computation_time_saved": round(self.computation_time_saved, 2),  # seconds
            "size_evictions": self.size_evictions,
            "estimated_memory_bytes": self.total_memory,
            "estimated_memory_mb": round(self.total_memory / (1024 * 1024), 2)
        }

# Configure our cache
calculate_enhancement_cache = LRUCache(capacity=2000)  # Increased capacity from 1000 to 2000

class UnifiedEnhancementCalculator:
    """
    Calculate enhancement factors using the Unified LENR Theory framework
    """
    
    def __init__(self):
        """Initialize the calculator with default configurations"""
        # Available enhancement mechanisms
        self.mechanisms = {
            "electron_screening": self.electron_screening_enhancement,
            "coherent_tunneling": self.coherent_tunneling_enhancement,
            "rydberg_matter": self.rydberg_matter_enhancement,
            "interface_field": self.interface_field_enhancement,
            "casimir_force": self.casimir_force_enhancement,
            "shock_confinement": self.shock_confinement_enhancement,
            "oppenheimer_phillips": self.oppenheimer_phillips_enhancement
        }
        
        logger.info(f"Initialized UnifiedEnhancementCalculator with {len(self.mechanisms)} available mechanisms")
    
    def electron_screening_enhancement(self, params: Dict[str, Any]) -> float:
        """
        Calculate electron screening enhancement factor
        
        Args:
            params: Dictionary of parameters for the calculation
            
        Returns:
            Enhancement factor (dimensionless)
        """
        # Required parameters
        temperature = params.get("temperature", 300.0)  # K
        atomic_number_1 = params.get("atomic_number_1", 1)
        atomic_number_2 = params.get("atomic_number_2", 1)
        energy_kev = params.get("energy_kev", 1.0)  # keV
        
        # Optional parameters
        debye_length = params.get("debye_length", None)  # m
        electron_density = params.get("electron_density", 1e30)  # m^-3
        screening_potential = params.get("screening_potential", None)  # eV
        
        # If screening potential not provided, calculate it
        if screening_potential is None:
            # Calculate Debye length if not provided
            if debye_length is None:
                # Calculate electron temperature (approximately equal to ion temperature in plasma)
                electron_temp = temperature  # K
                
                # Debye length calculation
                debye_length = np.sqrt(VACUUM_PERMITTIVITY * KB * electron_temp / (ELECTRON_CHARGE**2 * electron_density))
            
            # Approximate screening potential
            charge_product = atomic_number_1 * atomic_number_2
            screening_potential = (1 / (4 * np.pi * VACUUM_PERMITTIVITY)) * (ELECTRON_CHARGE * charge_product) / debye_length / ELECTRON_CHARGE
        
        # Convert screening potential to keV
        screening_potential_kev = screening_potential / 1000
        
        # Ensure energy is positive
        energy_kev = max(1e-9, energy_kev)
        
        # Calculate enhancement using Salpeter formula
        exponent = np.pi * atomic_number_1 * atomic_number_2 * FINE_STRUCTURE * np.sqrt(1 / energy_kev)
        exponent *= (screening_potential_kev / energy_kev)
        
        # Limit exponent to avoid overflow
        exponent = min(700, exponent)
        
        # Calculate enhancement factor
        enhancement = np.exp(exponent)
        
        # Apply corrections for very low energies
        if energy_kev < 0.1:
            # Enhancement is reduced at extremely low energies
            correction = 0.2 + 0.8 * energy_kev / 0.1
            enhancement = 1.0 + (enhancement - 1.0) * correction
        
        # Ensure reasonably bounded
        enhancement = max(1.0, min(1e10, enhancement))
        
        logger.debug(f"Electron screening enhancement: {enhancement:.2e} at {temperature} K, {energy_kev} keV")
        
        return enhancement
    
    def coherent_tunneling_enhancement(self, params: Dict[str, Any]) -> float:
        """
        Calculate coherent tunneling enhancement factor
        
        Args:
            params: Dictionary of parameters for the calculation
            
        Returns:
            Enhancement factor (dimensionless)
        """
        # Extract parameters
        temperature = params.get("temperature", 300.0)  # K
        atoms_per_cluster = params.get("atoms_per_cluster", 1)
        correlation_length = params.get("correlation_length", 1e-10)  # m
        energy_kev = params.get("energy_kev", 1.0)  # keV
        
        # Theoretical maximum number of correlated tunneling paths
        max_paths = min(atoms_per_cluster, 10000)
        
        # Temperature-dependent effective paths (high temperature reduces coherence)
        effective_paths = max_paths * np.exp(-temperature / 1000)
        
        # Ensure at least one path
        effective_paths = max(1.0, effective_paths)
        
        # Energy-dependent factor (tunneling coherence is more significant at lower energies)
        energy_factor = np.exp(-energy_kev / 10)
        
        # Base enhancement scales with square root of paths (not linearly, due to decoherence effects)
        base_enhancement = np.sqrt(effective_paths)
        
        # Correlation length factor (longer correlation length = stronger enhancement)
        correlation_factor = (correlation_length / 1e-10)
        correlation_factor = min(100, correlation_factor)
        
        # Combined enhancement with energy dependence
        enhancement = 1.0 + (base_enhancement - 1.0) * energy_factor * correlation_factor
        
        # Ensure reasonably bounded
        enhancement = max(1.0, min(1e6, enhancement))
        
        logger.debug(f"Coherent tunneling enhancement: {enhancement:.2e} with {effective_paths:.1f} paths")
        
        return enhancement
    
    def rydberg_matter_enhancement(self, params: Dict[str, Any]) -> float:
        """
        Calculate enhancement due to Rydberg matter formation
        
        Args:
            params: Dictionary of parameters for the calculation
            
        Returns:
            Enhancement factor (dimensionless)
        """
        # Extract parameters
        temperature = params.get("temperature", 300.0)  # K
        loading_ratio = params.get("loading_ratio", 0.6)  # H/Pd or similar
        minimum_ratio = params.get("minimum_ratio", 0.7)  # Minimum ratio for effect
        principal_quantum_number = params.get("principal_quantum_number", 4)  # n in Rydberg states
        
        # If loading ratio is below threshold, no enhancement
        if loading_ratio < minimum_ratio:
            return 1.0
        
        # Scale factor based on loading beyond threshold
        loading_factor = (loading_ratio - minimum_ratio) / (1.0 - minimum_ratio)
        loading_factor = min(1.0, max(0.0, loading_factor))
        
        # Temperature dependence - Rydberg states dissociate at higher temperatures
        temp_factor = np.exp(-temperature / 500)
        
        # Quantum number dependence - higher n = larger spacing = stronger screening
        quantum_factor = principal_quantum_number**2
        
        # Calculate base enhancement (theoretical model)
        base_enhancement = 10.0 * quantum_factor
        
        # Apply temperature and loading modifiers
        enhancement = 1.0 + (base_enhancement - 1.0) * loading_factor * temp_factor
        
        # Ensure reasonably bounded
        enhancement = max(1.0, min(1e4, enhancement))
        
        logger.debug(f"Rydberg matter enhancement: {enhancement:.2e} at loading ratio {loading_ratio:.2f}")
        
        return enhancement
    
    def interface_field_enhancement(self, params: Dict[str, Any]) -> float:
        """
        Calculate enhancement due to strong electric fields at interfaces
        
        Args:
            params: Dictionary of parameters for the calculation
            
        Returns:
            Enhancement factor (dimensionless)
        """
        # Extract parameters
        field_strength = params.get("field_strength", 1e7)  # V/m
        threshold_field = params.get("threshold_field", 1e8)  # V/m
        atomic_number_1 = params.get("atomic_number_1", 1)
        atomic_number_2 = params.get("atomic_number_2", 1)
        
        # If field is below threshold, minimal enhancement
        if field_strength < threshold_field:
            field_factor = field_strength / threshold_field
        else:
            # Above threshold, effect begins to saturate
            field_factor = 1.0 + np.log10(field_strength / threshold_field)
        
        # Limit field factor
        field_factor = min(10.0, field_factor)
        
        # Stronger effect for higher Z nuclei (greater charge response to field)
        charge_factor = np.sqrt(atomic_number_1 * atomic_number_2)
        
        # Base enhancement (theoretical model based on barrier deformation)
        base_enhancement = charge_factor * np.exp(field_factor)
        
        # Normalize enhancement
        enhancement = max(1.0, min(1e5, base_enhancement))
        
        logger.debug(f"Interface field enhancement: {enhancement:.2e} at {field_strength:.2e} V/m")
        
        return enhancement
    
    def casimir_force_enhancement(self, params: Dict[str, Any]) -> float:
        """
        Calculate enhancement due to Casimir force in nanogaps
        
        Args:
            params: Dictionary of parameters for the calculation
            
        Returns:
            Enhancement factor (dimensionless)
        """
        # Extract parameters
        gap_size = params.get("gap_size", 1e-9)  # m
        effective_area = params.get("effective_area", 1e-18)  # m²
        permittivity = params.get("permittivity", 1.0)  # Relative permittivity
        
        # Casimir force increases with smaller gaps
        if gap_size <= 0:
            gap_size = 1e-10  # Minimum gap size
        
        # Basic Casimir force scaling: F ~ 1/d⁴
        casimir_factor = 1e-36 / (gap_size**4)
        
        # Scale by effective area
        area_factor = effective_area / 1e-18
        
        # Permittivity effect (materials with higher permittivity have stronger effects)
        permittivity_factor = np.sqrt(permittivity)
        
        # Combined enhancement
        base_enhancement = casimir_factor * area_factor * permittivity_factor
        
        # Normalize to reasonable range
        # Very rough approximation - actual enhancement needs more detailed model
        enhancement = 1.0 + np.log10(1.0 + base_enhancement)
        
        # Ensure reasonably bounded
        enhancement = max(1.0, min(100.0, enhancement))
        
        logger.debug(f"Casimir force enhancement: {enhancement:.2e} at gap size {gap_size:.2e} m")
        
        return enhancement
    
    def shock_confinement_enhancement(self, params: Dict[str, Any]) -> float:
        """
        Calculate enhancement due to shock waves and dynamic confinement
        
        Args:
            params: Dictionary of parameters for the calculation
            
        Returns:
            Enhancement factor (dimensionless)
        """
        # Extract parameters
        pressure = params.get("pressure", 1e5)  # Pa
        pulse_duration = params.get("pulse_duration", 1e-6)  # s
        is_cavitation = params.get("is_cavitation", False)  # Cavitation bubble collapse
        bubble_energy = params.get("bubble_energy", 0.0)  # J
        
        # Pressure enhancement factor
        pressure_factor = np.sqrt(pressure / 1e5)
        
        # Dynamic compression is more effective if pulse is shorter
        time_factor = np.exp(-pulse_duration / 1e-6)
        
        # Base enhancement from pressure and time dynamics
        base_enhancement = pressure_factor * (1.0 + 10.0 * time_factor)
        
        # Add cavitation effects if applicable
        if is_cavitation and bubble_energy > 0:
            # Energy focusing during bubble collapse can be significant
            cavitation_factor = np.sqrt(bubble_energy / 1e-12)
            cavitation_factor = min(1000.0, cavitation_factor)
            
            # Combine with base enhancement
            enhancement = base_enhancement * cavitation_factor
        else:
            enhancement = base_enhancement
        
        # Ensure reasonably bounded
        enhancement = max(1.0, min(1e5, enhancement))
        
        logger.debug(f"Shock confinement enhancement: {enhancement:.2e} at pressure {pressure:.2e} Pa")
        
        return enhancement
    
    def oppenheimer_phillips_enhancement(self, params: Dict[str, Any]) -> float:
        """
        Calculate enhancement due to Oppenheimer-Phillips process
        
        Args:
            params: Dictionary of parameters for the calculation
            
        Returns:
            Enhancement factor (dimensionless)
        """
        # Extract parameters
        projectile_z = params.get("projectile_z", 1)
        target_z = params.get("target_z", 1)
        projectile_a = params.get("projectile_a", 1)
        target_a = params.get("target_a", 1)
        energy_kev = params.get("energy_kev", 10.0)  # keV
        
        # O-P process applies mainly when:
        # 1. Projectile has Z/A < target Z/A (neutron-rich projectile)
        # 2. One of the nuclei has significant neutron excess
        
        projectile_za_ratio = projectile_z / max(1, projectile_a)
        target_za_ratio = target_z / max(1, target_a)
        
        # Check if conditions favor O-P process
        if projectile_a <= 1 or target_a <= 1:
            # Not applicable for single nucleons
            return 1.0
        
        if projectile_za_ratio >= target_za_ratio:
            # Less favorable configuration
            op_factor = 0.1
        else:
            # More favorable - calculate based on neutron excess
            neutron_excess = (projectile_a - projectile_z) + (target_a - target_z)
            op_factor = 0.5 + 0.5 * min(10, neutron_excess) / 10
        
        # Energy dependence - O-P process more significant at lower energies
        energy_factor = np.exp(-energy_kev / 50.0)
        
        # Calculate enhancement
        base_enhancement = 10.0 * op_factor * energy_factor
        
        # Normalize enhancement
        enhancement = 1.0 + base_enhancement
        
        # Ensure reasonably bounded
        enhancement = max(1.0, min(100.0, enhancement))
        
        logger.debug(f"Oppenheimer-Phillips enhancement: {enhancement:.2e}")
        
        return enhancement
    
    def calculate_enhancement(
        self, 
        config: Dict[str, Dict[str, Any]], 
        mechanisms: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Calculate combined enhancement factor using multiple mechanisms
        
        Args:
            config: Configuration dictionary with parameters for each mechanism
            mechanisms: List of mechanisms to include (if None, use all available)
            
        Returns:
            Dictionary with enhancement results
        """
        # Initialize results
        results = {
            "individual_factors": {},
            "mechanisms_used": [],
            "combined_enhancement_factor": 1.0,
            "log_combined_enhancement": 0.0
        }
        
        # If no mechanisms specified, use all available
        if mechanisms is None:
            mechanisms = list(self.mechanisms.keys())
        
        # Calculate enhancement for each requested mechanism
        for mechanism in mechanisms:
            if mechanism in self.mechanisms and mechanism in config:
                # Get parameters for this mechanism
                params = config[mechanism]
                
                try:
                    # Calculate enhancement factor
                    factor = self.mechanisms[mechanism](params)
                    
                    # Store result
                    results["individual_factors"][mechanism] = factor
                    results["mechanisms_used"].append(mechanism)
                    
                    # Update combined factor
                    results["combined_enhancement_factor"] *= factor
                except Exception as e:
                    logger.error(f"Error calculating {mechanism} enhancement: {str(e)}")
                    results["individual_factors"][mechanism] = 1.0
        
        # Calculate log of combined enhancement for easier display
        if results["combined_enhancement_factor"] > 0:
            results["log_combined_enhancement"] = np.log10(results["combined_enhancement_factor"])
        
        # Ensure enhancement is positive
        results["combined_enhancement_factor"] = max(1.0, results["combined_enhancement_factor"])
        
        # Limit to reasonable maximum (very large values cause numerical issues)
        if results["combined_enhancement_factor"] > 1e20:
            logger.warning(f"Very large enhancement factor calculated: {results['combined_enhancement_factor']:.2e}")
            results["combined_enhancement_factor"] = 1e20
            results["log_combined_enhancement"] = 20.0
        
        logger.info(f"Combined enhancement: {results['combined_enhancement_factor']:.2e} " +
                   f"using {len(results['mechanisms_used'])} mechanisms")
        
        return results


# Create a singleton instance
calculator = UnifiedEnhancementCalculator()

# Optimized calculate_enhancement function with caching
def calculate_enhancement(
    config: Dict[str, Dict[str, Any]], 
    mechanisms: Optional[List[str]] = None
) -> Dict[str, Any]:
    """
    Calculate enhancement using the singleton calculator with optimized caching
    
    Args:
        config: Configuration dictionary with parameters for each mechanism
        mechanisms: List of mechanisms to include (if None, use all available)
        
    Returns:
        Dictionary with enhancement results
    """
    # Generate cache key
    key = improved_cache_key(config, mechanisms)
    
    # Check cache
    cached_result = calculate_enhancement_cache.get(key)
    if cached_result is not None:
        # Add cache hit indicator to metadata
        if "metadata" not in cached_result:
            cached_result["metadata"] = {}
        cached_result["metadata"]["cache_hit"] = True
        return cached_result
    
    # Calculate the result with timing
    start_time = time.time()
    result = calculator.calculate_enhancement(config, mechanisms)
    computation_time = time.time() - start_time
    
    # Add metadata
    if "metadata" not in result:
        result["metadata"] = {}
    result["metadata"]["computation_time"] = round(computation_time, 3)
    result["metadata"]["cache_hit"] = False
    
    # Store in cache with computation time metric
    calculate_enhancement_cache.put(key, result, computation_time)
    
    return result

# Function to get cache statistics
def get_enhancement_cache_stats():
    """Get statistics about the enhancement calculations cache"""
    return calculate_enhancement_cache.get_stats()

# Function to clear the cache
def clear_enhancement_cache():
    """Clear the enhancement calculations cache"""
    return calculate_enhancement_cache.clear()

def get_default_configuration() -> Dict[str, Dict[str, Any]]:
    """
    Get default configuration for enhancement mechanisms
    
    Returns:
        Default configuration dictionary
    """
    config = {
        "electron_screening": {
            "temperature": 300.0,
            "atomic_number_1": 1,
            "atomic_number_2": 1,
            "energy_kev": 1.0,
            "electron_density": 1e30,
            "screening_potential": 100.0
        },
        "coherent_tunneling": {
            "temperature": 300.0,
            "atoms_per_cluster": 100,
            "correlation_length": 1e-10,
            "energy_kev": 1.0
        },
        "rydberg_matter": {
            "temperature": 300.0,
            "loading_ratio": 0.8,
            "minimum_ratio": 0.7,
            "principal_quantum_number": 4
        },
        "interface_field": {
            "field_strength": 1e8,
            "threshold_field": 1e8,
            "atomic_number_1": 1,
            "atomic_number_2": 1
        },
        "casimir_force": {
            "gap_size": 2e-9,
            "effective_area": 1e-18,
            "permittivity": 2.0
        },
        "shock_confinement": {
            "pressure": 1e7,
            "pulse_duration": 1e-6,
            "is_cavitation": False,
            "bubble_energy": 0.0
        },
        "oppenheimer_phillips": {
            "projectile_z": 1,
            "target_z": 1,
            "projectile_a": 1,
            "target_a": 1,
            "energy_kev": 10.0
        }
    }
    
    return config


def calculate_enhancement_for_material(
    material_name: str,
    temperature: float,
    pressure: float,
    electric_field: float = 0.0,
    mechanisms: Optional[List[str]] = None
) -> Dict[str, Any]:
    """
    Calculate enhancement factors based on material properties.
    
    Args:
        material_name: Name of the material
        temperature: Temperature in Kelvin
        pressure: Pressure in Pa
        electric_field: Electric field in V/m
        mechanisms: List of mechanisms to include
    
    Returns:
        Dictionary with enhancement results
    """
    # Define material properties
    material_properties = {
        "palladium": {
            "lattice_constant": 3.89e-10,  # m
            "electron_density": 1.36e29,    # m^-3
            "work_function": 5.12,          # eV
            "atomic_number": 46,
            "mass_number": 106,
            "loading_ratio": 0.7,           # H/Pd ratio
        },
        "nickel": {
            "lattice_constant": 3.52e-10,   # m
            "electron_density": 9.14e28,    # m^-3
            "work_function": 5.01,          # eV
            "atomic_number": 28,
            "mass_number": 59,
            "loading_ratio": 0.6,           # H/Ni ratio
        },
        "titanium": {
            "lattice_constant": 2.95e-10,   # m
            "electron_density": 5.7e28,     # m^-3
            "work_function": 4.33,          # eV
            "atomic_number": 22,
            "mass_number": 48,
            "loading_ratio": 1.9,           # H/Ti ratio
        }
    }
    
    # Check if material is supported
    if material_name not in material_properties:
        logger.warning(f"Material {material_name} not supported, using palladium")
        material_name = "palladium"
    
    # Get material properties
    properties = material_properties[material_name]
    
    # Create configuration based on material properties
    config = {
        "electron_screening": {
            "temperature": temperature,
            "atomic_number_1": 1,  # Hydrogen
            "atomic_number_2": properties["atomic_number"],
            "energy_kev": 0.025,  # Thermal energy at room temperature
            "electron_density": properties["electron_density"],
            "screening_potential": None
        },
        "coherent_tunneling": {
            "temperature": temperature,
            "atoms_per_cluster": int(1000 * properties["loading_ratio"]),
            "correlation_length": properties["lattice_constant"] * 2.0,
            "energy_kev": 0.025
        },
        "rydberg_matter": {
            "temperature": temperature,
            "loading_ratio": properties["loading_ratio"],
            "minimum_ratio": 0.7,
            "principal_quantum_number": int(5 * properties["work_function"] / 4.5)
        },
        "interface_field": {
            "field_strength": electric_field if electric_field > 0 else 1e8,
            "threshold_field": 1e8,
            "atomic_number_1": 1,
            "atomic_number_2": properties["atomic_number"]
        },
        "casimir_force": {
            "gap_size": properties["lattice_constant"] * 0.3,
            "effective_area": properties["lattice_constant"]**2,
            "permittivity": 2.0
        },
        "shock_confinement": {
            "pressure": pressure,
            "pulse_duration": 1e-6,
            "is_cavitation": False,
            "bubble_energy": 0.0
        },
        "oppenheimer_phillips": {
            "projectile_z": 1,  # Hydrogen
            "target_z": properties["atomic_number"],
            "projectile_a": 2,  # Deuterium
            "target_a": properties["mass_number"],
            "energy_kev": 0.025  # Thermal energy at room temperature (approx)
        }
    }
    
    # Calculate enhancement
    return calculate_enhancement(config, mechanisms)


def analyze_parameter_sensitivity(
    base_config: Dict[str, Dict[str, Any]],
    parameter_name: str,
    mechanism: str,
    values: List[float],
    mechanisms: Optional[List[str]] = None
) -> Dict[str, Any]:
    """
    Analyze the sensitivity of enhancement to a parameter.
    
    Args:
        base_config: Base configuration dictionary
        parameter_name: Name of the parameter to vary
        mechanism: Name of the mechanism the parameter belongs to
        values: List of parameter values to test
        mechanisms: List of mechanisms to include
        
    Returns:
        Dictionary with sensitivity analysis results
    """
    if mechanism not in base_config:
        logger.error(f"Mechanism {mechanism} not in base configuration")
        return {"error": f"Mechanism {mechanism} not in base configuration"}
    
    if parameter_name not in base_config[mechanism]:
        logger.error(f"Parameter {parameter_name} not in mechanism {mechanism}")
        return {"error": f"Parameter {parameter_name} not in mechanism {mechanism}"}
    
    # Store original value
    original_value = base_config[mechanism][parameter_name]
    
    # Calculate enhancement for each value
    results = {
        "parameter_name": parameter_name,
        "mechanism": mechanism,
        "values": values,
        "enhancements": [],
        "log_enhancements": []
    }
    
    for value in values:
        # Create a deep copy of the configuration
        import copy
        config_copy = copy.deepcopy(base_config)
        
        # Set the parameter value
        config_copy[mechanism][parameter_name] = value
        
        # Calculate enhancement
        enhancement = calculate_enhancement(config_copy, mechanisms)
        
        # Store results
        results["enhancements"].append(enhancement["combined_enhancement_factor"])
        results["log_enhancements"].append(enhancement["log_combined_enhancement"])
    
    # Restore original value
    base_config[mechanism][parameter_name] = original_value
    
    return results 