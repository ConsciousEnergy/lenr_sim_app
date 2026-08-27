import React from 'react';
import {
  Alert,
  Box,
  Chip,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';

function formatPct(value) {
  if (!Number.isFinite(value)) return '—';
  return `${(value * 100).toFixed(0)}%`;
}

function formatCi(lo, hi) {
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return '—';
  return `${(lo * 100).toFixed(0)}–${(hi * 100).toFixed(0)}%`;
}

export default function AssociationRankPanel({ overlay }) {
  const perTheory = overlay?.per_theory || {};
  const rankedIds = overlay?.ranked_theory_ids?.length
    ? overlay.ranked_theory_ids
    : Object.entries(perTheory)
      .sort(([, a], [, b]) => (b.mean_final_score || 0) - (a.mean_final_score || 0))
      .map(([tid]) => tid);

  return (
    <Paper sx={{ p: 2, mb: 2 }} data-testid="association-rank-panel">
      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
        Model association rank
      </Typography>
      <Typography
        variant="caption"
        color="text.secondary"
        display="block"
        sx={{ mb: 1 }}
        data-testid="association-rank-caption"
      >
        Ranked by five-factor GM × claim-tier under persisted conditions.
        This is model association, not empirical P(LENR).
        is_empirical_confidence={String(Boolean(overlay?.is_empirical_confidence))}
      </Typography>
      {!(overlay?.n_runs > 0) ? (
        <Alert severity="info" sx={{ mt: 1 }}>
          No persisted theory_runs yet. Hydrate the demo pack or run
          association_screen / Theory Testbed with auto-persist on.
        </Alert>
      ) : (
        <>
          <Stack direction="row" spacing={0.5} sx={{ mb: 1, flexWrap: 'wrap', gap: 0.5 }}>
            <Chip size="small" variant="outlined" label={`N=${overlay.n_runs}`} />
            <Chip
              size="small"
              variant="outlined"
              label={`empirical confidence: ${overlay.is_empirical_confidence ? 'true' : 'false'}`}
            />
          </Stack>
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Theory</TableCell>
                  <TableCell align="right">Association</TableCell>
                  <TableCell align="right">N</TableCell>
                  <TableCell align="right">CI</TableCell>
                  <TableCell>claim_tier</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rankedIds.map((tid) => {
                  const rec = perTheory[tid] || {};
                  return (
                    <TableRow key={tid} data-testid={`association-rank-row-${tid}`}>
                      <TableCell>{String(tid).replace(/_/g, ' ')}</TableCell>
                      <TableCell align="right">{formatPct(rec.mean_final_score)}</TableCell>
                      <TableCell align="right">{rec.n ?? '—'}</TableCell>
                      <TableCell align="right">{formatCi(rec.ci_lo, rec.ci_hi)}</TableCell>
                      <TableCell>{rec.claim_tier || '—'}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Box>
        </>
      )}
    </Paper>
  );
}
