/**
 * Quiet prefer-engine bootstrap: when /api/health is OK and no engine
 * samples are bound yet, fire one bubble-lattice Run so the UBLV HUD
 * defaults to Engine samples instead of Local Calc.
 *
 * Process honesty only — not a new physics claim. Never runs during
 * maintenance hide-run, and never invents samples when health fails.
 */

/**
 * @param {{ healthOk: boolean, hasSimulationData: boolean, maintenanceHideRun?: boolean }} opts
 * @returns {boolean}
 */
export function shouldPreferEngineBootstrap({
  healthOk,
  hasSimulationData,
  maintenanceHideRun = false,
}) {
  if (maintenanceHideRun) return false;
  if (!healthOk) return false;
  if (hasSimulationData) return false;
  return true;
}

/**
 * Probe GET /api/health. Returns true only on HTTP 2xx.
 * @param {(path: string) => string} resolveUrl
 * @param {typeof fetch} [fetchImpl]
 */
export async function probeApiHealthOk(resolveUrl, fetchImpl = fetch) {
  const url = resolveUrl('/api/health');
  try {
    const response = await fetchImpl(url, { method: 'GET' });
    return Boolean(response && response.ok);
  } catch {
    return false;
  }
}
