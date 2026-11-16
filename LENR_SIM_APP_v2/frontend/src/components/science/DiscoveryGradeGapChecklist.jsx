/**
 * Cite-gated ≥5σ missing-requirements checklist (BDS-302 / BDS-330).
 * Surfaces quantitative distance + corpus MoE coverage; never claims discovery.
 */
import React from 'react';
import {
  Alert,
  AlertTitle,
  Chip,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import {
  CORPUS_MOE_COVERAGE,
  DISCOVERY_GRADE_BAR,
  QUANTITATIVE_DISTANCE_DEFAULT,
} from '../../config/unifiedTheoryScienceEvidence';

/**
 * @param {Object} props
 * @param {string} [props.testIdPrefix]
 */
export default function DiscoveryGradeGapChecklist({ testIdPrefix = 'discovery-gap' }) {
  const missing = DISCOVERY_GRADE_BAR.missing_requirements || [];
  const distance =
    DISCOVERY_GRADE_BAR.quantitative_distance || QUANTITATIVE_DISTANCE_DEFAULT;
  const coverage = DISCOVERY_GRADE_BAR.corpus_moe_coverage || CORPUS_MOE_COVERAGE;
  return (
    <Alert
      severity="warning"
      sx={{ my: 1 }}
      data-testid={`${testIdPrefix}-checklist`}
    >
      <AlertTitle>
        ≥{DISCOVERY_GRADE_BAR.sigma_threshold}σ discovery status:{' '}
        <code>{DISCOVERY_GRADE_BAR.status}</code> — what is missing
      </AlertTitle>
      <Typography variant="body2" paragraph sx={{ mb: 1 }}>
        {DISCOVERY_GRADE_BAR.gap_note}
      </Typography>
      <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap" sx={{ mb: 1 }}>
        <Chip
          size="small"
          color="warning"
          variant="outlined"
          label={`overall: ${DISCOVERY_GRADE_BAR.status}`}
          data-testid={`${testIdPrefix}-overall`}
        />
        <Chip
          size="small"
          color="warning"
          variant="outlined"
          label={`missing gates: ${missing.length}`}
          data-testid={`${testIdPrefix}-missing-count`}
        />
        <Chip
          size="small"
          color="warning"
          variant="outlined"
          label={`distance: ${distance.distance_status}`}
          data-testid={`${testIdPrefix}-distance-status`}
          sx={{ fontFamily: 'monospace', fontSize: '0.65rem' }}
        />
      </Stack>

      <Typography
        variant="body2"
        sx={{ mb: 0.5 }}
        data-testid={`${testIdPrefix}-distance-block`}
      >
        <strong>Quantitative distance to ≥{DISCOVERY_GRADE_BAR.sigma_threshold}σ</strong>
        {' '}(corpus / campaign default): S_heat{' '}
        <code>{distance.s_heat == null ? 'undefined' : distance.s_heat}</code>
        {' · '}shortfall{' '}
        <code>
          {distance.arithmetic_sigma_shortfall == null
            ? 'undefined'
            : distance.arithmetic_sigma_shortfall}
        </code>
        {' · '}status <code>{distance.distance_status}</code>.
        {' '}Miles exploratory arithmetic S_heat=
        <code>{coverage.miles_exploratory_s_heat}</code> (
        <code>{coverage.miles_moe_provenance || 'literature_reported_instrument_precision'}</code>
        , pairing=
        <code>{String(coverage.miles_pairing_verified ?? false)}</code>) remains{' '}
        <code>{coverage.miles_distance_status}</code>
        {coverage.miles_banner ? <> — {coverage.miles_banner}</> : null}
        {' '}Kasagi NiCu analytics S_heat=
        <code>{coverage.kasagi_nicu_s_heat}</code> is{' '}
        <code>{coverage.kasagi_nicu_distance_status}</code> — still does not close EQ-OPEN-*.
      </Typography>

      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ mb: 1 }}
        data-testid={`${testIdPrefix}-moe-coverage`}
      >
        <strong>{coverage.title}</strong>: {coverage.with_sigma_q}/{coverage.n_records} with
        σ_Q · {coverage.with_literature_reported_cite_gated}/{coverage.n_records} cite-gated
        literature_reported · {coverage.with_moe_pairing_verified}/{coverage.n_records}{' '}
        pairing verified · {coverage.discovery_grade_eligible_count}/{coverage.n_records}{' '}
        analytics discovery_grade_eligible. closes_eq_open=
        <code>{String(coverage.closes_eq_open)}</code>, lenr_proved=
        <code>{String(coverage.lenr_proved)}</code>.
      </Typography>

      <List dense disablePadding data-testid={`${testIdPrefix}-missing-list`}>
        {missing.map((req) => (
          <ListItem key={req.id} sx={{ py: 0.35, px: 0 }} alignItems="flex-start">
            <ListItemText
              primary={
                <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap" alignItems="center">
                  <Typography variant="body2" component="span" sx={{ fontWeight: 600 }}>
                    {req.label}
                  </Typography>
                  <Chip
                    size="small"
                    color="warning"
                    variant="outlined"
                    label={req.status}
                    data-testid={`${testIdPrefix}-req-${req.id}`}
                    sx={{ fontFamily: 'monospace', fontSize: '0.6rem', height: 18 }}
                  />
                </Stack>
              }
              secondary={req.detail}
            />
          </ListItem>
        ))}
      </List>
      <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 1 }}>
        Helpers: <code>{DISCOVERY_GRADE_BAR.gap_helper_module}</code>,{' '}
        <code>{DISCOVERY_GRADE_BAR.distance_helper_module || coverage.helper_module}</code>.
        Clearing analytics gates still does not set <code>lenr_proved</code> or close EQ-OPEN-*.
      </Typography>
    </Alert>
  );
}
