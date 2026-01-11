/**
 * RydbergMatterModel.js
 * 
 * This model implements the Rydberg Matter (RM) theory for LENR simulations.
 * RM is a phase where atoms occupy highly excited electronic states with extended orbitals,
 * which can enhance energy localization and lower Coulomb barriers for nuclear processes.
 */

/**
 * Calculate the energy level of a Rydberg atom with principal quantum number n
 * @param {number} n - Principal quantum number
 * @returns {number} Energy in eV
 */
const calculateRydbergEnergy = (n) => {
  // En = -13.6 eV / n^2 for hydrogen
  return -13.6 / (n * n);
};

/**
 * Calculate the orbital radius of a Rydberg atom
 * @param {number} n - Principal quantum number
 * @returns {number} Radius in nanometers
 */
const calculateRydbergRadius = (n) => {
  const BOHR_RADIUS = 0.0529; // nm
  return BOHR_RADIUS * n * n;
};

/**
 * Calculate the overlap probability between a halo electron and nucleus
 * @param {number} a - Orbital extension (in Bohr radii)
 * @param {number} r0 - Nuclear core radius (in nm)
 * @returns {number} Overlap probability
 */
const calculateOverlapProbability = (a, r0) => {
  // Poverlap ≈ (1 / π·a^3) · e^(-2r0/a)
  const BOHR_RADIUS = 0.0529; // nm
  const aInNm = a * BOHR_RADIUS;
  return (1 / (Math.PI * Math.pow(aInNm, 3))) * Math.exp(-2 * r0 / aInNm);
};

/**
 * Calculate the electric field in the double layer
 * @param {number} deltaV - Potential difference (in V)
 * @param {number} distance - Distance (in nm)
 * @returns {number} Electric field (in V/m)
 */
const calculateDoubleLayerField = (deltaV, distance) => {
  // E = ΔV / d
  return deltaV / (distance * 1e-9); // Convert nm to m
};

/**
 * Calculate the electric field around a Rydberg atom
 * @param {number} n - Principal quantum number
 * @param {number} Z - Atomic number
 * @returns {number} Electric field (in V/m)
 */
const calculateElectricField = (n, Z) => {
  // E = (Z * e) / (4πε₀ * r²)
  // Using SI units: e = 1.602e-19 C, ε₀ = 8.85e-12 F/m
  const ELEMENTARY_CHARGE = 1.602e-19; // Coulombs
  const EPSILON_0 = 8.85e-12; // F/m
  const r = calculateRydbergRadius(n) * 1e-9; // Convert nm to m
  
  return (Z * ELEMENTARY_CHARGE) / (4 * Math.PI * EPSILON_0 * r * r);
};

/**
 * Calculate the neutron formation cross-section via electron capture
 * @param {number} overlapProbability - Overlap probability
 * @returns {number} Cross-section (in m^2)
 */
const calculateNeutronFormationCrossSection = (overlapProbability) => {
  // σ = σ0 · Poverlap where σ0 ≈ 10^-21 m^2
  const BASE_CROSS_SECTION = 1e-21;
  return BASE_CROSS_SECTION * overlapProbability;
};

/**
 * Calculate the cross-section for nuclear reactions in Rydberg Matter
 * @param {number} n - Principal quantum number
 * @returns {number} Cross-section (in m²)
 */
const calculateCrossSection = (n) => {
  // For consistent API, we're implementing this as a wrapper around the existing function
  // First we calculate the overlap probability based on n
  const orbitalExtension = n; // Use n as the orbital extension in Bohr radii
  const nuclearRadius = 0.1; // typical nuclear radius in nm
  const overlapProb = calculateOverlapProbability(orbitalExtension, nuclearRadius);
  
  // Then calculate the cross-section
  return calculateNeutronFormationCrossSection(overlapProb);
};

/**
 * Calculate the Casimir force between two surfaces
 * @param {number} area - Area (in μm^2)
 * @param {number} distance - Distance (in nm)
 * @returns {number} Force (in N)
 */
const calculateCasimirForce = (area, distance) => {
  // FCasimir = -(π^2 ħc / 240) · (A / d^4)
  const HBAR_C = 1.97e-7; // eV·nm
  const PI_SQUARED = Math.PI * Math.PI;
  
  // Convert area from μm^2 to nm^2
  const areaInNm2 = area * 1e6;
  
  return -(PI_SQUARED * HBAR_C / 240) * (areaInNm2 / Math.pow(distance, 4)) * 1.602e-19; // Convert eV to J
};

