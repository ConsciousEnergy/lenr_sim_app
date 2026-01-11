/**
 * Quantum Effects Utilities
 * 
 * Utility functions for calculating quantum effects in LENR simulations
 */

/**
 * Calculate quantum tunneling probability
 * @param {number} distance - Distance between particles in Angstroms
 * @param {number} barrierHeight - Energy barrier height in eV
 * @param {number} particleMass - Reduced mass of the particle system
 * @returns {number} Tunneling probability (0-1)
 */
export const calculateTunnelingProbability = (distance, barrierHeight, particleMass = 1) => {
  // Constants (in appropriate units for the calculation)
  const hBar = 1.054571817e-34; // reduced Planck constant in J·s
  const electronCharge = 1.602176634e-19; // electron charge in C
  const amu = 1.66053906660e-27; // atomic mass unit in kg
  
  // Convert inputs to SI units
  const barrierHeightJoules = barrierHeight * electronCharge; // Convert eV to Joules
  const distanceMeters = distance * 1e-10; // Convert Angstroms to meters
  const massKg = particleMass * amu; // Convert AMU to kg
  
  // Calculate barrier width - simplified as distance between particles minus typical nuclear diameter
  const nuclearDiameter = 2e-15; // 2 femtometers in meters
  const barrierWidth = Math.max(distanceMeters - nuclearDiameter, 0);
  
  if (barrierWidth <= 0 || barrierHeightJoules <= 0) {
    return 1; // No barrier or particles already in contact
  }
  
  // Calculate the wave number k for tunneling
  const k = Math.sqrt(2 * massKg * barrierHeightJoules) / hBar;
  
  // Simplified WKB approximation for tunneling probability
  const exponent = -2 * k * barrierWidth;
  
  // Return probability (clamped between 0 and 1)
  return Math.min(Math.max(Math.exp(exponent), 0), 1);
};

/**
 * Calculate decoherence time based on environmental parameters
 * @param {Object} params - Environmental parameters 
 * @returns {number} Decoherence time in seconds
 */
export const calculateDecoherenceTime = (params = {}) => {
  const {
    temperature = 300, // temperature in Kelvin
    pressure = 1,      // pressure in atm
    environment = 'lattice', // 'lattice', 'vacuum', 'liquid'
    particleSize = 1   // size of particle in Angstroms
  } = params;
  
  // Base decoherence rate based on environment
  let baseDecoherenceTime;
  switch (environment) {
    case 'vacuum':
      baseDecoherenceTime = 1e-6; // microseconds
      break;
    case 'liquid':
      baseDecoherenceTime = 1e-13; // femtoseconds
      break;
    case 'lattice':
    default:
      baseDecoherenceTime = 1e-12; // picoseconds
      break;
  }
  
  // Adjust for temperature (higher temperature = faster decoherence)
  const temperatureFactor = 300 / temperature;
  
  // Adjust for pressure (higher pressure = faster decoherence)
  const pressureFactor = 1 / pressure;
  
  // Adjust for particle size (larger particles decohere faster)
  const sizeFactor = 1 / particleSize;
  
  // Combine all factors (simplified model)
  return baseDecoherenceTime * temperatureFactor * pressureFactor * sizeFactor;
};

/**
 * Calculate electronic screening effect in a metallic lattice
 * @param {number} charge - Charge of the particle
 * @param {number} electronDensity - Electron density in the material
 * @param {number} distance - Distance between interacting particles in Angstroms
 * @returns {Object} Screening parameters including reduced potential
 */
export const calculateElectronicScreening = (charge = 1, electronDensity = 1e28, distance = 1) => {
  // Constants
  const epsilon0 = 8.85418782e-12; // vacuum permittivity in F/m
  const electronCharge = 1.602176634e-19; // electron charge in C
  const boltzmannConstant = 1.380649e-23; // Boltzmann constant in J/K
  const temperature = 300; // room temperature in K
  
  // Convert distance to meters
  const distanceMeters = distance * 1e-10;
  
  // Calculate Debye screening length (in meters)
  const debyeLength = Math.sqrt(
    (epsilon0 * boltzmannConstant * temperature) / 
    (electronDensity * electronCharge * electronCharge)
  );
  
  // Calculate screening factor
  const screeningFactor = Math.exp(-distanceMeters / debyeLength);
  
  // Calculate effective charge (reduced by screening)
  const effectiveCharge = charge * screeningFactor;
  
  // Calculate screened Coulomb potential
  const unscreenedPotential = (charge * electronCharge * charge * electronCharge) / 
                             (4 * Math.PI * epsilon0 * distanceMeters);
  const screenedPotential = unscreenedPotential * screeningFactor;
  
  // Calculate potential reduction ratio
  const potentialReductionRatio = screenedPotential / unscreenedPotential;
  
  return {
    debyeLength: debyeLength * 1e10, // Convert back to Angstroms
    screeningFactor,
    effectiveCharge,
    screenedPotential,
    potentialReductionRatio
  };
};

