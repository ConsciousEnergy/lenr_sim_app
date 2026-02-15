/**
 * Core API service for the LENR Simulation App
 *
 * Delegates all HTTP calls to the canonical Axios client in api/client.ts
 * so every request flows through a single instance (shared interceptors,
 * auth headers, base URL, and timeout).
 *
 * Preserves the retry/backoff wrapper that dependents rely on.
 */

import { apiClient } from '../api/client';

/**
 * Custom API error class (kept for backward-compatibility with analyticsApi, physics, etc.)
 */
export class ApiError extends Error {
  constructor(message, statusCode, data) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.data = data;
  }
}

/**
 * Default retry / timeout policy
 */
const DEFAULTS = {
  retries: 1,
  timeout: 30_000,
};

/**
 * Execute an API request through the canonical Axios client with optional retry.
 *
 * @param {string} endpoint - API endpoint (relative, e.g. "/physics/fusion/enhanced")
 * @param {object} options  - { method, data, headers, retries, timeout, ... }
 * @returns {Promise<any>}  - Resolved response data
 */
const executeRequest = async (endpoint, options = {}) => {
  const { retries = DEFAULTS.retries, timeout = DEFAULTS.timeout, ...axiosOpts } = options;

  let lastError;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await apiClient({
        url: endpoint,
        timeout,
        ...axiosOpts,
      });
      return response.data;
    } catch (error) {
      lastError = error;

      // Don't retry on client-side cancellations or exhausted attempts
      if (error?.code === 'ERR_CANCELED' || attempt === retries) break;

      // Exponential back-off
      await new Promise((resolve) => setTimeout(resolve, 2 ** attempt * 1000));
    }
  }

  // Normalise to ApiError
  if (lastError instanceof ApiError) throw lastError;
  const status = lastError?.response?.status ?? lastError?.statusCode ?? 500;
  const message = lastError?.response?.data?.detail
    ?? lastError?.message
    ?? 'Request failed';
  throw new ApiError(message, status, lastError?.response?.data);
};

/**
 * API client functions (backward-compatible interface)
 */
const api = {
  get: (endpoint, options = {}) =>
    executeRequest(endpoint, { ...options, method: 'GET' }),

  post: (endpoint, data, options = {}) =>
    executeRequest(endpoint, { ...options, method: 'POST', data }),

  put: (endpoint, data, options = {}) =>
    executeRequest(endpoint, { ...options, method: 'PUT', data }),

  delete: (endpoint, options = {}) =>
    executeRequest(endpoint, { ...options, method: 'DELETE' }),

  patch: (endpoint, data, options = {}) =>
    executeRequest(endpoint, { ...options, method: 'PATCH', data }),
};

/**
 * Enhanced Fusion API endpoint
 * @param {Object} params - Fusion simulation parameters
 * @returns {Promise} Promise resolving to fusion simulation results
 */
export const getEnhancedFusion = async (params) => {
  return api.post('/api/physics/fusion/enhanced', params);
};

export default api;
