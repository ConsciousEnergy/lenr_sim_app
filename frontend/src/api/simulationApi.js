import axios from 'axios';

// Configuration for API and debugging
const API_CONFIG = {
  debug: import.meta.env.DEV || import.meta.env.MODE === 'development', // Enable in development mode
  debugLevel: import.meta.env.VITE_API_DEBUG_LEVEL ? parseInt(import.meta.env.VITE_API_DEBUG_LEVEL) : 3, // Full logs in dev, errors only in prod
  preferMockData: import.meta.env.VITE_USE_MOCK_DATA === 'true' || false, // Set to true to bypass real API calls and use mock
  mockDelay: import.meta.env.VITE_MOCK_DELAY ? parseInt(import.meta.env.VITE_MOCK_DELAY) : 500, // Simulated API delay in milliseconds
  retryCount: 2, // Number of retries for failed API calls
};

// API endpoint configurations based on FastAPI route structure
const API_ENDPOINTS = {
  // Base endpoints
  simulations: '/api/simulations',
  physics: '/api/physics',
  visualization: '/api/visualization',
  
  // Simulation-specific endpoints
  getSimulation: (id) => [
    `/api/simulations/${id}/status`, 
    `/api/simulation/${id}/status`,
    `/api/physics/simulations/${id}/status`
  ], 
  getSimulationResults: (id) => [
    `/api/simulations/${id}/results`,
    `/api/simulation/${id}/results`,
    `/api/physics/simulations/${id}/results`
  ],
  runSimulation: (id) => [
    `/api/simulations/${id}/run`,
    `/api/simulation/${id}/run`,
    `/api/physics/simulations/${id}/run`
  ],
  stopSimulation: (id) => [
    `/api/simulations/${id}/stop`,
    `/api/simulation/${id}/stop`,
    `/api/physics/simulations/${id}/stop`
  ],
  
  // Physics engine endpoints
  initializePhysics: [
    '/api/physics/initialize',
    '/api/simulations/initialize'
  ],
  physicsStatus: [
    '/api/physics/status', 
    '/api/simulations/status'
  ],
  
  // Visualization endpoints
  visualizationData: [
    '/api/visualization/data',
    '/api/physics/visualization'
  ]
};

// Create an axios instance with common configuration
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000', // Default to 8000
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 second timeout
});

// Utility logging functions
const logError = (message, ...args) => {
  if (API_CONFIG.debug && API_CONFIG.debugLevel >= 1) {
    console.error(`[API Error] ${message}`, ...args);
  }
};

const logWarning = (message, ...args) => {
  if (API_CONFIG.debug && API_CONFIG.debugLevel >= 2) {
    console.warn(`[API Warning] ${message}`, ...args);
  }
};

const logInfo = (message, ...args) => {
  if (API_CONFIG.debug && API_CONFIG.debugLevel >= 3) {
    console.log(`[API Info] ${message}`, ...args);
  }
};

// Check which API base URL is actually available
const checkApiAvailability = async () => {
  const possibleEndpoints = [
    { url: import.meta.env.VITE_API_URL || 'http://localhost:8000', endpoint: '/api/health' },
    { url: 'http://localhost:8000', endpoint: '/api/health' },
    { url: 'http://localhost:8001', endpoint: '/api/health' },
    { url: 'http://localhost:8000', endpoint: '/' }, // Try root endpoint as fallback
    { url: 'http://localhost:8001', endpoint: '/' }, // Try root endpoint as fallback
  ];

  for (const { url, endpoint } of possibleEndpoints) {
    try {
      logInfo(`Checking API availability: ${url}${endpoint}`);
      await axios.get(`${url}${endpoint}`, { timeout: 5000 });
      logInfo(`Found available API at ${url}`);
      api.defaults.baseURL = url;
      return true;
    } catch (error) {
      logWarning(`API endpoint ${url}${endpoint} not available: ${error.message}`);
    }
  }
  
  logWarning('No API endpoints available, using mock data');
  return false;
};

