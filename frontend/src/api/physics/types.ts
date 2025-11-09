/**
 * Physics Engine Integration API Types
 * 
 * This file contains TypeScript type definitions for the Physics Engine API.
 * These types correspond to the API documented in backend/app/docs/physics_api_specification.md
 */

// Common Types

export type SimulationStatus = 
  | 'initialized' 
  | 'running' 
  | 'paused' 
  | 'completed' 
  | 'error';

export type ModelType =
  | 'quantum_tunneling'
  | 'phonon_modes'
  | 'electron_screening'
  | 'thermal_diffusion'
  | 'fracture_dynamics';

export type LatticeType = 
  | 'fcc'  // Face-centered cubic
  | 'bcc'  // Body-centered cubic
  | 'hcp'  // Hexagonal close-packed
  | 'simple_cubic'
  | 'diamond';

export type WebSocketMessageType =
  | 'simulation_update'
  | 'parameter_update'
  | 'control_command'
  | 'error';

export type ControlCommand =
  | 'start'
  | 'pause'
  | 'resume'
  | 'reset'
  | 'stop';

// Interface Definitions

export interface PhysicsModel {
  model_type: ModelType;
  parameters: Record<string, any>;
}

export interface LatticeElement {
  symbol: string;
  position: [number, number, number];
  occupancy: number;
}

export interface LatticeDefinition {
  type: LatticeType;
  dimensions: [number, number, number];
  constants: [number, number, number];
  elements: LatticeElement[];
}

export interface SimulationConditions {
  temperature: number;
  pressure: number;
  electric_field?: [number, number, number];
  magnetic_field?: [number, number, number];
}

export interface SimulationParameters {
  time_step: number;
  total_steps: number;
  save_frequency: number;
}

// API Request Types

export interface SimulationInitializeRequest {
  simulation_id?: string;
  models: PhysicsModel[];
  lattice: LatticeDefinition;
  conditions: SimulationConditions;
  simulation_parameters: SimulationParameters;
}

export interface ParameterUpdateRequest {
  conditions?: Partial<SimulationConditions>;
  models?: Partial<PhysicsModel>[];
}

export interface SnapshotRequest {
  name?: string;
  description?: string;
}

// API Response Types

export interface SimulationInitializeResponse {
  simulation_id: string;
  status: SimulationStatus;
  websocket_url: string;
  models: string[];
  initialized_at: string;
}

export interface SimulationControlResponse {
  simulation_id: string;
  status: SimulationStatus;
  [key: string]: any; // For timestamp fields like started_at, paused_at, etc.
}

export interface ParameterUpdateResponse {
  simulation_id: string;
  status: 'parameters_updated';
  updated_at: string;
}

export interface SnapshotResponse {
  simulation_id: string;
  snapshot_id: string;
  name?: string;
  created_at: string;
}

export interface SnapshotListResponse {
  simulation_id: string;
  snapshots: Array<{
    snapshot_id: string;
    name?: string;
    description?: string;
    created_at: string;
  }>;
}

export interface SimulationStatusResponse {
  simulation_id: string;
  status: SimulationStatus;
  current_step: number;
  total_steps: number;
  elapsed_time: number;
  wall_time: number;
  error?: string;
}

export interface LatticePoint {
  position: [number, number, number];
  element: string;
  energy: number;
  temperature: number;
  reaction_rate: number;
}

export interface LatticeState {
  dimensions: [number, number, number];
  points: LatticePoint[];
  connections: [number, number][];
}

export interface SimulationSummary {
  average_temperature: number;
  total_energy: number;
  reaction_counts: Record<string, number>;
  reaction_rate?: number;
}

export interface SimulationResultsResponse {
  simulation_id: string;
  step: number;
  time: number;
  lattice: LatticeState;
  summary: SimulationSummary;
}

// WebSocket Message Types

export interface SimulationUpdateMessage {
  type: 'simulation_update';
  simulation_id: string;
  step: number;
  time: number;
  lattice: LatticeState;
  summary: SimulationSummary;
}

export interface ParameterUpdateMessage {
  type: 'parameter_update';
  simulation_id: string;
  parameters: Record<string, any>;
}

export interface ControlCommandMessage {
  type: 'control_command';
  simulation_id: string;
  command: ControlCommand;
}

export interface ErrorMessage {
  type: 'error';
  error: string;
  code: string;
  details: string;
  timestamp: string;
}

export type WebSocketMessage = 
  | SimulationUpdateMessage
  | ParameterUpdateMessage
  | ControlCommandMessage
  | ErrorMessage; 