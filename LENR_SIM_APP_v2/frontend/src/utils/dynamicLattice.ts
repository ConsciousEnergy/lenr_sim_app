/**
 * VIZ-06 — InstancedMesh lattice DynamicDraw helpers.
 *
 * Honesty locks:
 * - Loading occupancy / tint is schematic unless engine exports site occupancy.
 * - Pd vs Ni host colors stay exclusive (never a blended Pd/Ni lattice tint).
 * - Rest positions enable future schematic displacement (VIZ-09) without remesh.
 * - Pick metadata is lattice index only — never a nuclear-proof claim.
 */

export const DYNAMIC_LATTICE_FIDELITY = 'schematic' as const;
export const DYNAMIC_LATTICE_CLAIM_TIER = 'speculative_exploratory' as const;
export const DYNAMIC_LATTICE_BUFFER_USAGE = 'DynamicDrawUsage' as const;

/** Exclusive host palette — one material key → one hex; no Pd/Ni blend. */
export const EXCLUSIVE_HOST_COLORS = Object.freeze({
  palladium: 0x8b8b8b,
  nickel: 0x4682b4,
  titanium: 0x7f8c8d,
  copper: 0xb87333,
  constantan: 0xb87333,
  lithium: 0xc0c0c0,
} as const);

export type ExclusiveHostKey = keyof typeof EXCLUSIVE_HOST_COLORS;

export type ExclusiveHostColor = {
  hostKey: ExclusiveHostKey | 'unknown';
  hex: number;
  exclusive: boolean;
  blended: false;
  label: string;
};

export type LatticeRestSite = {
  index: number;
  ix: number;
  iy: number;
  iz: number;
  x: number;
  y: number;
  z: number;
  occupied: boolean;
};

export type LatticePickResult = {
  instanceId: number;
  ix: number;
  iy: number;
  iz: number;
  occupied: boolean;
  hostKey: ExclusiveHostKey | 'unknown';
  fidelity: typeof DYNAMIC_LATTICE_FIDELITY;
  claimTier: typeof DYNAMIC_LATTICE_CLAIM_TIER;
  label: string;
};

function normalizeHostToken(hostMaterial: string | null | undefined): string {
  if (!hostMaterial || typeof hostMaterial !== 'string') return '';
  return hostMaterial.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** Resolve a single exclusive host color — refuse blended Pd/Ni keys. */
export function resolveExclusiveHostColor(
  hostMaterial: string | null | undefined,
): ExclusiveHostColor {
  const token = normalizeHostToken(hostMaterial);
  if (!token) {
    return {
      hostKey: 'unknown',
      hex: 0x696969,
      exclusive: false,
      blended: false,
      label: 'Unknown host',
    };
  }
  // Explicit blended tokens (e.g. "pd-ni") — refuse exclusive paint.
  if (/(pd|palladium).*(ni|nickel)|(ni|nickel).*(pd|palladium)/.test(token)) {
    return {
      hostKey: 'unknown',
      hex: 0x696969,
      exclusive: false,
      blended: false,
      label: 'Blended Pd/Ni refused',
    };
  }
  if (token === 'pd' || token === 'palladium' || token.startsWith('palladium')) {
    return {
      hostKey: 'palladium',
      hex: EXCLUSIVE_HOST_COLORS.palladium,
      exclusive: true,
      blended: false,
      label: 'Palladium',
    };
  }
  if (token === 'ni' || token === 'nickel' || token.startsWith('nickel')) {
    return {
      hostKey: 'nickel',
      hex: EXCLUSIVE_HOST_COLORS.nickel,
      exclusive: true,
      blended: false,
      label: 'Nickel',
    };
  }
  for (const key of Object.keys(EXCLUSIVE_HOST_COLORS) as ExclusiveHostKey[]) {
    if (token === key || token.startsWith(key)) {
      return {
        hostKey: key,
        hex: EXCLUSIVE_HOST_COLORS[key],
        exclusive: true,
        blended: false,
        label: key.charAt(0).toUpperCase() + key.slice(1),
      };
    }
  }
  return {
    hostKey: 'unknown',
    hex: 0x696969,
    exclusive: false,
    blended: false,
    label: 'Unknown host',
  };
}

/** Flat index → cubic (ix, iy, iz) with z fastest, then y, then x (UBLV order). */
export function indexToIjk(index: number, dimension: number): { ix: number; iy: number; iz: number } {
  const dim = Math.max(1, Math.floor(dimension));
  const ix = Math.floor(index / (dim * dim));
  const rem = index % (dim * dim);
  const iy = Math.floor(rem / dim);
  const iz = rem % dim;
  return { ix, iy, iz };
}

export function ijkToIndex(ix: number, iy: number, iz: number, dimension: number): number {
  const dim = Math.max(1, Math.floor(dimension));
  return ix * dim * dim + iy * dim + iz;
}

/**
 * Deterministic schematic occupancy mask from loading ratio.
 * Not engine site occupancy — fidelity stays schematic.
 */
export function buildOccupancyMask({
  count,
  loadingRatio,
  seed = 0,
}: {
  count: number;
  loadingRatio: number;
  seed?: number;
}): boolean[] {
  const n = Math.max(0, Math.floor(count));
  const ratio = Number.isFinite(loadingRatio)
    ? Math.min(1, Math.max(0, loadingRatio))
    : 0;
  const mask = new Array<boolean>(n).fill(false);
  if (n === 0 || ratio <= 0) return mask;

  // LCG — reproducible across remounts for the same (count, ratio, seed).
  let state = (Math.floor(seed) ^ Math.floor(ratio * 1e6) ^ (n * 2654435761)) >>> 0;
  if (state === 0) state = 0x9e3779b9;
  const next = (): number => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };

  for (let i = 0; i < n; i += 1) {
    mask[i] = next() < ratio;
  }
  return mask;
}