// Initialize API availability check
let apiAvailable = false;
checkApiAvailability().then(available => {
  apiAvailable = available;
  if (available) {
    logInfo('API is available');
  } else {
    logWarning('API is not available, will use mock data');
  }
});

// Utility to simulate API delay for mock data
const simulateApiDelay = (duration = API_CONFIG.mockDelay) => 
  new Promise(resolve => setTimeout(resolve, duration));

// Try multiple API endpoints and return the first successful response
const tryEndpoints = async (endpoints, method = 'get', data = null) => {
  if (!Array.isArray(endpoints)) {
    endpoints = [endpoints]; // Convert single endpoint to array
  }
  
  let lastError = null;
  let attemptCount = 0;
  const totalEndpoints = endpoints.length;
  
  if (API_CONFIG.preferMockData || !apiAvailable) {
    logInfo('Using mock data due to configuration or API unavailability');
    return null; // Return null to trigger mock data
  }
  
  // Only log failures if we fail all endpoints to reduce console noise
  const logFailures = API_CONFIG.debugLevel >= 3;
  
  for (const endpoint of endpoints) {
    attemptCount++;
    try {
      logInfo(`Trying ${method.toUpperCase()} ${endpoint} (${attemptCount}/${totalEndpoints})`);
      
      let response;
      switch (method.toLowerCase()) {
        case 'get':
          response = await api.get(endpoint);
          break;
        case 'post':
          response = await api.post(endpoint, data);
          break;
        case 'put':
          response = await api.put(endpoint, data);
          break;
        case 'delete':
          response = await api.delete(endpoint);
          break;
        default:
          throw new Error(`Unsupported method: ${method}`);
      }
            
      logInfo(`${method.toUpperCase()} ${endpoint} succeeded`);
      return response.data;
    } catch (error) {
      lastError = error;
      
      // Continue to next endpoint unless it's not a 404/405 error
      if (!error.response || ![404, 405].includes(error.response.status)) {
        // Skip to next endpoint if this is a server error (5xx)
        if (error.response && error.response.status >= 500) {
          const status = error.response.status;
          const details = error.response?.data?.detail || error.message;
          logWarning(`Endpoint ${endpoint} failed with server error ${status}: ${details}. Trying next endpoint.`);
          continue;
        }
        
        // Log serious errors
        logError(`Endpoint ${endpoint} failed with unexpected error: ${error.message}`);
        
        // For critical errors that aren't 404/405, throw the error if this is the last endpoint
        if (attemptCount === totalEndpoints) {
          throw error;
        }
      }
      
      // Only log individual endpoint failures at high debug levels or if it's the last endpoint
      if (logFailures || attemptCount === totalEndpoints) {
        const status = error.response?.status || 'unknown';
        const details = error.response?.data?.detail || error.message;
        logWarning(`Endpoint ${endpoint} failed with status ${status}: ${details}`);
      }
    }
  }
  
  // Only log the all endpoints failed message once
  logWarning('All API endpoints failed, using mock data');
  
  // Return null to indicate no real API response was found
  return null;
};

// Mock data generation
const generateMockSimulationId = () => `sim-${Math.random().toString(36).substring(2, 10)}`;

const mockSimulations = new Map();

// Generate mock simulation data
const createMockSimulation = (parameters = null) => {
  const simulationId = generateMockSimulationId();
  const createdAt = new Date();
  
  const simulation = {
    id: simulationId,
    status: "pending",
    current_stage: "initializing",
    stage_progress: 0,
    overall_progress: 0,
    message: "Mock simulation created",
    created_at: createdAt.toISOString(),
    parameters: parameters || {
      temperature: 300 + Math.random() * 200,
      pressure: 1 + Math.random() * 5,
      loading_ratio: 0.8 + Math.random() * 0.2,
      lattice_constant: 3.8 + Math.random() * 0.2,
      defect_density: Math.random() * 0.1,
      simulation_time: 100,
      timestep: 0.01,
      mechanisms: ["quantum_tunneling", "phonon_coupling"],
      material: "palladium",
      reactions: ["d_d_fusion"]
    }
  };
  
  mockSimulations.set(simulationId, simulation);
  return simulation;
};

