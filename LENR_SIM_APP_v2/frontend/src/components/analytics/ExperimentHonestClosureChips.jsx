/**
 * Compact History-row chips for discovery_grade_gap + honest_closure envelopes.
 * Closure status is always shown as not_met; never claims lenr_proved.
 * Analytics gate clearance displays as `analytics_gates_clear` — never "≥5σ … met".
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
import { CLAIM_TIERS } from '../../utils/theoryGovernance';
import { normalizeExperimentDiscoveryEnvelopes } from './experimentDiscoveryEnvelopes';

/** Claim-tier chip (optics only; never upgrades honesty locks). */
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

function resolveCalorimetryClaimTier(experiment, moeProvenance) {
  const results =
    experiment?.results && typeof experiment.results === 'object'
      ? experiment.results
      : {};
  const summary =
    (experiment?.bayesian_summary && typeof experiment.bayesian_summary === 'object'
      ? experiment.bayesian_summary
      : null) ||
    (results.bayesian_summary && typeof results.bayesian_summary === 'object'
      ? results.bayesian_summary
      : {});
  const explicit =
    experiment?.claim_tier || results.claim_tier || summary.claim_tier || null;
  if (explicit) return explicit;
  if (moeProvenance === 'literature_reported_instrument_precision') {
    return 'speculative_exploratory';
  }
  if (moeProvenance === 'literature_reported') {
    return 'empirical_lenr_correlation';
  }
  return null;
}

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
  const analyticsGateStatus = envelopes.analyticsGateStatus || 'not_met';
  const closureStatus = envelopes.honestClosure?.overall_status || 'not_met';
  const missing = envelopes.honestClosure?.missing_requirements || [];
  const distance = envelopes.quantitativeDistance || {};
  const distanceStatus = distance.distance_status || 'undefined';
  const shortfall =
    distance.arithmetic_sigma_shortfall == null
      ? 'n/a'
      : distance.arithmetic_sigma_shortfall;
  const moeProvenance =
    distance.moe_provenance ||
    distance.stat_sys_composition?.composition_mode ||
    experiment?.moe_provenance ||
    experiment?.results?.moe_provenance ||
    null;
  const claimTier = resolveCalorimetryClaimTier(experiment, moeProvenance);
  const showExploratoryBanner =
    distanceStatus === 'at_or_above_bar_gates_blocked' ||
    (distance.s_heat != null && !envelopes.discoveryGradeEligible);
  const empWhyNot = envelopes.empWhyNotDiscovery;

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
          label={`analytics gates: ${analyticsGateStatus}`}
          title="BDS-302 analytics gates only — not discovery closure, not lenr_proved, not EQ-OPEN discharge"
          onClick={() => setOpen(true)}
          data-testid={`${testIdPrefix}-discovery`}
          sx={{ fontFamily: 'monospace', fontSize: '0.55rem', height: 20 }}
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
        {envelopes.daqSampleProvenance ? (
          <Chip
            size="small"
            variant="outlined"
            label={`DAQ: ${envelopes.daqSampleProvenance.ingest_status || 'planned_not_attested'}`}
            title={`${envelopes.daqSampleProvenance.schema_id || 'lenr-ara-daq-sample-v1'} · trust_plane=${envelopes.daqSampleProvenance.trust_plane || 'daq'} · refuse fabricated samples · never EQ-OPEN discharge`}
            onClick={() => setOpen(true)}
            data-testid={`${testIdPrefix}-daq`}
            sx={{ fontFamily: 'monospace', fontSize: '0.55rem', height: 20 }}
          />
        ) : null}
      </Stack>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        fullWidth
        maxWidth="sm"
        data-testid={`${testIdPrefix}-dialog`}
      >
        <DialogTitle>
          Honest closure — <code>not_met</code> · analytics gates:{' '}
          <code>{analyticsGateStatus}</code>
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" paragraph>
            Row envelopes from Analytics export. <code>lenr_proved: false</code>. EQ-OPEN-*
            remain OPEN. Clearing cite-gated analytics gates does not discharge obligations
            and must never be read as “≥5σ discovery met.”
          </Typography>
          <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap" sx={{ mb: 1 }}>
            <Chip
              size="small"
              color="warning"
              variant="outlined"
              label={`analytics_gates: ${analyticsGateStatus}`}
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
            {distance.s_heat != null && moeProvenance ? (
              <>
                {' '}· S_heat=<code>{distance.s_heat}</code>{' '}
                (<code>{String(moeProvenance)}</code>)
                {claimTier ? (
                  <>
                    {' '}
                    <ClaimTierChip
                      tier={claimTier}
                      testId={`${testIdPrefix}-claim-tier`}
                    />
                  </>
                ) : null}
              </>
            ) : distance.s_heat != null ? (
              <> · S_heat withheld without moe_provenance</>
            ) : null}
            {distance.arithmetic_sigma_shortfall != null ? (
              <>
                {' '}· shortfall=<code>{distance.arithmetic_sigma_shortfall}</code>σ
              </>
            ) : null}
            . Arithmetic ≥5σ with blocked MoE gates is not discovery.
          </Typography>
          {showExploratoryBanner ? (
            <Typography
              variant="body2"
              color="warning.main"
              paragraph
              data-testid={`${testIdPrefix}-exploratory-banner`}
            >
              Exploratory / gates-blocked arithmetic only (e.g. Miles peak S_heat=26 or Celani
              S_heat=6{' '}
              <ClaimTierChip
                tier="speculative_exploratory"
                testId={`${testIdPrefix}-celani-claim-tier`}
              />{' '}
              under instrument_precision + unverified pairing). Not discovery-grade;
              does not close EQ-OPEN-YIELD-01 or set lenr_proved. Soft chips stay{' '}
              <code>analytics_gates_clear</code>, never “≥5σ met”.
            </Typography>
          ) : null}
          {envelopes.daqSampleProvenance ? (
            <Typography
              variant="body2"
              color="text.secondary"
              paragraph
              data-testid={`${testIdPrefix}-daq-detail`}
            >
              DAQ provenance: schema=
              <code>{envelopes.daqSampleProvenance.schema_id}</code> · trust_plane=
              <code>{envelopes.daqSampleProvenance.trust_plane}</code> · ingest=
              <code>{envelopes.daqSampleProvenance.ingest_status}</code>. Planned / non-attested
              sample-v1 fields never invent measurements and never discharge EQ-OPEN-* /
              <code>lenr_proved</code>.
            </Typography>
          ) : null}
          {empWhyNot ? (
            <>
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: 600, mb: 0.5 }}
                data-testid={`${testIdPrefix}-why-not-title`}
              >
                Why not discovery — <code>{empWhyNot.literature_id}</code>
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                paragraph
                data-testid={`${testIdPrefix}-why-not-honesty`}
              >
                {empWhyNot.honesty} Analytics eligibility ≠ EQ-OPEN /{' '}
                <code>lenr_proved</code>.
              </Typography>
              <List dense data-testid={`${testIdPrefix}-why-not-list`}>
                {empWhyNot.reasons.map((reason) => (
                  <ListItem key={reason} sx={{ py: 0.15, px: 0 }}>
                    <ListItemText
                      primaryTypographyProps={{ variant: 'body2' }}
                      primary={`• ${reason}`}
                    />
                  </ListItem>
                ))}
              </List>
            </>
          ) : null}
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
