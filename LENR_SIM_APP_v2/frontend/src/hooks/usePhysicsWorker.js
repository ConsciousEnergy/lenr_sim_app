/**
 * usePhysicsWorker Hook
 * 
 * Provides easy access to the physics WebWorker for offloading
 * heavy calculations from the main UI thread.
 * 
 * Usage:
 *   const { calculate, isCalculating, error } = usePhysicsWorker();
 *   
 *   const result = await calculate('CALCULATE_ENHANCEMENT', {
 *     temperature: 300,
 *     electronDensity: 6.8e28,
 *     material: 'palladium'
 *   });
 */

import { useCallback, useEffect, useRef, useState } from 'react';

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
    
    // State
    isCalculating,
    isWorkerReady,
    error,
  };
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