// Create a cancellation token utility
class CancellationToken {
  constructor() {
    this.isCanceled = false;
    this.cancelCallbacks = [];
  }

  cancel() {
    this.isCanceled = true;
    // Execute all registered callbacks
    this.cancelCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('Error in cancellation callback:', error);
      }
    });
  }

  // Register a callback to be called when canceled
  onCancel(callback) {
    if (typeof callback === 'function') {
      this.cancelCallbacks.push(callback);
    }
    return this; // For chaining
  }

  // Check if canceled and throw if it is
  throwIfCanceled() {
    if (this.isCanceled) {
      throw new Error('Operation was canceled');
    }
  }

  // Create a child token that is canceled if parent is canceled
  createChild() {
    const childToken = new CancellationToken();
    this.onCancel(() => childToken.cancel());
    return childToken;
  }
}

/**
 * Enhanced polling function to get simulation results with detailed progress tracking
 * @param {string} simulationId - ID of the simulation to poll
 * @param {Object} options - Configuration options
 * @param {number} options.maxAttempts - Maximum number of polling attempts (default: 240)
 * @param {number} options.intervalMs - Polling interval in milliseconds (default: 1000)
 * @param {function} options.onProgress - Callback for progress updates (optional)
 * @param {Object} options.cancelToken - Token for canceling the polling (optional)
 * @param {number} options.progressCheckThreshold - Throttle progress checks when simulation stalls (default: 10)
 * @param {number} options.maxBackoffMs - Maximum backoff time in ms (default: 15000)
 * @param {boolean} options.partialResultsOnTimeout - Return partial results if available on timeout (default: true)
 * @returns {Promise<Object>} - Simulation results
 */
