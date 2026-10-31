/**
 * API Resilience Utilities
 * 
 * Provides robust API communication with:
 * - Automatic retry with exponential backoff
 * - Health check monitoring
 * - Connection state management
 * - Error categorization and recovery
 */

import { API_BASE_URL } from '../config/api';

// Default configuration
const DEFAULT_CONFIG = {
  baseUrl: API_BASE_URL,
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  healthCheckInterval: 30000, // 30 seconds
  timeout: 30000, // 30 second timeout
};

// Connection state
let connectionState = {
  isOnline: true,
  lastHealthCheck: null,
  lastError: null,
  consecutiveFailures: 0,
};

// Health check subscribers
const healthSubscribers = new Set();

/**
 * Calculate delay with exponential backoff and jitter
 * @param {number} attempt - Current retry attempt (0-indexed)
 * @param {number} baseDelay - Base delay in milliseconds
 * @param {number} maxDelay - Maximum delay in milliseconds
 * @returns {number} Delay in milliseconds
 */
function calculateBackoffDelay(attempt, baseDelay = DEFAULT_CONFIG.baseDelayMs, maxDelay = DEFAULT_CONFIG.maxDelayMs) {
  // Exponential backoff: delay = base * 2^attempt
  const exponentialDelay = baseDelay * Math.pow(2, attempt);
  
  // Add jitter (±25%)
  const jitter = exponentialDelay * 0.25 * (Math.random() * 2 - 1);
  
  // Clamp to maxDelay
  return Math.min(exponentialDelay + jitter, maxDelay);
}

/**
 * Wait for specified milliseconds
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise<void>}
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Categorize error for appropriate handling
 * @param {Error} error - The error to categorize
 * @returns {Object} Error category and handling hints
 */
function categorizeError(error) {
  const errorMessage = error.message?.toLowerCase() || '';
  const errorName = error.name?.toLowerCase() || '';
  
  if (error.name === 'AbortError' || errorMessage.includes('timeout')) {
    return {
      category: 'TIMEOUT',
      retryable: true,
      userMessage: 'Request timed out. Please try again.',
    };
  }
  
  if (
    errorMessage.includes('cors') ||
    errorMessage.includes('cross-origin') ||
    errorMessage.includes('access-control-allow-origin')
  ) {
    return {
      category: 'CORS',
      retryable: false,
      userMessage:
        'API blocked by CORS or split-origin misconfiguration (check VITE_API_URL). ' +
        'This is not a scientific outcome.',
    };
  }

  if (errorMessage.includes('network') || errorMessage.includes('fetch') || errorMessage.includes('failed to fetch')) {
    return {
      category: 'NETWORK',
      retryable: true,
      userMessage:
        'Network error reaching the simulation API. Schematic placeholders are not lab measurements.',
    };
  }
  
  if (error.status === 429) {
    return {
      category: 'RATE_LIMIT',
      retryable: true,
      userMessage: 'Too many requests. Please wait a moment.',
    };
  }
  
  if (error.status >= 500) {
    return {
      category: 'SERVER_ERROR',
      retryable: true,
      userMessage: 'Server error. Please try again later.',
    };
  }
  
  if (error.status >= 400 && error.status < 500) {
    return {
      category: 'CLIENT_ERROR',
      retryable: false,
      userMessage: 'Request error. Please check your input.',
    };
  }
  
  return {
    category: 'UNKNOWN',
    retryable: true,
    userMessage: 'An unexpected error occurred.',
  };
}

/**
 * Fetch with timeout support
 * @param {string} url - URL to fetch
 * @param {Object} options - Fetch options
 * @param {number} timeoutMs - Timeout in milliseconds
 * @returns {Promise<Response>}
 */
async function fetchWithTimeout(url, options = {}, timeoutMs = DEFAULT_CONFIG.timeout) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Resilient fetch with retry logic
 * @param {string} url - URL to fetch
 * @param {Object} options - Fetch options plus retry config
 * @returns {Promise<any>} Parsed response data
 */
export async function resilientFetch(url, options = {}) {
  const {
    maxRetries = DEFAULT_CONFIG.maxRetries,
    baseDelay = DEFAULT_CONFIG.baseDelayMs,
    maxDelay = DEFAULT_CONFIG.maxDelayMs,
    timeout = DEFAULT_CONFIG.timeout,
    onRetry,
    parseResponse = true,
    ...fetchOptions
  } = options;
  
  let lastError = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, fetchOptions, timeout);
      
      if (!response.ok) {
        const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
        error.status = response.status;
        error.response = response;
        
        // Try to get error details from response
        try {
          error.data = await response.json();
        } catch {
          // Ignore JSON parse errors
        }
        
        throw error;
      }
      
      // Reset connection state on success
      connectionState.isOnline = true;
      connectionState.consecutiveFailures = 0;
      connectionState.lastError = null;
      
      // Parse response if requested
      if (parseResponse) {
        const contentType = response.headers.get('content-type');
        if (contentType?.includes('application/json')) {
          return await response.json();
        }
        return await response.text();
      }
      
      return response;
      
    } catch (error) {
      lastError = error;
      const errorCategory = categorizeError(error);
      
      // Update connection state
      connectionState.consecutiveFailures++;
      connectionState.lastError = {
        message: error.message,
        category: errorCategory.category,
        timestamp: Date.now(),
      };
      
      // Don't retry non-retryable errors
      if (!errorCategory.retryable) {
        throw error;
      }
      
      // Don't retry if we've exhausted attempts
      if (attempt >= maxRetries) {
        // Mark as potentially offline after multiple failures
        if (connectionState.consecutiveFailures >= 3) {
          connectionState.isOnline = false;
          notifyHealthSubscribers();
        }
        throw error;
      }
      
      // Calculate delay and wait
      const delayMs = calculateBackoffDelay(attempt, baseDelay, maxDelay);
      
      // Notify retry callback
      if (onRetry) {
        onRetry(attempt + 1, maxRetries, delayMs, errorCategory);
      }
      
      await delay(delayMs);
    }
  }
  
  throw lastError;
}

