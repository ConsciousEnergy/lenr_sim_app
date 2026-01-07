/**
 * Frontend Logger for LENR Simulation App
 * Provides consistent logging across the frontend application
 * with capability to send logs to backend
 */

// Log levels
export const LOG_LEVELS = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
  FATAL: 'fatal'
};

// Default config
const defaultConfig = {
  level: LOG_LEVELS.INFO,
  enableConsole: true,
  enableRemote: false, // Whether to send logs to backend
  batchSize: 10, // Number of logs to batch before sending
  apiEndpoint: '/api/logs',
  applicationName: 'LENR_SIM_APP_FRONTEND',
  includeTimestamp: true,
  environment: process.env.NODE_ENV || 'development'
};

class Logger {
  constructor(config = {}) {
    this.config = { ...defaultConfig, ...config };
    this.logQueue = [];
    this.logLevelPriority = {
      [LOG_LEVELS.DEBUG]: 0,
      [LOG_LEVELS.INFO]: 1,
      [LOG_LEVELS.WARN]: 2,
      [LOG_LEVELS.ERROR]: 3,
      [LOG_LEVELS.FATAL]: 4
    };
    
    // Track offline state
    this.isOffline = false;
    this.consecutiveFailures = 0;
    this.maxConsecutiveFailures = 3;
    this.backoffTime = 30000; // 30 seconds
    this.maxBackoffTime = 5 * 60 * 1000; // 5 minutes
    this.nextRetryTime = 0;
    
    // Setup periodic backend check
    if (typeof window !== 'undefined') {
      this.checkBackendInterval = setInterval(() => this.checkBackendStatus(), 60000); // Check every minute
    }
    
    // Set up error listener for uncaught errors
    if (typeof window !== 'undefined') {
      window.addEventListener('error', this.handleUncaughtError.bind(this));
      window.addEventListener('unhandledrejection', this.handleUnhandledRejection.bind(this));
    }
  }

  /**
   * Check if the backend is available
   */
  async checkBackendStatus() {
    // Skip check if we're not sending logs remotely
    if (!this.config.enableRemote) return;
    
    // Skip if we're in backoff mode
    if (this.isOffline && Date.now() < this.nextRetryTime) return;
    
    try {
      // Use XMLHttpRequest instead of fetch to avoid proxy errors
      const isAvailable = await new Promise((resolve) => {
        const xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function() {
          if (xhr.readyState === 4) {
            resolve(xhr.status === 200);
          }
        };
        
        // Set a very short timeout to fail fast
        xhr.timeout = 1000;
        xhr.ontimeout = () => resolve(false);
        xhr.onerror = () => resolve(false);
        
        // Use an API path that won't cause proxy errors
        xhr.open('GET', '/api/health-check');
        xhr.send();
      });
      
      if (isAvailable) {
        if (this.isOffline) {
          console.info('Backend connection restored, resuming remote logging');
        }
        this.isOffline = false;
        this.consecutiveFailures = 0;
        
        // If we have queued logs, try to send them
        if (this.logQueue.length > 0) {
          this.sendLogsToBackend();
        }
      } else {
        this.handleBackendUnavailable();
      }
    } catch (error) {
      this.handleBackendUnavailable();
    }
  }
  
  /**
   * Handle backend being unavailable
   */
  handleBackendUnavailable() {
    this.consecutiveFailures++;
    
    if (this.consecutiveFailures >= this.maxConsecutiveFailures) {
      this.isOffline = true;
      
      // Set exponential backoff for retry
      this.backoffTime = Math.min(this.backoffTime * 2, this.maxBackoffTime);
      this.nextRetryTime = Date.now() + this.backoffTime;
      
      console.warn(`Logger: Backend unavailable, will retry in ${this.backoffTime/1000}s`);
      
      // Try to persist logs locally
      this.saveLogsToLocalStorage();
    }
  }

