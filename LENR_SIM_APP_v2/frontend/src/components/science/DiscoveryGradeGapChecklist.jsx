/**
 * Cite-gated ≥5σ missing-requirements checklist (BDS-302).
 * Always surfaces not_met gates; never claims discovery or lenr_proved.
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
import { DISCOVERY_GRADE_BAR } from '../../config/unifiedTheoryScienceEvidence';

/**
 * @param {Object} props
 * @param {string} [props.testIdPrefix]
 */
export default function DiscoveryGradeGapChecklist({ testIdPrefix = 'discovery-gap' }) {
  const missing = DISCOVERY_GRADE_BAR.missing_requirements || [];
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
      </Stack>
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
        Helper: <code>{DISCOVERY_GRADE_BAR.gap_helper_module}</code>. Clearing analytics gates
        still does not set <code>lenr_proved</code> or close EQ-OPEN-*.
      </Typography>
    </Alert>
  );
}
