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
    // Stronger empty darken so Loading mode is unmistakable vs Species.
    return { r: r * 0.32, g: g * 0.32, b: b * 0.35 };
  }
  // Cool lift — schematic loading cue, not quantitative flux.
  return {
    r: Math.min(1, r * 0.75 + 0.08),
    g: Math.min(1, g * 0.9 + 0.18),
    b: Math.min(1, b * 0.65 + 0.35),
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
  // Cool host → warm orange-white lift (matches bubble heat narrative).
  // Floor a small warm bias so T mode is not identical to Species at 300 K.
  const lift = Math.max(0.12, t);
  return {
    r: Math.min(1, base.r * (1 - lift * 0.4) + lift * 0.98),
    g: Math.min(1, base.g * (1 - lift * 0.5) + lift * 0.42),
    b: Math.min(1, base.b * (1 - lift * 0.75) + lift * 0.08),
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
    case 'phonon': {
      // Floor so Phonon mode is distinct even before standing-wave tick fills energies.
      const energy = Math.max(0.35, Number(modeEnergy) || 0);
      return phononModeTintRgb(hexToRgb01(hostHex), energy, opticalWeight);
    }
    case 'species':
    default:
      return hexToRgb01(hostHex);
  }
}
