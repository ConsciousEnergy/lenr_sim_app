import { useState, useEffect, useCallback } from 'react';
import { usePhysicsWebSocket, useSimulationResults } from '../../api/physics/hooks';
import { transformPhysicsToLattice, transformPhysicsToMHDFluid, calculateDataRange } from '../utils/dataTransformers';
import { SimulationUpdateMessage, SimulationResultsResponse } from '../../api/physics/types';
import { LatticeData } from '../components/LatticeStructure';

export type VisualizationType = 'temperature' | 'energy' | 'reaction_rate';

interface UsePhysicsVisualizationOptions {
  visualizationType?: VisualizationType;
  refreshInterval?: number;
  initialDataStep?: number;
}

interface PhysicsVisualizationData {
  latticeData: LatticeData | null;
  mhdData: any | null;
  isLoading: boolean;
  error: Error | null;
  lastUpdate: SimulationUpdateMessage | null;
  dataRange: {
    min: number;
    max: number;
    avg: number;
  };
  isConnected: boolean;
  reconnect: () => void;
}

// Type that combines both WebSocket message and API response types to handle both data sources
type PhysicsData = (SimulationUpdateMessage | SimulationResultsResponse) & {
  lattice?: any;
  step?: number;
  time?: number;
};

/**
 * Custom hook for connecting physics data to Three.js visualizations
 * @param simulationId ID of the simulation to visualize
 * @param options Configuration options
 * @returns Visualization data and connection status
 */
export function usePhysicsVisualization(
  simulationId: string | null,
  options: UsePhysicsVisualizationOptions = {}
): PhysicsVisualizationData {
  // Set default options
  const {
    visualizationType = 'energy',
    refreshInterval = 1000,
    initialDataStep
  } = options;

  // State for transformed data
  const [latticeData, setLatticeData] = useState<LatticeData | null>(null);
  const [mhdData, setMhdData] = useState<any | null>(null);
  const [dataRange, setDataRange] = useState({ min: 0, max: 1, avg: 0.5 });
  const [error, setError] = useState<Error | null>(null);

  // Connect to WebSocket for real-time updates
  const {
    simulationUpdates,
    lastMessage,
    isConnected,
    connectionError,
    reconnect
  } = usePhysicsWebSocket(simulationId);

  // Get initial data from API
  const {
    results: initialResults,
    isLoading: isLoadingResults,
    error: initialDataError
  } = useSimulationResults(simulationId, { step: initialDataStep });

  // Update data when receiving WebSocket updates or initial data
  useEffect(() => {
    // Use the last WebSocket message if available, otherwise use initial data
    const data: PhysicsData | null = lastMessage?.type === 'simulation_update' 
      ? lastMessage as SimulationUpdateMessage
      : initialResults;
    
    if (!data) return;

    try {
      // Transform data for lattice visualization
      const newLatticeData = transformPhysicsToLattice(data as any, visualizationType);
      setLatticeData(newLatticeData);

      // Transform data for MHD/fluid visualization
      const newMhdData = transformPhysicsToMHDFluid(data as any);
      setMhdData(newMhdData);

      // Calculate data range for the selected visualization type
      if (data.lattice?.points) {
        const values = data.lattice.points.map(point => {
          if (visualizationType === 'temperature') return point.temperature;
          if (visualizationType === 'reaction_rate') return point.reaction_rate;
          return point.energy;
        });
        
        setDataRange(calculateDataRange(values));
      }
    } catch (err) {
      console.error('Error transforming physics data for visualization:', err);
      setError(err instanceof Error ? err : new Error('Data transformation failed'));
    }
  }, [lastMessage, initialResults, visualizationType]);

  // Handle errors
  useEffect(() => {
    if (connectionError) {
      setError(connectionError);
    } else if (initialDataError) {
      setError(initialDataError);
    }
  }, [connectionError, initialDataError]);

  // Return the visualization data and status
  return {
    latticeData,
    mhdData,
    isLoading: isLoadingResults && !latticeData && !mhdData,
    error,
    lastUpdate: lastMessage?.type === 'simulation_update' 
      ? lastMessage as SimulationUpdateMessage 
      : null,
    dataRange,
    isConnected,
    reconnect
  };
} 