/**
 * Normalize Analytics experiment discovery_grade_gap / honest_closure envelopes.
 * Falls back to corpus static checklist when API fields are absent (offline / old rows).
 * Never invents lenr_proved true or EQ-OPEN CLOSED.
 *
 * UI optics (BDS-334): never display analytics gate clearance as "≥5σ … met".
 * Map schema `met` → display label `analytics_gates_clear`.
 */
import {
  DAQ_SAMPLE_PROVENANCE,
  DISCOVERY_GRADE_BAR,
  DISCOVERY_GRADE_MISSING,
  EMP_EXPLORATORY_WHY_NOT_DISCOVERY,
  OPEN_EQ_IDS,
  QUANTITATIVE_DISTANCE_DEFAULT,
} from '../../config/unifiedTheoryScienceEvidence';

/**
 * Planned DAQ sample provenance stamped onto History / export envelopes.
 * Soft honesty only — never invents attested measurements or EQ-OPEN discharge.
 * @returns {Readonly<{
 *   schema_id: string,
 *   trust_plane: string,
 *   ingest_status: string,
 *   refuse_fabricated_samples: boolean,
 *   lenr_proved_default: false,
 *   closes_eq_open: false,
 * }>}
 */
export function plannedDaqSampleProvenanceEnvelope() {
  return Object.freeze({
    schema_id: DAQ_SAMPLE_PROVENANCE.schema_id,
    trust_plane: DAQ_SAMPLE_PROVENANCE.trust_plane,
    ingest_status: DAQ_SAMPLE_PROVENANCE.ingest_status,
    refuse_fabricated_samples: true,
    lenr_proved_default: false,
    closes_eq_open: false,
  });
}

/**
 * Display label for discovery_grade_gap.overall_status.
 * Schema may still use `met`/`not_met`; UI must not say "≥5σ gap: met".
 * @param {string|null|undefined} overallStatus
 * @returns {'analytics_gates_clear'|'not_met'}
 */
export function analyticsGateDisplayStatus(overallStatus) {
  return overallStatus === 'met' || overallStatus === 'analytics_gates_clear'
    ? 'analytics_gates_clear'
    : 'not_met';
}

/**
 * Resolve structured EMP “why not discovery” copy for a History / export row.
 * Soft honesty only — never invents discovery eligibility.
 *
 * @param {object|null|undefined} exp
 * @param {object|null|undefined} [_quantitativeDistance] retained for call-site compat; unused
 * @returns {object|null}
 */
export function resolveEmpWhyNotDiscovery(exp = {}, _quantitativeDistance = null) {
  const safeExp = exp && typeof exp === 'object' ? exp : {};
  const results =
    safeExp.results && typeof safeExp.results === 'object' ? safeExp.results : {};
  const litId =
    safeExp.literature_id ||
    results.literature_id ||
    safeExp.id ||
    results.id ||
    null;
  if (litId) {
    const byId = EMP_EXPLORATORY_WHY_NOT_DISCOVERY.find(
      (row) => row.literature_id === litId,
    );
    if (byId) return byId;
  }
  // Unknown / unmatched identities must not inherit Miles/McKubre-specific copy
  // from shared provenance or distance_status alone.
  return null;
}

/**
 * @param {object|null|undefined} exp
 * @returns {{
 *   discoveryGradeEligible: boolean,
 *   discoveryGradeGap: object,
 *   honestClosure: object,
 *   quantitativeDistance: object,
 *   analyticsGateStatus: 'analytics_gates_clear'|'not_met',
 *   empWhyNotDiscovery: object|null,
 *   daqSampleProvenance: object,
 *   lenrProved: false,
 * }}
 */
