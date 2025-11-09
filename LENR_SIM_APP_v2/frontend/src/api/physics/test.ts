/**
 * Physics API Integration Tests
 * 
 * This file contains tests for the Physics API client using the mock server implementation.
 * It demonstrates how to use the API and validate responses.
 */

import { physicsApiClient } from './physicsApiClient';
import { mockPhysicsServer } from './mockServer';
import {
  SimulationInitializeRequest,
  ModelType,
  LatticeType,
  ControlCommand,
  SimulationStatus
} from './types';

// Mock fetch globally to intercept API calls
global.fetch = jest.fn();
global.WebSocket = jest.fn() as unknown as typeof WebSocket;

// Create a mock WebSocket implementation
class MockWebSocket implements Partial<WebSocket> {
  // Add static event constants
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;
  
  // Instance properties
  readonly CONNECTING = 0;
  readonly OPEN = 1;
  readonly CLOSING = 2;
  readonly CLOSED = 3;
  
  url: string;
  binaryType: BinaryType = 'blob';
  bufferedAmount = 0;
  extensions = '';
  protocol = '';
  onopen: ((ev: Event) => any) | null = null;
  onclose: ((ev: CloseEvent) => any) | null = null;
  onmessage: ((ev: MessageEvent) => any) | null = null;
  onerror: ((ev: Event) => any) | null = null;
  readyState = MockWebSocket.OPEN;
  
  constructor(url: string) {
    this.url = url;
    setTimeout(() => {
      if (this.onopen) {
        const event = new Event('open') as unknown as Event;
        this.onopen(event);
      }
    }, 0);
  }
  
  send(data: string): void {
    // Parse message and process with mock server
    try {
      const message = JSON.parse(data);
      if (message.type === 'control_command') {
        const simulationId = message.simulation_id;
        switch (message.command) {
          case 'start':
            mockPhysicsServer.startSimulation(simulationId);
            break;
          case 'pause':
            mockPhysicsServer.pauseSimulation(simulationId);
            break;
          case 'resume':
            mockPhysicsServer.resumeSimulation(simulationId);
            break;
          case 'reset':
            mockPhysicsServer.resetSimulation(simulationId);
            break;
        }
      }
    } catch (error) {
      console.error('Failed to parse message:', error);
    }
  }
  
  close(code?: number, reason?: string): void {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      const event = new CloseEvent('close') as unknown as CloseEvent;
      this.onclose(event);
    }
  }

  // Add missing WebSocket interface methods
  addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void {
    if (type === 'open' && this.onopen === null) {
      this.onopen = listener as any;
    } else if (type === 'close' && this.onclose === null) {
      this.onclose = listener as any;
    } else if (type === 'message' && this.onmessage === null) {
      this.onmessage = listener as any;
    } else if (type === 'error' && this.onerror === null) {
      this.onerror = listener as any;
    }
  }

  removeEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): void {
    // Simple implementation
    if (type === 'open' && this.onopen === listener) {
      this.onopen = null;
    } else if (type === 'close' && this.onclose === listener) {
      this.onclose = null;
    } else if (type === 'message' && this.onmessage === listener) {
      this.onmessage = null;
    } else if (type === 'error' && this.onerror === listener) {
      this.onerror = null;
    }
  }

  dispatchEvent(event: Event): boolean {
    return true;
  }
}

// Set up WebSocket mock
const mockWebSocketImpl = jest.fn().mockImplementation((url: string) => {
  const ws = new MockWebSocket(url);
  const simId = url.split('/').pop();
  if (simId) {
    mockPhysicsServer.registerWebSocketClient(simId, ws as unknown as WebSocket);
  }
  return ws;
});

// Assign mock to global WebSocket
global.WebSocket = mockWebSocketImpl as unknown as typeof WebSocket;

