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

export const runSimulation = async (parameters, useMock = false) => {
  try {
    if (useMock) {
      return await mockRunSimulation(parameters);
    }
    
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

export const pauseSimulation = async (useMock = false) => {
  try {
    if (useMock) {
      return await mockPauseSimulation();
    }
    
    const response = await api.post('/simulation/pause');
    return response.data;
  } catch (error) {
    console.error('Failed to pause simulation:', error);
    throw error;
  }
};

export const stopSimulation = async (useMock = false) => {
  try {
    if (useMock) {
      return await mockStopSimulation();
    }
    
    const response = await api.post('/simulation/stop');
    return response.data;
  } catch (error) {
    console.error('Failed to stop simulation:', error);
    throw error;
  }
};

export const resetSimulation = async (useMock = false) => {
  try {
    if (useMock) {
      return await mockResetSimulation();
    }
    
    const response = await api.post('/simulation/reset');
    return response.data;
  } catch (error) {
    console.error('Failed to reset simulation:', error);
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

// New functions for data export and comparison

export const exportSimulationResults = async (simulationData, format = 'csv') => {
  try {
    const response = await api.post('/export/simulation', { 
      data: simulationData,
      format: format 
    }, {
      responseType: 'blob' // Important for file download
    });
    
    return response.data;
  } catch (error) {
    console.error('Failed to export simulation results:', error);
    throw error;
  }
};

export const compareExperimentalData = async (experimentalData, simulationData) => {
  try {
    const response = await api.post('/analysis/compare', {
      experimental_data: experimentalData,
      simulation_data: simulationData
    });
    
    return response.data;
  } catch (error) {
    console.error('Data comparison failed:', error);
    throw error;
  }
};

export const analyzeResults = async (simulationData, analysisType) => {
  try {
    const response = await api.post('/analysis/results', {
      data: simulationData,
      analysis_type: analysisType
    });
    
    return response.data;
  } catch (error) {
    console.error('Result analysis failed:', error);
    throw error;
  }
};

// Helper functions for CSV operations
export const convertToCSV = (data) => {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return '';
  }
  
  // Extract headers from the first object
  const headers = Object.keys(data[0]);
  
  // Create CSV header row
  const headerRow = headers.join(',');
  
  // Create data rows
  const dataRows = data.map(row => {
    return headers.map(header => {
      // Handle special cases (null, undefined, objects)
      const value = row[header];
      if (value === null || value === undefined) return '';
      if (typeof value === 'object') return JSON.stringify(value);
      return value;
    }).join(',');
  });
  
  // Combine header and data rows
  return [headerRow, ...dataRows].join('\n');
};

export const downloadCSV = (csvContent, filename) => {
  // Create blob from CSV content
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  
  // Create download link
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename || 'simulation_results.csv');
  link.style.display = 'none';
  
  // Add to document, trigger click, then remove
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up the URL
  URL.revokeObjectURL(url);
};

// Mock implementations for development testing
export const mockRunSimulation = async (parameters) => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Mock response data
  const mockData = {
    id: "sim_" + Math.random().toString(36).substr(2, 9),
    status: "completed",
    parameters: { ...parameters },
    results: {
      temperature: parameters.T || 300,
      tunneling_rate: Math.random() * 1e-20 * Math.exp(-(300 / (parameters.T || 300))),
      energy_release: Math.random() * 1e-12 * (parameters.T || 300) / 300,
      time_steps: Array.from({length: 10}, (_, i) => ({
        time: i * 0.1,
        temperature: (parameters.T || 300) + Math.random() * 5,
        tunneling_rate: Math.random() * 1e-20 * Math.exp(-(300 / (parameters.T || 300))) * (1 + i/10)
      })),
      lattice: {
        structure: "fcc",
        dimensions: {
          x: 5,
          y: 5,
          z: 5
        },
        host_metal: "Pd",
        fuel: "D",
        loading: 0.6,
        energy: Math.random() * 1e-10
      }
    }
  };
  
  return mockData;
};

export const mockPauseSimulation = async () => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return {
    status: "paused",
    message: "Simulation paused successfully"
  };
};

export const mockStopSimulation = async () => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return {
    status: "stopped",
    message: "Simulation stopped successfully"
  };
};

export const mockResetSimulation = async () => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 800));
  
  return {
    status: "reset",
    message: "Simulation reset successfully"
  };
};

// Default export with all functions
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
  resetSimulation,
  getSimulationStatus,
  fitModel,
  exportSimulationResults,
  compareExperimentalData,
  analyzeResults,
  convertToCSV,
  downloadCSV,
  mockRunSimulation,
  mockPauseSimulation,
  mockStopSimulation,
  mockResetSimulation
}; 