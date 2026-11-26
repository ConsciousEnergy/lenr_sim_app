/**
 * Shared LENR particle palette — single source of truth for legend CSS swatches
 * and UBLV WebGL host/solute hexes so they cannot drift again.
 *
 * Honesty: schematic presentation colors only — not QM orbitals / not EQ-OPEN.
 */

export type LenrPaletteEntry = {
  key: string;
  hex: number;
  css: string;
  label: string;
  symbol: string;
  description: string;
  mass: string;
};

function cssFromHex(hex: number): string {
  return `#${(hex >>> 0).toString(16).padStart(6, '0')}`;
}

/** Exclusive host palette — one material key → one hex; no Pd/Ni blend. */
export const LENR_HOST_PALETTE = Object.freeze({
  palladium: {
    key: 'palladium',
    hex: 0x8b8b8b,
    css: '#8b8b8b',
    label: 'Palladium (Pd)',
    symbol: 'Pd',
    description: 'Host metal with high H absorption - FCC structure',
    mass: '106.42 u',
  },
  nickel: {
    key: 'nickel',
    hex: 0x4682b4,
    css: '#4682b4',
    label: 'Nickel (Ni)',
    symbol: 'Ni',
    description: 'Host metal lattice atom - FCC structure',
    mass: '58.69 u',
  },
  titanium: {
    key: 'titanium',
    hex: 0x7f8c8d,
    css: '#7f8c8d',
    label: 'Titanium (Ti)',
    symbol: 'Ti',
    description: 'Alternative host metal - HCP structure',
    mass: '47.87 u',
  },
  copper: {
    key: 'copper',
    hex: 0xb87333,
    css: '#b87333',
    label: 'Copper (Cu)',
    symbol: 'Cu',
    description: 'Host metal reference - FCC structure',
    mass: '63.55 u',
  },
  constantan: {
    key: 'constantan',
    hex: 0xb87333,
    css: '#b87333',
    label: 'Constantan',
    symbol: 'CuNi',
    description: 'Cu-Ni alloy host reference',
    mass: '—',
  },
  lithium: {
    key: 'lithium',
    hex: 0xc0c0c0,
    css: '#c0c0c0',
    label: 'Lithium (Li)',
    symbol: 'Li',
    description: 'Light element host / dopant presentation',
    mass: '6.94 u',
  },
} as const satisfies Record<string, LenrPaletteEntry>);

/** Interstitial solute beads — legend-aligned H/D. */
export const LENR_SOLUTE_PALETTE = Object.freeze({
  hydrogen: {
    key: 'hydrogen',
    hex: 0x32cd32,
    css: '#32cd32',
    label: 'Hydrogen (H)',
    symbol: 'H',
    description: 'Interstitial hydrogen at octahedral/tetrahedral sites',
    mass: '1.008 u',
  },
  deuterium: {
    key: 'deuterium',
    hex: 0x00ced1,
    css: '#00ced1',
    label: 'Deuterium (D)',
    symbol: '²H',
    description: 'Heavy hydrogen isotope in lattice',
    mass: '2.014 u',
  },
} as const satisfies Record<string, LenrPaletteEntry>);

/**
 * Catalyst / dopant Li row for legend — distinct from host lithium silver.
 * Presentation only.
 */
export const LENR_LITHIUM_CATALYST: LenrPaletteEntry = Object.freeze({
  key: 'lithium',
  hex: 0x20b2aa,
  css: '#20b2aa',
  label: 'Lithium (Li)',
  symbol: 'Li',
  description: 'Light element catalyst/dopant',
  mass: '6.94 u',
});

export type LenrHostPaletteKey = keyof typeof LENR_HOST_PALETTE;
export type LenrSolutePaletteKey = keyof typeof LENR_SOLUTE_PALETTE;