/**
 * Calculate the tunneling probability enhancement in LENR conditions
 * @param {number} barrierHeight - Original barrier height (in eV)
 * @param {number} reducedHeight - Reduced barrier height due to LENR effects (in eV)
 * @param {number} particleMass - Mass of the particle (in u, atomic mass units)
 * @param {number} barrierWidth - Width of the barrier (in fm)
 * @returns {number} Tunneling probability enhancement factor
 */
const calculateTunnelingEnhancement = (barrierHeight, reducedHeight, particleMass, barrierWidth) => {
  // Convert atomic mass units to kg
  const massInKg = particleMass * 1.66053886e-27;
  
  // Convert eV to Joules
  const originalBarrierJ = barrierHeight * 1.602e-19;
  const reducedBarrierJ = reducedHeight * 1.602e-19;
  
  // Convert fm to m
  const widthInM = barrierWidth * 1e-15;
  
  // Calculate the tunneling exponents for both cases
  const HBAR = 1.054571817e-34; // J·s
  const originalExponent = (-2 / HBAR) * Math.sqrt(2 * massInKg * originalBarrierJ) * widthInM;
  const reducedExponent = (-2 / HBAR) * Math.sqrt(2 * massInKg * reducedBarrierJ) * widthInM;
  
  // Calculate the enhancement factor
  return Math.exp(originalExponent) / Math.exp(reducedExponent);
};

/**
 * Calculate the critical temperature for Bose-Einstein Condensation
 * @param {number} density - Particle density (in m^-3)
 * @param {number} mass - Particle mass (in u)
 * @returns {number} Critical temperature (in K)
 */
const calculateBECCriticalTemperature = (density, mass) => {
  // Convert atomic mass units to kg
  const massInKg = mass * 1.66053886e-27;
  
  // Constants
  const HBAR = 1.054571817e-34; // J·s
  const KB = 1.380649e-23; // J/K
  const ZETA_3_2 = 2.612; // Riemann zeta function of (3/2)
  
  // Tc = (2π ħ^2 / m kB) · (n / ζ(3/2))^(2/3)
  const term1 = 2 * Math.PI * Math.pow(HBAR, 2) / (massInKg * KB);
  const term2 = Math.pow(density / ZETA_3_2, 2/3);
  
  return term1 * term2;
};

/**
 * Calculate the temperature required for Bose-Einstein Condensation
 * @param {number} density - Particle density (in m⁻³)
 * @returns {number} Critical temperature (in K)
 */
const calculateBECTemperature = (density) => {
  // This is an alias for the existing function, using deuterium mass as default
  const DEUTERIUM_MASS = 2.014; // atomic mass units
  return calculateBECCriticalTemperature(density, DEUTERIUM_MASS);
};

/**
 * Calculate the Coulomb barrier penetration probability for fusion reactions
 * @param {number} Z1 - Atomic number of first nucleus
 * @param {number} Z2 - Atomic number of second nucleus
 * @param {number} reducedMass - Reduced mass in atomic mass units
 * @param {number} energy - Collision energy in keV
 * @param {number} screeningFactor - Electron screening factor (dimensionless)
 * @returns {number} Penetration probability
 */
const calculateCoulombPenetration = (Z1, Z2, reducedMass, energy, screeningFactor = 1.0) => {
  // Convert parameters to SI units
  const energyInJ = energy * 1000 * 1.602e-19; // keV to J
  const massInKg = reducedMass * 1.66053886e-27; // u to kg
  
  // Physical constants
  const ELEMENTARY_CHARGE = 1.602e-19; // C
  const HBAR = 1.054571817e-34; // J·s
  const EPSILON_0 = 8.85e-12; // F/m
  
  // Calculate Coulomb barrier height (in J)
  const coulombBarrier = (Z1 * Z2 * Math.pow(ELEMENTARY_CHARGE, 2)) / 
                         (4 * Math.PI * EPSILON_0 * screeningFactor);
  
  // Calculate Gamow factor
  const gamowFactor = Math.PI * Z1 * Z2 * ELEMENTARY_CHARGE * 
                     Math.sqrt(2 * massInKg / energyInJ) / HBAR;
  
  // Calculate penetration probability
  return Math.exp(-gamowFactor);
};

