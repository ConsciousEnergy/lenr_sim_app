/**
 * Attach Theory Testbed pipeline scores onto a Unified Theory save payload.
 * Scores are model association, not multiplied into bubble-lattice enhancement.
 */

export function pipelineScoresFromTheoryResult(theoryResult) {
  const contributions = theoryResult?.per_theory || theoryResult?.contributions;
  if (!Array.isArray(contributions) || contributions.length === 0) {
    return null;
  }
  const scores = {};
  contributions.forEach((contrib) => {
    const theoryId = contrib?.theory_id;
    if (!theoryId) return;
    const breakdown = contrib.confidence_breakdown || {};
    scores[theoryId] = {
      score: Number(
        breakdown.weighted_score ?? contrib.confidence ?? 0,
      ),
      enhancement: Number(contrib.enhancement_factor ?? 1),
      confidence: Number(contrib.confidence ?? 0),
      claim_tier: contrib.claim_tier,
      is_applicable: contrib.is_applicable !== false,
    };
    if (contrib.final_score != null) {
      scores[theoryId].final_score = Number(contrib.final_score);
    }
  });
  return Object.keys(scores).length ? scores : null;
}

export function attachTestbedScoresToResults(results, theoryResult) {
  const pipelineScores = pipelineScoresFromTheoryResult(theoryResult);
  if (!pipelineScores) {
    return results;
  }
  return {
    ...results,
    pipeline_scores: pipelineScores,
    composition_contract: {
      engine: "theory_pipeline_scores_attached",
      not_combinable_with: ["peak_conditions.enhancement_factor"],
      note: (
        "Theory Testbed association scores. Not multiplied into "
        + "bubble-lattice peak enhancement."
      ),
    },
  };
}
