/**
 * Public-beta claim / engine-maturity legend.
 * Locked tiers: Beta (WKB/Gamow) · Approximate (RP/KM) · Aspirational (FEM / P–S / continuum).
 */
import PropTypes from 'prop-types';
import { Box, Chip, Stack, Typography } from '@mui/material';
import { MATURITY_CHIP } from '../config/engineMaturity';

const LEGEND_ROWS = [
  {
    key: 'beta',
    chip: MATURITY_CHIP.beta,
    summary: 'Live on public beta — WKB / Gamow tunneling numerics.',
  },
  {
    key: 'approximate',
    chip: MATURITY_CHIP.approximate,
    summary: 'Live approximate — Rayleigh–Plesset / Keller–Miksis collapse ODEs.',
  },
  {
    key: 'aspirational',
    chip: MATURITY_CHIP.aspirational,
    summary:
      'Not deployed — FEM / Poisson–Schrödinger / continuum (COMSOL-class) research methods only.',
  },
];

export default function EngineMaturityLegend({ dense = false, sx }) {
  return (
    <Box
      data-testid="engine-maturity-legend"
      role="region"
      aria-label="Engine claim-tier legend"
      sx={sx}
    >
      <Typography
        variant={dense ? 'caption' : 'subtitle2'}
        color="text.secondary"
        sx={{ fontWeight: 600, display: 'block', mb: dense ? 0.5 : 1 }}
      >
        Claim tiers (public beta)
      </Typography>
      <Stack spacing={dense ? 0.5 : 1}>
        {LEGEND_ROWS.map((row) => (
          <Stack
            key={row.key}
            direction="row"
            spacing={1}
            alignItems="flex-start"
            flexWrap="wrap"
            useFlexGap
          >
            <Chip
              size="small"
              color={row.chip.color}
              variant="outlined"
              label={row.chip.label}
              data-testid={`engine-maturity-legend-${row.key}`}
            />
            <Typography variant="caption" color="text.secondary" component="span">
              {row.summary}
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
}

EngineMaturityLegend.propTypes = {
  dense: PropTypes.bool,
  sx: PropTypes.object,
};
