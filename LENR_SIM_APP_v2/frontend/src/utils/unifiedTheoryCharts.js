/**
 * Chart adapters for Unified Theory tab panels.
 * Kept out of the page so tab panels stay presentational.
 */

export const PHASE_COLORS = {
  free: '#3498db',
  screened: '#00ffff',
  capture_ready: '#f1c40f',
  nuclear: '#ff4500',
};

export const ENHANCEMENT_THRESHOLDS = {
  observable: 1e5,
  measurable: 1e3,
  screening: 1e1,
};

export function getEnhancementChartData(simulationData, parameters) {
  if (!simulationData?.enhancement_timeline) return [];
  const baseRadiusUm = (parameters?.initialBubbleRadius || 10) * 3.33;
  return simulationData.enhancement_timeline.map((point) => {
    const cappedLog10 = Math.log10(Math.max(1, point.enhancement));
    const rawLog10 = typeof point.enhancement_log10_raw === 'number'
      && Number.isFinite(point.enhancement_log10_raw)
      ? point.enhancement_log10_raw
      : cappedLog10;
    return {
      time: `${(point.normalized_time * 100).toFixed(0)}%`,
      enhancement: rawLog10,
      enhancementCapped: cappedLog10,
      isSaturated: Boolean(point.enhancement_is_saturated),
      electrolyteMultiplier:
        point.electrolyte_multiplier
        || simulationData.electrolyte_diagnostics?.activity_multiplier
        || 1.0,
      temperature: point.temperature_k ?? point.temperature,
      pressureBar: point.pressure_bar ?? null,
      radius: point.radius_factor
        ? point.radius_factor * 100
        : point.radius_um
          ? (point.radius_um / Math.max(baseRadiusUm, 0.001)) * 100
          : 100,
    };
  });
}

export function getProtonPhaseChartData(simulationData) {
  if (!simulationData?.enhancement_timeline) return [];
  return simulationData.enhancement_timeline.map((point) => ({
    time: `${(point.normalized_time * 100).toFixed(0)}%`,
    ...point.proton_distribution,
  }));
}

export function getUncertaintyFanData(simulationData) {
  const observables = simulationData?.collapse_uncertainty?.observables;
  if (!observables) return [];
  const labels = {
    peak_temperature_k: 'Peak temperature',
    peak_pressure_pa: 'Peak pressure',
    min_radius_um: 'Min radius',
    peak_field_v_m: 'Peak field',
  };
  return Object.entries(observables).map(([key, summary]) => {
    const interval = summary.credible_interval || {};
    const toLog = (value) => Math.log10(Math.max(Number(value) || 0, 1e-30));
    const p05 = toLog(interval.p05);
    const p25 = toLog(interval.p25);
    const p75 = toLog(interval.p75);
    const p95 = toLog(interval.p95);
    return {
      name: labels[key] || key,
      unit: summary.unit,
      median: toLog(summary.median),
      lower: p05,
      innerLowWidth: Math.max(0, p25 - p05),
      innerHighWidth: Math.max(0, p75 - p25),
      outerHighWidth: Math.max(0, p95 - p75),
    };
  });
}

/** Mechanism-level credible intervals from collapse_uncertainty.mechanisms. */
export function getMechanismUncertaintyFanData(simulationData) {
  const mechanisms = simulationData?.collapse_uncertainty?.mechanisms;
  if (!mechanisms) return [];
  return Object.entries(mechanisms)
    .filter(([key]) => key !== 'total')
    .map(([key, summary]) => {
      const interval = summary.credible_interval || {};
      const toLog = (value) => Math.log10(Math.max(Number(value) || 0, 1e-30));
      const p05 = toLog(interval.p05);
      const p25 = toLog(interval.p25);
      const p75 = toLog(interval.p75);
      const p95 = toLog(interval.p95);
      return {
        name: key.charAt(0).toUpperCase() + key.slice(1),
        median: toLog(summary.median),
        lower: p05,
        innerLowWidth: Math.max(0, p25 - p05),
        innerHighWidth: Math.max(0, p75 - p25),
        outerHighWidth: Math.max(0, p95 - p75),
      };
    })
    .sort((a, b) => b.median - a.median);
}

export function getCollapseTrajectoryData(simulationData) {
  const trajectory = simulationData?.collapse_trajectory;
  if (!trajectory?.time_s?.length) return [];
  const velocities = trajectory.wall_velocity_m_s;
  return trajectory.time_s.map((timeS, index) => ({
    timeUs: Number((timeS * 1e6).toFixed(4)),
    radiusUm: trajectory.radius_um[index],
    wallVelocity: velocities ? velocities[index] : null,
  }));
}
