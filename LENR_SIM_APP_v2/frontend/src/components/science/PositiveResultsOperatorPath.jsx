/**
 * HIP-03 / LAB-05 — positive-results operator path without inventing σ_Q.
 */
import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Alert,
  AlertTitle,
  Chip,
  Link as MuiLink,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import {
  CLOSURE_SURFACE_LINKS,
  NEXT_LAB_MOE_TARGETS,
  POSITIVE_RESULTS_OPERATOR_PATH,
  REFUSED_FABRICATED_MOE_CAMPAIGNS,
} from '../../config/unifiedTheoryScienceEvidence';

/**
 * @param {Object} props
 * @param {string} [props.testIdPrefix]
 * @param {boolean} [props.embedded]
 */
export default function PositiveResultsOperatorPath({
  testIdPrefix = 'positive-results',
  embedded = false,
}) {
  const path = POSITIVE_RESULTS_OPERATOR_PATH;
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
        {path.title}
      </Typography>
      <Typography variant="body2" color="text.secondary" data-testid={`${testIdPrefix}-honesty`}>
        {path.honesty_lock}
      </Typography>

      <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap">
        <Chip
          size="small"
          color="warning"
          variant="outlined"
          label="refuse fabricated σ_Q"
          data-testid={`${testIdPrefix}-refuse-chip`}
          sx={{ fontSize: '0.65rem' }}
        />
        <Chip
          size="small"
          variant="outlined"
          label="closes_eq_open: false"
          data-testid={`${testIdPrefix}-closes-false`}
          sx={{ fontFamily: 'monospace', fontSize: '0.65rem' }}
        />
        <Chip
          size="small"
          variant="outlined"
          label="lenr_proved: false"
          data-testid={`${testIdPrefix}-lenr-proved-false`}
          sx={{ fontFamily: 'monospace', fontSize: '0.65rem' }}
        />
        <Chip
          size="small"
          variant="outlined"
          label="ask met ≠ discharge"
          data-testid={`${testIdPrefix}-ask-met-ne`}
          sx={{ fontSize: '0.65rem' }}
        />
      </Stack>

      <List dense disablePadding data-testid={`${testIdPrefix}-steps`}>
        {path.steps.map((step, index) => {
          const ask = NEXT_LAB_MOE_TARGETS.find((row) => row.id === step.next_lab_id);
          return (
            <ListItem
              key={step.id}
              alignItems="flex-start"
              sx={{
                px: 0,
                py: 1,
                borderBottom: '1px solid',
                borderColor: 'divider',
              }}
              data-testid={`${testIdPrefix}-step-${step.id}`}
            >
              <ListItemText
                primary={
                  <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap" alignItems="center">
                    <Typography variant="subtitle2" component="span">
                      {index + 1}. {step.label}
                    </Typography>
                    {ask ? (
                      <Chip
                        size="small"
                        color="warning"
                        variant="outlined"
                        label={ask.status}
                        sx={{ fontFamily: 'monospace', fontSize: '0.55rem', height: 18 }}
                      />
                    ) : null}
                  </Stack>
                }
                secondary={
                  <Stack spacing={0.35} sx={{ mt: 0.5 }}>
                    <Typography variant="body2" color="text.secondary">
                      Operator: {step.operator_action}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      display="block"
                      data-testid={`${testIdPrefix}-do-not-${step.id}`}
                    >
                      Do not: {step.do_not}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      display="block"
                      data-testid={`${testIdPrefix}-still-open-${step.id}`}
                    >
                      Still open after: {step.still_open_after}
                    </Typography>
                    {ask ? (
                      <Typography variant="caption" color="text.secondary" display="block">
                        NEXT_LAB id: <code>{ask.id}</code> → {(ask.eq_open_ids || []).join(', ')}
                      </Typography>
                    ) : null}
                  </Stack>
                }
              />
            </ListItem>
          );
        })}
      </List>

      <Alert severity="info" data-testid={`${testIdPrefix}-next-honest`}>
        <AlertTitle>Next honest step after asks met</AlertTitle>
        <Typography variant="body2">{path.next_honest_step_after_asks_met}</Typography>
      </Alert>

      <Stack spacing={0.5} data-testid={`${testIdPrefix}-refused`}>
        <Typography variant="subtitle2">Refused fabricated discovery MoE</Typography>
        {REFUSED_FABRICATED_MOE_CAMPAIGNS.map((row) => (
          <Typography
            key={row.id}
            variant="caption"
            color="text.secondary"
            display="block"
            data-testid={`${testIdPrefix}-refuse-${row.id}`}
          >
            <code>{row.id}</code> · {row.label} · <code>{row.decision}</code> — {row.missing}
          </Typography>
        ))}
      </Stack>

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
          to={CLOSURE_SURFACE_LINKS.lab_experiments_discharge}
          variant="body2"
          data-testid={`${testIdPrefix}-discharge-link`}
        >
          Discharge walkthrough
        </MuiLink>
        <MuiLink
          component={RouterLink}
          to={CLOSURE_SURFACE_LINKS.analytics_route}
          variant="body2"
          data-testid={`${testIdPrefix}-analytics-link`}
        >
          Analytics σ ladder
        </MuiLink>
      </Stack>
    </Wrapper>
  );
}
