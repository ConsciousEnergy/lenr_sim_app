/**
 * VizChannelBinding — additive binding schema for 3D HUD / overlay channels.
 *
 * Every quantitative HUD readout must resolve a binding (claim_tier + fidelity).
 * Bare numbers without a tier are refused (return null / gap chip).
 *
 * Mirrors the VIZ-03 planning sketch in the v0.4.0-beta release plan.
 * Does not invent melt / RH / σ_Q channels as quantitative product truth.
 */

import type { ClaimTier } from './theoryGovernance';
import { CLAIM_TIERS } from './theoryGovernance';

export type VizFidelity = 'quantitative' | 'schematic' | 'indirect';

export type VizNullPolicy = 'hide' | 'schematic_fallback' | 'show_gap_chip';

export type VizChannelBinding = {
  channel_id: string;
  observable_path: string;
  unit: string;
  fidelity: VizFidelity;
  claim_tier: ClaimTier;
  provenance?: {
    source: string;
    model_version?: string;
    validation_status?: string;
    citation_keys?: string[];
  };
  host_material?: 'pd' | 'ni' | 'ti' | 'cu' | string;
  heating_mode?: 'P_joule' | 'P_resistive' | 'P_photonic';
  null_policy: VizNullPolicy;
  /** Short label for HUD chip rows. */
  label: string;
};

export const VIZ_CHANNEL_SCHEMA = 'lenr-viz-channel-binding-v1' as const;

/**
 * Default bubble-lattice HUD channels (shippable under liquid-phase hold).
 * Melt / P_* heating modes stay gap chips until unheld Prefer-merges.
 */
