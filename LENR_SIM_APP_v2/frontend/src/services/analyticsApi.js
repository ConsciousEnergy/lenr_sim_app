/**
 * Analytics API Client for LENR Simulation App
 * 
 * Provides methods for interacting with the analytics backend API.
 * Includes automatic fallback to localStorage for offline functionality.
 * 
 * v0.2.3-beta: Initial implementation
 */

import api, { ApiError } from './api';

// Session ID for tracking user experiments
const getSessionId = () => {
  let sessionId = localStorage.getItem('lenr_session_id');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('lenr_session_id', sessionId);
  }
  return sessionId;
};

/**
 * Analytics API methods
 */
export const analyticsApi = {
  /**
   * Get dashboard statistics
   * @param {Object} options - Query options
   * @param {boolean} options.includeBaseline - Include baseline data (default: true)
   * @returns {Promise<Object>} Statistics object
   */
  getStats: async (options = {}) => {
    const { includeBaseline = true } = options;
    const sessionId = getSessionId();
    
    try {
      const response = await api.get('/api/analytics/stats', {
        params: {
          session_id: sessionId,
          include_baseline: includeBaseline,
        },
      });
      return response;
    } catch (error) {
      console.warn('Analytics API unavailable, using local fallback:', error.message);
      return getLocalStats();
    }
  },

  /**
   * Get type distribution for pie chart
   * @returns {Promise<Array>} Distribution data
   */
  getTypeDistribution: async () => {
    const sessionId = getSessionId();
    
    try {
      const response = await api.get('/api/analytics/distribution/type', {
        params: { session_id: sessionId },
      });
      return response;
    } catch (error) {
      console.warn('Type distribution API unavailable:', error.message);
      return getLocalTypeDistribution();
    }
  },

  /**
   * Get material distribution
   * @returns {Promise<Array>} Material distribution data
   */
  getMaterialDistribution: async () => {
    const sessionId = getSessionId();
    
    try {
      const response = await api.get('/api/analytics/distribution/material', {
        params: { session_id: sessionId },
      });
      return response;
    } catch (error) {
      console.warn('Material distribution API unavailable:', error.message);
      return [];
    }
  },

  /**
   * Get temperature distribution for bar chart
   * @param {number} bins - Number of bins (default: 10)
   * @returns {Promise<Array>} Temperature distribution data
   */
  getTemperatureDistribution: async (bins = 10) => {
    const sessionId = getSessionId();
    
    try {
      const response = await api.get('/api/analytics/distribution/temperature', {
        params: { session_id: sessionId, bins },
      });
      return response;
    } catch (error) {
      console.warn('Temperature distribution API unavailable:', error.message);
      return getLocalTemperatureDistribution();
    }
  },

  /**
   * Get timeline data for line chart
   * @param {Object} options - Query options
   * @param {number} options.limit - Number of data points (default: 30)
   * @returns {Promise<Array>} Timeline data
   */
  getTimeline: async (options = {}) => {
    const { limit = 30 } = options;
    const sessionId = getSessionId();
    
    try {
      const response = await api.get('/api/analytics/timeline', {
        params: { session_id: sessionId, limit },
      });
      return response;
    } catch (error) {
      console.warn('Timeline API unavailable:', error.message);
      return getLocalTimeline();
    }
  },

  /**
   * Get paginated list of experiments
   * @param {Object} options - Query options
   * @returns {Promise<Object>} { experiments, total, limit, offset }
   */
  getExperiments: async (options = {}) => {
    const {
      limit = 50,
      offset = 0,
      experimentType,
      status,
      material,
      sortBy = 'created_at',
      sortOrder = 'desc',
      includeBaseline = true,
    } = options;
    
    const sessionId = getSessionId();
    
    try {
      const response = await api.get('/api/analytics/experiments', {
        params: {
          session_id: sessionId,
          include_baseline: includeBaseline,
          experiment_type: experimentType,
          status,
          material,
          limit,
          offset,
          sort_by: sortBy,
          sort_order: sortOrder,
        },
      });
      return response;
    } catch (error) {
      console.warn('Experiments API unavailable:', error.message);
      return getLocalExperiments(options);
    }
  },

  /**
   * Get a single experiment by ID
   * @param {string} experimentId - Experiment ID
   * @returns {Promise<Object>} Experiment data
   */
  getExperiment: async (experimentId) => {
    try {
      const response = await api.get(`/api/analytics/experiments/${experimentId}`);
      return response;
    } catch (error) {
      if (error.status === 404) {
        throw new ApiError('Experiment not found', 404);
      }
      throw error;
    }
  },

  /**
   * Save a new experiment
   * @param {Object} experimentData - Experiment data
   * @returns {Promise<Object>} Created experiment
   */
  saveExperiment: async (experimentData) => {
    const sessionId = getSessionId();
    
    const payload = {
      ...experimentData,
      session_id: sessionId,
    };
    
    try {
      const response = await api.post('/api/analytics/experiments', payload);
      
      // Also save to localStorage as backup
      saveToLocalStorage(response.data);
      
      return response;
    } catch (error) {
      console.warn('Failed to save to API, saving locally:', error.message);
      
      // Fallback: save to localStorage only
      const localExperiment = {
        ...payload,
        id: `local_${Date.now()}`,
        created_at: new Date().toISOString(),
        is_baseline: false,
        source: 'Local Storage (Offline)',
      };
      saveToLocalStorage(localExperiment);
      
      return localExperiment;
    }
  },

  /**
   * Persist a true simulation failure so Analytics can show mixed outcomes.
   * Best-effort: never throws to the caller.
   */
  saveFailedRun: async (partial = {}) => {
    try {
      return await analyticsApi.saveExperiment({
        name: 'Failed simulation',
        experiment_type: 'unified_theory',
        material: 'palladium',
        temperature_k: 300,
        ...partial,
        status: 'failed',
        results: {
          scientific_outcome: 'failed',
          error: String(partial.error || 'simulation failed'),
          is_model_output: true,
          ...(partial.results || {}),
        },
      });
    } catch (error) {
      console.warn('Failed to persist failed run:', error.message);
      return null;
    }
  },

  /**
   * Update an existing experiment
   * @param {string} experimentId - Experiment ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated experiment
   */
  updateExperiment: async (experimentId, updates) => {
    try {
      const response = await api.put(`/api/analytics/experiments/${experimentId}`, updates);
      return response;
    } catch (error) {
      if (error.status === 404) {
        throw new ApiError('Experiment not found', 404);
      }
      throw error;
    }
  },

  /**
   * Delete an experiment
   * @param {string} experimentId - Experiment ID
   * @returns {Promise<void>}
   */
  deleteExperiment: async (experimentId) => {
    try {
      await api.delete(`/api/analytics/experiments/${experimentId}`);
      
      // Also remove from localStorage
      removeFromLocalStorage(experimentId);
    } catch (error) {
      if (error.status === 404) {
        // Already deleted
        removeFromLocalStorage(experimentId);
        return;
      }
      throw error;
    }
  },

  /**
   * Get timeline data for a specific experiment
   * @param {string} experimentId - Experiment ID
   * @returns {Promise<Array>} Timeline points
   */
  getExperimentTimeline: async (experimentId) => {
    try {
      const response = await api.get(`/api/analytics/experiments/${experimentId}/timeline`);
      return response;
    } catch (error) {
      console.warn('Experiment timeline API unavailable:', error.message);
      return [];
    }
  },

  /**
   * Add timeline points to an experiment
   * @param {string} experimentId - Experiment ID
   * @param {Array} points - Timeline data points
   * @returns {Promise<Object>} { added: number }
   */
  addTimelinePoints: async (experimentId, points) => {
    try {
      const response = await api.post(`/api/analytics/experiments/${experimentId}/timeline`, {
        points,
      });
      return response;
    } catch (error) {
      console.warn('Failed to add timeline points:', error.message);
      return { added: 0 };
    }
  },

  /**
   * Export experiments to CSV
   * @returns {Promise<Blob>} CSV file blob
   */
  exportCSV: async () => {
    const sessionId = getSessionId();
    
    try {
      const response = await api.get('/api/analytics/export/csv', {
        params: { session_id: sessionId },
        responseType: 'blob',
      });
      return response;
    } catch (error) {
      console.warn('CSV export API unavailable, using local export');
      return exportLocalCSV();
    }
  },

  /**
   * Export experiments to JSON
   * @returns {Promise<Array>} Experiments array
   */
  exportJSON: async () => {
    const sessionId = getSessionId();
    
    try {
      const response = await api.get('/api/analytics/export/json', {
        params: { session_id: sessionId },
      });
      return response;
    } catch (error) {
      console.warn('JSON export API unavailable, using local export');
      return getLocalExperimentsRaw();
    }
  },

  /**
   * Compare multiple experiments
   * @param {Array<string>} experimentIds - IDs to compare
   * @returns {Promise<Array>} Experiments for comparison
   */
  compareExperiments: async (experimentIds) => {
    try {
      const response = await api.post('/api/analytics/compare', {
        experiment_ids: experimentIds,
      });
      return response;
    } catch (error) {
      console.warn('Compare API unavailable:', error.message);
      // Fallback: fetch from local storage
      return getLocalExperimentsById(experimentIds);
    }
  },

  // ==================
  // Theory Network / Scoring endpoints (v0.3.1-beta)
  // ==================

  /**
   * Aggregate persisted theory_runs for the Relevance Map overlay.
   * Simulation-derived association; not empirical confidence.
   */
  getTheoryRunHistory: async () => {
    try {
      const response = await api.get('/api/analytics/theory-run-history');
      return response;
    } catch (err) {
      console.error('[analyticsApi] getTheoryRunHistory error:', err);
      throw err;
    }
  },

  /**
   * Get the full theory relationship graph (nodes + edges).
   * @returns {Promise<{nodes: Object[], edges: Object[], properties_taxonomy: Object}>}
   */
  getTheoryGraph: async () => {
    try {
      const response = await api.get('/api/analytics/theory-graph');
      return response;
    } catch (err) {
      console.error('[analyticsApi] getTheoryGraph error:', err);
      throw err;
    }
  },

  /**
   * Get the shared physical properties taxonomy.
   * @returns {Promise<{properties: Object}>}
   */
  getTheoryProperties: async () => {
    try {
      const response = await api.get('/api/analytics/theory-properties');
      return response;
    } catch (err) {
      console.error('[analyticsApi] getTheoryProperties error:', err);
      throw err;
    }
  },

  /**
   * Compute predictive probability scores for all theories.
   * @param {Object} conditions - Physical conditions
   * @returns {Promise<{conditions: Object, scores: Object, n_theories: number}>}
   */
  computeTheoryScores: async (conditions = {}) => {
    try {
      const defaults = {
        temperature: 300.0,
        loading_ratio: 0.9,
        pressure: 101325.0,
        electron_density: 6.8e28,
        current_density_mA_cm2: 50.0,
        excess_heat_W: 1.0,
      };
      const response = await api.post('/api/analytics/theory-scores', {
        ...defaults,
        ...conditions,
      });
      return response;
    } catch (err) {
      console.error('[analyticsApi] computeTheoryScores error:', err);
      throw err;
    }
  },

  /**
   * Compare specific theories side-by-side.
   * @param {string[]} theoryIds
   * @param {Object} conditions
   * @returns {Promise<Object>}
   */
  compareTheories: async (theoryIds, conditions = {}) => {
    try {
      const defaults = {
        temperature: 300.0,
        loading_ratio: 0.9,
        pressure: 101325.0,
        electron_density: 6.8e28,
      };
      const response = await api.post('/api/analytics/theory-comparison', {
        theory_ids: theoryIds,
        conditions: { ...defaults, ...conditions },
      });
      return response;
    } catch (err) {
      console.error('[analyticsApi] compareTheories error:', err);
      throw err;
    }
  },

  /**
   * Run a parameter sweep across all theories.
   * @param {Object} params
   * @returns {Promise<Object>}
   */
  parameterSweep: async (params = {}) => {
    try {
      const response = await api.post('/api/analytics/parameter-sweep', params);
      return response;
    } catch (err) {
      console.error('[analyticsApi] parameterSweep error:', err);
      throw err;
    }
  },

  /**
   * Get the validation report for all theories.
   * @param {Object} conditions
   * @returns {Promise<Object>}
   */
  getValidationReport: async (conditions = {}) => {
    try {
      const response = await api.get('/api/analytics/validation-report', {
        params: {
          temperature: conditions.temperature || 300.0,
          loading_ratio: conditions.loading_ratio || 0.9,
          pressure: conditions.pressure || 101325.0,
          electron_density: conditions.electron_density || 6.8e28,
        },
      });
      return response;
    } catch (err) {
      console.error('[analyticsApi] getValidationReport error:', err);
      throw err;
    }
  },
};


