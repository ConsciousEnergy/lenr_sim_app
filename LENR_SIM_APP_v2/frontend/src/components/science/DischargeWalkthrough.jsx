/**
 * HIP-03 / LAB-04 — Affirmative / Falsification / Does-not-count discharge walkthrough.
 * Criteria are documented decision aids; status stays OPEN until IR/Lean/ledger/governance.
 */
import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Alert,
  AlertTitle,
  Chip,
  Link as MuiLink,
  Paper,
  Stack,
  Step,
  StepContent,
  StepLabel,
  Stepper,
  Typography,
} from '@mui/material';
import {
  CLOSURE_SURFACE_LINKS,
  EQ_OPEN_RUNWAY,
  NEXT_LAB_MOE_TARGETS,
} from '../../config/unifiedTheoryScienceEvidence';

/**
 * @param {Object} props
 * @param {string} [props.testIdPrefix]
 * @param {boolean} [props.embedded]
 */
export default function DischargeWalkthrough({
  testIdPrefix = 'discharge-walkthrough',
  embedded = false,
}) {
  const Wrapper = embedded ? Stack : Paper;
  const wrapperProps = embedded
    ? { spacing: 1.5, 'data-testid': `${testIdPrefix}-panel` }
    : {
        elevation: 0,
        variant: 'outlined',
        sx: { p: 2 },
        'data-testid': `${testIdPrefix}-panel`,
      };

  return (
    <Wrapper {...wrapperProps}>
      <Typography variant="h6" sx={{ fontWeight: 600 }} data-testid={`${testIdPrefix}-title`}>
        Discharge walkthrough
      </Typography>
      <Typography variant="body2" color="text.secondary">
        For each EQ-OPEN-* obligation, use Affirmative / Falsification / Does-not-count as a
        review checklist. Meeting a NEXT_LAB ask is a receipt — not discharge. Soft analytics
        clear ≠ discovery ≠ closed.
      </Typography>

      <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap">
        <Chip
          size="small"
          color="warning"
          variant="outlined"
          label={`EQ-OPEN status: ${EQ_OPEN_RUNWAY.status}`}
          data-testid={`${testIdPrefix}-status-open`}
          sx={{ fontFamily: 'monospace', fontSize: '0.65rem' }}
        />
        <Chip
          size="small"
          variant="outlined"
          label="criteria documented · not met"
          data-testid={`${testIdPrefix}-criteria-not-met`}
          sx={{ fontFamily: 'monospace', fontSize: '0.65rem' }}
        />
        <Chip
          size="small"
          variant="outlined"
          label="ask met → still OPEN"
          data-testid={`${testIdPrefix}-ask-met-still-open`}
          sx={{ fontSize: '0.65rem' }}
        />
      </Stack>

      <Alert severity="warning" data-testid={`${testIdPrefix}-honesty-alert`}>
        <AlertTitle>Ask met ≠ EQ-OPEN discharge</AlertTitle>
        <Typography variant="body2">
          After a Lab Ask acceptance gate clears, keep every OPEN id OPEN and{' '}
          <code>lenr_proved: false</code> until IR + Lean + ledger + governance Prefer-merges with
          human academic sign-off. Simulation, avenue ranking, and Lean alone never discharge.
        </Typography>
      </Alert>

      <Stepper orientation="vertical" nonLinear data-testid={`${testIdPrefix}-steps`}>
        {EQ_OPEN_RUNWAY.criteria.map((row) => {
          const labTargets = NEXT_LAB_MOE_TARGETS.filter((target) =>
            (target.eq_open_ids || []).includes(row.id),
          );
          return (
            <Step key={row.id} active expanded data-testid={`${testIdPrefix}-step-${row.id}`}>
              <StepLabel
                optional={
                  <Chip
                    size="small"
                    color="warning"
                    variant="outlined"
                    label="OPEN"
                    sx={{ fontFamily: 'monospace', fontSize: '0.55rem', height: 18 }}
                  />
                }
              >
                <Typography variant="subtitle2" component="span">
                  {row.id} — {row.label}
                </Typography>
              </StepLabel>
              <StepContent>
                <Stack spacing={0.5}>
                  <Typography
                    variant="body2"
                    data-testid={`${testIdPrefix}-affirmative-${row.id}`}
                  >
                    <strong>Affirmative:</strong> {row.affirmative}
                  </Typography>
                  <Typography
                    variant="body2"
                    data-testid={`${testIdPrefix}-falsification-${row.id}`}
                  >
                    <strong>Falsification:</strong> {row.falsification}
                  </Typography>
                  <Typography
                    variant="body2"
                    data-testid={`${testIdPrefix}-does-not-count-${row.id}`}
                  >
                    <strong>Does not count:</strong> {row.does_not_count}
                  </Typography>
                  {labTargets.length > 0 ? (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      display="block"
                      data-testid={`${testIdPrefix}-linked-asks-${row.id}`}
                    >
                      Linked NEXT_LAB asks:{' '}
                      {labTargets.map((t) => t.id).join(', ')} (still{' '}
                      <code>blocked_awaiting_lab</code>)
                    </Typography>
                  ) : null}
                </Stack>
              </StepContent>
            </Step>
          );
        })}
      </Stepper>

      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
        <MuiLink
          component={RouterLink}
          to={CLOSURE_SURFACE_LINKS.lab_experiments_next_lab}
          variant="body2"
          data-testid={`${testIdPrefix}-next-lab-link`}
        >
          NEXT_LAB checklist
        </MuiLink>
        <MuiLink
          component={RouterLink}
          to={CLOSURE_SURFACE_LINKS.docs_eq_open_runway}
          variant="body2"
          data-testid={`${testIdPrefix}-runway-link`}
        >
          Full runway doc
        </MuiLink>
        <MuiLink
          component={RouterLink}
          to={CLOSURE_SURFACE_LINKS.lab_experiments_positive_results}
          variant="body2"
          data-testid={`${testIdPrefix}-positive-results-link`}
        >
          Positive-results path
        </MuiLink>
      </Stack>
    </Wrapper>
  );
}
