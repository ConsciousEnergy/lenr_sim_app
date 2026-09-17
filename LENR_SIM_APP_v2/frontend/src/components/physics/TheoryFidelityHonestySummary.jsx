/**
 * Compact Research-mode honesty strip for theory-pipeline results.
 * Surfaces multiplier-stack warning + free/fitted + simulator-approx flags
 * (ARA P0 / plan B2) without duplicating the full TheoryTogglePanel accordion.
 */
import React, { useMemo } from 'react';
import { Alert, Box, Chip, Stack, Typography } from '@mui/material';

function paramLabel(param) {
  if (typeof param === 'string') return param;
  if (!param || typeof param !== 'object') return 'param';
  const kind = param.kind ? `:${param.kind}` : '';
  return `${param.name || 'param'}${kind}`;
}

export default function TheoryFidelityHonestySummary({ theoryResult }) {
  const rows = theoryResult?.per_theory || [];
  const warning = theoryResult?.composition_provenance?.multiplier_stack_warning;

  const { freeLabels, approxCount } = useMemo(() => {
    const free = [];
    let approx = 0;
    rows.forEach((row) => {
      if (Array.isArray(row.free_or_fitted_parameters)) {
        row.free_or_fitted_parameters.forEach((p) => {
          free.push(`${row.theory_id}:${paramLabel(p)}`);
        });
      }
      const approxMap = row.author_equations_vs_simulator_approximations || {};
      if (
        Object.values(approxMap).some(
          (v) => String(v).includes('simulator') || String(v).includes('approx'),
        )
      ) {
        approx += 1;
      }
    });
    return { freeLabels: free.slice(0, 8), approxCount: approx };
  }, [rows]);

  if (!rows.length && !warning) return null;

  return (
    <Box data-testid="theory-fidelity-honesty-summary" sx={{ mb: 1.5 }}>
      {warning && (
        <Alert severity="warning" sx={{ mb: 1, py: 0.5 }}>
          <Typography variant="caption">{warning}</Typography>
        </Alert>
      )}
      <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap" alignItems="center">
        <Typography variant="caption" color="text.secondary">
          Honesty:
        </Typography>
        {approxCount > 0 && (
          <Chip
            size="small"
            variant="outlined"
            label={`${approxCount} module(s) use simulator approximations`}
            sx={{ height: 20, fontSize: '0.65rem' }}
          />
        )}
        {freeLabels.length > 0 && (
          <Chip
            size="small"
            color="warning"
            variant="outlined"
            label={`${freeLabels.length}+ free/fitted params`}
            sx={{ height: 20, fontSize: '0.65rem' }}
          />
        )}
        <Typography variant="caption" color="text.secondary">
          fidelity ≠ empirical support; EQ-OPEN stay OPEN
        </Typography>
      </Stack>
      {freeLabels.length > 0 && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
          {freeLabels.join(' · ')}
          {rows.reduce((n, r) => n + (r.free_or_fitted_parameters?.length || 0), 0) > freeLabels.length
            ? ' · …'
            : ''}
        </Typography>
      )}
    </Box>
  );
}
