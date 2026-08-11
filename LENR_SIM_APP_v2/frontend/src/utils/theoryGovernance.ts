/**
 * theoryGovernance.ts
 *
 * Frontend-side mirror of the backend's claim-tier / evidence-class
 * governance data. Kept in sync with:
 *   LENR_SIM_APP_v2/backend/app/physics_engine/theory_scoring.py
 *       CLAIM_TIER_MULTIPLIER
 *   LENR_SIM_APP_v2/docs/v0.3.6-beta/RUBRIC_GOVERNANCE.md
 *
 * Purpose: give UI components a single source of truth for
 *   - class-aware down-weight multipliers
 *   - human-readable explanations of evidence / claim tiers
 *   - regime-gate reason formatting
 * so "Why this score?" tooltips and the governance glossary drawer
 * stay consistent across the app.
 */

export type ClaimTier =
  | 'validated_lenr_mechanism'
  | 'established_reference'
  | 'empirical_lenr_correlation'
  | 'speculative_exploratory'
  | 'cross_regime_extrapolation'
  | string;

export type EvidenceClass =
  | 'empirically_validated'
  | 'well_characterized'
  | 'emerging_consensus'
  | 'exploratory'
  | 'cross_regime_extrapolation'
  | string;

/**
 * Must match backend theory_scoring.CLAIM_TIER_MULTIPLIER exactly.
 * Used to compute "effective" contribution = raw × multiplier in the UI.
 */
export const CLAIM_TIER_MULTIPLIER: Record<string, number> = {
  validated_lenr_mechanism: 1.0,
  established_reference: 1.0,
  empirical_lenr_correlation: 0.9,
  speculative_exploratory: 0.3,
  cross_regime_extrapolation: 0.2,
};

export interface TierInfo {
  label: string;
  color: 'success' | 'primary' | 'warning' | 'error' | 'default' | 'info';
  multiplier: number;
  description: string;
}

export const CLAIM_TIERS: Record<string, TierInfo> = {
  validated_lenr_mechanism: {
    label: 'Validated LENR mechanism',
    color: 'success',
    multiplier: 1.0,
    description:
      'Mechanism with reproducible LENR observations and physics-consistent mechanism; weighted at full strength in aggregated scores.',
  },
  established_reference: {
    label: 'Established reference formalism',
    color: 'info',
    multiplier: 1.0,
    description:
      'Standard free-particle / thermonuclear reference (e.g. two-body ⟨σv⟩). Used as a baseline for comparison—not a validated lattice-LENR mechanism.',
  },
  empirical_lenr_correlation: {
    label: 'Empirical LENR correlation',
    color: 'primary',
    multiplier: 0.9,
    description:
      'Correlation repeatedly reported in LENR studies but without a fully mechanistic derivation; weighted at 0.9× to reflect remaining uncertainty.',
  },
  speculative_exploratory: {
    label: 'Speculative / exploratory',
    color: 'warning',
    multiplier: 0.3,
    description:
      'Mechanism that is physically motivated but lacks direct LENR evidence; kept visible as an exploratory track and weighted at 0.3× so it cannot dominate the final score.',
  },
  cross_regime_extrapolation: {
    label: 'Cross-regime extrapolation',
    color: 'error',
    multiplier: 0.2,
    description:
      'Track based on scaling laws from a non-LENR regime (e.g. astrophysical plasma). Shown for quantitative comparison only and strongly down-weighted (0.2×).',
  },
};

export const EVIDENCE_CLASSES: Record<string, { label: string; description: string }> = {
  empirically_validated: {
    label: 'Empirically validated',
    description:
      'Multiple independent experimental confirmations with well-characterized uncertainty envelopes.',
  },
  well_characterized: {
    label: 'Well-characterized',
    description:
      'Supported by experiments with clear protocol, reproducibility, and published benchmarks.',
  },
  emerging_consensus: {
    label: 'Emerging consensus',
    description:
      'Supported by a growing number of independent labs; some parameter ranges still under active debate.',
  },
  exploratory: {
    label: 'Exploratory',
    description:
      'Preliminary or limited replication; treat as a hypothesis generator, not a prediction.',
  },
  cross_regime_extrapolation: {
    label: 'Cross-regime extrapolation',
    description:
      'Theory grounded in a different physical regime (stellar, tokamak, beam fusion). Included as context; not a direct LENR claim.',
  },
};

/**
 * Look up the claim-tier multiplier with a safe default matching the
 * backend's behavior for unknown / missing tiers
 * ("speculative_exploratory" = 0.3).
 */
export function claimTierMultiplier(tier: string | undefined | null): number {
  if (!tier) return CLAIM_TIER_MULTIPLIER.speculative_exploratory;
  return (
    CLAIM_TIER_MULTIPLIER[tier] ??
    CLAIM_TIER_MULTIPLIER.speculative_exploratory
  );
}

/**
 * Build a short, human-readable reason why a theory contribution was
 * flagged `is_applicable = false`. Uses `provenance.regime_gate`
 * thresholds if present, otherwise returns a generic message.
 *
 * The backend currently does not attach a dedicated `inapplicable_reason`
 * string to every contribution; this helper is a pragmatic shim that
 * formats what is already available so the UI can always surface
 * something useful.
 */
export function buildRegimeGateReason(
  provenance: Record<string, unknown> | undefined,
  parametersUsed: Record<string, number> | undefined,
): string {
  if (!provenance) {
    return 'Outside this theory\'s applicability regime under the current conditions.';
  }
  const gate = provenance.regime_gate as
    | Record<string, number>
    | undefined;
  if (!gate || typeof gate !== 'object') {
    return 'Outside this theory\'s applicability regime under the current conditions.';
  }

  const parts: string[] = [];
  const t = parametersUsed?.temperature;
  const n = parametersUsed?.plasma_density_m3 ?? parametersUsed?.density_m3;
  const b = parametersUsed?.mhd_field_strength_T ?? parametersUsed?.B_tesla;

  if (typeof gate.min_temperature_k === 'number' && typeof t === 'number' && t < gate.min_temperature_k) {
    parts.push(`T = ${t.toExponential(1)} K < required ${gate.min_temperature_k.toExponential(1)} K`);
  }
  if (typeof gate.min_density_m3 === 'number' && typeof n === 'number' && n < gate.min_density_m3) {
    parts.push(`n = ${n.toExponential(1)} m⁻³ < required ${gate.min_density_m3.toExponential(1)} m⁻³`);
  }
  if (typeof gate.min_field_t === 'number' && typeof b === 'number' && b < gate.min_field_t) {
    parts.push(`B = ${b.toExponential(1)} T < required ${gate.min_field_t.toExponential(1)} T`);
  }

  if (parts.length === 0) {
    return 'Outside this theory\'s applicability regime under the current conditions.';
  }
  return `Regime gate not met: ${parts.join('; ')}.`;
}
