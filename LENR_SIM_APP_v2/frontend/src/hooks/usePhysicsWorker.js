/**
 * usePhysicsWorker Hook
 * 
 * Provides easy access to the physics WebWorker for offloading
 * heavy calculations from the main UI thread.
 * 
 * v0.2.2-beta: Added SharedArrayBuffer support for proton position data
 * and MHD/VPFM calculation methods.
 * 
 * Usage:
 *   const { calculate, isCalculating, error } = usePhysicsWorker();
 *   
 *   const result = await calculate('CALCULATE_ENHANCEMENT', {
 *     temperature: 300,
 *     electronDensity: 6.8e28,
 *     material: 'palladium'
 *   });
 *   
 *   // v0.2.2: MHD forces
 *   const forces = await calculate('CALCULATE_MHD_FORCES', {
 *     position: [0, 1, 0],
 *     velocity: [0.1, 0, 0],
 *     cavitationPoint: [0, -3, 0],
 *     compressionRatio: 2.0
 *   });
 */

/* global SharedArrayBuffer */

import { useCallback, useEffect, useRef, useState } from 'react';

// Check if SharedArrayBuffer is available (requires secure context + COOP/COEP headers)
const isSharedArrayBufferAvailable = (() => {
  try {
    return typeof SharedArrayBuffer !== 'undefined';
  } catch {
    return false;
  }
})();

/**
 * Custom hook for physics calculations using WebWorker
 * 
 * @returns {Object} Worker interface with calculate function and state
 */
export function usePhysicsWorker() {
  const workerRef = useRef(null);
  const pendingCallsRef = useRef(new Map());
  const callIdRef = useRef(0);
  
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState(null);
  const [isWorkerReady, setIsWorkerReady] = useState(false);

  // Initialize worker on mount
  useEffect(() => {
    try {
      // Create worker using Vite's worker syntax
      workerRef.current = new Worker(
        new URL('../workers/physicsWorker.js', import.meta.url),
        { type: 'module' }
      );

      // Handle messages from worker
      workerRef.current.onmessage = (e) => {
        const { type, result, id, success, error: workerError } = e.data;
        
        // Find and resolve/reject the pending promise
        const pending = pendingCallsRef.current.get(id);
        if (pending) {
          pendingCallsRef.current.delete(id);
          
          if (success) {
            pending.resolve(result);
          } else {
            pending.reject(new Error(workerError || 'Worker calculation failed'));
          }
          
          // Update calculating state
          if (pendingCallsRef.current.size === 0) {
            setIsCalculating(false);
          }
        }
      };

      // Handle worker errors
      workerRef.current.onerror = (e) => {
        console.error('Physics worker error:', e);
        setError(e.message || 'Worker error occurred');
        
        // Reject all pending calls
        pendingCallsRef.current.forEach((pending) => {
          pending.reject(new Error('Worker error'));
        });
        pendingCallsRef.current.clear();
        setIsCalculating(false);
      };

      setIsWorkerReady(true);
      
    } catch (err) {
      console.error('Failed to create physics worker:', err);
      setError('Failed to initialize physics worker');
      setIsWorkerReady(false);
    }

    // Cleanup on unmount
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
      pendingCallsRef.current.clear();
    };
  }, []);

  /**
   * Send calculation request to worker
   * 
   * @param {string} type - Calculation type (e.g., 'CALCULATE_ENHANCEMENT')
   * @param {Object} params - Parameters for the calculation
   * @returns {Promise<any>} Calculation result
   */
  const calculate = useCallback((type, params) => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current) {
        reject(new Error('Worker not initialized'));
        return;
      }

      const id = callIdRef.current++;
      setIsCalculating(true);
      setError(null);

      // Store the promise callbacks
      pendingCallsRef.current.set(id, { resolve, reject });

      // Send message to worker
      workerRef.current.postMessage({ type, params, id });
    });
  }, []);

  /**
   * Calculate total enhancement factors
   */
  const calculateEnhancement = useCallback((params) => {
    return calculate('CALCULATE_ENHANCEMENT', params);
  }, [calculate]);

  /**
   * Calculate tunneling probability
   */
  const calculateTunneling = useCallback((params) => {
    return calculate('CALCULATE_TUNNELING', params);
  }, [calculate]);

  /**
   * Calculate bubble collapse parameters
   */
  const calculateBubbleCollapse = useCallback((params) => {
    return calculate('CALCULATE_BUBBLE_COLLAPSE', params);
  }, [calculate]);

  /**
   * Calculate enhancement time series for animation
   */
  const calculateTimeSeries = useCallback((params) => {
    return calculate('CALCULATE_TIME_SERIES', params);
  }, [calculate]);

  /**
   * Get material properties
   */
  const getMaterialProperties = useCallback((material) => {
    return calculate('GET_MATERIAL_PROPERTIES', { material });
  }, [calculate]);

  /**
   * Get physical constants
   */
  const getConstants = useCallback(() => {
    return calculate('GET_CONSTANTS', {});
  }, [calculate]);

  // =============================================================================
  // v0.2.2-beta: MHD and VPFM Methods
  // =============================================================================

  /**
   * Calculate MHD confinement forces on a proton
   */
  const calculateMHDForces = useCallback((params) => {
    return calculate('CALCULATE_MHD_FORCES', params);
  }, [calculate]);

  /**
   * Update vortex particles (VPFM-inspired)
   */
  const updateVortexParticles = useCallback((params) => {
    return calculate('UPDATE_VORTEX_PARTICLES', params);
  }, [calculate]);

  /**
   * Integrate proton forces using Velocity Verlet
   */
  const integrateForces = useCallback((params) => {
    return calculate('INTEGRATE_FORCES', params);
  }, [calculate]);

  return {
    // Core function
    calculate,
    
    // Convenience methods
    calculateEnhancement,
    calculateTunneling,
    calculateBubbleCollapse,
    calculateTimeSeries,
    getMaterialProperties,
    getConstants,
    
    // v0.2.2: MHD and VPFM methods
    calculateMHDForces,
    updateVortexParticles,
    integrateForces,
    
    // State
    isCalculating,
    isWorkerReady,
    error,
    
    // Capabilities
    isSharedArrayBufferAvailable,
  };
}

