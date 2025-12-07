/**
 * Physics Engine Mock Server
 * 
 * This module provides a mock implementation of the Physics Engine API server
 * for development and testing purposes.
 */

import {
  SimulationInitializeRequest,
  SimulationInitializeResponse,
  SimulationControlResponse,
  ParameterUpdateRequest,
  ParameterUpdateResponse,
  SnapshotRequest,
  SnapshotResponse,
  SnapshotListResponse,
  SimulationStatusResponse,
  SimulationResultsResponse,
  WebSocketMessage,
  LatticeState,
  SimulationSummary,
  SimulationStatus,
  SimulationSnapshot
} from './types';

// Store for simulation data
interface SimulationStore {
  [id: string]: {
    config: SimulationInitializeRequest;
    status: SimulationStatus;
    currentStep: number;
    totalSteps: number;
    startTime?: number;
    pauseTime?: number;
    elapsedTime: number;
    snapshots: Array<{
      id: string;
      name?: string;
      description?: string;
      state: any;
      createdAt: string;
    }>;
    currentLattice: LatticeState;
    currentSummary: SimulationSummary;
    webSocketClients: Set<WebSocket>;
    updateIntervalId?: NodeJS.Timeout;
  };
}

// Mock data store
const simulations: SimulationStore = {};

// Generate a random ID
function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Get current timestamp as ISO string
function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

// Generate mock lattice data based on simulation config
function generateMockLattice(config: SimulationInitializeRequest): LatticeState {
  const { lattice } = config;
  const [width, height, depth] = lattice.dimensions;
  
  const points = [];
  const connections = [];
  
  // Generate points
  for (let i = 0; i < width; i++) {
    for (let j = 0; j < height; j++) {
      for (let k = 0; k < depth; k++) {
        if (Math.random() > 0.7) { // Only generate some points for performance
          const element = lattice.elements[Math.floor(Math.random() * lattice.elements.length)];
          points.push({
            position: [i, j, k] as [number, number, number],
            element: element.symbol,
            energy: Math.random() * 2,
            temperature: config.conditions.temperature * (0.9 + Math.random() * 0.2),
            reaction_rate: Math.random() * 0.1
          });
        }
      }
    }
  }
  
  // Generate some random connections between points
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      if (Math.random() > 0.95) {
        connections.push([i, j] as [number, number]);
      }
    }
  }
  
  return {
    dimensions: lattice.dimensions,
    points,
    connections
  };
}

// Generate mock simulation summary
function generateMockSummary(config: SimulationInitializeRequest, step: number): SimulationSummary {
  return {
    average_temperature: config.conditions.temperature * (0.9 + Math.random() * 0.2),
    total_energy: 1000 * Math.random() * (1 + step / 100),
    reaction_counts: {
      'fusion': Math.floor(step / 10),
      'decay': Math.floor(step / 5),
      'capture': Math.floor(step / 7)
    }
  };
}

// Update simulation state
function updateSimulation(id: string) {
  const simulation = simulations[id];
  if (!simulation || simulation.status !== 'running') return;
  
  // Process multiple steps per update for faster completion
  const stepsPerUpdate = Math.max(1, Math.ceil(simulation.totalSteps / 10));
  simulation.currentStep += stepsPerUpdate;
  
  const currentTime = Date.now();
  const elapsedSinceStart = currentTime - (simulation.startTime || currentTime);
  simulation.elapsedTime += elapsedSinceStart / 1000;
  simulation.startTime = currentTime;
  
  // Update lattice and summary
  const numPoints = simulation.currentLattice.points.length;
  // Modify a subset of points to simulate changes
  for (let i = 0; i < numPoints; i++) {
    if (Math.random() > 0.9) {
      const point = simulation.currentLattice.points[i];
      point.energy += (Math.random() - 0.5) * 0.1;
      point.temperature += (Math.random() - 0.5) * 2;
      point.reaction_rate = Math.max(0, point.reaction_rate + (Math.random() - 0.5) * 0.01);
    }
  }
  
  // Update summary
  simulation.currentSummary = generateMockSummary(simulation.config, simulation.currentStep);
  
  // Check if simulation is complete
  if (simulation.currentStep >= simulation.totalSteps) {
    simulation.status = 'completed';
    clearInterval(simulation.updateIntervalId);
    simulation.updateIntervalId = undefined;
  }
  
  // Send updates to all connected clients
  broadcastUpdate(id);
}

