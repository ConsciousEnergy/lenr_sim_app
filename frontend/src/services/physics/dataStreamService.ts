/**
 * Physics Data Stream Service
 * 
 * This service manages WebSocket connections to the physics backend
 * and provides a unified API for subscribing to real-time physics data streams.
 * It handles connection lifecycle, data buffering, and subscription management.
 */

import { 
  PhysicsWebSocketClient 
} from '../../api/physics/websocketClient';
import { 
  SimulationUpdateMessage, 
  ParameterUpdateMessage,
  LatticeState,
  SimulationSummary,
  WebSocketMessage,
  ControlCommand
} from '../../api/physics/types';
import { PhysicsDataCache } from './dataCache';

// DTO for parameter updates
export type ParameterUpdate = Record<string, any>;

// Connection status
export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'error';

// Subscription callback types
export type SubscriptionCallback<T> = (data: T) => void;

// Subscription options
export interface SubscriptionOptions {
  bufferSize?: number;
  throttleMs?: number;
  filter?: (data: any) => boolean;
}

/**
 * Singleton service for managing physics data streams
 */
export class PhysicsDataStreamService {
  private static instance: PhysicsDataStreamService;
  
  // WebSocket client
  private wsClient: PhysicsWebSocketClient | null = null;
  private simulationId: string | null = null;
  private connectionStatus: ConnectionStatus = 'disconnected';
  
  // Data cache
  private cache: PhysicsDataCache;
  
  // Subscription management
  private subscriptions: Map<string, {
    callback: SubscriptionCallback<any>;
    options: SubscriptionOptions;
    type: 'simulation' | 'parameter' | 'lattice' | 'summary';
  }> = new Map();
  
  // Status listeners
  private statusListeners: Set<(status: ConnectionStatus) => void> = new Set();
  
  // Throttling
  private throttledUpdates: Map<string, NodeJS.Timeout> = new Map();
  
  /**
   * Get the singleton instance
   */
  public static getInstance(): PhysicsDataStreamService {
    if (!PhysicsDataStreamService.instance) {
      PhysicsDataStreamService.instance = new PhysicsDataStreamService();
    }
    return PhysicsDataStreamService.instance;
  }
  
  /**
   * Private constructor for singleton pattern
   */
  private constructor() {
    this.cache = new PhysicsDataCache();
    
    // Bind methods
    this.connect = this.connect.bind(this);
    this.disconnect = this.disconnect.bind(this);
    this.handleWebSocketMessage = this.handleWebSocketMessage.bind(this);
    this.subscribeToSimulationUpdates = this.subscribeToSimulationUpdates.bind(this);
    this.subscribeToParameterUpdates = this.subscribeToParameterUpdates.bind(this);
    this.subscribeToLatticeState = this.subscribeToLatticeState.bind(this);
    this.subscribeToSimulationSummary = this.subscribeToSimulationSummary.bind(this);
    this.unsubscribe = this.unsubscribe.bind(this);
    this.sendControlCommand = this.sendControlCommand.bind(this);
    this.sendParameterUpdate = this.sendParameterUpdate.bind(this);
    this.getBufferedUpdates = this.getBufferedUpdates.bind(this);
  }
  
  /**
   * Connect to the physics data stream
   */
  public connect(simulationId: string): void {
    // If already connected to this simulation, do nothing
    if (this.wsClient && this.simulationId === simulationId && this.connectionStatus === 'connected') {
      return;
    }
    
    // If connected to a different simulation, disconnect first
    if (this.wsClient && this.simulationId !== simulationId) {
      this.disconnect();
    }
    
    this.simulationId = simulationId;
    this.setConnectionStatus('connecting');
    
    try {
      // Create new WebSocket client
      this.wsClient = new PhysicsWebSocketClient(simulationId);
      
      // Set up event handlers
      this.wsClient.addEventListener('open', () => {
        this.setConnectionStatus('connected');
      });
      
      this.wsClient.addEventListener('close', () => {
        this.setConnectionStatus('disconnected');
      });
      
      this.wsClient.addEventListener('error', (error) => {
        console.error('WebSocket error:', error);
        this.setConnectionStatus('error');
      });
      
      this.wsClient.addEventListener('simulation_update', this.handleWebSocketMessage);
      this.wsClient.addEventListener('parameter_update', this.handleWebSocketMessage);
      
      // Connect to the WebSocket server
      this.wsClient.connect();
    } catch (error) {
      console.error('Failed to connect to physics data stream:', error);
      this.setConnectionStatus('error');
    }
  }
  
  /**
   * Disconnect from the physics data stream
   */
  public disconnect(): void {
    if (this.wsClient) {
      this.wsClient.disconnect();
      this.wsClient = null;
    }
    
    this.simulationId = null;
    this.setConnectionStatus('disconnected');
    
    // Clear all throttled updates
    this.throttledUpdates.forEach(timeout => clearTimeout(timeout));
    this.throttledUpdates.clear();
  }
  
  /**
   * Handle incoming WebSocket messages
   */
  private handleWebSocketMessage(message: WebSocketMessage): void {
    if (message.type === 'simulation_update') {
      // Add to cache
      this.cache.addSimulationUpdate(message);
      
      // Notify subscribers
      this.notifySubscribers('simulation', message);
      this.notifySubscribers('lattice', message.lattice);
      this.notifySubscribers('summary', message.summary);
    } 
    else if (message.type === 'parameter_update') {
      // Notify parameter subscribers
      this.notifySubscribers('parameter', message.parameters);
    }
    else if (message.type === 'error') {
      console.error('Error from physics server:', message.error);
    }
  }
  
