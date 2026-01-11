/**
 * Error Reporter for LENR Simulation App
 * Provides lightweight error reporting to the backend
 */

import api from './api';

class ErrorReporter {
  constructor() {
    this.errorQueue = [];
    this.isProcessing = false;
    this.maxQueueSize = 50;
    this.flushInterval = 10000; // 10 seconds
    this.setupGlobalHandlers();
    this.startFlushInterval();
    this.backendUnavailable = false;
    this.consecutiveFailures = 0;
    this.maxConsecutiveFailures = 5;
    this.backoffTime = 30000; // Start with 30 seconds
    this.maxBackoffTime = 5 * 60 * 1000; // 5 minutes max
    this.nextAttemptTime = 0;
  }

  /**
   * Set up global error handlers
   */
  setupGlobalHandlers() {
    if (typeof window !== 'undefined') {
      // Capture uncaught errors
      window.addEventListener('error', (event) => {
        this.captureError({
          type: 'uncaught_error',
          message: event.message,
          stack: event.error?.stack,
          location: {
            file: event.filename,
            line: event.lineno,
            column: event.colno
          }
        });
        
        // Don't prevent default browser error handling
        return false;
      });
      
      // Capture unhandled promise rejections
      window.addEventListener('unhandledrejection', (event) => {
        this.captureError({
          type: 'unhandled_rejection',
          message: event.reason?.message || String(event.reason),
          stack: event.reason?.stack,
        });
        
        // Don't prevent default browser error handling
        return false;
      });
    }
  }

  /**
   * Start interval to flush errors
   */
  startFlushInterval() {
    if (typeof window !== 'undefined') {
      setInterval(() => this.flush(), this.flushInterval);
    }
  }

  /**
   * Capture an error
   * @param {Object} error - Error object
   */
  captureError(error) {
    // Skip backend connection errors to prevent loops
    if (error.message?.includes('ECONNREFUSED') || 
        error.message?.includes('Failed to fetch') ||
        error.message?.includes('NetworkError') ||
        error.stack?.includes('/api/logs')) {
      // Only log these in development
      if (process.env.NODE_ENV !== 'production') {
        console.debug('[ErrorReporter] Skipping API connection error:', error.message);
      }
      return;
    }
    
    // Add timestamp and user info
    const enrichedError = {
      ...error,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent
    };
    
    // Add to queue
    this.errorQueue.push(enrichedError);
    
    // Limit queue size
    if (this.errorQueue.length > this.maxQueueSize) {
      this.errorQueue = this.errorQueue.slice(-this.maxQueueSize);
    }
    
    // Automatically flush if this is a critical error and backend is available
    if ((error.type === 'uncaught_error' || error.type === 'unhandled_rejection') && !this.backendUnavailable) {
      this.flush();
    }
    
    // Log to console for immediate visibility during development
    if (process.env.NODE_ENV !== 'production') {
      console.error('[ErrorReporter]', enrichedError);
    }
  }

  /**
   * Report an error manually
   * @param {Error|string} error - Error object or message
   * @param {Object} context - Additional context
   */
  report(error, context = {}) {
    let errorObj = {
      type: 'manual',
      context
    };
    
    if (error instanceof Error) {
      errorObj.message = error.message;
      errorObj.stack = error.stack;
      errorObj.name = error.name;
    } else {
      errorObj.message = String(error);
    }
    
    this.captureError(errorObj);
  }

  /**
   * Store logs locally in case backend is unavailable
   */
  storeLogsLocally() {
    try {
      // Only store if we have something
      if (this.errorQueue.length === 0) return;
      
      const existingLogs = JSON.parse(localStorage.getItem('errorLogs') || '[]');
      const combinedLogs = [...existingLogs, ...this.errorQueue];
      
      // Limit to prevent localStorage overflow
      const trimmedLogs = combinedLogs.slice(-100);
      
      localStorage.setItem('errorLogs', JSON.stringify(trimmedLogs));
      console.debug(`[ErrorReporter] Stored ${this.errorQueue.length} logs locally`);
    } catch (e) {
      console.error('Failed to store logs locally:', e);
    }
  }

  /**
   * Check if backend is available
   * @returns {Promise<boolean>}
   */
  async checkBackendAvailability() {
    try {
      // Use XMLHttpRequest to avoid proxy errors
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
        
        // Use an API path that won't trigger proxy errors in logs
        xhr.open('GET', '/api/health-check');
        xhr.send();
      });
      
      if (isAvailable) {
        // Reset failure count if successful
        this.consecutiveFailures = 0;
        this.backendUnavailable = false;
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  /**
   * Flush the error queue to the backend
   */
  async flush() {
    // Skip if already processing or queue is empty
    if (this.isProcessing || this.errorQueue.length === 0) return;
    
    // Check if we're in backoff mode
    if (this.backendUnavailable && Date.now() < this.nextAttemptTime) {
      return;
    }
    
    this.isProcessing = true;
    const errors = [...this.errorQueue];
    
    try {
      // Skip API call if we know backend is down, but occasionally check
      if (this.backendUnavailable && !await this.checkBackendAvailability()) {
        this.storeLogsLocally();
        return;
      }
      
      // Send errors to backend
      await api.post('/api/logs', { logs: errors.map(error => ({
        level: 'error',
        message: error.message,
        timestamp: error.timestamp,
        application: 'LENR_SIM_APP_FRONTEND',
        data: error
      }))}, {}, 3000); // Short timeout to avoid blocking
      
      // Success - clear the sent errors from queue
      this.errorQueue = this.errorQueue.filter(e => !errors.includes(e));
      this.consecutiveFailures = 0;
      this.backendUnavailable = false;
    } catch (e) {
      // Increase failure count and potentially enter backoff mode
      this.consecutiveFailures++;
      
      // After several failures, start backing off to avoid spamming logs
      if (this.consecutiveFailures >= this.maxConsecutiveFailures) {
        this.backendUnavailable = true;
        
        // Exponential backoff with max limit
        this.backoffTime = Math.min(this.backoffTime * 2, this.maxBackoffTime);
        this.nextAttemptTime = Date.now() + this.backoffTime;
        
        console.warn(`[ErrorReporter] Backend unavailable, next attempt in ${this.backoffTime/1000}s`);
        
        // Store logs locally while backend is unavailable
        this.storeLogsLocally();
      }
    } finally {
      this.isProcessing = false;
    }
  }
}

// Create singleton instance
const errorReporter = new ErrorReporter();

export default errorReporter; 