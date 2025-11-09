/**
 * Component-related interfaces for the LENR visualization components
 */
import * as THREE from "three";
import { VisualizationData } from './VisualizationInterfaces';

// Props for the UnifiedLENRVisualizer component
export interface UnifiedLENRVisualizerProps {
  visualizationData?: VisualizationData;
  showLattice?: boolean;
  showFusion?: boolean;
  showEnhancement?: boolean;
  loading?: boolean;
}

// WebGL Help Dialog props
export interface WebGLHelpDialogProps {
  onClose: () => void;
}

// State type for the UnifiedLENRVisualizer component
export interface UnifiedLENRVisualizerState {
  // Visualization objects state
  latticeObjects: THREE.Object3D[];
  fusionObjects: THREE.Object3D[];
  enhancementObjects: THREE.Object3D[];
  
  // Playback state
  currentFrame: number;
  isPlaying: boolean;
  playbackControls: {
    totalFrames: number;
    startTime: number;
    endTime: number;
    timeUnit: string;
  };
  
  // Error handling
  errorMessage: string | null;
  error: string | null;
  
  // UI settings
  theme: 'light' | 'dark';
  debugMode: boolean;
  fps: number;
  particleCount: number;
  showInfo: boolean;
  legendItems: { color: string | number; label: string }[];
  visualizationInfo: {
    totalAtoms: number;
    latticeType: string;
    material?: string;
    temperature: number;
    fusionEvents: number;
    enhancedRegions?: number;
    timestamp?: string;
  };
  
  // Visualization options
  showLattice: boolean;
  showFusion: boolean;
  showEnhancement: boolean;
  showControls: boolean;
  
  // Visualization parameters
  latticeSize: number;
  reactionIntensity: number;
  animationSpeed: number;
  latticeType: string;
  temperature: number;
  latticeMetalType: string;
  visualEffectsEnabled: boolean;
  
  // Performance settings
  devicePerformance: 'high' | 'medium' | 'low';
  visualizationQuality: string;
  showWebGLHelp: boolean;
  
  // Internal data
  renderSettings: {
    particleMultiplier: number;
    useShadows: boolean;
    useHighDetail: boolean;
    qualityName: string;
  };
  internalVisualizationData: VisualizationData | null;
} 