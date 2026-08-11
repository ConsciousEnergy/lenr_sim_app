/**
 * Mean rubric confidence across the applicable theory contributions.
 *
 * Confidence used to be derived from log10(combined_enhancement)/8, which reads
 * a bigger enhancement as more trustworthy. Magnitude is not evidence, and the
 * value is capped at 1e5 anyway, so a saturated run reported a fixed
 * pseudo-confidence. The backend already computes a real rubric score per
 * theory (confidence_breakdown.weighted_score); average that instead.
 */
const deriveRubricConfidence = (theoryResult) => {
  const perTheory = theoryResult?.per_theory;
  if (!Array.isArray(perTheory) || perTheory.length === 0) return null;

  const scores = perTheory
    .filter((contribution) => contribution?.is_applicable !== false)
    .map((contribution) => {
      const weighted = contribution?.confidence_breakdown?.weighted_score;
      if (typeof weighted === 'number' && Number.isFinite(weighted)) return weighted;
      return typeof contribution?.confidence === 'number' ? contribution.confidence : null;
    })
    .filter((score) => typeof score === 'number' && Number.isFinite(score));

  if (scores.length === 0) return null;
  const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  return Math.max(0, Math.min(1, mean));
};

export const deriveSimulationHeadlineState = ({ simulationData, theoryResult }) => {
  const peakEnhancement = simulationData?.peak_conditions?.enhancement_factor ?? 1;
  const nuclearFraction = simulationData?.proton_phases?.NUCLEAR ?? 0;
  const backendContradiction = simulationData?.validation?.contradiction;
  const contradictionReasonCode = simulationData?.validation?.contradiction_reason_code || null;
  const contradiction = typeof backendContradiction === 'boolean'
    ? backendContradiction
    : peakEnhancement >= 1e5 && nuclearFraction <= 0 && Boolean(simulationData);

  return {
    peakEnhancement,
    nuclearFraction,
    contradiction,
    contradictionReasonCode,
    confidence: deriveRubricConfidence(theoryResult),
    confidenceBasis: 'mean_rubric_weighted_score',
  };
};