const pollForResults = async (simulationId, options = {}) => {
  const { 
    maxAttempts = 240, // Increased to 4 minutes at 1 sec interval
    intervalMs = 1000, 
    onProgress = null,
    cancelToken = null,
    progressCheckThreshold = 10,
    maxBackoffMs = 15000, // Maximum backoff time in ms
    partialResultsOnTimeout = true // Return partial results if available on timeout
  } = options;
  
  // Create a local cancel token if none provided
  const localCancelToken = cancelToken || new CancellationToken();
  
  let attempts = 0;
  let lastStatusData = null;
  let consecutiveErrors = 0;
  let lastProgressValue = -1;
  let noProgressCount = 0;
  const MAX_CONSECUTIVE_ERRORS = 8; // Increased to allow for more intermittent errors
  
  // Keep track of how long we've been polling
  const startTime = Date.now();
  
  const checkResults = async () => {
    attempts++;
    
    // Check if polling has been canceled
    if (localCancelToken.isCanceled) {
      logInfo(`Polling for simulation ${simulationId} was canceled after ${attempts} attempts`);
      return {
        id: simulationId,
        status: "canceled",
        message: "Polling canceled by user",
        partial_results: lastStatusData?.partial_results || null
      };
    }
    
    // Log polling attempt with elapsed time
    const elapsedSeconds = Math.round((Date.now() - startTime) / 1000);
    logInfo(`Polling simulation ${simulationId} (attempt ${attempts}/${maxAttempts}, elapsed: ${elapsedSeconds}s)`);
    
    try {
      // Try to get simulation status from API
      let statusData = await tryEndpoints(API_ENDPOINTS.getSimulation(simulationId));
      
      // If no API response, use mock data
      if (!statusData) {
        await simulateApiDelay();
        let mockSimulation = mockSimulations.get(simulationId);
        
        // Create mock simulation if it doesn't exist
        if (!mockSimulation) {
          mockSimulation = createMockSimulation();
          mockSimulation.id = simulationId;
          mockSimulations.set(simulationId, mockSimulation);
          logInfo(`Created new mock simulation during polling: ${simulationId}`);
        }
        
        // Simulate progress
        statusData = simulateProgress(mockSimulation, attempts, maxAttempts);
      }
      
      // Save the last status data for potential partial results
      lastStatusData = statusData;
      
      // Reset consecutive error counter on success
      consecutiveErrors = 0;
      
      // Check for progress changes
      if (statusData.overall_progress !== undefined) {
        if (statusData.overall_progress === lastProgressValue) {
          noProgressCount++;
        } else {
          noProgressCount = 0;
          lastProgressValue = statusData.overall_progress;
        }
      }
      
      // Call progress callback if provided
      if (onProgress) {
        onProgress(statusData);
      }
      
      // If simulation is complete or failed, return results
      if (statusData.status === "completed" || statusData.status === "failed") {
        if (statusData.status === "completed") {
          // Try to get results from API
          try {
            let resultsData = await tryEndpoints(API_ENDPOINTS.getSimulationResults(simulationId));
            
            // If no API response, generate mock results
            if (!resultsData) {
              await simulateApiDelay();
              const mockSimulation = mockSimulations.get(simulationId);
              resultsData = generateMockResults(mockSimulation.parameters);
              logInfo(`Generated mock results for simulation ${simulationId}`);
            }
            
            return { ...statusData, results: resultsData };
          } catch (resultsError) {
            logWarning(`Error fetching results for completed simulation ${simulationId}: ${resultsError.message}`);
            return { 
              ...statusData, 
              partial_results: statusData.partial_results || null,
              results_error: resultsError.message
            };
          }
        }
        
        return statusData;
      }
      
      // Continue polling if max attempts not reached
      if (attempts < maxAttempts) {
        // Use dynamic interval based on progress if available
        let dynamicInterval = intervalMs;
        
        // If progress has stalled, gradually increase interval up to maxBackoffMs
        if (noProgressCount > progressCheckThreshold) {
          // Calculate a factor between 0-1 representing how long we've been stalled
          const progressFactor = Math.min(noProgressCount - progressCheckThreshold, 20) / 20;
          dynamicInterval = intervalMs + progressFactor * (maxBackoffMs - intervalMs);
        }
        // Otherwise use progress-based interval
        else if (statusData.overall_progress !== undefined) {
          // Slow down polling as we approach completion
          if (statusData.overall_progress > 0.8) {
            dynamicInterval = intervalMs * (1 + (statusData.overall_progress - 0.8) * 5);
          }
          // Speed up polling for very slow progress
          else if (statusData.overall_progress < 0.2) {
            dynamicInterval = intervalMs * 0.8;
          }
        }
        
        // Log if we're using a significantly different interval
        if (Math.abs(dynamicInterval - intervalMs) > 500) {
          logInfo(`Using dynamic polling interval: ${Math.round(dynamicInterval)}ms for simulation ${simulationId}`);
        }
          
        // Set up a timeout that can be canceled
        await new Promise((resolve) => {
          const timeoutId = setTimeout(resolve, Math.round(dynamicInterval));
          
          // Register the timeout with the cancel token to ensure it gets cleared if canceled
          if (localCancelToken) {
            localCancelToken.onCancel(() => {
              clearTimeout(timeoutId);
              resolve(); // Resolve immediately if canceled
            });
          }
        });
        
        // Check again if canceled before continuing
        if (localCancelToken.isCanceled) {
          return {
            id: simulationId,
            status: "canceled",
            message: "Polling canceled by user",
            partial_results: lastStatusData?.partial_results || null
          };
        }
        
        return checkResults();
      }
      
      // Max attempts reached, but we have partial results and want to return them
      if (partialResultsOnTimeout && statusData.partial_results) {
        logWarning(`Polling timeout for simulation ${simulationId}, but returning partial results`);
        return {
          id: simulationId,
          status: "partial",
          message: "Partial results available (polling timeout)",
          partial_results: statusData.partial_results
        };
      }
      
      // Max attempts reached, return timeout error
      logWarning(`Polling timed out after ${maxAttempts} attempts (${elapsedSeconds}s) for simulation ${simulationId}`);
      return {
        id: simulationId,
        status: "timeout",
        message: `Polling timeout - maximum attempts reached (${elapsedSeconds}s)`,
        progress: statusData.overall_progress || 0
      };
    } catch (error) {
      logError(`Polling error for simulation ${simulationId}:`, error);
      consecutiveErrors++;
      
      // If too many consecutive errors, abort polling
      if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
        logError(`Aborting polling after ${consecutiveErrors} consecutive errors for simulation ${simulationId}`);
        return {
          id: simulationId,
          status: "error",
          message: `Polling error: ${error.message}`,
          partial_results: lastStatusData?.partial_results || null
        };
      }
      
      // Continue polling if max attempts not reached
      if (attempts < maxAttempts) {
        // Use exponential backoff for errors with a maximum of maxBackoffMs
        const backoffTime = Math.min(intervalMs * Math.pow(1.5, consecutiveErrors), maxBackoffMs);
        logWarning(`Retrying after error in ${backoffTime}ms (consecutive errors: ${consecutiveErrors})`);
        
        // Set up a timeout that can be canceled
        await new Promise((resolve) => {
          const timeoutId = setTimeout(resolve, backoffTime);
          
          // Register the timeout with the cancel token
          if (localCancelToken) {
            localCancelToken.onCancel(() => {
              clearTimeout(timeoutId);
              resolve(); // Resolve immediately if canceled
            });
          }
        });
        
        // Check if canceled before continuing
        if (localCancelToken.isCanceled) {
          return {
            id: simulationId,
            status: "canceled",
            message: "Polling canceled by user during error recovery",
            partial_results: lastStatusData?.partial_results || null
          };
        }
        
        return checkResults();
      }
      
      // Max attempts reached, return error
      return {
        id: simulationId,
        status: "error",
        message: `Polling error after ${attempts} attempts: ${error.message}`,
        partial_results: lastStatusData?.partial_results || null
      };
    }
  };
  
  return checkResults();
};

