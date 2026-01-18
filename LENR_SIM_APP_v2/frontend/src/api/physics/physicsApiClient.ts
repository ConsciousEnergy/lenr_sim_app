/**
 * Physics Engine API Client
 * 
 * This module provides a client for interacting with the Physics Engine API.
 * It implements the interfaces defined in the types.ts file.
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
  ControlCommand
} from './types';

// API base URL configuration
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';
const API_PREFIX = '/api/physics';

/**
 * Physics API client for simulation management
 */
export const physicsApiClient = {
  /**
   * Initialize a new simulation with the provided configuration
   */
  async initializeSimulation(config: SimulationInitializeRequest): Promise<SimulationInitializeResponse> {
    const response = await fetch(`${API_BASE_URL}${API_PREFIX}/simulation/initialize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(config),
    });

    if (!response.ok) {
      throw await handleApiError(response);
    }

    return response.json();
  },

  /**
   * Start a simulation
   */
  async startSimulation(simulationId: string): Promise<SimulationControlResponse> {
    return this.controlSimulation(simulationId, 'start');
  },

  /**
   * Pause a simulation
   */
  async pauseSimulation(simulationId: string): Promise<SimulationControlResponse> {
    return this.controlSimulation(simulationId, 'pause');
  },

  /**
   * Resume a simulation
   */
  async resumeSimulation(simulationId: string): Promise<SimulationControlResponse> {
    return this.controlSimulation(simulationId, 'resume');
  },

  /**
   * Reset a simulation
   */
  async resetSimulation(simulationId: string): Promise<SimulationControlResponse> {
    return this.controlSimulation(simulationId, 'reset');
  },

  /**
   * Generic control simulation method
   */
  async controlSimulation(simulationId: string, command: ControlCommand): Promise<SimulationControlResponse> {
    const response = await fetch(`${API_BASE_URL}${API_PREFIX}/simulation/${simulationId}/${command}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw await handleApiError(response);
    }

    return response.json();
  },

  /**
   * Update simulation parameters
   */
  async updateParameters(simulationId: string, params: ParameterUpdateRequest): Promise<ParameterUpdateResponse> {
    const response = await fetch(`${API_BASE_URL}${API_PREFIX}/simulation/${simulationId}/parameters`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw await handleApiError(response);
    }

    return response.json();
  },

  /**
   * Take a snapshot of the current simulation state
   */
  async takeSnapshot(simulationId: string, options?: SnapshotRequest): Promise<SnapshotResponse> {
    const response = await fetch(`${API_BASE_URL}${API_PREFIX}/simulation/${simulationId}/snapshot`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(options || {}),
    });

    if (!response.ok) {
      throw await handleApiError(response);
    }

    return response.json();
  },

  /**
   * List all snapshots for a simulation
   */
  async listSnapshots(simulationId: string): Promise<SnapshotListResponse> {
    const response = await fetch(`${API_BASE_URL}${API_PREFIX}/simulation/${simulationId}/snapshots`);

    if (!response.ok) {
      throw await handleApiError(response);
    }

    return response.json();
  },

  /**
   * Restore a simulation to a previous snapshot
   */
  async restoreSnapshot(simulationId: string, snapshotId: string): Promise<SimulationControlResponse> {
    const response = await fetch(`${API_BASE_URL}${API_PREFIX}/simulation/${simulationId}/restore/${snapshotId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw await handleApiError(response);
    }

    return response.json();
  },

  /**
   * Get the current status of a simulation
   */
  async getSimulationStatus(simulationId: string): Promise<SimulationStatusResponse> {
    const response = await fetch(`${API_BASE_URL}${API_PREFIX}/simulation/${simulationId}/status`);

    if (!response.ok) {
      throw await handleApiError(response);
    }

    return response.json();
  },

  /**
   * Get the results of a simulation
   */
  async getSimulationResults(
    simulationId: string,
    options?: { step?: number; format?: 'json' | 'csv' }
  ): Promise<SimulationResultsResponse> {
    const queryParams = new URLSearchParams();
    
    if (options?.step !== undefined) {
      queryParams.append('step', options.step.toString());
    }
    
    if (options?.format) {
      queryParams.append('format', options.format);
    }

    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
    const response = await fetch(`${API_BASE_URL}${API_PREFIX}/simulation/${simulationId}/results${queryString}`);

    if (!response.ok) {
      throw await handleApiError(response);
    }

    return response.json();
  },

  /**
   * Create a WebSocket connection for real-time simulation updates
   */
  createWebSocketConnection(simulationId: string, onMessage: (_message: WebSocketMessage) => void): WebSocket {
    // Replace http with ws for WebSocket URL
    const wsBase = API_BASE_URL.replace(/^http/, 'ws');
    const socket = new WebSocket(`${wsBase}/api/ws/physics/${simulationId}`);
    
    socket.onmessage = (event) => {
      const message = JSON.parse(event.data) as WebSocketMessage;
      onMessage(message);
    };
    
    return socket;
  }
};

/**
 * Handles API error responses
 */
async function handleApiError(response: Response): Promise<Error> {
  let errorData;
  try {
    errorData = await response.json();
  } catch (e) {
    errorData = { error: 'Unknown error', code: 'UNKNOWN_ERROR', details: response.statusText };
  }
  
  const error = new Error(errorData.error || 'API request failed');
  (error as any).code = errorData.code;
  (error as any).details = errorData.details;
  (error as any).status = response.status;
  
  return error;
} 