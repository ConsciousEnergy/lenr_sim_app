/**
 * Real-time Data Visualization WebSocket API
 * 
 * Provides hooks and utilities for connecting real-time data
 * feeds to visualization components.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { SimulationUpdateMessage } from './physics/types';

// API base URL configuration
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';
const WS_BASE_URL = API_BASE_URL.replace(/^http/, 'ws');

// Types for real-time data
export interface TimeSeriesDataPoint {
  timestamp: number;
  value: number;
  label?: string;
}

export interface DataSeries {
  id: string;
  name: string;
  color?: string;
  data: TimeSeriesDataPoint[];
  unit?: string;
  visible?: boolean;
}

export interface ChartDataMessage {
  type: 'chart_data';
  simulation_id: string;
  series_id: string;
  data: TimeSeriesDataPoint | TimeSeriesDataPoint[];
}

export interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

// Events that can be listened to 
export type RealtimeDataEventType = 
  | 'data_update'
  | 'error'
  | 'open'
  | 'close';

/**
 * Real-time data WebSocket client for visualization data
 */
export class RealtimeDataClient {
  private socket: WebSocket | null = null;
  private simulationId: string;
  private eventListeners: Record<RealtimeDataEventType, Array<(data: any) => void>> = {
    data_update: [],
    error: [],
    open: [],
    close: []
  };
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeoutMs = 2000;
  private reconnectTimeoutId: NodeJS.Timeout | null = null;
  private manualDisconnect = false;
  private dataSeries: Record<string, DataSeries> = {};

  /**
   * Create a new real-time data WebSocket client
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
    // Connect to the visualization WebSocket endpoint
    this.socket = new WebSocket(`${WS_BASE_URL}/api/visualization/ws/${this.simulationId}`);
    
    this.socket.onopen = () => {
      console.log(`Real-time data WebSocket connected for simulation ${this.simulationId}`);
      this.reconnectAttempts = 0;
      this.triggerEvent('open', null);
      
      // Subscribe to the simulation
      this.sendMessage({
        type: 'subscribe',
        simulation_id: this.simulationId
      });
    };
    
    this.socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as WebSocketMessage;
        
        // Process chart data
        if (message.type === 'chart_data' || 
            message.event_type === 'chart_data' ||
            message.data_type === 'chart_data') {
          this.handleChartData(message);
        } 
        // Handle general visualization events
        else if (message.event_type && message.data) {
          this.triggerEvent('data_update', message);
        }
        // Handle error messages
        else if (message.status === 'error') {
          this.triggerEvent('error', message);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
    
    this.socket.onclose = (event) => {
      console.log(`Real-time data WebSocket closed for simulation ${this.simulationId}`, event);
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
      console.error('Real-time data WebSocket error:', error);
      this.triggerEvent('error', { error: 'Connection error', details: 'Failed to connect to WebSocket server' });
    };
  }

  /**
   * Handle incoming chart data message
   */
  private handleChartData(message: any): void {
    const seriesId = message.series_id || message.id || 'default';
    const data = Array.isArray(message.data) ? message.data : [message.data];
    
    // Initialize series if it doesn't exist
    if (!this.dataSeries[seriesId]) {
      this.dataSeries[seriesId] = {
        id: seriesId,
        name: message.name || seriesId,
        color: message.color,
        data: [],
        unit: message.unit,
        visible: true
      };
    }
    
    // Add new data points
    this.dataSeries[seriesId].data = [
      ...this.dataSeries[seriesId].data,
      ...data
    ];
    
    // Limit data points to prevent memory issues (keep last 1000 points)
    const maxPoints = 1000;
    if (this.dataSeries[seriesId].data.length > maxPoints) {
      this.dataSeries[seriesId].data = this.dataSeries[seriesId].data.slice(-maxPoints);
    }
    
    // Trigger data update event with the updated series
    this.triggerEvent('data_update', {
      type: 'chart_data',
      series_id: seriesId,
      series: this.dataSeries[seriesId],
      allSeries: this.getAllSeries()
    });
  }

  /**
   * Get all data series
   */
  getAllSeries(): DataSeries[] {
    return Object.values(this.dataSeries);
  }

  /**
   * Get a specific data series by ID
   */
  getSeriesById(seriesId: string): DataSeries | null {
    return this.dataSeries[seriesId] || null;
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
      try {
        // Unsubscribe before disconnecting
        this.sendMessage({
          type: 'unsubscribe',
          simulation_id: this.simulationId
        });
      } catch (error) {
        // Ignore errors during disconnect
      }
      
      this.socket.close();
      this.socket = null;
    }
  }

  /**
   * Send a message to the WebSocket server
   */
  sendMessage(message: any): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not connected');
    }
    
    this.socket.send(JSON.stringify(message));
  }

  /**
   * Add an event listener
   */
  addEventListener(event: RealtimeDataEventType, callback: (data: any) => void): () => void {
    this.eventListeners[event].push(callback);
    
    // Return a function to remove the listener
    return () => {
      this.eventListeners[event] = this.eventListeners[event].filter(cb => cb !== callback);
    };
  }

  /**
   * Trigger an event and call all registered listeners
   */
  private triggerEvent(event: RealtimeDataEventType, data: any): void {
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
   * Clear all data series
   */
  clearData(): void {
    this.dataSeries = {};
  }
}

/**
 * Hook for using real-time data WebSocket
 */
export function useRealtimeData(simulationId: string | null) {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [dataSeries, setDataSeries] = useState<DataSeries[]>([]);
  const clientRef = useRef<RealtimeDataClient | null>(null);

  // Initialize and connect WebSocket client
  useEffect(() => {
    if (!simulationId) return;

    // Create a new client
    const client = new RealtimeDataClient(simulationId);
    clientRef.current = client;

    // Set up event listeners
    const removeOpenListener = client.addEventListener('open', () => {
      setIsConnected(true);
      setError(null);
    });

    const removeCloseListener = client.addEventListener('close', () => {
      setIsConnected(false);
    });

    const removeErrorListener = client.addEventListener('error', (err) => {
      setError(new Error(err.message || 'WebSocket connection error'));
    });

    const removeDataListener = client.addEventListener('data_update', (data) => {
      if (data.allSeries) {
        setDataSeries(data.allSeries);
      }
    });

    // Connect
    client.connect();

    // Clean up
    return () => {
      removeOpenListener();
      removeCloseListener();
      removeErrorListener();
      removeDataListener();
      client.disconnect();
    };
  }, [simulationId]);

  // Function to manually reconnect
  const reconnect = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.disconnect();
      clientRef.current.connect();
    }
  }, []);

  // Function to clear data
  const clearData = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.clearData();
      setDataSeries([]);
    }
  }, []);

  return {
    isConnected,
    error,
    dataSeries,
    reconnect,
    clearData,
    client: clientRef.current
  };
} 