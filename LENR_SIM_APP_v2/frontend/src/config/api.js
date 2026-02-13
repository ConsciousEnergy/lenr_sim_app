/**
 * Centralized API configuration for LENR Simulation App
 *
 * All API clients should import from this module instead of reading
 * process.env directly.  This ensures a single source of truth for
 * the backend URL, timeout, and WebSocket URL.
 *
 * Environment variable: REACT_APP_API_URL (e.g. http://localhost:8000)
 */

export const API_BASE_URL =
  process.env.REACT_APP_API_URL || 'http://localhost:8000';

export const DEFAULT_TIMEOUT = 30000; // 30 seconds

/**
 * Derive a WebSocket URL from the HTTP base URL.
 * http  -> ws
 * https -> wss
 */
export function getWebSocketUrl(path = '/ws') {
  const wsProtocol = API_BASE_URL.startsWith('https') ? 'wss' : 'ws';
  const host = API_BASE_URL.replace(/^https?:\/\//, '');
  return `${wsProtocol}://${host}${path}`;
}
