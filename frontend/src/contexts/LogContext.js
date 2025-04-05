import React, { createContext, useContext, useEffect, useState } from 'react';
import logger from '../utils/logger';
import api from '../utils/api';

// Create the log context
const LogContext = createContext(logger);

/**
 * Custom check for backend availability without causing proxy errors
 */
const checkBackendWithoutErrors = async () => {
  try {
    // Use a direct XMLHttpRequest to avoid proxy logging
    return await new Promise((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
          resolve(xhr.status === 200);
        }
      };
      
      xhr.timeout = 1000;
      xhr.ontimeout = () => resolve(false);
      xhr.onerror = () => resolve(false);
      
      // Use an endpoint that shouldn't trigger proxy errors
      xhr.open('GET', '/api/health-check');
      xhr.send();
    });
  } catch (error) {
    return false;
  }
};

/**
 * LogProvider Component
 * Provides logging capabilities to all child components
 */
export const LogProvider = ({ 
  children, 
  config = {}, 
  enableRemote = false
}) => {
  const [backendAvailable, setBackendAvailable] = useState(false);
  
  // Check if backend is available
  useEffect(() => {
    const checkBackend = async () => {
      try {
        // Only check if remote logging is requested
        if (enableRemote) {
          const isAvailable = await checkBackendWithoutErrors();
          setBackendAvailable(isAvailable);
          
          if (!isAvailable) {
            console.warn('Backend not available, remote logging disabled');
          }
        }
      } catch (error) {
        console.warn('Failed to check backend availability, remote logging disabled');
        setBackendAvailable(false);
      }
    };
    
    checkBackend();
    
    // Periodically check backend availability in the background if remote logging is enabled
    let checkInterval;
    if (enableRemote) {
      checkInterval = setInterval(async () => {
        const isAvailable = await checkBackendWithoutErrors();
        if (isAvailable !== backendAvailable) {
          setBackendAvailable(isAvailable);
          console.warn(`Backend availability changed to: ${isAvailable ? 'available' : 'unavailable'}`);
        }
      }, 60000); // Check every minute
    }
    
    return () => {
      if (checkInterval) {
        clearInterval(checkInterval);
      }
    };
  }, [enableRemote, backendAvailable]);
  
  // Initialize logger with provided config
  useEffect(() => {
    const defaultConfig = {
      level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
      enableConsole: true,
      // Only enable remote logging if backend is available
      enableRemote: enableRemote && backendAvailable,
      applicationName: 'LENR_SIM_APP_FRONTEND'
    };
    
    logger.init({
      ...defaultConfig,
      ...config
    });
    
    logger.info('Log system initialized', { 
      environment: process.env.NODE_ENV,
      remoteLogging: enableRemote && backendAvailable
    });
    
    // Cleanup: Flush logs on unmount
    return () => {
      logger.info('LogProvider unmounting, flushing logs');
      logger.flush();
    };
  }, [config, enableRemote, backendAvailable]);
  
  return (
    <LogContext.Provider value={logger}>
      {children}
    </LogContext.Provider>
  );
};

/**
 * Custom hook to use the logger in any component
 * @returns {Object} - Logger instance
 */
export const useLogger = () => {
  const logger = useContext(LogContext);
  
  if (!logger) {
    console.warn('useLogger must be used within a LogProvider');
    // Return a no-op logger to prevent errors
    return {
      debug: () => {},
      info: () => {},
      warn: () => {},
      error: () => {},
      fatal: () => {}
    };
  }
  
  return logger;
};

export default LogContext; 