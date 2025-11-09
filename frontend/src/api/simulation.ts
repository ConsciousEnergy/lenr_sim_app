import { api } from './client';

// Types for simulation API
export interface SimulationParameters {
  temperature: number;
  pressure: number;
  loading_ratio: number;
  lattice_constant: number;
  defect_density: number;
  simulation_time: number;
  timestep: number;
  mechanisms: string[];
  material: string;
  reactions: string[];
}

export interface SimulationResult {
  id: string;
  parameters: SimulationParameters;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  start_time: string;
  end_time?: string;
  results?: {
    reaction_rates: Record<string, number>;
    power_density: number;
    enhancement_factors: Record<string, number>;
    phonon_spectrum?: number[];
    temperature_profile?: number[];
    energy_distribution?: number[];
  };
  errors?: string[];
}

export interface LatticeState {
  positions: number[][];
  elements: string[];
  velocities?: number[][];
  forces?: number[][];
  energies?: number[];
  temperature: number;
  lattice_parameters: [number, number, number];
  angles: [number, number, number];
}

export interface PhononMode {
  frequency: number;
  amplitude: number;
  wavevector: number[];
  polarization: 'longitudinal' | 'transverse';
  atoms_involved: number[];
}

export interface PhononResult {
  modes: PhononMode[];
  dispersion_relation: {
    wavevectors: number[][];
    frequencies: number[][];
  };
  density_of_states: {
    frequencies: number[];
    values: number[];
  };
}

// Simulation API service
export const simulationApi = {
  // Simulation management
  initializeSimulation: (parameters: SimulationParameters) =>
    api.post<SimulationResult>('/simulation/initialize', parameters),

  startSimulation: (id: string) =>
    api.post<SimulationResult>(`/simulation/${id}/start`),

  pauseSimulation: (id: string) =>
    api.post<SimulationResult>(`/simulation/${id}/pause`),

  stopSimulation: (id: string) =>
    api.post<SimulationResult>(`/simulation/${id}/stop`),

  getSimulationStatus: (id: string) =>
    api.get<SimulationResult>(`/simulation/${id}/status`),

  getSimulationResults: (id: string) =>
    api.get<SimulationResult>(`/simulation/${id}/results`),

  listSimulations: (status?: 'pending' | 'running' | 'completed' | 'failed') =>
    api.get<SimulationResult[]>('/simulation/list', { status }),

  deleteSimulation: (id: string) =>
    api.delete<void>(`/simulation/${id}`),

  // Lattice operations
  getLatticeState: (id: string) =>
    api.get<LatticeState>(`/simulation/${id}/lattice`),

  updateLattice: (id: string, positions: number[][]) =>
    api.post<LatticeState>(`/simulation/${id}/lattice`, { positions }),

  // Phonon calculations
  calculatePhonons: (id: string, params?: { kpoints?: number, max_frequency?: number }) =>
    api.post<PhononResult>(`/simulation/${id}/phonons`, params),

  // Saving and loading
  exportSimulation: (id: string, format: 'json' | 'csv' = 'json') =>
    api.get<Blob>(`/simulation/${id}/export`, { format }, {
      responseType: 'blob'
    }),

  importSimulation: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<SimulationResult>('/simulation/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // Parameter defaults and presets
  getDefaultParameters: () =>
    api.get<SimulationParameters>('/simulation/defaults'),

  getParameterPresets: () =>
    api.get<Record<string, SimulationParameters>>('/simulation/presets'),

  saveParameterPreset: (name: string, parameters: SimulationParameters) =>
    api.post<void>('/simulation/presets', { name, parameters }),

  deleteParameterPreset: (name: string) =>
    api.delete<void>(`/simulation/presets/${name}`),
}; 