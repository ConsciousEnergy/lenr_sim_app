/**
 * Physics Data Transformations
 * 
 * Utility functions for transforming physics data into formats suitable
 * for visualization and analysis.
 */

import { SimulationUpdateMessage, LatticeState, SimulationSummary } from '../../api/physics/types';
import { Vector3 } from 'three';

/**
 * Types for visualization data formats
 */

// Time series data point for charts
export interface TimeSeriesDataPoint {
  time: number;
  value: number;
  step: number;
}

// Time series dataset for charts
export interface TimeSeriesData {
  id: string;
  label: string;
  data: TimeSeriesDataPoint[];
  color?: string;
  unit?: string;
}

// Multi-series data for charts
export interface MultiSeriesData {
  id: string;
  series: TimeSeriesData[];
}

// 3D point with properties for visualization
export interface VisualizationPoint {
  position: [number, number, number];
  element: string;
  properties: Record<string, number>;
  velocity?: [number, number, number];
  connections?: number[];
}

// Normalized data ranges
export interface DataRange {
  min: number;
  max: number;
  mean?: number;
  median?: number;
}

// Mapping between property names and data ranges
export interface DataRanges {
  [key: string]: DataRange;
}

/**
 * Extract time series data from simulation updates
 * 
 * @param updates Array of simulation update messages
 * @param property Property to extract (e.g., 'temperature', 'energy')
 * @param aggregation Aggregation method for the property
 * @returns Time series data array
 */
export function extractTimeSeriesData(
  updates: SimulationUpdateMessage[],
  property: keyof SimulationSummary,
  aggregation: 'average' | 'total' | 'max' | 'min' = 'average'
): TimeSeriesData {
  const data: TimeSeriesDataPoint[] = [];
  
  updates.forEach(update => {
    if (typeof update.summary[property] === 'number') {
      data.push({
        time: update.time,
        value: update.summary[property] as number,
        step: update.step
      });
    } else if (
      property === 'reaction_counts' && 
      typeof update.summary.reaction_counts === 'object' &&
      aggregation === 'total'
    ) {
      // Sum all reaction counts
      const total = Object.values(update.summary.reaction_counts)
        .reduce((sum, val) => sum + val, 0);
      
      data.push({
        time: update.time,
        value: total,
        step: update.step
      });
    }
  });
  
  return {
    id: property.toString(),
    label: formatPropertyLabel(property),
    data: data,
    unit: getUnitForProperty(property)
  };
}

/**
 * Extract multi-series data from simulation updates
 * 
 * @param updates Array of simulation update messages
 * @param properties Array of properties to extract
 * @returns Multi-series data object
 */
export function extractMultiSeriesData(
  updates: SimulationUpdateMessage[],
  properties: (keyof SimulationSummary)[]
): MultiSeriesData {
  const series = properties.map(property => 
    extractTimeSeriesData(updates, property)
  );
  
  return {
    id: 'simulation-data',
    series
  };
}

/**
 * Transform lattice data for 3D visualization
 * 
 * @param lattice Lattice state from physics simulation
 * @returns Array of visualization points
 */
export function transformLatticeForVisualization(
  lattice: LatticeState
): VisualizationPoint[] {
  if (!lattice || !lattice.points) {
    return [];
  }
  
  const points: VisualizationPoint[] = [];
  const connectionMap: Record<number, number[]> = {};
  
  // Process connections
  if (lattice.connections && lattice.connections.length > 0) {
    lattice.connections.forEach(([a, b]) => {
      if (!connectionMap[a]) connectionMap[a] = [];
      if (!connectionMap[b]) connectionMap[b] = [];
      
      connectionMap[a].push(b);
      connectionMap[b].push(a);
    });
  }
  
  // Process points
  lattice.points.forEach((point, index) => {
    points.push({
      position: point.position,
      element: point.element,
      properties: {
        temperature: point.temperature,
        energy: point.energy,
        reaction_rate: point.reaction_rate
      },
      connections: connectionMap[index] || []
    });
  });
  
  return points;
}