/** WebGL exclusive host map (same values as historical EXCLUSIVE_HOST_COLORS). */
export const EXCLUSIVE_HOST_COLORS = Object.freeze(
  Object.fromEntries(
    (Object.keys(LENR_HOST_PALETTE) as LenrHostPaletteKey[]).map((key) => [
      key,
      LENR_HOST_PALETTE[key].hex,
    ]),
  ) as Record<LenrHostPaletteKey, number>,
);

/** Legend-facing LENR particle map (CSS swatches). */
export function buildLenrLegendParticleTypes(): Record<string, {
  color: string;
  label: string;
  symbol: string;
  description: string;
  mass: string;
}> {
  return {
    nickel: {
      color: LENR_HOST_PALETTE.nickel.css,
      label: LENR_HOST_PALETTE.nickel.label,
      symbol: LENR_HOST_PALETTE.nickel.symbol,
      description: LENR_HOST_PALETTE.nickel.description,
      mass: LENR_HOST_PALETTE.nickel.mass,
    },
    palladium: {
      color: LENR_HOST_PALETTE.palladium.css,
      label: LENR_HOST_PALETTE.palladium.label,
      symbol: LENR_HOST_PALETTE.palladium.symbol,
      description: LENR_HOST_PALETTE.palladium.description,
      mass: LENR_HOST_PALETTE.palladium.mass,
    },
    titanium: {
      color: LENR_HOST_PALETTE.titanium.css,
      label: LENR_HOST_PALETTE.titanium.label,
      symbol: LENR_HOST_PALETTE.titanium.symbol,
      description: LENR_HOST_PALETTE.titanium.description,
      mass: LENR_HOST_PALETTE.titanium.mass,
    },
    copper: {
      color: LENR_HOST_PALETTE.copper.css,
      label: LENR_HOST_PALETTE.copper.label,
      symbol: LENR_HOST_PALETTE.copper.symbol,
      description: LENR_HOST_PALETTE.copper.description,
      mass: LENR_HOST_PALETTE.copper.mass,
    },
    hydrogen: {
      color: LENR_SOLUTE_PALETTE.hydrogen.css,
      label: LENR_SOLUTE_PALETTE.hydrogen.label,
      symbol: LENR_SOLUTE_PALETTE.hydrogen.symbol,
      description: LENR_SOLUTE_PALETTE.hydrogen.description,
      mass: LENR_SOLUTE_PALETTE.hydrogen.mass,
    },
    deuterium: {
      color: LENR_SOLUTE_PALETTE.deuterium.css,
      label: LENR_SOLUTE_PALETTE.deuterium.label,
      symbol: LENR_SOLUTE_PALETTE.deuterium.symbol,
      description: LENR_SOLUTE_PALETTE.deuterium.description,
      mass: LENR_SOLUTE_PALETTE.deuterium.mass,
    },
    lithium: {
      color: LENR_LITHIUM_CATALYST.css,
      label: LENR_LITHIUM_CATALYST.label,
      symbol: LENR_LITHIUM_CATALYST.symbol,
      description: LENR_LITHIUM_CATALYST.description,
      mass: LENR_LITHIUM_CATALYST.mass,
    },
  };
}

/** Pd runs → D teal; other hosts → H green (matches UBLV Tier-0 convention). */
export function resolveSolutePaletteEntry(
  hostMaterial: string | null | undefined,
): LenrPaletteEntry {
  const token = (hostMaterial || '').trim().toLowerCase();
  if (token === 'palladium' || token === 'pd' || token.startsWith('palladium')) {
    return LENR_SOLUTE_PALETTE.deuterium;
  }
  return LENR_SOLUTE_PALETTE.hydrogen;
}

export function hexToRgb01(hex: number): { r: number; g: number; b: number } {
  const safe = Number.isFinite(hex) ? hex >>> 0 : 0x888888;
  return {
    r: ((safe >> 16) & 0xff) / 255,
    g: ((safe >> 8) & 0xff) / 255,
    b: (safe & 0xff) / 255,
  };
}

export { cssFromHex };
