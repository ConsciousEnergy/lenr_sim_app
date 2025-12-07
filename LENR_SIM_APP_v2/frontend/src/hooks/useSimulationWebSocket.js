/**
 * React Hook for Real-Time Simulation WebSocket
 * ==============================================
 * 
 * Custom hook for managing WebSocket connections to streaming simulations.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { createSimulationSocket, generateSimulationId } from '../services/websocket';

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
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentData, setCurrentData] = useState(null);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);

  const socketRef = useRef(null);
  const simulationIdRef = useRef(null);

  /**
   * Connect to WebSocket
   */
  const connect = useCallback(() => {
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
        setHistory(prev => [...prev, data.data]);
        if (onUpdate) onUpdate(data);
      },
      onComplete: (data) => {
        setIsRunning(false);
        setProgress(1);
        if (onComplete) onComplete(data);
      },
      onError: (err) => {
        setError(err.message || 'WebSocket error');
        setIsRunning(false);
        if (onError) onError(err);
      },
    });
  }, [simulationType, onUpdate, onComplete, onError]);

  /**
   * Disconnect from WebSocket
   */
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setIsConnected(false);
    setIsRunning(false);
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

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

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

