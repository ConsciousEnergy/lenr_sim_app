/**
 * Lattice Utilities
 * 
 * Utility functions for processing and transforming lattice data
 * for visualization and simulation purposes.
 */

/**
 * Generate a basic lattice structure
 * @param {string} type - Type of lattice ('fcc', 'bcc', 'sc', etc.)
 * @param {number} size - Size of lattice (number of unit cells in each dimension)
 * @param {number} spacing - Spacing between lattice points
 * @returns {Array} Array of lattice points with positions and properties
 */
export const generateLattice = ({ type = 'fcc', size = 3, spacing = 1 }) => {
  const latticePoints = [];
  const halfSize = Math.floor(size / 2);
  
  switch (type.toLowerCase()) {
    case 'sc': // Simple cubic
      for (let x = -halfSize; x <= halfSize; x++) {
        for (let y = -halfSize; y <= halfSize; y++) {
          for (let z = -halfSize; z <= halfSize; z++) {
            latticePoints.push({
              position: [x * spacing, y * spacing, z * spacing],
              type: 'host',
              element: 'Pd', // Default to palladium
              properties: {
                charge: 0,
                isActive: false
              }
            });
          }
        }
      }
      break;
      
    case 'fcc': // Face-centered cubic
      for (let x = -halfSize; x <= halfSize; x++) {
        for (let y = -halfSize; y <= halfSize; y++) {
          for (let z = -halfSize; z <= halfSize; z++) {
            // Corner atom
            latticePoints.push({
              position: [x * spacing, y * spacing, z * spacing],
              type: 'host',
              element: 'Pd',
              properties: {
                charge: 0,
                isActive: false
              }
            });
            
            // Face center atoms
            if (x < halfSize) {
              latticePoints.push({
                position: [(x + 0.5) * spacing, y * spacing, z * spacing],
                type: 'host',
                element: 'Pd',
                properties: {
                  charge: 0,
                  isActive: false
                }
              });
            }
            
            if (y < halfSize) {
              latticePoints.push({
                position: [x * spacing, (y + 0.5) * spacing, z * spacing],
                type: 'host',
                element: 'Pd',
                properties: {
                  charge: 0,
                  isActive: false
                }
              });
            }
            
            if (z < halfSize) {
              latticePoints.push({
                position: [x * spacing, y * spacing, (z + 0.5) * spacing],
                type: 'host',
                element: 'Pd',
                properties: {
                  charge: 0,
                  isActive: false
                }
              });
            }
          }
        }
      }
      break;
      
    case 'bcc': // Body-centered cubic
      for (let x = -halfSize; x <= halfSize; x++) {
        for (let y = -halfSize; y <= halfSize; y++) {
          for (let z = -halfSize; z <= halfSize; z++) {
            // Corner atom
            latticePoints.push({
              position: [x * spacing, y * spacing, z * spacing],
              type: 'host',
              element: 'Pd',
              properties: {
                charge: 0,
                isActive: false
              }
            });
            
            // Body center atom
            if (x < halfSize && y < halfSize && z < halfSize) {
              latticePoints.push({
                position: [(x + 0.5) * spacing, (y + 0.5) * spacing, (z + 0.5) * spacing],
                type: 'host',
                element: 'Pd',
                properties: {
                  charge: 0,
                  isActive: false
                }
              });
            }
          }
        }
      }
      break;
      
    default:
      console.warn(`Unsupported lattice type: ${type}, defaulting to simple cubic`);
      return generateLattice({ type: 'sc', size, spacing });
  }
  
  return latticePoints;
};

/**
 * Add defects to a lattice
 * @param {Array} lattice - Array of lattice points
 * @param {Object} options - Options for defect generation
 * @param {number} options.vacancyRate - Rate of vacancies (0-1)
 * @param {number} options.interstitialRate - Rate of interstitials (0-1)
 * @param {string} options.interstitialElement - Element for interstitials (H, D, etc.)
 * @returns {Array} Modified lattice with defects
 */
