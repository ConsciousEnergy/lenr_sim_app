/**
 * Physics API Module
 * Central export point for all physics-related functionality
 */

// Re-export all hooks from hooks.ts
export {
  useInitializeSimulation,
  useSimulationControl,
  useSimulationStatus,
  useSimulationResults,
  useUpdateParameters,
  useSimulationSnapshots,
  usePhysicsWebSocket
} from './hooks';

// Export all types
export * from './types';
