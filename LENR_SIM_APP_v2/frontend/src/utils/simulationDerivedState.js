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
    confidence: theoryResult?.combined_enhancement ? Math.min(1, Math.log10(theoryResult.combined_enhancement) / 8) : null,
  };
};