// Simulate progress for mock simulation
const simulateProgress = (mockSimulation, attempt, maxAttempts) => {
  const progressStages = [
    { stage: "initializing", maxProgress: 0.1 },
    { stage: "loading_data", maxProgress: 0.2 },
    { stage: "setting_up_calculation", maxProgress: 0.3 },
    { stage: "running_physics_model", maxProgress: 0.7 },
    { stage: "computing_enhancements", maxProgress: 0.8 },
    { stage: "finalizing_calculations", maxProgress: 0.95 },
    { stage: "completed", maxProgress: 1.0 }
  ];
  
  // Calculate progress based on attempt number
  const overallProgress = Math.min(1.0, attempt / (maxAttempts * 0.7));
  
  // Determine current stage
  let currentStage = progressStages[0];
  for (const stage of progressStages) {
    if (overallProgress <= stage.maxProgress) {
      currentStage = stage;
      break;
    }
  }
  
  // Calculate stage progress (0-100)
  let stageIndex = progressStages.findIndex(s => s.stage === currentStage.stage);
  let prevStageMax = stageIndex > 0 ? progressStages[stageIndex - 1].maxProgress : 0;
  let stageRange = currentStage.maxProgress - prevStageMax;
  let stageProgress = Math.round(((overallProgress - prevStageMax) / stageRange) * 100);
  
  // Update simulation status
  mockSimulation.status = overallProgress >= 1.0 ? "completed" : "running";
  mockSimulation.current_stage = currentStage.stage;
  mockSimulation.stage_progress = stageProgress;
  mockSimulation.overall_progress = overallProgress;
  
  if (!mockSimulation.started_at && mockSimulation.status === "running") {
    mockSimulation.started_at = new Date().toISOString();
  }
  
  if (mockSimulation.status === "completed" && !mockSimulation.completed_at) {
    mockSimulation.completed_at = new Date().toISOString();
    mockSimulation.message = "Mock simulation completed successfully";
    
    // Generate results
    mockSimulation.results = generateMockResults(mockSimulation.parameters);
  }
  
  return { ...mockSimulation };
};