// ==================
// Local Storage Helpers
// ==================

const LOCAL_STORAGE_KEY = 'lenr_simulation_history';

/**
 * Get experiments from localStorage
 */
function getLocalExperimentsRaw() {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error reading localStorage:', error);
    return [];
  }
}

/**
 * Save experiment to localStorage
 */
function saveToLocalStorage(experiment) {
  try {
    const experiments = getLocalExperimentsRaw();
    
    // Check if experiment already exists (update vs insert)
    const existingIndex = experiments.findIndex(e => e.id === experiment.id);
    if (existingIndex >= 0) {
      experiments[existingIndex] = experiment;
    } else {
      experiments.unshift(experiment); // Add to beginning
    }
    
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(experiments));
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
}

/**
 * Remove experiment from localStorage
 */
function removeFromLocalStorage(experimentId) {
  try {
    const experiments = getLocalExperimentsRaw();
    const filtered = experiments.filter(e => e.id !== experimentId);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error removing from localStorage:', error);
  }
}

/**
 * Get local statistics (fallback)
 */
function classifyLocalOutcome(experiment) {
  const status = String(experiment.status || '').toLowerCase();
  if (status === 'failed' || status === 'cancelled') {
    return 'failed';
  }
  const results = experiment.results || {};
  const scores = results.pipeline_scores || {};
  const applicability = Object.values(scores)
    .filter((record) => record && Object.prototype.hasOwnProperty.call(record, 'is_applicable'))
    .map((record) => Boolean(record.is_applicable));
  if (applicability.length > 0 && applicability.every((flag) => !flag)) {
    return 'inapplicable';
  }
  const heat = experiment.excess_heat_watts ?? experiment.excessHeatWatts
    ?? results.excess_heat_watts ?? results.observables?.excess_heat_watts;
  if (heat != null && Number(heat) > 0) {
    return 'positive';
  }
  return 'null';
}

