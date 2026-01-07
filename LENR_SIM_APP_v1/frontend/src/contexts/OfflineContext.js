import React, { createContext, useContext, useState, useEffect } from 'react';

// Create offline context
const OfflineContext = createContext({
  isOffline: false,
  setOfflineState: () => {},
  storedLogs: 0,
  clearStoredLogs: () => {},
  lastSyncTime: null
});

/**
 * Provider component for offline state management
 */
export const OfflineProvider = ({ children }) => {
  const [isOffline, setIsOffline] = useState(false);
  const [storedLogs, setStoredLogs] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [checkInterval, setCheckInterval] = useState(30000); // 30 seconds default

  // Function to explicitly set offline state
  const setOfflineState = (state) => {
    setIsOffline(state);
    
    // If we're going online after being offline, set last sync time
    if (!state && isOffline) {
      setLastSyncTime(new Date());
    }
  };

  // Clear stored logs
  const clearStoredLogs = () => {
    try {
      localStorage.removeItem('errorLogs');
      localStorage.removeItem('appLogs');
      setStoredLogs(0);
    } catch (err) {
      console.error('Error clearing stored logs:', err);
    }
  };

  // Check backend status periodically
  useEffect(() => {
    const checkBackendStatus = async () => {
      try {
        // Use the local health check endpoint
        const response = await fetch('/api/health-check');
        setOfflineState(!response.ok);
      } catch (error) {
        setOfflineState(true);
      }
    };

    const countStoredLogs = () => {
      try {
        const errorLogs = JSON.parse(localStorage.getItem('errorLogs') || '[]');
        const appLogs = JSON.parse(localStorage.getItem('appLogs') || '[]');
        setStoredLogs(errorLogs.length + appLogs.length);
      } catch (err) {
        console.error('Error counting stored logs:', err);
      }
    };

    // Initial checks
    checkBackendStatus();
    countStoredLogs();

    // Set up intervals
    const statusInterval = setInterval(checkBackendStatus, checkInterval);
    const logsInterval = setInterval(countStoredLogs, 10000); // Every 10 seconds

    return () => {
      clearInterval(statusInterval);
      clearInterval(logsInterval);
    };
  }, [checkInterval, isOffline]);

  // Dynamically adjust check interval based on offline status
  useEffect(() => {
    if (isOffline) {
      // Check less frequently when offline to reduce unnecessary requests
      setCheckInterval(60000); // Every minute
    } else {
      // Check more frequently when online
      setCheckInterval(30000); // Every 30 seconds
    }
  }, [isOffline]);

  // Listen for online/offline browser events
  useEffect(() => {
    const handleOnline = () => {
      console.debug('Browser reports online status');
      // Just trigger a check, don't immediately set to online
      // as our API might still be unavailable
      const checkBackend = async () => {
        try {
          const response = await fetch('/api/health-check');
          setOfflineState(!response.ok);
        } catch (error) {
          setOfflineState(true);
        }
      };
      checkBackend();
    };

    const handleOffline = () => {
      console.debug('Browser reports offline status');
      setOfflineState(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const contextValue = {
    isOffline,
    setOfflineState,
    storedLogs,
    clearStoredLogs,
    lastSyncTime
  };

  return (
    <OfflineContext.Provider value={contextValue}>
      {children}
    </OfflineContext.Provider>
  );
};

/**
 * Hook to use offline context
 */
export const useOffline = () => useContext(OfflineContext);

export default OfflineContext; 