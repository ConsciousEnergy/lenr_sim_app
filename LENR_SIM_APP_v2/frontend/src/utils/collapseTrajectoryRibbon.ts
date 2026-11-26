/**
 * Collapse ODE / R(t) trajectory → faint 3D ribbon positions (UBLV).
 *
 * Binds to engine `collapse_trajectory` (Rayleigh–Plesset) when present.
 * Honesty: EMP hydro model output — not continuum CFD / not nuclear proof.
 *
 * Placement: near the lattice ScaleBar (teal bar ~(-6,-6,4)) — below / alongside
 * the lattice floor — so the orange R(t) path does not cut mid-lattice.
 * Playhead uses dual-clock remap (visual scrub → acoustic sample) so min-R
 * aligns with the MINIMUM flash window.
 */

import {
  BUBBLE_VIS_RADIUS_FACTOR_MAX,
  BUBBLE_VIS_SCALE,
  clampBubbleRadiusFactor,
} from './bubbleVisualScale';
import {
  MINIMUM_CENTER,
  unanchorCycleFraction,
} from './bubblePhaseSchedule';

export const COLLAPSE_RIBBON_FIDELITY = 'emp_model' as const;
export const COLLAPSE_RIBBON_SOURCE = 'rayleigh_plesset_trajectory';

/** Default world pose — adjacent to UBLV ScaleBar at (-6, -6, 4). */
export const COLLAPSE_RIBBON_DEFAULT_ORIGIN = Object.freeze({
  /** Left edge of ribbon near scale bar. */
  originX: -6.2,
  /** Floor just under lattice (lattice Y ≈ -5). */
  nestY: -6.35,
  /** Toward camera with the teal scale bar. */
  planeZ: 3.85,
  spanX: 3.6,
  /** Vertical R(t) amplitude — keep below lattice atoms. */
  yAmp: 0.55,
});

export type CollapseTrajectoryLike = {
  time_s?: number[] | null;
  radius_um?: number[] | null;
  min_radius_sample_index?: number | null;
  sample_count?: number | null;
  source?: string | null;
};

export type CollapseRibbonBuildArgs = {
  trajectory: CollapseTrajectoryLike | null | undefined;
  /** R0 in μm used to form R/R0 (defaults to first sample or 10). */
  initialRadiusUm?: number | null;
  /** World-space time axis span (vis units). */
  spanX?: number;
  /** Ribbon floor Y (near scale bar / lattice base). */
  nestY?: number;
  /** Ribbon plane Z (near scale bar). */
  planeZ?: number;
  /** Left-edge X of the ribbon (near scale bar). */
  originX?: number;
  /** Max vertical excursion for R(t) above nestY. */
  yAmp?: number;
};

export type CollapseRibbonBuildResult = {
  positions: Float32Array;
  sampleCount: number;
  minIndex: number;
  source: string;
  fidelity: typeof COLLAPSE_RIBBON_FIDELITY;
  initialRadiusUm: number;
  /** Acoustic cycle fraction of min-R sample (for dual-clock playhead). */
  minAcousticFraction: number;
};

