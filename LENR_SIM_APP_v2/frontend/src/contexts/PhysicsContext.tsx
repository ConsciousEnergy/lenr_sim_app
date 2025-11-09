import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { SimulationUpdateMessage, LatticeState } from '../api/physics/types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
const WS_BASE_URL = API_BASE_URL.replace(/^http/, 'ws');

export interface PhysicsContextType {
  simulationState: SimulationUpdateMessage | null;
  latticeState: LatticeState | null;
  isConnected: boolean;
  isSimulating: boolean;
  parameters: Record<string, number | string>;
  setParameters: (params: Record<string, number | string>) => void;
  startSimulation: (params: Record<string, number | string>) => Promise<void>;
  stopSimulation: () => Promise<void>;
  connectWebSocket: (simulationId: string) => void;
  disconnectWebSocket: () => void;
}

export const PhysicsContext = createContext<PhysicsContextType | undefined>(undefined);

export interface PhysicsProviderProps {
  children: ReactNode;
}

export const PhysicsProvider: React.FC<PhysicsProviderProps> = ({ children }) => {
  const [simulationState, setSimulationState] = useState<SimulationUpdateMessage | null>(null);
  const [latticeState, setLatticeState] = useState<LatticeState | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [parameters, setParameters] = useState<Record<string, number | string>>({});
  const [ws, setWs] = useState<WebSocket | null>(null);

  const connectWebSocket = (simulationId: string) => {
    if (ws) {
      ws.close();
    }

    const websocket = new WebSocket(`${WS_BASE_URL}/api/physics/simulate/${simulationId}`);
    
    websocket.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
    };

    websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'simulation_update') {
          setSimulationState(data);
        } else if (data.type === 'lattice_update') {
          setLatticeState(data);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    };

    websocket.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
      setIsSimulating(false);
    };

    setWs(websocket);
  };

  const disconnectWebSocket = () => {
    if (ws) {
      ws.close();
      setWs(null);
      setIsConnected(false);
    }
  };

  const startSimulation = async (params: Record<string, number | string>) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/physics/simulate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        throw new Error(`Failed to start simulation: ${response.statusText}`);
      }

      const data = await response.json();
      setIsSimulating(true);
      setParameters(params);
      
      // Connect to WebSocket for real-time updates
      if (data.simulation_id) {
        connectWebSocket(data.simulation_id);
      }

      return data;
    } catch (error) {
      console.error('Error starting simulation:', error);
      throw error;
    }
  };

  const stopSimulation = async () => {
    try {
      disconnectWebSocket();
      setIsSimulating(false);
      setSimulationState(null);
      setLatticeState(null);
    } catch (error) {
      console.error('Error stopping simulation:', error);
      throw error;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnectWebSocket();
    };
  }, []);

  const value: PhysicsContextType = {
    simulationState,
    latticeState,
    isConnected,
    isSimulating,
    parameters,
    setParameters,
    startSimulation,
    stopSimulation,
    connectWebSocket,
    disconnectWebSocket,
  };

  return (
    <PhysicsContext.Provider value={value}>
      {children}
    </PhysicsContext.Provider>
  );
};

export const usePhysics = () => {
  const context = useContext(PhysicsContext);
  
  if (context === undefined) {
    throw new Error('usePhysics must be used within a PhysicsProvider');
  }
  
  return context;
};
