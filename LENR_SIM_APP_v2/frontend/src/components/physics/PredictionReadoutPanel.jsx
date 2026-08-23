/**
 * Researcher-facing guide for three-tier prediction numbers.
 */
import React from 'react';
import { Alert, Box, Table, TableBody, TableCell, TableRow, Typography } from '@mui/material';

const ROWS = [
  {
    label: 'Sensitivity model',
    meaning: 'Upper-bound exploratory product of all mechanisms; use log₁₀ for magnitude.',
  },
  {
    label: 'Physics governed',
    meaning: 'Grouped composition (max within correlated collapse groups); primary falsifiable scenario prediction.',
  },
  {
    label: 'Claim-tier display',
    meaning: 'Governance ceiling (10⁵); never read as measured enhancement.',
  },
  {
    label: 'Oracle A / B',
    meaning: 'Rate-budget and hypothesis odds; separate from the enhancement product.',
  },
];

export default function PredictionReadoutPanel({ prediction }) {
  const governedLog10 = prediction?.physics_governed?.total_log10;
  const claimTotal = prediction?.claim_tier_display?.total;

  return (
    <Alert severity="info" data-testid="prediction-readout-panel" sx={{ mb: 2 }}>
      <Typography variant="subtitle2" gutterBottom>How to read these numbers</Typography>
      <Table size="small">
        <TableBody>
          {ROWS.map((row) => (
            <TableRow key={row.label}>
              <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap', border: 0 }}>{row.label}</TableCell>
              <TableCell sx={{ border: 0 }}>{row.meaning}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {prediction && (
        <Box sx={{ mt: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Current run — physics governed: 10^{Number.isFinite(governedLog10) ? governedLog10.toFixed(2) : '—'};
            claim-tier display: {typeof claimTotal === 'number' ? claimTotal.toExponential(1) : '—'}
          </Typography>
        </Box>
      )}
    </Alert>
  );
}