/**
 * Generate simulation parameters for LENR based on Rydberg Matter theory
 * @param {Object} config - Configuration parameters
 * @returns {Object} Simulation parameters
 */
const generateRydbergSimulationParams = (config = {}) => {
  // Default configuration
  const defaultConfig = {
    principalQuantumNumber: 10,
    orbitalExtension: 10, // in Bohr radii
    nuclearRadius: 0.1, // nm
    potentialDifference: 0.1, // V
    doubleLayerDistance: 1, // nm
    casimirArea: 1, // μm^2
    casimirDistance: 1, // nm
    originalBarrierHeight: 1000, // eV
    reducedBarrierHeight: 500, // eV
    particleMass: 2, // u (deuteron)
    barrierWidth: 1, // fm
    particleDensity: 1e28, // m^-3
    atomicNumber: 1, // Z (hydrogen)
    // New parameters for Coulomb barrier calculations
    targetZ: 1, // Atomic number of target nucleus (default: hydrogen)
    collisionEnergy: 0.1, // keV
    screeningFactor: 1.2 // Enhanced screening due to Rydberg electron cloud
  };
  
  // Merge with provided config
  const mergedConfig = { ...defaultConfig, ...config };
  
  // Calculate parameters
  const energy = calculateRydbergEnergy(mergedConfig.principalQuantumNumber);
  const radius = calculateRydbergRadius(mergedConfig.principalQuantumNumber);
  const overlapProb = calculateOverlapProbability(mergedConfig.orbitalExtension, mergedConfig.nuclearRadius);
  
  // Use new functions
  const electricField = calculateElectricField(
    mergedConfig.principalQuantumNumber, 
    mergedConfig.atomicNumber
  );
  const neutronCrossSection = calculateCrossSection(mergedConfig.principalQuantumNumber);
  
  // Continue with existing functions
  const casimirForce = calculateCasimirForce(mergedConfig.casimirArea, mergedConfig.casimirDistance);
  const tunnelingEnhancement = calculateTunnelingEnhancement(
    mergedConfig.originalBarrierHeight,
    mergedConfig.reducedBarrierHeight,
    mergedConfig.particleMass,
    mergedConfig.barrierWidth
  );
  
  // Use new BEC temperature function
  const criticalTemp = calculateBECTemperature(mergedConfig.particleDensity);
  
  // Calculate Coulomb penetration probability
  const reducedMass = (mergedConfig.particleMass * mergedConfig.targetZ) / 
                      (mergedConfig.particleMass + mergedConfig.targetZ);
  const penetrationProb = calculateCoulombPenetration(
    mergedConfig.atomicNumber,
    mergedConfig.targetZ,
    reducedMass,
    mergedConfig.collisionEnergy,
    mergedConfig.screeningFactor
  );
  
  return {
    rydbergEnergy: energy,
    rydbergRadius: radius,
    overlapProbability: overlapProb,
    electricField: electricField,
    crossSection: neutronCrossSection,
    casimirForce: casimirForce,
    tunnelingEnhancement: tunnelingEnhancement,
    becTemperature: criticalTemp,
    coulombPenetration: penetrationProb,
    config: mergedConfig
  };
};

// Create a single object with all functions
const RydbergMatterModel = {
  calculateRydbergEnergy,
  calculateRydbergRadius,
  calculateOverlapProbability,
  calculateDoubleLayerField,
  calculateElectricField,
  calculateNeutronFormationCrossSection,
  calculateCrossSection,
  calculateCasimirForce,
  calculateTunnelingEnhancement,
  calculateBECCriticalTemperature,
  calculateBECTemperature,
  calculateCoulombPenetration,
  generateRydbergSimulationParams
};

// Export both named functions and default object at once
export {
  calculateRydbergEnergy,
  calculateRydbergRadius,
  calculateOverlapProbability,
  calculateDoubleLayerField,
  calculateElectricField,
  calculateNeutronFormationCrossSection,
  calculateCrossSection,
  calculateCasimirForce,
  calculateTunnelingEnhancement,
  calculateBECCriticalTemperature,
  calculateBECTemperature,
  calculateCoulombPenetration,
  generateRydbergSimulationParams
};

// Export the entire object as default export
export default RydbergMatterModel; 