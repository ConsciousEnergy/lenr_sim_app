/**
 * Visualization WebSocket Utility
 * 
 * This module provides utilities for connecting to the WebSocket API
 * to receive real-time visualization events from simulations.
 */
import { API_BASE_URL } from '../config/api';

/**
 * WebSocket connection manager for visualization data
 */
class VisualizationWebSocket {
  /**
   * Create a new visualization WebSocket manager
   * @param {string} baseUrl - API base URL
   * @param {string} clientId - Unique client identifier
   */
  constructor(baseUrl, clientId = null) {
    this.baseUrl = baseUrl;
    this.clientId = clientId || `client_${Date.now()}`;
    this.socket = null;
    this.connected = false;
    this.manualDisconnect = false; // Track if disconnect was intentional
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000; // 1 second initial delay
    this.subscriptions = new Set();
    this.eventHandlers = {
      onConnect: [],
      onDisconnect: [],
      onMessage: [],
      onError: [],
    };
    
    // Keep track of simulation-specific event handlers
    this.simulationEventHandlers = new Map();
    
    // Heartbeat to keep connection alive
    this.pingInterval = null;
    this.pingIntervalMs = 30000; // 30 seconds
  }
  
  /**
   * Connect to the WebSocket server
   * @returns {Promise} Resolves when connected
   */
  connect() {
    return new Promise((resolve, reject) => {
      try {
        // Close existing socket if any
        if (this.socket) {
          this.disconnect();
        }
        
        // Reset manual disconnect flag when connecting
        this.manualDisconnect = false;
        
        // Create new WebSocket connection
        // Ensure we have a valid base URL
        const baseUrl =
          this.baseUrl ||
          API_BASE_URL ||
          (typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.host}` : '');
        // Convert http(s) to ws(s)
        const wsUrl = baseUrl.replace(/^http/, 'ws');
        // Remove trailing /api if present to avoid duplication
        const cleanWsUrl = wsUrl.replace(/\/api$/, '');
        const url = `${cleanWsUrl}/api/visualization/ws/${this.clientId}`;
        console.log('Connecting to visualization WebSocket:', url);
        this.socket = new WebSocket(url);
        
        // Set up event handlers
        this.socket.onopen = () => {
          console.log('Visualization WebSocket connected');
          this.connected = true;
          this.reconnectAttempts = 0;
          this._startHeartbeat();
          
          // Resubscribe to any previous subscriptions
          this.subscriptions.forEach(simulationId => {
            this._sendSubscription(simulationId);
          });
          
          // Notify event handlers
          this._notifyHandlers('onConnect');
          resolve();
        };
        
        this.socket.onclose = () => {
          console.log('Visualization WebSocket disconnected');
          this.connected = false;
          this._stopHeartbeat();
          
          // Notify event handlers
          this._notifyHandlers('onDisconnect');
          
          // Only attempt reconnect if not explicitly disconnected by user
          if (!this.manualDisconnect) {
            this._attemptReconnect();
          }
        };
        
        this.socket.onerror = (error) => {
          console.error('Visualization WebSocket error:', error);
          this._notifyHandlers('onError', error);
          reject(error);
        };
        
        this.socket.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            
            // Handle pong message
            if (message.type === 'pong') {
              return;
            }
            
            // Handle subscription confirmation
            if (message.status === 'subscribed' || message.status === 'unsubscribed') {
              console.log(`Subscription ${message.status}: ${message.simulation_id}`);
              return;
            }
            
            // Handle error messages
            if (message.status === 'error') {
              console.error('WebSocket error:', message.message);
              this._notifyHandlers('onError', new Error(message.message));
              return;
            }
            
            // Handle visualization events
            if (message.simulation_id && message.event_type) {
              // Notify general handlers
              this._notifyHandlers('onMessage', message);
              
              // Notify simulation-specific handlers
              const simulationId = message.simulation_id;
              if (this.simulationEventHandlers.has(simulationId)) {
                this.simulationEventHandlers.get(simulationId).forEach(handler => {
                  try {
                    handler(message);
                  } catch (e) {
                    console.error(`Error in simulation event handler for ${simulationId}:`, e);
                  }
                });
              }
            }
          } catch (e) {
            console.error('Error processing WebSocket message:', e);
          }
        };
      } catch (error) {
        console.error('Failed to connect to WebSocket:', error);
        reject(error);
      }
    });
  }
  
  /**
   * Disconnect from the WebSocket server
   */
  disconnect() {
    // Mark as manual disconnect to prevent auto-reconnect
    this.manualDisconnect = true;
    
    if (this.socket) {
      // Stop heartbeat
      this._stopHeartbeat();
      
      // Close the connection
      try {
        this.socket.close();
      } catch (e) {
        console.error('Error closing WebSocket:', e);
      }
      
      this.socket = null;
      this.connected = false;
    }
  }
  
  /**
   * Subscribe to events for a specific simulation
   * @param {string} simulationId - ID of the simulation to subscribe to
   * @returns {Promise} Resolves when subscription is confirmed
   */
  subscribe(simulationId) {
    return new Promise((resolve, reject) => {
      if (!simulationId) {
        reject(new Error('Simulation ID is required'));
        return;
      }
      
      // Add to subscriptions set
      this.subscriptions.add(simulationId);
      
      // Send subscription message if connected
      if (this.connected) {
        this._sendSubscription(simulationId)
          .then(resolve)
          .catch(reject);
      } else {
        // Will resubscribe when connected
        resolve();
      }
    });
  }
  
  /**
   * Alias for subscribe - maintained for backwards compatibility
   * @param {string} simulationId - ID of the simulation to subscribe to
   * @returns {Promise} Resolves when subscription is confirmed
   */
  subscribeToSimulation(simulationId) {
    return this.subscribe(simulationId);
  }
  
  /**
   * Unsubscribe from events for a specific simulation
   * @param {string} simulationId - ID of the simulation to unsubscribe from
   * @returns {Promise} Resolves when unsubscription is confirmed
   */
  unsubscribe(simulationId) {
    return new Promise((resolve, reject) => {
      if (!simulationId) {
        reject(new Error('Simulation ID is required'));
        return;
      }
      
      // Remove from subscriptions set
      this.subscriptions.delete(simulationId);
      
      // Send unsubscription message if connected
      if (this.connected) {
        this._sendUnsubscription(simulationId)
          .then(resolve)
          .catch(reject);
      } else {
        resolve();
      }
    });
  }
  
  /**
   * Alias for unsubscribe - maintained for backwards compatibility
   * @param {string} simulationId - ID of the simulation to unsubscribe from
   * @returns {Promise} Resolves when unsubscription is confirmed
   */
  unsubscribeFromSimulation(simulationId) {
    return this.unsubscribe(simulationId);
  }
  
  /**
   * Register an event handler for a specific simulation
   * @param {string} simulationId - ID of the simulation
   * @param {function} handler - Event handler function
   */
  onSimulationEvent(simulationId, handler) {
    if (!this.simulationEventHandlers.has(simulationId)) {
      this.simulationEventHandlers.set(simulationId, []);
    }
    
    this.simulationEventHandlers.get(simulationId).push(handler);
  }
  
  /**
   * Alias for onSimulationEvent - maintained for backwards compatibility
   * @param {string} simulationId - ID of the simulation
   * @param {function} handler - Event handler function
   */
  registerVisualizationListener(simulationId, handler) {
    return this.onSimulationEvent(simulationId, handler);
  }
  
  /**
   * Remove an event handler for a specific simulation
   * @param {string} simulationId - ID of the simulation
   * @param {function} handler - Event handler function to remove
   */
  offSimulationEvent(simulationId, handler) {
    if (this.simulationEventHandlers.has(simulationId)) {
      const handlers = this.simulationEventHandlers.get(simulationId);
      const index = handlers.indexOf(handler);
      
      if (index !== -1) {
        handlers.splice(index, 1);
      }
      
      // Remove the map entry if no handlers left
      if (handlers.length === 0) {
        this.simulationEventHandlers.delete(simulationId);
      }
    }
  }
  
  /**
   * Alias for offSimulationEvent - maintained for backwards compatibility
   * @param {string} simulationId - ID of the simulation
   * @param {function} handler - Event handler function to remove
   */
  unregisterVisualizationListener(simulationId, handler) {
    return this.offSimulationEvent(simulationId, handler);
  }
  
  /**
   * Register an event handler
   * @param {string} event - Event name ('onConnect', 'onDisconnect', 'onMessage', 'onError')
   * @param {function} handler - Event handler function
   */
  on(event, handler) {
    if (this.eventHandlers[event]) {
      this.eventHandlers[event].push(handler);
    }
  }
  
  /**
   * Remove an event handler
   * @param {string} event - Event name
   * @param {function} handler - Event handler function to remove
   */
  off(event, handler) {
    if (this.eventHandlers[event]) {
      const index = this.eventHandlers[event].indexOf(handler);
      
      if (index !== -1) {
        this.eventHandlers[event].splice(index, 1);
      }
    }
  }
  
  /**
   * Send subscription message
   * @private
   * @param {string} simulationId - ID of the simulation
   * @returns {Promise} Resolves when subscription is sent
   */
  _sendSubscription(simulationId) {
    return new Promise((resolve, reject) => {
      if (!this.connected) {
        reject(new Error('WebSocket not connected'));
        return;
      }
      
      try {
        this.socket.send(JSON.stringify({
          type: 'subscribe',
          simulation_id: simulationId
        }));
        resolve();
      } catch (e) {
        reject(e);
      }
    });
  }
  
  /**
   * Send unsubscription message
   * @private
   * @param {string} simulationId - ID of the simulation
   * @returns {Promise} Resolves when unsubscription is sent
   */
  _sendUnsubscription(simulationId) {
    return new Promise((resolve, reject) => {
      if (!this.connected) {
        reject(new Error('WebSocket not connected'));
        return;
      }
      
      try {
        this.socket.send(JSON.stringify({
          type: 'unsubscribe',
          simulation_id: simulationId
        }));
        resolve();
      } catch (e) {
        reject(e);
      }
    });
  }
  
  /**
   * Notify event handlers
   * @private
   * @param {string} event - Event name
   * @param {any} data - Event data
   */
  _notifyHandlers(event, data) {
    if (this.eventHandlers[event]) {
      this.eventHandlers[event].forEach(handler => {
        try {
          handler(data);
        } catch (e) {
          console.error(`Error in ${event} handler:`, e);
        }
      });
    }
  }
  
  /**
   * Start heartbeat ping
   * @private
   */
  _startHeartbeat() {
    this._stopHeartbeat();
    
    this.pingInterval = setInterval(() => {
      if (this.connected) {
        try {
          this.socket.send(JSON.stringify({ type: 'ping' }));
        } catch (e) {
          console.error('Error sending ping:', e);
        }
      }
    }, this.pingIntervalMs);
  }
  
  /**
   * Stop heartbeat ping
   * @private
   */
  _stopHeartbeat() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }
  
  /**
   * Attempt to reconnect
   * @private
   */
  _attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnect attempts reached, giving up');
      return;
    }
    
    const delay = this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts);
    this.reconnectAttempts++;
    
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      if (!this.connected) {
        this.connect().catch(e => {
          console.error('Reconnect failed:', e);
        });
      }
    }, delay);
  }

  /**
   * Register an event handler for 'onConnect' events
   * @param {function} handler - Event handler function
   */
  onConnected(handler) {
    this.on('onConnect', handler);
  }

  /**
   * Register an event handler for 'onDisconnect' events
   * @param {function} handler - Event handler function
   */
  onDisconnected(handler) {
    this.on('onDisconnect', handler);
  }

  /**
   * Register an event handler for 'onError' events
   * @param {function} handler - Event handler function
   */
  onError(handler) {
    this.on('onError', handler);
  }

  /**
   * Check if the socket is currently connected
   * @returns {boolean} True if connected, false otherwise
   */
  getConnectionStatus() {
    return this.connected;
  }

  /**
   * Check if the socket is currently connected (alias for getConnectionStatus)
   * @returns {boolean} True if connected, false otherwise
   */
  isConnected() {
    return this.connected;
  }
}

/**
 * Create a singleton instance of VisualizationWebSocket
 * @param {string} baseUrl - API base URL (defaults to http://localhost:8010 if empty)
 * @returns {VisualizationWebSocket} WebSocket manager instance
 */
export function createVisualizationWebSocket(baseUrl) {
  // Prefer centralized API config and only fall back to explicit input URL.
  const configuredBaseUrl = API_BASE_URL || `${window.location.protocol}//${window.location.host}`;
  const effectiveBaseUrl = (baseUrl && baseUrl.startsWith('http')) ? baseUrl : configuredBaseUrl;
  
  if (!window.visualizationWebSocket) {
    window.visualizationWebSocket = new VisualizationWebSocket(effectiveBaseUrl);
  } else {
    // Always update baseUrl to ensure it's valid
    const currentBaseUrl = window.visualizationWebSocket.baseUrl;
    if (!currentBaseUrl || !currentBaseUrl.startsWith('http')) {
      window.visualizationWebSocket.baseUrl = effectiveBaseUrl;
    }
  }
  
  return window.visualizationWebSocket;
}

/**
 * Get the singleton instance of VisualizationWebSocket
 * @returns {VisualizationWebSocket|null} WebSocket manager instance or null if not created
 */
export function getVisualizationWebSocket() {
  return window.visualizationWebSocket || null;
}

/**
 * Register a visualization event listener
 * @param {string} simulationId - ID of the simulation to register for
 * @param {function} callback - Function to call when events are received
 * @returns {Promise} A promise that resolves when registration is complete
 */
export async function registerVisualizationListener(simulationId, callback) {
  const socket = getVisualizationWebSocket();
  
  if (!socket) {
    throw new Error('Visualization WebSocket not initialized');
  }
  
  // Register event handler
  socket.onSimulationEvent(simulationId, callback);
  
  // Subscribe to events
  await socket.subscribe(simulationId);
  
  // Register the simulation on the server
  try {
    const response = await fetch(`${socket.baseUrl}/api/visualization/register-simulation/${simulationId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to register simulation: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error registering simulation:', error);
    throw error;
  }
}

/**
 * Unregister a visualization event listener
 * @param {string} simulationId - ID of the simulation to unregister from
 * @param {function} callback - Function to remove from event handlers
 * @returns {Promise} A promise that resolves when unregistration is complete
 */
export async function unregisterVisualizationListener(simulationId, callback) {
  const socket = getVisualizationWebSocket();
  
  if (!socket) {
    throw new Error('Visualization WebSocket not initialized');
  }
  
  // Unregister event handler
  socket.offSimulationEvent(simulationId, callback);
  
  // Unsubscribe from events
  await socket.unsubscribe(simulationId);
  
  // Unregister the simulation on the server
  try {
    const response = await fetch(`${socket.baseUrl}/api/visualization/unregister-simulation/${simulationId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to unregister simulation: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error unregistering simulation:', error);
    throw error;
  }
}

export default {
  createVisualizationWebSocket,
  getVisualizationWebSocket,
  registerVisualizationListener,
  unregisterVisualizationListener
}; 