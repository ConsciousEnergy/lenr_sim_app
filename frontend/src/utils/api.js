/**
 * API utility for making requests to the backend
 * Provides consistent error handling and response processing
 */

import errorReporter from './errorReporter';

// Default API configuration
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '';
const DEFAULT_TIMEOUT = 60000; // 60 seconds (increased from 30)

// Define endpoint-specific timeouts for known long-running operations
const ENDPOINT_TIMEOUTS = {
  // Physics operations with higher timeouts
  '/physics/calculate-enhancement': 360000, // 6 minutes for enhancement calculations
  '/physics/material-enhancement': 300000,  // 5 minutes for material enhancements
  '/physics/analyze-parameter-sensitivity': 300000, // 5 minutes for sensitivity analysis
  '/physics/tunneling-temperature-pressure': 240000, // 4 minutes for tunneling
  '/physics/quantum-tunneling': 240000, // 4 minutes for quantum tunneling
  
  // Multi-physics operations
  '/multi-physics/simulations': 300000, // 5 minutes for multi-physics simulations
};

/**
 * Custom error class for API errors
 */
class ApiError extends Error {
  constructor(message, status, data = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

/**
 * Validate API response and handle errors
 * 
 * @param {Response} response - Fetch API response
 * @returns {Promise<any>} Parsed response data
 * @throws {ApiError} When the response is not OK
 */
const validateResponse = async (response) => {
  // Extract information from the response
  const { status, statusText, url } = response;
  
  // Handle non-OK responses
  if (!response.ok) {
    let errorData = null;
    let errorMessage = `${status} ${statusText}`;
    
    try {
      // Try to parse the error response as JSON
      errorData = await response.json();
      if (errorData && errorData.detail) {
        errorMessage = errorData.detail;
      }
    } catch (e) {
      // If we can't parse the response as JSON, use the status text
      console.warn('Could not parse error response as JSON');
    }
    
    // Create and throw a custom error with the response info
    const error = new ApiError(
      errorMessage,
      status,
      errorData
    );
    
    // Report the error to our error reporting system
    errorReporter.report(error, {
      level: status >= 500 ? errorReporter.levels.ERROR : errorReporter.levels.WARNING,
      context: { url, method: response.method }
    });
    
    throw error;
  }
  
  // For empty responses, return null
  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return null;
  }
  
  // For JSON responses, parse and return the data
  try {
    return await response.json();
  } catch (e) {
    const error = new Error('Invalid JSON response');
    error.originalError = e;
    throw error;
  }
};

/**
 * Get an appropriate timeout for a specific endpoint
 * 
 * @param {string} url - The URL to request
 * @param {number} customTimeout - Custom timeout provided by the caller
 * @returns {number} The appropriate timeout in milliseconds
 */
const getTimeoutForEndpoint = (url, customTimeout = null) => {
  if (customTimeout !== null) {
    return customTimeout; // User-provided timeout takes precedence
  }
  
  // Check if we have a specific timeout for this endpoint
  for (const [endpoint, timeout] of Object.entries(ENDPOINT_TIMEOUTS)) {
    if (url.includes(endpoint)) {
      return timeout;
    }
  }
  
  return DEFAULT_TIMEOUT;
};

/**
 * Make an API request with consistent error handling
 * 
 * @param {string} url - The URL to request
 * @param {Object} options - Fetch API options
 * @param {number} timeout - Request timeout in milliseconds
 * @returns {Promise<any>} Parsed response data
 */
const fetchWithErrorHandling = async (url, options = {}, timeout = null) => {
  // Add a leading slash if the URL doesn't have one and it's not an absolute URL
  const requestUrl = url.startsWith('http') 
    ? url 
    : `${API_BASE_URL}${url.startsWith('/') ? url : `/${url}`}`;
  
  // Determine appropriate timeout for this endpoint
  const effectiveTimeout = getTimeoutForEndpoint(url, timeout);
  
  // Create an AbortController for the timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), effectiveTimeout);
  
  try {
    const response = await fetch(requestUrl, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    
    // Process and validate the response
    return await validateResponse(response);
  } catch (error) {
    // Handle specific error types
    if (error.name === 'AbortError') {
      throw new ApiError(`Request timed out after ${effectiveTimeout}ms`, 408);
    }
    
    // Report network errors
    if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
      const networkError = new ApiError('Network error: Unable to connect to server', 0);
      errorReporter.report(networkError, {
        level: errorReporter.levels.ERROR,
        context: { url: requestUrl }
      });
      throw networkError;
    }
    
    // Re-throw ApiErrors (already handled)
    if (error instanceof ApiError) {
      throw error;
    }
    
    // Handle other errors
    errorReporter.report(error, {
      level: errorReporter.levels.ERROR,
      context: { url: requestUrl }
    });
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

/**
 * Shorthand for GET requests
 * 
 * @param {string} url - URL to request
 * @param {Object} options - Additional fetch options
 * @returns {Promise<any>} Parsed response data
 */
const get = (url, options = {}) => {
  return fetchWithErrorHandling(url, {
    ...options,
    method: 'GET'
  });
};

/**
 * Shorthand for POST requests with JSON data
 * 
 * @param {string} url - URL to request
 * @param {Object} data - JSON data to send
 * @param {Object} options - Additional fetch options
 * @returns {Promise<any>} Parsed response data
 */
const post = (url, data = {}, options = {}) => {
  return fetchWithErrorHandling(url, {
    ...options,
    method: 'POST',
    body: JSON.stringify(data)
  });
};

/**
 * Shorthand for PUT requests with JSON data
 * 
 * @param {string} url - URL to request
 * @param {Object} data - JSON data to send
 * @param {Object} options - Additional fetch options
 * @returns {Promise<any>} Parsed response data
 */
const put = (url, data = {}, options = {}) => {
  return fetchWithErrorHandling(url, {
    ...options,
    method: 'PUT',
    body: JSON.stringify(data)
  });
};

/**
 * Shorthand for DELETE requests
 * 
 * @param {string} url - URL to request
 * @param {Object} options - Additional fetch options
 * @returns {Promise<any>} Parsed response data
 */
const del = (url, options = {}) => {
  return fetchWithErrorHandling(url, {
    ...options,
    method: 'DELETE'
  });
};

// Export the API utilities
const api = {
  get,
  post,
  put,
  delete: del,
  fetch: fetchWithErrorHandling,
  validateResponse,
  ApiError
};

export default api; 