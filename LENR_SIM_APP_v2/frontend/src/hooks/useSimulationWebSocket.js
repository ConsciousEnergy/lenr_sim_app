/**
 * React Hook for Real-Time Simulation WebSocket
 * ==============================================
 * 
 * Custom hook for managing WebSocket connections to streaming simulations.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { createSimulationSocket, generateSimulationId } from '../services/websocket';

// Maximum history entries to prevent memory issues
const MAX_HISTORY_LENGTH = 1000;

/**
 * Hook for managing simulation WebSocket connections
 * 
 * @param {string} simulationType - Type of simulation (quantum-tunneling, lenr, bubble-fusion)
 * @param {object} options - Configuration options
 * @returns {object} WebSocket state and controls
 */
export function useSimulationWebSocket(simulationType, options = {}) {
  const {
    autoConnect = false,
    onUpdate = null,
    onComplete = null,
    onError = null,
    maxHistoryLength = MAX_HISTORY_LENGTH,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentData, setCurrentData] = useState(null);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);

  const socketRef = useRef(null);
  const simulationIdRef = useRef(null);
  // Track if disconnect was explicitly requested
  const isDisconnectingRef = useRef(false);
  
  // Store callbacks in refs to avoid unstable dependencies
  const onUpdateRef = useRef(onUpdate);
  const onCompleteRef = useRef(onComplete);
  const onErrorRef = useRef(onError);
  
  // Update refs when callbacks change
  useEffect(() => {
    onUpdateRef.current = onUpdate;
    onCompleteRef.current = onComplete;
    onErrorRef.current = onError;
  }, [onUpdate, onComplete, onError]);

  /**
   * Connect to WebSocket
   */
  const connect = useCallback(() => {
    // Prevent reconnection if explicitly disconnecting
    if (isDisconnectingRef.current) {
      return;
    }
    
    if (socketRef.current?.isConnected()) {
      return;
    }

    const simId = generateSimulationId();
    simulationIdRef.current = simId;
    setError(null);

    socketRef.current = createSimulationSocket(simulationType, simId, {
      onConnect: () => {
        setIsConnected(true);
        setError(null);
      },
      onDisconnect: () => {
        setIsConnected(false);
        setIsRunning(false);
      },
      onUpdate: (data) => {
        setProgress(data.progress || 0);
        setCurrentData(data.data);
        // Limit history growth to prevent memory issues
        setHistory(prev => {
          const newHistory = [...prev, data.data];
          if (newHistory.length > maxHistoryLength) {
            // Keep most recent entries
            return newHistory.slice(-maxHistoryLength);
          }
          return newHistory;
        });
        if (onUpdateRef.current) onUpdateRef.current(data);
      },
      onComplete: (data) => {
        setIsRunning(false);
        setProgress(1);
        if (onCompleteRef.current) onCompleteRef.current(data);
      },
      onError: (err) => {
        setError(err.message || 'WebSocket error');
        setIsRunning(false);
        if (onErrorRef.current) onErrorRef.current(err);
      },
    });
  }, [simulationType, maxHistoryLength]); // Stable dependencies only

  /**
   * Disconnect from WebSocket
   */
  const disconnect = useCallback(() => {
    isDisconnectingRef.current = true;
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setIsConnected(false);
    setIsRunning(false);
    // Reset flag after a short delay to allow cleanup
    setTimeout(() => {
      isDisconnectingRef.current = false;
    }, 100);
  }, []);

  /**
   * Start simulation with parameters
   */
  const startSimulation = useCallback((params, durationSteps = 100) => {
    if (!socketRef.current?.isConnected()) {
      setError('Not connected to WebSocket');
      return false;
    }

    setIsRunning(true);
    setProgress(0);
    setHistory([]);
    setCurrentData(null);
    setError(null);

    return socketRef.current.startSimulation(params, durationSteps);
  }, []);

  /**
   * Stop running simulation
   */
  const stopSimulation = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.stopSimulation();
    }
    setIsRunning(false);
  }, []);

  /**
   * Clear history
   */
  const clearHistory = useCallback(() => {
    setHistory([]);
    setCurrentData(null);
    setProgress(0);
  }, []);

  // Auto-connect on mount if enabled
  useEffect(() => {
    if (autoConnect) {
      connect();
    }
    
    // Cleanup only on unmount, not on every dependency change
    // Using a ref to store the disconnect function to avoid closure issues
    const currentDisconnect = disconnect;
    return () => {
      currentDisconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoConnect]); // Only re-run when autoConnect changes, not on connect/disconnect changes

  return {
    // Connection state
    isConnected,
    isRunning,
    progress,
    error,
    simulationId: simulationIdRef.current,

    // Current data
    currentData,
    history,

    // Controls
    connect,
    disconnect,
    startSimulation,
    stopSimulation,
    clearHistory,
  };
}

/**
 * Hook specifically for quantum tunneling simulations
 */
export function useQuantumTunnelingWebSocket(options = {}) {
  return useSimulationWebSocket('quantum-tunneling', options);
}

/**
 * Hook specifically for LENR simulations
 */
export function useLENRWebSocket(options = {}) {
  return useSimulationWebSocket('lenr', options);
}

/**
 * Hook specifically for bubble fusion simulations
 */
export function useBubbleFusionWebSocket(options = {}) {
  return useSimulationWebSocket('bubble-fusion', options);
}

export default useSimulationWebSocket;

