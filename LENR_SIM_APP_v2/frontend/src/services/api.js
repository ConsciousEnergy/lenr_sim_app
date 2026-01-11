/**
 * Core API service for the LENR Simulation App
 * Provides unified interface for interacting with the backend API
 */

/**
 * Configuration for API requests
 */
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const API_CONFIG = {
  baseUrl: `${API_BASE_URL}/api`,
  timeout: 30000, // 30 seconds default timeout
  retries: 1,     // Number of retries for failed requests
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
};

/**
 * Custom API error class
 */
export class ApiError extends Error {
  constructor(message, statusCode, data) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.data = data;
  }
}

/**
 * Timeout promise for aborting fetch requests
 * @param {number} ms - Timeout in milliseconds
 * @returns {Promise} Promise that rejects after specified milliseconds
 */
const _timeoutPromise = (ms) => {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new ApiError('Request timeout', 408)), ms);
  });
};
// Note: _timeoutPromise is available for use with Promise.race() for request timeouts

/**
 * Parse response based on content type
 * @param {Response} response - Fetch Response object
 * @returns {Promise} Promise resolving to parsed data
 */
const parseResponse = async (response) => {
  const contentType = response.headers.get('Content-Type') || '';
  
  if (contentType.includes('application/json')) {
    return response.json();
  } else if (contentType.includes('text/')) {
    return response.text();
  } else {
    return response.blob();
  }
};

/**
 * Handle API response and errors
 * @param {Response} response - Fetch Response object
 * @returns {Promise} Promise resolving to parsed data or rejecting with ApiError
 */
const handleResponse = async (response) => {
  const data = await parseResponse(response);
  
  if (!response.ok) {
    const message = data?.detail || data?.message || `API Error: ${response.status} ${response.statusText}`;
    throw new ApiError(message, response.status, data);
  }
  
  return data;
};

/**
 * Execute API request with retries and error handling
 * @param {string} endpoint - API endpoint
 * @param {Object} options - Request options
 * @returns {Promise} Promise resolving to response data
 */
const executeRequest = async (endpoint, options = {}) => {
  const url = `${API_CONFIG.baseUrl}${endpoint}`;
  const requestOptions = {
    ...options,
    headers: {
      ...API_CONFIG.headers,
      ...options.headers
    }
  };
  
  let lastError;
  const maxRetries = options.retries ?? API_CONFIG.retries;
  const timeout = options.timeout ?? API_CONFIG.timeout;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      const { signal } = controller;
      
      // Set up timeout
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      // Execute request
      const response = await fetch(url, {
        ...requestOptions,
        signal
      });
      
      // Clear timeout
      clearTimeout(timeoutId);
      
      // Handle response
      return await handleResponse(response);
    } catch (error) {
      lastError = error;
      
      // Don't retry if the request was aborted or if we've exhausted retries
      if (error.name === 'AbortError' || attempt === maxRetries) {
        break;
      }
      
      // Wait with exponential backoff before retrying
      await new Promise(resolve => setTimeout(resolve, 2 ** attempt * 1000));
    }
  }
  
  // If we got here, all attempts failed
  throw lastError instanceof ApiError 
    ? lastError 
    : new ApiError(lastError.message || 'Request failed', 500);
};

/**
 * API client functions
 */
const api = {
  /**
   * Send GET request
   * @param {string} endpoint - API endpoint
   * @param {Object} options - Request options
   * @returns {Promise} Promise resolving to response data
   */
  get: (endpoint, options = {}) => {
    return executeRequest(endpoint, {
      ...options,
      method: 'GET'
    });
  },
  
  /**
   * Send POST request
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request payload
   * @param {Object} options - Request options
   * @returns {Promise} Promise resolving to response data
   */
  post: (endpoint, data, options = {}) => {
    return executeRequest(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  
  /**
   * Send PUT request
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request payload
   * @param {Object} options - Request options
   * @returns {Promise} Promise resolving to response data
   */
  put: (endpoint, data, options = {}) => {
    return executeRequest(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },
  
  /**
   * Send DELETE request
   * @param {string} endpoint - API endpoint
   * @param {Object} options - Request options
   * @returns {Promise} Promise resolving to response data
   */
  delete: (endpoint, options = {}) => {
    return executeRequest(endpoint, {
      ...options,
      method: 'DELETE'
    });
  },
  
  /**
   * Send PATCH request
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request payload
   * @param {Object} options - Request options
   * @returns {Promise} Promise resolving to response data
   */
  patch: (endpoint, data, options = {}) => {
    return executeRequest(endpoint, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  }
};

/**
 * Enhanced Fusion API endpoint
 * @param {Object} params - Fusion simulation parameters
 * @returns {Promise} Promise resolving to fusion simulation results
 */
export const getEnhancedFusion = async (params) => {
  return api.post('/physics/fusion/enhanced', params);
};

export default api; 