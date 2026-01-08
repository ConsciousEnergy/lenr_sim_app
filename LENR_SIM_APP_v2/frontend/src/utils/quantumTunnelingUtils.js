/**
 * Quantum Tunneling Utilities
 * 
 * Provides utility functions for quantum tunneling calculations and visualization
 * based on the Wentzel–Kramers–Brillouin (WKB) approximation and related methods.
 */

// Physical constants
const HBAR = 1.054571817e-34; // Reduced Planck constant in J·s
const KB = 1.380649e-23; // Boltzmann constant in J/K
const _ELECTRON_MASS = 9.1093837015e-31; // Electron mass in kg - available for electron tunneling calculations
const _PROTON_MASS = 1.67262192369e-27; // Proton mass in kg - available for proton tunneling calculations  
const _DEUTERON_MASS = 3.3435837724e-27; // Deuteron mass in kg - available for D-D fusion calculations
const ELECTRON_CHARGE = 1.602176634e-19; // Elementary charge in C
const VACUUM_PERMITTIVITY = 8.8541878128e-12; // Vacuum permittivity in F/m
const EV_TO_J = ELECTRON_CHARGE; // Conversion from eV to J
const KEV_TO_J = 1e3 * EV_TO_J; // Conversion from keV to J
const _MEV_TO_J = 1e6 * EV_TO_J; // Conversion from MeV to J - available for nuclear energy calculations

/**
 * Calculate the Coulomb potential between two charged particles
 * 
 * @param {number} z1 - Charge of first particle (in elementary charge units)
 * @param {number} z2 - Charge of second particle (in elementary charge units)
 * @param {number} distance - Distance between particles in meters
 * @returns {number} - Potential energy in Joules
 */
export const calculateCoulombPotential = (z1, z2, distance) => {
  const coulombConstant = 1 / (4 * Math.PI * VACUUM_PERMITTIVITY);
  return coulombConstant * z1 * z2 * ELECTRON_CHARGE * ELECTRON_CHARGE / distance;
};

/**
 * Calculate Yukawa potential (screened Coulomb potential)
 * 
 * @param {number} z1 - Charge of first particle (in elementary charge units)
 * @param {number} z2 - Charge of second particle (in elementary charge units)
 * @param {number} distance - Distance between particles in meters
 * @param {number} screeningLength - Screening length in meters
 * @returns {number} - Potential energy in Joules
 */
export const calculateYukawaPotential = (z1, z2, distance, screeningLength) => {
  const coulombPotential = calculateCoulombPotential(z1, z2, distance);
  return coulombPotential * Math.exp(-distance / screeningLength);
};

/**
 * Calculate effective potential including various effects
 * 
 * @param {Object} params - Potential parameters
 * @param {string} params.potentialType - Type of potential ('coulomb', 'yukawa', 'morse', etc.)
 * @param {number} params.z1 - Charge of first particle
 * @param {number} params.z2 - Charge of second particle
 * @param {number} params.distance - Distance between particles in meters
 * @param {number} params.screeningLength - Screening length for Yukawa potential in meters
 * @param {number} params.electronScreeningFactor - Enhancement factor due to electron screening
 * @returns {number} - Effective potential energy in Joules
 */
export const calculateEffectivePotential = (params) => {
  const { potentialType, z1, z2, distance, screeningLength = 2.5e-11, electronScreeningFactor = 1.0 } = params;
  
  let potential;
  
  switch (potentialType) {
    case 'yukawa':
      potential = calculateYukawaPotential(z1, z2, distance, screeningLength);
      break;
    case 'coulomb':
    default:
      potential = calculateCoulombPotential(z1, z2, distance);
  }
  
  // Apply electron screening factor
  potential = potential / electronScreeningFactor;
  
  return potential;
};

/**
 * Calculate tunneling probability using WKB approximation
 * 
 * @param {Object} params - Tunneling parameters
 * @param {string} params.potentialType - Type of potential ('coulomb', 'yukawa', 'morse', etc.)
 * @param {number} params.z1 - Charge of first particle
 * @param {number} params.z2 - Charge of second particle 
 * @param {number} params.reducedMass - Reduced mass of the system in kg
 * @param {number} params.energy - Energy of the incident particle in Joules
 * @param {number} params.barrierStart - Distance where barrier starts in meters
 * @param {number} params.barrierEnd - Distance where barrier ends in meters
 * @param {number} params.screeningLength - Screening length for Yukawa potential in meters
 * @param {number} params.electronScreeningFactor - Enhancement factor due to electron screening
 * @returns {number} - Tunneling probability [0, 1]
 */
export const calculateWKBTunnelingProbability = (params) => {
  const { 
    potentialType, 
    z1, 
    z2, 
    reducedMass, 
    energy, 
    barrierStart, 
    barrierEnd, 
    screeningLength,
    electronScreeningFactor
  } = params;
  
  // Number of points for numerical integration
  const numPoints = 1000;
  const dx = (barrierEnd - barrierStart) / numPoints;
  
  // Integrate the WKB exponent
  let integralValue = 0;
  
  for (let i = 0; i < numPoints; i++) {
    const x = barrierStart + i * dx;
    const potential = calculateEffectivePotential({
      potentialType,
      z1,
      z2,
      distance: x,
      screeningLength,
      electronScreeningFactor
    });
    
    // Only integrate where potential > energy (classical forbidden region)
    if (potential > energy) {
      const k = Math.sqrt(2 * reducedMass * (potential - energy)) / HBAR;
      integralValue += k * dx;
    }
  }
  
  // Return WKB tunneling probability
  return Math.exp(-2 * integralValue);
};

