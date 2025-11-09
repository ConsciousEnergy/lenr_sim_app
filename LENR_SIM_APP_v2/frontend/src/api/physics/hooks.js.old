import { useState, useEffect, useCallback, useRef } from 'react';
import { simulationApi } from '../simulation';

/**
 * Hook for connecting to the physics data WebSocket stream
 * @param {string|null} simulationId - The ID of the simulation to connect to
 * @returns {Object} The connection state and data
 */
export const usePhysicsWebSocket = (simulationId) => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [lastMessage, setLastMessage] = useState(null);
  const [simulationUpdates, setSimulationUpdates] = useState([]);
  const socketRef = useRef(null);
  
  useEffect(() => {
    if (!simulationId) {
      setIsConnected(false);
      setConnectionStatus('disconnected');
      return;
    }
    
    // Create WebSocket connection
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/api/ws/simulation/${simulationId}`;
    
    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;
    
    // Connection opened
    socket.addEventListener('open', () => {
      setIsConnected(true);
      setConnectionStatus('connected');
      console.log('WebSocket Connected to', wsUrl);
    });
    
    // Listen for messages
    socket.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data);
        setLastMessage(data);
        
        if (data.type === 'simulation_update') {
          setSimulationUpdates(prev => [...prev, data]);
        }
      } catch (err) {
        console.error('Error parsing WebSocket message:', err);
      }
    });
    
    // Connection closed
    socket.addEventListener('close', () => {
      setIsConnected(false);
      setConnectionStatus('disconnected');
      console.log('WebSocket Disconnected');
    });
    
    // Connection error
    socket.addEventListener('error', (error) => {
      setIsConnected(false);
      setConnectionStatus('error');
      console.error('WebSocket Error:', error);
    });
    
    // Clean up on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [simulationId]);
  
  // Function to reconnect
  const reconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    
    if (simulationId) {
      // Trigger useEffect to create a new connection
      setConnectionStatus('reconnecting');
    }
  }, [simulationId]);
  
  return {
    isConnected,
    connectionStatus,
    lastMessage,
    simulationUpdates,
    reconnect
  };
};

/**
 * Hook for fetching simulation results
 * @param {string|null} simulationId - The ID of the simulation to fetch
 * @returns {Object} The simulation results and loading state
 */
export const useSimulationResults = (simulationId) => {
  const [results, setResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    if (!simulationId) {
      setResults(null);
      return;
    }
    
    const fetchResults = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const data = await simulationApi.getSimulationResults(simulationId);
        setResults(data);
      } catch (err) {
        console.error('Error fetching simulation results:', err);
        setError(err.message || 'Failed to fetch simulation results');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchResults();
  }, [simulationId]);
  
  return { results, isLoading, error };
};

/**
 * Combined hook for physics data streaming and state management
 * @param {string|null} simulationId - The ID of the simulation
 * @returns {Object} Combined physics data state
 */
export const usePhysicsDataStream = (simulationId) => {
  // Get WebSocket connection and updates
  const { 
    isConnected, 
    connectionStatus, 
    lastMessage, 
    simulationUpdates, 
    reconnect 
  } = usePhysicsWebSocket(simulationId);
  
  // Get initial simulation data
  const { results, isLoading, error } = useSimulationResults(simulationId);
  
  // Combined state for lattice and simulation data
  const [latticeState, setLatticeState] = useState(null);
  const [simulationSummary, setSimulationSummary] = useState(null);
  
  // Update state when new data arrives via WebSocket
  useEffect(() => {
    if (lastMessage && lastMessage.type === 'simulation_update') {
      if (lastMessage.lattice) {
        setLatticeState(lastMessage.lattice);
      }
      if (lastMessage.summary) {
        setSimulationSummary(lastMessage.summary);
      }
    }
  }, [lastMessage]);
  
  // Initialize state from REST API results
  useEffect(() => {
    if (results) {
      if (results.lattice) {
        setLatticeState(results.lattice);
      }
      if (results.summary) {
        setSimulationSummary(results.summary);
      }
    }
  }, [results]);
  
  return {
    isConnected,
    connectionStatus,
    reconnect,
    isLoading,
    error,
    latticeState,
    simulationSummary,
    lastMessage,
    simulationUpdates
  };
}; 