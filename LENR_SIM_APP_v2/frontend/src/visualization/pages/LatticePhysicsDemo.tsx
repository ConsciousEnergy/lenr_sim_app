import { useState, useEffect } from 'react';
import LatticeStructureWithPhysics from '../components/LatticeStructureWithPhysics';
import { useInitializeSimulation, useSimulationControl } from '../../api/physics/hooks';
import { SimulationInitializeRequest } from '../../api/physics/types';
import { VisualizationMode } from '../components/LatticeStructure';

// Sample simulation configuration
const defaultSimulationConfig: SimulationInitializeRequest = {
  models: [
    {
      model_type: 'quantum_tunneling',
      parameters: {
        barrier_width: 1e-10,
        screening_potential: 100
      }
    },
    {
      model_type: 'electron_screening',
      parameters: {
        density: 1e22,
        temperature: 300
      }
    }
  ],
  lattice: {
    type: 'fcc',
    dimensions: [5, 5, 5],
    constants: [3.89e-10, 3.89e-10, 3.89e-10],
    elements: [
      // Will be generated programmatically
    ]
  },
  conditions: {
    temperature: 300,
    pressure: 101325, // 1 atm
    electric_field: [0, 0, 1e5]
  },
  simulation_parameters: {
    time_step: 1e-15,
    total_steps: 1000,
    save_frequency: 10
  }
};

// Function to generate random lattice elements
const generateLatticeElements = (dimensions: [number, number, number]) => {
  const [nx, ny, nz] = dimensions;
  const elements = [];
  
  // Create a 3D FCC lattice
  for (let x = 0; x < nx; x++) {
    for (let y = 0; y < ny; y++) {
      for (let z = 0; z < nz; z++) {
        // Add corner atoms
        elements.push({
          symbol: 'Pd',
          position: [x, y, z],
          occupancy: 1.0
        });
        
        // Add face-centered atoms
        if (x < nx - 1 && y < ny - 1) {
          elements.push({
            symbol: 'Pd',
            position: [x + 0.5, y + 0.5, z],
            occupancy: 1.0
          });
        }
        
        if (x < nx - 1 && z < nz - 1) {
          elements.push({
            symbol: 'Pd',
            position: [x + 0.5, y, z + 0.5],
            occupancy: 1.0
          });
        }
        
        if (y < ny - 1 && z < nz - 1) {
          elements.push({
            symbol: 'Pd',
            position: [x, y + 0.5, z + 0.5],
            occupancy: 1.0
          });
        }
      }
    }
  }
  
  // Add deuterium at octahedral sites with 80% loading
  for (let i = 0; i < elements.length; i++) {
    if (Math.random() < 0.8) {
      const basePos = elements[i].position;
      elements.push({
        symbol: 'D',
        position: [
          basePos[0] + (Math.random() * 0.2 - 0.1),
          basePos[1] + (Math.random() * 0.2 - 0.1),
          basePos[2] + (Math.random() * 0.2 - 0.1)
        ],
        occupancy: 0.8
      });
    }
  }
  
  return elements;
};

