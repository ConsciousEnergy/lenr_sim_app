/**
 * Parameter presets for various LENR simulation scenarios
 * 
 * Each preset contains default parameters for a specific type of simulation
 * along with a description and metadata.
 */

export const parameterPresets = [
  {
    id: 'room-temp-pd-d',
    name: 'Room Temperature Pd-D',
    description: 'Standard room temperature palladium-deuterium system, similar to Fleischmann-Pons setup',
    parameters: {
      T: 300, // Temperature in Kelvin (room temperature)
      lambda: 1.2e-10, // Tunneling parameter in meters
      r0: 1.5e-10, // Equilibrium separation in meters
      k_spring: 1200, // Spring constant in N/m
      potential: 'morse', // Potential model type
      T_impact: 5000, // Impact temperature (for impact tunneling)
      impact_duration: 1e-12, // Impact duration in seconds
    },
    category: 'electrolytic',
    reference: 'Fleischmann, M., & Pons, S. (1989)'
  },
  {
    id: 'high-temp-ni-h',
    name: 'High Temperature Ni-H',
    description: 'High temperature nickel-hydrogen system, similar to Rossi E-Cat',
    parameters: {
      T: 600, // Temperature in Kelvin
      lambda: 8.5e-11, // Tunneling parameter in meters
      r0: 1.1e-10, // Equilibrium separation in meters
      k_spring: 1800, // Spring constant in N/m
      potential: 'morse', // Potential model type
      T_impact: 8000, // Impact temperature (for impact tunneling)
      impact_duration: 8e-13, // Impact duration in seconds
    },
    category: 'gas-loading',
    reference: 'Rossi, A. (2011)'
  },
  {
    id: 'ultrasonic-pd-d',
    name: 'Ultrasonic Pd-D',
    description: 'Palladium-deuterium system with ultrasonic stimulation',
    parameters: {
      T: 320, // Temperature in Kelvin
      lambda: 1.4e-10, // Tunneling parameter in meters
      r0: 1.4e-10, // Equilibrium separation in meters
      k_spring: 1500, // Spring constant in N/m
      potential: 'harmonic', // Potential model type
      T_impact: 6000, // Impact temperature (for impact tunneling)
      impact_duration: 5e-13, // Impact duration in seconds
    },
    category: 'acoustic',
    reference: 'Stringham, R. (2003)'
  },
  {
    id: 'ti-d-fracture',
    name: 'Ti-D Fracture',
    description: 'Titanium-deuterium system with fracture-induced effects',
    parameters: {
      T: 280, // Temperature in Kelvin
      lambda: 1.1e-10, // Tunneling parameter in meters
      r0: 1.3e-10, // Equilibrium separation in meters
      k_spring: 2200, // Spring constant in N/m
      potential: 'morse', // Potential model type
      T_impact: 9000, // Impact temperature (for impact tunneling)
      impact_duration: 3e-13, // Impact duration in seconds
    },
    category: 'fracto-fusion',
    reference: 'Carpinteri, A., et al. (2015)'
  },
  {
    id: 'pd-d-laser',
    name: 'Pd-D Laser Stimulation',
    description: 'Palladium-deuterium system with laser stimulation',
    parameters: {
      T: 350, // Temperature in Kelvin
      lambda: 1.3e-10, // Tunneling parameter in meters
      r0: 1.45e-10, // Equilibrium separation in meters
      k_spring: 1350, // Spring constant in N/m
      potential: 'morse', // Potential model type
      T_impact: 7500, // Impact temperature (for impact tunneling)
      impact_duration: 2e-13, // Impact duration in seconds
    },
    category: 'optical',
    reference: 'Letts, D., & Cravens, D. (2003)'
  },
  {
    id: 'zr-d-pressure',
    name: 'Zr-D High Pressure',
    description: 'Zirconium-deuterium system under high pressure',
    parameters: {
      T: 400, // Temperature in Kelvin
      lambda: 9e-11, // Tunneling parameter in meters
      r0: 1.2e-10, // Equilibrium separation in meters
      k_spring: 2500, // Spring constant in N/m
      potential: 'harmonic', // Potential model type
      T_impact: 8500, // Impact temperature (for impact tunneling)
      impact_duration: 4e-13, // Impact duration in seconds
    },
    category: 'pressure',
    reference: 'Case, L. (1998)'
  },
  {
    id: 'pd-d-custom',
    name: 'Custom Parameters',
    description: 'User-defined custom parameters',
    parameters: {
      T: 300, // Temperature in Kelvin
      lambda: 1e-10, // Tunneling parameter in meters
      r0: 1e-10, // Equilibrium separation in meters
      k_spring: 1000, // Spring constant in N/m
      potential: 'harmonic', // Potential model type
      T_impact: 5000, // Impact temperature (for impact tunneling)
      impact_duration: 1e-12, // Impact duration in seconds
    },
    category: 'custom',
    reference: 'User Defined'
  }
];

// Helper function to get a preset by ID
export const getPresetById = (id) => {
  return parameterPresets.find(preset => preset.id === id) || parameterPresets[6]; // Default to custom
};

// Helper function to get presets by category
export const getPresetsByCategory = (category) => {
  return parameterPresets.filter(preset => preset.category === category);
};

// Get all available categories
export const getCategories = () => {
  const categories = new Set(parameterPresets.map(preset => preset.category));
  return Array.from(categories);
}; 