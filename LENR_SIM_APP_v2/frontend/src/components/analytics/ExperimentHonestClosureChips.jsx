/**
 * Compact History-row chips for discovery_grade_gap + honest_closure envelopes.
 * Closure status is always shown as not_met; never claims lenr_proved.
 */
import React, { useState } from 'react';
import {
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import { normalizeExperimentDiscoveryEnvelopes } from './experimentDiscoveryEnvelopes';

/**
 * @param {Object} props
 * @param {object} props.experiment
 * @param {string} [props.testIdPrefix]
 */
export default function ExperimentHonestClosureChips({
  experiment,
  testIdPrefix = 'history-gap',
}) {
  const [open, setOpen] = useState(false);
  const envelopes = normalizeExperimentDiscoveryEnvelopes(experiment);
  const gapStatus = envelopes.discoveryGradeGap?.overall_status || 'not_met';
  const closureStatus = envelopes.honestClosure?.overall_status || 'not_met';
  const missing = envelopes.honestClosure?.missing_requirements || [];
  const distance = envelopes.quantitativeDistance || {};
  const distanceStatus = distance.distance_status || 'undefined';
  const shortfall =
    distance.arithmetic_sigma_shortfall == null
      ? 'n/a'
      : distance.arithmetic_sigma_shortfall;

  return (
    <>
      <Stack
        direction="row"
        spacing={0.5}
        useFlexGap
        flexWrap="wrap"
        data-testid={`${testIdPrefix}-chips`}
      >
        <Chip
          size="small"
          color="warning"
          variant="outlined"
          label={`≥5σ gap: ${gapStatus}`}
          onClick={() => setOpen(true)}
          data-testid={`${testIdPrefix}-discovery`}
          sx={{ fontFamily: 'monospace', fontSize: '0.6rem', height: 20 }}
        />
        <Chip
          size="small"
          color="warning"
          variant="outlined"
          label={`Δσ: ${distanceStatus}`}
          title={`Quantitative distance to ≥5σ (shortfall=${shortfall}). Arithmetic ≥5σ with blocked gates is not discovery.`}
          onClick={() => setOpen(true)}
          data-testid={`${testIdPrefix}-distance`}
          sx={{ fontFamily: 'monospace', fontSize: '0.55rem', height: 20 }}
        />
        <Chip
          size="small"
          color="warning"
          variant="outlined"
          label={`closure: ${closureStatus}`}
          onClick={() => setOpen(true)}
          data-testid={`${testIdPrefix}-closure`}
          sx={{ fontFamily: 'monospace', fontSize: '0.6rem', height: 20 }}
        />
        {envelopes.discoveryGradeEligible && (
          <Chip
            size="small"
            variant="outlined"
            label="analytics flag only"
            title="discovery_grade_eligible is an analytics flag; does not set lenr_proved or close EQ-OPEN"
            data-testid={`${testIdPrefix}-analytics-flag`}
            sx={{ fontSize: '0.55rem', height: 20 }}
          />
        )}
      </Stack>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        fullWidth
        maxWidth="sm"
        data-testid={`${testIdPrefix}-dialog`}
      >
        <DialogTitle>
          Honest closure / ≥5σ gap — <code>not_met</code>
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" paragraph>
            Row envelopes from Analytics export. <code>lenr_proved: false</code>. EQ-OPEN-*
            remain OPEN. Clearing cite-gated analytics gates does not discharge obligations.
          </Typography>
          <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap" sx={{ mb: 1 }}>
            <Chip
              size="small"
              color="warning"
              variant="outlined"
              label={`discovery_grade_gap: ${gapStatus}`}
            />
            <Chip
              size="small"
              color="warning"
              variant="outlined"
              label={`honest_closure: ${closureStatus}`}
            />
            <Chip
              size="small"
              color="warning"
              variant="outlined"
              label="lenr_proved: false"
            />
          </Stack>
          <Typography
            variant="body2"
            color="text.secondary"
            paragraph
            data-testid={`${testIdPrefix}-distance-detail`}
          >
            Quantitative distance: status <code>{distanceStatus}</code>
            {distance.s_heat != null ? (
              <>
                {' '}· S_heat=<code>{distance.s_heat}</code>
              </>
            ) : null}
            {distance.arithmetic_sigma_shortfall != null ? (
              <>
                {' '}· shortfall=<code>{distance.arithmetic_sigma_shortfall}</code>σ
              </>
            ) : null}
            . Arithmetic ≥5σ with blocked MoE gates is not discovery.
          </Typography>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
            Missing requirements
          </Typography>
          <List dense data-testid={`${testIdPrefix}-missing-list`}>
            {missing.map((req) => (
              <ListItem key={req.id} sx={{ py: 0.25, px: 0 }}>
                <ListItemText
                  primary={
                    <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap" alignItems="center">
                      <Typography variant="body2" component="span" sx={{ fontWeight: 600 }}>
                        {req.label || req.id}
                      </Typography>
                      <Chip
                        size="small"
                        color="warning"
                        variant="outlined"
                        label={req.status || 'not_met'}
                        sx={{ fontFamily: 'monospace', fontSize: '0.55rem', height: 18 }}
                        data-testid={`${testIdPrefix}-req-${req.id}`}
                      />
                    </Stack>
                  }
                  secondary={req.detail}
                />
              </ListItem>
            ))}
          </List>
        </DialogContent>
      </Dialog>
    </>
  );
}
