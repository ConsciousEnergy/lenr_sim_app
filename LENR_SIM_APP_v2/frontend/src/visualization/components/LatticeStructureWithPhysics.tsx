import { useState, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { usePhysicsWebSocket, useSimulationResults } from '../../api/physics/hooks';
import LatticeStructure, { LatticeData, VisualizationMode, ColorMapFunction } from './LatticeStructure';
import PhysicsVisualEffects from './PhysicsVisualEffects';
import ColorLegend from './ColorLegend';
import { SimulationUpdateMessage, LatticeState, LatticePoint as PhysicsLatticePoint } from '../../api/physics/types';
import { ColorMap, getColorFromMap, getDefaultColorMapForType, colorMaps } from '../utils/colorMaps';

// Property types for the enhanced component
export interface LatticeStructureWithPhysicsProps {
  simulationId: string | null;
  width?: number;
  height?: number;
  mode?: VisualizationMode;
  visualizationType?: 'temperature' | 'energy' | 'reaction_rate';
  colorMapName?: string;
  showLegend?: boolean;
  showParticleMovement?: boolean;
  showWaveAnimations?: boolean;
  visualEffectsIntensity?: number;
  autoRotate?: boolean;
  refreshInterval?: number;
  performanceMode?: 'auto' | 'low' | 'medium' | 'high';
  simplifyLargeDatasets?: boolean;
}

/**
 * Enhanced lattice structure component that visualizes physics simulation data
 */
const LatticeStructureWithPhysics: React.FC<LatticeStructureWithPhysicsProps> = ({
  simulationId,
  width = 800,
  height = 600,
  mode = 'solid',
  visualizationType = 'energy',
  colorMapName,
  showLegend = true,
  showParticleMovement = true,
  showWaveAnimations = true,
  visualEffectsIntensity = 1.0,
  autoRotate = false,
  refreshInterval = 1000,
  performanceMode = 'auto',
  simplifyLargeDatasets = true
}) => {
  // Reference to the ThreeJS scene
  const sceneRef = useRef<THREE.Scene | null>(null);
  
  // State for lattice data transformed from physics data
  const [latticeData, setLatticeData] = useState<LatticeData | null>(null);
  
  // State for visualization data ranges
  const [dataRange, setDataRange] = useState<{ min: number; max: number; avg: number }>({
    min: 0,
    max: 1,
    avg: 0.5
  });
  
  // Connect to WebSocket for real-time updates
  const { 
    simulationUpdates, 
    lastMessage,
    isConnected 
  } = usePhysicsWebSocket(simulationId);
  
  // Fetch initial data
  const { results, isLoading } = useSimulationResults(simulationId);

  // Store the latest simulation update message for visual effects
  const [currentSimulationData, setCurrentSimulationData] = useState<SimulationUpdateMessage | null>(null);

  // Determine the active color map
  const activeColorMap = useMemo<ColorMap>(() => {
    // Prefer the named map if provided and valid
    if (colorMapName && colorMaps[colorMapName]) {
      return colorMaps[colorMapName];
    }
    // Otherwise, use the default for the visualization type
    return getDefaultColorMapForType(visualizationType);
  }, [visualizationType, colorMapName]);

  // Create a color mapping function to pass to LatticeStructure
  const colorMapFunction: ColorMapFunction = useMemo(() => {
    // Use the helper from the utility
    return (value: number, min: number, max: number) => {
      return getColorFromMap(value, min, max, activeColorMap);
    };
  }, [activeColorMap]);

  // Transform physics lattice data to the format needed for visualization
  const transformPhysicsData = (data: LatticeState): LatticeData => {
    // Extract data values based on visualization type
    const dataValues = data.points.map(point => 
      visualizationType === 'temperature' 
        ? point.temperature 
        : visualizationType === 'energy' 
          ? point.energy 
          : point.reaction_rate
    );
    
    // Calculate data range for color mapping
    const min = Math.min(...dataValues);
    const max = Math.max(...dataValues);
    const avg = dataValues.reduce((sum, val) => sum + val, 0) / dataValues.length;
    
    setDataRange({ min, max, avg });
    
    // Transform lattice points
    const transformedPoints = data.points.map((point: PhysicsLatticePoint) => ({
      position: point.position,
      element: point.element,
      occupancy: 1.0, // Default value
      energy: visualizationType === 'energy' 
        ? point.energy 
        : visualizationType === 'temperature' 
          ? point.temperature 
          : point.reaction_rate
    }));
    
    // Return the transformed data
    return {
      points: transformedPoints,
      connections: data.connections,
      latticeConstants: data.dimensions.map(d => d * 3) as [number, number, number], // Scale for visualization
      unitCell: 'fcc' // Default to FCC, could be updated if that data is available
    };
  };

  // Handler for when the ThreeJS scene is ready
  const handleSceneReady = (scene: THREE.Scene) => {
    sceneRef.current = scene;
    
    // Add ambient light for better visualization
    const ambientLight = new THREE.AmbientLight(0x404040, 1.5);
    scene.add(ambientLight);
    
    // Add directional light for shadows and highlights
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 10, 7.5);
    scene.add(directionalLight);
    
    // If we have data already, update it
    if (lastMessage && lastMessage.type === 'simulation_update') {
      setCurrentSimulationData(lastMessage as SimulationUpdateMessage);
    }
  };

  // Process initial data load
  useEffect(() => {
    if (results && results.lattice) {
      const transformedData = transformPhysicsData(results.lattice);
      setLatticeData(transformedData);
      
      // Create a simulation update message from results for visual effects
      const simulationData: SimulationUpdateMessage = {
        type: 'simulation_update',
        simulation_id: results.simulation_id,
        step: results.step,
        time: results.time,
        lattice: results.lattice,
        summary: results.summary,
        timestamp: Date.now()
      };
      
      setCurrentSimulationData(simulationData);
    }
  }, [results, visualizationType]);
  
  // Process WebSocket updates
  useEffect(() => {
    if (lastMessage && lastMessage.type === 'simulation_update') {
      const update = lastMessage as SimulationUpdateMessage;
      setCurrentSimulationData(update);
      
      if (update.lattice) {
        const transformedData = transformPhysicsData(update.lattice);
        setLatticeData(transformedData);
      }
    }
  }, [lastMessage, visualizationType]);

  // Determine if we need to optimize rendering based on data size and performance mode
  const [shouldOptimizeRendering, setShouldOptimizeRendering] = useState(false);
  const [optimizationLevel, setOptimizationLevel] = useState<'none' | 'low' | 'medium' | 'high'>('none');
  const [frameSkip, setFrameSkip] = useState(0);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [isErrorRecovery, setIsErrorRecovery] = useState(false);

  // Adjust optimization settings when data or performance mode changes
  useEffect(() => {
    if (!latticeData) {
      setShouldOptimizeRendering(false);
      return;
    }
    
    // Error recovery logic - if we've had errors but now have data
    if (loadingError && isErrorRecovery) {
      setLoadingError(null);
      setIsErrorRecovery(false);
    }
    
    const pointCount = latticeData.points.length;
    const connectionCount = latticeData.connections.length;
    const totalElements = pointCount + connectionCount;
    
    // Determine performance settings based on dataset size and performance mode
    if (performanceMode === 'high' || (performanceMode === 'auto' && totalElements > 5000)) {
      setShouldOptimizeRendering(true);
      setFrameSkip(3);
      setOptimizationLevel('high');
    } else if (performanceMode === 'medium' || (performanceMode === 'auto' && totalElements > 2000)) {
      setShouldOptimizeRendering(true);
      setFrameSkip(2);
      setOptimizationLevel('medium');
    } else if (performanceMode === 'low' || (performanceMode === 'auto' && totalElements > 1000)) {
      setShouldOptimizeRendering(true);
      setFrameSkip(1);
      setOptimizationLevel('low');
    } else {
      setShouldOptimizeRendering(false);
      setFrameSkip(0);
      setOptimizationLevel('none');
    }
  }, [latticeData, performanceMode, loadingError, isErrorRecovery]);

  // Error handling for data loading
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    // If we should have data but don't after a timeout, show an error
    if (simulationId && !latticeData && !isLoading) {
      timeoutId = setTimeout(() => {
        if (!latticeData) {
          console.error('Failed to load lattice data after timeout');
          setLoadingError('Failed to load visualization data. The simulation may not have generated valid lattice data yet.');
        }
      }, 10000); // 10 second timeout
    }
    
    // If we've previously had an error, try to recover by setting recovery flag
    if (loadingError && simulationId) {
      setIsErrorRecovery(true);
    }
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [simulationId, latticeData, isLoading, loadingError]);

  // Fallback for manual retry
  const handleRetry = () => {
    setLoadingError(null);
    setIsErrorRecovery(true);
    
    // If we have access to the websocket hook's reconnect function
    if (window.reconnectVisualizationWebsocket && typeof window.reconnectVisualizationWebsocket === 'function') {
      window.reconnectVisualizationWebsocket();
    }
  };

  // Render the component
  if (loadingError) {
    return (
      <div 
        style={{ 
          width, 
          height, 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          justifyContent: 'center',
          backgroundColor: '#1a1a1a',
          color: '#ffffff',
          padding: 20,
          borderRadius: 8
        }}
      >
        <div style={{ marginBottom: 16, textAlign: 'center' }}>
          {loadingError}
        </div>
        <button 
          onClick={handleRetry}
          style={{
            backgroundColor: '#4a90e2',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: 4,
            cursor: 'pointer',
            fontSize: 14
          }}
        >
          Retry Loading
        </button>
      </div>
    );
  }

  if (!latticeData) {
    return (
      <div 
        style={{ 
          width, 
          height, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          backgroundColor: '#1a1a1a',
          color: '#ffffff'
        }}
      >
        {isLoading ? 'Loading simulation data...' : 'No simulation data available'}
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width, height }}>
      <LatticeStructure
        width={width}
        height={height}
        data={latticeData}
        mode={mode}
        highlightEnergy={true}
        showUnitCell={true}
        onSceneReady={handleSceneReady}
        colorMapFunction={colorMapFunction}
        optimizationLevel={simplifyLargeDatasets ? optimizationLevel : 'none'}
      />
      
      {sceneRef.current && currentSimulationData && (
        <PhysicsVisualEffects 
          scene={sceneRef.current}
          simulationData={currentSimulationData}
          visualizationType={visualizationType}
          showParticleMovement={showParticleMovement}
          showWaveAnimations={showWaveAnimations}
          intensity={visualEffectsIntensity}
        />
      )}
      
      {showLegend && activeColorMap && (
        <ColorLegend 
          min={dataRange.min}
          max={dataRange.max}
          visualizationType={visualizationType}
          colorMapName={activeColorMap.name}
        />
      )}

      {currentSimulationData && showParticleMovement && (
        <div style={{ position: 'absolute', bottom: 10, left: 10, background: 'rgba(0, 0, 0, 0.5)', color: 'white', padding: '4px 8px', borderRadius: 4, fontSize: 12 }}>
          {shouldOptimizeRendering ? `Performance Mode: ${optimizationLevel}` : 'Standard Rendering'}
        </div>
      )}
    </div>
  );
};

export default LatticeStructureWithPhysics; 