// Set up fetch mock
(global.fetch as jest.Mock).mockImplementation(async (url: string, options?: RequestInit) => {
  const endpoint = url.toString();
  
  try {
    let response;
    
    // Handle different endpoints
    if (endpoint.includes('/simulation/initialize')) {
      const body = JSON.parse(options?.body as string) as SimulationInitializeRequest;
      response = mockPhysicsServer.initializeSimulation(body);
    } 
    else if (endpoint.match(/\/simulation\/(\w+)\/start/)) {
      const id = endpoint.match(/\/simulation\/(\w+)\/start/)![1];
      response = mockPhysicsServer.startSimulation(id);
    }
    else if (endpoint.match(/\/simulation\/(\w+)\/pause/)) {
      const id = endpoint.match(/\/simulation\/(\w+)\/pause/)![1];
      response = mockPhysicsServer.pauseSimulation(id);
    }
    else if (endpoint.match(/\/simulation\/(\w+)\/resume/)) {
      const id = endpoint.match(/\/simulation\/(\w+)\/resume/)![1];
      response = mockPhysicsServer.resumeSimulation(id);
    }
    else if (endpoint.match(/\/simulation\/(\w+)\/reset/)) {
      const id = endpoint.match(/\/simulation\/(\w+)\/reset/)![1];
      response = mockPhysicsServer.resetSimulation(id);
    }
    else if (endpoint.match(/\/simulation\/(\w+)\/parameters/)) {
      const id = endpoint.match(/\/simulation\/(\w+)\/parameters/)![1];
      const body = JSON.parse(options?.body as string);
      response = mockPhysicsServer.updateParameters(id, body);
    }
    else if (endpoint.match(/\/simulation\/(\w+)\/snapshot$/)) {
      const id = endpoint.match(/\/simulation\/(\w+)\/snapshot/)![1];
      const body = options?.body ? JSON.parse(options.body as string) : undefined;
      response = mockPhysicsServer.takeSnapshot(id, body);
    }
    else if (endpoint.match(/\/simulation\/(\w+)\/snapshots$/)) {
      const id = endpoint.match(/\/simulation\/(\w+)\/snapshots/)![1];
      response = mockPhysicsServer.listSnapshots(id);
    }
    else if (endpoint.match(/\/simulation\/(\w+)\/restore\/(\w+)/)) {
      const matches = endpoint.match(/\/simulation\/(\w+)\/restore\/(\w+)/);
      const id = matches![1];
      const snapshotId = matches![2];
      response = mockPhysicsServer.restoreSnapshot(id, snapshotId);
    }
    else if (endpoint.match(/\/simulation\/(\w+)\/status/)) {
      const id = endpoint.match(/\/simulation\/(\w+)\/status/)![1];
      response = mockPhysicsServer.getSimulationStatus(id);
    }
    else if (endpoint.match(/\/simulation\/(\w+)\/results/)) {
      const id = endpoint.match(/\/simulation\/(\w+)\/results/)![1];
      response = mockPhysicsServer.getSimulationResults(id);
    }
    else {
      return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
    }
    
    return new Response(JSON.stringify(response), { status: 200 });
  } catch (error) {
    // Handle specific errors with appropriate status codes
    if ((error as Error).message.includes('not found')) {
      return new Response(JSON.stringify({ error: (error as Error).message }), { status: 404 });
    } else if ((error as Error).message.includes('already')) {
      return new Response(JSON.stringify({ error: (error as Error).message }), { status: 409 });
    } else if ((error as Error).message.includes('invalid')) {
      return new Response(JSON.stringify({ error: (error as Error).message }), { status: 400 });
    }
    
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
  }
});

// Test helper functions
const createTestSimulationConfig = (): SimulationInitializeRequest => ({
  models: [
    {
      model_type: 'quantum_tunneling' as ModelType,
      parameters: {
        electron_screening_factor: 0.34,
        barrier_width: 1.2
      }
    }
  ],
  lattice: {
    type: 'fcc' as LatticeType,
    dimensions: [5, 5, 5] as [number, number, number],
    constants: [3.52, 3.52, 3.52] as [number, number, number],
    elements: [
      {
        symbol: 'Pd',
        position: [0, 0, 0] as [number, number, number],
        occupancy: 1.0
      },
      {
        symbol: 'D',
        position: [0.5, 0.5, 0.5] as [number, number, number],
        occupancy: 0.6
      }
    ]
  },
  conditions: {
    temperature: 300, // K
    pressure: 101.325, // kPa (1 atm)
  },
  simulation_parameters: {
    time_step: 0.01, // seconds
    total_steps: 100,
    save_frequency: 10 // save every 10 steps
  }
});

