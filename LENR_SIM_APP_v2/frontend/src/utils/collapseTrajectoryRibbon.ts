/**
 * Collapse ODE / R(t) trajectory → faint 3D ribbon positions (UBLV).
 *
 * Binds to engine `collapse_trajectory` (Rayleigh–Plesset) when present.
 * Honesty: EMP hydro model output — not continuum CFD / not nuclear proof.
 */

import {
  BUBBLE_VIS_SCALE,
  clampBubbleRadiusFactor,
} from './bubbleVisualScale';

export const COLLAPSE_RIBBON_FIDELITY = 'emp_model' as const;
export const COLLAPSE_RIBBON_SOURCE = 'rayleigh_plesset_trajectory';

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
  /** Nest / lattice-relative Y for the ribbon plane. */
  nestY?: number;
  /** Push ribbon slightly toward camera (+Z). */
  planeZ?: number;
};

export type CollapseRibbonBuildResult = {
  positions: Float32Array;
  sampleCount: number;
  minIndex: number;
  source: string;
  fidelity: typeof COLLAPSE_RIBBON_FIDELITY;
  initialRadiusUm: number;
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
  spanX = 4.6,
  nestY = 0,
  planeZ = 2.35,
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

  const positions = new Float32Array(n * 3);
  const half = spanX * 0.5;
  for (let i = 0; i < n; i += 1) {
    const t = Number(times[i]);
    const rUm = Number(radii[i]);
    const tNorm = Number.isFinite(t) ? (t - t0) / dt : i / Math.max(1, n - 1);
    const factor = Number.isFinite(rUm) && rUm > 0 ? rUm / r0 : 1;
    const rVis = clampBubbleRadiusFactor(factor) * BUBBLE_VIS_SCALE.FULL_SIZE;
    positions[i * 3] = tNorm * spanX - half;
    positions[i * 3 + 1] = nestY + rVis * 0.95;
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
  };
}

/**
 * Playhead index along the ribbon for a scrub / cycle fraction 0..1.
 */
export function collapseRibbonPlayheadIndex(
  sampleCount: number,
  cycleFraction: number,
): number {
  const n = Math.max(0, Math.floor(sampleCount));
  if (n <= 1) return 0;
  const t = Math.min(1, Math.max(0, Number(cycleFraction) || 0));
  return Math.min(n - 1, Math.round(t * (n - 1)));
}