export function buildLatticeRestSites({
  dimension,
  spacing,
  yOffset = 0,
  loadingRatio = 0.9,
  seed = 0,
}: {
  dimension: number;
  spacing: number;
  yOffset?: number;
  loadingRatio?: number;
  seed?: number;
}): LatticeRestSite[] {
  const dim = Math.max(1, Math.floor(dimension));
  const pitch = Number.isFinite(spacing) && spacing > 0 ? spacing : 1;
  const offset = (dim - 1) * pitch / 2;
  const occupancy = buildOccupancyMask({
    count: dim * dim * dim,
    loadingRatio,
    seed,
  });
  const sites: LatticeRestSite[] = [];
  let index = 0;
  for (let ix = 0; ix < dim; ix += 1) {
    for (let iy = 0; iy < dim; iy += 1) {
      for (let iz = 0; iz < dim; iz += 1) {
        sites.push({
          index,
          ix,
          iy,
          iz,
          x: ix * pitch - offset,
          y: iy * pitch - offset + yOffset,
          z: iz * pitch - offset,
          occupied: occupancy[index] === true,
        });
        index += 1;
      }
    }
  }
  return sites;
}

/** Tint host base color when site is schematically occupied (loading). */
export function occupancyTintRgb(
  baseHex: number,
  occupied: boolean,
): { r: number; g: number; b: number } {
  const r = ((baseHex >> 16) & 0xff) / 255;
  const g = ((baseHex >> 8) & 0xff) / 255;
  const b = (baseHex & 0xff) / 255;
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

/**
 * Apply rest matrices (+ optional schematic displacement) and occupancy colors.
 * Duck-typed for InstancedMesh without requiring WebGL in unit tests.
 */
export function applyDynamicLatticeInstances({
  setMatrixAt,
  setColorAt,
  markMatrixDynamic,
  markColorDynamic,
  sites,
  displacements,
  hostHex,
}: {
  setMatrixAt: (_index: number, _elements: Float32Array | number[]) => void;
  setColorAt?: (_index: number, _rgb: { r: number; g: number; b: number }) => void;
  markMatrixDynamic?: () => void;
  markColorDynamic?: () => void;
  sites: LatticeRestSite[];
  /** Optional per-instance xyz displacement (VIZ-09 hook); default rest. */
  displacements?: Array<{ x: number; y: number; z: number } | null> | null;
  hostHex: number;
}): { bufferUsage: typeof DYNAMIC_LATTICE_BUFFER_USAGE; count: number } {
  markMatrixDynamic?.();
  if (setColorAt) markColorDynamic?.();

  const scratch = new Float32Array(16);
  // Column-major identity with translation in elements 12,13,14.
  scratch[0] = 1;
  scratch[5] = 1;
  scratch[10] = 1;
  scratch[15] = 1;

  for (let i = 0; i < sites.length; i += 1) {
    const site = sites[i];
    const d = displacements?.[i];
    scratch[12] = site.x + (d?.x || 0);
    scratch[13] = site.y + (d?.y || 0);
    scratch[14] = site.z + (d?.z || 0);
    setMatrixAt(i, scratch.slice());
    setColorAt?.(i, occupancyTintRgb(hostHex, site.occupied));
  }

  return { bufferUsage: DYNAMIC_LATTICE_BUFFER_USAGE, count: sites.length };
}

export function resolveLatticePick({
  instanceId,
  sites,
  hostKey,
}: {
  instanceId: number | null | undefined;
  sites: LatticeRestSite[];
  hostKey: ExclusiveHostKey | 'unknown';
}): LatticePickResult | null {
  if (instanceId == null || !Number.isInteger(instanceId)) return null;
  if (instanceId < 0 || instanceId >= sites.length) return null;
  const site = sites[instanceId];
  return {
    instanceId,
    ix: site.ix,
    iy: site.iy,
    iz: site.iz,
    occupied: site.occupied,
    hostKey,
    fidelity: DYNAMIC_LATTICE_FIDELITY,
    claimTier: DYNAMIC_LATTICE_CLAIM_TIER,
    label: `Host (${site.ix},${site.iy},${site.iz})${site.occupied ? ' · loaded' : ' · empty'}`,
  };
}

/** Interstitial H offset from a host rest site (schematic; not flux trajectories). */
export function interstitialOffsetFromSite(
  site: LatticeRestSite,
  spacing: number,
  rng: () => number = Math.random,
): [number, number, number] {
  const hOffset = spacing * 0.25;
  return [
    site.x + (rng() - 0.5) * hOffset,
    site.y + (rng() - 0.5) * hOffset,
    site.z + (rng() - 0.5) * hOffset,
  ];
}
