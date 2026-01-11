/**
 * Physics Engine API
 * 
 * This module exports all components of the Physics Engine Integration API.
 */

// Export types
export * from './types';

// Export API client
export { physicsApiClient } from './physicsApiClient';

// Export WebSocket client
export { PhysicsWebSocketClient } from './websocketClient';
export type { WebSocketEventType } from './websocketClient';

// Export React hooks
export {
  useInitializeSimulation,
  useSimulationControl,
  useSimulationStatus,
  useSimulationResults,
  useUpdateParameters,
  useSimulationSnapshots,
  usePhysicsWebSocket
} from './hooks'; 