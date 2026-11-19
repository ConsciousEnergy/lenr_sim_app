/**
 * Live read-only literature corpus MoE coverage for Analytics §5B.
 *
 * Fetches GET /api/analytics/literature-corpus-moe-coverage and validates
 * honesty locks before returning. Callers keep the SPA freeze
 * (CORPUS_MOE_COVERAGE) as fallback when the network fails or the payload
 * violates locks — never invent σ_Q or flip lenr_proved / EQ-OPEN.
 */

import { API_BASE_URL } from '../../config/api';

export const LITERATURE_CORPUS_MOE_COVERAGE_PATH =
  '/api/analytics/literature-corpus-moe-coverage';

/**
 * @typedef {object} LiteratureCorpusMoeCoverage
 * @property {string} [schema]
 * @property {number} [n_records]
 * @property {number} [with_sigma_q]
 * @property {number} [with_literature_reported_cite_gated]
 * @property {number} [with_moe_pairing_verified]
 * @property {number} [discovery_grade_eligible_count]
 * @property {string[]} [discovery_grade_eligible_ids]
 * @property {boolean} [closes_eq_open]
 * @property {boolean} [lenr_proved]
 * @property {string} [source]
 * @property {string} [live_endpoint]
 */

/**
 * Validate absolute honesty locks on a live coverage payload.
 * @param {unknown} payload
 * @returns {payload is LiteratureCorpusMoeCoverage}
 */
export function isHonestLiteratureCorpusMoeCoverage(payload) {
  if (!payload || typeof payload !== 'object') return false;
  const row = /** @type {Record<string, unknown>} */ (payload);
  if (row.closes_eq_open !== false) return false;
  if (row.lenr_proved !== false) return false;
  if (typeof row.n_records !== 'number' || row.n_records < 1) return false;
  if (typeof row.discovery_grade_eligible_count !== 'number') return false;
  if (row.discovery_grade_eligible_count >= row.n_records) return false;
  if (row.schema != null && row.schema !== 'lenr-moe-coverage-v1') return false;
  return true;
}

/**
 * Fetch live coverage. Returns null on network / honesty failure.
 * @param {{ signal?: AbortSignal, fetchImpl?: typeof fetch }} [opts]
 * @returns {Promise<LiteratureCorpusMoeCoverage | null>}
 */
export async function fetchLiteratureCorpusMoeCoverage(opts = {}) {
  const fetchImpl = opts.fetchImpl || fetch;
  const url = `${API_BASE_URL}${LITERATURE_CORPUS_MOE_COVERAGE_PATH}`;
  try {
    const response = await fetchImpl(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: opts.signal,
    });
    if (!response.ok) return null;
    const payload = await response.json();
    if (!isHonestLiteratureCorpusMoeCoverage(payload)) return null;
    return payload;
  } catch {
    return null;
  }
}
