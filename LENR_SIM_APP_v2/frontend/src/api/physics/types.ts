/**
 * Physics API TypeScript Type Definitions
 * Complete type definitions matching the actual backend API structure (snake_case)
 */

// ============================================================================
// ENUMS AND CONSTANTS
// ============================================================================

export type ModelType = 'quantum_tunneling' | 'lenr' | 'fusion' | 'bubble_fusion' | 'electron_screening';
export type LatticeType = 'fcc' | 'bcc' | 'hcp' | 'simple_cubic';
export type SimulationStatus = 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'error' | 'initialized';
export type ControlCommand = 'start' | 'pause' | 'resume' | 'stop' | 'reset';

// ============================================================================
// LATTICE DATA STRUCTURES
// ============================================================================

export interface LatticePoint {
  id?: string;
  position: [number, number, number];
  element?: string;
  energy?: number;
  temperature?: number;
  velocity?: [number, number, number];
  occupation?: number;
  occupancy?: number;
  reaction_rate?: number;
  reactionRate?: number;
  [key: string]: any;
}

export interface LatticeState {
  points: LatticePoint[];
  dimensions: [number, number, number];
  latticeType?: LatticeType;
  type?: LatticeType;
  temperature?: number;
  energy?: number;
  step?: number;
  time?: number;
  connections?: Array<[number, number]>;
}

export interface LatticeElement {
  symbol: string;
  atomic_number?: number;
  mass?: number;
  [key: string]: any;
}

export interface LatticeConfig {
  type: LatticeType;
  dimensions: [number, number, number];
  constants?: [number, number, number];
  elements: LatticeElement[];
}

// ============================================================================
// SIMULATION CONFIGURATION
// ============================================================================

export interface SimulationConditions {
  temperature: number;
  pressure?: number;
  [key: string]: any;
}

export interface SimulationParameters {
  total_steps: number;
  time_step?: number;
  output_interval?: number;
  [key: string]: any;
}

export interface ModelConfig {
  model_type: ModelType;
  parameters: Record<string, any>;
}

export interface SimulationInitializeRequest {
  simulation_id?: string;
  models: ModelConfig[];
  lattice: LatticeConfig;
  conditions: SimulationConditions;
  simulation_parameters: SimulationParameters;
  // Legacy support
  config?: SimulationConfig;
  modelType?: ModelType;
  parameters?: Record<string, any>;
}

// Legacy interface
export interface SimulationConfig {
  modelType?: ModelType;
  latticeType?: LatticeType;
  temperature?: number;
  pressure?: number;
  duration?: number;
  timestep?: number;
  reactionType?: string;
  parameters?: Record<string, any>;
  [key: string]: any;
}

export interface SimulationInitializeResponse {
  simulation_id: string;
  status: SimulationStatus;
  websocket_url?: string;
  models?: string[];
  initialized_at?: string;
  message?: string;
  // Legacy camelCase support
  simulationId?: string;
}

// ============================================================================
// SIMULATION STATE
// ============================================================================

export interface SimulationState {
  id: string;
  status: SimulationStatus;
  progress: number;
  startTime?: number;
  endTime?: number;
  currentStep?: number;
  totalSteps?: number;
  error?: string;
}

export interface SimulationStatusResponse {
  simulation_id: string;
  status: SimulationStatus;
  progress?: number;
  current_step?: number;
  total_steps?: number;
  elapsed_time?: number;
  wall_time?: number;
  start_time?: number;
  estimatedTimeRemaining?: number;
  // Legacy camelCase support
  simulationId?: string;
  currentStep?: number;
  totalSteps?: number;
  elapsedTime?: number;
  startTime?: number;
}

// ============================================================================
// SIMULATION CONTROL
// ============================================================================

export interface SimulationControlResponse {
  simulation_id: string;
  status: SimulationStatus;
  message?: string;
  started_at?: string;
  paused_at?: string;
  resumed_at?: string;
  reset_at?: string;
  restored_at?: string;
  snapshot_id?: string;
  // Legacy camelCase support
  simulationId?: string;
}

// ============================================================================
// PARAMETER UPDATES
// ============================================================================