export const BUBBLE_LATTICE_VIZ_CHANNELS: Record<string, VizChannelBinding> = {
  'bubble.cycle_fraction': {
    channel_id: 'bubble.cycle_fraction',
    observable_path: '$.enhancement_timeline[*].normalized_time',
    unit: '1',
    fidelity: 'quantitative',
    claim_tier: 'established_reference',
    provenance: {
      source: 'bubble_phase_schedule',
      validation_status: 'schedule_synced',
    },
    null_policy: 'schematic_fallback',
    label: 'Cycle fraction',
  },
  'bubble.phase': {
    channel_id: 'bubble.phase',
    observable_path: '$.enhancement_timeline[*].phase',
    unit: 'label',
    fidelity: 'quantitative',
    claim_tier: 'established_reference',
    provenance: {
      source: 'bubble_phase_schedule',
      validation_status: 'schedule_synced',
    },
    null_policy: 'schematic_fallback',
    label: 'Bubble phase',
  },
  'bubble.radius_um': {
    channel_id: 'bubble.radius_um',
    observable_path: '$.enhancement_timeline[*].radius_um',
    unit: 'μm',
    fidelity: 'quantitative',
    claim_tier: 'empirical_lenr_correlation',
    provenance: {
      source: 'bubble_lattice_collapse',
      validation_status: 'model_output',
    },
    null_policy: 'schematic_fallback',
    label: 'Radius',
  },
  'collapse.temperature_k': {
    channel_id: 'collapse.temperature_k',
    observable_path: '$.enhancement_timeline[*].temperature_k',
    unit: 'K',
    fidelity: 'quantitative',
    claim_tier: 'empirical_lenr_correlation',
    provenance: {
      source: 'bubble_lattice_collapse',
      validation_status: 'model_output',
    },
    null_policy: 'schematic_fallback',
    label: 'T',
  },
  'collapse.electric_field_v_m': {
    channel_id: 'collapse.electric_field_v_m',
    observable_path: '$.enhancement_timeline[*].electric_field_v_m',
    unit: 'V/m',
    fidelity: 'quantitative',
    claim_tier: 'speculative_exploratory',
    provenance: {
      source: 'double_layer_field_model',
      validation_status: 'model_output',
    },
    null_policy: 'schematic_fallback',
    label: 'E',
  },
  'enhancement.claim_tier_display': {
    channel_id: 'enhancement.claim_tier_display',
    observable_path: '$.enhancement_timeline[*].enhancement',
    unit: '1',
    fidelity: 'quantitative',
    claim_tier: 'speculative_exploratory',
    provenance: {
      source: 'bubble_lattice_mechanism_product',
      validation_status: 'capped_display',
      citation_keys: [],
    },
    null_policy: 'schematic_fallback',
    label: 'Enhancement',
  },
  'collapse.compression_ratio': {
    channel_id: 'collapse.compression_ratio',
    observable_path: '$.collapse_results.compression_ratio',
    unit: '1',
    fidelity: 'quantitative',
    claim_tier: 'empirical_lenr_correlation',
    provenance: {
      source: 'bubble_lattice_collapse',
      validation_status: 'model_output',
    },
    null_policy: 'schematic_fallback',
    label: 'Compression',
  },
  'proton.regime': {
    channel_id: 'proton.regime',
    observable_path: '$.proton_phases',
    unit: 'label',
    fidelity: 'schematic',
    claim_tier: 'speculative_exploratory',
    provenance: {
      source: 'proton_phase_model',
      validation_status: 'regime_schematic',
    },
    null_policy: 'schematic_fallback',
    label: 'Proton regime',
  },
  // Held melt / heating-mode channels — gap until liquid-phase Prefer-merge.
  'host.phase_fraction_liquid': {
    channel_id: 'host.phase_fraction_liquid',
    observable_path: '$.host.phase_fraction_liquid',
    unit: '1',
    fidelity: 'schematic',
    claim_tier: 'speculative_exploratory',
    null_policy: 'show_gap_chip',
    label: 'Host liquid fraction',
  },
  'heat.P_joule': {
    channel_id: 'heat.P_joule',
    observable_path: '$.heat.P_joule',
    unit: 'W',
    fidelity: 'schematic',
    claim_tier: 'speculative_exploratory',
    heating_mode: 'P_joule',
    null_policy: 'show_gap_chip',
    label: 'P_joule',
  },
  'heat.P_resistive': {
    channel_id: 'heat.P_resistive',
    observable_path: '$.heat.P_resistive',
    unit: 'W',
    fidelity: 'schematic',
    claim_tier: 'speculative_exploratory',
    heating_mode: 'P_resistive',
    null_policy: 'show_gap_chip',
    label: 'P_resistive',
  },
  'heat.P_photonic': {
    channel_id: 'heat.P_photonic',
    observable_path: '$.heat.P_photonic',
    unit: 'W',
    fidelity: 'schematic',
    claim_tier: 'speculative_exploratory',
    heating_mode: 'P_photonic',
    null_policy: 'show_gap_chip',
    label: 'P_photonic',
  },
};

export type HudReadoutRequest = {
  channel_id: string;
  value: number | string | null | undefined;
  /** Override claim tier when the payload carries one (never upgrades honesty). */
  claim_tier_override?: ClaimTier | null;
  /** Local RAF fallback without engine samples. */
  source?: 'solver' | 'interpolated' | 'schematic' | 'local_fallback';
};

export type HudReadout =
  | {
      kind: 'value';
      channel_id: string;
      label: string;
      display: string;
      unit: string;
      fidelity: VizFidelity;
      claim_tier: ClaimTier;
      claim_tier_label: string;
      claim_tier_color: string;
      source: string;
    }
  | {
      kind: 'gap';
      channel_id: string;
      label: string;
      message: string;
      claim_tier: ClaimTier;
      claim_tier_label: string;
    }
  | null;

function formatHudValue(value: number | string, unit: string): string {
  if (typeof value === 'string') return value;
  if (!Number.isFinite(value)) return '—';
  if (unit === 'K') return `${value.toFixed(0)} K`;
  if (unit === 'μm') return `${value.toPrecision(3)} μm`;
  if (unit === 'V/m') {
    const scaled = value / 1e8;
    return `${scaled.toFixed(1)}×10⁸ V/m`;
  }
  if (unit === '1' && Math.abs(value) >= 100) return value.toExponential(2);
  if (unit === '1') return value.toFixed(2);
  return `${value}`;
}

