/**
 * VIZ-04 — Quantitative vs Schematic fidelity legend split.
 * Honesty-neutral: labels overlay provenance; never raises claim tiers.
 */
import React from 'react';
import PropTypes from 'prop-types';
import { Box, Chip, Divider, Tooltip, Typography } from '@mui/material';
import {
  groupFidelityLegendEntries,
  VIZ_FIDELITY_LABELS,
} from '../../config/theoryVisualizationMap';

const FIDELITY_ORDER = ['quantitative', 'schematic', 'indirect'];

const FIDELITY_CHIP_SX = {
  quantitative: { bgcolor: 'rgba(46, 125, 50, 0.15)', borderColor: 'success.main' },
  schematic: { bgcolor: 'rgba(237, 108, 2, 0.12)', borderColor: 'warning.main' },
  indirect: { bgcolor: 'rgba(25, 118, 210, 0.12)', borderColor: 'info.main' },
};

/**
 * @param {object} props
 * @param {boolean} [props.compact]
 */
export default function FidelityLegendSplit({ compact = false }) {
  const groups = groupFidelityLegendEntries();

  return (
    <Box data-testid="fidelity-legend-split" sx={{ mb: compact ? 1 : 2 }}>
      <Typography
        variant="subtitle2"
        gutterBottom
        sx={{ fontWeight: 'bold', fontSize: compact ? '0.75rem' : undefined }}
      >
        Fidelity
      </Typography>
      <Typography
        variant="caption"
        color="text.secondary"
        display="block"
        sx={{ mb: 1, fontSize: '0.65rem' }}
      >
        Quantitative · from solver vs Schematic · illustrative — not claim-tier proof.
      </Typography>
      {FIDELITY_ORDER.map((key, idx) => {
        const rows = groups[key] || [];
        if (rows.length === 0) return null;
        return (
          <Box key={key} sx={{ mb: 1 }} data-testid={`fidelity-legend-group-${key}`}>
            {idx > 0 && <Divider sx={{ my: 0.75 }} />}
            <Chip
              size="small"
              variant="outlined"
              label={VIZ_FIDELITY_LABELS[key]}
              data-testid={`fidelity-legend-chip-${key}`}
              data-fidelity={key}
              sx={{
                height: 20,
                fontSize: '0.65rem',
                mb: 0.5,
                ...FIDELITY_CHIP_SX[key],
              }}
            />
            <Box sx={{ pl: 0.5 }}>
              {rows.map((row) => (
                <Tooltip
                  key={row.id}
                  title={`${row.description} — ${row.reference}`}
                  placement="right"
                >
                  <Typography
                    variant="caption"
                    display="block"
                    sx={{ fontSize: '0.7rem', cursor: 'help', lineHeight: 1.4 }}
                    data-testid={`fidelity-legend-row-${row.id}`}
                    data-fidelity={row.fidelity}
                  >
                    • {row.displayName}
                  </Typography>
                </Tooltip>
              ))}
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}

FidelityLegendSplit.propTypes = {
  compact: PropTypes.bool,
};
