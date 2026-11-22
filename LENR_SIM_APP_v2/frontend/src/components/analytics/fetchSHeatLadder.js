/**
 * Live HIP-02 S_heat / σ ladder + ENG-HS-08 ranked-regime hygiene.
 *
 * Fetches GET /api/analytics/s-heat-ladder and validates honesty locks.
 * Callers keep SPA freeze fallback when network fails — never invent σ_Q.
 */

import { API_BASE_URL } from '../../config/api';

export const S_HEAT_LADDER_PATH = '/api/analytics/s-heat-ladder';

/**
 * @param {unknown} payload
 * @returns {boolean}
 */
export function isHonestSHeatLadder(payload) {
  if (!payload || typeof payload !== 'object') return false;
  const row = /** @type {Record<string, unknown>} */ (payload);
  if (row.closes_eq_open !== false) return false;
  if (row.lenr_proved !== false) return false;
  if (row.schema != null && row.schema !== 'lenr-s-heat-ladder-v1') return false;
  if (typeof row.n_records !== 'number' || row.n_records < 1) return false;
  if (typeof row.discovery_grade_threshold_sigma !== 'number') return false;
  if (!Array.isArray(row.ranked_high_success)) return false;
  if (!Array.isArray(row.honest_high_success_order_ids)) return false;
  // High-success list must never include seed-scale demotions.
  if (
    Array.isArray(row.demoted_seed_scale) &&
    row.demoted_seed_scale.some(
      (r) =>
        r &&
        typeof r === 'object' &&
        /** @type {{ high_success_rankable?: boolean }} */ (r).high_success_rankable ===
          true,
    )
  ) {
    return false;
  }
  return true;
}

/**
 * @param {{ signal?: AbortSignal, fetchImpl?: typeof fetch }} [opts]
 * @returns {Promise<object | null>}
 */
export async function fetchSHeatLadder(opts = {}) {
  let fetchImpl = opts.fetchImpl || null;
  if (!fetchImpl && typeof fetch === 'function') {
    fetchImpl = fetch;
  }
  if (!fetchImpl) return null;
  const url = `${API_BASE_URL}${S_HEAT_LADDER_PATH}`;
  try {
    const response = await fetchImpl(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: opts.signal,
    });
    if (!response.ok) return null;
    const payload = await response.json();
    if (!isHonestSHeatLadder(payload)) return null;
    return payload;
  } catch {
    return null;
  }
}