  /**
   * Notify subscribers with new data
   */
  private notifySubscribers(type: 'simulation' | 'parameter' | 'lattice' | 'summary', data: any): void {
    // Find all subscriptions of this type
    this.subscriptions.forEach((subscription, id) => {
      if (subscription.type === type) {
        const { callback, options } = subscription;
        
        // Apply filter if provided
        if (options.filter && !options.filter(data)) {
          return;
        }
        
        // If throttling is enabled, handle it
        if (options.throttleMs && options.throttleMs > 0) {
          // Clear existing timeout
          if (this.throttledUpdates.has(id)) {
            clearTimeout(this.throttledUpdates.get(id));
          }
          
          // Set new timeout
          const timeout = setTimeout(() => {
            callback(data);
            this.throttledUpdates.delete(id);
          }, options.throttleMs);
          
          this.throttledUpdates.set(id, timeout);
        } else {
          // No throttling, call immediately
          callback(data);
        }
      }
    });
  }
  
  /**
   * Subscribe to simulation updates
   */
  public subscribeToSimulationUpdates(
    callback: SubscriptionCallback<SimulationUpdateMessage>,
    options: SubscriptionOptions = {}
  ): string {
    const id = this.generateSubscriptionId();
    
    this.subscriptions.set(id, {
      callback,
      options,
      type: 'simulation'
    });
    
    return id;
  }
  
  /**
   * Subscribe to parameter updates
   */
  public subscribeToParameterUpdates(
    callback: SubscriptionCallback<ParameterUpdate>,
    options: SubscriptionOptions = {}
  ): string {
    const id = this.generateSubscriptionId();
    
    this.subscriptions.set(id, {
      callback,
      options,
      type: 'parameter'
    });
    
    return id;
  }
  
  /**
   * Subscribe to lattice state updates
   */
  public subscribeToLatticeState(
    callback: SubscriptionCallback<LatticeState>,
    options: SubscriptionOptions = {}
  ): string {
    const id = this.generateSubscriptionId();
    
    this.subscriptions.set(id, {
      callback,
      options,
      type: 'lattice'
    });
    
    // If we already have data, send it immediately
    const lattice = this.cache.getLatticeState();
    if (lattice) {
      callback(lattice);
    }
    
    return id;
  }
  
  /**
   * Subscribe to simulation summary updates
   */
  public subscribeToSimulationSummary(
    callback: SubscriptionCallback<SimulationSummary>,
    options: SubscriptionOptions = {}
  ): string {
    const id = this.generateSubscriptionId();
    
    this.subscriptions.set(id, {
      callback,
      options,
      type: 'summary'
    });
    
    // If we already have data, send it immediately
    const summary = this.cache.getSimulationSummary();
    if (summary) {
      callback(summary);
    }
    
    return id;
  }
  
  /**
   * Unsubscribe from updates
   */
  public unsubscribe(subscriptionId: string): boolean {
    // Clear any throttled updates for this subscription
    if (this.throttledUpdates.has(subscriptionId)) {
      clearTimeout(this.throttledUpdates.get(subscriptionId));
      this.throttledUpdates.delete(subscriptionId);
    }
    
    return this.subscriptions.delete(subscriptionId);
  }
  
  /**
   * Send a control command to the simulation
   */
  public sendControlCommand(command: ControlCommand): void {
    if (!this.wsClient) {
      throw new Error('Not connected to physics data stream');
    }
    
    this.wsClient.sendControlCommand(command);
  }
  
  /**
   * Send a parameter update to the simulation
   */
  public sendParameterUpdate(parameters: ParameterUpdate): void {
    if (!this.wsClient) {
      throw new Error('Not connected to physics data stream');
    }
    
    this.wsClient.sendParameterUpdate(parameters);
  }
  
  /**
   * Get current connection status
   */
  public getConnectionStatus(): ConnectionStatus {
    return this.connectionStatus;
  }
  
  /**
   * Add a status listener
   */
  public addStatusListener(listener: (status: ConnectionStatus) => void): () => void {
    this.statusListeners.add(listener);
    
    // Immediately call with current status
    listener(this.connectionStatus);
    
    // Return function to remove listener
    return () => {
      this.statusListeners.delete(listener);
    };
  }
  
  /**
   * Get buffered simulation updates
   */
  public getBufferedUpdates(): SimulationUpdateMessage[] {
    return this.cache.getSimulationUpdates();
  }
  
  /**
   * Update the connection status and notify listeners
   */
  private setConnectionStatus(status: ConnectionStatus): void {
    this.connectionStatus = status;
    
    // Notify all listeners
    this.statusListeners.forEach(listener => {
      try {
        listener(status);
      } catch (error) {
        console.error('Error in status listener:', error);
      }
    });
  }
  
  /**
   * Generate a unique subscription ID
   */
  private generateSubscriptionId(): string {
    return Math.random().toString(36).substring(2, 15);
  }
  
  /**
   * Clear all data and subscriptions
   */
  public clear(): void {
    this.disconnect();
    
    this.cache.clearCache();
    this.subscriptions.clear();
    this.statusListeners.clear();
    
    this.throttledUpdates.forEach(timeout => clearTimeout(timeout));
    this.throttledUpdates.clear();
  }
} 