/**
 * Calculate quantum confinement effects for interstitial atoms
 * @param {number} atomSize - Size of the confined atom in Angstroms
 * @param {number} cavitySize - Size of the confining cavity in Angstroms
 * @param {number} atomMass - Mass of the confined atom in AMU
 * @returns {Object} Quantum confinement effects
 */
export const calculateQuantumConfinement = (atomSize = 1, cavitySize = 2, atomMass = 1) => {
  // Constants
  const hBar = 1.054571817e-34; // reduced Planck constant in J·s
  const electronCharge = 1.602176634e-19; // electron charge in C
  const amu = 1.66053906660e-27; // atomic mass unit in kg
  
  // Convert to SI units
  const atomSizeMeters = atomSize * 1e-10;
  const cavitySizeMeters = cavitySize * 1e-10;
  const massKg = atomMass * amu;
  
  // Check if atom fits in the cavity
  const confinementRatio = atomSize / cavitySize;
  const isTightlyConfined = confinementRatio > 0.7;
  
  // Calculate confinement energy using particle-in-a-box model
  // For a 3D cubic box, E = (3π²ħ²)/(2mL²)
  const confinementEnergyJoules = (3 * Math.PI * Math.PI * hBar * hBar) /
                                 (2 * massKg * cavitySizeMeters * cavitySizeMeters);
  
  // Convert to eV
  const confinementEnergyEV = confinementEnergyJoules / electronCharge;
  
  // Calculate zero-point energy
  const zeroPointEnergyEV = confinementEnergyEV / 2;
  
  // Calculate uncertainty in position (ΔxΔp ≥ ħ/2)
  const positionUncertainty = cavitySizeMeters / 2; // simplified estimate
  const momentumUncertainty = hBar / (2 * positionUncertainty);
  const velocityUncertainty = momentumUncertainty / massKg;
  
  return {
    confinementRatio,
    isTightlyConfined,
    confinementEnergyEV,
    zeroPointEnergyEV,
    positionUncertaintyAngstroms: positionUncertainty * 1e10,
    velocityUncertainty,
    effectiveTemperature: (2/3) * confinementEnergyJoules / (1.380649e-23) // in Kelvin
  };
};

/**
 * Calculate the quantum coherence effects for multiple interacting particles
 * @param {Array} particlePositions - Array of particle position arrays [x, y, z]
 * @param {Object} params - Additional parameters
 * @returns {Object} Coherence properties for the system
 */
export const calculateCoherenceEffects = (particlePositions, params = {}) => {
  if (!particlePositions || particlePositions.length < 2) {
    return {
      coherenceLength: 0,
      isCoherent: false,
      maxEntanglementDistance: 0,
      entangledPairs: []
    };
  }
  
  const {
    temperature = 300,       // temperature in Kelvin
    coherenceThreshold = 5,  // distance threshold for quantum coherence in Angstroms
    environmentType = 'lattice' // type of environment
  } = params;
  
  // Calculate the quantum coherence length based on temperature and environment
  // (Higher temperature reduces coherence length)
  const baseCoherenceLength = 10; // in Angstroms, reference at 300K
  const temperatureFactor = Math.sqrt(300 / temperature);
  
  // Environment factors (simplified model)
  let environmentFactor;
  switch (environmentType) {
    case 'vacuum':
      environmentFactor = 10.0;
      break;
    case 'liquid':
      environmentFactor = 0.5;
      break;
    case 'lattice':
    default:
      environmentFactor = 1.0;
      break;
  }
  
  // Calculate effective coherence length
  const coherenceLength = baseCoherenceLength * temperatureFactor * environmentFactor;
  
  // Determine if the system is coherent based on separation distances
  let maxDistance = 0;
  const entangledPairs = [];
  
  // Check all pairs of particles for potential entanglement
  for (let i = 0; i < particlePositions.length; i++) {
    for (let j = i + 1; j < particlePositions.length; j++) {
      const distance = calculateDistance(particlePositions[i], particlePositions[j]);
      
      // Update maximum distance found
      maxDistance = Math.max(maxDistance, distance);
      
      // Check if this pair is within coherence length
      if (distance <= coherenceLength) {
        entangledPairs.push({
          particleIndices: [i, j],
          distance: distance,
          entanglementStrength: Math.exp(-distance / coherenceLength)
        });
      }
    }
  }
  
  // System is coherent if max distance is less than threshold
  const isCoherent = maxDistance <= coherenceThreshold;
  
  return {
    coherenceLength,
    isCoherent,
    maxEntanglementDistance: maxDistance,
    entangledPairs
  };
};

