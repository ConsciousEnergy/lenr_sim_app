/**
 * Physics Engine WebSocket Client
 * 
 * This module provides a specialized client for handling real-time WebSocket 
 * communication with the Physics Engine API.
 */

import {
  WebSocketMessage,
  SimulationUpdateMessage,
  ParameterUpdateMessage,
  ControlCommandMessage,
  ControlCommand
} from './types';

// API base URL configuration
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';
const WS_BASE_URL = API_BASE_URL.replace(/^http/, 'ws');

/**
 * Event types for the WebSocket client
 */
export type WebSocketEventType = 
  | 'simulation_update'
  | 'parameter_update'
  | 'error'
  | 'open'
  | 'close';

/**
 * WebSocketClient for physics simulation real-time updates
 */
export class PhysicsWebSocketClient {
  private socket: WebSocket | null = null;
  private simulationId: string;
  private eventListeners: Record<WebSocketEventType, Array<(data: any) => void>> = {
    simulation_update: [],
    parameter_update: [],
    error: [],
    open: [],
    close: []
  };
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeoutMs = 2000;
  private reconnectTimeoutId: NodeJS.Timeout | null = null;
  private manualDisconnect = false;

  /**
   * Create a new Physics WebSocket client
   * @param simulationId - The ID of the simulation to connect to
   */
  constructor(simulationId: string) {
    this.simulationId = simulationId;
  }

  /**
   * Connect to the WebSocket server
   */
  connect(): void {
    if (this.socket) {
      this.disconnect();
    }

    this.manualDisconnect = false;
    this.socket = new WebSocket(`${WS_BASE_URL}/api/ws/physics/${this.simulationId}`);
    
    this.socket.onopen = () => {
      console.log(`WebSocket connected for simulation ${this.simulationId}`);
      this.reconnectAttempts = 0;
      this.triggerEvent('open', null);
    };
    
    this.socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as WebSocketMessage;
        
        switch (message.type) {
          case 'simulation_update':
            this.triggerEvent('simulation_update', message);
            break;
          case 'parameter_update':
            this.triggerEvent('parameter_update', message);
            break;
          case 'error':
            this.triggerEvent('error', message);
            break;
          default:
            console.warn('Unknown message type:', message);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
    
    this.socket.onclose = (event) => {
      console.log(`WebSocket closed for simulation ${this.simulationId}`, event);
      this.triggerEvent('close', { code: event.code, reason: event.reason });
      
      // Attempt to reconnect if not manually disconnected
      if (!this.manualDisconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectTimeoutId = setTimeout(() => {
          this.reconnectAttempts++;
          console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
          this.connect();
        }, this.reconnectTimeoutMs);
      }
    };
    
    this.socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.triggerEvent('error', { error: 'Connection error', details: 'Failed to connect to WebSocket server' });
    };
  }

  /**
   * Disconnect from the WebSocket server
   */
  disconnect(): void {
    this.manualDisconnect = true;
    
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }
    
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  /**
   * Send a parameter update message to the server
   */
  sendParameterUpdate(parameters: Record<string, any>): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not connected');
    }
    
    const message: ParameterUpdateMessage = {
      type: 'parameter_update',
      simulation_id: this.simulationId,
      parameters
    };
    
    this.socket.send(JSON.stringify(message));
  }

  /**
   * Send a control command to the server
   */
  sendControlCommand(command: ControlCommand): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not connected');
    }
    
    const message: ControlCommandMessage = {
      type: 'control_command',
      simulation_id: this.simulationId,
      command
    };
    
    this.socket.send(JSON.stringify(message));
  }

  /**
   * Add an event listener
   */
  addEventListener(event: WebSocketEventType, callback: (data: any) => void): () => void {
    this.eventListeners[event].push(callback);
    
    // Return a function to remove the listener
    return () => {
      this.eventListeners[event] = this.eventListeners[event].filter(cb => cb !== callback);
    };
  }

  /**
   * Trigger an event and call all registered listeners
   */
  private triggerEvent(event: WebSocketEventType, data: any): void {
    this.eventListeners[event].forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in ${event} event listener:`, error);
      }
    });
  }

  /**
   * Get the current connection status
   */
  get isConnected(): boolean {
    return this.socket !== null && this.socket.readyState === WebSocket.OPEN;
  }

  /**
   * Get the current WebSocket object
   */
  get connection(): WebSocket | null {
    return this.socket;
  }

  /**
   * Configure reconnection settings
   */
  configureReconnection(maxAttempts: number, timeoutMs: number): void {
    this.maxReconnectAttempts = maxAttempts;
    this.reconnectTimeoutMs = timeoutMs;
  }
} 