// Broadcast update to all connected WebSocket clients
function broadcastUpdate(id: string) {
  const simulation = simulations[id];
  if (!simulation) return;
  
  const message: WebSocketMessage = {
    type: 'simulation_update',
    simulation_id: id,
    step: simulation.currentStep,
    time: simulation.elapsedTime,
    lattice: simulation.currentLattice,
    summary: simulation.currentSummary,
    timestamp: Date.now(),
    data: null
  };
  
  const messageString = JSON.stringify(message);
  
  simulation.webSocketClients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(messageString);
    }
  });
}

/**
 * Mock implementation of the Physics API server
 */
export const mockPhysicsServer = {
  /**
   * Initialize a new simulation
   */
  initializeSimulation(request: SimulationInitializeRequest): SimulationInitializeResponse {
    const id = request.simulation_id || generateId();
    const initializedAt = getCurrentTimestamp();
    
    // Create initial lattice state
    const latticeState = generateMockLattice(request);
    
    // Create initial summary
    const summary = generateMockSummary(request, 0);
    
    // Store the simulation
    simulations[id] = {
      config: request,
      status: 'initialized',
      currentStep: 0,
      totalSteps: request.simulation_parameters.total_steps,
      elapsedTime: 0,
      snapshots: [],
      currentLattice: latticeState,
      currentSummary: summary,
      webSocketClients: new Set()
    };
    
    return {
      simulation_id: id,
      status: 'initialized',
      websocket_url: `ws://localhost:8000/api/ws/physics/${id}`,
      models: request.models.map(m => m.model_type),
      initialized_at: initializedAt
    };
  },
  
  /**
   * Start a simulation
   */
  startSimulation(id: string): SimulationControlResponse {
    const simulation = simulations[id];
    if (!simulation) throw new Error(`Simulation ${id} not found`);
    
    simulation.status = 'running';
    simulation.startTime = Date.now();
    
    // Start periodic updates (faster interval for responsive development)
    if (!simulation.updateIntervalId) {
      simulation.updateIntervalId = setInterval(() => updateSimulation(id), 200);
    }
    
    return {
      simulation_id: id,
      status: 'running',
      started_at: getCurrentTimestamp()
    };
  },
  
  /**
   * Pause a simulation
   */
  pauseSimulation(id: string): SimulationControlResponse {
    const simulation = simulations[id];
    if (!simulation) throw new Error(`Simulation ${id} not found`);
    
    simulation.status = 'paused';
    simulation.pauseTime = Date.now();
    
    // Update elapsed time
    if (simulation.startTime) {
      simulation.elapsedTime += (simulation.pauseTime - simulation.startTime) / 1000;
    }
    
    // Stop periodic updates
    if (simulation.updateIntervalId) {
      clearInterval(simulation.updateIntervalId);
      simulation.updateIntervalId = undefined;
    }
    
    return {
      simulation_id: id,
      status: 'paused',
      paused_at: getCurrentTimestamp()
    };
  },
  
  /**
   * Resume a simulation
   */
  resumeSimulation(id: string): SimulationControlResponse {
    const simulation = simulations[id];
    if (!simulation) throw new Error(`Simulation ${id} not found`);
    
    simulation.status = 'running';
    simulation.startTime = Date.now();
    
    // Start periodic updates (faster interval for responsive development)
    if (!simulation.updateIntervalId) {
      simulation.updateIntervalId = setInterval(() => updateSimulation(id), 200);
    }
    
    return {
      simulation_id: id,
      status: 'running',
      resumed_at: getCurrentTimestamp()
    };
  },
  
  /**
   * Reset a simulation
   */
  resetSimulation(id: string): SimulationControlResponse {
    const simulation = simulations[id];
    if (!simulation) throw new Error(`Simulation ${id} not found`);
    
    // Stop updates
    if (simulation.updateIntervalId) {
      clearInterval(simulation.updateIntervalId);
      simulation.updateIntervalId = undefined;
    }
    
    // Reset state
    simulation.status = 'initialized';
    simulation.currentStep = 0;
    simulation.elapsedTime = 0;
    simulation.startTime = undefined;
    simulation.pauseTime = undefined;
    
    // Reset lattice and summary
    simulation.currentLattice = generateMockLattice(simulation.config);
    simulation.currentSummary = generateMockSummary(simulation.config, 0);
    
    // Broadcast update
    broadcastUpdate(id);
    
    return {
      simulation_id: id,
      status: 'initialized',
      reset_at: getCurrentTimestamp()
    };
  },
  
  /**
   * Update simulation parameters
   */
  updateParameters(id: string, params: ParameterUpdateRequest): ParameterUpdateResponse {
    const simulation = simulations[id];
    if (!simulation) throw new Error(`Simulation ${id} not found`);
    
    // Update conditions
    if (params.conditions) {
      simulation.config.conditions = {
        ...simulation.config.conditions,
        ...params.conditions
      };
    }
    
    // Update models
    if (params.models) {
      params.models.forEach((model, index) => {
        if (index < simulation.config.models.length) {
          simulation.config.models[index] = {
            ...simulation.config.models[index],
            ...model
          };
        }
      });
    }
    
    // Broadcast parameter update
    const message: WebSocketMessage = {
      type: 'parameter_update',
      simulation_id: id,
      parameters: {
        conditions: simulation.config.conditions,
        models: simulation.config.models
      },
      timestamp: Date.now(),
      data: null
    };
    
    const messageString = JSON.stringify(message);
    
    simulation.webSocketClients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageString);
      }
    });
    
    return {
      success: true,
      simulation_id: id,
      status: 'parameters_updated',
      updated_at: getCurrentTimestamp()
    };
  },
  
  /**
   * Take a snapshot of the current simulation state
   */
  takeSnapshot(id: string, options?: SnapshotRequest): SnapshotResponse {
    const simulation = simulations[id];
    if (!simulation) throw new Error(`Simulation ${id} not found`);
    
    const snapshotId = generateId();
    const createdAt = getCurrentTimestamp();
    
    // Create a deep copy of the current state
    const stateSnapshot = JSON.parse(JSON.stringify({
      currentStep: simulation.currentStep,
      elapsedTime: simulation.elapsedTime,
      lattice: simulation.currentLattice,
      summary: simulation.currentSummary
    }));
    
    // Create the snapshot object
    const snapshot: SimulationSnapshot = {
      snapshot_id: snapshotId,
      name: options?.name,
      description: options?.description,
      step: simulation.currentStep,
      timestamp: Date.now(),
      state: stateSnapshot,
      data: null,
      created_at: createdAt
    };
    
    // Save the snapshot
    simulation.snapshots.push({
      id: snapshotId,
      name: options?.name,
      description: options?.description,
      state: stateSnapshot,
      createdAt
    });
    
    return {
      snapshot,
      simulation_id: id,
      snapshot_id: snapshotId,
      name: options?.name,
      created_at: createdAt
    };
  },
  
  /**
   * List all snapshots for a simulation
   */
  listSnapshots(id: string): SnapshotListResponse {
    const simulation = simulations[id];
    if (!simulation) throw new Error(`Simulation ${id} not found`);
    
    return {
      simulation_id: id,
      snapshots: simulation.snapshots.map(snapshot => ({
        snapshot_id: snapshot.id,
        name: snapshot.name,
        description: snapshot.description,
        created_at: snapshot.createdAt,
        step: snapshot.state?.currentStep || 0,
        timestamp: new Date(snapshot.createdAt).getTime(),
        state: snapshot.state,
        data: null
      }))
    };
  },
  
  /**
   * Restore a simulation to a previous snapshot
   */
  restoreSnapshot(id: string, snapshotId: string): SimulationControlResponse {
    const simulation = simulations[id];
    if (!simulation) throw new Error(`Simulation ${id} not found`);
    
    const snapshot = simulation.snapshots.find(s => s.id === snapshotId);
    if (!snapshot) throw new Error(`Snapshot ${snapshotId} not found`);
    
    // Stop updates if running
    if (simulation.status === 'running' && simulation.updateIntervalId) {
      clearInterval(simulation.updateIntervalId);
      simulation.updateIntervalId = undefined;
    }
    
    // Restore the state
    simulation.currentStep = snapshot.state.currentStep;
    simulation.elapsedTime = snapshot.state.elapsedTime;
    simulation.currentLattice = snapshot.state.lattice;
    simulation.currentSummary = snapshot.state.summary;
    simulation.status = 'paused';
    
    // Broadcast update
    broadcastUpdate(id);
    
    return {
      simulation_id: id,
      status: 'paused',
      restored_at: getCurrentTimestamp(),
      snapshot_id: snapshotId
    };
  },
  
  /**
   * Get the current status of a simulation
   */
  getSimulationStatus(id: string): SimulationStatusResponse {
    const simulation = simulations[id];
    if (!simulation) throw new Error(`Simulation ${id} not found`);
    
    // Calculate current elapsed time if running
    let elapsedTime = simulation.elapsedTime;
    if (simulation.status === 'running' && simulation.startTime) {
      elapsedTime += (Date.now() - simulation.startTime) / 1000;
    }
    
    return {
      simulation_id: id,
      status: simulation.status,
      current_step: simulation.currentStep,
      total_steps: simulation.totalSteps,
      elapsed_time: elapsedTime,
      wall_time: Date.now() / 1000 - (simulation.config as any).createdAt || 0
    };
  },
  
  /**
   * Get the results of a simulation
   */
  getSimulationResults(id: string, options?: { step?: number }): SimulationResultsResponse {
    const simulation = simulations[id];
    if (!simulation) throw new Error(`Simulation ${id} not found`);
    
    return {
      simulation_id: id,
      step: simulation.currentStep,
      time: simulation.elapsedTime,
      lattice: simulation.currentLattice,
      summary: simulation.currentSummary
    };
  },
  
  /**
   * Register a WebSocket client
   */
  registerWebSocketClient(id: string, client: WebSocket): void {
    const simulation = simulations[id];
    if (!simulation) throw new Error(`Simulation ${id} not found`);
    
    simulation.webSocketClients.add(client);
    
    // Send initial update
    const message: WebSocketMessage = {
      type: 'simulation_update',
      simulation_id: id,
      step: simulation.currentStep,
      time: simulation.elapsedTime,
      lattice: simulation.currentLattice,
      summary: simulation.currentSummary,
      timestamp: Date.now(),
      data: null
    };
    
    client.send(JSON.stringify(message));
    
    // Handle client disconnect
    client.addEventListener('close', () => {
      simulation.webSocketClients.delete(client);
    });
  },
  
  /**
   * Clean up resources for a simulation
   */
  cleanupSimulation(id: string): void {
    const simulation = simulations[id];
    if (!simulation) return;
    
    // Stop updates
    if (simulation.updateIntervalId) {
      clearInterval(simulation.updateIntervalId);
    }
    
    // Close all WebSocket connections
    simulation.webSocketClients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.close();
      }
    });
    
    // Remove the simulation
    delete simulations[id];
  }
}; 