/**
 * Calculate quantum resonance effects for a lattice system
 * @param {Object} latticeData - Lattice data with points and connections
 * @param {Object} params - Additional parameters
 * @returns {Object} Resonance properties for the system
 */
export const calculateQuantumResonance = (latticeData, params = {}) => {
  if (!latticeData || !latticeData.points || !latticeData.connections) {
    return {
      hasResonance: false,
      resonanceFrequency: 0,
      resonanceAmplitude: 0,
      resonanceNodes: []
    };
  }
  
  const {
    temperature = 300,  // temperature in Kelvin
    externalFrequency = 0, // external driving frequency in THz
    damping = 0.1       // damping coefficient
  } = params;
  
  const { points, connections } = latticeData;
  
  // Calculate average bond length
  let totalDistance = 0;
  let connectionCount = connections.length;
  
  connections.forEach(conn => {
    const fromPoint = points[conn.from];
    const toPoint = points[conn.to];
    if (fromPoint && toPoint) {
      totalDistance += calculateDistance(fromPoint.position, toPoint.position);
    }
  });
  
  const averageBondLength = connectionCount > 0 ? totalDistance / connectionCount : 0;
  
  // Calculate natural frequency of the lattice (simplified model)
  // Based on spring-mass system frequency: f = (1/2π)√(k/m)
  // where k is approximated from temperature and bond length
  const boltzmannConstant = 1.380649e-23; // J/K
  const effectiveSpringConstant = boltzmannConstant * temperature / (averageBondLength * averageBondLength * 1e-20);
  const averageAtomMass = 1.66053906660e-27; // 1 AMU in kg
  
  // Natural frequency in Hz
  const naturalFrequency = (1 / (2 * Math.PI)) * Math.sqrt(effectiveSpringConstant / averageAtomMass);
  // Convert to THz for easier handling
  const naturalFrequencyTHz = naturalFrequency * 1e-12;
  
  // Calculate resonance amplitude using driven oscillator model
  // A = F/m / √[(ω₀² - ω²)² + (γω)²]
  const drivingFrequency = externalFrequency > 0 ? externalFrequency : naturalFrequencyTHz;
  const frequencyRatio = drivingFrequency / naturalFrequencyTHz;
  
  // Simplified driving force (normalized)
  const drivingForce = 1.0;
  
  // Resonance amplitude calculation
  const resonanceDenominator = Math.sqrt(
    Math.pow(1 - frequencyRatio * frequencyRatio, 2) + 
    Math.pow(damping * frequencyRatio, 2)
  );
  
  const resonanceAmplitude = resonanceDenominator > 0 ? 
    drivingForce / resonanceDenominator : 0;
  
  // Determine if the system is in resonance
  const resonanceThreshold = 2.0; // amplitude threshold for significant resonance
  const frequencyMatchThreshold = 0.1; // 10% frequency matching threshold
  
  const isFrequencyMatch = Math.abs(frequencyRatio - 1.0) < frequencyMatchThreshold;
  const hasResonance = resonanceAmplitude > resonanceThreshold;
  
  // Identify resonance nodes (points with highest amplitude)
  // In a real system, these would be calculated using modal analysis
  // Here we use a simplified approach based on point properties
  const resonanceNodes = [];
  if (hasResonance) {
    // Find points that could act as resonance nodes (e.g., interstitials between hosts)
    points.forEach((point, index) => {
      if (point.type === 'interstitial' && point.properties && point.properties.isActive) {
        // Calculate a resonance factor based on position and connections
        const connCount = connections.filter(
          c => c.from === index || c.to === index
        ).length;
        
        const resonanceFactor = resonanceAmplitude * (1 + connCount / 10);
        
        if (resonanceFactor > resonanceThreshold) {
          resonanceNodes.push({
            pointIndex: index,
            amplitude: resonanceFactor,
            position: [...point.position]
          });
        }
      }
    });
  }
  
  return {
    hasResonance,
    resonanceFrequency: drivingFrequency,
    naturalFrequency: naturalFrequencyTHz,
    resonanceAmplitude,
    isFrequencyMatch,
    resonanceNodes
  };
};

/**
 * Helper function to calculate Euclidean distance between two points
 * @param {Array} point1 - First point coordinates [x, y, z]
 * @param {Array} point2 - Second point coordinates [x, y, z]
 * @returns {number} Distance in the same units as input coordinates
 */
