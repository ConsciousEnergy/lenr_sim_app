/**
 * HIP-03 / LAB-02 — NEXT_LAB checklist UI.
 * Surfaces five blocked_awaiting_lab asks with acceptance / gap / still-does-not-discharge / DAQ.
 * Ask met ≠ EQ-OPEN discharge (Lean LabAskProxies).
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
  Typography,
} from '@mui/material';
import {
  CLOSURE_SURFACE_LINKS,
  CORPUS_MOE_COVERAGE,
  DAQ_SAMPLE_PROVENANCE,
  NEXT_LAB_MOE_TARGETS,
} from '../../config/unifiedTheoryScienceEvidence';
import { CLAIM_TIERS } from '../../utils/theoryGovernance';

function ClaimTierChip({ tier, testId }) {
  if (!tier) return null;
  const info = CLAIM_TIERS[tier];
  return (
    <Chip
      label={info?.label || String(tier).replace(/_/g, ' ')}
      title={info?.description || tier}
      color={info?.color || 'default'}
      size="small"
      variant="outlined"
      data-testid={testId}
      data-claim-tier={tier}
      sx={{ fontSize: '0.65rem', height: 18 }}
    />
  );
}

/**
 * @param {Object} props
 * @param {string} [props.testIdPrefix]
 * @param {boolean} [props.embedded]
 */
export default function NextLabChecklist({
  testIdPrefix = 'next-lab-checklist',
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
        NEXT_LAB checklist
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Five concrete lab / MoE asks after software Prefer-merge exhaust. All stay{' '}
        <code>blocked_awaiting_lab</code> with <code>closes_eq_open: false</code>. Meeting an ask
        underwrites acceptance criteria only — Lean{' '}
        <code>lab_ask_proxies_do_not_discharge_eq_open</code> keeps every EQ-OPEN OPEN and{' '}
        <code>lenr_proved</code> false.
      </Typography>

      <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap">
        <Chip
          size="small"
          color="warning"
          variant="outlined"
          label="blocked_awaiting_lab"
          data-testid={`${testIdPrefix}-blocked-chip`}
          sx={{ fontFamily: 'monospace', fontSize: '0.65rem' }}
        />
        <Chip
          size="small"
          variant="outlined"
          label="ask met ≠ EQ-OPEN discharge"
          data-testid={`${testIdPrefix}-ask-met-ne-discharge`}
          sx={{ fontSize: '0.65rem' }}
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
          label="refuse fabricated σ_Q"
          data-testid={`${testIdPrefix}-refuse-sigma`}
          sx={{ fontSize: '0.65rem' }}
        />
      </Stack>

      <Alert severity="info" data-testid={`${testIdPrefix}-daq-banner`}>
        <AlertTitle>DAQ provenance (planned, not attested)</AlertTitle>
        <Typography variant="body2">
          Schema <code>{DAQ_SAMPLE_PROVENANCE.schema_id}</code> · trust_plane=
          <code>{DAQ_SAMPLE_PROVENANCE.trust_plane}</code> · ingest=
          <code>{DAQ_SAMPLE_PROVENANCE.ingest_status}</code>. Empty <code>daq_observables</code> on
          RATE/EC asks correctly refuse fabrication.
        </Typography>
      </Alert>

      <Stack spacing={1.25} data-testid={`${testIdPrefix}-rows`}>
        {NEXT_LAB_MOE_TARGETS.map((row, index) => (
          <Stack
            key={row.id}
            spacing={0.35}
            sx={{
              p: 1.25,
              borderRadius: 1,
              bgcolor: 'action.hover',
            }}
            data-testid={`${testIdPrefix}-row-${row.id}`}
          >
            <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap" alignItems="center">
              <Typography variant="subtitle2" component="span">
                {index + 1}. <code>{row.id}</code>
              </Typography>
              <Chip
                size="small"
                color="warning"
                variant="outlined"
                label={row.status}
                data-testid={`${testIdPrefix}-status-${row.id}`}
                sx={{ fontFamily: 'monospace', fontSize: '0.55rem', height: 18 }}
              />
              <ClaimTierChip
                tier={row.claim_tier || 'speculative_exploratory'}
                testId={`${testIdPrefix}-tier-${row.id}`}
              />
              {(row.eq_open_ids || []).map((oid) => (
                <Chip
                  key={oid}
                  size="small"
                  color="warning"
                  variant="outlined"
                  label={`${oid}: OPEN`}
                  sx={{ fontFamily: 'monospace', fontSize: '0.55rem', height: 18 }}
                  data-testid={`${testIdPrefix}-eq-${row.id}-${oid}`}
                />
              ))}
            </Stack>
            <Typography variant="body2" color="text.secondary">
              Avenue <code>{row.avenue_id}</code> — {row.target}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
              data-testid={`${testIdPrefix}-acceptance-${row.id}`}
            >
              Accept when: {row.lab_acceptance}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
              data-testid={`${testIdPrefix}-gap-${row.id}`}
            >
              Corpus gap now: {row.corpus_gap_now}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
              data-testid={`${testIdPrefix}-still-open-${row.id}`}
            >
              Still does not discharge: {row.still_does_not_discharge}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
              data-testid={`${testIdPrefix}-daq-${row.id}`}
            >
              DAQ fields:{' '}
              {Array.isArray(row.daq_observables) && row.daq_observables.length > 0 ? (
                <code>{row.daq_observables.join(', ')}</code>
              ) : (
                <code>none in sample-v1 public set — refuse fabricating DAQ numbers</code>
              )}
            </Typography>
            {row.daq_gap_note ? (
              <Typography
                variant="caption"
                color="text.secondary"
                display="block"
                data-testid={`${testIdPrefix}-daq-gap-${row.id}`}
              >
                DAQ gap: {row.daq_gap_note}
              </Typography>
            ) : null}
          </Stack>
        ))}
      </Stack>

      {CORPUS_MOE_COVERAGE.lab_ask_met_ne_eq_open_discharge ? (
        <Typography
          variant="caption"
          color="text.secondary"
          display="block"
          data-testid={`${testIdPrefix}-nc-lock`}
        >
          Lock: lab ask met ≠ EQ-OPEN discharge · closes_eq_open=
          <code>{String(CORPUS_MOE_COVERAGE.closes_eq_open)}</code> · lenr_proved=
          <code>{String(CORPUS_MOE_COVERAGE.lenr_proved)}</code>.
        </Typography>
      ) : null}

      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
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
          to={CLOSURE_SURFACE_LINKS.docs_eq_open_runway}
          variant="body2"
          data-testid={`${testIdPrefix}-runway-link`}
        >
          EQ-OPEN closure runway
        </MuiLink>
        <MuiLink
          component={RouterLink}
          to={CLOSURE_SURFACE_LINKS.virtual_lab_route}
          variant="body2"
          data-testid={`${testIdPrefix}-virtual-lab-link`}
        >
          Open Questions Virtual Lab
        </MuiLink>
        <MuiLink
          component={RouterLink}
          to={CLOSURE_SURFACE_LINKS.analytics_route}
          variant="body2"
          data-testid={`${testIdPrefix}-analytics-link`}
        >
          Analytics §5B
        </MuiLink>
      </Stack>
    </Wrapper>
  );
}
