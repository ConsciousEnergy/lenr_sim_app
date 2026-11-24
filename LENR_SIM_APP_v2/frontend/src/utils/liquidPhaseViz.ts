/**
 * Liquid-phase visualization helpers (VIZ-07 / VIZ-12 scaffold).
 *
 * Honesty locks:
 * - Never invent `phase_fraction_liquid` from ambient T or excess heat.
 * - Excess heat ≠ host-melt switch.
 * - Pd XOR Ni only (never blended host melt).
 * - Literature Tm are cite-backed constants for HUD/legend; not TheoryModule output.
 * - Overlay morph activates only when engine supplies a finite f_L in [0, 1].
 */

export const LIQUID_PHASE_VIZ_CLAIM_TIER = 'speculative_exploratory' as const;

/** Literature melting points (K) — RSC/CRC-class cites from liquid-phase research packs. */
export const HOST_MELTING_POINT_K = Object.freeze({
  palladium: 1828,
  pd: 1828,
  nickel: 1728,
  ni: 1728,
});

export const HEATING_MODE_GLYPHS = Object.freeze([
  {
    channel_id: 'heat.P_joule',
    mode: 'P_joule',
    label: 'P_joule',
    reactorClass: 'Electrolytic',
    description: 'Joule heating along electrode / electrolyte current path',
  },
  {
    channel_id: 'heat.P_resistive',
    mode: 'P_resistive',
    label: 'P_resistive',
    reactorClass: 'Gaseous',
    description: 'Separate ohmic heater / filament (not electrolyte current)',
  },
  {
    channel_id: 'heat.P_photonic',
    mode: 'P_photonic',
    label: 'P_photonic',
    reactorClass: 'Laser',
    description: 'Absorbed laser power → local film / melt pool when cite-gated',
  },
] as const);

export type LiquidPhaseHostKey = 'palladium' | 'nickel' | 'unsupported';

export type HostMeltMeta = {
  hostKey: LiquidPhaseHostKey;
  displayName: string;
  meltingPointK: number | null;
  exclusive: boolean;
  citeNote: string;
};

export type LiquidPhaseOverlayState = {
  mode: 'gap' | 'schematic_film';
  hostKey: LiquidPhaseHostKey;
  meltingPointK: number | null;
  phaseFractionLiquid: number | null;
  /** Local film scale in [0, 1] when mode is schematic_film. */
  filmScale: number;
  claimTier: typeof LIQUID_PHASE_VIZ_CLAIM_TIER;
  fidelity: 'schematic';
  message: string;
};

function normalizeHostToken(hostMaterial: string | null | undefined): string {
  if (!hostMaterial || typeof hostMaterial !== 'string') return '';
  return hostMaterial.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** Map UI / API host strings to palladium | nickel | unsupported. */
export function resolveLiquidPhaseHostKey(
  hostMaterial: string | null | undefined,
): LiquidPhaseHostKey {
  const token = normalizeHostToken(hostMaterial);
  if (!token) return 'unsupported';
  if (token === 'pd' || token === 'palladium' || token.startsWith('palladium')) {
    return 'palladium';
  }
  if (token === 'ni' || token === 'nickel' || token.startsWith('nickel')) {
    return 'nickel';
  }
  // Pd-D / Ni-H presets sometimes arrive as compound labels
  if (token.includes('palladium') || token === 'pdd') return 'palladium';
  if (token.includes('nickel') || token === 'nih') return 'nickel';
  return 'unsupported';
}

export function resolveHostMeltMeta(
  hostMaterial: string | null | undefined,
): HostMeltMeta {
  const hostKey = resolveLiquidPhaseHostKey(hostMaterial);
  if (hostKey === 'palladium') {
    return {
      hostKey,
      displayName: 'Pd',
      meltingPointK: HOST_MELTING_POINT_K.palladium,
      exclusive: true,
      citeNote: 'Literature T_m (RSC/CRC-class); not engine melt gate',
    };
  }
  if (hostKey === 'nickel') {
    return {
      hostKey,
      displayName: 'Ni',
      meltingPointK: HOST_MELTING_POINT_K.nickel,
      exclusive: true,
      citeNote: 'Literature T_m (RSC/CRC-class); not engine melt gate',
    };
  }
  return {
    hostKey: 'unsupported',
    displayName: hostMaterial || 'host',
    meltingPointK: null,
    exclusive: false,
    citeNote: 'Liquid-phase melt viz is Pd XOR Ni only',
  };
}

/**
 * Parse engine-supplied liquid fraction. Returns null for missing / invalid.
 * Does not derive f_L from temperature.
 */
export function parsePhaseFractionLiquid(
  value: unknown,
): number | null {
  if (value === null || value === undefined) return null;
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num)) return null;
  if (num < 0 || num > 1) return null;
  return num;
}

