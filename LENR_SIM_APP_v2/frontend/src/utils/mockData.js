/**
 * Mock Data Utilities
 * Provides sample data for testing and development
 */

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
 * Generate particles for a single time step
 */
const generateParticles = (count, parameters = {}) => {
  const particleTypes = ['deuterium', 'tritium', 'helium', 'proton', 'electron'];
  const particles = [];
  
  for (let i = 0; i < count; i++) {
    const type = particleTypes[Math.floor(Math.random() * particleTypes.length)];
    particles.push({
      x: (Math.random() - 0.5) * 8,
      y: (Math.random() - 0.5) * 8,
      z: (Math.random() - 0.5) * 8,
      type: type,
      energy: Math.random() * 10 + 0.1
    });
  }
  
  return particles;
};

/**
 * Generate hotspots for a single time step
 */
const generateHotspots = (count) => {
  const hotspots = [];
  
  for (let i = 0; i < count; i++) {
    hotspots.push({
      x: (Math.random() - 0.5) * 6,
      y: (Math.random() - 0.5) * 6,
      z: (Math.random() - 0.5) * 6,
      intensity: Math.random() * 0.8 + 0.2
    });
  }
  
  return hotspots;
};

/**
 * Generate mock fusion simulation data with proper timeSteps format
 * Compatible with FusionVisualization component
 */
export const mockFusionSimulation = async (parameters = {}) => {
  await mockDelay(1000);
  
  const numTimeSteps = 50;
  const particleCount = parameters?.maxParticleDisplay || 100;
  
  const timeSteps = Array.from({ length: numTimeSteps }, (_, i) => ({
    particles: generateParticles(particleCount, parameters),
    hotspots: generateHotspots(Math.floor(Math.random() * 5) + 2),
    time: i * (parameters?.timeStepSize || 0.1)
  }));
  
  return {
    id: `fusion-sim-${Date.now()}`,
    status: 'completed',
    timeSteps: timeSteps,
    summary: {
      total_energy: Math.random() * 100 + 50,
      average_temperature: parameters?.temperature || 300,
      reaction_rate: Math.random() * 0.1,
      total_reactions: Math.floor(Math.random() * 1000)
    }
  };
};

/**
 * Generate mock LENR simulation data with lattice structure
 * Compatible with LENRVisualization component
 */
export const mockLENRSimulation = async (parameters = {}) => {
  await mockDelay(1000);
  
  const dimension = parameters?.latticeDimension || 5;
  const latticePoints = [];
  const connections = [];
  
  // Generate lattice points
  let pointIndex = 0;
  for (let x = 0; x < dimension; x++) {
    for (let y = 0; y < dimension; y++) {
      for (let z = 0; z < dimension; z++) {
        const isHost = (x + y + z) % 2 === 0;
        latticePoints.push({
          position: [
            (x - dimension / 2) * 1.5,
            (y - dimension / 2) * 1.5,
            (z - dimension / 2) * 1.5
          ],
          element: isHost ? (parameters?.materialType || 'nickel') : (parameters?.secondaryMaterial || 'hydrogen'),
          reaction_rate: Math.random() * 0.2
        });
        
        // Create connections to neighbors
        if (x > 0) connections.push([pointIndex, pointIndex - dimension * dimension]);
        if (y > 0) connections.push([pointIndex, pointIndex - dimension]);
        if (z > 0) connections.push([pointIndex, pointIndex - 1]);
        
        pointIndex++;
      }
    }
  }
  
  return {
    id: `lenr-sim-${Date.now()}`,
    status: 'completed',
    time: parameters?.totalSimulationTime || 10,
    lattice: {
      points: latticePoints,
      connections: connections,
      dimensions: [dimension * 1.5, dimension * 1.5, dimension * 1.5]
    },
    summary: {
      total_energy: Math.random() * 50 + 10,
      average_temperature: parameters?.temperature || 400,
      reaction_rate: Math.random() * 0.05,
      excess_heat: Math.random() * 20
    }
  };
};

export default {
  mockFusionData,
  mockSimulationResults,
  mockFusionSimulation,
  mockLENRData,
  mockLENRSimulation,
  mockTunnelingData,
  generateMockDataStream,
  mockDelay
};