export interface ParameterUpdateRequest {
  simulationId?: string;
  parameters?: Record<string, any>;
  conditions?: SimulationConditions;
  models?: ModelConfig[];
  [key: string]: any;
}

export interface ParameterUpdateResponse {
  success?: boolean;
  simulation_id?: string;
  status?: string;
  updated_at?: string;
  message?: string;
  updatedParameters?: Record<string, any>;
  [key: string]: any;
}

export interface ParameterUpdateMessage {
  type: 'parameter_update';
  simulationId?: string;
  simulation_id?: string;
  parameters?: Record<string, any>;
  timestamp?: number;
  [key: string]: any;
}

// ============================================================================
// SNAPSHOTS
// ============================================================================

export interface SnapshotRequest {
  simulationId?: string;
  step?: number;
  name?: string;
  description?: string;
  [key: string]: any;
}

export interface SimulationSnapshot {
  step?: number;
  timestamp?: number;
  state?: any;
  data?: any;
  latticeState?: LatticeState;
  // Backend format
  id?: string;
  snapshot_id?: string;
  name?: string;
  description?: string;
  created_at?: string;
  createdAt?: string;
  [key: string]: any;
}

export interface SnapshotResponse {
  snapshot?: SimulationSnapshot;
  simulation_id?: string;
  snapshot_id?: string;
  name?: string;
  created_at?: string;
  [key: string]: any;
}

export interface SnapshotListResponse {
  simulation_id?: string;
  snapshots: SimulationSnapshot[];
  count?: number;
}

// ============================================================================
// SIMULATION RESULTS
// ============================================================================

export interface SimulationResult {
  id: string;
  status: SimulationStatus;
  results?: {
    rate?: number;
    crossSection?: number;
    probability?: number;
    energy?: number;
    efficiency?: number;
    [key: string]: any;
  };
  data?: Array<{
    time: number;
    [key: string]: number;
  }>;
  metadata?: {
    [key: string]: any;
  };
}

export interface SimulationSummary {
  totalSteps?: number;
  completedSteps?: number;
  totalReactions?: number;
  averageEnergy?: number;
  averageTemperature?: number;
  reaction_counts?: Record<string, number>;
  // Backend format (snake_case)
  total_steps?: number;
  completed_steps?: number;
  total_reactions?: number;
  average_energy?: number;
  average_temperature?: number;
  total_energy?: number;
  [key: string]: any;
}

export interface SimulationResultsResponse {
  simulation_id: string;
  step?: number;
  time?: number;
  results?: any;
  lattice?: LatticeState;
  latticeState?: LatticeState;
  summary?: SimulationSummary;
  format?: 'json' | 'csv';
  // Legacy camelCase support
  simulationId?: string;
}

// ============================================================================
// WEBSOCKET MESSAGES
// ============================================================================

export interface WebSocketMessage {
  type: 'update' | 'error' | 'complete' | 'status' | 'parameter_update' | 'control' | 'simulation_update';
  simulationId?: string;
  simulation_id?: string;
  data?: any;
  timestamp?: number;
  // Additional properties that might be present
  step?: number;
  time?: number;
  lattice?: LatticeState;
  summary?: SimulationSummary;
  parameters?: Record<string, any>;
  error?: string;
  message?: string;
  command?: ControlCommand;
  [key: string]: any;
}

export interface SimulationUpdateMessage {
  type: 'simulation_update';
  simulationId?: string;
  simulation_id?: string;
  step?: number;
  time?: number;
  lattice?: LatticeState;
  summary?: SimulationSummary;
  timestamp?: number;
  [key: string]: any;
}

export interface ControlCommandMessage {
  type: 'control' | 'control_command';
  simulationId?: string;
  simulation_id?: string;
  command?: ControlCommand;
  timestamp?: number;
  [key: string]: any;
}

// ============================================================================
// PHYSICS WEBSOCKET
// ============================================================================

export interface PhysicsWebSocketMessage {
  type: 'update' | 'error' | 'complete' | 'status';
  simulationId: string;
  simulation_id?: string;
  data: any;
  timestamp: number;
}
