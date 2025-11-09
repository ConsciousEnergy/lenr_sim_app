/**
 * Visualization components exports
 * 
 * This file exports visualization components for use throughout the application.
 * - UnifiedLENRVisualizer: 3D visualization for LENR lattice, fusion sites, and quantum effects
 * - FluidDynamicsVisualizer: Visualization for fluid dynamics and MHD (magnetohydrodynamics)
 */

import UnifiedLENRVisualizer from './UnifiedLENRVisualizer';
import FluidDynamicsVisualizer from './FluidDynamicsVisualizer';

// Named exports for use with destructuring
export {
  UnifiedLENRVisualizer,
  FluidDynamicsVisualizer
};

// Default export as an object for backward compatibility
export default {
  UnifiedLENRVisualizer,
  FluidDynamicsVisualizer
}; 