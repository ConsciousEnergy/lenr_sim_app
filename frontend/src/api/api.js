import axios from 'axios';

const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? '/api' // Production API path 
  : ''; // In development, proxy will route to backend

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000, // 15 second timeout
});

// Error handling helper function
const handleApiError = (error, operation) => {
  let errorMessage = `Error during ${operation}`;
  
  if (error.response) {
    // The server responded with a status code outside of 2xx range
    const statusCode = error.response.status;
    const serverMessage = error.response.data?.detail || 'Unknown server error';
    
    errorMessage = `Server error (${statusCode}): ${serverMessage}`;
    console.error(`API Error: ${errorMessage}`, error.response.data);
  } else if (error.request) {
    // The request was made but no response was received
    if (error.code === 'ECONNABORTED') {
      errorMessage = 'Request timed out. The server may be under heavy load.';
    } else {
      errorMessage = 'No response received from server. Please check your connection.';
    }
    console.error('Network Error:', error.request);
  } else {
    // Something happened in setting up the request
    errorMessage = `Request configuration error: ${error.message}`;
    console.error('Request Error:', error.message);
  }
  
  // Create enhanced error object
  const enhancedError = new Error(errorMessage);
  enhancedError.originalError = error;
  enhancedError.isApiError = true;
  
  return enhancedError;
};

// Helper function to retry a failed request
const retryRequest = async (apiCall, retries = 2, delay = 1000) => {
  try {
    return await apiCall();
  } catch (error) {
    if (retries === 0) throw error;
    
    // If server error (5xx), retry
    if (error.response && error.response.status >= 500) {
      console.log(`Retrying request (${retries} attempts left)...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return retryRequest(apiCall, retries - 1, delay * 1.5);
    }
    
    // Don't retry client errors (4xx)
    throw error;
  }
};

export const getThermalTunneling = async (params) => {
  try {
    const response = await api.post('/simulation/thermal-tunneling', params);
    return response.data;
  } catch (error) {
    console.error('Thermal tunneling simulation failed:', error);
    throw error;
  }
};

export const getImpactTunneling = async (params) => {
  try {
    return await retryRequest(() => 
      api.post('/simulate/impact', params)
        .then(response => response.data)
    );
  } catch (error) {
    throw handleApiError(error, 'impact tunneling calculation');
  }
};

export const getHeatmap = async (params) => {
  try {
    return await retryRequest(() => 
      api.post('/simulate/heatmap', params)
        .then(response => response.data)
    );
  } catch (error) {
    throw handleApiError(error, 'heatmap generation');
  }
};

export const getClusterVisualization = async (params) => {
  try {
    return await retryRequest(() => 
      api.post('/simulate/cluster', params)
        .then(response => response.data)
    );
  } catch (error) {
    throw handleApiError(error, 'cluster visualization');
  }
};

export const fitExperimental = async (data) => {
  try {
    return await retryRequest(() => 
      api.post('/fit/experimental', data)
        .then(response => response.data)
    );
  } catch (error) {
    throw handleApiError(error, 'experimental data fitting');
  }
};

export const checkHealth = async () => {
  try {
    const response = await api.get('/health');
    return response.data;
  } catch (error) {
    console.error('Health check failed:', error);
    throw error;
  }
};

export const runSimulation = async (parameters) => {
  try {
    // Determine which API endpoint to use based on parameters
    let endpoint = '/simulation/run';
    if (parameters.simulationType === 'thermal-tunneling') {
      endpoint = '/simulation/thermal-tunneling';
    } else if (parameters.simulationType === 'phonon-coupling') {
      endpoint = '/simulation/phonon-coupling';
    }
    
    const response = await api.post(endpoint, parameters);
    return response.data;
  } catch (error) {
    console.error('Simulation failed:', error);
    throw error;
  }
};

export const pauseSimulation = async () => {
  try {
    const response = await api.post('/simulation/pause');
    return response.data;
  } catch (error) {
    console.error('Failed to pause simulation:', error);
    throw error;
  }
};

export const stopSimulation = async () => {
  try {
    const response = await api.post('/simulation/stop');
    return response.data;
  } catch (error) {
    console.error('Failed to stop simulation:', error);
    throw error;
  }
};

export const getSimulationStatus = async () => {
  try {
    const response = await api.get('/simulation/status');
    return response.data;
  } catch (error) {
    console.error('Failed to get simulation status:', error);
    throw error;
  }
};

export const fitModel = async (data, modelType) => {
  try {
    const response = await api.post('/fitting/fit', { data, model_type: modelType });
    return response.data;
  } catch (error) {
    console.error('Model fitting failed:', error);
    throw error;
  }
};

export const mockRunSimulation = async (parameters) => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Generate a very small random number for tunneling rate (typically 10^-10 to 10^-5)
  const tunnelingRate = 1e-10 + (Math.random() * 1e-5);
  
  // Mock response data
  const mockData = {
    data: {
      lattice: {
        structure: 'fcc',
        elements: ['Pd', 'D'],
        dimensions: { x: 5, y: 5, z: 5 },
        energy: Math.random() * 10
      }
    },
    results: {
      probability: Math.random() * 0.01,
      energy: -2.5 + Math.random() * 0.5,
      barrier: 0.2 + Math.random() * 0.1,
      tunneling_rate: tunnelingRate,
      metrics: {
        temperature: parameters.T || 300,
        time_steps: 1000,
        convergence: true
      },
      charts: {
        potential_curve: Array.from({ length: 50 }, (_, i) => ({
          x: i * 0.1,
          y: 2 * (1 - Math.exp(-0.5 * i * 0.1)) ** 2
        })),
        probability_density: Array.from({ length: 50 }, (_, i) => ({
          x: i * 0.1,
          y: Math.exp(-((i * 0.1 - 2.5) ** 2) / 0.5)
        }))
      }
    }
  };
  
  return mockData;
};

export default {
  getThermalTunneling,
  getImpactTunneling,
  getHeatmap,
  getClusterVisualization,
  fitExperimental,
  checkHealth,
  runSimulation,
  pauseSimulation,
  stopSimulation,
  getSimulationStatus,
  fitModel,
  mockRunSimulation,
}; 