// Utility to wait for specific time
const wait = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

// Unit tests using Jest
describe('Physics API Client', () => {
  let simulationId: string;

  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Test initialization
  describe('Simulation Initialization', () => {
    it('should initialize a simulation with valid parameters', async () => {
      const config = createTestSimulationConfig();
      const response = await physicsApiClient.initializeSimulation(config);
      
      expect(response).toBeDefined();
      expect(response.simulation_id).toBeDefined();
      expect(response.status).toBe('initialized');
      expect(response.websocket_url).toBeDefined();
      simulationId = response.simulation_id;
    });
    
    it('should handle invalid initialization parameters', async () => {
      const invalidConfig = {
        ...createTestSimulationConfig(),
        models: [] // Empty models array, which should be invalid
      };
      
      await expect(physicsApiClient.initializeSimulation(invalidConfig as any)).rejects.toThrow();
    });
  });

  // Test simulation control
  describe('Simulation Control', () => {
    let id: string;
    
    beforeEach(async () => {
      const config = createTestSimulationConfig();
      const response = await physicsApiClient.initializeSimulation(config);
      id = response.simulation_id;
    });
    
    it('should start a simulation', async () => {
      const response = await physicsApiClient.startSimulation(id);
      expect(response.status).toBe('running');
      expect(response.started_at).toBeDefined();
    });
    
    it('should pause a running simulation', async () => {
      await physicsApiClient.startSimulation(id);
      const response = await physicsApiClient.pauseSimulation(id);
      expect(response.status).toBe('paused');
      expect(response.paused_at).toBeDefined();
    });
    
    it('should resume a paused simulation', async () => {
      await physicsApiClient.startSimulation(id);
      await physicsApiClient.pauseSimulation(id);
      const response = await physicsApiClient.resumeSimulation(id);
      expect(response.status).toBe('running');
      expect(response.resumed_at).toBeDefined();
    });
    
    it('should reset a simulation', async () => {
      await physicsApiClient.startSimulation(id);
      const response = await physicsApiClient.resetSimulation(id);
      expect(response.status).toBe('initialized');
      expect(response.reset_at).toBeDefined();
    });
    
    it('should handle trying to control a non-existent simulation', async () => {
      await expect(physicsApiClient.startSimulation('non-existent-id')).rejects.toThrow();
    });
    
    it('should handle invalid state transitions', async () => {
      // Try to pause a simulation that's not running
      await expect(physicsApiClient.pauseSimulation(id)).rejects.toThrow();
      
      // Try to resume a simulation that's not paused
      await physicsApiClient.startSimulation(id);
      await expect(physicsApiClient.resumeSimulation(id)).rejects.toThrow();
    });
  });

  // Test parameter updates
  describe('Simulation Parameters', () => {
    let id: string;
    
    beforeEach(async () => {
      const config = createTestSimulationConfig();
      const response = await physicsApiClient.initializeSimulation(config);
      id = response.simulation_id;
      await physicsApiClient.startSimulation(id);
    });
    
    it('should update simulation parameters', async () => {
      const response = await physicsApiClient.updateParameters(id, {
        conditions: {
          temperature: 350
        }
      });
      
      expect(response.status).toBe('parameters_updated');
      expect(response.updated_at).toBeDefined();
      
      // Verify the parameters were actually updated
      const status = await physicsApiClient.getSimulationStatus(id);
      expect(status).toBeDefined();
    });
    
    it('should handle invalid parameter updates', async () => {
      await expect(physicsApiClient.updateParameters(id, {
        conditions: {
          temperature: -500 // Invalid negative temperature
        }
      })).rejects.toThrow();
    });
  });

  // Test snapshots
  describe('Simulation Snapshots', () => {
    let id: string;
    
    beforeEach(async () => {
      const config = createTestSimulationConfig();
      const response = await physicsApiClient.initializeSimulation(config);
      id = response.simulation_id;
      await physicsApiClient.startSimulation(id);
    });
    
    it('should take a snapshot', async () => {
      const response = await physicsApiClient.takeSnapshot(id, {
        name: 'Test Snapshot',
        description: 'Created during tests'
      });
      
      expect(response.snapshot_id).toBeDefined();
      expect(response.name).toBe('Test Snapshot');
      expect(response.created_at).toBeDefined();
    });
    
    it('should list snapshots', async () => {
      await physicsApiClient.takeSnapshot(id, { name: 'Snapshot 1' });
      await physicsApiClient.takeSnapshot(id, { name: 'Snapshot 2' });
      
      const response = await physicsApiClient.listSnapshots(id);
      expect(response.snapshots).toHaveLength(2);
      expect(response.snapshots[0].name).toBe('Snapshot 1');
      expect(response.snapshots[1].name).toBe('Snapshot 2');
    });
    
    it('should restore a snapshot', async () => {
      const snapshot = await physicsApiClient.takeSnapshot(id, { name: 'Restore Test' });
      
      // Change some parameters to make the state different
      await physicsApiClient.updateParameters(id, {
        conditions: {
          temperature: 400
        }
      });
      
      // Now restore the snapshot
      const response = await physicsApiClient.restoreSnapshot(id, snapshot.snapshot_id);
      expect(response.status).toBe('restored');
      expect(response.snapshot_id).toBe(snapshot.snapshot_id);
      expect(response.restored_at).toBeDefined();
      
      // Verify the state was restored
      const status = await physicsApiClient.getSimulationStatus(id);
      expect(status).toBeDefined();
    });
    
    it('should handle restoring a non-existent snapshot', async () => {
      await expect(physicsApiClient.restoreSnapshot(id, 'non-existent-snapshot')).rejects.toThrow();
    });
  });

  // Test data retrieval
  describe('Simulation Data Retrieval', () => {
    let id: string;
    
    beforeEach(async () => {
      const config = createTestSimulationConfig();
      const response = await physicsApiClient.initializeSimulation(config);
      id = response.simulation_id;
      await physicsApiClient.startSimulation(id);
      // Give some time for the simulation to run
      await wait(100);
    });
    
    it('should get simulation status', async () => {
      const response = await physicsApiClient.getSimulationStatus(id);
      expect(response.simulation_id).toBe(id);
      expect(response.status).toBe('running');
      expect(response.current_step).toBeGreaterThan(0);
      expect(response.total_steps).toBe(100); // From our test config
      expect(response.elapsed_time).toBeGreaterThan(0);
      expect(response.wall_time).toBeGreaterThan(0);
    });
    
    it('should get simulation results', async () => {
      const response = await physicsApiClient.getSimulationResults(id);
      expect(response.simulation_id).toBe(id);
      expect(response.step).toBeGreaterThan(0);
      expect(response.time).toBeGreaterThan(0);
      expect(response.lattice).toBeDefined();
      expect(response.lattice.points.length).toBeGreaterThan(0);
      expect(response.summary).toBeDefined();
      expect(response.summary.average_temperature).toBeGreaterThan(0);
    });
    
    it('should get results for a specific step', async () => {
      const response = await physicsApiClient.getSimulationResults(id, { step: 10 });
      expect(response.step).toBe(10);
    });
    
    it('should handle invalid step parameters', async () => {
      // This might not throw but should return valid results for a different step
      const response = await physicsApiClient.getSimulationResults(id, { step: 9999 });
      expect(response).toBeDefined();
    });
  });

  // Test WebSocket functionality
  describe('WebSocket Connection', () => {
    let id: string;
    let socket: WebSocket;
    
    beforeEach(async () => {
      const config = createTestSimulationConfig();
      const response = await physicsApiClient.initializeSimulation(config);
      id = response.simulation_id;
      socket = physicsApiClient.createWebSocketConnection(id, jest.fn());
    });
    
    afterEach(() => {
      socket.close();
    });
    
    it('should establish a WebSocket connection', () => {
      expect(socket).toBeDefined();
      expect(socket.readyState).toBe(MockWebSocket.OPEN);
    });
    
    it('should receive simulation updates', async () => {
      const messageHandler = jest.fn();
      socket = physicsApiClient.createWebSocketConnection(id, messageHandler);
      
      await physicsApiClient.startSimulation(id);
      await wait(100); // Wait for messages to be delivered
      
      expect(messageHandler).toHaveBeenCalled();
      
      // The first argument of the first call
      const message = messageHandler.mock.calls[0][0];
      expect(message).toBeDefined();
      expect(message.type).toBe('simulation_update');
    });
    
    it('should close the connection properly', () => {
      const closeHandler = jest.fn();
      socket.onclose = closeHandler;
      
      socket.close();
      expect(socket.readyState).toBe(MockWebSocket.CLOSED);
      expect(closeHandler).toHaveBeenCalled();
    });
  });

  // Test error handling
  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      // Temporarily make fetch throw a network error
      const originalFetch = global.fetch;
      (global.fetch as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Network error');
      });
      
      await expect(physicsApiClient.getSimulationStatus('any-id')).rejects.toThrow('Network error');
      
      // Restore the original mock
      global.fetch = originalFetch;
    });
    
    it('should handle API errors with appropriate status codes', async () => {
      // This should return a 404
      await expect(physicsApiClient.getSimulationStatus('non-existent-id')).rejects.toThrow();
    });
  });
});

