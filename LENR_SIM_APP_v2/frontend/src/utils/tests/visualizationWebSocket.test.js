import {
  createVisualizationWebSocket,
  getVisualizationWebSocket,
  registerVisualizationListener,
  unregisterVisualizationListener
} from '../visualizationWebSocket';

// Mock WebSocket
class MockWebSocket {
  constructor(url) {
    this.url = url;
    this.readyState = WebSocket.CONNECTING;
    this.CONNECTING = WebSocket.CONNECTING;
    this.OPEN = WebSocket.OPEN;
    this.CLOSING = WebSocket.CLOSING;
    this.CLOSED = WebSocket.CLOSED;
    
    // Add event callbacks
    this.onopen = null;
    this.onclose = null;
    this.onmessage = null;
    this.onerror = null;
    
    // Auto open connection
    setTimeout(() => {
      this.readyState = WebSocket.OPEN;
      if (this.onopen) this.onopen({ target: this });
    }, 0);
  }
  
  close() {
    this.readyState = WebSocket.CLOSED;
    if (this.onclose) this.onclose({ target: this });
  }
  
  send(data) {
    this._lastSentMessage = data;
    return true;
  }
  
  // Helper method for tests to simulate receiving messages
  _receiveMessage(data) {
    if (this.onmessage) {
      this.onmessage({ data });
    }
  }
  
  // Helper method for tests to simulate errors
  _simulateError(error) {
    if (this.onerror) {
      this.onerror(error);
    }
  }
}

// Implement WebSocket constants
WebSocket.CONNECTING = 0;
WebSocket.OPEN = 1;
WebSocket.CLOSING = 2;
WebSocket.CLOSED = 3;

// Replace global WebSocket with mock
global.WebSocket = MockWebSocket;

// Mock fetch API
global.fetch = jest.fn().mockImplementation(() => 
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({
      status: 'registered',
      simulation_id: 'test-simulation'
    })
  })
);

describe('visualizationWebSocket', () => {
  beforeEach(() => {
    // Clear singleton instance between tests
    delete window.visualizationWebSocket;
    jest.clearAllMocks();
  });
  
  afterEach(() => {
    jest.resetAllMocks();
  });
  
  describe('createVisualizationWebSocket', () => {
    it('creates a new WebSocket instance', () => {
      const wsInstance = createVisualizationWebSocket('http://api.example.com');
      expect(wsInstance).toBeDefined();
    });
    
    it('returns the same instance on subsequent calls', () => {
      const wsInstance1 = createVisualizationWebSocket('http://api.example.com');
      const wsInstance2 = createVisualizationWebSocket('http://api.example.com');
      expect(wsInstance1).toBe(wsInstance2);
    });
  });
  
  describe('getVisualizationWebSocket', () => {
    it('returns null if no instance has been created', () => {
      const wsInstance = getVisualizationWebSocket();
      expect(wsInstance).toBeNull();
    });
    
    it('returns the created instance', () => {
      const createdInstance = createVisualizationWebSocket('http://api.example.com');
      const retrievedInstance = getVisualizationWebSocket();
      expect(retrievedInstance).toBe(createdInstance);
    });
  });
  
  describe('VisualizationWebSocket class', () => {
    let wsInstance;
    
    beforeEach(() => {
      wsInstance = createVisualizationWebSocket('http://api.example.com');
    });
    
    it('connects to WebSocket server', async () => {
      await wsInstance.connect();
      expect(wsInstance.isConnected).toBe(true);
    });
    
    it('has the correct WebSocket URL', async () => {
      await wsInstance.connect();
      expect(wsInstance.socket.url).toContain('ws://api.example.com/api/visualization/ws/');
    });
    
    it('subscribes to simulation events', async () => {
      await wsInstance.connect();
      await wsInstance.subscribe('test-simulation');
      
      // Check that the subscription message was sent
      expect(wsInstance.socket._lastSentMessage).toContain('subscribe');
      expect(wsInstance.socket._lastSentMessage).toContain('test-simulation');
    });
    
    it('unsubscribes from simulation events', async () => {
      await wsInstance.connect();
      await wsInstance.subscribe('test-simulation');
      await wsInstance.unsubscribe('test-simulation');
      
      // Check that the unsubscription message was sent
      expect(wsInstance.socket._lastSentMessage).toContain('unsubscribe');
      expect(wsInstance.socket._lastSentMessage).toContain('test-simulation');
    });
    
    it('handles incoming messages', async () => {
      await wsInstance.connect();
      
      const mockEventHandler = jest.fn();
      wsInstance.on('onMessage', mockEventHandler);
      
      // Simulate receiving a message
      const testMessage = JSON.stringify({
        simulation_id: 'test-simulation',
        event_type: 'simulation_step_completed',
        source: 'nuclear_domain',
        data: { timestep: 10, temperature: 300 }
      });
      
      wsInstance.socket._receiveMessage(testMessage);
      
      expect(mockEventHandler).toHaveBeenCalled();
    });
    
    it('registers simulation-specific event handlers', async () => {
      await wsInstance.connect();
      
      const mockEventHandler = jest.fn();
      wsInstance.onSimulationEvent('test-simulation', mockEventHandler);
      
      // Simulate receiving a message for this simulation
      const testMessage = JSON.stringify({
        simulation_id: 'test-simulation',
        event_type: 'simulation_step_completed',
        source: 'nuclear_domain',
        data: { timestep: 10, temperature: 300 }
      });
      
      wsInstance.socket._receiveMessage(testMessage);
      
      expect(mockEventHandler).toHaveBeenCalled();
    });
    
    it('disconnects and cleans up resources', async () => {
      await wsInstance.connect();
      wsInstance.disconnect();
      
      expect(wsInstance.isConnected).toBe(false);
      expect(wsInstance.socket).toBeNull();
    });
    
    it('handles WebSocket errors', async () => {
      const mockErrorHandler = jest.fn();
      wsInstance.on('onError', mockErrorHandler);
      
      await wsInstance.connect();
      
      // Simulate an error
      wsInstance.socket._simulateError(new Error('Test error'));
      
      expect(mockErrorHandler).toHaveBeenCalled();
    });
  });
  
  describe('registerVisualizationListener', () => {
    it('registers a listener with the server', async () => {
      const wsInstance = createVisualizationWebSocket('http://api.example.com');
      const mockCallback = jest.fn();
      
      await registerVisualizationListener('test-simulation', mockCallback);
      
      // Should call fetch to register with server
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/register-simulation/test-simulation'),
        expect.any(Object)
      );
    });
  });
  
  describe('unregisterVisualizationListener', () => {
    it('unregisters a listener from the server', async () => {
      const wsInstance = createVisualizationWebSocket('http://api.example.com');
      const mockCallback = jest.fn();
      
      // Register first
      await registerVisualizationListener('test-simulation', mockCallback);
      
      // Then unregister
      await unregisterVisualizationListener('test-simulation', mockCallback);
      
      // Should call fetch to unregister with server
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/unregister-simulation/test-simulation'),
        expect.any(Object)
      );
    });
  });
}); 