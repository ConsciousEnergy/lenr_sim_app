/**
 * API Utilities for LENR Simulation App
 * Provides consistent API access with timeout protection
 */

import logger from './logger';

// Default timeout in milliseconds
const DEFAULT_TIMEOUT = 15000;

// Simple offline detection
let isOfflineMode = false;
let lastOfflineCheck = 0;
const OFFLINE_CHECK_INTERVAL = 30000; // 30 seconds
let pendingHealthCheck = null;

/**
 * Check if the backend is available
 * @returns {Promise<boolean>} Whether the backend is available
 */
export const checkBackendAvailability = async () => {
  try {
    // Use cached result if we checked recently
    const now = Date.now();
    if (now - lastOfflineCheck < OFFLINE_CHECK_INTERVAL) {
      return !isOfflineMode;
    }
    
    // If there's already a check in progress, wait for it
    if (pendingHealthCheck) {
      return pendingHealthCheck;
    }
    
    // Create a new health check promise
    pendingHealthCheck = (async () => {
      try {
        lastOfflineCheck = now;
        
        // Instead of using fetch which will cause proxy errors, 
        // use XMLHttpRequest with a very short timeout
        const result = await new Promise((resolve) => {
          const xhr = new XMLHttpRequest();
          xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
              if (xhr.status === 200) {
                resolve(true);
              } else {
                resolve(false);
              }
            }
          };
          
          // Set a very short timeout to fail fast
          xhr.timeout = 1000;
          xhr.ontimeout = () => resolve(false);
          xhr.onerror = () => resolve(false);
          
          // Use a specific path that won't trigger proxy warnings
          xhr.open('GET', '/api/health-check');
          xhr.send();
        });
        
        if (result) {
          if (isOfflineMode) {
            logger.info('Backend connection restored');
            isOfflineMode = false;
          }
          return true;
        } else {
          isOfflineMode = true;
          return false;
        }
      } finally {
        // Clear the pending promise
        pendingHealthCheck = null;
      }
    })();
    
    return pendingHealthCheck;
  } catch (error) {
    isOfflineMode = true;
    pendingHealthCheck = null;
    return false;
  }
};

/**
 * Create a fetch request with timeout
 * @param {string} url - The URL to fetch
 * @param {Object} options - Fetch options
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise} - Promise that resolves with the response or rejects with an error
 */
export const fetchWithTimeout = async (url, options = {}, timeout = DEFAULT_TIMEOUT) => {
  // Check if we're offline first to avoid unnecessary requests
  if (isOfflineMode && !url.includes('health')) {
    const isAvailable = await checkBackendAvailability();
    if (!isAvailable) {
      throw new Error(`Cannot fetch ${url} - backend is not available`);
    }
  }
  
  const controller = new AbortController();
  const { signal } = controller;
  
  // Create a timeout that aborts the fetch
  const timeoutId = setTimeout(() => {
    controller.abort();
    logger.warn(`Request to ${url} timed out after ${timeout}ms`);
  }, timeout);
  
  try {
    const response = await fetch(url, { ...options, signal });
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      throw new Error(`Request to ${url} timed out after ${timeout}ms`);
    }
    
    // Handle offline state
    if (error.message.includes('Failed to fetch') || 
        error.message.includes('NetworkError') ||
        error.message.includes('ECONNREFUSED')) {
      isOfflineMode = true;
      logger.warn('Backend connection lost', { url });
    }
    
    throw error;
  }
};

/**
 * Fetch JSON data with timeout
 * @param {string} url - The URL to fetch
 * @param {Object} options - Fetch options
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise} - Promise that resolves with the JSON data
 */
export const fetchJson = async (url, options = {}, timeout = DEFAULT_TIMEOUT) => {
  const response = await fetchWithTimeout(url, options, timeout);
  return response.json();
};

/**
 * Retry an API call with exponential backoff
 * @param {Function} fn - The function to retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} baseDelay - Base delay between retries in milliseconds
 * @returns {Promise} - Promise that resolves with the result or rejects with an error
 */
export const retry = async (fn, maxRetries = 3, baseDelay = 1000) => {
  // Don't retry if we're offline
  if (isOfflineMode && await checkBackendAvailability() === false) {
    throw new Error('Cannot make API call - backend is not available');
  }
  
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Don't retry if the error is a timeout or if we've reached the max retries
      if (error.message.includes('timed out') || i === maxRetries - 1) {
        throw error;
      }
      
      // Don't retry if the backend is unavailable
      if (error.message.includes('Failed to fetch') || 
          error.message.includes('NetworkError') ||
          error.message.includes('ECONNREFUSED')) {
        isOfflineMode = true;
        logger.warn('Backend connection lost, stopping retries');
        throw error;
      }
      
      // Exponential backoff
      const delay = baseDelay * Math.pow(2, i);
      logger.debug(`Retrying API call after ${delay}ms`, { attempt: i + 1, maxRetries });
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
};

/**
 * Perform a GET request with timeout and retry
 * @param {string} url - The URL to fetch
 * @param {Object} options - Fetch options
 * @param {number} timeout - Timeout in milliseconds
 * @param {number} maxRetries - Maximum number of retries
 * @returns {Promise} - Promise that resolves with the JSON data
 */
export const get = (url, options = {}, timeout = DEFAULT_TIMEOUT, maxRetries = 3) => {
  return retry(
    () => fetchJson(url, { ...options, method: 'GET' }, timeout),
    maxRetries
  );
};

/**
 * Perform a POST request with timeout and retry
 * @param {string} url - The URL to fetch
 * @param {Object} data - The data to send
 * @param {Object} options - Fetch options
 * @param {number} timeout - Timeout in milliseconds
 * @param {number} maxRetries - Maximum number of retries
 * @returns {Promise} - Promise that resolves with the JSON data
 */
export const post = (url, data, options = {}, timeout = DEFAULT_TIMEOUT, maxRetries = 3) => {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };
  
  return retry(
    () => fetchJson(
      url, 
      {
        ...options,
        method: 'POST',
        headers,
        body: JSON.stringify(data)
      },
      timeout
    ),
    maxRetries
  );
};

// Create a named export object
const apiUtils = {
  fetchWithTimeout,
  fetchJson,
  retry,
  get,
  post,
  checkBackendAvailability
};

// Export defaults
export default apiUtils; 