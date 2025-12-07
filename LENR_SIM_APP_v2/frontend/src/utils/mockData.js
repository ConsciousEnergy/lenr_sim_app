/**
 * Mock Data Utilities
 * Provides sample data for testing and development
 */

/**
 * Generate fusion simulation time steps with particles and hotspots
 * This provides the proper data structure for FusionVisualization component
 */
export const generateFusionTimeSteps = (parameters = {}) => {
  const {
    latticeDimension = 10,
    temperature = 293,
    loadingRatio = 0.8,
    reactionType = 'd-d',
    timeStepSize = 0.1,
    totalSimulationTime = 10
  } = parameters;
  
  const numTimeSteps = Math.min(50, Math.floor(totalSimulationTime / timeStepSize));
  const numParticles = Math.min(500, Math.floor(100 + loadingRatio * 400));
  const boxSize = latticeDimension / 2;
  
  // Particle types based on reaction
  const getParticleTypes = () => {
    switch (reactionType) {
      case 'd-d':
        return ['deuterium', 'deuterium', 'helium', 'proton'];
      case 'd-t':
        return ['deuterium', 'tritium', 'helium', 'proton'];
      case 'p-B11':
        return ['proton', 'proton', 'helium', 'helium'];
      case 'p-Li7':
        return ['proton', 'proton', 'helium', 'helium'];
      default:
        return ['deuterium', 'deuterium', 'helium', 'proton'];
    }
  };
  
  const particleTypes = getParticleTypes();
  
  // Generate initial particle positions
  const generateParticles = (timeIndex) => {
    const particles = [];
    const energyScale = (temperature / 300) * (1 + timeIndex / numTimeSteps);
    
    for (let i = 0; i < numParticles; i++) {
      // Random walk with time evolution
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = Math.random() * boxSize * 0.9;
      
      // Add some drift based on time
      const drift = timeIndex * 0.02;
      
      particles.push({
        x: r * Math.sin(phi) * Math.cos(theta) + (Math.random() - 0.5) * drift,
        y: r * Math.sin(phi) * Math.sin(theta) + (Math.random() - 0.5) * drift,
        z: r * Math.cos(phi) + (Math.random() - 0.5) * drift,
        type: particleTypes[i % particleTypes.length],
        energy: Math.random() * energyScale
      });
    }
    
    return particles;
  };
  
  // Generate hotspots (reaction sites)
  const generateHotspots = (timeIndex) => {
    const hotspots = [];
    const numHotspots = 3 + Math.floor(Math.random() * 5);
    const intensityScale = (timeIndex / numTimeSteps) * loadingRatio;
    
    for (let i = 0; i < numHotspots; i++) {
      hotspots.push({
        x: (Math.random() - 0.5) * boxSize * 1.5,
        y: (Math.random() - 0.5) * boxSize * 1.5,
        z: (Math.random() - 0.5) * boxSize * 1.5,
        intensity: 0.3 + Math.random() * 0.7 * intensityScale
      });
    }
    
    return hotspots;
  };
  
  // Generate time steps
  const timeSteps = [];
  for (let i = 0; i < numTimeSteps; i++) {
    timeSteps.push({
      time: i * timeStepSize,
      particles: generateParticles(i),
      hotspots: generateHotspots(i)
    });
  }
  
  return {
    timeSteps,
    metadata: {
      reactionType,
      temperature,
      loadingRatio,
      numParticles,
      numTimeSteps
    }
  };
};

/**
 * Generate mock fusion simulation data
 */
export const mockFusionData = {
  temperature: 300, // Kelvin
  pressure: 101325, // Pascals  
  reactants: ['D', 'D'], // Deuterium-Deuterium
  products: ['He3', 'n'], // Helium-3 and neutron
  energy: 3.27, // MeV
  crossSection: 1e-28, // cm²
  rate: 1e-12 // reactions/second
};

/**
 * Generate mock simulation results
 */
export const mockSimulationResults = {
  id: 'sim-mock-001',
  status: 'completed',
  progress: 100,
  startTime: Date.now() - 60000,
  endTime: Date.now(),
  results: {
    rate: 1e-12,
    crossSection: 1e-28,
    probability: 0.0001,
    energy: 3.27,
    efficiency: 0.85
  },
  data: [
    { time: 0, energy: 0, temperature: 300 },
    { time: 10, energy: 1.2, temperature: 350 },
    { time: 20, energy: 2.1, temperature: 400 },
    { time: 30, energy: 2.8, temperature: 450 },
    { time: 40, energy: 3.27, temperature: 500 }
  ]
};

/**
 * Generate mock LENR data
 */
export const mockLENRData = {
  latticeType: 'palladium',
  loadingRatio: 0.85,
  temperature: 350,
  pressure: 101325,
  current: 0.1, // Amperes
  excessHeat: 12.5, // Watts
  helium4Production: 1e10 // atoms/second
};

/**
 * Generate mock quantum tunneling data
 */
export const mockTunnelingData = {
  barrierHeight: 10, // eV
  barrierWidth: 1e-10, // meters
  particleEnergy: 1, // eV
  tunnelingProbability: 1e-6,
  transmissionCoefficient: 0.0001
};

/**
 * Generate mock real-time data stream
 */
export const generateMockDataStream = (numPoints = 100) => {
  return Array.from({ length: numPoints }, (_, i) => ({
    timestamp: Date.now() - (numPoints - i) * 1000,
    temperature: 300 + Math.random() * 200,
    pressure: 101325 + Math.random() * 10000,
    energy: Math.random() * 5,
    rate: Math.random() * 1e-10
  }));
};

/**
 * Mock API delay simulation
 */
export const mockDelay = (ms = 500) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Alias for mockSimulationResults (for backwards compatibility)
 */
export const mockFusionSimulation = mockSimulationResults;

export default {
  mockFusionData,
  mockSimulationResults,
  mockFusionSimulation,
  mockLENRData,
  mockTunnelingData,
  generateMockDataStream,
  generateFusionTimeSteps,
  mockDelay
};

