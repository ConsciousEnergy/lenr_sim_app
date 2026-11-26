/**
 * UBLV lattice host instanceColor modes (Tier 1).
 *
 * Mutually exclusive tint drivers on host InstancedMesh:
 *   species | loading | temperature | phonon
 *
 * Honesty: schematic / EMP-sample presentation — not QM orbitals; not EQ-OPEN.
 */

import { hexToRgb01 } from './lenrParticlePalette';
import { phononModeTintRgb } from './phononElectronViz';
import {
  BUBBLE_VIZ_TEMP_FLOOR_K,
  BUBBLE_VIZ_TEMP_HOT_K,
} from './bubbleTorusViz';

/** Tint host base color when site is schematically occupied (loading). */
export function occupancyTintRgb(
  baseHex: number,
  occupied: boolean,
): { r: number; g: number; b: number } {
  const { r, g, b } = hexToRgb01(baseHex);
  if (!occupied) {
    return { r: r * 0.55, g: g * 0.55, b: b * 0.55 };
  }
  // Slight cool lift — schematic loading cue, not quantitative flux.
  return {
    r: Math.min(1, r * 0.85 + 0.05),
    g: Math.min(1, g * 0.95 + 0.12),
    b: Math.min(1, b * 0.75 + 0.2),
  };
}

export const LATTICE_COLOR_MODES = [
  'species',
  'loading',
  'temperature',
  'phonon',
] as const;

export type LatticeColorMode = (typeof LATTICE_COLOR_MODES)[number];

export const LATTICE_COLOR_MODE_META = Object.freeze({
  species: {
    id: 'species' as const,
    label: 'Species',
    short: 'Species',
    honesty: 'Exclusive host palette (presentation)',
  },
  loading: {
    id: 'loading' as const,
    label: 'Loading',
    short: 'Loading θ',
    honesty: 'Schematic occupancy tint from loading mask',
  },
  temperature: {
    id: 'temperature' as const,
    label: 'Temperature',
    short: 'T',
    honesty: 'Warm lift from temperature_k (EMP when sampled)',
  },
  phonon: {
    id: 'phonon' as const,
    label: 'Phonon amp',
    short: 'Phonon',
    honesty: 'Contested / schematic mode energy tint',
  },
});

export function normalizeLatticeColorMode(
  mode: string | null | undefined,
): LatticeColorMode {
  if (mode && (LATTICE_COLOR_MODES as readonly string[]).includes(mode)) {
    return mode as LatticeColorMode;
  }
  return 'species';
}

/** Heat norm 0..1 from temperature_k — same floors as bubble tint. */
export function temperatureHeatNorm(
  temperatureK: number | null | undefined,
  {
    floorK = BUBBLE_VIZ_TEMP_FLOOR_K,
    hotK = BUBBLE_VIZ_TEMP_HOT_K,
  }: { floorK?: number; hotK?: number } = {},
): number {
  const value = Number(temperatureK);
  const safe = Number.isFinite(value) ? value : floorK;
  return Math.min(1, Math.max(0, (safe - floorK) / Math.max(hotK - floorK, 1)));
}

/**
 * Blend host RGB toward warm optical peer as heatNorm rises.
 * Presentation only — peer optical framing, not a T→emission proof.
 */
export function temperatureTintRgb(
  hostHex: number,
  temperatureK: number | null | undefined,
): { r: number; g: number; b: number } {
  const base = hexToRgb01(hostHex);
  const t = temperatureHeatNorm(temperatureK);
  // Cool host → warm orange-white lift (matches bubble heat narrative)
  return {
    r: Math.min(1, base.r * (1 - t * 0.35) + t * 0.95),
    g: Math.min(1, base.g * (1 - t * 0.45) + t * 0.45),
    b: Math.min(1, base.b * (1 - t * 0.7) + t * 0.12),
  };
}

export type ResolveLatticeHostInstanceRgbArgs = {
  mode?: LatticeColorMode | string | null;
  hostHex: number;
  occupied?: boolean;
  temperatureK?: number | null;
  modeEnergy?: number;
  opticalWeight?: number;
};

/**
 * Resolve one host instance RGB for the active color mode.
 * Modes are mutually exclusive (no stacked occupancy+phonon+T).
 */
export function resolveLatticeHostInstanceRgb({
  mode = 'species',
  hostHex,
  occupied = false,
  temperatureK = 300,
  modeEnergy = 0,
  opticalWeight = 0.4,
}: ResolveLatticeHostInstanceRgbArgs): { r: number; g: number; b: number } {
  const resolved = normalizeLatticeColorMode(mode);
  switch (resolved) {
    case 'loading':
      return occupancyTintRgb(hostHex, occupied === true);
    case 'temperature':
      return temperatureTintRgb(hostHex, temperatureK);
    case 'phonon':
      return phononModeTintRgb(hexToRgb01(hostHex), modeEnergy, opticalWeight);
    case 'species':
    default:
      return hexToRgb01(hostHex);
  }
}
