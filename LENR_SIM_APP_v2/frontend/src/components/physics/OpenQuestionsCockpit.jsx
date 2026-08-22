/**
 * OpenQuestionsCockpit
 *
 * Researcher ledger for whether a nuclear LENR explanation can occur under
 * named hypotheses. Oracle A (Lean) + Oracle B (odds). Never LENR_PROVED.
 */
import React, { useCallback } from 'react';
import {
  Alert,
  Box,
  Chip,
  Divider,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import OpenQuestionsCharts from './OpenQuestionsCharts';

export const LOCAL_FALLBACK_OPEN_QUESTIONS = {
  schema: 'lenr-open-questions-v1',
  route_mode: 'local_fallback',
  rate_mode: 'two_body',
  determination: {
    status: 'INCONCLUSIVE',
    oracle_a: { note: 'local_fallback: Oracle A not evaluated.' },
    oracle_b: { note: 'UNAVAILABLE on local_fallback' },
    oracle_emp: { evaluated: false },
  },
  emp_chips: [],
  lenr_proved: false,
  q_mev_gap: { id: 'EQ-OPEN-MEV-01', status: 'OPEN', claim_tier: 'speculative_exploratory' },
  q_radiation: { id: 'EQ-OPEN-RAD-01', status: 'OPEN', claim_tier: 'speculative_exploratory' },
  q_statistical: { id: 'EQ-OPEN-RATE-01', status: 'OPEN', claim_tier: 'established_reference' },
  q_electron_capture: { id: 'EQ-OPEN-EC-01', status: 'OPEN', dimmed: true },
  q_integrated_yield: { id: 'EQ-OPEN-YIELD-01', status: 'OPEN', dimmed: true },
  composition: { not_combinable: true, illegal_product: null },
  open_ids: [
    'EQ-OPEN-MEV-01',
    'EQ-OPEN-RAD-01',
    'EQ-OPEN-RATE-01',
    'EQ-OPEN-EC-01',
    'EQ-OPEN-YIELD-01',
  ],
};

function copyText(text) {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text);
  }
}

function LeanId({ id }) {
  const onCopy = useCallback(() => copyText(id), [id]);
  return (
    <Tooltip title="Copy Lean / IR id">
      <Chip
        label={id}
        size="small"
        variant="outlined"
        onClick={onCopy}
        sx={{ fontFamily: 'monospace' }}
      />
    </Tooltip>
  );
}

function TierChip({ tier }) {
  if (!tier) return null;
  return <Chip label={tier} size="small" variant="outlined" />;
}

function QuestionRow({ title, block, dimmed = false }) {
  if (!block) return null;
  return (
    <Box sx={{ opacity: dimmed || block.dimmed ? 0.55 : 1, mb: 1.5 }}>
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
        <Typography variant="subtitle2">{title}</Typography>
        <Chip label={block.status || 'OPEN'} size="small" color={block.status === 'OPEN' ? 'warning' : 'default'} />
        <TierChip tier={block.claim_tier} />
        {block.id && <LeanId id={block.id} />}
        {(block.lean_theorems || []).map((id) => (
          <LeanId key={id} id={id} />
        ))}
      </Stack>
    </Box>
  );
}

export default function OpenQuestionsCockpit({ simulationData, openQuestions }) {
  const routeMode = simulationData?.validation?.route_mode;
  const raw = openQuestions || simulationData?.open_questions;
  const isFallback = routeMode === 'local_fallback' || raw?.route_mode === 'local_fallback';
  const oq = raw && Object.keys(raw).length
    ? raw
    : (isFallback ? LOCAL_FALLBACK_OPEN_QUESTIONS : null);
  if (!oq) return null;

  const status = oq.determination?.status || (isFallback ? 'INCONCLUSIVE' : 'OPEN');
  const empChips = isFallback ? [] : (oq.emp_chips || []);
  const illegal = oq.composition?.illegal_product;
  const tscLeak = oq.composition?.tsc_enhancement_can_scale_two_body;

  return (
    <Paper sx={{ p: 2 }} variant="outlined" data-testid="open-questions-cockpit">
      <Typography variant="h6" gutterBottom>Open questions cockpit</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        Determination under named hypotheses. Not a nature theorem. Not LENR_PROVED.
      </Typography>
      <Alert
        severity={status === 'RATE_BUDGET_DOES_NOT_CLOSE' ? 'warning' : 'info'}
        sx={{ mb: 2 }}
      >
        <Typography variant="subtitle2">
          Oracle A / B status: {String(status).split('_').join(' ')}
        </Typography>
        {status === 'RATE_BUDGET_DOES_NOT_CLOSE' && (
          <Typography variant="body2">
            Two-body rate budget does not close under f ≤ 10^5
            (log10 N_events = −40).
          </Typography>
        )}
        {isFallback && (
          <Typography variant="body2">
            local_fallback: INCONCLUSIVE / UNAVAILABLE. No EMP chips.
          </Typography>
        )}
      </Alert>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
        {(oq.determination?.oracle_a?.lean_theorems || ['EQ-RATE-2B-NC-01']).map((id) => (
          <LeanId key={id} id={id} />
        ))}
        <TierChip tier="established_reference" />
      </Stack>
      <Divider sx={{ mb: 2 }} />
      <QuestionRow title="Q1 MeV energy gap" block={oq.q_mev_gap} />
      <QuestionRow title="Q2 Radiation suppression" block={oq.q_radiation} />
      <QuestionRow title="Q3 Statistical feasibility" block={oq.q_statistical} />
      <QuestionRow title="Q4 Electron capture" block={oq.q_electron_capture} dimmed />
      <QuestionRow title="Q5 Integrated yield" block={oq.q_integrated_yield} dimmed />

      <Typography variant="subtitle2" sx={{ mt: 2 }}>Composition (three engines, never multiplied)</Typography>
      <Typography variant="body2" color="text.secondary">
        route_mode: {oq.route_mode || routeMode || 'unknown'} · not combinable
      </Typography>
      {illegal != null && (
        <Typography
          variant="body2"
          sx={{ textDecoration: 'line-through' }}
          color="error"
        >
          illegal product {Number(illegal).toExponential(0)} (not physical)
        </Typography>
      )}
      {tscLeak && (
        <Alert severity="warning" sx={{ mt: 1 }}>
          Takahashi TSC enhancement can scale two-body f_enh as a coherence-group
          rival. It is not trapped_state and must not multiply that rate.
        </Alert>
      )}

      {empChips.map((chip) => (
        <Chip
          key={chip.id}
          label={chip.label}
          size="small"
          sx={{ mr: 1, mt: 1 }}
          variant="outlined"
        />
      ))}

      <OpenQuestionsCharts openQuestions={oq} />
    </Paper>
  );
}
