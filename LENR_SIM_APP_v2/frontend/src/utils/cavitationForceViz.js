/**
 * cavitationForceViz.js
 *
 * Map existing modeling samples → schematic viz intensities for flux,
 * vorticity / MHD, and phonon response localized by cavitation.
 *
 * Inputs (existing only — no new solvers):
 *   compressionRatio, radius_factor / radius_um, temperature_k,
 *   electric_field_v_m, enhancement / enhancement_breakdown.phonon|loading,
 *   loading_ratio, phase
 *
 * Honesty: schematic_visualization — nm-scale presentation cues, not continuum
 * CFD / MD / flux-trajectory proof.
 */

export const CAVITATION_FORCE_FIDELITY = 'schematic';
export const CAVITATION_FORCE_SOURCE = 'schematic_visualization';

function finiteOr(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

/**
 * Localized kinetic-force proxy from compression / radius collapse.
 * Higher when bubble is crushed near the lattice (cavitation localization).
 */
export function kineticForceNorm({
  compressionRatio = 1,
  radiusFactor = 1,
  phase = 'EXPANSION',
} = {}) {
  const comp = Math.max(1, finiteOr(compressionRatio, 1));
  const rf = Math.max(1e-6, finiteOr(radiusFactor, 1));
  // log compression + inverse radius → collapse localization
  const compTerm = clamp01(Math.log10(comp) / 2.2);
  const radiusTerm = clamp01(1 - Math.min(1, rf));
  let phaseGate = 0.25;
  if (phase === 'COLLAPSE') phaseGate = 0.85;
  if (phase === 'MINIMUM') phaseGate = 1.0;
  if (phase === 'REBOUND') phaseGate = 0.55;
  return clamp01(0.08 + (0.55 * compTerm + 0.45 * radiusTerm) * phaseGate);
}

/**
 * Schematic vorticity / MHD swirl intensity from kinetic × |E| × enhancement.
 */
export function vorticityNorm({
  kinetic = 0,
  electricFieldVPerM = 0,
  enhancement = 1,
} = {}) {
  const eMag = Math.abs(finiteOr(electricFieldVPerM, 0));
  const eNorm = clamp01(Math.log10(eMag + 1) / 12);
  const enh = Math.max(1, finiteOr(enhancement, 1));
  const enhNorm = clamp01(Math.log10(enh) / 6);
  const k = clamp01(finiteOr(kinetic, 0));
  return clamp01(0.15 + k * 0.55 + eNorm * 0.2 + enhNorm * 0.15);
}

/**
 * Soft flux / charge-flow intensity from loading × E × enhancement.
 */
export function fluxNorm({
  loadingRatio = 0.5,
  electricFieldVPerM = 0,
  enhancement = 1,
  kinetic = 0,
} = {}) {
  const load = clamp01(finiteOr(loadingRatio, 0.5));
  const eMag = Math.abs(finiteOr(electricFieldVPerM, 0));
  const eNorm = clamp01(Math.log10(eMag + 1) / 12);
  const enhNorm = clamp01(Math.log10(Math.max(finiteOr(enhancement, 1), 1)) / 6);
  const k = clamp01(finiteOr(kinetic, 0));
  return clamp01(0.12 + load * 0.35 + eNorm * 0.3 + enhNorm * 0.15 + k * 0.2);
}

/**
 * Phonon response amplitude scale (multiplies phononJitterAmplitude result).
 * Binds Debye/phonon enhancement + T + localized kinetic.
 */
export function phononResponseScale({
  phononFactor = 1,
  temperatureK = 300,
  kinetic = 0,
} = {}) {
  const phonon = Math.max(1, finiteOr(phononFactor, 1));
  const phononTerm = clamp01(Math.log10(phonon) / 2);
  const tempTerm = clamp01((finiteOr(temperatureK, 300) - 300) / 5000);
  const k = clamp01(finiteOr(kinetic, 0));
  return 0.7 + phononTerm * 0.55 + tempTerm * 0.35 + k * 0.8;
}

/**
 * Soft-plasma glow envelope: peak near min-R (COLLAPSE/MINIMUM flash).
 * Peer: Flannigan–Suslick SBSL plasma (optical/n_e) — not fusion / EQ-OPEN.
 */
export function softPlasmaFlashNorm({
  phase = 'EXPANSION',
  kinetic = 0,
  radiusFactor = 1,
} = {}) {
  const k = clamp01(finiteOr(kinetic, 0));
  const rf = Math.max(1e-6, finiteOr(radiusFactor, 1));
  const crush = clamp01(1 - Math.min(1, rf));
  let phaseGate = 0.12;
  if (phase === 'COLLAPSE') phaseGate = 0.75;
  if (phase === 'MINIMUM') phaseGate = 1.0;
  if (phase === 'REBOUND') phaseGate = 0.35;
  return clamp01(0.05 + phaseGate * (0.55 + 0.45 * k) + crush * 0.25 * phaseGate);
}

/**
 * Mach / compressibility cue for pressure-ring presentation (EMP model output).
 * Binds collapse_results.bubble_dynamics.peak_mach (+ optional regime string).
 * Returns 0 when Mach is absent — never invents a solver Mach.
 */
export function machCompressibilityCue({
  peakMach = null,
  compressibilityRegime = null,
} = {}) {
  if (!Number.isFinite(peakMach) || peakMach < 0) {
    return { ringBoost: 0, regimeBoost: 1 };
  }
  // Typical RP/KM peak Mach for µm cavitation is ≪ 1; log-scale for viz.
  const machNorm = clamp01(Math.log10(peakMach + 1) / Math.log10(2));
  let regimeBoost = 1;
  const regime = typeof compressibilityRegime === 'string'
    ? compressibilityRegime.toLowerCase()
    : '';
  if (regime.includes('weakly')) regimeBoost = 1.15;
  if (regime.includes('strongly') || regime.includes('highly')) regimeBoost = 1.35;
  return {
    ringBoost: clamp01(machNorm * regimeBoost),
    regimeBoost,
  };
}

/**
 * Field-line opacity scale from engine electric_field_v_m (exploratory DL).
 * local_fallback callers should pass null → returns baseline 1 (schematic).
 */
export function fieldLineOpacityFromE({
  electricFieldVPerM = null,
  sampleSource = 'local_fallback',
} = {}) {
  const isEngine = sampleSource === 'solver' || sampleSource === 'interpolated';
  if (!isEngine || !Number.isFinite(electricFieldVPerM)) return 1;
  const eNorm = clamp01(Math.log10(Math.abs(electricFieldVPerM) + 1) / 12);
  return 0.45 + eNorm * 0.7;
}

/**
 * Bundle used by UBLV animation — one call site for cavitation-localized cues.
 */
export function resolveCavitationForceViz({
  compressionRatio,
  radiusFactor,
  phase,
  electricFieldVPerM,
  enhancement,
  phononFactor,
  temperatureK,
  loadingRatio,
} = {}) {
  const kinetic = kineticForceNorm({ compressionRatio, radiusFactor, phase });
  const vorticity = vorticityNorm({
    kinetic,
    electricFieldVPerM,
    enhancement,
  });
  const flux = fluxNorm({
    loadingRatio,
    electricFieldVPerM,
    enhancement,
    kinetic,
  });
  const phononScale = phononResponseScale({
    phononFactor,
    temperatureK,
    kinetic,
  });
  const softPlasmaFlash = softPlasmaFlashNorm({
    phase,
    kinetic,
    radiusFactor,
  });
  return {
    kinetic,
    vorticity,
    flux,
    phononScale,
    softPlasmaFlash,
    fidelity: CAVITATION_FORCE_FIDELITY,
    source: CAVITATION_FORCE_SOURCE,
  };
}