export const addDefects = (lattice, { 
  vacancyRate = 0.05, 
  interstitialRate = 0.1,
  interstitialElement = 'D' // Deuterium
}) => {
  if (!lattice || !Array.isArray(lattice)) return [];
  
  const result = [...lattice];
  const latticeSize = result.length;
  
  // Add vacancies (by marking atoms to be removed)
  const vacancyIndices = new Set();
  const vacancyCount = Math.round(latticeSize * vacancyRate);
  
  while (vacancyIndices.size < vacancyCount) {
    const index = Math.floor(Math.random() * latticeSize);
    vacancyIndices.add(index);
  }
  
  // Add interstitials
  const interstitials = [];
  const interstitialCount = Math.round(latticeSize * interstitialRate);
  
  for (let i = 0; i < interstitialCount; i++) {
    // Get random position between lattice points
    const host1Index = Math.floor(Math.random() * latticeSize);
    let host2Index = Math.floor(Math.random() * latticeSize);
    
    // Make sure we pick a different host
    while (host2Index === host1Index) {
      host2Index = Math.floor(Math.random() * latticeSize);
    }
    
    if (!result[host1Index] || !result[host2Index]) continue;
    
    const host1 = result[host1Index].position;
    const host2 = result[host2Index].position;
    
    // Create position between host atoms with some random variation
    const randomFactor = 0.3; // Random variation factor
    const randomOffset = [
      (Math.random() - 0.5) * randomFactor,
      (Math.random() - 0.5) * randomFactor,
      (Math.random() - 0.5) * randomFactor
    ];
    
    const position = [
      (host1[0] + host2[0]) / 2 + randomOffset[0],
      (host1[1] + host2[1]) / 2 + randomOffset[1],
      (host1[2] + host2[2]) / 2 + randomOffset[2]
    ];
    
    interstitials.push({
      position,
      type: 'interstitial',
      element: interstitialElement,
      properties: {
        charge: 0,
        isActive: true,
        energy: Math.random() * 5 // Random energy level
      }
    });
  }
  
  // Remove vacancies
  const filteredLattice = result.filter((_, index) => !vacancyIndices.has(index));
  
  // Combine with interstitials
  return [...filteredLattice, ...interstitials];
};

/**
 * Calculate distances between lattice points
 * @param {Array} lattice - Array of lattice points
 * @returns {Array} Array of connections between points with distances
 */
export const calculateDistances = (lattice) => {
  if (!lattice || !Array.isArray(lattice) || lattice.length < 2) return [];
  
  const connections = [];
  const cutoffDistance = 2.5; // Maximum distance to consider atoms as connected
  
  for (let i = 0; i < lattice.length; i++) {
    for (let j = i + 1; j < lattice.length; j++) {
      const point1 = lattice[i];
      const point2 = lattice[j];
      
      const dx = point1.position[0] - point2.position[0];
      const dy = point1.position[1] - point2.position[1];
      const dz = point1.position[2] - point2.position[2];
      
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
      
      if (distance <= cutoffDistance) {
        connections.push({
          from: i,
          to: j,
          distance,
          type: determineConnectionType(point1, point2)
        });
      }
    }
  }
  
  return connections;
};

/**
 * Determine the type of connection between two lattice points
 * @param {Object} point1 - First lattice point
 * @param {Object} point2 - Second lattice point
 * @returns {string} Type of connection
 */
const determineConnectionType = (point1, point2) => {
  if (point1.type === 'interstitial' || point2.type === 'interstitial') {
    return 'host-interstitial';
  }
  
  if (point1.element !== point2.element) {
    return 'hetero';
  }
  
  return 'homo';
};

/**
 * Apply quantum effects to the lattice
 * @param {Array} lattice - Array of lattice points
 * @param {Object} params - Parameters for quantum effects
 * @param {number} params.enhancementFactor - Quantum enhancement factor
 * @param {number} params.activeRegionSize - Size of active region
 * @returns {Array} Modified lattice with quantum effects
 */