  /**
   * Initialize logger with user config
   * @param {Object} config - Logger configuration
   */
  init(config = {}) {
    this.config = { ...this.config, ...config };
    this.debug('Logger initialized with configuration', this.config);
  }

  /**
   * Check if a log level should be recorded based on the current config
   * @param {string} level - Log level to check
   * @returns {boolean} - Whether the log should be recorded
   */
  shouldLog(level) {
    return this.logLevelPriority[level] >= this.logLevelPriority[this.config.level];
  }

  /**
   * Create a log entry
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {Object} data - Additional data
   * @param {Error} error - Error object
   * @returns {Object} - Log entry
   */
  createLogEntry(level, message, data = null, error = null) {
    const timestamp = this.config.includeTimestamp ? new Date().toISOString() : undefined;
    
    const logEntry = {
      level,
      message,
      timestamp,
      application: this.config.applicationName,
      environment: this.config.environment,
      data
    };
    
    // Add error details if provided
    if (error) {
      logEntry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
        cause: error.cause
      };
    }
    
    // Add browser and user info when in browser environment
    if (typeof window !== 'undefined') {
      logEntry.client = {
        url: window.location.href,
        userAgent: navigator.userAgent,
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight,
        language: navigator.language
      };
    }
    
    return logEntry;
  }

  /**
   * Log to console if enabled
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {Object} data - Additional data
   */
  logToConsole(level, message, data) {
    if (!this.config.enableConsole) return;
    
    const consoleMethod = level === LOG_LEVELS.FATAL ? 'error' : level;
    
    if (data) {
      console[consoleMethod](`[${level.toUpperCase()}] ${message}`, data);
    } else {
      console[consoleMethod](`[${level.toUpperCase()}] ${message}`);
    }
  }

  /**
   * Queue log for sending to backend
   * @param {Object} logEntry - Log entry
   */
  queueRemoteLog(logEntry) {
    if (!this.config.enableRemote) return;
    
    // Filter out backend connection errors to prevent loops
    if (logEntry.error && 
        (logEntry.error.message?.includes('ECONNREFUSED') || 
         logEntry.error.message?.includes('Failed to fetch') ||
         logEntry.error.message?.includes('NetworkError') ||
         logEntry.error.stack?.includes('/api/logs'))) {
      return;
    }
    
    this.logQueue.push(logEntry);
    
    // If we have enough logs and the backend is available, send immediately
    if (this.logQueue.length >= this.config.batchSize && !this.isOffline) {
      this.sendLogsToBackend();
    }
  }

  /**
   * Save logs to localStorage when backend is unavailable
   */
  saveLogsToLocalStorage() {
    if (this.logQueue.length === 0) return;
    
    try {
      // Get existing logs
      const storedLogs = JSON.parse(localStorage.getItem('appLogs') || '[]');
      
      // Add new logs
      const updatedLogs = [...storedLogs, ...this.logQueue];
      
      // Limit to 100 logs to prevent localStorage overflow
      const trimmedLogs = updatedLogs.slice(-100);
      
      // Save to localStorage
      localStorage.setItem('appLogs', JSON.stringify(trimmedLogs));
      
      // Clear queue after saving
      console.debug(`Logger: Saved ${this.logQueue.length} logs to localStorage`);
      this.logQueue = [];
    } catch (error) {
      console.error('Failed to save logs to localStorage:', error);
    }
  }

  /**
   * Send queued logs to backend
   */
  async sendLogsToBackend() {
    if (this.logQueue.length === 0 || this.isOffline) return;
    
    const logsToSend = [...this.logQueue];
    this.logQueue = [];
    
    try {
      const response = await fetch(this.config.apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logs: logsToSend }),
        // Add a reasonable timeout
        signal: AbortSignal.timeout(5000)
      });
      
      if (!response.ok) {
        throw new Error(`Failed to send logs to backend: ${response.status} ${response.statusText}`);
      }
      
      // Reset failure counter on success
      this.consecutiveFailures = 0;
    } catch (error) {
      // Don't use the logger here to avoid infinite loop
      console.error('Error sending logs to backend:', error);
      
      // Put logs back in queue
      this.logQueue = [...logsToSend, ...this.logQueue];
      
      // Handle potential offline mode
      this.handleBackendUnavailable();
    }
  }

  /**
   * Core logging method
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {Object} data - Additional data
   * @param {Error} error - Error object
   */
  log(level, message, data = null, error = null) {
    if (!this.shouldLog(level)) return;
    
    const logEntry = this.createLogEntry(level, message, data, error);
    
    // Log to console
    this.logToConsole(level, message, data || error);
    
    // Queue for remote logging if enabled
    this.queueRemoteLog(logEntry);
    
    return logEntry;
  }

  /**
   * Log at DEBUG level
   * @param {string} message - Log message
   * @param {Object} data - Additional data
   */
  debug(message, data = null) {
    return this.log(LOG_LEVELS.DEBUG, message, data);
  }

  /**
   * Log at INFO level
   * @param {string} message - Log message
   * @param {Object} data - Additional data
   */
  info(message, data = null) {
    return this.log(LOG_LEVELS.INFO, message, data);
  }

  /**
   * Log at WARN level
   * @param {string} message - Log message
   * @param {Object} data - Additional data
   */
  warn(message, data = null) {
    return this.log(LOG_LEVELS.WARN, message, data);
  }

  /**
   * Log at ERROR level
   * @param {string} message - Log message
   * @param {Error|Object} errorOrData - Error object or additional data
   * @param {Object} data - Additional data if first param is an Error
   */
  error(message, errorOrData = null, data = null) {
    let error = null;
    let logData = data;
    
    if (errorOrData instanceof Error) {
      error = errorOrData;
    } else {
      logData = errorOrData;
    }
    
    return this.log(LOG_LEVELS.ERROR, message, logData, error);
  }

  /**
   * Log at FATAL level
   * @param {string} message - Log message
   * @param {Error|Object} errorOrData - Error object or additional data
   * @param {Object} data - Additional data if first param is an Error
   */
  fatal(message, errorOrData = null, data = null) {
    let error = null;
    let logData = data;
    
    if (errorOrData instanceof Error) {
      error = errorOrData;
    } else {
      logData = errorOrData;
    }
    
    return this.log(LOG_LEVELS.FATAL, message, logData, error);
  }

  /**
   * Handle uncaught errors
   * @param {ErrorEvent} event - Error event
   */
  handleUncaughtError(event) {
    const { message, filename, lineno, colno, error } = event;
    
    this.fatal(`Uncaught error: ${message}`, error, {
      location: { 
        file: filename, 
        line: lineno, 
        column: colno 
      }
    });
    
    // Force send logs immediately for uncaught errors
    this.sendLogsToBackend();
  }

  /**
   * Handle unhandled promise rejections
   * @param {PromiseRejectionEvent} event - Promise rejection event
   */
  handleUnhandledRejection(event) {
    const reason = event.reason;
    const error = reason instanceof Error ? reason : new Error(String(reason));
    
    this.fatal('Unhandled promise rejection', error);
    
    // Force send logs immediately for unhandled rejections
    this.sendLogsToBackend();
  }

  /**
   * Flush any pending logs
   */
  flush() {
    if (this.logQueue.length > 0) {
      if (this.isOffline) {
        this.saveLogsToLocalStorage();
      } else {
        this.sendLogsToBackend();
      }
    }
  }
  
  /**
   * Clean up resources
   */
  destroy() {
    if (this.checkBackendInterval) {
      clearInterval(this.checkBackendInterval);
    }
    
    // Flush any remaining logs before destruction
    this.flush();
    
    if (typeof window !== 'undefined') {
      window.removeEventListener('error', this.handleUncaughtError);
      window.removeEventListener('unhandledrejection', this.handleUnhandledRejection);
    }
  }
}

// Create singleton instance
const logger = new Logger();

export default logger; 