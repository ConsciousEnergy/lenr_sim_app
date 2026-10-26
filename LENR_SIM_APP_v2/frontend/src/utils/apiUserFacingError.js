/**
 * Science-safe user-facing messages for API / CORS / WebSocket failures.
 *
 * Network and split-origin (e.g. app-staging → api-staging) failures must never
 * be phrased as physics validation failures or as proof of a scientific claim.
 * Schematic / local fallbacks are model placeholders only.
 */

const CORS_HINT =
  /cors|cross-origin|access-control-allow-origin|blocked by cors/i;
const NETWORK_HINT =
  /failed to fetch|networkerror|network error|load failed|err_connection|econnrefused|enotfound/i;
const WS_HINT = /websocket|ws connection|stream connection/i;
const TIMEOUT_HINT = /timeout|timed out|econnaborted/i;

/**
 * @param {unknown} error
 * @returns {{ kind: string, message: string, isTransport: boolean }}
 */
export function classifyTransportError(error) {
  const raw =
    (error && typeof error === 'object' && 'message' in error && error.message) ||
    (typeof error === 'string' ? error : '') ||
    '';
  const text = String(raw);

  if (CORS_HINT.test(text)) {
    return {
      kind: 'cors',
      isTransport: true,
      message:
        'API blocked by browser CORS or misconfigured origin. Check VITE_API_URL ' +
        'points at the intended host (e.g. https://api-staging.conscious.energy). ' +
        'Any on-screen numbers are not a laboratory measurement.',
    };
  }

  if (TIMEOUT_HINT.test(text)) {
    return {
      kind: 'timeout',
      isTransport: true,
      message:
        'Backend request timed out. Results shown after a timeout are schematic ' +
        'placeholders only — not validated physics output.',
    };
  }

  if (WS_HINT.test(text)) {
    return {
      kind: 'websocket',
      isTransport: true,
      message:
        'Live stream WebSocket failed (split-origin or proxy). Reconnect or fall ' +
        'back to a full HTTP run. Stream gaps are not scientific null results.',
    };
  }

  if (
    NETWORK_HINT.test(text) ||
    (error && typeof error === 'object' && error.name === 'TypeError' && /fetch/i.test(text))
  ) {
    return {
      kind: 'network',
      isTransport: true,
      message:
        'Cannot reach the simulation API. Confirm VITE_API_URL / CORS for this ' +
        'deployment. Local or schematic values are placeholders — do not cite them.',
    };
  }

  return {
    kind: 'other',
    isTransport: false,
    message: text || 'An unexpected client error occurred.',
  };
}

/**
 * Message for UI alerts when a run falls back to local/schematic calculations.
 * @param {unknown} error
 * @returns {string}
 */
export function schematicFallbackMessage(error) {
  const classified = classifyTransportError(error);
  if (classified.isTransport) {
    return `${classified.message} Using schematic local calculations (limited accuracy).`;
  }
  return (
    'Backend unavailable or returned an error. Using schematic local calculations ' +
    '(limited accuracy) — not a scientific confirmation.'
  );
}

/**
 * Short WS/stream error for alerts (no science overclaim).
 * @param {unknown} error
 * @returns {string}
 */
export function streamFailureMessage(error) {
  const classified = classifyTransportError(error || 'WebSocket connection failed');
  if (classified.kind === 'websocket' || classified.isTransport) {
    return classified.message;
  }
  return (
    `Live stream failed: ${classified.message}. This is a connectivity issue, ` +
    'not a physics falsification.'
  );
}
