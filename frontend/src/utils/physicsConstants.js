/**
 * Physics Constants and Utilities for CMNS/LENR Visualization
 * 
 * This file contains physical constants and helper functions for accurately 
 * representing LENR/CMNS physics in our visualization.
 */

// Physical constants (in SI units)
export const CONSTANTS = {
  // Fundamental constants
  ELECTRON_CHARGE: 1.602176634e-19, // C
  PLANCK_CONSTANT: 6.62607015e-34, // J·s
  BOLTZMANN_CONSTANT: 1.380649e-23, // J/K
  AVOGADRO_NUMBER: 6.02214076e23, // mol^-1
  
  // Nuclear physics
  DEUTERON_MASS: 3.3435837724e-27, // kg
  PROTON_MASS: 1.67262192369e-27, // kg
  NEUTRON_MASS: 1.67492749804e-27, // kg
  ELECTRON_MASS: 9.1093837015e-31, // kg
  
  // Atomic dimensions
  ATOMIC_UNIT_LENGTH: 5.29177210903e-11, // m (Bohr radius)
  
  // Element-specific
  PD_LATTICE_CONSTANT: 3.89e-10, // m (Palladium FCC lattice constant)
  NI_LATTICE_CONSTANT: 3.52e-10, // m (Nickel FCC lattice constant)
  TI_LATTICE_CONSTANT: 2.95e-10, // m (Titanium HCP lattice constant)
  ZR_LATTICE_CONSTANT: 3.23e-10, // m (Zirconium HCP lattice constant)
  
  // LENR/CMNS specific
  DD_FUSION_ENERGY: 3.27e-12, // J (D-D fusion energy release per event)
  COULOMB_BARRIER_PD_D: 290000, // eV (approximate Coulomb barrier height for D in Pd)
  LATTICE_SCREENING_FACTOR: 10, // Typical screening factor in metal lattice
  
  // Visualization scale factors
  SCALE_FACTOR: 1e10, // Factor to scale atomic distances for visualization
  ENERGY_SCALE: 1e-12, // Scale factor for energy visualization
};

// Element properties for visualization
export const ELEMENT_PROPERTIES = {
  H: { 
    color: 0xFFFFFF, 
    radius: 0.25e-10, 
    mass: 1.00784, 
    name: 'Hydrogen',
    description: 'Lightest element, can participate in fusion reactions as fuel'
  },
  D: { 
    color: 0x0088FF, 
    radius: 0.25e-10, 
    mass: 2.01410, 
    name: 'Deuterium',
    description: 'Hydrogen isotope, primary LENR fuel'
  },
  Pd: { 
    color: 0x909090, 
    radius: 1.40e-10, 
    mass: 106.42, 
    name: 'Palladium',
    description: 'Common LENR host metal with high hydrogen absorption'
  },
  Ni: { 
    color: 0xC0C0A0, 
    radius: 1.35e-10, 
    mass: 58.6934, 
    name: 'Nickel',
    description: 'Host metal used in Ni-H LENR systems'
  },
  Ti: { 
    color: 0xA0A0A0, 
    radius: 1.40e-10, 
    mass: 47.867, 
    name: 'Titanium',
    description: 'Transition metal with hydrogen storage capabilities'
  },
  Zr: { 
    color: 0xA0A0C0, 
    radius: 1.55e-10, 
    mass: 91.224, 
    name: 'Zirconium',
    description: 'Metal used in some LENR experiments and nuclear applications'
  },
  Li: { 
    color: 0xFFB0B0, 
    radius: 1.45e-10, 
    mass: 6.94, 
    name: 'Lithium',
    description: 'Light metal used in some LENR electrolytes and for nuclear reactions'
  }
};

// Lattice structures
export const LATTICE_STRUCTURES = {
  FCC: { 
    name: 'Face-centered cubic',
    coordNumber: 12,
    description: 'Crystal structure of Pd and Ni with octahedral and tetrahedral sites for hydrogen'
  },
  BCC: { 
    name: 'Body-centered cubic',
    coordNumber: 8,
    description: 'Crystal structure with tetrahedral sites for hydrogen'
  },
  HCP: { 
    name: 'Hexagonal close-packed',
    coordNumber: 12,
    description: 'Crystal structure of Ti and Zr with tetrahedral and octahedral sites'
  }
};

