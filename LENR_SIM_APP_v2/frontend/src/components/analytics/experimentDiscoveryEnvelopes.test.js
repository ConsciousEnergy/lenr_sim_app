import {
  analyticsGateDisplayStatus,
  normalizeExperimentDiscoveryEnvelopes,
} from './experimentDiscoveryEnvelopes';

describe('normalizeExperimentDiscoveryEnvelopes', () => {
  test('falls back to corpus not_met envelopes when API fields absent', () => {
    const envelopes = normalizeExperimentDiscoveryEnvelopes({ id: 'x' });
    expect(envelopes.lenrProved).toBe(false);
    expect(envelopes.discoveryGradeEligible).toBe(false);
    expect(envelopes.discoveryGradeGap.overall_status).toBe('not_met');
    expect(envelopes.analyticsGateStatus).toBe('not_met');
    expect(envelopes.honestClosure.overall_status).toBe('not_met');
    expect(envelopes.quantitativeDistance.distance_status).toBe('undefined');
    expect(envelopes.quantitativeDistance.lenr_proved).toBe(false);
    expect(envelopes.honestClosure.missing_ids).toEqual(
      expect.arrayContaining(['eq_open_discharge', 'governance_signoff']),
    );
    expect(
      Object.values(envelopes.honestClosure.eq_open_status).every((v) => v === 'OPEN'),
    ).toBe(true);
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
