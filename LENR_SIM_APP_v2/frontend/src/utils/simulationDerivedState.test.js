import { deriveSimulationHeadlineState } from './simulationDerivedState';

/**
 * Confidence was derived from log10(combined_enhancement)/8, which treats a
 * larger enhancement as more trustworthy and reports a fixed value once the
 * enhancement saturates at the 1e5 ceiling. It now averages the backend's
 * rubric score.
 */
describe('deriveSimulationHeadlineState confidence', () => {
  it('averages the rubric weighted_score across applicable theories', () => {
    const { confidence, confidenceBasis } = deriveSimulationHeadlineState({
      simulationData: null,
      theoryResult: {
        combined_enhancement: 1e5,
        per_theory: [
          { is_applicable: true, confidence_breakdown: { weighted_score: 0.8 } },
          { is_applicable: true, confidence_breakdown: { weighted_score: 0.4 } },
        ],
      },
    });
    expect(confidence).toBeCloseTo(0.6);
    expect(confidenceBasis).toBe('mean_rubric_weighted_score');
  });

  it('does not read magnitude as confidence', () => {
    const low = deriveSimulationHeadlineState({
      simulationData: null,
      theoryResult: {
        combined_enhancement: 10,
        per_theory: [{ is_applicable: true, confidence_breakdown: { weighted_score: 0.9 } }],
      },
    });
    const high = deriveSimulationHeadlineState({
      simulationData: null,
      theoryResult: {
        combined_enhancement: 1e5,
        per_theory: [{ is_applicable: true, confidence_breakdown: { weighted_score: 0.9 } }],
      },
    });
    // Four orders of magnitude apart, same evidence, so same confidence.
    expect(low.confidence).toBeCloseTo(high.confidence);
  });

  it('ignores inapplicable contributions', () => {
    const { confidence } = deriveSimulationHeadlineState({
      simulationData: null,
      theoryResult: {
        combined_enhancement: 100,
        per_theory: [
          { is_applicable: true, confidence_breakdown: { weighted_score: 0.6 } },
          { is_applicable: false, confidence_breakdown: { weighted_score: 0.0 } },
        ],
      },
    });
    expect(confidence).toBeCloseTo(0.6);
  });

  it('falls back to the contribution confidence when no breakdown is present', () => {
    const { confidence } = deriveSimulationHeadlineState({
      simulationData: null,
      theoryResult: {
        combined_enhancement: 100,
        per_theory: [{ is_applicable: true, confidence: 0.35 }],
      },
    });
    expect(confidence).toBeCloseTo(0.35);
  });

  it('returns null with no theory result', () => {
    expect(
      deriveSimulationHeadlineState({ simulationData: {}, theoryResult: null }).confidence,
    ).toBeNull();
  });

  it('stays within [0, 1]', () => {
    const { confidence } = deriveSimulationHeadlineState({
      simulationData: null,
      theoryResult: {
        combined_enhancement: 1e9,
        per_theory: [{ is_applicable: true, confidence_breakdown: { weighted_score: 5 } }],
      },
    });
    expect(confidence).toBeLessThanOrEqual(1);
    expect(confidence).toBeGreaterThanOrEqual(0);
  });
});

describe('deriveSimulationHeadlineState contradiction', () => {
  it('prefers the backend contradiction flag', () => {
    const state = deriveSimulationHeadlineState({
      simulationData: {
        peak_conditions: { enhancement_factor: 1e5 },
        proton_phases: { NUCLEAR: 0.1 },
        validation: { contradiction: true, contradiction_reason_code: 'threshold_boundary' },
      },
      theoryResult: null,
    });
    expect(state.contradiction).toBe(true);
    expect(state.contradictionReasonCode).toBe('threshold_boundary');
  });

  it('derives a contradiction when the backend does not report one', () => {
    const state = deriveSimulationHeadlineState({
      simulationData: {
        peak_conditions: { enhancement_factor: 1e5 },
        proton_phases: { NUCLEAR: 0 },
      },
      theoryResult: null,
    });
    expect(state.contradiction).toBe(true);
  });
});
