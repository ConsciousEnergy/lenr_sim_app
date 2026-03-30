/**
 * Centralized API configuration for LENR Simulation App
 *
 * All API clients should import from this module instead of reading
 * process.env directly.  This ensures a single source of truth for
 * the backend URL, timeout, and WebSocket URL.
 *
 * Environment variable: REACT_APP_API_URL (e.g. http://localhost:8000)
 *
 * In development without REACT_APP_API_URL, uses empty string so requests
 * go through the dev server proxy (package.json "proxy" field) to avoid
 * CORS and trailing-slash redirect issues.
 */
const isDev = process.env.NODE_ENV !== 'production';
const runtimeApiUrl = process.env.REACT_APP_API_URL || '';
const forceDirectApi = process.env.REACT_APP_FORCE_DIRECT_API === 'true';

/**
 * In development, default to relative /api paths so package.json proxy controls backend target.
 * This prevents stale .env.local values from forcing requests to the wrong local service/port.
 */
export const API_BASE_URL = isDev
  ? (forceDirectApi ? runtimeApiUrl : '')
  : (runtimeApiUrl || 'http://localhost:8000');

export const DEFAULT_TIMEOUT = 30000; // 30 seconds

/**
 * Resolve an API path against configured base URL.
 * In dev, API_BASE_URL is intentionally empty so `/api/...` uses CRA proxy.
 */
export function resolveApiUrl(path) {
  if (!path) return API_BASE_URL || '';
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

/**
 * Derive a WebSocket URL from the HTTP base URL.
 * http  -> ws
 * https -> wss
 * When API_BASE_URL is empty (dev proxy), uses window.location so the proxy can forward.
 */
export function getWebSocketUrl(path = '/ws') {
  const base = API_BASE_URL || (typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.host}` : 'http://localhost:8000');
  const wsProtocol = base.startsWith('https') ? 'wss' : 'ws';
  const host = base.replace(/^https?:\/\//, '');
  return `${wsProtocol}://${host}${path}`;
}

if (isDev && typeof window !== 'undefined') {
  // Helpful startup diagnostic to quickly catch stale env/proxy configuration.
  // eslint-disable-next-line no-console
  console.info('[API Config]', {
    nodeEnv: process.env.NODE_ENV,
    reactAppApiUrl: process.env.REACT_APP_API_URL || '(unset)',
    forceDirectApi,
    effectiveApiBase: API_BASE_URL || '(dev-proxy)',
    effectiveWebSocketBase: getWebSocketUrl(''),
  });
}
