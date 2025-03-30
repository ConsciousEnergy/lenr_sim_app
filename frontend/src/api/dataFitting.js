import axios from 'axios';
import { API_BASE_URL } from '../config';

/**
 * Performs data fitting of experimental data against simulation results
 * @param {Object} experimentalData - The experimental data points
 * @param {Object} simulationParams - The simulation parameters to optimize
 * @param {string} simulationType - The type of simulation to fit against
 * @returns {Promise<Object>} - The fitted parameters and quality metrics
 */
export const fitExperimentalData = async (experimentalData, simulationParams, simulationType) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/fitting/${simulationType}`, {
      experimental_data: experimentalData,
      initial_params: simulationParams
    });
    
    return response.data;
  } catch (error) {
    console.error('Error fitting experimental data:', error);
    throw error;
  }
};

/**
 * Validates experimental data format before sending to the API
 * @param {Array} data - Array of data points to validate
 * @returns {Object} - Validation result with isValid flag and any errors
 */
export const validateExperimentalData = (data) => {
  const result = {
    isValid: true,
    errors: []
  };
  
  if (!Array.isArray(data) || data.length === 0) {
    result.isValid = false;
    result.errors.push('Data must be a non-empty array');
    return result;
  }
  
  // Check that each point has required properties
  for (let i = 0; i < data.length; i++) {
    const point = data[i];
    if (!point.x || !point.y || typeof point.x !== 'number' || typeof point.y !== 'number') {
      result.isValid = false;
      result.errors.push(`Data point at index ${i} must have numeric x and y values`);
    }
  }
  
  return result;
};

/**
 * Parses CSV data into an array of data points
 * @param {string} csvContent - CSV content as string
 * @returns {Array} - Array of data points with x,y values
 */
export const parseCSVToDataPoints = (csvContent) => {
  const lines = csvContent.trim().split('\n');
  const result = [];
  
  // Check for header and get column indices
  const header = lines[0].split(',');
  let xIndex = 0;
  let yIndex = 1;
  
  // Try to find columns that might be labeled as x/y or time/value
  for (let i = 0; i < header.length; i++) {
    const col = header[i].toLowerCase().trim();
    if (col === 'x' || col === 'time' || col === 'temperature') {
      xIndex = i;
    } else if (col === 'y' || col === 'value' || col === 'energy') {
      yIndex = i;
    }
  }
  
  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    if (values.length > Math.max(xIndex, yIndex)) {
      const x = parseFloat(values[xIndex]);
      const y = parseFloat(values[yIndex]);
      
      if (!isNaN(x) && !isNaN(y)) {
        result.push({ x, y });
      }
    }
  }
  
  return result;
};

/**
 * Calculates goodness of fit metrics between experimental and simulation data
 * @param {Array} experimentalData - Array of experimental data points
 * @param {Array} simulationData - Array of simulation data points
 * @returns {Object} - Object containing fit metrics (R-squared, RMSE, etc)
 */
export const calculateFitMetrics = (experimentalData, simulationData) => {
  // Ensure data points are sorted by x value
  const expSorted = [...experimentalData].sort((a, b) => a.x - b.x);
  const simSorted = [...simulationData].sort((a, b) => a.x - b.x);
  
  // Linear interpolation to match x values
  const interpolatedSim = [];
  
  for (const expPoint of expSorted) {
    // Find surrounding simulation points
    let lowerIndex = -1;
    for (let i = 0; i < simSorted.length - 1; i++) {
      if (simSorted[i].x <= expPoint.x && simSorted[i + 1].x >= expPoint.x) {
        lowerIndex = i;
        break;
      }
    }
    
    if (lowerIndex >= 0) {
      const lower = simSorted[lowerIndex];
      const upper = simSorted[lowerIndex + 1];
      const fraction = (expPoint.x - lower.x) / (upper.x - lower.x);
      const interpolatedY = lower.y + fraction * (upper.y - lower.y);
      interpolatedSim.push({ x: expPoint.x, y: interpolatedY });
    }
  }
  
  // Calculate metrics if we have matching points
  if (interpolatedSim.length === 0) {
    return {
      r_squared: 0,
      rmse: Infinity,
      mean_absolute_error: Infinity
    };
  }
  
  // Calculate mean of experimental y values
  const expYmean = expSorted.reduce((sum, point) => sum + point.y, 0) / expSorted.length;
  
  // Calculate sum of squares
  let ssTotal = 0;  // Total sum of squares
  let ssResidual = 0;  // Residual sum of squares
  let sumAbsError = 0;  // Sum of absolute errors
  
  for (let i = 0; i < interpolatedSim.length; i++) {
    const expPoint = expSorted[i];
    const simPoint = interpolatedSim[i];
    
    ssTotal += Math.pow(expPoint.y - expYmean, 2);
    ssResidual += Math.pow(expPoint.y - simPoint.y, 2);
    sumAbsError += Math.abs(expPoint.y - simPoint.y);
  }
  
  const rSquared = 1 - (ssResidual / ssTotal);
  const rmse = Math.sqrt(ssResidual / interpolatedSim.length);
  const meanAbsoluteError = sumAbsError / interpolatedSim.length;
  
  return {
    r_squared: rSquared,
    rmse: rmse,
    mean_absolute_error: meanAbsoluteError,
    data_points_compared: interpolatedSim.length
  };
}; 