export function normalizeExperimentDiscoveryEnvelopes(exp = {}) {
  const safeExp = exp && typeof exp === 'object' ? exp : {};
  const results =
    safeExp.results && typeof safeExp.results === 'object' ? safeExp.results : {};
  const summary =
    (safeExp.bayesian_summary && typeof safeExp.bayesian_summary === 'object'
      ? safeExp.bayesian_summary
      : null) ||
    (results.bayesian_summary && typeof results.bayesian_summary === 'object'
      ? results.bayesian_summary
      : {}) ||
    {};

  const rawGap =
    safeExp.discovery_grade_gap ||
    results.discovery_grade_gap ||
    summary.discovery_grade_gap ||
    null;
  const rawClosure =
    safeExp.honest_closure ||
    results.honest_closure ||
    summary.honest_closure ||
    null;
  const rawDistance =
    safeExp.quantitative_distance ||
    results.quantitative_distance ||
    summary.quantitative_distance ||
    (rawGap && typeof rawGap === 'object' ? rawGap.quantitative_distance : null) ||
    null;

  const discoveryGradeGap =
    rawGap && typeof rawGap === 'object'
      ? {
          ...rawGap,
          overall_status: rawGap.overall_status === 'met' ? 'met' : 'not_met',
          lenr_proved: false,
          eq_open_status: forceOpenStatus(rawGap.eq_open_status),
        }
      : corpusDiscoveryGapFallback();

  const honestClosure =
    rawClosure && typeof rawClosure === 'object'
      ? {
          ...rawClosure,
          // Hard honesty: UI never treats closure as met from campaign/analytics alone.
          overall_status: 'not_met',
          lenr_proved: false,
          eq_open_status: forceOpenStatus(rawClosure.eq_open_status),
        }
      : corpusHonestClosureFallback(discoveryGradeGap);

  const quantitativeDistance =
    rawDistance && typeof rawDistance === 'object'
      ? {
          ...QUANTITATIVE_DISTANCE_DEFAULT,
          ...rawDistance,
          discovery_grade_eligible: Boolean(rawDistance.discovery_grade_eligible),
          lenr_proved: false,
          eq_open_status: forceOpenStatus(rawDistance.eq_open_status),
        }
      : discoveryGradeGap.quantitative_distance &&
          typeof discoveryGradeGap.quantitative_distance === 'object'
        ? {
            ...QUANTITATIVE_DISTANCE_DEFAULT,
            ...discoveryGradeGap.quantitative_distance,
            lenr_proved: false,
            eq_open_status: forceOpenStatus(
              discoveryGradeGap.quantitative_distance.eq_open_status,
            ),
          }
        : {
            ...QUANTITATIVE_DISTANCE_DEFAULT,
            lenr_proved: false,
            eq_open_status: Object.fromEntries(OPEN_EQ_IDS.map((id) => [id, 'OPEN'])),
          };

  const discoveryGradeEligible = Boolean(
    safeExp.discovery_grade_eligible ??
      results.discovery_grade_eligible ??
      summary.discovery_grade_eligible ??
      false,
  );

  const analyticsGateStatus = analyticsGateDisplayStatus(
    discoveryGradeGap.overall_status,
  );

  const empWhyNotDiscovery = resolveEmpWhyNotDiscovery(
    safeExp,
    quantitativeDistance,
  );

  const daqSampleProvenance = plannedDaqSampleProvenanceEnvelope();
  // Stamp planned DAQ provenance onto closure envelope (never attested / never discharge).
  if (honestClosure && typeof honestClosure === 'object') {
    honestClosure.daq_sample_provenance = {
      ...(honestClosure.daq_sample_provenance &&
      typeof honestClosure.daq_sample_provenance === 'object'
        ? honestClosure.daq_sample_provenance
        : {}),
      ...daqSampleProvenance,
      ingest_status: DAQ_SAMPLE_PROVENANCE.ingest_status,
      closes_eq_open: false,
      lenr_proved_default: false,
    };
  }

  return {
    discoveryGradeEligible,
    discoveryGradeGap,
    honestClosure,
    quantitativeDistance,
    analyticsGateStatus,
    empWhyNotDiscovery,
    daqSampleProvenance,
    lenrProved: false,
  };
}

function forceOpenStatus(statusMap) {
  const base = Object.fromEntries(OPEN_EQ_IDS.map((id) => [id, 'OPEN']));
  if (!statusMap || typeof statusMap !== 'object') return base;
  return { ...base, ...Object.fromEntries(
    Object.keys(statusMap).map((id) => [id, 'OPEN']),
  ) };
}

function corpusDiscoveryGapFallback() {
  return {
    schema: 'lenr-discovery-grade-gap-v1',
    overall_status: DISCOVERY_GRADE_BAR.status,
    discovery_grade_eligible: false,
    discovery_grade_threshold_sigma: DISCOVERY_GRADE_BAR.sigma_threshold,
    requirements: DISCOVERY_GRADE_MISSING,
    missing_requirements: DISCOVERY_GRADE_MISSING,
    missing_ids: DISCOVERY_GRADE_MISSING.map((row) => row.id),
    quantitative_distance: {
      ...QUANTITATIVE_DISTANCE_DEFAULT,
      lenr_proved: false,
      eq_open_status: Object.fromEntries(OPEN_EQ_IDS.map((id) => [id, 'OPEN'])),
    },
    lenr_proved: false,
    eq_open_status: Object.fromEntries(OPEN_EQ_IDS.map((id) => [id, 'OPEN'])),
  };
}

function corpusHonestClosureFallback(discoveryGradeGap) {
  const missing = [
    ...(discoveryGradeGap.missing_requirements || []),
    ...DISCOVERY_GRADE_MISSING.filter((row) =>
      ['eq_open_discharge', 'governance_signoff'].includes(row.id),
    ),
  ];
  // Dedupe by id while preserving order.
  const seen = new Set();
  const unique = [];
  for (const row of missing) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    unique.push(row);
  }
  return {
    schema: 'lenr-honest-closure-gap-v1',
    overall_status: 'not_met',
    discovery_grade_gap: discoveryGradeGap,
    missing_requirements: unique,
    missing_ids: unique.map((row) => row.id),
    lenr_proved: false,
    eq_open_status: Object.fromEntries(OPEN_EQ_IDS.map((id) => [id, 'OPEN'])),
  };
}
