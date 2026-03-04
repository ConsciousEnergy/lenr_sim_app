
"""Screening-related enhancement calculations."""
import numpy as np
import logging
logger = logging.getLogger(__name__)

def calculate_screening_contribution(
    temperature: float, electron_density: float,
    hbar: float, e: float, eps0: float, me: float, kb: float
) -> float:
    try:
        if temperature <= 0 or electron_density <= 0:
            return 1.0
        thermal_energy = kb * temperature
        debye_length = np.sqrt(eps0 * thermal_energy / (electron_density * e**2))
        fermi_tf_length = np.sqrt(eps0 * hbar**2 / (me * electron_density**(1/3) * e**2))
        effective_length = min(debye_length, fermi_tf_length)
        screening_potential = -(e**2 / (4 * np.pi * eps0 * effective_length)) if effective_length > 1e-20 else -np.inf
        enhancement = 1.0
        dynamic_factor = 1.0
        if thermal_energy > 1e-30:
            exponent = np.clip(-screening_potential / thermal_energy, -700, 700) if screening_potential > -np.inf else 0.0
            enhancement = np.exp(exponent)
            plasma_frequency_sq = (electron_density * e**2 / (eps0 * me))
            if plasma_frequency_sq > 0:
                plasma_frequency = np.sqrt(plasma_frequency_sq)
                dynamic_factor = 1 + 0.5 * (hbar * plasma_frequency / thermal_energy)**2
        enhancement = min(enhancement, 1e150)
        dynamic_factor = min(dynamic_factor, 1e150)
        total_enhancement = enhancement * dynamic_factor
        if not np.isfinite(total_enhancement) or total_enhancement > 1e5:
            total_enhancement = 1e5 * np.log10(1 + min(total_enhancement, 1e300) / 1e5) if np.isfinite(total_enhancement) else 1e5
        return max(1.0, total_enhancement)
    except Exception as ex:
        logger.error("Error in screening calculation: %s", ex, exc_info=True)
        return 1.0
