/**
 * ReactionRateGovernancePanel.tsx
 *
 * Surfaces the backend `reaction_rate_engine` block (see
 * api/routes/unified_simulation.py) with explicit claim-tier governance so the
 * UI never overstates evidence:
 *   - selectable rate mode (two_body / trapped_state / three_body) + claim-tier chip
 *   - reaction-rate credible / predictive interval (p05..p95) when UQ was run
 *   - KG-RP harmonic-locking diagnostics (Phase 6) when provided
 *   - per-result citation keys
 *
 * Claim-tier labels/colours come from the shared governance source of truth
 * (utils/theoryGovernance.ts), so this panel stays in sync with the backend
 * scoring module and the governance glossary.
 */

import React from 'react';
import { Box, Typography, Chip, Divider, Tooltip, Stack } from '@mui/material';
import ScienceIcon from '@mui/icons-material/Science';
import { CLAIM_TIERS, ClaimTier } from '../../utils/theoryGovernance';

export interface RateResult {
  rate_per_m3_s: number;
  mode: string;
  claim_tier: ClaimTier;
  collective_factor: number;
  references?: string[];
  notes?: string;
}

export interface UQSummary {
  median: number;
  mean: number;
  credible_interval: { p05: number; p25: number; p50: number; p75: number; p95: number };
  interval_kind: string;
  n_samples: number;
  seed: number;
  sensitivity?: Record<string, number>;
  references?: string[];
}

export interface KGRPDiagnostics {
  locking_ratio: number;
  nearest_integer_harmonic: number;
  detuning: number;
  is_locked: boolean;
  compression_invariant: number;
  mach_invariant: number;
  claim_tier?: ClaimTier;
}

export interface ReactionRateEngineBlock {
  rate?: RateResult;
  uncertainty?: UQSummary;
  kgrp?: KGRPDiagnostics;
  shell_pairing_branching?: { claim_tier?: ClaimTier };
}

interface Props {
  block?: ReactionRateEngineBlock | null;
  kgrp?: KGRPDiagnostics | null;
  onOpenGlossary?: (anchor: 'claim') => void;
}

const fmt = (x: number | undefined): string => {
  if (x === undefined || x === null || !Number.isFinite(x)) return '—';
  if (x === 0) return '0';
  return x.toExponential(2);
};

const ClaimTierChip: React.FC<{ tier?: ClaimTier; onClick?: () => void }> = ({ tier, onClick }) => {
  const info = tier ? CLAIM_TIERS[tier] : undefined;
  if (!info) return null;
  return (
    <Tooltip title={info.description}>
      <Chip
        label={info.label}
        size="small"
        color={info.color}
        variant="outlined"
        onClick={onClick}
        aria-label={`Claim tier: ${info.label}`}
        sx={{ fontSize: '0.65rem', height: 20 }}
      />
    </Tooltip>
  );
};

const ReactionRateGovernancePanel: React.FC<Props> = ({ block, kgrp, onOpenGlossary }) => {
  const rate = block?.rate;
  const uq = block?.uncertainty;
  const diagnostics = kgrp ?? block?.kgrp ?? null;

  if (!rate) {
    return (
      <Box role="region" aria-label="Reaction rate engine" sx={{ p: 2 }}>
        <Typography variant="body2" color="text.secondary">
          No reaction-rate engine output for this run. Enable a rate mode (and
          optionally uncertainty quantification) to see governed rate estimates.
        </Typography>
      </Box>
    );
  }

  const ci = uq?.credible_interval;

  return (
    <Box role="region" aria-label="Reaction rate engine with governance" sx={{ p: 2 }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
        <ScienceIcon color="primary" fontSize="small" />
        <Typography variant="subtitle2" sx={{ flex: 1 }}>
          Reaction rate &mdash; {rate.mode}
        </Typography>
        <ClaimTierChip tier={rate.claim_tier} onClick={() => onOpenGlossary?.('claim')} />
      </Stack>

      <Typography variant="body2">
        Point estimate: <strong>{fmt(rate.rate_per_m3_s)}</strong> reactions·m⁻³·s⁻¹
      </Typography>
      {rate.collective_factor > 1 && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
          Coherent collective factor: ×{fmt(rate.collective_factor)} (model assumption)
        </Typography>
      )}

      {ci && (
        <>
          <Divider sx={{ my: 1 }} />
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
            {uq?.interval_kind === 'posterior_credible'
              ? 'Posterior credible interval'
              : 'Prior predictive interval'}{' '}
            ({uq?.n_samples} Sobol samples, seed {uq?.seed})
          </Typography>
          <Typography variant="body2">
            90% interval: <strong>{fmt(ci.p05)}</strong> &ndash; <strong>{fmt(ci.p95)}</strong>{' '}
            (median {fmt(ci.p50)})
          </Typography>
          {uq?.sensitivity && Object.keys(uq.sensitivity).length > 0 && (
            <Box sx={{ mt: 0.5 }}>
              <Typography variant="caption" color="text.secondary">
                Dominant uncertainty drivers:
              </Typography>{' '}
              {Object.entries(uq.sensitivity)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 2)
                .map(([k, v]) => (
                  <Chip
                    key={k}
                    label={`${k} ${(v * 100).toFixed(0)}%`}
                    size="small"
                    variant="outlined"
                    sx={{ fontSize: '0.6rem', height: 18, mr: 0.5 }}
                  />
                ))}
            </Box>
          )}
        </>
      )}

      {diagnostics && (
        <>
          <Divider sx={{ my: 1 }} />
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
            <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
              KG-RP harmonic locking
            </Typography>
            <ClaimTierChip tier={diagnostics.claim_tier ?? 'speculative_exploratory'} />
          </Stack>
          <Typography variant="body2">
            {diagnostics.is_locked
              ? `Locked ${diagnostics.nearest_integer_harmonic}:1 (detuning ${diagnostics.detuning.toFixed(3)})`
              : `Unlocked (detuning ${diagnostics.detuning.toFixed(3)})`}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Compression ×{fmt(diagnostics.compression_invariant)}, Mach {diagnostics.mach_invariant.toFixed(2)}
          </Typography>
        </>
      )}

      {rate.references && rate.references.length > 0 && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          Refs: {rate.references.join(', ')}
        </Typography>
      )}
      {rate.notes && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, fontStyle: 'italic' }}>
          {rate.notes}
        </Typography>
      )}
    </Box>
  );
};

export default ReactionRateGovernancePanel;