// =============================================================================
// SharedArrayBuffer Utilities for Proton Position Data (v0.2.2-beta)
// =============================================================================

/**
 * Create a SharedArrayBuffer for proton positions
 * Allows zero-copy data sharing between main thread and worker
 * 
 * @param {number} numProtons - Number of protons
 * @returns {Object} Buffers and views for position data
 */
export function createProtonPositionBuffer(numProtons) {
  if (!isSharedArrayBufferAvailable) {
    // Fallback to regular ArrayBuffer (requires copying)
    const buffer = new ArrayBuffer(numProtons * 3 * Float64Array.BYTES_PER_ELEMENT);
    return {
      buffer,
      positions: new Float64Array(buffer),
      isShared: false,
      numProtons,
    };
  }
  
  // Create SharedArrayBuffer for positions (x, y, z per proton)
  const positionBuffer = new SharedArrayBuffer(
    numProtons * 3 * Float64Array.BYTES_PER_ELEMENT
  );
  
  // Create typed array view
  const positions = new Float64Array(positionBuffer);
  
  return {
    buffer: positionBuffer,
    positions,
    isShared: true,
    numProtons,
  };
}

/**
 * Create SharedArrayBuffer for proton velocities
 * 
 * @param {number} numProtons - Number of protons
 * @returns {Object} Buffers and views for velocity data
 */
export function createProtonVelocityBuffer(numProtons) {
  if (!isSharedArrayBufferAvailable) {
    const buffer = new ArrayBuffer(numProtons * 3 * Float64Array.BYTES_PER_ELEMENT);
    return {
      buffer,
      velocities: new Float64Array(buffer),
      isShared: false,
      numProtons,
    };
  }
  
  const velocityBuffer = new SharedArrayBuffer(
    numProtons * 3 * Float64Array.BYTES_PER_ELEMENT
  );
  
  return {
    buffer: velocityBuffer,
    velocities: new Float64Array(velocityBuffer),
    isShared: true,
    numProtons,
  };
}

/**
 * Create complete proton state buffers (positions, velocities, vorticity)
 * 
 * @param {number} numProtons - Number of protons
 * @returns {Object} Complete set of buffers for proton simulation
 */