/**
 * Calculate Gamow factor for fusion reactions
 * 
 * @param {number} z1 - Charge of first particle (in elementary charge units)
 * @param {number} z2 - Charge of second particle (in elementary charge units)
 * @param {number} reducedMass - Reduced mass of the system in kg
 * @param {number} energyKeV - Energy in keV
 * @returns {number} - Gamow factor (dimensionless)
 */
export const calculateGamowFactor = (z1, z2, reducedMass, energyKeV) => {
  const energy = energyKeV * KEV_TO_J;
  const coulombParameter = z1 * z2 * ELECTRON_CHARGE * ELECTRON_CHARGE * Math.sqrt(reducedMass / (2 * energy)) / HBAR;
  return Math.exp(-2 * Math.PI * coulombParameter);
};

/**
 * Generate tunneling visualization data
 * 
 * @param {Object} params - Tunneling parameters
 * @param {number} params.minDistance - Minimum distance in meters
 * @param {number} params.maxDistance - Maximum distance in meters 
 * @param {number} params.numPoints - Number of points to calculate
 * @param {Object} potentialParams - Parameters for potential calculation
 * @returns {Object} - Object containing visualization datasets
 */
export const generateTunnelingVisualizationData = (params, potentialParams) => {
  const { minDistance, maxDistance, numPoints } = params;
  
  const positions = [];
  const potentialValues = [];
  const waveFunction = [];
  const tunnelingProbabilities = [];
  
  const dx = (maxDistance - minDistance) / numPoints;
  
  // Calculate classical turning point
  let classicalTurningPoint = null;
  
  for (let i = 0; i <= numPoints; i++) {
    const distance = minDistance + i * dx;
    positions.push(distance);
    
    // Calculate potential at this distance
    const potential = calculateEffectivePotential({
      ...potentialParams,
      distance
    });
    potentialValues.push(potential);
    
    // Find classical turning point where potential = energy
    if (classicalTurningPoint === null && 
        i > 0 && 
        potentialValues[i-1] > potentialParams.energy && 
        potential <= potentialParams.energy) {
      classicalTurningPoint = distance;
    }
    
    // Calculate tunneling probability from this position
    if (potentialParams.energy && potentialParams.reducedMass) {
      const tunnelProb = calculateWKBTunnelingProbability({
        ...potentialParams,
        barrierStart: distance,
        barrierEnd: maxDistance
      });
      tunnelingProbabilities.push(tunnelProb);
    }
    
    // Generate simplified wave function visualization (not physically accurate, just for illustration)
    let amplitude;
    if (distance < classicalTurningPoint || classicalTurningPoint === null) {
      // Oscillatory region
      amplitude = 0.5 * Math.sin(Math.sqrt(2 * potentialParams.reducedMass * 
                                Math.abs(potentialParams.energy - potential)) / 
                                HBAR * distance);
    } else {
      // Exponentially decaying region
      amplitude = 0.5 * Math.exp(-Math.sqrt(2 * potentialParams.reducedMass * 
                                Math.abs(potential - potentialParams.energy)) / 
                                HBAR * (distance - classicalTurningPoint));
    }
    waveFunction.push(amplitude);
  }
  
  return {
    positions,
    potentialValues,
    waveFunction,
    tunnelingProbabilities,
    classicalTurningPoint
  };
};

/**
 * Calculate temperature effects on tunneling probability
 * 
 * @param {Object} params - Parameters for calculation
 * @param {number} params.temperature - Temperature in Kelvin
 * @param {Object} tunnelingParams - Parameters for tunneling calculation
 * @returns {number} - Temperature-enhanced tunneling probability
 */
export const calculateTemperatureEnhancedTunneling = (params, tunnelingParams) => {
  const { temperature } = params;
  
  // Get base tunneling probability
  const baseProbability = calculateWKBTunnelingProbability(tunnelingParams);
  
  // Calculate thermal energy
  const thermalEnergy = KB * temperature;
  
  // Simple model: at higher temperatures, particles in the high-energy tail of the
  // Maxwell-Boltzmann distribution have higher tunneling probabilities
  const enhancementFactor = 1 + Math.sqrt(thermalEnergy / (tunnelingParams.energy * 10));
  
  return Math.min(1, baseProbability * enhancementFactor);
};

/**
 * Calculate coherent multi-site tunneling enhancement
 * 
 * @param {Object} params - Parameters for calculation
 * @param {number} params.coherenceLength - Coherence length in meters
 * @param {number} params.sitesCount - Number of coherent sites
 * @param {Object} tunnelingParams - Parameters for tunneling calculation
 * @returns {number} - Coherence-enhanced tunneling probability
 */
export const calculateCoherentTunnelingEnhancement = (params, tunnelingParams) => {
  const { coherenceLength, sitesCount } = params;
  
  // Base tunneling probability
  const baseProbability = calculateWKBTunnelingProbability(tunnelingParams);
  
  // Calculate coherence enhancement factor
  // In coherent tunneling, amplitude adds rather than probability, leading to N² enhancement
  const coherenceEnhancement = Math.min(sitesCount, 1 + (coherenceLength / 1e-10));
  
  return Math.min(1, baseProbability * Math.pow(coherenceEnhancement, 2));
};

export default {
  calculateCoulombPotential,
  calculateYukawaPotential,
  calculateEffectivePotential,
  calculateWKBTunnelingProbability,
  calculateGamowFactor,
  generateTunnelingVisualizationData,
  calculateTemperatureEnhancedTunneling,
  calculateCoherentTunnelingEnhancement
}; 