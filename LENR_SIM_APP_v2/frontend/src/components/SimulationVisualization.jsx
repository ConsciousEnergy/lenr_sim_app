import { useState } from 'react';
import { resolveApiUrl } from '../config/api';

/**
 * Fetches simulation payload for visualization (uses centralized API URL).
 */
export function useSimulationVisualization(simulationId) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchSimulation = async () => {
    if (!simulationId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(resolveApiUrl(`/api/simulations/${simulationId}`));
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { loading, error, fetchSimulation };
}

export default useSimulationVisualization;