function finitePositive(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/**
 * Map collapse_trajectory → Line positions (time on X, R on Y).
 * Returns null when trajectory is missing / too short.
 */
export function buildCollapseRibbonPositions({
  trajectory,
  initialRadiusUm = null,
  spanX = COLLAPSE_RIBBON_DEFAULT_ORIGIN.spanX,
  nestY = COLLAPSE_RIBBON_DEFAULT_ORIGIN.nestY,
  planeZ = COLLAPSE_RIBBON_DEFAULT_ORIGIN.planeZ,
  originX = COLLAPSE_RIBBON_DEFAULT_ORIGIN.originX,
  yAmp = COLLAPSE_RIBBON_DEFAULT_ORIGIN.yAmp,
}: CollapseRibbonBuildArgs): CollapseRibbonBuildResult | null {
  const times = trajectory?.time_s;
  const radii = trajectory?.radius_um;
  if (!Array.isArray(times) || !Array.isArray(radii)) return null;
  const n = Math.min(times.length, radii.length);
  if (n < 2) return null;

  const t0 = Number(times[0]);
  const tN = Number(times[n - 1]);
  const dt = Number.isFinite(t0) && Number.isFinite(tN) && tN > t0 ? tN - t0 : 1;
  const r0 = finitePositive(
    initialRadiusUm,
    finitePositive(radii[0], 10),
  );

  let minIndex = Number.isInteger(trajectory?.min_radius_sample_index)
    ? Number(trajectory?.min_radius_sample_index)
    : 0;
  if (minIndex < 0 || minIndex >= n) {
    let best = 0;
    let bestR = Infinity;
    for (let i = 0; i < n; i += 1) {
      const r = Number(radii[i]);
      if (Number.isFinite(r) && r < bestR) {
        bestR = r;
        best = i;
      }
    }
    minIndex = best;
  }

  const amp = Math.max(0.15, Number(yAmp) || COLLAPSE_RIBBON_DEFAULT_ORIGIN.yAmp);
  const positions = new Float32Array(n * 3);
  for (let i = 0; i < n; i += 1) {
    const t = Number(times[i]);
    const rUm = Number(radii[i]);
    const tNorm = Number.isFinite(t) ? (t - t0) / dt : i / Math.max(1, n - 1);
    const factor = Number.isFinite(rUm) && rUm > 0 ? rUm / r0 : 1;
    const rVis = clampBubbleRadiusFactor(factor) * BUBBLE_VIS_SCALE.FULL_SIZE;
    // Map clamped R into [0,1] then amp — stays under lattice floor.
    const rLift = Math.min(1, Math.max(0, rVis / BUBBLE_VIS_RADIUS_FACTOR_MAX));
    positions[i * 3] = originX + tNorm * spanX;
    positions[i * 3 + 1] = nestY + rLift * amp;
    positions[i * 3 + 2] = planeZ;
  }

  return {
    positions,
    sampleCount: n,
    minIndex,
    source: typeof trajectory?.source === 'string' && trajectory.source
      ? trajectory.source
      : COLLAPSE_RIBBON_SOURCE,
    fidelity: COLLAPSE_RIBBON_FIDELITY,
    initialRadiusUm: r0,
    minAcousticFraction: minIndex / Math.max(1, n - 1),
  };
}

/**
 * Playhead index along the ribbon for a visual scrub / cycle fraction 0..1.
 * Dual-clock aware: remaps visual MINIMUM window onto the acoustic min-R sample.
 */
export function collapseRibbonPlayheadIndex(
  sampleCount: number,
  visualCycleFraction: number,
  minIndex: number | null = null,
): number {
  const n = Math.max(0, Math.floor(sampleCount));
  if (n <= 1) return 0;
  const vis = Math.min(1, Math.max(0, Number(visualCycleFraction) || 0));
  const hasMin = Number.isFinite(minIndex)
    && Number(minIndex) >= 0
    && Number(minIndex) < n;
  if (!hasMin) {
    return Math.min(n - 1, Math.round(vis * (n - 1)));
  }
  const m = Math.min(
    1 - 1e-3,
    Math.max(1e-3, Number(minIndex) / Math.max(1, n - 1)),
  );
  const acoustic = unanchorCycleFraction(vis, m);
  return Math.min(n - 1, Math.round(acoustic * (n - 1)));
}

/**
 * 0..1 punch strength near min-R on the dual-clock playhead (collapse flash).
 */
export function collapseRibbonCollapsePunch({
  sampleCount,
  visualCycleFraction,
  minIndex,
}: {
  sampleCount: number;
  visualCycleFraction: number;
  minIndex: number;
}): number {
  const n = Math.max(0, Math.floor(sampleCount));
  if (n <= 1) return 0;
  const idx = collapseRibbonPlayheadIndex(n, visualCycleFraction, minIndex);
  const dist = Math.abs(idx - minIndex) / Math.max(1, n - 1);
  // Sharp near min-R; also lift when visual clock is in MINIMUM band (~0.955–0.975).
  const nearSample = Math.max(0, 1 - dist * 10);
  const vis = Math.min(1, Math.max(0, Number(visualCycleFraction) || 0));
  const nearVisualMin = Math.max(
    0,
    1 - Math.abs(vis - MINIMUM_CENTER) / 0.04,
  );
  return Math.min(1, Math.max(nearSample, nearVisualMin * 0.85));
}
