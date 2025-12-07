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
 * Function to generate mock fusion simulation results (for backwards compatibility)
 * @param {object} parameters - Simulation parameters (ignored in mock)
 * @returns {Promise<object>} Mock simulation results
 */
export const mockFusionSimulation = async (parameters = {}) => {
  // Simulate API delay
  await mockDelay(1000);
  
  // Return mock data with a unique ID
  return {
    ...mockSimulationResults,
    id: `fusion-sim-${Date.now()}`,
    parameters: parameters,
    startTime: Date.now() - 60000,
    endTime: Date.now(),
  };
};

export default {
  mockFusionData,
  mockSimulationResults,
  mockFusionSimulation,
  mockLENRData,
  mockTunnelingData,
  generateMockDataStream,
  mockDelay
};

