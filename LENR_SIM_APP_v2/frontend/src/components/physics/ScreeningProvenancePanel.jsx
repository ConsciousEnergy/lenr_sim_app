/**
 * Renders electron-screening provenance from mechanism_provenance.screening.
 *
 * Distinguishes Assenbaum domain (EQ-ASSEN-DOM-01: Uₑ < E) from the RR-007
 * adiabatic metal/gas-target floor — those must not be conflated in UI copy.
 */
import React from 'react';
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

function formatNumber(value, digits = 2) {
  if (value == null || !Number.isFinite(Number(value))) return '—';
  const num = Number(value);
  if (Math.abs(num) >= 1000 || (Math.abs(num) > 0 && Math.abs(num) < 0.01)) {
    return num.toExponential(digits);
  }
  return num.toFixed(digits);
}

export default function ScreeningProvenancePanel({ screening, title = 'Electron Screening Provenance' }) {
  if (!screening) return null;

  const {
    screening_potential_ev: uEv,
    screening_potential_range_ev: uRange,
    thermal_energy_ev: thermalEv,
    sommerfeld_parameter: eta,
    log10_enhancement_raw: log10Raw,
    is_saturated: isSaturated,
    assenbaum_applicable: assenbaumApplicable,
    formula_claimed: formulaClaimed,
    domain_equation_id: domainEquationId,
    exceeds_adiabatic_limit: exceedsAdiabatic,
    model,
    citations,
  } = screening;

  const isFormulaClaimed = formulaClaimed ?? assenbaumApplicable;
  const outsideAssenbaumDomain = isFormulaClaimed === false;

  return (
    <Paper variant="outlined" sx={{ p: 2 }} data-testid="screening-provenance-panel">
      <Typography variant="h6" gutterBottom>{title}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        Canonical Assenbaum–Rolfs kernel with cited material potential (RR-007).
        The claim-tier display ceiling (10⁵) may hide the true magnitude — read
        log₁₀(raw) below. Assenbaum formula claim requires Uₑ &lt; E
        ({domainEquationId || 'EQ-ASSEN-DOM-01'}).
      </Typography>
      <Divider sx={{ mb: 2 }} />
      <Stack spacing={1}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
          <Typography variant="body2">
            U<sub>e</sub>: <strong>{formatNumber(uEv, 0)} eV</strong>
          </Typography>
          {Array.isArray(uRange) && uRange.length === 2 && (
            <Chip
              size="small"
              variant="outlined"
              label={`cited range ${formatNumber(uRange[0], 0)}–${formatNumber(uRange[1], 0)} eV`}
            />
          )}
          {model && <Chip size="small" label={model} />}
          {outsideAssenbaumDomain ? (
            <Chip
              size="small"
              color="warning"
              label="Assenbaum domain: not claimed"
              data-testid="assenbaum-domain-chip"
            />
          ) : isFormulaClaimed === true ? (
            <Chip
              size="small"
              color="success"
              variant="outlined"
              label="Assenbaum domain: applicable"
              data-testid="assenbaum-domain-chip"
            />
          ) : null}
        </Box>
        <Typography variant="body2">
          Thermal energy E: <strong>{formatNumber(thermalEv, 3)} eV</strong>
          {eta != null && (
            <> · Sommerfeld η: <strong>{formatNumber(eta, 2)}</strong></>
          )}
        </Typography>
        <Typography variant="body2">
          log₁₀(enhancement raw): <strong>{formatNumber(log10Raw, 2)}</strong>
          {isSaturated && (
            <Chip label="SATURATED AT CEILING" size="small" color="warning" sx={{ ml: 1 }} />
          )}
        </Typography>
        {outsideAssenbaumDomain && (
          <Alert severity="warning" sx={{ py: 0 }} data-testid="assenbaum-domain-alert">
            Assenbaum domain ({domainEquationId || 'EQ-ASSEN-DOM-01'}): formula not claimed
            when U<sub>e</sub> ≥ E. Reported factor is capped sensitivity bookkeeping,
            not a physical Assenbaum enhancement.
          </Alert>
        )}
        {exceedsAdiabatic && (
          <Alert severity="info" sx={{ py: 0 }} data-testid="adiabatic-limit-alert">
            Metal-host U<sub>e</sub> exceeds the ~25 eV adiabatic gas-target floor
            (RR-007 anomalous screening). This is separate from Assenbaum domain
            validity (U<sub>e</sub> &lt; E).
          </Alert>
        )}
        {Array.isArray(citations) && citations.length > 0 && (
          <Tooltip title={citations.join(' · ')}>
            <Typography variant="caption" color="text.secondary" sx={{ cursor: 'help' }}>
              Citations: {citations[0]}
              {citations.length > 1 ? ` (+${citations.length - 1} more)` : ''}
            </Typography>
          </Tooltip>
        )}
      </Stack>
    </Paper>
  );
}