function getLocalStats() {
  const experiments = getLocalExperimentsRaw();

  const emptyCounts = { positive: 0, null: 0, inapplicable: 0, failed: 0 };
  if (experiments.length === 0) {
    return {
      totalSimulations: 0,
      successRate: 0,
      completionRate: 0,
      scientificPositiveRate: 0,
      avgEnhancement: 0,
      totalEnergy: 0,
      maxEnhancement: 0,
      completedCount: 0,
      failedCount: 0,
      outcomeCounts: emptyCounts,
      claimTierCounts: {},
    };
  }

  const completed = experiments.filter(e => e.status === 'completed').length;
  const failed = experiments.filter(e => e.status === 'failed').length;
  const enhancementValues = experiments
    .map(e => e.enhancementFactor || e.enhancement_factor)
    .filter(v => v != null);
  const energyValues = experiments
    .map(e => e.energyOutput || e.energy_output_kev)
    .filter(v => v != null);
  const outcomeCounts = { ...emptyCounts };
  experiments.forEach((experiment) => {
    const outcome = classifyLocalOutcome(experiment);
    outcomeCounts[outcome] = (outcomeCounts[outcome] || 0) + 1;
  });
  const completionRate = experiments.length > 0 ? (completed / experiments.length * 100) : 0;
  const scientificPositiveRate = experiments.length > 0
    ? (outcomeCounts.positive / experiments.length * 100)
    : 0;

  return {
    totalSimulations: experiments.length,
    successRate: completionRate,
    completionRate,
    scientificPositiveRate,
    avgEnhancement: enhancementValues.length > 0
      ? enhancementValues.reduce((a, b) => a + b, 0) / enhancementValues.length
      : 0,
    totalEnergy: energyValues.reduce((a, b) => a + b, 0),
    maxEnhancement: enhancementValues.length > 0 ? Math.max(...enhancementValues) : 0,
    completedCount: completed,
    failedCount: failed,
    outcomeCounts,
    claimTierCounts: {},
  };
}