/**
 * Resolve VIZ-12 overlay state from host + optional engine f_L.
 * Gap unless a finite phase fraction is supplied for Pd or Ni.
 */
export function resolveLiquidPhaseOverlayState(args: {
  hostMaterial?: string | null;
  phaseFractionLiquid?: unknown;
}): LiquidPhaseOverlayState {
  const meta = resolveHostMeltMeta(args.hostMaterial);
  const fraction = parsePhaseFractionLiquid(args.phaseFractionLiquid);

  if (meta.hostKey === 'unsupported') {
    return {
      mode: 'gap',
      hostKey: 'unsupported',
      meltingPointK: null,
      phaseFractionLiquid: null,
      filmScale: 0,
      claimTier: LIQUID_PHASE_VIZ_CLAIM_TIER,
      fidelity: 'schematic',
      message: 'Pd XOR Ni only — gap',
    };
  }

  if (fraction === null || fraction <= 0) {
    return {
      mode: 'gap',
      hostKey: meta.hostKey,
      meltingPointK: meta.meltingPointK,
      phaseFractionLiquid: fraction,
      filmScale: 0,
      claimTier: LIQUID_PHASE_VIZ_CLAIM_TIER,
      fidelity: 'schematic',
      message:
        fraction === 0
          ? 'f_L = 0 — solid lattice (no melt morph)'
          : 'f_L not in contract — gap (TheoryModules pending)',
    };
  }

  // Local film / pool only — never "bulk electrode melted" copy.
  const filmScale = Math.min(1, Math.max(0.05, Math.sqrt(fraction)));
  return {
    mode: 'schematic_film',
    hostKey: meta.hostKey,
    meltingPointK: meta.meltingPointK,
    phaseFractionLiquid: fraction,
    filmScale,
    claimTier: LIQUID_PHASE_VIZ_CLAIM_TIER,
    fidelity: 'schematic',
    message: `Local film schematic · f_L=${fraction.toFixed(2)} · speculative`,
  };
}

/**
 * Pull melt / heating channels from optional payload surfaces without inventing.
 */
export function extractLiquidPhaseChannels(
  payload: Record<string, unknown> | null | undefined,
): {
  phaseFractionLiquid: number | null;
  heat: { P_joule: number | null; P_resistive: number | null; P_photonic: number | null };
} {
  const empty = {
    phaseFractionLiquid: null as number | null,
    heat: {
      P_joule: null as number | null,
      P_resistive: null as number | null,
      P_photonic: null as number | null,
    },
  };
  if (!payload || typeof payload !== 'object') return empty;

  const vizChannels =
    (payload.viz_channels as Record<string, unknown> | undefined) || {};
  const host = (payload.host as Record<string, unknown> | undefined) || {};
  const heat = (payload.heat as Record<string, unknown> | undefined) || {};

  const readNum = (...candidates: unknown[]): number | null => {
    for (const c of candidates) {
      if (typeof c === 'number' && Number.isFinite(c)) return c;
    }
    return null;
  };

  return {
    phaseFractionLiquid: parsePhaseFractionLiquid(
      vizChannels['host.phase_fraction_liquid'] ?? host.phase_fraction_liquid,
    ),
    heat: {
      P_joule: readNum(vizChannels['heat.P_joule'], heat.P_joule),
      P_resistive: readNum(vizChannels['heat.P_resistive'], heat.P_resistive),
      P_photonic: readNum(vizChannels['heat.P_photonic'], heat.P_photonic),
    },
  };
}
