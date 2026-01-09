/**
 * useApiHealth Hook
 * 
 * React hook for monitoring API health and connection status.
 * Provides reactive updates when connection state changes.
 * 
 * Usage:
 *   const { isOnline, lastHealthCheck, checkHealth } = useApiHealth();
 *   
 *   if (!isOnline) {
 *     return <OfflineAlert />;
 *   }
 */

import { useState, useEffect, useCallback } from 'react';
import {
  subscribeToHealth,
  checkApiHealth,
  startHealthMonitoring,
  stopHealthMonitoring,
  getConnectionState,
} from '../utils/apiResilience';

/**
 * Hook for API health monitoring
 * 
 * @param {Object} options - Configuration options
 * @param {boolean} options.autoMonitor - Enable automatic health checks (default: true)
 * @param {number} options.interval - Health check interval in ms (default: 30000)
 * @param {string} options.baseUrl - API base URL
 * @returns {Object} Health state and control functions
 */
export function useApiHealth(options = {}) {
  const {
    autoMonitor = true,
    interval = 30000,
    baseUrl,
  } = options;

  const [state, setState] = useState(() => getConnectionState());
  const [isChecking, setIsChecking] = useState(false);

  // Subscribe to health updates
  useEffect(() => {
    const unsubscribe = subscribeToHealth((newState) => {
      setState(newState);
    });

    return unsubscribe;
  }, []);

  // Auto-start monitoring if enabled
  useEffect(() => {
    if (autoMonitor) {
      startHealthMonitoring(interval, baseUrl);
      
      return () => {
        stopHealthMonitoring();
      };
    }
  }, [autoMonitor, interval, baseUrl]);

  // Manual health check function
  const checkHealth = useCallback(async () => {
    setIsChecking(true);
    try {
      const result = await checkApiHealth(baseUrl);
      return result;
    } finally {
      setIsChecking(false);
    }
  }, [baseUrl]);

  // Start monitoring manually
  const startMonitoring = useCallback((customInterval) => {
    startHealthMonitoring(customInterval || interval, baseUrl);
  }, [interval, baseUrl]);

  // Stop monitoring manually
  const stopMonitor = useCallback(() => {
    stopHealthMonitoring();
  }, []);

  return {
    // Connection state
    isOnline: state.isOnline,
    lastHealthCheck: state.lastHealthCheck,
    lastError: state.lastError,
    consecutiveFailures: state.consecutiveFailures,
    
    // Full state object
    connectionState: state,
    
    // Loading state
    isChecking,
    
    // Actions
    checkHealth,
    startMonitoring,
    stopMonitoring: stopMonitor,
  };
}

/**
 * Hook for resilient API calls with automatic retry UI feedback
 * 
 * @param {Object} options - Configuration options
 * @returns {Object} API call state and execute function
 */
export function useResilientApi(options = {}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [retryInfo, setRetryInfo] = useState(null);
  const [data, setData] = useState(null);

  const execute = useCallback(async (fetchFn) => {
    setIsLoading(true);
    setError(null);
    setRetryInfo(null);
    setData(null);

    try {
      const result = await fetchFn({
        onRetry: (attempt, maxRetries, delayMs, errorCategory) => {
          setRetryInfo({
            attempt,
            maxRetries,
            delayMs,
            category: errorCategory.category,
            message: errorCategory.userMessage,
          });
        },
      });

      setData(result);
      setRetryInfo(null);
      return result;

    } catch (err) {
      setError(err);
      throw err;

    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
    setRetryInfo(null);
    setData(null);
  }, []);

  return {
    isLoading,
    error,
    retryInfo,
    data,
    execute,
    reset,
    isRetrying: retryInfo !== null,
  };
}

export default useApiHealth;