/**
 * Get local type distribution (fallback)
 */
function getLocalTypeDistribution() {
  const experiments = getLocalExperimentsRaw();
  const counts = {};
  
  experiments.forEach(exp => {
    const type = exp.type || exp.experiment_type || 'Unknown';
    counts[type] = (counts[type] || 0) + 1;
  });
  
  const total = experiments.length;
  return Object.entries(counts).map(([name, value]) => ({
    name,
    value,
    percentage: total > 0 ? (value / total * 100) : 0,
  }));
}

/**
 * Get local temperature distribution (fallback)
 */
function getLocalTemperatureDistribution() {
  const experiments = getLocalExperimentsRaw();
  const temps = experiments
    .map(e => e.temperature || e.temperature_k)
    .filter(v => v != null);
  
  if (temps.length === 0) return [];
  
  // Simple binning
  const bins = {};
  temps.forEach(temp => {
    const bin = Math.floor(temp / 100) * 100;
    const key = `${bin}-${bin + 100}K`;
    bins[key] = (bins[key] || 0) + 1;
  });
  
  return Object.entries(bins).map(([range, count]) => ({ range, count }));
}

/**
 * Get local timeline (fallback)
 */
function getLocalTimeline() {
  const experiments = getLocalExperimentsRaw();
  
  return experiments
    .slice(0, 30)
    .reverse()
    .map(exp => ({
      date: exp.timestamp ? new Date(exp.timestamp).toISOString().split('T')[0] : 'Unknown',
      name: exp.name || 'Unnamed',
      enhancementFactor: exp.enhancementFactor || exp.enhancement_factor || 0,
      energyOutput: exp.energyOutput || exp.energy_output_kev || 0,
      type: exp.type || exp.experiment_type || 'Unknown',
      status: exp.status || 'completed',
    }));
}