/**
 * Resolve a HUD readout. Returns null when the binding refuses a bare number
 * (missing binding, or null with hide policy and no fallback).
 */
export function resolveHudReadout(request: HudReadoutRequest): HudReadout {
  const binding = BUBBLE_LATTICE_VIZ_CHANNELS[request.channel_id];
  if (!binding) return null;

  const tierInfo = CLAIM_TIERS[binding.claim_tier];
  const claimTier =
    request.claim_tier_override || binding.claim_tier;
  const claimInfo = CLAIM_TIERS[claimTier] || tierInfo;

  const isNull =
    request.value === null ||
    request.value === undefined ||
    (typeof request.value === 'number' && !Number.isFinite(request.value));

  if (isNull) {
    if (binding.null_policy === 'hide') return null;
    if (binding.null_policy === 'show_gap_chip') {
      return {
        kind: 'gap',
        channel_id: binding.channel_id,
        label: binding.label,
        message: 'not in contract',
        claim_tier: claimTier,
        claim_tier_label: claimInfo?.label || String(claimTier),
      };
    }
    // schematic_fallback with null — still refuse bare invented numbers
    return {
      kind: 'gap',
      channel_id: binding.channel_id,
      label: binding.label,
      message: 'no sample',
      claim_tier: claimTier,
      claim_tier_label: claimInfo?.label || String(claimTier),
    };
  }

  const source =
    request.source ||
    (binding.fidelity === 'schematic' ? 'schematic' : 'solver');

  // Local RAF without engine samples must not look like validated physics.
  const effectiveTier =
    source === 'local_fallback' ? 'speculative_exploratory' : claimTier;
  const effectiveInfo = CLAIM_TIERS[effectiveTier] || claimInfo;

  return {
    kind: 'value',
    channel_id: binding.channel_id,
    label: binding.label,
    display: formatHudValue(request.value as number | string, binding.unit),
    unit: binding.unit,
    fidelity: binding.fidelity,
    claim_tier: effectiveTier,
    claim_tier_label: effectiveInfo?.label || String(effectiveTier),
    claim_tier_color: effectiveInfo?.color || 'default',
    source,
  };
}

/**
 * Build optional stream `viz_channels` map from a physics frame.
 * Additive; never invents melt / P_* values.
 */
export function buildVizChannelsFromFrame(frame: Record<string, unknown> | null | undefined): Record<string, number | string | null> {
  if (!frame || typeof frame !== 'object') return {};
  const nuclear =
    (frame.proton_distribution as Record<string, number> | undefined)?.NUCLEAR ??
    null;
  return {
    'bubble.cycle_fraction':
      typeof frame.normalized_time === 'number' ? frame.normalized_time : null,
    'bubble.phase': typeof frame.phase === 'string' ? frame.phase : null,
    'bubble.radius_um':
      typeof frame.radius_um === 'number' ? frame.radius_um : null,
    'collapse.temperature_k':
      typeof frame.temperature_k === 'number' ? frame.temperature_k : null,
    'collapse.electric_field_v_m':
      typeof frame.electric_field_v_m === 'number'
        ? frame.electric_field_v_m
        : null,
    'enhancement.claim_tier_display':
      typeof frame.enhancement === 'number' ? frame.enhancement : null,
    'proton.regime_nuclear_fraction': nuclear,
    'host.phase_fraction_liquid': null,
    'heat.P_joule': null,
    'heat.P_resistive': null,
    'heat.P_photonic': null,
  };
}

export function listGapChannels(): VizChannelBinding[] {
  return Object.values(BUBBLE_LATTICE_VIZ_CHANNELS).filter(
    (b) => b.null_policy === 'show_gap_chip',
  );
}
