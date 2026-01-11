/**
 * Error reporting utility for the LENR Simulation Application
 * Provides consistent error handling and reporting across the application
 */

// Configuration
const ERROR_LEVELS = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  CRITICAL: 'critical'
};

// Optional URL to send error reports to
const ERROR_ENDPOINT = process.env.REACT_APP_ERROR_ENDPOINT || '/api/errors';

/**
 * Format error data for reporting
 * 
 * @param {Error|string} error - The error object or message
 * @param {Object} context - Additional context about where/when the error occurred
 * @returns {Object} Formatted error data
 */
const formatError = (error, context = {}) => {
  const timestamp = new Date().toISOString();
  const errorObj = {
    timestamp,
    message: error instanceof Error ? error.message : error,
    stack: error instanceof Error ? error.stack : null,
    type: error instanceof Error ? error.name : 'Unknown',
    context: {
      url: window.location.href,
      userAgent: navigator.userAgent,
      ...context
    }
  };
  
  return errorObj;
};

/**
 * Log error to console
 * 
 * @param {Object} errorData - Formatted error data
 * @param {string} level - Error level (info, warning, error, critical)
 */
const logToConsole = (errorData, level = ERROR_LEVELS.ERROR) => {
  const prefix = `[LENR-SIM ${level.toUpperCase()}]`;
  
  switch (level) {
    case ERROR_LEVELS.INFO:
      console.info(prefix, errorData);
      break;
    case ERROR_LEVELS.WARNING:
      console.warn(prefix, errorData);
      break;
    case ERROR_LEVELS.CRITICAL:
      console.error(prefix, '🚨 CRITICAL ERROR 🚨', errorData);
      break;
    case ERROR_LEVELS.ERROR:
    default:
      console.error(prefix, errorData);
  }
};

/**
 * Send error to backend API
 * 
 * @param {Object} errorData - Formatted error data
 * @returns {Promise} Promise resolving to API response
 */
const sendToApi = async (errorData) => {
  try {
    const response = await fetch(ERROR_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(errorData)
    });
    
    if (!response.ok) {
      throw new Error(`Error reporting failed: ${response.status}`);
    }
    
    return await response.json();
  } catch (err) {
    // Don't report errors about error reporting to avoid infinite loops
    console.error('Error reporting failed:', err);
    return null;
  }
};

/**
 * Main error reporting function
 * 
 * @param {Error|string} error - The error object or message
 * @param {Object} options - Options for error reporting
 * @param {string} options.level - Error level (info, warning, error, critical)
 * @param {Object} options.context - Additional context about where/when the error occurred
 * @param {boolean} options.notify - Whether to send error to backend API
 * @returns {Object} Formatted error data
 */
const reportError = (error, options = {}) => {
  const {
    level = ERROR_LEVELS.ERROR,
    context = {},
    notify = level === ERROR_LEVELS.CRITICAL
  } = options;
  
  const errorData = formatError(error, context);
  
  // Always log to console
  logToConsole(errorData, level);
  
  // Send to API if specified
  if (notify) {
    sendToApi(errorData).catch(err => {
      console.error('Failed to send error report:', err);
    });
  }
  
  return errorData;
};

// Export the main function and utilities
const errorReporter = {
  report: reportError,
  levels: ERROR_LEVELS,
  format: formatError
};

export default errorReporter; 