// LENR reaction types for visualization
export const REACTION_TYPES = {
  DD_FUSION: {
    name: 'D-D Fusion',
    equation: '²D + ²D → ³He + n + 3.27 MeV',
    description: 'Deuterium-Deuterium fusion releasing neutrons and energy'
  },
  DPD_FUSION: {
    name: 'D-Pd-D Fusion',
    equation: '²D + Pd + ²D → ⁴He + Pd + 23.8 MeV',
    description: 'Pd-catalyzed fusion of deuterium to helium'
  },
  ELECTRON_CAPTURE: {
    name: 'Electron Capture',
    equation: 'p + e⁻ → n + νe',
    description: 'Proton captures electron to form neutron and neutrino'
  },
  WIDOM_LARSEN: {
    name: 'Widom-Larsen Process',
    equation: 'e⁻ + p → n + νe followed by n + X → X+1 + γ',
    description: 'Surface plasmon polariton creation of neutrons, followed by neutron capture'
  }
};

// Helper functions for LENR physics calculations
export const calculateTunnelingProbability = (lambda, r0, T, k_spring, potential = 'harmonic') => {
  // Simple approximation of tunneling probability using WKB approximation
  const barrier = CONSTANTS.COULOMB_BARRIER_PD_D * CONSTANTS.ELECTRON_CHARGE; // J
  const kB = CONSTANTS.BOLTZMANN_CONSTANT;
  const hbar = CONSTANTS.PLANCK_CONSTANT / (2 * Math.PI);
  
  // Calculate effective barrier height considering lattice screening
  const effectiveBarrier = barrier / CONSTANTS.LATTICE_SCREENING_FACTOR;
  
  // Thermal energy (J)
  const thermalEnergy = kB * T;
  
  // Simplified tunneling probability based on potential type
  if (potential === 'harmonic') {
    // Harmonic oscillator approximation
    const omega = Math.sqrt(k_spring / (2 * CONSTANTS.DEUTERON_MASS));
    const zeroPointEnergy = 0.5 * hbar * omega;
    return Math.exp(-2 * Math.sqrt(2 * CONSTANTS.DEUTERON_MASS * effectiveBarrier) * r0 / hbar) * 
           Math.exp(zeroPointEnergy / thermalEnergy);
  } else if (potential === 'morse') {
    // Morse potential approximation - different tunneling behavior
    const dissociationEnergy = 2.0 * effectiveBarrier;
    const alpha = lambda / r0;
    return Math.exp(-2 * Math.sqrt(2 * CONSTANTS.DEUTERON_MASS * dissociationEnergy) * r0 / hbar) *
           Math.exp(-alpha * r0);
  }
  
  // Default calculation
  return Math.exp(-2 * Math.sqrt(2 * CONSTANTS.DEUTERON_MASS * effectiveBarrier) * r0 / hbar);
};

// Calculate quantum oscillation amplitude based on spring constant and temperature
export const calculateOscillationAmplitude = (k_spring, T) => {
  const kB = CONSTANTS.BOLTZMANN_CONSTANT;
  return Math.sqrt(kB * T / k_spring);
};

// Get element color based on energy state/temperature
export const getElementColorByEnergy = (element, energyLevel) => {
  // energyLevel should be between 0-1 (normalized energy)
  const baseColor = new THREE.Color(ELEMENT_PROPERTIES[element].color);
  
  // Create a color scale from blue (cold) to white (medium) to red (hot)
  if (energyLevel < 0.5) {
    // Blend from blue to white
    const blendFactor = energyLevel * 2;
    return new THREE.Color(
      baseColor.r * (1 - blendFactor) + blendFactor,
      baseColor.g * (1 - blendFactor) + blendFactor,
      baseColor.b * (1 - blendFactor) + blendFactor
    );
  } else {
    // Blend from white to red
    const blendFactor = (energyLevel - 0.5) * 2;
    return new THREE.Color(
      1,
      1 * (1 - blendFactor),
      1 * (1 - blendFactor)
    );
  }
};

// Calculate vibrational frequency of atoms in the lattice
export const calculateVibrationalFrequency = (k_spring, atomMass) => {
  return Math.sqrt(k_spring / atomMass) / (2 * Math.PI);
};

// Calculate phonon wavelength based on temperature
export const calculatePhononWavelength = (T) => {
  const kB = CONSTANTS.BOLTZMANN_CONSTANT;
  const hbar = CONSTANTS.PLANCK_CONSTANT / (2 * Math.PI);
  
  // Debye temperature approximation for palladium (K)
  const debyeTemp = 275;
  
  // Dominant phonon wavelength approximation
  const speedOfSound = 3000; // m/s (approximate for Pd)
  const thermalEnergy = kB * T;
  const frequency = thermalEnergy / hbar;
  
  return speedOfSound / frequency;
};

export default {
  CONSTANTS,
  ELEMENT_PROPERTIES,
  LATTICE_STRUCTURES,
  REACTION_TYPES,
  calculateTunnelingProbability,
  calculateOscillationAmplitude,
  getElementColorByEnergy,
  calculateVibrationalFrequency,
  calculatePhononWavelength
}; 