/**
 * Get local experiments with pagination (fallback)
 */
function getLocalExperiments(options = {}) {
  const { limit = 50, offset = 0 } = options;
  const experiments = getLocalExperimentsRaw();
  
  // Transform to match API format
  const transformed = experiments.map(exp => ({
    id: exp.id,
    name: exp.name || 'Unnamed',
    type: exp.type || exp.experiment_type || 'Unknown',
    status: exp.status || 'completed',
    material: exp.material || 'Unknown',
    temperature_k: exp.temperature || exp.temperature_k || 300,
    enhancement_factor: exp.enhancementFactor || exp.enhancement_factor,
    energy_output_kev: exp.energyOutput || exp.energy_output_kev,
    created_at: exp.timestamp || exp.created_at,
    is_baseline: exp.is_baseline || false,
  }));
  
  return {
    experiments: transformed.slice(offset, offset + limit),
    total: transformed.length,
    limit,
    offset,
  };
}

/**
 * Get local experiments by IDs (fallback)
 */
function getLocalExperimentsById(ids) {
  const experiments = getLocalExperimentsRaw();
  return experiments.filter(exp => ids.includes(exp.id));
}

/**
 * Export local experiments to CSV (fallback)
 */
function exportLocalCSV() {
  const experiments = getLocalExperimentsRaw();
  
  if (experiments.length === 0) {
    return new Blob(['No data to export'], { type: 'text/csv' });
  }
  
  const headers = ['id', 'name', 'type', 'status', 'material', 'temperature_k', 
                   'enhancement_factor', 'energy_output_kev', 'created_at'];
  
  const rows = experiments.map(exp => [
    exp.id,
    `"${exp.name || ''}"`,
    exp.type || exp.experiment_type || '',
    exp.status || '',
    exp.material || '',
    exp.temperature || exp.temperature_k || '',
    exp.enhancementFactor || exp.enhancement_factor || '',
    exp.energyOutput || exp.energy_output_kev || '',
    exp.timestamp || exp.created_at || '',
  ].join(','));
  
  const csv = [headers.join(','), ...rows].join('\n');
  return new Blob([csv], { type: 'text/csv' });
}

analyticsApi.getLocalStats = getLocalStats;

export default analyticsApi;
export { getSessionId, getLocalStats };
