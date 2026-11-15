/**
 * Pure chart-row builders for LENRVisualization (kept free of React/Three so
 * honesty/precision regressions can be unit-tested without the 3D stack).
 */

/**
 * Resample comparison series onto a primary timestamp.
 * Returns undefined outside the comparison time range (leave chart gaps).
 */
export function sampleAtTime(cmpTimes, series, t) {
  if (!cmpTimes?.length || !series?.length) return undefined;
  const t0 = Number(cmpTimes[0]);
  const tN = Number(cmpTimes[cmpTimes.length - 1]);
  if (!Number.isFinite(t) || t < t0 || t > tN) return undefined;
  let lo = 0;
  let hi = cmpTimes.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (Number(cmpTimes[mid]) <= t) lo = mid;
    else hi = mid;
  }
  const tLo = Number(cmpTimes[lo]);
  const tHi = Number(cmpTimes[hi]);
  const vLo = Number(series[lo]);
  const vHi = Number(series[hi]);
  if (!Number.isFinite(vLo) || !Number.isFinite(vHi)) return undefined;
  if (tHi === tLo) return vLo;
  const w = (t - tLo) / (tHi - tLo);
  return vLo + (vHi - vLo) * w;
}

/**
 * Build chart rows for energy / temperature / reaction-rate plots.
 * Keeps full float precision on plotted series so shared rateScale or
 * enhancement×1e-3 cannot round valid low-amplitude curves to zero.
 */
export function buildLenrChartData(timeSeriesData, comparisonData) {
  const nested = timeSeriesData?.timeSeriesData;
  const cmpNested = comparisonData?.timeSeriesData;

  if (
    nested &&
    Array.isArray(nested.time) &&
    nested.time.length > 0 &&
    Array.isArray(nested.temperature)
  ) {
    const primaryLen = nested.time.length;
    const primaryRates = Array.isArray(nested.reactionRate) ? nested.reactionRate : [];
    const cmpRates = Array.isArray(cmpNested?.reactionRate) ? cmpNested.reactionRate : [];
    const scaleMax = Math.max(
      0,
      ...primaryRates.map(Number).filter((n) => Number.isFinite(n)),
      ...cmpRates.map(Number).filter((n) => Number.isFinite(n)),
    );
    const rateScale = scaleMax > 0 ? scaleMax : 1;
    const comparisonSummary = comparisonData?.summary;
    const cmpTimes = Array.isArray(cmpNested?.time) ? cmpNested.time : null;

    return nested.time.map((t, index) => {
      const progress = primaryLen > 1 ? index / (primaryLen - 1) : 1;
      const rawRate = Number(nested.reactionRate?.[index] ?? 0);
      const rawCmp = cmpTimes
        ? sampleAtTime(cmpTimes, cmpNested.reactionRate, Number(t))
        : undefined;
      const rawCmpEnh = cmpTimes
        ? sampleAtTime(cmpTimes, cmpNested.enhancement, Number(t))
        : undefined;
      const rawCmpTemp = cmpTimes
        ? sampleAtTime(cmpTimes, cmpNested.temperature, Number(t))
        : undefined;
      const energyOutput = nested.enhancement
        ? (nested.enhancement[index] || 0) * 1e-3
        : (timeSeriesData?.summary?.total_energy || 50) * progress;
      return {
        time: Number(t),
        energyOutput,
        temperature: Number(nested.temperature[index] || 0),
        reactionRate: rawRate / rateScale,
        reactionRateAbsolute: rawRate,
        rateScaleMax: rateScale,
        comparisonEnergy: rawCmpEnh != null
          ? rawCmpEnh * 1e-3
          : (!cmpTimes && comparisonSummary
            ? comparisonSummary.total_energy * progress
            : undefined),
        comparisonTemp: rawCmpTemp != null
          ? rawCmpTemp
          : (!cmpTimes && comparisonSummary
            ? comparisonSummary.average_temperature
            : undefined),
        comparisonRate: rawCmp != null
          ? rawCmp / rateScale
          : (!cmpTimes && comparisonSummary?.reaction_rate != null
            ? Number(comparisonSummary.reaction_rate) / rateScale
            : undefined),
        comparisonRateAbsolute: rawCmp != null
          ? rawCmp
          : (!cmpTimes && comparisonSummary?.reaction_rate != null
            ? Number(comparisonSummary.reaction_rate) * progress
            : undefined),
      };
    });
  }

  const defaultSummary = {
    total_energy: 50,
    average_temperature: 400,
    reaction_rate: 0.05,
  };
  const summary = timeSeriesData?.summary || defaultSummary;
  const totalTime = timeSeriesData?.time || 10;
  const steps = 50;
  const comparisonSummary = comparisonData?.summary;
  const summaryRate = Number(summary.reaction_rate ?? 0.05);
  const cmpSummaryRate = Number(comparisonSummary?.reaction_rate ?? 0);
  const rateScale = Math.max(Math.abs(summaryRate), Math.abs(cmpSummaryRate), 1e-30);

  return Array.from({ length: steps }, (_, index) => {
    const time = index * (totalTime / (steps - 1));
    const progress = index / (steps - 1);
    return {
      time,
      energyOutput: (summary.total_energy || 50) * progress,
      temperature: summary.average_temperature || 400,
      reactionRate: (summaryRate * progress) / rateScale,
      reactionRateAbsolute: summaryRate * progress,
      rateScaleMax: rateScale,
      comparisonEnergy: comparisonSummary
        ? comparisonSummary.total_energy * progress
        : undefined,
      comparisonTemp: comparisonSummary
        ? comparisonSummary.average_temperature
        : undefined,
      comparisonRate: comparisonSummary
        ? (cmpSummaryRate * progress) / rateScale
        : undefined,
      comparisonRateAbsolute: comparisonSummary
        ? cmpSummaryRate * progress
        : undefined,
    };
  });
}
