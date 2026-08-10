/**
 * Map physical bubble radius (R/R0 from the RP trajectory) into a Three.js
 * scale that stays inside the Unified Theory 3D scene.
 *
 * The scene is authored so ``FULL_SIZE ≈ 1`` vis-unit matches a grown ~10 μm
 * bubble. Real Rayleigh–Plesset expansions routinely reach R/R0 ≫ 1.3 (the
 * chips even show Compression 0.1× ⇒ radius_factor ≈ 10). Applying that factor
 * raw fills the camera frustum; clamp to the schematic expansion envelope used
 * by the local fallback animator.
 */

export const BUBBLE_VIS_RADIUS_FACTOR_MIN = 0.1;
/** Matches ``calculateBubbleRadius`` local expansion cap (1 + drive*0.3 ≤ ~1.3). */
export const BUBBLE_VIS_RADIUS_FACTOR_MAX = 1.3;

export const BUBBLE_VIS_SCALE = {
  NUCLEATION: 0.15,
  GROWTH_START: 0.3,
  FULL_SIZE: 1.0,
  COLLAPSE_MIN: 0.1,
};

export function clampBubbleRadiusFactor(radiusFactor) {
  const value = Number(radiusFactor);
  if (!Number.isFinite(value) || value <= 0) {
    return BUBBLE_VIS_SCALE.NUCLEATION;
  }
  return Math.min(
    BUBBLE_VIS_RADIUS_FACTOR_MAX,
    Math.max(BUBBLE_VIS_RADIUS_FACTOR_MIN, value),
  );
}

export function getBubbleScaleFromPhase(phase, progress = 0) {
  const scales = BUBBLE_VIS_SCALE;
  const t = Math.min(1, Math.max(0, Number(progress) || 0));

  switch (phase) {
    case 'EXPANSION':
      return scales.NUCLEATION + (scales.FULL_SIZE - scales.NUCLEATION) * t;
    case 'COLLAPSE':
      return scales.FULL_SIZE - (scales.FULL_SIZE - scales.COLLAPSE_MIN) * t;
    case 'MINIMUM':
      return scales.COLLAPSE_MIN;
    case 'REBOUND':
      return scales.COLLAPSE_MIN + (scales.GROWTH_START - scales.COLLAPSE_MIN) * t;
    case 'RECOVERY':
      return scales.GROWTH_START + (scales.NUCLEATION - scales.GROWTH_START) * t;
    default:
      return scales.NUCLEATION;
  }
}

/**
 * Display scale for MainBubble / DoubleLayer / InnerLayer.
 *
 * @param {object} args
 * @param {number} args.radiusFactor physical R/R0 (may be ≫ 1)
 * @param {string} args.phase EXPANSION | COLLAPSE | MINIMUM | REBOUND | RECOVERY
 * @param {number} [args.phaseProgress] 0–1 within the current phase
 */
export function getBubbleDisplayScale({
  radiusFactor,
  phase,
  phaseProgress = 0,
}) {
  const physical = clampBubbleRadiusFactor(radiusFactor);
  const phaseScale = getBubbleScaleFromPhase(phase, phaseProgress);

  if (phase === 'EXPANSION' || phase === 'RECOVERY') {
    // Keep nucleation storytelling (grow from small) but never exceed the
    // scene-safe physical clamp — and never jump above the phase envelope
    // early in the cycle.
    return Math.min(physical, Math.max(phaseScale, BUBBLE_VIS_SCALE.COLLAPSE_MIN));
  }

  // Collapse / minimum / rebound: prefer the tighter of physics vs schematic.
  return Math.min(physical, phaseScale);
}
