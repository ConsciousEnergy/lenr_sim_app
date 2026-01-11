import { api } from './client';

// Types for physics API
export interface EnhancementResult {
  combined_enhancement_factor: number;
  log_combined_enhancement: number;
  mechanisms_used: string[];
  individual_enhancements: Record<string, number>;
  timestamp: string;
}

export interface ReactionResult {
  reaction_name: string;
  temperature_K: number;
  density1_m3: number;
  density2_m3: number;
  coulomb_barrier_eV: number;
  energy_eV: number;
  base_probability: number;
  enhancement_factor: number;
  log_enhancement: number;
  enhanced_probability: number;
  cross_section_m2: number;
  rate_coefficient_m3_s: number;
  reaction_rate_m3_s: number;
  power_density_W_m3: number;
  q_value_MeV: number;
  timestamp: string;
  enhancement_details: EnhancementResult;
}

export interface FusionProduct {
  name: string;
  z: number;
  a: number;
  branch_ratio: number;
}

export interface FusionReaction {
  name: string;
  reactant1_z: number;
  reactant1_a: number;
  reactant2_z: number;
  reactant2_a: number;
  products: FusionProduct[];
  q_value: number;
}

export interface TemperatureComparisonResult {
  reaction_name: string;
  temperatures: number[];
  enhancement_factors: number[];
  reaction_rates: number[];
  power_densities: number[];
}

export interface ReactionComparisonResult {
  temperature: number;
  density: number;
  reactions: string[];
  enhancement_factors: number[];
  reaction_rates: number[];
  power_densities: number[];
}

export interface MechanismContribution {
  enhancement_factor: number;
  log_enhancement: number;
  contribution_ratio: number;
}

export interface MechanismAnalysisResult {
  reaction_name: string;
  temperature: number;
  density: number;
  full_enhancement: number;
  log_full_enhancement: number;
  individual_results: Record<string, MechanismContribution>;
  dominant_mechanism?: string;
  dominant_enhancement?: number;
}

export interface EnhancementConfig {
  temperature: number;
  density: number;
  reactant1_z: number;
  reactant1_a: number;
  reactant2_z: number;
  reactant2_a: number;
  [key: string]: number | string | boolean;
}

// Physics API service
export const physicsApi = {
  // Enhancement calculations
  calculateEnhancement: (config: EnhancementConfig, mechanisms?: string[]) =>
    api.post<EnhancementResult>('/physics/enhancement', { config, mechanisms }),

  // Reaction calculations
  calculateReaction: (
    reaction_name: string,
    temperature: number,
    density1: number,
    density2: number,
    mechanisms?: string[]
  ) =>
    api.post<ReactionResult>('/physics/reaction', {
      reaction_name,
      temperature,
      density1,
      density2,
      mechanisms,
    }),

  // Temperature comparison
  compareTemperatures: (
    reaction_name: string,
    temperatures: number[],
    density1: number,
    density2: number,
    mechanisms?: string[]
  ) =>
    api.post<TemperatureComparisonResult>('/physics/compare-temperatures', {
      reaction_name,
      temperatures,
      density1,
      density2,
      mechanisms,
    }),

  // Reaction comparison
  compareReactions: (temperature: number, density: number, mechanisms?: string[]) =>
    api.post<ReactionComparisonResult>('/physics/compare-reactions', {
      temperature,
      density,
      mechanisms,
    }),

  // Mechanism analysis
  analyzeMechanisms: (
    reaction_name: string,
    temperature: number,
    density: number,
    mechanisms?: string[]
  ) =>
    api.post<MechanismAnalysisResult>('/physics/analyze-mechanisms', {
      reaction_name,
      temperature,
      density,
      mechanisms,
    }),

  // Reaction management
  listReactions: () => api.get<FusionReaction[]>('/physics/reactions'),
  
  getReaction: (name: string) => api.get<FusionReaction>(`/physics/reactions/${name}`),
  
  createReaction: (reaction: FusionReaction) => 
    api.post<FusionReaction, FusionReaction>('/physics/reactions', reaction),
    
  updateReaction: (reaction: FusionReaction) => 
    api.put<FusionReaction, FusionReaction>(`/physics/reactions/${reaction.name}`, reaction),
    
  deleteReaction: (name: string) => 
    api.delete<void>(`/physics/reactions/${name}`),
    
  validateReaction: (reaction: FusionReaction) => 
    api.post<{valid: boolean, errors?: string[]}, FusionReaction>('/physics/validate-reaction', reaction),
}; 