import { attachTestbedScoresToResults, pipelineScoresFromTheoryResult } from './theoryTestbedScores';

describe('theoryTestbedScores', () => {
  const theoryResult = {
    combined_enhancement: 12,
    per_theory: [
      {
        theory_id: 'electron_screening',
        enhancement_factor: 4,
        confidence: 0.5,
        claim_tier: 'validated_lenr_mechanism',
        is_applicable: true,
        confidence_breakdown: { weighted_score: 0.42 },
      },
    ],
  };

  test('builds pipeline_scores from testbed per_theory', () => {
    const scores = pipelineScoresFromTheoryResult(theoryResult);
    expect(scores.electron_screening.score).toBe(0.42);
    expect(scores.electron_screening.enhancement).toBe(4);
    expect(pipelineScoresFromTheoryResult(null)).toBeNull();
  });

  test('does not multiply testbed scores into peak enhancement', () => {
    const results = attachTestbedScoresToResults(
      { peak_conditions: { enhancement_factor: 1e5 } },
      theoryResult,
    );
    expect(results.peak_conditions.enhancement_factor).toBe(1e5);
    expect(results.pipeline_scores.electron_screening.score).toBe(0.42);
    expect(results.composition_contract.not_combinable_with).toContain(
      'peak_conditions.enhancement_factor',
    );
  });
});