// Generate mock results based on input parameters
const generateMockResults = (parameters) => {
  // Use parameters to create somewhat realistic mock data
  const temp = parameters?.temperature || 300;
  const loadingRatio = parameters?.loading_ratio || 0.8;
  const material = parameters?.material || "palladium";
  
  // Calculate base reaction rates based on parameters
  const baseRate = 1e-10 * Math.exp((temp - 300) / 100) * Math.pow(loadingRatio, 2);
  
  // Different scaling for different reactions
  const reactionRates = {
    d_d_fusion: baseRate,
    d_p_fusion: baseRate * 0.1,
    electron_capture: baseRate * 0.01 * Math.exp((temp - 350) / 50),
  };
  
  // Enhancement factors based on enabled mechanisms
  const enhancementFactors = {};
  if (parameters?.mechanisms) {
    parameters.mechanisms.forEach(mechanism => {
      let factor = 1.0;
      switch (mechanism) {
        case "quantum_tunneling":
          factor = 10 + Math.random() * 5;
          break;
        case "phonon_coupling":
          factor = 5 + Math.random() * 10;
          break;
        case "electron_screening":
          factor = 20 + Math.random() * 30;
          break;
        default:
          factor = 1 + Math.random() * 2;
      }
      enhancementFactors[mechanism] = factor;
    });
  }
  
  // Calculate total power density
  let powerDensity = 0;
  Object.keys(reactionRates).forEach(reaction => {
    powerDensity += reactionRates[reaction] * (reaction === 'd_d_fusion' ? 3.27e6 : 5.5e6);
  });
  
  // Apply enhancement factors
  let totalEnhancement = 1.0;
  Object.values(enhancementFactors).forEach(factor => {
    totalEnhancement *= factor;
  });
  powerDensity *= totalEnhancement;
  
  // Generate mock phonon spectrum data
  const phononSpectrum = Array.from({ length: 50 }, (_, i) => {
    const frequency = i * 0.2; // THz
    return {
      frequency,
      amplitude: 0.5 * Math.exp(-(Math.pow(frequency - 5, 2)) / 8) + Math.random() * 0.1
    };
  });
  
  // Generate mock temperature profile
  const temperatureProfile = Array.from({ length: 10 }, (_, i) => {
    const radius = i * 0.5; // mm
    return {
      radius,
      temperature: temp * (1 + powerDensity * 1e-6 * Math.exp(-radius / 2))
    };
  });
  
  // Generate mock energy distribution
  const energyDistribution = Array.from({ length: 20 }, (_, i) => {
    const energy = i * 0.5; // eV
    return {
      energy,
      probability: Math.exp(-(Math.pow(energy - 5, 2)) / 2) + Math.random() * 0.05
    };
  });
  
  // Mock visualization data for 3D rendering
  const latticeData = {
    material,
    temperature: temp,
    atoms: Array.from({ length: 100 }, (_, i) => ({
      x: (Math.random() - 0.5) * 10,
      y: (Math.random() - 0.5) * 10,
      z: (Math.random() - 0.5) * 10,
      element: Math.random() < 0.85 ? material : 'deuterium',
      energy: Math.random() * 10
    }))
  };
  
  // Mock fusion events for visualization
  const fusionEvents = Array.from({ length: Math.floor(powerDensity * 1e7) }, () => ({
    x: (Math.random() - 0.5) * 8,
    y: (Math.random() - 0.5) * 8,
    z: (Math.random() - 0.5) * 8,
    energy: 3 + Math.random() * 2,
    time: Math.random() * parameters.simulation_time
  }));
  
  return {
    reaction_rates: reactionRates,
    power_density: powerDensity,
    enhancement_factors: enhancementFactors,
    phonon_spectrum: phononSpectrum,
    temperature_profile: temperatureProfile,
    energy_distribution: energyDistribution,
    visualization_data: {
      latticeData,
      fusionEvents
    }
  };
};