/**
 * Calculate data ranges for a set of visualization points
 * 
 * @param points Array of visualization points
 * @param properties Properties to calculate ranges for
 * @returns Object mapping property names to data ranges
 */
export function calculateDataRanges(
  points: VisualizationPoint[],
  properties: string[] = ['temperature', 'energy', 'reaction_rate']
): DataRanges {
  const ranges: DataRanges = {};
  
  properties.forEach(prop => {
    ranges[prop] = {
      min: Number.POSITIVE_INFINITY,
      max: Number.NEGATIVE_INFINITY
    };
  });
  
  // Calculate min/max for each property
  points.forEach(point => {
    properties.forEach(prop => {
      if (point.properties[prop] !== undefined) {
        ranges[prop].min = Math.min(ranges[prop].min, point.properties[prop]);
        ranges[prop].max = Math.max(ranges[prop].max, point.properties[prop]);
      }
    });
  });
  
  // Calculate mean for each property
  properties.forEach(prop => {
    let sum = 0;
    let count = 0;
    
    points.forEach(point => {
      if (point.properties[prop] !== undefined) {
        sum += point.properties[prop];
        count++;
      }
    });
    
    if (count > 0) {
      ranges[prop].mean = sum / count;
    }
  });
  
  // Apply some padding to min/max values for better visualization
  properties.forEach(prop => {
    // Special case for reaction rate - always start from 0
    if (prop === 'reaction_rate') {
      ranges[prop].min = 0;
    } else {
      const range = ranges[prop].max - ranges[prop].min;
      ranges[prop].min = Math.max(0, ranges[prop].min - range * 0.1);
      ranges[prop].max = ranges[prop].max + range * 0.1;
    }
  });
  
  return ranges;
}

/**
 * Normalize values in visualization points based on calculated ranges
 * 
 * @param points Array of visualization points
 * @param ranges Data ranges for normalization
 * @returns Array of visualization points with normalized values
 */
export function normalizeVisualizationData(
  points: VisualizationPoint[],
  ranges: DataRanges
): VisualizationPoint[] {
  return points.map(point => {
    const normalizedProperties: Record<string, number> = {};
    
    Object.keys(point.properties).forEach(prop => {
      if (ranges[prop]) {
        const range = ranges[prop].max - ranges[prop].min;
        normalizedProperties[`${prop}_normalized`] = range > 0 
          ? (point.properties[prop] - ranges[prop].min) / range 
          : 0.5;
      }
      
      // Keep original values too
      normalizedProperties[prop] = point.properties[prop];
    });
    
    return {
      ...point,
      properties: normalizedProperties
    };
  });
}

/**
 * Create a downsampled version of time series data
 * 
 * @param data Original time series data
 * @param targetPoints Target number of points in result
 * @returns Downsampled time series data
 */
export function downsampleTimeSeriesData(
  data: TimeSeriesData,
  targetPoints: number
): TimeSeriesData {
  if (!data || !data.data || data.data.length <= targetPoints) {
    return data;
  }
  
  const step = Math.ceil(data.data.length / targetPoints);
  const downsampled = [];
  
  for (let i = 0; i < data.data.length; i += step) {
    downsampled.push(data.data[i]);
  }
  
  // Ensure we include the last point
  if (downsampled[downsampled.length - 1] !== data.data[data.data.length - 1]) {
    downsampled.push(data.data[data.data.length - 1]);
  }
  
  return {
    ...data,
    data: downsampled
  };
}

/**
 * Apply moving average to time series data
 * 
 * @param data Original time series data
 * @param windowSize Size of the moving average window
 * @returns Smoothed time series data
 */
export function applyMovingAverage(
  data: TimeSeriesData,
  windowSize: number
): TimeSeriesData {
  if (!data || !data.data || data.data.length <= windowSize) {
    return data;
  }
  
  const smoothed = [];
  
  for (let i = 0; i < data.data.length; i++) {
    const windowStart = Math.max(0, i - windowSize + 1);
    const windowEnd = i;
    let sum = 0;
    
    for (let j = windowStart; j <= windowEnd; j++) {
      sum += data.data[j].value;
    }
    
    smoothed.push({
      time: data.data[i].time,
      value: sum / (windowEnd - windowStart + 1),
      step: data.data[i].step
    });
  }
  
  return {
    ...data,
    data: smoothed
  };
}