export const applyQuantumEffects = (lattice, { 
  enhancementFactor = 1.0,
  activeRegionSize = 0.3
}) => {
  if (!lattice || !Array.isArray(lattice)) return [];
  
  // Find center of the lattice
  let centerX = 0, centerY = 0, centerZ = 0;
  lattice.forEach(point => {
    centerX += point.position[0];
    centerY += point.position[1];
    centerZ += point.position[2];
  });
  
  centerX /= lattice.length;
  centerY /= lattice.length;
  centerZ /= lattice.length;
  
  // Apply quantum effects based on distance from center
  return lattice.map(point => {
    const dx = point.position[0] - centerX;
    const dy = point.position[1] - centerY;
    const dz = point.position[2] - centerZ;
    
    const distanceFromCenter = Math.sqrt(dx * dx + dy * dy + dz * dz);
    
    // Apply quantum effects only to interstitials
    if (point.type === 'interstitial') {
      const relativeDistance = distanceFromCenter / activeRegionSize;
      let effectIntensity = 0;
      
      if (relativeDistance <= 1) {
        // Apply quantum effect with greater intensity near the center
        effectIntensity = enhancementFactor * (1 - relativeDistance);
      }
      
      return {
        ...point,
        properties: {
          ...point.properties,
          quantumEffect: effectIntensity,
          isActive: effectIntensity > 0.2 // Activate if effect is significant
        }
      };
    }
    
    return point;
  });
};

/**
 * Create lattice data for visualization
 * @param {Object} config - Configuration for lattice generation
 * @returns {Object} Processed lattice data for visualization
 */
export const createLatticeData = (config = {}) => {
  const {
    latticeType = 'fcc',
    latticeSize = 3,
    spacing = 1,
    vacancyRate = 0.05,
    interstitialRate = 0.1,
    interstitialElement = 'D',
    enhancementFactor = 1.0,
    activeRegionSize = 0.3
  } = config;
  
  // Generate base lattice
  let lattice = generateLattice({
    type: latticeType,
    size: latticeSize,
    spacing
  });
  
  // Add defects
  lattice = addDefects(lattice, {
    vacancyRate,
    interstitialRate,
    interstitialElement
  });
  
  // Apply quantum effects
  lattice = applyQuantumEffects(lattice, {
    enhancementFactor,
    activeRegionSize
  });
  
  // Calculate distances and connections
  const connections = calculateDistances(lattice);
  
  return {
    points: lattice,
    connections,
    metadata: {
      latticeType,
      latticeSize,
      spacing,
      pointCount: lattice.length,
      connectionCount: connections.length,
      interstitialCount: lattice.filter(p => p.type === 'interstitial').length
    }
  };
};

/**
 * Calculate statistical properties of a lattice
 * @param {Object} latticeData - Lattice data object
 * @returns {Object} Statistical properties
 */
export const calculateLatticeStatistics = (latticeData) => {
  if (!latticeData || !latticeData.points || !Array.isArray(latticeData.points)) {
    return {
      totalPoints: 0,
      hostAtoms: 0,
      interstitials: 0,
      averageDistance: 0,
      activeInterstitials: 0,
      maxQuantumEffect: 0
    };
  }
  
  const { points, connections } = latticeData;
  
  const hostAtoms = points.filter(p => p.type === 'host').length;
  const interstitials = points.filter(p => p.type === 'interstitial').length;
  const activeInterstitials = points.filter(p => 
    p.type === 'interstitial' && p.properties && p.properties.isActive
  ).length;
  
  let totalDistance = 0;
  if (connections && connections.length > 0) {
    totalDistance = connections.reduce((sum, conn) => sum + conn.distance, 0);
  }
  
  const averageDistance = connections && connections.length > 0 
    ? totalDistance / connections.length 
    : 0;
  
  const maxQuantumEffect = points.reduce((max, point) => {
    const effect = point.properties && point.properties.quantumEffect || 0;
    return effect > max ? effect : max;
  }, 0);
  
  return {
    totalPoints: points.length,
    hostAtoms,
    interstitials,
    averageDistance,
    activeInterstitials,
    maxQuantumEffect
  };
}; 