/**
 * Check API health
 * @param {string} baseUrl - Base API URL
 * @returns {Promise<Object>} Health check result
 */
export async function checkApiHealth(baseUrl = DEFAULT_CONFIG.baseUrl) {
  try {
    const response = await fetchWithTimeout(
      `${baseUrl}/api/health`,
      { method: 'GET' },
      5000 // 5 second timeout for health checks
    );
    
    if (!response.ok) {
      throw new Error(`Health check failed: ${response.status}`);
    }
    
    const data = await response.json();
    
    connectionState.isOnline = true;
    connectionState.lastHealthCheck = {
      timestamp: Date.now(),
      status: data.status,
      data,
    };
    connectionState.consecutiveFailures = 0;
    
    notifyHealthSubscribers();
    
    return {
      healthy: data.status === 'healthy',
      status: data.status,
      data,
    };
    
  } catch (error) {
    connectionState.lastHealthCheck = {
      timestamp: Date.now(),
      status: 'error',
      error: error.message,
    };
    
    // After 3 failed health checks, mark as offline
    connectionState.consecutiveFailures++;
    if (connectionState.consecutiveFailures >= 3) {
      connectionState.isOnline = false;
    }
    
    notifyHealthSubscribers();
    
    return {
      healthy: false,
      status: 'error',
      error: error.message,
    };
  }
}

/**
 * Get current connection state
 * @returns {Object} Current connection state
 */
export function getConnectionState() {
  return { ...connectionState };
}

/**
 * Subscribe to health check updates
 * @param {Function} callback - Callback function
 * @returns {Function} Unsubscribe function
 */
export function subscribeToHealth(callback) {
  healthSubscribers.add(callback);
  
  // Immediately notify with current state
  callback(connectionState);
  
  return () => {
    healthSubscribers.delete(callback);
  };
}

/**
 * Notify all health subscribers
 */
function notifyHealthSubscribers() {
  const state = getConnectionState();
  healthSubscribers.forEach(callback => {
    try {
      callback(state);
    } catch (error) {
      console.error('Health subscriber error:', error);
    }
  });
}

// Auto health check interval
let healthCheckIntervalId = null;

/**
 * Start automatic health check monitoring
 * @param {number} intervalMs - Check interval in milliseconds
 * @param {string} baseUrl - Base API URL
 */
export function startHealthMonitoring(intervalMs = DEFAULT_CONFIG.healthCheckInterval, baseUrl = DEFAULT_CONFIG.baseUrl) {
  // Stop any existing monitoring
  stopHealthMonitoring();
  
  // Do an immediate check
  checkApiHealth(baseUrl);
  
  // Start periodic checks
  healthCheckIntervalId = setInterval(() => {
    checkApiHealth(baseUrl);
  }, intervalMs);
}

/**
 * Stop automatic health check monitoring
 */
export function stopHealthMonitoring() {
  if (healthCheckIntervalId) {
    clearInterval(healthCheckIntervalId);
    healthCheckIntervalId = null;
  }
}

/**
 * Create a resilient API client for a specific base URL
 * @param {string} baseUrl - Base API URL
 * @param {Object} defaultOptions - Default options for all requests
 * @returns {Object} API client with resilient methods
 */
export function createResilientApiClient(baseUrl = DEFAULT_CONFIG.baseUrl, defaultOptions = {}) {
  const mergeOptions = (options) => ({
    ...defaultOptions,
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...defaultOptions.headers,
      ...options.headers,
    },
  });
  
  return {
    /**
     * GET request
     */
    async get(path, options = {}) {
      return resilientFetch(`${baseUrl}${path}`, mergeOptions({
        method: 'GET',
        ...options,
      }));
    },
    
    /**
     * POST request
     */
    async post(path, data, options = {}) {
      return resilientFetch(`${baseUrl}${path}`, mergeOptions({
        method: 'POST',
        body: JSON.stringify(data),
        ...options,
      }));
    },
    
    /**
     * PUT request
     */
    async put(path, data, options = {}) {
      return resilientFetch(`${baseUrl}${path}`, mergeOptions({
        method: 'PUT',
        body: JSON.stringify(data),
        ...options,
      }));
    },
    
    /**
     * DELETE request
     */
    async delete(path, options = {}) {
      return resilientFetch(`${baseUrl}${path}`, mergeOptions({
        method: 'DELETE',
        ...options,
      }));
    },
    
    /**
     * Check health
     */
    async health() {
      return checkApiHealth(baseUrl);
    },
    
    /**
     * Get connection state
     */
    getState() {
      return getConnectionState();
    },
    
    /**
     * Subscribe to connection state changes
     */
    subscribe(callback) {
      return subscribeToHealth(callback);
    },
    
    /**
     * Start health monitoring
     */
    startMonitoring(intervalMs) {
      startHealthMonitoring(intervalMs, baseUrl);
    },
    
    /**
     * Stop health monitoring
     */
    stopMonitoring() {
      stopHealthMonitoring();
    },
  };
}

// Export default client
export const apiClient = createResilientApiClient();

export default {
  resilientFetch,
  checkApiHealth,
  getConnectionState,
  subscribeToHealth,
  startHealthMonitoring,
  stopHealthMonitoring,
  createResilientApiClient,
  apiClient,
};
