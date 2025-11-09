/**
 * Application constants for the LENR Simulation Application
 */

// Storage keys for local storage
export const STORAGE_KEYS = {
  PREFERENCES: 'lenr_sim_preferences',
  RECENT_SIMULATIONS: 'lenr_sim_recent_simulations',
  THEME: 'lenr_sim_theme',
  LAST_VIEW: 'lenr_sim_last_view'
};

// Default theme values
export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system'
};

// View modes for the application
export const VIEW_MODES = {
  UNIFIED_THEORY: 'unified_theory',
  ENHANCED_FUSION: 'enhanced_fusion',
  LATTICE_DYNAMICS: 'lattice_dynamics',
  REACTION_PRODUCTS: 'reaction_products',
  COMPARISON: 'comparison'
};

// Elements used in LENR reactions
export const ELEMENTS = {
  HYDROGEN: {
    symbol: 'H',
    name: 'Hydrogen',
    atomicNumber: 1,
    color: '#33A1C9'
  },
  DEUTERIUM: {
    symbol: 'D',
    name: 'Deuterium',
    atomicNumber: 1,
    mass: 2,
    color: '#2969B0',
    isotope: true
  },
  LITHIUM: {
    symbol: 'Li',
    name: 'Lithium',
    atomicNumber: 3,
    color: '#FF6347'
  },
  NICKEL: {
    symbol: 'Ni',
    name: 'Nickel',
    atomicNumber: 28, 
    color: '#A6A6A6'
  },
  PALLADIUM: {
    symbol: 'Pd',
    name: 'Palladium',
    atomicNumber: 46,
    color: '#B9B9B9'
  },
  PLATINUM: {
    symbol: 'Pt',
    name: 'Platinum',
    atomicNumber: 78,
    color: '#E5E4E2'
  },
  TITANIUM: {
    symbol: 'Ti',
    name: 'Titanium',
    atomicNumber: 22,
    color: '#8C8C8C'
  }
};

// Common LENR reactions
export const REACTIONS = {
  D_D: {
    name: 'D-D Fusion',
    reactants: ['D', 'D'],
    products: [
      { products: ['³He', 'n'], probability: 0.5 },
      { products: ['T', 'p'], probability: 0.5 }
    ],
    coulombBarrier: 0.42, // MeV
    description: 'Standard deuterium-deuterium fusion reaction'
  },
  D_T: {
    name: 'D-T Fusion',
    reactants: ['D', 'T'],
    products: [
      { products: ['⁴He', 'n'], probability: 1.0 }
    ],
    coulombBarrier: 0.38, // MeV
    description: 'Deuterium-tritium fusion, commonly used in tokamak fusion research'
  },
  P_LI: {
    name: 'p-⁷Li Fusion',
    reactants: ['p', '⁷Li'],
    products: [
      { products: ['⁴He', '⁴He'], probability: 1.0 }
    ],
    coulombBarrier: 1.62, // MeV
    description: 'Proton-lithium7 aneutronic fusion reaction'
  },
  LENR_NI_H: {
    name: 'Ni-H LENR',
    reactants: ['Ni', 'H'],
    products: [
      { products: ['Cu'], probability: 0.8 },
      { products: ['Ni', 'H'], probability: 0.2 }
    ],
    coulombBarrier: 7.63, // MeV
    description: 'Nickel-hydrogen low energy nuclear reaction'
  },
  LENR_PD_D: {
    name: 'Pd-D LENR',
    reactants: ['Pd', 'D'],
    products: [
      { products: ['Pd', 'D'], probability: 0.985 },
      { products: ['Pd', 'p', 'n'], probability: 0.01 },
      { products: ['Pd', '³He'], probability: 0.004 },
      { products: ['Ag'], probability: 0.001 }
    ],
    coulombBarrier: 16.44, // MeV
    description: 'Palladium-deuterium low energy nuclear reaction (Fleischmann-Pons type)'
  }
};

// Enhancement mechanism types
export const ENHANCEMENT_MECHANISMS = {
  ELECTRON_SCREENING: 'electronScreening',
  QUANTUM_TUNNELING: 'quantumTunneling',
  RYDBERG_MATTER: 'rydbergMatter',
  CASIMIR_FORCES: 'casimirForces',
  DOUBLE_LAYERS: 'doubleLayers',
  OPPENHEIMER_PHILLIPS: 'oppenheimerPhillips',
  QUANTUM_COHERENCE: 'quantumCoherence',
  SHOCK_ENERGY: 'shockEnergy'
};

// Units and conversions
export const UNITS = {
  ENERGY: {
    EV: 'eV',
    KEV: 'keV',
    MEV: 'MeV',
    J: 'J'
  },
  POWER: {
    W: 'W',
    KW: 'kW',
    MW: 'MW'
  },
  TEMPERATURE: {
    K: 'K',
    C: 'C',
    F: 'F'
  },
  PRESSURE: {
    PA: 'Pa',
    KPA: 'kPa',
    MPA: 'MPa',
    ATM: 'atm'
  },
  CONVERSIONS: {
    EV_TO_J: 1.602176634e-19,
    J_TO_EV: 6.241509074e18,
    K_TO_C: (k) => k - 273.15,
    C_TO_K: (c) => c + 273.15,
    K_TO_F: (k) => (k - 273.15) * 9/5 + 32,
    F_TO_K: (f) => (f - 32) * 5/9 + 273.15
  }
};

// API endpoints
export const API_ENDPOINTS = {
  ENHANCED_FUSION: '/api/physics/enhanced-fusion',
  UNIFIED_THEORY: '/api/physics/unified-theory',
  LATTICE_DYNAMICS: '/api/physics/lattice-dynamics',
  REACTION_PRODUCTS: '/api/physics/reaction-products',
  COMPARISON: '/api/physics/comparison',
  SCENARIOS: '/api/scenarios',
  USER_SETTINGS: '/api/settings'
};

// Physical constants
export const PHYSICAL_CONSTANTS = {
  PLANCK_CONSTANT: 6.62607015e-34, // J·s
  REDUCED_PLANCK: 1.054571817e-34, // ħ in J·s
  BOLTZMANN_CONSTANT: 1.380649e-23, // J/K
  ELECTRON_MASS: 9.1093837015e-31, // kg
  PROTON_MASS: 1.67262192369e-27, // kg
  NEUTRON_MASS: 1.67492749804e-27, // kg
  ELEMENTARY_CHARGE: 1.602176634e-19, // C
  VACUUM_PERMITTIVITY: 8.8541878128e-12, // F/m
  SPEED_OF_LIGHT: 299792458, // m/s
  AVOGADRO_NUMBER: 6.02214076e23, // mol⁻¹
  ELECTRON_VOLT: 1.602176634e-19, // J
};

export default {
  STORAGE_KEYS,
  THEMES,
  VIEW_MODES,
  ELEMENTS,
  REACTIONS,
  ENHANCEMENT_MECHANISMS,
  UNITS,
  API_ENDPOINTS,
  PHYSICAL_CONSTANTS
}; 