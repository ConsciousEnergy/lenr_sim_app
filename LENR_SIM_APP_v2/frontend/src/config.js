/**
 * Application configuration settings
 */

// API base URL with environment-specific fallback
export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

// Other configuration settings can be added here
export const DEFAULT_TIMEOUT = 30000; // 30 seconds
export const MAX_SIMULATION_TIME = 3600; // 1 hour
export const DEFAULT_REFRESH_INTERVAL = 5000; // 5 seconds 