const calculateDistance = (point1, point2) => {
  const dx = point2[0] - point1[0];
  const dy = point2[1] - point1[1];
  const dz = point2[2] - point1[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
};

/**
 * Apply quantum effects to a lattice based on multiple quantum phenomena
 * @param {Object} latticeData - Original lattice data
 * @param {Object} params - Parameters for quantum effects
 * @returns {Object} Lattice data with quantum effects applied
 */
export const applyQuantumEffects = (latticeData, params = {}) => {
  if (!latticeData || !latticeData.points) {
    return latticeData;
  }
  
  const {
    temperature = 300,
    electronDensity = 1e28,
    externalFrequency = 0,
    quantumEffectsStrength = 1.0
  } = params;
  
  // 1. Calculate screening for all points
  const screeningResults = latticeData.points
    .filter(point => point.type === 'interstitial')
    .map(point => {
      const nearestHostDistance = findNearestHostDistance(point, latticeData);
      return calculateElectronicScreening(1, electronDensity, nearestHostDistance);
    });
  
  // 2. Calculate resonance effects
  const resonanceData = calculateQuantumResonance(latticeData, {
    temperature,
    externalFrequency
  });
  
  // 3. Calculate coherence effects
  const interstitialPositions = latticeData.points
    .filter(point => point.type === 'interstitial')
    .map(point => point.position);
  
  const coherenceData = calculateCoherenceEffects(interstitialPositions, {
    temperature,
    environmentType: 'lattice'
  });
  
  // 4. Now apply all effects to create an enhanced lattice
  const enhancedPoints = latticeData.points.map((point, index) => {
    // Copy the original point
    const enhancedPoint = { ...point };
    
    // If this is an interstitial, apply quantum effects
    if (point.type === 'interstitial') {
      // Initialize properties if they don't exist
      enhancedPoint.properties = enhancedPoint.properties || {};
      
      // Find the nearest host for this interstitial
      const nearestHostDistance = findNearestHostDistance(point, latticeData);
      
      // Calculate tunneling probability to nearest host
      const tunnelingProbability = calculateTunnelingProbability(
        nearestHostDistance,
        10, // assume 10 eV barrier height
        point.properties.mass || 1
      );
      
      // Calculate quantum confinement effects
      const confinementData = calculateQuantumConfinement(
        point.properties.radius || 0.5,
        nearestHostDistance * 0.5, // estimate cavity size as half the distance
        point.properties.mass || 1
      );
      
      // Check if this point is part of a resonance node
      const isResonanceNode = resonanceData.resonanceNodes.some(
        node => node.pointIndex === index
      );
      
      // Check if this point is part of an entangled pair
      const entanglementData = coherenceData.entangledPairs.filter(pair => 
        pair.particleIndices.includes(
          latticeData.points.findIndex((p, i) => 
            p.type === 'interstitial' && i === index
          )
        )
      );
      
      // Combine all quantum effects to determine if this interstitial is "active"
      const quantumActivityFactor = (
        tunnelingProbability * 0.3 +
        (confinementData.isTightlyConfined ? 0.3 : 0.1) +
        (isResonanceNode ? 0.3 : 0.0) +
        (entanglementData.length > 0 ? 0.2 : 0.0)
      ) * quantumEffectsStrength;
      
      // Apply quantum activity factor (threshold of 0.4 for activation)
      enhancedPoint.properties.tunnelingProbability = tunnelingProbability;
      enhancedPoint.properties.confinementEnergy = confinementData.confinementEnergyEV;
      enhancedPoint.properties.isResonanceNode = isResonanceNode;
      enhancedPoint.properties.entanglementCount = entanglementData.length;
      enhancedPoint.properties.quantumActivityFactor = quantumActivityFactor;
      enhancedPoint.properties.isActive = quantumActivityFactor > 0.4;
    }
    
    return enhancedPoint;
  });
  
  // Return enhanced lattice data
  return {
    ...latticeData,
    points: enhancedPoints,
    quantumState: {
      temperature,
      coherenceLength: coherenceData.coherenceLength,
      hasResonance: resonanceData.hasResonance,
      resonanceFrequency: resonanceData.resonanceFrequency,
      entangledPairsCount: coherenceData.entangledPairs.length
    }
  };
};

/**
 * Helper function to find the distance to the nearest host atom
 * @param {Object} point - The point to find nearest host for
 * @param {Object} latticeData - The lattice data
 * @returns {number} Distance to the nearest host in Angstroms
 */
const findNearestHostDistance = (point, latticeData) => {
  if (!point || !latticeData || !latticeData.points) {
    return Infinity;
  }
  
  let minDistance = Infinity;
  
  // Find all host points
  const hostPoints = latticeData.points.filter(p => p.type === 'host');
  
  for (const hostPoint of hostPoints) {
    const distance = calculateDistance(point.position, hostPoint.position);
    if (distance < minDistance) {
      minDistance = distance;
    }
  }
  
  return minDistance;
}; 