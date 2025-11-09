/**
 * Physics API React Hooks
 * 
 * This module provides React hooks for integrating with the Physics Engine API.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { physicsApiClient } from './physicsApiClient';
import { PhysicsWebSocketClient } from './websocketClient';
import {
  SimulationInitializeRequest,
  SimulationInitializeResponse,
  SimulationStatusResponse,
  SimulationResultsResponse,
  ParameterUpdateRequest,
  SnapshotRequest,
  WebSocketMessage,
  SimulationUpdateMessage,
  SimulationStatus,
  ControlCommand,
  SimulationSnapshot
} from './types';

// Make reconnect function globally available for components
declare global {
  interface Window {
    reconnectVisualizationWebsocket?: () => void;
  }
}

/**
 * Hook for initializing a simulation
 */
export function useInitializeSimulation() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<SimulationInitializeResponse | null>(null);

  const initializeSimulation = useCallback(async (config: SimulationInitializeRequest) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await physicsApiClient.initializeSimulation(config);
      setData(response);
      return response;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to initialize simulation'));
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { initializeSimulation, isLoading, error, data };
}

/**
 * Hook for controlling a simulation (start, pause, resume, reset)
 */
export function useSimulationControl(simulationId: string | null) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [status, setStatus] = useState<SimulationStatus | null>(null);

  const controlSimulation = useCallback(async (command: 'start' | 'pause' | 'resume' | 'reset') => {
    if (!simulationId) {
      throw new Error('No simulation ID provided');
    }

    setIsLoading(true);
    setError(null);
    
    try {
      let response;
      
      switch (command) {
        case 'start':
          response = await physicsApiClient.startSimulation(simulationId);
          break;
        case 'pause':
          response = await physicsApiClient.pauseSimulation(simulationId);
          break;
        case 'resume':
          response = await physicsApiClient.resumeSimulation(simulationId);
          break;
        case 'reset':
          response = await physicsApiClient.resetSimulation(simulationId);
          break;
      }
      
      setStatus(response.status);
      return response;
    } catch (err) {
      setError(err instanceof Error ? err : new Error(`Failed to ${command} simulation`));
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [simulationId]);

  return {
    startSimulation: () => controlSimulation('start'),
    pauseSimulation: () => controlSimulation('pause'),
    resumeSimulation: () => controlSimulation('resume'),
    resetSimulation: () => controlSimulation('reset'),
    isLoading,
    error,
    status
  };
}

/**
 * Hook for fetching and auto-refreshing simulation status
 */
export function useSimulationStatus(simulationId: string | null, refreshInterval = 5000) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<SimulationStatusResponse | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!simulationId) return;

    setIsLoading(true);
    setError(null);
    
    try {
      const response = await physicsApiClient.getSimulationStatus(simulationId);
      setData(response);
      return response;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch simulation status'));
    } finally {
      setIsLoading(false);
    }
  }, [simulationId]);

  useEffect(() => {
    // Fetch immediately on mount or simulationId change
    if (simulationId) {
      fetchStatus();
      
      // Set up interval for auto-refresh if simulation is running
      intervalRef.current = setInterval(() => {
        // Only refresh if simulation is running or we don't know the status yet
        if (!data || data.status === 'running') {
          fetchStatus();
        }
      }, refreshInterval);
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [simulationId, fetchStatus, refreshInterval, data]);

  return { status: data, isLoading, error, refetchStatus: fetchStatus };
}

/**
 * Hook for fetching simulation results
 */
export function useSimulationResults(simulationId: string | null, options?: { step?: number; format?: 'json' | 'csv' }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<SimulationResultsResponse | null>(null);

  const fetchResults = useCallback(async () => {
    if (!simulationId) return;

    setIsLoading(true);
    setError(null);
    
    try {
      const response = await physicsApiClient.getSimulationResults(simulationId, options);
      setData(response);
      return response;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch simulation results'));
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [simulationId, options]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  return { results: data, isLoading, error, refetchResults: fetchResults };
}

/**
 * Hook for updating simulation parameters
 */
export function useUpdateParameters(simulationId: string | null) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const updateParameters = useCallback(async (params: ParameterUpdateRequest) => {
    if (!simulationId) {
      throw new Error('No simulation ID provided');
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const response = await physicsApiClient.updateParameters(simulationId, params);
      return response;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to update parameters'));
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [simulationId]);

  return { updateParameters, isLoading, error };
}

/**
 * Hook for managing simulation snapshots
 */
export function useSimulationSnapshots(simulationId: string | null) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [snapshots, setSnapshots] = useState<SimulationSnapshot[]>([]);

  const fetchSnapshots = useCallback(async () => {
    if (!simulationId) return;

    setIsLoading(true);
    setError(null);
    
    try {
      const response = await physicsApiClient.listSnapshots(simulationId);
      setSnapshots(response.snapshots);
      return response;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch snapshots'));
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [simulationId]);

  const takeSnapshot = useCallback(async (options?: SnapshotRequest) => {
    if (!simulationId) {
      throw new Error('No simulation ID provided');
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const response = await physicsApiClient.takeSnapshot(simulationId, options);
      await fetchSnapshots(); // Refresh the list after taking a snapshot
      return response;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to take snapshot'));
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [simulationId, fetchSnapshots]);

  const restoreSnapshot = useCallback(async (snapshotId: string) => {
    if (!simulationId) {
      throw new Error('No simulation ID provided');
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const response = await physicsApiClient.restoreSnapshot(simulationId, snapshotId);
      return response;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to restore snapshot'));
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [simulationId]);

  useEffect(() => {
    fetchSnapshots();
  }, [fetchSnapshots]);

  return { snapshots, isLoading, error, takeSnapshot, restoreSnapshot, refetchSnapshots: fetchSnapshots };
}

/**
 * Hook for WebSocket connections with retry and error handling
 */
export function usePhysicsWebSocket(simulationId: string | null) {
  const [simulationUpdates, setSimulationUpdates] = useState<SimulationUpdateMessage[]>([]);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<Error | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const clientRef = useRef<PhysicsWebSocketClient | null>(null);
  const maxReconnectAttempts = 5;

  // Connect to WebSocket
  useEffect(() => {
    if (!simulationId) {
      setIsConnected(false);
      setConnectionError(null);
      return;
    }

    let unmounted = false;

    const connectWebSocket = () => {
      try {
        // Create new WebSocket client
        const client = new PhysicsWebSocketClient(simulationId);
        clientRef.current = client;
        
        // Configure retry settings
        client.configureReconnection(maxReconnectAttempts, 2000);
        
        // Set up event listeners
        const unsubscribeUpdate = client.addEventListener('simulation_update', (message: SimulationUpdateMessage) => {
          if (unmounted) return;
          
          setLastMessage(message);
          setSimulationUpdates(prev => [...prev, message].slice(-20)); // Keep last 20 updates
        });
        
        const unsubscribeOpen = client.addEventListener('open', () => {
          if (unmounted) return;
          
          console.log('WebSocket connected');
          setIsConnected(true);
          setConnectionError(null);
          setReconnectAttempts(0);
        });
        
        const unsubscribeClose = client.addEventListener('close', (data) => {
          if (unmounted) return;
          
          console.log('WebSocket closed:', data);
          setIsConnected(false);
          
          // If we have reached max reconnect attempts, set an error
          if (reconnectAttempts >= maxReconnectAttempts) {
            setConnectionError(new Error(`WebSocket disconnected after ${maxReconnectAttempts} reconnect attempts`));
          }
        });
        
        const unsubscribeError = client.addEventListener('error', (error) => {
          if (unmounted) return;
          
          console.error('WebSocket error:', error);
          setConnectionError(new Error(typeof error === 'string' ? error : 'WebSocket connection error'));
          
          // Increment reconnect attempts
          setReconnectAttempts(prev => prev + 1);
          
          // If we haven't reached max reconnect attempts, try again
          if (reconnectAttempts < maxReconnectAttempts) {
            setTimeout(() => {
              if (!unmounted && clientRef.current) {
                clientRef.current.connect();
              }
            }, 2000); // Wait 2 seconds before reconnecting
          }
        });
        
        // Connect to WebSocket
        client.connect();
        
        // Clean up function
        return () => {
          unsubscribeUpdate();
          unsubscribeOpen();
          unsubscribeClose();
          unsubscribeError();
          
          if (clientRef.current) {
            clientRef.current.disconnect();
            clientRef.current = null;
          }
        };
      } catch (err) {
        console.error('Error creating WebSocket client:', err);
        setConnectionError(err instanceof Error ? err : new Error('Failed to create WebSocket client'));
        return () => {};
      }
    };
    
    const cleanup = connectWebSocket();
    
    return () => {
      unmounted = true;
      cleanup();
    };
  }, [simulationId, reconnectAttempts]);

  // Function to manually reconnect
  const reconnect = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.disconnect();
      setTimeout(() => {
        if (clientRef.current) {
          clientRef.current.connect();
        }
      }, 1000);
    }
  }, []);

  // Make reconnect function globally available
  useEffect(() => {
    window.reconnectVisualizationWebsocket = reconnect;
    
    return () => {
      window.reconnectVisualizationWebsocket = undefined;
    };
  }, [reconnect]);

  // Function to send parameter updates
  const sendParameterUpdate = useCallback((parameters: Record<string, any>) => {
    if (clientRef.current && clientRef.current.isConnected) {
      try {
        clientRef.current.sendParameterUpdate(parameters);
        return true;
      } catch (err) {
        console.error('Error sending parameter update:', err);
        return false;
      }
    }
    return false;
  }, []);

  // Function to send control commands
  const sendControlCommand = useCallback((command: ControlCommand) => {
    if (clientRef.current && clientRef.current.isConnected) {
      try {
        clientRef.current.sendControlCommand(command);
        return true;
      } catch (err) {
        console.error('Error sending control command:', err);
        return false;
      }
    }
    return false;
  }, []);

  return { 
    simulationUpdates, 
    lastMessage, 
    isConnected, 
    connectionError, 
    reconnectAttempts,
    reconnect,
    sendParameterUpdate,
    sendControlCommand
  };
} 