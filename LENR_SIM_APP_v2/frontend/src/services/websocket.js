/**
 * WebSocket Service for Real-Time Simulation Updates
 * ===================================================
 * 
 * Provides WebSocket connectivity for streaming simulation data.
 */

const WS_BASE_URL = process.env.NODE_ENV === 'development' 
  ? 'ws://localhost:8000/api'
  : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/api`;

/**
 * Simulation WebSocket Client
 */
class SimulationWebSocket {
  constructor() {
    this.ws = null;
    this.simulationType = null;
    this.simulationId = null;
    this.callbacks = {
      onUpdate: null,
      onComplete: null,
      onError: null,
      onDisconnect: null,
      onConnect: null,
    };
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 3;
    this.reconnectDelay = 1000;
    // Track if disconnect was explicitly requested
    this.isExplicitlyDisconnecting = false;
  }

  /**
   * Connect to a simulation WebSocket
   * @param {string} simulationType - Type of simulation (quantum-tunneling, lenr, bubble-fusion)
   * @param {string} simulationId - Unique simulation ID
   * @param {object} callbacks - Event callbacks
   */
  connect(simulationType, simulationId, callbacks = {}) {
    // Reset the explicit disconnect flag when intentionally connecting
    // This allows reconnection after a previous explicit disconnect
    this.isExplicitlyDisconnecting = false;
    
    // Prevent connection leak - close existing WebSocket first
    if (this.ws && this.ws.readyState !== WebSocket.CLOSED) {
      console.warn('Closing existing WebSocket before creating new connection');
      this.ws.close(1000, 'Creating new connection');
    }
    
    this.simulationType = simulationType;
    this.simulationId = simulationId;
    this.callbacks = { ...this.callbacks, ...callbacks };

    const url = `${WS_BASE_URL}/ws/simulation/${simulationType}/${simulationId}`;
    
    try {
      this.ws = new WebSocket(url);
      
      this.ws.onopen = () => {
        console.log(`WebSocket connected: ${simulationType}/${simulationId}`);
        this.reconnectAttempts = 0;
        if (this.callbacks.onConnect) {
          this.callbacks.onConnect();
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this._handleMessage(data);
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        if (this.callbacks.onError) {
          this.callbacks.onError(error);
        }
      };

      this.ws.onclose = (event) => {
        console.log(`WebSocket closed: ${event.code} - ${event.reason}`);
        if (this.callbacks.onDisconnect) {
          this.callbacks.onDisconnect(event);
        }
        
        // Attempt reconnection if not closed normally
        if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
          this._attemptReconnect();
        }
      };
    } catch (err) {
      console.error('Failed to create WebSocket:', err);
      if (this.callbacks.onError) {
        this.callbacks.onError(err);
      }
    }
  }

  /**
   * Handle incoming WebSocket messages
   * @private
   */
  _handleMessage(data) {
    switch (data.type) {
      case 'simulation_update':
        if (this.callbacks.onUpdate) {
          this.callbacks.onUpdate(data);
        }
        break;
      
      case 'simulation_complete':
        if (this.callbacks.onComplete) {
          this.callbacks.onComplete(data);
        }
        break;
      
      case 'simulation_cancelled':
        console.log('Simulation cancelled');
        break;
      
      case 'simulation_error':
      case 'error':
        if (this.callbacks.onError) {
          this.callbacks.onError(new Error(data.error || data.message));
        }
        break;
      
      default:
        console.log('Unknown message type:', data.type, data);
    }
  }

  /**
   * Attempt to reconnect
   * @private
   */
  _attemptReconnect() {
    // Don't reconnect if explicit disconnect was requested
    if (this.isExplicitlyDisconnecting) {
      console.log('Skipping reconnect - explicit disconnect requested');
      return;
    }
    
    this.reconnectAttempts++;
    console.log(`Attempting reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
    
    setTimeout(() => {
      // Double-check before reconnecting
      if (!this.isExplicitlyDisconnecting) {
        this.connect(this.simulationType, this.simulationId, this.callbacks);
      }
    }, this.reconnectDelay * this.reconnectAttempts);
  }

  /**
   * Start the simulation with given parameters
   * @param {object} params - Simulation parameters
   * @param {number} durationSteps - Number of simulation steps
   */
  startSimulation(params, durationSteps = 100) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('WebSocket not connected');
      return false;
    }

    this.ws.send(JSON.stringify({
      action: 'start',
      params,
      duration_steps: durationSteps,
    }));
    
    return true;
  }

  /**
   * Stop the running simulation
   */
  stopSimulation() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return false;
    }

    this.ws.send(JSON.stringify({
      action: 'stop',
    }));
    
    return true;
  }

  /**
   * Disconnect WebSocket
   */
  disconnect() {
    // Set flag to prevent reconnection attempts
    this.isExplicitlyDisconnecting = true;
    
    if (this.ws) {
      this.ws.close(1000, 'Client disconnected');
      this.ws = null;
    }
    
    // Reset reconnect attempts
    this.reconnectAttempts = 0;
  }

  /**
   * Check if connected
   * @returns {boolean}
   */
  isConnected() {
    return this.ws && this.ws.readyState === WebSocket.OPEN;
  }
}

/**
 * Create a new simulation WebSocket connection
 * @param {string} simulationType 
 * @param {string} simulationId 
 * @param {object} callbacks 
 * @returns {SimulationWebSocket}
 */
export function createSimulationSocket(simulationType, simulationId, callbacks) {
  const socket = new SimulationWebSocket();
  socket.connect(simulationType, simulationId, callbacks);
  return socket;
}

/**
 * Generate a unique simulation ID
 * @returns {string}
 */
export function generateSimulationId() {
  return `sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export default SimulationWebSocket;

