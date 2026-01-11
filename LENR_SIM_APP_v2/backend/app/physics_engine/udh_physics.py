"""
Ultra-Dense Hydrogen (UDH) Physics Module for LENR Simulation v2
Implements theoretical framework from arxiv paper 2505.21946
"""

import numpy as np
import logging
from typing import Dict, Any, Optional
from scipy import constants

logger = logging.getLogger(__name__)


class UltraDenseHydrogenModel:
    """Ultra-Dense Hydrogen physics model based on Zeiner-Gundersen theory."""
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.config = config or {}
        self.hbar = constants.hbar
        self.e = constants.e
        self.c = constants.c
        self.kb = constants.k
        self.alpha = constants.alpha
        self.me = constants.m_e
        
        udh_config = self.config.get("udh_params", {})
        self.cluster_size = udh_config.get("cluster_size", 6)
        self.udh_bond_length = udh_config.get("bond_length", 2.3e-12)
        self.normal_h_bond = 74e-12
        self.bosonic_binding_energy = udh_config.get("binding_energy", 0.5) * self.e
        self.collapse_threshold = udh_config.get("collapse_threshold", 1e8)
        self.squeeze_coefficient = udh_config.get("squeeze_coefficient", 0.1)
        
        self.density_factor = (self.normal_h_bond / self.udh_bond_length) ** 3
        self.characteristic_energy = self.hbar * self.c / self.udh_bond_length


    def calculate_udh_density(self, temperature: float, pressure: float, 
                              lattice_params: Optional[Dict[str, Any]] = None) -> Dict[str, float]:
        """Calculate UDH cluster density and formation probability."""
        thermal_energy = self.kb * temperature
        stability_factor = np.exp(-thermal_energy / self.bosonic_binding_energy)
        pressure_atm = pressure / 101325
        pressure_factor = 1 + np.log1p(pressure_atm) * 0.1
        
        lattice_factor = 1.0
        if lattice_params:
            defect_density = lattice_params.get("defect_density", 0.01)
            vacancy_concentration = lattice_params.get("vacancy_concentration", 0.01)
            lattice_factor = 1 + 10 * defect_density + 5 * vacancy_concentration
        
        formation_prob = min(1.0, stability_factor * pressure_factor * lattice_factor)
        effective_density = self.density_factor * formation_prob
        base_h_density = lattice_params.get("hydrogen_density", 1e28) if lattice_params else 1e28
        cluster_density = (base_h_density / self.cluster_size) * formation_prob
        
        return {"formation_probability": formation_prob, "density_enhancement": effective_density,
                "cluster_density": cluster_density, "stability_factor": stability_factor}

    def calculate_bosonic_state_energy(self, cluster_size: Optional[int] = None) -> Dict[str, float]:
        """Calculate energy levels of metastable bosonic states in UDH."""
        n = cluster_size or self.cluster_size
        screening_factor = 1 - 0.1 * np.log(n)
        ground_state_energy = -self.bosonic_binding_energy * n * screening_factor
        total_binding = abs(ground_state_energy) + self.alpha**2 * self.me * self.c**2 / n
        
        return {"ground_state_energy_J": ground_state_energy, 
                "total_binding_energy_J": total_binding,
                "total_binding_energy_eV": total_binding / self.e}


    def calculate_field_collapse_probability(self, em_field_strength: float,
                                             pulse_parameters: Optional[Dict[str, Any]] = None) -> Dict[str, float]:
        """Calculate probability of field-induced quantum collapse."""
        field_ratio = em_field_strength / self.collapse_threshold
        base_probability = 1 / (1 + np.exp(-5 * (field_ratio - 1)))
        
        pulse_factor = 1.0
        if pulse_parameters:
            pulse_frequency = pulse_parameters.get("frequency", 1e6)
            characteristic_freq = self.characteristic_energy / self.hbar
            freq_ratio = pulse_frequency / characteristic_freq
            pulse_factor = 1 + np.exp(-((np.log10(freq_ratio))**2) / 0.5)
        
        collapse_probability = min(1.0, base_probability * pulse_factor)
        bosonic_state = self.calculate_bosonic_state_energy()
        energy_release = bosonic_state["total_binding_energy_J"] * collapse_probability
        
        return {"collapse_probability": collapse_probability, "field_ratio": field_ratio,
                "estimated_energy_release_J": energy_release}

    def calculate_vacuum_squeeze_factor(self, local_density: float, temperature: float,
                                        cavity_size: Optional[float] = None) -> Dict[str, float]:
        """Calculate vacuum squeezing effects for LENR enhancement."""
        cavity = cavity_size or self.udh_bond_length
        thermal_wl = self.hbar * self.c / (self.kb * temperature) if temperature > 0 else np.inf
        
        if thermal_wl > 0 and thermal_wl < np.inf:
            squeeze_param = self.squeeze_coefficient * np.tanh((cavity/2) / thermal_wl)
        else:
            squeeze_param = 0.0
        
        vacuum_enhancement = np.cosh(2 * squeeze_param)
        density_factor = 1 + np.log1p(local_density / 1e28) * 0.1
        
        return {"squeeze_parameter": squeeze_param, "vacuum_enhancement": vacuum_enhancement,
                "total_squeeze_factor": vacuum_enhancement * density_factor}


    def calculate_total_udh_enhancement(self, temperature: float, pressure: float, em_field: float,
                                        local_density: float, lattice_params: Optional[Dict[str, Any]] = None,
                                        pulse_params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Calculate total enhancement factor from all UDH effects."""
        density_result = self.calculate_udh_density(temperature, pressure, lattice_params)
        collapse_result = self.calculate_field_collapse_probability(em_field, pulse_params)
        vacuum_result = self.calculate_vacuum_squeeze_factor(local_density, temperature)
        
        density_factor = max(1.0, density_result["density_enhancement"])
        collapse_factor = 1 + collapse_result["collapse_probability"] * 10
        vacuum_factor = vacuum_result["total_squeeze_factor"]
        raw_enhancement = density_factor * collapse_factor * vacuum_factor
        
        if raw_enhancement > 1e6:
            total_enhancement = 1e6 * np.log10(1 + raw_enhancement / 1e6)
        else:
            total_enhancement = raw_enhancement
        
        return {"total_enhancement": total_enhancement, "density_enhancement": density_factor,
                "collapse_enhancement": collapse_factor, "vacuum_enhancement": vacuum_factor,
                "components": {"density": density_result, "collapse": collapse_result, "vacuum": vacuum_result}}


def calculate_udh_enhancement(temperature: float, pressure: float, em_field: float,
                              local_density: float, config: Optional[Dict[str, Any]] = None) -> float:
    """Quick calculation of UDH enhancement factor."""
    model = UltraDenseHydrogenModel(config)
    result = model.calculate_total_udh_enhancement(temperature, pressure, em_field, local_density)
    return result["total_enhancement"]
