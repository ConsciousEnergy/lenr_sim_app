/**
 * Data transformation utilities for converting physics simulation data to visualization formats
 */

import * as THREE from 'three';
import { 
  SimulationUpdateMessage, 
  SimulationResultsResponse,
  LatticePoint as PhysicsLatticePoint
} from '../../api/physics/types';

// Import types from visualization components
import { LatticeData, LatticePoint } from '../components/LatticeStructure';

// Type for all possible physics data sources
export type PhysicsDataSource = SimulationUpdateMessage | SimulationResultsResponse | null;

/**
 * Transforms physics simulation data into visualization-ready lattice data
 * @param data Physics simulation data from WebSocket or API
 * @param visualizationType Type of visualization (temperature, energy, reaction_rate)
 * @returns Formatted data for LatticeStructure component
 */
export const transformPhysicsToLattice = (
  data: PhysicsDataSource, 
  visualizationType: 'temperature' | 'energy' | 'reaction_rate' = 'energy'
): LatticeData | null => {
  if (!data || !data.lattice) return null;
  
  // Transform lattice points for visualization
  const points: LatticePoint[] = data.lattice.points.map((point: PhysicsLatticePoint) => ({
    position: point.position,
    element: point.element,
    occupancy: 1.0, // Default value
    energy: visualizationType === 'energy' 
      ? point.energy 
      : visualizationType === 'temperature' 
        ? point.temperature 
        : point.reaction_rate
  }));
  
  // Get lattice constants with a scaling factor for visualization
  const latticeConstants: [number, number, number] = 
    data.lattice.dimensions.map(d => d * 3) as [number, number, number];
  
  return {
    points,
    connections: data.lattice.connections || [],
    latticeConstants,
    unitCell: 'fcc' // Default to FCC, could be updated if that data is available
  };
};

/**
 * Transforms physics simulation data into MHD fluid dynamics visualization format
 * @param data Physics simulation data from WebSocket or API
 * @returns Formatted data for MHDFluidSimulation component
 */
export const transformPhysicsToMHDFluid = (data: PhysicsDataSource) => {
  if (!data) return null;
  
  // Create placeholder for magnetic field data
  // This would need to be extended with actual magnetic field data from your simulation
  const magneticFieldData = {
    points: [],
    vectors: [],
    magnitudes: [],
    dimensions: [10, 10, 10] as [number, number, number]
  };
  
  // Create fluid velocity data
  // This would need to be extended with actual velocity field data from your simulation
  const velocityFieldData = {
    points: [],
    vectors: [],
    dimensions: [10, 10, 10] as [number, number, number]
  };
  
  // Extract temperature data from lattice points if available
  const temperatureData = data.lattice?.points 
    ? data.lattice.points.map(p => ({
        position: p.position,
        value: p.temperature
      }))
    : [];
  
  // Placeholder for streamlines
  // These would be calculated from your velocity field using a streamline algorithm
  const streamlines = [];
  
  return {
    magneticField: magneticFieldData,
    velocityField: velocityFieldData,
    temperature: temperatureData,
    streamlines,
    timestamp: data.time,
    step: data.step
  };
};

/**
 * Get color for visualization based on data value and visualization type
 * @param value Data value (temperature, energy, reaction rate)
 * @param min Minimum value in dataset
 * @param max Maximum value in dataset
 * @param visualizationType Type of visualization
 * @returns THREE.js color object
 */
export const getVisualizationColor = (
  value: number,
  min: number,
  max: number,
  visualizationType: 'temperature' | 'energy' | 'reaction_rate' = 'energy'
): THREE.Color => {
  // Normalize value between 0 and 1
  const normalized = Math.max(0, Math.min(1, (value - min) / (max - min) || 0));
  
  let color: THREE.Color;
  
  switch (visualizationType) {
    case 'temperature':
      // Temperature: Blue (cold) to Red (hot)
      color = new THREE.Color().setHSL(0.7 * (1 - normalized), 1, 0.5);
      break;
      
    case 'energy':
      // Energy: Deep blue (low) to Orange/Red (high)
      color = new THREE.Color().setHSL(0.15 + 0.6 * (1 - normalized), 0.8, 0.5);
      break;
      
    case 'reaction_rate':
      // Reaction rate: Dark Green (low) to Bright Green/Yellow (high)
      color = new THREE.Color().setHSL(0.3, normalized, 0.5);
      break;
      
    default:
      color = new THREE.Color().setHSL(0, 0, normalized);
  }
  
  return color;
};

/**
 * Calculate data range (min, max, avg) for a set of visualization values
 * @param data Array of values to analyze
 * @returns Object with min, max, and avg values
 */
export const calculateDataRange = (data: number[]) => {
  if (!data || data.length === 0) {
    return { min: 0, max: 1, avg: 0.5 };
  }
  
  const min = Math.min(...data);
  const max = Math.max(...data);
  const avg = data.reduce((sum, val) => sum + val, 0) / data.length;
  
  return { min, max, avg };
}; 