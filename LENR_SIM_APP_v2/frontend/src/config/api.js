/**
 * Centralized API configuration for LENR Simulation App
 *
 * All API clients should import from this module instead of reading
 * process.env directly.  This ensures a single source of truth for
 * the backend URL, timeout, and WebSocket URL.
 *
 * Environment variable: REACT_APP_API_URL or VITE_API_URL
 * (e.g. http://localhost:8010)
 *
 * In development without direct API override, uses empty string so requests
 * go through the dev server proxy (Vite `server.proxy`) to avoid
 * CORS and trailing-slash redirect issues.
 */
const isDev = process.env.NODE_ENV !== 'production';
const readViteEnv = () => {
  try {
    // Avoid direct import.meta syntax so Jest/CommonJS can parse this file.
    return Function(
      'try { return (typeof import !== "undefined" && import.meta && import.meta.env) ? import.meta.env : {}; } catch (_) { return {}; }'
    )();
  } catch (_) {
    return {};
  }
};
const metaEnv = readViteEnv();
const runtimeApiUrl =
  process.env.REACT_APP_API_URL || metaEnv.VITE_API_URL || '';
const forceDirectApi =
  process.env.REACT_APP_FORCE_DIRECT_API === 'true' ||
  metaEnv.VITE_FORCE_DIRECT_API === 'true';

/**
 * In development, default to relative /api paths so package.json proxy controls backend target.
 * This prevents stale .env.local values from forcing requests to the wrong local service/port.
 */
export const API_BASE_URL = isDev
  ? (forceDirectApi ? runtimeApiUrl : '')
  : (runtimeApiUrl || 'https://api.conscious.energy');

export const DEFAULT_TIMEOUT = 30000; // 30 seconds

/**
 * Resolve an API path against configured base URL.
 * In dev, API_BASE_URL is intentionally empty so `/api/...` goes through the
 * Vite dev-server proxy (see vite.config.js `server.proxy`), which avoids CORS.
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
  const base = API_BASE_URL || (typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.host}` : 'http://localhost:8010');
  const wsProtocol = base.startsWith('https') ? 'wss' : 'ws';
  const host = base.replace(/^https?:\/\//, '');
  return `${wsProtocol}://${host}${path}`;
}

if (isDev && typeof window !== 'undefined') {
  // Helpful startup diagnostic to quickly catch stale env/proxy configuration.
  // eslint-disable-next-line no-console
  console.info('[API Config]', {
    nodeEnv: process.env.NODE_ENV,
    viteMode: metaEnv.MODE || '(unknown)',
    reactAppApiUrl: process.env.REACT_APP_API_URL || '(unset)',
    viteApiUrl: metaEnv.VITE_API_URL || '(unset)',
    forceDirectApi,
    effectiveApiBase: API_BASE_URL || '(dev-proxy)',
    effectiveWebSocketBase: getWebSocketUrl(''),
  });
}
