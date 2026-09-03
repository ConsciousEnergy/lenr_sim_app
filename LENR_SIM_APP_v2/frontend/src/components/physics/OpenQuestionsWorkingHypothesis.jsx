/**
 * WH-ENP-01 coupled ledger panel for the Open Questions virtual lab.
 */
import React from 'react';
import {
  Alert,
  Box,
  Chip,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import { CLAIM_TIERS } from '../../utils/theoryGovernance';

function LeanChip({ id }) {
  return (
    <Chip
      label={id}
      size="small"
      variant="outlined"
      sx={{ fontFamily: 'monospace' }}
      onClick={() => navigator.clipboard?.writeText?.(id)}
    />
  );
}

export default function OpenQuestionsWorkingHypothesis({ workingHypothesis }) {
  const wh = workingHypothesis;
  if (!wh?.id) return null;
  const tier = CLAIM_TIERS[wh.claim_tier];
  const bound = wh.q2?.derived_bound || {};
  const dicke = wh.dicke || {};
  const stop = wh.q1?.alpha_stopping || {};
  const media = Object.entries(wh.q2?.neutron_moderation?.media || {});
  const channels = wh.channels || [];

  return (
    <Box sx={{ mb: 2 }} data-testid="wh-enp-01-panel">
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
        <Typography variant="subtitle2">Working hypothesis {wh.id}</Typography>
        <Chip
          label={tier?.label || wh.claim_tier}
          size="small"
          color={tier?.color || 'default'}
          variant="outlined"
        />
        <Chip label={wh.status || 'OPEN'} size="small" color="warning" />
        {(wh.lean_theorems || []).map((id) => (
          <LeanChip key={id} id={id} />
        ))}
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        {wh.statement}
      </Typography>
      <Alert severity="info" sx={{ mb: 1 }}>
        Lean identities prove conservation and non-closure. They do not prove LENR occurs.
        EQ-OPEN-MEV-01 / RAD-01 / RATE-01 remain OPEN.
      </Alert>
      <Typography variant="caption" display="block" color="text.secondary">
        Geometry {wh.geometry} · occupation {wh.occupation_model} · Dicke N² licensed:{' '}
        {dicke.n2_licensed ? 'yes' : 'no'} · HE factor {Number(wh.schwinger_he?.he_factor).toExponential(2)}
      </Typography>
      <Typography variant="caption" display="block" color="text.secondary" sx={{ mb: 1 }}>
        Alpha CSDA sketch {Number(stop.csda_range_pd_m).toExponential(1)} m at {stop.ke_per_alpha_mev} MeV/α
        {' '}(not counted in derived MeV). Harmonic Γ_ph/Γ_γ = {bound.derived_gamma_ph_over_gamma_gamma}
        {' '}vs target {bound.lattice_gamma_target}.
      </Typography>
      <Table size="small" sx={{ mb: 1 }} data-testid="wh-channel-graph">
        <TableHead>
          <TableRow>
            <TableCell>Channel</TableCell>
            <TableCell align="right">Q (MeV)</TableCell>
            <TableCell>Weight</TableCell>
            <TableCell>Primary γ</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {channels.map((row) => (
            <TableRow key={row.id}>
              <TableCell>{row.id}</TableCell>
              <TableCell align="right">{row.q_mev}</TableCell>
              <TableCell>{row.weight_kind}</TableCell>
              <TableCell>{String(row.primary_gamma_required)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Table size="small" data-testid="wh-n-moderation">
        <TableHead>
          <TableRow>
            <TableCell>H-rich medium</TableCell>
            <TableCell align="right">n thermalization length</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {media.map(([key, row]) => (
            <TableRow key={key}>
              <TableCell>{key} ({row.label})</TableCell>
              <TableCell align="right">
                {row.length_m == null ? 'unbounded / not condensed' : `${row.length_m} m`}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Tooltip title="Derived vs assumed">
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
          Remainder vector: Q1 {wh.remainder_vector?.q1_open_remainder_mev} MeV OPEN · Q2 derived ratio fails 1e11 · Q3 two-body log10 N = {wh.remainder_vector?.q3_log10_n_two_body}
        </Typography>
      </Tooltip>
    </Box>
  );
}
