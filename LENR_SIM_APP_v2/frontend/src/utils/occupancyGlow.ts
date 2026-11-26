/**
 * VIZ-08-style occupancy glow plan for UBLV hosts / interstitial sites.
 *
 * Prefer engine-exported per-site occupancy when present on the run payload /
 * spacetime buffer; otherwise fall back to the schematic loading mask and chip
 * honesty accordingly.
 *
 * Honesty: schematic unless engine site loading is present — never invent
 * nuclear occupancy proof; does not close EQ-OPEN.
 */

import { buildOccupancyMask } from './dynamicLattice';

export const OCCUPANCY_GLOW_ENGINE_FIDELITY = 'engine_bound' as const;
export const OCCUPANCY_GLOW_SCHEMATIC_FIDELITY = 'schematic' as const;

export type OccupancyGlowFidelity =
  | typeof OCCUPANCY_GLOW_ENGINE_FIDELITY
  | typeof OCCUPANCY_GLOW_SCHEMATIC_FIDELITY;

export type OccupancyGlowPlan = {
  occupied: boolean[];
  fidelity: OccupancyGlowFidelity;
  claimTier: 'speculative_exploratory';
  label: string;
  engineBound: boolean;
  occupiedCount: number;
};

function coerceOccupancyArray(
  raw: unknown,
  siteCount: number,
): boolean[] | null {
  if (!Array.isArray(raw) || siteCount <= 0) return null;
  if (raw.length < siteCount) return null;
  const out = new Array<boolean>(siteCount);
  let sawFinite = false;
  for (let i = 0; i < siteCount; i += 1) {
    const v = raw[i];
    if (typeof v === 'boolean') {
      out[i] = v;
      sawFinite = true;
      continue;
    }
    const n = Number(v);
    if (Number.isFinite(n)) {
      out[i] = n > 0.5;
      sawFinite = true;
      continue;
    }
    return null;
  }
  return sawFinite ? out : null;
}

/**
 * Pull engine site-occupancy arrays from known payload shapes (additive).
 * Returns null when the engine has not exported per-site loading.
 */
export function extractEngineSiteOccupancy(
  simulationData: Record<string, unknown> | null | undefined,
  siteCount: number,
): boolean[] | null {
  if (!simulationData || siteCount <= 0) return null;
  const candidates = [
    simulationData.lattice_site_occupancy,
    simulationData.site_occupancy,
    simulationData.occupancy_mask,
    (simulationData.lattice as Record<string, unknown> | undefined)?.site_occupancy,
    (simulationData.spacetime_sample_buffer as Record<string, unknown> | undefined)
      ?.site_occupancy,
  ];
  for (const raw of candidates) {
    const coerced = coerceOccupancyArray(raw, siteCount);
    if (coerced) return coerced;
  }
  return null;
}

export type ResolveOccupancyGlowPlanArgs = {
  siteCount: number;
  loadingRatio?: number;
  seed?: number;
  simulationData?: Record<string, unknown> | null;
  /** Optional pre-resolved engine mask (tests / callers). */
  engineOccupancy?: boolean[] | null;
};

/**
 * Resolve occupied mask + honesty labels for occupancy glow.
 */
export function resolveOccupancyGlowPlan({
  siteCount,
  loadingRatio = 0.9,
  seed = 0,
  simulationData = null,
  engineOccupancy = null,
}: ResolveOccupancyGlowPlanArgs): OccupancyGlowPlan {
  const n = Math.max(0, Math.floor(siteCount));
  const fromArg = coerceOccupancyArray(engineOccupancy, n);
  const fromPayload = extractEngineSiteOccupancy(simulationData, n);
  const engine = fromArg || fromPayload;
  if (engine) {
    const occupiedCount = engine.filter(Boolean).length;
    return {
      occupied: engine,
      fidelity: OCCUPANCY_GLOW_ENGINE_FIDELITY,
      claimTier: 'speculative_exploratory',
      label: 'Engine site loading',
      engineBound: true,
      occupiedCount,
    };
  }

  const schematic = buildOccupancyMask({
    count: n,
    loadingRatio,
    seed,
  });
  return {
    occupied: schematic,
    fidelity: OCCUPANCY_GLOW_SCHEMATIC_FIDELITY,
    claimTier: 'speculative_exploratory',
    label: 'Schematic occupancy — engine site loading not exported',
    engineBound: false,
    occupiedCount: schematic.filter(Boolean).length,
  };
}

/** Soft glow RGB for an occupied host site (presentation). */
export function occupancyGlowRgb(engineBound: boolean): {
  r: number;
  g: number;
  b: number;
  intensity: number;
} {
  if (engineBound) {
    return { r: 0.35, g: 0.95, b: 0.85, intensity: 0.85 };
  }
  // Schematic: cooler, dimmer — still readable on dark canvas
  return { r: 0.45, g: 0.75, b: 1.0, intensity: 0.55 };
}