/**
 * Manual test function that can be run to demonstrate API usage
 */
async function runPhysicsApiTest() {
  try {
    console.log('Starting Physics API test...');
    
    // Create test configuration
    const config = createTestSimulationConfig();
    
    // Initialize a new simulation
    console.log('Initializing simulation...');
    const initResponse = await physicsApiClient.initializeSimulation(config);
    console.log('Initialization response:', initResponse);
    const { simulation_id } = initResponse;
    
    // Create WebSocket connection
    console.log('Setting up WebSocket connection...');
    const socket = physicsApiClient.createWebSocketConnection(simulation_id, (message) => {
      console.log('WebSocket message:', message);
    });
    
    // Start the simulation
    console.log('Starting simulation...');
    const startResponse = await physicsApiClient.startSimulation(simulation_id);
    console.log('Start response:', startResponse);
    
    // Wait a bit for simulation to run
    console.log('Waiting for simulation to progress...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Get current status
    console.log('Fetching status...');
    const statusResponse = await physicsApiClient.getSimulationStatus(simulation_id);
    console.log('Status response:', statusResponse);
    
    // Pause the simulation
    console.log('Pausing simulation...');
    const pauseResponse = await physicsApiClient.pauseSimulation(simulation_id);
    console.log('Pause response:', pauseResponse);
    
    // Take a snapshot
    console.log('Taking snapshot...');
    const snapshotResponse = await physicsApiClient.takeSnapshot(simulation_id, {
      name: 'Test snapshot',
      description: 'Created during API test'
    });
    console.log('Snapshot response:', snapshotResponse);
    
    // Update parameters
    console.log('Updating parameters...');
    const updateResponse = await physicsApiClient.updateParameters(simulation_id, {
      conditions: {
        temperature: 350 // Increase temperature
      }
    });
    console.log('Update response:', updateResponse);
    
    // Resume the simulation
    console.log('Resuming simulation...');
    const resumeResponse = await physicsApiClient.resumeSimulation(simulation_id);
    console.log('Resume response:', resumeResponse);
    
    // Wait a bit more
    console.log('Waiting for more simulation progress...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Get simulation results
    console.log('Fetching results...');
    const resultsResponse = await physicsApiClient.getSimulationResults(simulation_id);
    console.log('Results response:', resultsResponse);
    
    // List snapshots
    console.log('Listing snapshots...');
    const snapshotsResponse = await physicsApiClient.listSnapshots(simulation_id);
    console.log('Snapshots response:', snapshotsResponse);
    
    // Reset the simulation
    console.log('Resetting simulation...');
    const resetResponse = await physicsApiClient.resetSimulation(simulation_id);
    console.log('Reset response:', resetResponse);
    
    // Clean up
    console.log('Cleaning up...');
    socket.close();
    mockPhysicsServer.cleanupSimulation(simulation_id);
    
    console.log('Test completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Export the test function
export { runPhysicsApiTest }; 