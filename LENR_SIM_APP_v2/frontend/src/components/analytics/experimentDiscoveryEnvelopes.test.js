import {
  analyticsGateDisplayStatus,
  normalizeExperimentDiscoveryEnvelopes,
  resolveEmpWhyNotDiscovery,
} from './experimentDiscoveryEnvelopes';

describe('normalizeExperimentDiscoveryEnvelopes', () => {
  test('tolerates null experiment input without throwing', () => {
    const envelopes = normalizeExperimentDiscoveryEnvelopes(null);
    expect(envelopes.lenrProved).toBe(false);
    expect(envelopes.discoveryGradeEligible).toBe(false);
    expect(envelopes.discoveryGradeGap.overall_status).toBe('not_met');
    expect(envelopes.honestClosure.overall_status).toBe('not_met');
  });

  test('falls back to corpus not_met envelopes when API fields absent', () => {
    const envelopes = normalizeExperimentDiscoveryEnvelopes({ id: 'x' });
    expect(envelopes.lenrProved).toBe(false);
    expect(envelopes.discoveryGradeEligible).toBe(false);
    expect(envelopes.discoveryGradeGap.overall_status).toBe('not_met');
    expect(envelopes.analyticsGateStatus).toBe('not_met');
    expect(envelopes.honestClosure.overall_status).toBe('not_met');
    expect(envelopes.quantitativeDistance.distance_status).toBe('undefined');
    expect(envelopes.quantitativeDistance.lenr_proved).toBe(false);
    expect(envelopes.empWhyNotDiscovery).toBeNull();
    expect(envelopes.honestClosure.missing_ids).toEqual(
      expect.arrayContaining(['eq_open_discharge', 'governance_signoff']),
    );
    expect(
      Object.values(envelopes.honestClosure.eq_open_status).every((v) => v === 'OPEN'),
    ).toBe(true);
  });

  test('resolves Miles EMP why-not-discovery without inventing eligibility', () => {
    const why = resolveEmpWhyNotDiscovery({ literature_id: 'miles-1993' });
    expect(why).not.toBeNull();
    expect(why.discovery_grade_eligible).toBe(false);
    expect(why.distance_status).toBe('at_or_above_bar_gates_blocked');
    expect(why.reasons.join(' ')).toMatch(/instrument_precision|pairing/i);

    const envelopes = normalizeExperimentDiscoveryEnvelopes({
      literature_id: 'miles-1993',
      discovery_grade_eligible: false,
      quantitative_distance: {
        distance_status: 'at_or_above_bar_gates_blocked',
        s_heat: 26,
        moe_provenance: 'literature_reported_instrument_precision',
        moe_sigma_q_pairing_verified: false,
        discovery_grade_eligible: false,
        lenr_proved: false,
      },
    });
    expect(envelopes.empWhyNotDiscovery.literature_id).toBe('miles-1993');
    expect(envelopes.empWhyNotDiscovery.discovery_grade_eligible).toBe(false);
    expect(envelopes.discoveryGradeEligible).toBe(false);
  });

  test('unknown experiment ID does not inherit Miles/McKubre EMP copy', () => {
    const why = resolveEmpWhyNotDiscovery(
      { literature_id: 'unknown-lab-row-xyz', id: 'unknown-lab-row-xyz' },
      {
        distance_status: 'at_or_above_bar_gates_blocked',
        moe_provenance: 'literature_reported_instrument_precision',
      },
    );
    expect(why).toBeNull();

    const floorWhy = resolveEmpWhyNotDiscovery(
      { id: 'orphan-floor-row' },
      {
        distance_status: 'undefined',
        moe_provenance: 'literature_reported_instrument_floor',
      },
    );
    expect(floorWhy).toBeNull();

    const envelopes = normalizeExperimentDiscoveryEnvelopes({
      literature_id: 'unknown-lab-row-xyz',
      moe_provenance: 'literature_reported_instrument_precision',
      quantitative_distance: {
        distance_status: 'at_or_above_bar_gates_blocked',
        moe_provenance: 'literature_reported_instrument_precision',
        lenr_proved: false,
      },
    });
    expect(envelopes.empWhyNotDiscovery).toBeNull();
    expect(envelopes.lenrProved).toBe(false);
  });

  test('maps schema met → analytics_gates_clear display; keeps honest_closure not_met', () => {
    expect(analyticsGateDisplayStatus('met')).toBe('analytics_gates_clear');
    expect(analyticsGateDisplayStatus('not_met')).toBe('not_met');
    const envelopes = normalizeExperimentDiscoveryEnvelopes({
      discovery_grade_eligible: true,
      discovery_grade_gap: {
        overall_status: 'met',
        missing_ids: [],
        missing_requirements: [],
        lenr_proved: true, // hostile payload — must be forced false
        eq_open_status: { 'EQ-OPEN-YIELD-01': 'CLOSED' },
      },
      honest_closure: {
        overall_status: 'met', // hostile — must stay not_met
        missing_ids: ['eq_open_discharge'],
        missing_requirements: [
          { id: 'eq_open_discharge', label: 'EQ-OPEN discharge', status: 'not_met' },
        ],
        lenr_proved: true,
        eq_open_status: { 'EQ-OPEN-YIELD-01': 'CLOSED' },
      },
      quantitative_distance: {
        distance_status: 'at_or_above_bar_gates_clear',
        s_heat: 13.75,
        moe_provenance: 'literature_reported',
        arithmetic_sigma_shortfall: 0,
        lenr_proved: true,
        eq_open_status: { 'EQ-OPEN-YIELD-01': 'CLOSED' },
      },
    });
    expect(envelopes.discoveryGradeEligible).toBe(true);
    expect(envelopes.discoveryGradeGap.overall_status).toBe('met');
    expect(envelopes.analyticsGateStatus).toBe('analytics_gates_clear');
    expect(envelopes.discoveryGradeGap.lenr_proved).toBe(false);
    expect(envelopes.honestClosure.overall_status).toBe('not_met');
    expect(envelopes.honestClosure.lenr_proved).toBe(false);
    expect(envelopes.lenrProved).toBe(false);
    expect(envelopes.honestClosure.eq_open_status['EQ-OPEN-YIELD-01']).toBe('OPEN');
    expect(envelopes.quantitativeDistance.distance_status).toBe(
      'at_or_above_bar_gates_clear',
    );
    expect(envelopes.quantitativeDistance.lenr_proved).toBe(false);
    expect(envelopes.quantitativeDistance.eq_open_status['EQ-OPEN-YIELD-01']).toBe(
      'OPEN',
    );
  });
});