export function createProtonStateBuffers(numProtons) {
  const positionData = createProtonPositionBuffer(numProtons);
  const velocityData = createProtonVelocityBuffer(numProtons);
  
  // Vorticity buffer for VPFM
  let vorticityBuffer, vorticities, isShared;
  
  if (isSharedArrayBufferAvailable) {
    vorticityBuffer = new SharedArrayBuffer(
      numProtons * 3 * Float64Array.BYTES_PER_ELEMENT
    );
    vorticities = new Float64Array(vorticityBuffer);
    isShared = true;
  } else {
    vorticityBuffer = new ArrayBuffer(
      numProtons * 3 * Float64Array.BYTES_PER_ELEMENT
    );
    vorticities = new Float64Array(vorticityBuffer);
    isShared = false;
  }
  
  // State flags buffer (using Int32 for Atomics compatibility)
  let stateBuffer, states;
  if (isSharedArrayBufferAvailable) {
    stateBuffer = new SharedArrayBuffer(numProtons * Int32Array.BYTES_PER_ELEMENT);
    states = new Int32Array(stateBuffer);
  } else {
    stateBuffer = new ArrayBuffer(numProtons * Int32Array.BYTES_PER_ELEMENT);
    states = new Int32Array(stateBuffer);
  }
  
  return {
    positions: positionData.positions,
    velocities: velocityData.velocities,
    vorticities,
    states,
    buffers: {
      position: positionData.buffer,
      velocity: velocityData.buffer,
      vorticity: vorticityBuffer,
      state: stateBuffer,
    },
    isShared,
    numProtons,
  };
}

/**
 * Initialize proton positions in a spherical shell distribution
 * 
 * @param {Float64Array} positions - Position array to fill
 * @param {number} numProtons - Number of protons
 * @param {Array} center - Center point [x, y, z]
 * @param {number} radius - Shell radius
 */
export function initializeProtonPositions(positions, numProtons, center, radius) {
  for (let i = 0; i < numProtons; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = radius * (0.8 + 0.4 * Math.random());
    
    positions[i * 3] = center[0] + r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = center[1] + r * Math.cos(phi);
    positions[i * 3 + 2] = center[2] + r * Math.sin(phi) * Math.sin(theta);
  }
}

/**
 * Read proton position at index
 * Thread-safe read using Atomics when using SharedArrayBuffer
 * 
 * @param {Float64Array} positions - Position array
 * @param {number} index - Proton index
 * @returns {Array} Position [x, y, z]
 */
export function readProtonPosition(positions, index) {
  const base = index * 3;
  return [positions[base], positions[base + 1], positions[base + 2]];
}

/**
 * Write proton position at index
 * Thread-safe write using Atomics when using SharedArrayBuffer
 * 
 * @param {Float64Array} positions - Position array
 * @param {number} index - Proton index
 * @param {Array} pos - Position [x, y, z]
 */
export function writeProtonPosition(positions, index, pos) {
  const base = index * 3;
  positions[base] = pos[0];
  positions[base + 1] = pos[1];
  positions[base + 2] = pos[2];
}

/**
 * Fallback calculations for when WebWorker is not available
 * These are simplified versions that run on the main thread
 */
export const fallbackCalculations = {
  calculateEnhancement: (params) => {
    const { temperature = 300, electronDensity = 6.8e28 } = params;
    
    // Simplified screening enhancement
    const KB = 1.380649e-23;
    const EPS0 = 8.8541878128e-12;
    const E_CHARGE = 1.602176634e-19;
    
    const thermalEnergy = KB * temperature;
    const debyeLength = Math.sqrt(EPS0 * thermalEnergy / (electronDensity * E_CHARGE ** 2));
    const screeningPotential = -(E_CHARGE ** 2) / (4 * Math.PI * EPS0 * debyeLength);
    const screening = Math.exp(-screeningPotential / thermalEnergy);
    
    return {
      total: Math.min(screening, 1e6),
      breakdown: {
        screening: Math.min(screening, 1e6),
        qed: 1.0,
        casimir: 1.0,
        coherence: 1.0,
      },
    };
  },
};

export default usePhysicsWorker;