/**
 * Helper function to format property labels for display
 */
function formatPropertyLabel(property: keyof SimulationSummary): string {
  const labels: Record<string, string> = {
    average_temperature: 'Average Temperature',
    total_energy: 'Total Energy',
    reaction_counts: 'Reaction Counts',
    reaction_rate: 'Reaction Rate'
  };
  
  return labels[property.toString()] || property.toString();
}

/**
 * Helper function to get units for properties
 */
function getUnitForProperty(property: keyof SimulationSummary): string {
  const units: Record<string, string> = {
    average_temperature: 'K',
    // Backend simulation engines report total_energy as cumulative joules
    // (cumsum of excess power x dt); it is not a per-event eV value.
    total_energy: 'J',
    reaction_rate: '/s'
  };
  
  return units[property.toString()] || '';
}

/**
 * Convert a simulation update message to a lightweight format for serialization
 * 
 * @param update Simulation update message
 * @returns Lightweight object for serialization
 */
export function serializeSimulationUpdate(
  update: SimulationUpdateMessage
): Record<string, any> {
  return {
    simulation_id: update.simulation_id,
    step: update.step,
    time: update.time,
    summary: update.summary,
    lattice_dimensions: update.lattice.dimensions,
    point_count: update.lattice.points.length,
    connection_count: update.lattice.connections.length
  };
}

/**
 * Calculate the center of mass of a lattice
 * 
 * @param lattice Lattice state
 * @returns Center of mass as [x, y, z]
 */
export function calculateLatticeCenter(lattice: LatticeState): [number, number, number] {
  if (!lattice || !lattice.points || lattice.points.length === 0) {
    return [0, 0, 0];
  }
  
  let sumX = 0, sumY = 0, sumZ = 0;
  let count = 0;
  
  lattice.points.forEach(point => {
    sumX += point.position[0];
    sumY += point.position[1];
    sumZ += point.position[2];
    count++;
  });
  
  return [
    sumX / count,
    sumY / count,
    sumZ / count
  ];
}

/**
 * Calculate element distribution in a lattice
 * 
 * @param lattice Lattice state
 * @returns Object mapping element symbols to counts
 */
export function calculateElementDistribution(
  lattice: LatticeState
): Record<string, number> {
  if (!lattice || !lattice.points || lattice.points.length === 0) {
    return {};
  }
  
  const distribution: Record<string, number> = {};
  
  lattice.points.forEach(point => {
    if (!distribution[point.element]) {
      distribution[point.element] = 0;
    }
    
    distribution[point.element]++;
  });
  
  return distribution;
}

/**
 * Calculate the bounding box of a lattice
 * 
 * @param lattice Lattice state
 * @returns Object with min and max corners of bounding box
 */
export function calculateLatticeBounds(
  lattice: LatticeState
): { min: [number, number, number], max: [number, number, number] } {
  if (!lattice || !lattice.points || lattice.points.length === 0) {
    return {
      min: [0, 0, 0],
      max: [0, 0, 0]
    };
  }
  
  const min: [number, number, number] = [
    Number.POSITIVE_INFINITY,
    Number.POSITIVE_INFINITY,
    Number.POSITIVE_INFINITY
  ];
  
  const max: [number, number, number] = [
    Number.NEGATIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    Number.NEGATIVE_INFINITY
  ];
  
  lattice.points.forEach(point => {
    min[0] = Math.min(min[0], point.position[0]);
    min[1] = Math.min(min[1], point.position[1]);
    min[2] = Math.min(min[2], point.position[2]);
    
    max[0] = Math.max(max[0], point.position[0]);
    max[1] = Math.max(max[1], point.position[1]);
    max[2] = Math.max(max[2], point.position[2]);
  });
  
  return { min, max };
} 