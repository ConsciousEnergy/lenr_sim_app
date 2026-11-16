/**
 * Structured “why not discovery” for EMP / instrument-MoE exploratory rows (BDS-343).
 * Soft honesty optics only — never claims ≥5σ discovery, EQ-OPEN closure, or lenr_proved.
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
  EMP_EXPLORATORY_WHY_NOT_DISCOVERY,
} from '../../config/unifiedTheoryScienceEvidence';

/**
 * @param {Object} props
 * @param {string} [props.testIdPrefix]
 */
export default function EmpExploratoryWhyNotDiscovery({
  testIdPrefix = 'emp-why-not',
}) {
  const coverage = CORPUS_MOE_COVERAGE;
  const rows = EMP_EXPLORATORY_WHY_NOT_DISCOVERY;

  return (
    <Alert
      severity="info"
      variant="outlined"
      sx={{ my: 1 }}
      data-testid={`${testIdPrefix}-panel`}
    >
      <AlertTitle>
        Why EMP rows stay exploratory — corpus pairing{' '}
        <code>
          {coverage.with_moe_pairing_verified}/{coverage.n_records}
        </code>
      </AlertTitle>
      <Typography
        variant="body2"
        paragraph
        sx={{ mb: 1 }}
        data-testid={`${testIdPrefix}-coverage`}
      >
        Analytics discovery flags clear on{' '}
        <code>
          {coverage.discovery_grade_eligible_count}/{coverage.n_records}
        </code>{' '}
        rows (
        {(coverage.discovery_grade_eligible_ids || []).join(', ')}
        ). Soft chip language stays <code>analytics_gates_clear</code>, never
        “≥5σ met”. Clearing those flags does <strong>not</strong> close EQ-OPEN-*
        or set <code>lenr_proved</code>
        {coverage.analytics_eligible_ne_eq_open ? (
          <>
            {' '}
            (<code>analytics_eligible ≠ EQ-OPEN</code>)
          </>
        ) : null}
        .
      </Typography>
      <Stack
        direction="row"
        spacing={0.5}
        useFlexGap
        flexWrap="wrap"
        sx={{ mb: 1 }}
        data-testid={`${testIdPrefix}-chips`}
      >
        <Chip
          size="small"
          color="warning"
          variant="outlined"
          label={`pairing ${coverage.with_moe_pairing_verified}/${coverage.n_records}`}
          data-testid={`${testIdPrefix}-pairing-chip`}
          sx={{ fontFamily: 'monospace', fontSize: '0.65rem' }}
        />
        <Chip
          size="small"
          color="warning"
          variant="outlined"
          label={`eligible ${coverage.discovery_grade_eligible_count}/${coverage.n_records}`}
          data-testid={`${testIdPrefix}-eligible-chip`}
          sx={{ fontFamily: 'monospace', fontSize: '0.65rem' }}
        />
        <Chip
          size="small"
          color="warning"
          variant="outlined"
          label={`σ_Q ${coverage.with_sigma_q}/${coverage.n_records}`}
          data-testid={`${testIdPrefix}-sigma-chip`}
          sx={{ fontFamily: 'monospace', fontSize: '0.65rem' }}
        />
        <Chip
          size="small"
          variant="outlined"
          label="inventory exhausted (no fabricated pairs)"
          data-testid={`${testIdPrefix}-inventory-chip`}
          sx={{ fontSize: '0.65rem' }}
        />
      </Stack>
      {coverage.literature_moe_inventory_exhausted ? (
        <Typography
          variant="caption"
          color="text.secondary"
          display="block"
          sx={{ mb: 1 }}
          data-testid={`${testIdPrefix}-inventory-note`}
        >
          {coverage.inventory_exhausted_note}
        </Typography>
      ) : null}
      <List dense disablePadding data-testid={`${testIdPrefix}-list`}>
        {rows.map((row) => (
          <ListItem
            key={row.literature_id}
            sx={{ py: 0.5, px: 0 }}
            alignItems="flex-start"
            data-testid={`${testIdPrefix}-row-${row.literature_id}`}
          >
            <ListItemText
              primary={
                <Stack
                  direction="row"
                  spacing={0.5}
                  useFlexGap
                  flexWrap="wrap"
                  alignItems="center"
                >
                  <Typography variant="body2" component="span" sx={{ fontWeight: 600 }}>
                    {row.label}
                  </Typography>
                  <Chip
                    size="small"
                    variant="outlined"
                    label={row.claim_type}
                    sx={{ height: 18, fontSize: '0.6rem' }}
                  />
                  <Chip
                    size="small"
                    color="warning"
                    variant="outlined"
                    label={`Δσ: ${row.distance_status}`}
                    sx={{
                      fontFamily: 'monospace',
                      fontSize: '0.55rem',
                      height: 18,
                    }}
                    data-testid={`${testIdPrefix}-distance-${row.literature_id}`}
                  />
                  <Chip
                    size="small"
                    color="warning"
                    variant="outlined"
                    label={`eligible: ${String(row.discovery_grade_eligible)}`}
                    sx={{
                      fontFamily: 'monospace',
                      fontSize: '0.55rem',
                      height: 18,
                    }}
                  />
                </Stack>
              }
              secondary={
                <>
                  <Typography variant="caption" component="span" display="block">
                    provenance=<code>{row.moe_provenance}</code>
                    {row.s_heat_exploratory != null ? (
                      <>
                        {' '}
                        · exploratory S_heat=<code>{row.s_heat_exploratory}</code>
                      </>
                    ) : null}
                    {' · '}pairing=
                    <code>{String(row.pairing_verified)}</code>
                  </Typography>
                  <Typography
                    variant="caption"
                    component="span"
                    display="block"
                    color="text.secondary"
                    data-testid={`${testIdPrefix}-honesty-${row.literature_id}`}
                  >
                    {row.honesty}
                  </Typography>
                  <List dense disablePadding sx={{ mt: 0.25 }}>
                    {row.reasons.map((reason) => (
                      <ListItem key={reason} sx={{ py: 0, px: 0 }}>
                        <ListItemText
                          primaryTypographyProps={{
                            variant: 'caption',
                            color: 'text.secondary',
                          }}
                          primary={`• ${reason}`}
                        />
                      </ListItem>
                    ))}
                  </List>
                </>
              }
            />
          </ListItem>
        ))}
      </List>
    </Alert>
  );
}
