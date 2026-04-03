/**
 * Physics Data Stream Service React Hooks
 * 
 * Provides React hooks for components to easily subscribe to physics data streams.
 * Handles subscription lifecycle based on component mounting/unmounting.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { PhysicsDataStreamService, ConnectionStatus, SubscriptionOptions } from './dataStreamService';
import {
  SimulationUpdateMessage,
  ParameterUpdateMessage,
  LatticeState,
  SimulationSummary
} from '../../api/physics/types';

/**
 * Hook for managing connection to the physics data stream service
 */
export function usePhysicsDataStream(simulationId: string | null) {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const service = PhysicsDataStreamService.getInstance();
  
  // Connect to the service
  useEffect(() => {
    if (!simulationId) return;

    // Connect to the service
    service.connect(simulationId);
    
    // Add status listener
    const removeListener = service.addStatusListener(setStatus);
    
    // Cleanup on unmount
    return () => {
      removeListener();
    };
  }, [simulationId, service]);
  
  // Function to send control commands
  const sendControlCommand = useCallback((command: 'start' | 'pause' | 'resume' | 'reset' | 'stop') => {
    return service.sendControlCommand(command);
  }, [service]);
  
  // Function to send parameter updates
  const sendParameterUpdate = useCallback((parameters: Record<string, any>) => {
    return service.sendParameterUpdate(parameters);
  }, [service]);
  
  // Function to disconnect
  const disconnect = useCallback(() => {
    service.disconnect();
  }, [service]);
  
  return {
    status,
    isConnected: status === 'connected',
    sendControlCommand,
    sendParameterUpdate,
    disconnect
  };
}

/**
 * Hook for subscribing to simulation updates
 */
export function useSimulationUpdates(
  simulationId: string | null,
  options: SubscriptionOptions = {}
) {
  const [updates, setUpdates] = useState<SimulationUpdateMessage[]>([]);
  const [latestUpdate, setLatestUpdate] = useState<SimulationUpdateMessage | null>(null);
  const subscriptionIdRef = useRef<string | null>(null);
  const service = PhysicsDataStreamService.getInstance();
  
  // Subscribe to simulation updates
  useEffect(() => {
    if (!simulationId) return;
    
    // Connect to the service if not already connected
    service.connect(simulationId);
    
    // Subscribe to updates
    const subscriptionId = service.subscribeToSimulationUpdates((update) => {
      setLatestUpdate(update);
      setUpdates(prev => {
        // Limit array size to prevent memory issues
        const maxSize = options.bufferSize || 100;
        const newUpdates = [...prev, update];
        return newUpdates.length > maxSize ? newUpdates.slice(-maxSize) : newUpdates;
      });
    }, options);
    
    subscriptionIdRef.current = subscriptionId;
    
    // Load existing buffer
    const bufferedUpdates = service.getBufferedUpdates();
    if (bufferedUpdates.length > 0) {
      setUpdates(bufferedUpdates);
      setLatestUpdate(bufferedUpdates[bufferedUpdates.length - 1]);
    }
    
    // Cleanup on unmount
    return () => {
      if (subscriptionIdRef.current) {
        service.unsubscribe(subscriptionIdRef.current);
        subscriptionIdRef.current = null;
      }
    };
  }, [simulationId, options, service]);
  
  // Function to clear updates
  const clearUpdates = useCallback(() => {
    setUpdates([]);
    setLatestUpdate(null);
  }, []);
  
  return { updates, latestUpdate, clearUpdates };
}

/**
 * Hook for subscribing to parameter updates
 */
export function useParameterUpdates(
  simulationId: string | null,
  options: SubscriptionOptions = {}
) {
  const [latestUpdate, setLatestUpdate] = useState<ParameterUpdateMessage | null>(null);
  const subscriptionIdRef = useRef<string | null>(null);
  const service = PhysicsDataStreamService.getInstance();
  
  // Subscribe to parameter updates
  useEffect(() => {
    if (!simulationId) return;
    
    // Connect to the service if not already connected
    service.connect(simulationId);
    
    // Subscribe to updates
    const subscriptionId = service.subscribeToParameterUpdates((update) => {
      // Convert to the proper format if needed
      setLatestUpdate({
        type: 'parameter_update',
        simulation_id: simulationId,
        parameters: update,
        timestamp: Date.now()
      } as ParameterUpdateMessage);
    }, options);
    
    subscriptionIdRef.current = subscriptionId;
    
    // Cleanup on unmount
    return () => {
      if (subscriptionIdRef.current) {
        service.unsubscribe(subscriptionIdRef.current);
        subscriptionIdRef.current = null;
      }
    };
  }, [simulationId, options, service]);
  
  return { 
    parameters: latestUpdate?.parameters, 
    latestUpdate 
  };
}

/**
 * Hook for subscribing to lattice state updates
 */
export function useLatticeState(
  simulationId: string | null,
  options: SubscriptionOptions = {}
) {
  const [lattice, setLattice] = useState<LatticeState | null>(null);
  const subscriptionIdRef = useRef<string | null>(null);
  const service = PhysicsDataStreamService.getInstance();
  
  // Subscribe to lattice state updates
  useEffect(() => {
    if (!simulationId) return;
    
    // Connect to the service if not already connected
    service.connect(simulationId);
    
    // Subscribe to updates
    const subscriptionId = service.subscribeToLatticeState((latticeState) => {
      setLattice(latticeState);
    }, options);
    
    subscriptionIdRef.current = subscriptionId;
    
    // Cleanup on unmount
    return () => {
      if (subscriptionIdRef.current) {
        service.unsubscribe(subscriptionIdRef.current);
        subscriptionIdRef.current = null;
      }
    };
  }, [simulationId, options, service]);
  
  return { lattice };
}

/**
 * Hook for subscribing to simulation summary updates
 */
export function useSimulationSummary(
  simulationId: string | null,
  options: SubscriptionOptions = {}
) {
  const [summary, setSummary] = useState<SimulationSummary | null>(null);
  const subscriptionIdRef = useRef<string | null>(null);
  const service = PhysicsDataStreamService.getInstance();
  
  // Subscribe to summary updates
  useEffect(() => {
    if (!simulationId) return;
    
    // Connect to the service if not already connected
    service.connect(simulationId);
    
    // Subscribe to updates
    const subscriptionId = service.subscribeToSimulationSummary((summaryData) => {
      setSummary(summaryData);
    }, options);
    
    subscriptionIdRef.current = subscriptionId;
    
    // Cleanup on unmount
    return () => {
      if (subscriptionIdRef.current) {
        service.unsubscribe(subscriptionIdRef.current);
        subscriptionIdRef.current = null;
      }
    };
  }, [simulationId, options, service]);
  
  return { summary };
}

/**
 * Hook that provides access to multiple data types at once
 */
export function usePhysicsData(
  simulationId: string | null,
  options: SubscriptionOptions = {}
) {
  const { status, isConnected, sendControlCommand, sendParameterUpdate } = usePhysicsDataStream(simulationId);
  const { updates, latestUpdate } = useSimulationUpdates(simulationId, options);
  const { parameters } = useParameterUpdates(simulationId, options);
  const { lattice } = useLatticeState(simulationId, options);
  const { summary } = useSimulationSummary(simulationId, options);
  
  return {
    status,
    isConnected,
    sendControlCommand,
    sendParameterUpdate,
    updates,
    latestUpdate,
    parameters,
    lattice,
    summary
  };
} 