const LatticePhysicsDemo: React.FC = () => {
  const [simulationId, setSimulationId] = useState<string | null>(null);
  const [visualizationType, setVisualizationType] = useState<'temperature' | 'energy' | 'reaction_rate'>('energy');
  const [viewMode, setViewMode] = useState<VisualizationMode>('solid');
  const [showParticleMovement, setShowParticleMovement] = useState(true);
  const [showWaveAnimations, setShowWaveAnimations] = useState(true);
  const [effectsIntensity, setEffectsIntensity] = useState(1.0);
  
  // Hooks for simulation control
  const { initializeSimulation, isLoading: isInitializing } = useInitializeSimulation();
  const { 
    startSimulation, 
    pauseSimulation, 
    resumeSimulation,
    resetSimulation,
    isLoading: isControlLoading,
    status 
  } = useSimulationControl(simulationId);
  
  // Initialize simulation on component mount
  useEffect(() => {
    const initSimulation = async () => {
      try {
        // Generate lattice elements
        const config = { ...defaultSimulationConfig };
        config.lattice.elements = generateLatticeElements(config.lattice.dimensions);
        
        // Initialize the simulation
        const response = await initializeSimulation(config);
        setSimulationId(response.simulation_id);
        
        // Auto-start the simulation
        setTimeout(() => {
          if (response.simulation_id) {
            startSimulation();
          }
        }, 500);
      } catch (error) {
        console.error('Failed to initialize simulation:', error);
      }
    };
    
    initSimulation();
    
    // Cleanup on unmount
    return () => {
      // No need to explicitly cleanup as the WebSocket connection
      // will be closed when the hook unmounts
    };
  }, []);
  
  return (
    <div className="p-4 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Lattice Physics Visualization</h1>
      
      <div className="mb-6 flex flex-wrap gap-4">
        <div className="p-4 bg-gray-100 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-2">Simulation Controls</h2>
          
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => startSimulation()}
              disabled={isControlLoading || status === 'running' || !simulationId}
              className="px-3 py-1 bg-green-600 text-white rounded disabled:opacity-50"
            >
              Start
            </button>
            
            <button
              onClick={() => pauseSimulation()}
              disabled={isControlLoading || status !== 'running' || !simulationId}
              className="px-3 py-1 bg-yellow-600 text-white rounded disabled:opacity-50"
            >
              Pause
            </button>
            
            <button
              onClick={() => resumeSimulation()}
              disabled={isControlLoading || status !== 'paused' || !simulationId}
              className="px-3 py-1 bg-blue-600 text-white rounded disabled:opacity-50"
            >
              Resume
            </button>
            
            <button
              onClick={() => resetSimulation()}
              disabled={isControlLoading || !simulationId}
              className="px-3 py-1 bg-red-600 text-white rounded disabled:opacity-50"
            >
              Reset
            </button>
          </div>
          
          <div className="text-sm">
            Status: <span className="font-mono">{status || 'Initializing...'}</span>
          </div>
        </div>
        
        <div className="p-4 bg-gray-100 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-2">Visualization Settings</h2>
          
          <div className="flex flex-col gap-2">
            <div>
              <label className="block text-sm font-medium mb-1">
                Data Type
              </label>
              <select
                value={visualizationType}
                onChange={(e) => setVisualizationType(e.target.value as any)}
                className="w-full p-2 border rounded"
              >
                <option value="temperature">Temperature</option>
                <option value="energy">Energy</option>
                <option value="reaction_rate">Reaction Rate</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">
                View Mode
              </label>
              <select
                value={viewMode}
                onChange={(e) => setViewMode(e.target.value as VisualizationMode)}
                className="w-full p-2 border rounded"
              >
                <option value="solid">Solid</option>
                <option value="wireframe">Wireframe</option>
                <option value="points">Points</option>
              </select>
            </div>
            
            <div>
              <label className="flex items-center gap-2 text-sm font-medium mb-1">
                <input
                  type="checkbox"
                  checked={showParticleMovement}
                  onChange={(e) => setShowParticleMovement(e.target.checked)}
                  className="form-checkbox h-4 w-4"
                />
                Show Particle Movement
              </label>
            </div>
            
            <div>
              <label className="flex items-center gap-2 text-sm font-medium mb-1">
                <input
                  type="checkbox"
                  checked={showWaveAnimations}
                  onChange={(e) => setShowWaveAnimations(e.target.checked)}
                  className="form-checkbox h-4 w-4"
                />
                Show Wave Animations
              </label>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">
                Effects Intensity
              </label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={effectsIntensity}
                onChange={(e) => setEffectsIntensity(parseFloat(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs">
                <span>Low</span>
                <span>Medium</span>
                <span>High</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="rounded-lg overflow-hidden border border-gray-300 shadow-lg">
        {simulationId ? (
          <LatticeStructureWithPhysics
            simulationId={simulationId}
            width={800}
            height={600}
            mode={viewMode}
            visualizationType={visualizationType}
            showLegend={true}
            showParticleMovement={showParticleMovement}
            showWaveAnimations={showWaveAnimations}
            visualEffectsIntensity={effectsIntensity}
            autoRotate={true}
          />
        ) : (
          <div 
            className="w-[800px] h-[600px] flex items-center justify-center bg-gray-800 text-white"
          >
            {isInitializing ? 'Initializing simulation...' : 'Failed to initialize simulation'}
          </div>
        )}
      </div>
      
      <div className="mt-4 p-4 bg-gray-100 rounded text-sm">
        <h3 className="font-semibold mb-2">Visualization Information</h3>
        <p>
          This visualization shows a Palladium FCC lattice with Deuterium loading. 
          The color mapping represents {
            visualizationType === 'temperature' ? 'temperature distribution' : 
            visualizationType === 'energy' ? 'energy levels' : 
            'reaction rates'
          } within the lattice.
        </p>
      </div>
    </div>
  );
};

export default LatticePhysicsDemo; 