// Export the API client
export const simulationApi = {
  // Configuration and utilities
  setDebugLevel: (level) => {
    API_CONFIG.debugLevel = level;
    logInfo(`Debug level set to ${level}`);
  },
  
  setUseMockData: (useMock) => {
    API_CONFIG.preferMockData = useMock;
    logInfo(`Mock data ${useMock ? 'enabled' : 'disabled'}`);
  },
  
  checkApiAvailability,
  
  // Simulation management
  initializeSimulation: async (parameters) => {
    try {
      // Try endpoints in API_ENDPOINTS.initializePhysics
      let data = await tryEndpoints(API_ENDPOINTS.initializePhysics, 'post', parameters);
      
      // Fall back to mock data if API call fails
      if (!data) {
        await simulateApiDelay();
        data = createMockSimulation(parameters);
        logInfo('Created mock simulation:', data.id);
      }
      
      return data;
    } catch (error) {
      logError('Failed to initialize simulation:', error);
      throw error;
    }
  },

  startSimulation: async (id) => {
    try {
      // Try to start simulation via API
      let data = await tryEndpoints(API_ENDPOINTS.runSimulation(id), 'post');
      
      // Fall back to mock data if API call fails
      if (!data) {
        await simulateApiDelay();
        const mockSimulation = mockSimulations.get(id);
        if (mockSimulation) {
          mockSimulation.status = 'running';
          mockSimulation.started_at = new Date().toISOString();
          data = { ...mockSimulation };
          logInfo(`Started mock simulation: ${id}`);
        } else {
          const newMock = createMockSimulation();
          newMock.id = id;
          newMock.status = 'running';
          newMock.started_at = new Date().toISOString();
          mockSimulations.set(id, newMock);
          data = { ...newMock };
          logInfo(`Created and started new mock simulation: ${id}`);
        }
      }
      
      return data;
    } catch (error) {
      logError(`Failed to start simulation ${id}:`, error);
      throw error;
    }
  },

  stopSimulation: async (id) => {
    try {
      // Try to stop simulation via API
      let data = await tryEndpoints(API_ENDPOINTS.stopSimulation(id), 'post');
      
      // Fall back to mock data if API call fails
      if (!data) {
        await simulateApiDelay();
        const mockSimulation = mockSimulations.get(id);
        if (mockSimulation) {
          mockSimulation.status = 'stopped';
          mockSimulation.message = 'Simulation stopped by user';
          data = { ...mockSimulation };
          logInfo(`Stopped mock simulation: ${id}`);
        } else {
          throw new Error(`Simulation ${id} not found`);
        }
      }
      
      return data;
    } catch (error) {
      logError(`Failed to stop simulation ${id}:`, error);
      throw error;
    }
  },

  getSimulationStatus: async (id) => {
    try {
      // Try to get simulation status via API
      let data = await tryEndpoints(API_ENDPOINTS.getSimulation(id));
      
      // Fall back to mock data if API call fails
      if (!data) {
        await simulateApiDelay();
        const mockSimulation = mockSimulations.get(id);
        if (mockSimulation) {
          data = { ...mockSimulation };
          logInfo(`Retrieved mock simulation status: ${id}`);
        } else {
          throw new Error(`Simulation ${id} not found`);
        }
      }
      
      return data;
    } catch (error) {
      logError(`Failed to get simulation status ${id}:`, error);
      throw error;
    }
  },

  getSimulationResults: async (id) => {
    try {
      // Try to get simulation results via API
      let data = await tryEndpoints(API_ENDPOINTS.getSimulationResults(id));
      
      // Fall back to mock data if API call fails
      if (!data) {
        await simulateApiDelay();
        const mockSimulation = mockSimulations.get(id);
        if (mockSimulation) {
          // Generate results if they don't exist
          if (!mockSimulation.results) {
            mockSimulation.results = generateMockResults(mockSimulation.parameters);
          }
          data = mockSimulation.results;
          logInfo(`Retrieved mock simulation results: ${id}`);
        } else {
          throw new Error(`Simulation ${id} not found`);
        }
      }
      
      return data;
    } catch (error) {
      logError(`Failed to get simulation results ${id}:`, error);
      throw error;
    }
  },

  listSimulations: async (status) => {
    try {
      // Try to list simulations via API
      let data = await tryEndpoints(
        status ? `${API_ENDPOINTS.simulations}?status=${status}` : API_ENDPOINTS.simulations
      );
      
      // Fall back to mock data if API call fails
      if (!data) {
        await simulateApiDelay();
        let mockList = Array.from(mockSimulations.values());
        
        // Filter by status if provided
        if (status) {
          mockList = mockList.filter(sim => sim.status === status);
        }
        
        // Create some mock simulations if none exist
        if (mockList.length === 0) {
          for (let i = 0; i < 5; i++) {
            const mockSim = createMockSimulation();
            if (i % 2 === 0) {
              mockSim.status = 'completed';
              mockSim.overall_progress = 1.0;
              mockSim.completed_at = new Date(Date.now() - i * 600000).toISOString();
            }
            if (status && mockSim.status !== status) {
              continue;
            }
            mockList.push(mockSim);
          }
        }
        
        data = mockList;
        logInfo(`Retrieved ${mockList.length} mock simulations`);
      }
      
      return data;
    } catch (error) {
      logError('Failed to list simulations:', error);
      throw error;
    }
  },

  deleteSimulation: async (id) => {
    try {
      // Try to delete simulation via API
      let success = await tryEndpoints(`${API_ENDPOINTS.simulations}/${id}`, 'delete');
      
      // Fall back to mock data if API call fails
      if (success === null) {
        await simulateApiDelay();
        const deleted = mockSimulations.delete(id);
        success = deleted;
        logInfo(`Deleted mock simulation: ${id}, success: ${deleted}`);
      }
      
      return { success };
    } catch (error) {
      logError(`Failed to delete simulation ${id}:`, error);
      throw error;
    }
  },

  // Visualization data
  getVisualizationData: async (id) => {
    try {
      // Try to get visualization data via API
      let data = await tryEndpoints(
        id ? `${API_ENDPOINTS.visualizationData}/${id}` : API_ENDPOINTS.visualizationData[0]
      );
      
      // Fall back to mock data if API call fails
      if (!data) {
        await simulateApiDelay();
        
        if (id) {
          const mockSimulation = mockSimulations.get(id);
          if (mockSimulation && mockSimulation.results && mockSimulation.results.visualization_data) {
            data = mockSimulation.results.visualization_data;
          } else {
            // Create mock visualization data
            const params = mockSimulation?.parameters || {};
            const mockResults = generateMockResults(params);
            data = mockResults.visualization_data;
            
            // Store for future use
            if (mockSimulation && !mockSimulation.results) {
              mockSimulation.results = mockResults;
            }
          }
        } else {
          // Generate random visualization data
          const mockResults = generateMockResults({
            temperature: 300 + Math.random() * 200,
            material: ['palladium', 'nickel', 'titanium'][Math.floor(Math.random() * 3)]
          });
          data = mockResults.visualization_data;
        }
        
        logInfo(`Generated mock visualization data${id ? ` for simulation ${id}` : ''}`);
      }
      
      return data;
    } catch (error) {
      logError(`Failed to get visualization data${id ? ` for simulation ${id}` : ''}:`, error);
      throw error;
    }
  },
  
  // Advanced monitoring
  pollForResults,
  
  // Utility methods
  simulateProgress,
  generateMockResults
}; 