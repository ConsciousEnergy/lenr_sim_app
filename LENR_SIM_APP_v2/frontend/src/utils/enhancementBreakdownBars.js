/**
 * enhancementBreakdownBars.js
 *
 * Live bar / radar norms for enhancement_breakdown primary channels
 * (screening · phonon · loading). Engine-bound presentation only —
 * speculative / exploratory product; not LENR proof.
 */

import {
  BUBBLE_LATTICE_VIZ_CHANNELS,
} from './vizChannelBindings';
import { CLAIM_TIERS } from './theoryGovernance';

export const ENHANCEMENT_BARS_FIDELITY = 'schematic';
export const ENHANCEMENT_BARS_SOURCE = 'enhancement_breakdown';
export const ENHANCEMENT_BARS_CLAIM_TAG = 'speculative / exploratory · engine-bound';
export const ENHANCEMENT_PRIMARY_BAR_KEYS = Object.freeze([
  'screening',
  'phonon',
  'loading',
]);

export const ENHANCEMENT_PRIMARY_BAR_META = Object.freeze({
  screening: {
    key: 'screening',
    label: 'Screening',
    channelId: 'enhancement.screening',
    color: '#00ffff',
  },
  phonon: {
    key: 'phonon',
    label: 'Phonon',
    channelId: 'enhancement.phonon',
    color: '#c0a060',
  },
  loading: {
    key: 'loading',
    label: 'Loading',
    channelId: 'enhancement.loading',
    color: '#88aaff',
  },
});

/** Resolve existing channel governance (no new scores). */
export function resolvePrimaryBarClaimTier(channelId, sampleSource = 'local_fallback') {
  const binding = BUBBLE_LATTICE_VIZ_CHANNELS[channelId];
  const baseTier = binding?.claim_tier || 'speculative_exploratory';
  // Match resolveHudReadout: Local Calc must stay speculative / exploratory.
  const claimTier =
    sampleSource === 'local_fallback' ? 'speculative_exploratory' : baseTier;
  const info = CLAIM_TIERS[claimTier] || CLAIM_TIERS.speculative_exploratory;
  return {
    claim_tier: claimTier,
    claim_tier_label: info?.label || String(claimTier),
    claim_tier_color: info?.color || 'default',
  };
}

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

function finiteOr(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Log10 bar fill for enhancement factors ≥ 1 (presentation scale).
 * maxLog=6 → factor 1e6 fills the bar; factors &lt; 1 clamp to 0.
 */
export function enhancementFactorBarNorm(value, { maxLog = 6 } = {}) {
  const v = Math.max(1, finiteOr(value, 1));
  const logMax = Math.max(1e-6, finiteOr(maxLog, 6));
  return clamp01(Math.log10(v) / logMax);
}

/**
 * Build primary stack bars from enhancement_breakdown.
 * Returns ordered screening · phonon · loading rows with norms + honesty.
 */
export function buildPrimaryEnhancementBars(
  breakdown,
  { maxLog = 6, sampleSource = 'local_fallback' } = {},
) {
  const src = breakdown && typeof breakdown === 'object' ? breakdown : {};
  const isEngine = sampleSource === 'solver' || sampleSource === 'interpolated';

  return ENHANCEMENT_PRIMARY_BAR_KEYS.map((key) => {
    const meta = ENHANCEMENT_PRIMARY_BAR_META[key];
    const raw = src[key];
    const value = typeof raw === 'number' && Number.isFinite(raw) ? raw : null;
    const displayValue = value == null ? 1 : Math.max(1, value);
    const governance = resolvePrimaryBarClaimTier(meta.channelId, sampleSource);
    return {
      key: meta.key,
      label: meta.label,
      channelId: meta.channelId,
      color: meta.color,
      value: value == null ? null : displayValue,
      norm: enhancementFactorBarNorm(displayValue, { maxLog }),
      missing: value == null,
      sampleSource,
      isEngine,
      fidelity: ENHANCEMENT_BARS_FIDELITY,
      claimTag: ENHANCEMENT_BARS_CLAIM_TAG,
      claim_tier: governance.claim_tier,
      claim_tier_label: governance.claim_tier_label,
      claim_tier_color: governance.claim_tier_color,
    };
  });
}

/**
 * Equilateral radar vertices for primary bars (SVG viewBox units).
 * Center (cx,cy); radius r; angle 0 at top, clockwise.
 */
export function enhancementRadarVertices(bars, { cx = 50, cy = 50, r = 40 } = {}) {
  const list = Array.isArray(bars) ? bars : [];
  const n = Math.max(list.length, 1);
  return list.map((bar, i) => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    const rr = r * clamp01(bar?.norm ?? 0);
    return {
      key: bar?.key ?? `axis-${i}`,
      x: cx + rr * Math.cos(angle),
      y: cy + rr * Math.sin(angle),
      axisX: cx + r * Math.cos(angle),
      axisY: cy + r * Math.sin(angle),
      color: bar?.color ?? '#ffffff',
      label: bar?.label ?? '',
      norm: clamp01(bar?.norm ?? 0),
    };
  });
}

/**
 * Closed SVG polygon points string for the radar fill.
 */
export function enhancementRadarPolygonPoints(vertices) {
  if (!vertices?.length) return '';
  return vertices.map((v) => `${v.x.toFixed(2)},${v.y.toFixed(2)}`).join(' ');
}
