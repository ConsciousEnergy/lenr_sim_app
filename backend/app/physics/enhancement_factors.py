"""Enhancement factors for nuclear reaction rates."""
import numpy as np
from typing import Dict, Tuple, Optional

def calculate_electron_screening(
    atomic_numbers: Tuple[int, int],
    electron_density: float,
    temperature: float
) -> float:
    """Calculate electron screening enhancement factor.
    
    Args:
        atomic_numbers: Tuple of atomic numbers of reacting nuclei
        electron_density: Local electron density in atomic units
        temperature: Temperature in Kelvin
        
    Returns:
        Electron screening enhancement factor
    """
    Z1, Z2 = atomic_numbers
    # Debye screening length in atomic units
    debye_length = np.sqrt(temperature / (4 * np.pi * electron_density))
    
    # Screening potential
    screening_potential = (Z1 * Z2) / debye_length
    
    # Enhancement factor
    return np.exp(screening_potential)

def calculate_lattice_enhancement(
    phonon_spectrum: Dict[str, np.ndarray],
    temperature: float,
    coupling_strength: float
) -> float:
    """Calculate lattice-induced enhancement factor.
    
    Args:
        phonon_spectrum: Dictionary containing phonon frequencies and DOS
        temperature: Temperature in Kelvin
        coupling_strength: Electron-phonon coupling strength
        
    Returns:
        Lattice enhancement factor
    """
    frequencies = phonon_spectrum['frequencies']
    dos = phonon_spectrum['dos']
    
    # Bose-Einstein occupation numbers
    kB = 8.617333262e-5  # Boltzmann constant in eV/K
    occupation = 1 / (np.exp(frequencies / (kB * temperature)) - 1)
    
    # Calculate enhancement from phonon-assisted tunneling
    enhancement = 1.0
    for n, freq in enumerate(frequencies):
        if freq > 0:  # Avoid acoustic modes at Gamma point
            enhancement += coupling_strength * occupation[n] * dos[n]
    
    return enhancement

def calculate_coherent_enhancement(
    coherence_length: float,
    reaction_wavelength: float,
    number_density: float
) -> float:
    """Calculate enhancement from coherent effects.
    
    Args:
        coherence_length: Coherence length in Angstroms
        reaction_wavelength: Nuclear reaction wavelength
        number_density: Number density of active nuclei
        
    Returns:
        Coherent enhancement factor
    """
    # Volume of coherent region
    coherent_volume = (4/3) * np.pi * coherence_length**3
    
    # Number of nuclei in coherent volume
    N_coherent = number_density * coherent_volume
    
    # Enhancement scales with square of number of coherent nuclei
    return N_coherent**2

def get_total_enhancement(
    atomic_numbers: Tuple[int, int],
    electron_density: float,
    temperature: float,
    phonon_spectrum: Dict[str, np.ndarray],
    coupling_strength: float,
    coherence_length: Optional[float] = None,
    reaction_wavelength: Optional[float] = None,
    number_density: Optional[float] = None
) -> Dict[str, float]:
    """Calculate total enhancement factor and contributions.
    
    Args:
        atomic_numbers: Tuple of atomic numbers
        electron_density: Local electron density
        temperature: Temperature in Kelvin
        phonon_spectrum: Phonon spectrum data
        coupling_strength: Electron-phonon coupling
        coherence_length: Optional coherence length
        reaction_wavelength: Optional reaction wavelength
        number_density: Optional number density
        
    Returns:
        Dictionary containing total and individual enhancement factors
    """
    # Calculate individual enhancement factors
    electron_enhancement = calculate_electron_screening(
        atomic_numbers, electron_density, temperature
    )
    
    lattice_enhancement = calculate_lattice_enhancement(
        phonon_spectrum, temperature, coupling_strength
    )
    
    coherent_enhancement = 1.0
    if all(x is not None for x in [coherence_length, reaction_wavelength, number_density]):
        coherent_enhancement = calculate_coherent_enhancement(
            coherence_length, reaction_wavelength, number_density
        )
    
    # Calculate total enhancement
    total_enhancement = (
        electron_enhancement * 
        lattice_enhancement * 
        coherent_enhancement
    )
    
    return {
        'total': total_enhancement,
        'electron_screening': electron_enhancement,
        'lattice': lattice_enhancement,
        'coherent': coherent_enhancement
    } 