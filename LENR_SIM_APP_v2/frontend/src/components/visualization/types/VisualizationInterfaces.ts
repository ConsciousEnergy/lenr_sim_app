/**
 * Visualization-related interfaces for the LENR visualization components
 */

// Material properties 
export interface MaterialProperty {
  color: number;
  name: string;
  latticeConstant?: number; // in Angstroms
  structure?: string;
  atomicRadius: number;
}

// Material properties and colors
export interface MaterialProperties {
  [key: string]: MaterialProperty;
}

// LENR color theme
export interface LENRColors {
  primary: {
    main: number;
    light: number;
  };
  secondary: {
    main: number;
  };
  elementColors: {
    palladium: number;
    nickel: number;
    titanium: number;
    deuterium: number;
    energy: number;
  };
  visualization: {
    background: number;
  };
}

// Legend item for visualization
export interface LegendItem {
  color: string | number;
  label: string;
}

// Visualization info displayed to the user
export interface VisualizationInfo {
  totalAtoms: number;
  latticeType: string;
  material?: string;
  temperature: number;
  fusionEvents: number;
  enhancedRegions?: number;
  timestamp?: string;
}

// Playback controls for the visualization
export interface PlaybackControls {
  totalFrames: number;
  startTime: number;
  endTime: number;
  timeUnit: string;
}

// Reaction event in the lattice
export interface ReactionEvent {
  position?: {
    x: number;
    y: number;
    z: number;
  };
  coordinates?: {
    x: number;
    y: number;
    z: number;
  };
  intensity?: number;
  type?: string;
}

// Enhancement region data
export interface EnhancementRegion {
  coordinates: {
    x: number;
    y: number;
    z: number;
  };
  radius?: number;
  intensity?: number;
  type?: string;
}

// Enhancement data structure
export interface EnhancementData {
  regions?: EnhancementRegion[];
  enhancementFactor?: number;
  coherenceFactor?: number;
  phononAssist?: number;
  activeRegions?: number;
  maxTemperature?: number;
}

// Lattice data structure
export interface LatticeData {
  material?: string;
  temperature?: number;
  pressure?: number;
  atoms?: any[];
  lattice_constant?: number;
  loading_ratio?: number;
  type?: string;
  overall_kinetic_energy?: number;
  overall_potential_energy?: number;
}

// Fusion data structure
export interface FusionData {
  events: ReactionEvent[];
}

// Complete visualization data structure
export interface VisualizationData {
  latticeData?: LatticeData;
  fusionData?: FusionData;
  fusionEvents?: ReactionEvent[];
  enhancementData?: EnhancementData;
} 