/**
 * Cite-gated ≥5σ missing-requirements checklist (BDS-302 / BDS-330).
 * Surfaces quantitative distance + corpus MoE coverage; never claims discovery.
 * Optional `corpusMoeCoverage` lets Analytics §5B pass live
 * GET /api/analytics/literature-corpus-moe-coverage counts; SPA freeze remains
 * the default for Theory Paper and offline callers.
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
import EmpExploratoryWhyNotDiscovery from './EmpExploratoryWhyNotDiscovery';
import { CLAIM_TIERS } from '../../utils/theoryGovernance';

/** Claim-tier chip beside numeric literature S_heat claims (optics only). */
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

function freezeCorpusCoverage() {
  return DISCOVERY_GRADE_BAR.corpus_moe_coverage || CORPUS_MOE_COVERAGE;
}

/**
 * @param {Object} props
 * @param {string} [props.testIdPrefix]
 * @param {boolean} [props.showEmpWhyNot] — surface EMP exploratory “why not discovery” (default true)
 * @param {Object} [props.corpusMoeCoverage] — live or merged coverage row (counts-only OK)
 * @param {string} [props.coverageSource] — `live_api` | `spa_freeze` (display only)
 */
export default function DiscoveryGradeGapChecklist({
  testIdPrefix = 'discovery-gap',
  showEmpWhyNot = true,
  corpusMoeCoverage = null,
  coverageSource = 'spa_freeze',
}) {
  const missing = DISCOVERY_GRADE_BAR.missing_requirements || [];
  const distance =
    DISCOVERY_GRADE_BAR.quantitative_distance || QUANTITATIVE_DISTANCE_DEFAULT;
  const freeze = freezeCorpusCoverage();
  // Live counts overlay freeze; keep SPA locked S_heat / refuse rows when live is counts-only.
  const coverage = corpusMoeCoverage
    ? {
        ...freeze,
        ...corpusMoeCoverage,
        locked_s_heat: freeze.locked_s_heat,
        closes_eq_open: false,
        lenr_proved: false,
      }
    : freeze;
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
        <code>{String(coverage.miles_pairing_verified ?? false)}</code>
        ){' '}
        <ClaimTierChip
          tier={coverage.miles_claim_tier || 'speculative_exploratory'}
          testId={`${testIdPrefix}-miles-claim-tier`}
        />{' '}
        remains <code>{coverage.miles_distance_status}</code>
        {coverage.miles_banner ? <> — {coverage.miles_banner}</> : null}
        {coverage.celani_exploratory_s_heat != null ? (
          <>
            {' '}Celani exploratory arithmetic S_heat=
            <code>{coverage.celani_exploratory_s_heat}</code> (
            <code>
              {coverage.celani_moe_provenance ||
                'literature_reported_instrument_precision'}
            </code>
            , pairing=
            <code>{String(coverage.celani_pairing_verified ?? false)}</code>) remains{' '}
            <code>
              {coverage.celani_distance_status || 'at_or_above_bar_gates_blocked'}
            </code>
            {' '}— Lean{' '}
            <code>celani_exploratory_not_discovery_grade</code>
            {coverage.lean_celani_exploratory_nc_bound ? ' bound' : ''}.
          </>
        ) : null}
        {' '}Kasagi NiCu analytics S_heat=
        <code>{coverage.kasagi_nicu_s_heat}</code> (
        <code>{coverage.kasagi_nicu_moe_provenance || 'literature_reported'}</code>
        ){' '}
        <ClaimTierChip
          tier={coverage.kasagi_nicu_claim_tier || 'empirical_lenr_correlation'}
          testId={`${testIdPrefix}-kasagi-claim-tier`}
        />{' '}
        is <code>{coverage.kasagi_nicu_distance_status}</code>
        {coverage.kasagi_ni_s_heat != null ? (
          <>
            {' · '}Kasagi Ni control S_heat=
            <code>{coverage.kasagi_ni_s_heat}</code> (
            <code>{coverage.kasagi_ni_moe_provenance || 'literature_reported'}</code>
            ){' '}
            <ClaimTierChip
              tier={coverage.kasagi_ni_claim_tier || 'empirical_lenr_correlation'}
              testId={`${testIdPrefix}-kasagi-ni-claim-tier`}
            />{' '}
            is{' '}
            <code>{coverage.kasagi_ni_distance_status || 'at_or_above_bar_gates_clear'}</code>
          </>
        ) : null}
        {' '}— analytics flags only; still do not close EQ-OPEN-*.
        {' '}DAQ sample ingest stays{' '}
        <code>
          {coverage.daq_sample_ingest_planned_not_attested
            ? 'planned_not_attested'
            : 'unknown'}
        </code>
        {' '}(<code>lenr-ara-daq-sample-v1</code>
        {coverage.lean_daq_planned_ne_discharge
          ? '; Lean DAQ planned ≠ EQ-OPEN discharge'
          : ''}
        ).
      </Typography>

      <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap" sx={{ mb: 0.5 }}>
        <Chip
          size="small"
          variant="outlined"
          color={coverageSource === 'live_api' ? 'success' : 'default'}
          label={`MoE coverage source: ${coverageSource}`}
          data-testid={`${testIdPrefix}-moe-coverage-source`}
          sx={{ fontFamily: 'monospace', fontSize: '0.65rem' }}
        />
      </Stack>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ mb: 1 }}
        data-testid={`${testIdPrefix}-moe-coverage`}
      >
        <strong>{coverage.title || 'Corpus MoE coverage'}</strong>:{' '}
        {coverage.with_sigma_q}/{coverage.n_records} with
        σ_Q · {coverage.with_literature_reported_cite_gated}/{coverage.n_records} cite-gated
        literature_reported · {coverage.with_moe_pairing_verified}/{coverage.n_records}{' '}
        pairing verified · {coverage.discovery_grade_eligible_count}/{coverage.n_records}{' '}
        analytics discovery_grade_eligible. closes_eq_open=
        <code>{String(Boolean(coverage.closes_eq_open))}</code>, lenr_proved=
        <code>{String(Boolean(coverage.lenr_proved))}</code>
        {coverage.literature_moe_inventory_exhausted ? (
          <>
            {' · '}publishable MoE pairs <code>exhausted</code> (refuse fabricated σ_Q)
          </>
        ) : null}
        {coverage.lean_dual_kasagi_nc_bound ? (
          <>
            {' · '}Lean dual-Kasagi NC bound
          </>
        ) : null}
        {coverage.lean_all_eq_open_nc_bound ? (
          <>
            {' · '}Lean analytics ≠ any of Q1–Q5
          </>
        ) : null}
        {coverage.lean_lab_ask_nc_bound ? (
          <>
            {' · '}Lean lab-ask ≠ EQ-OPEN discharge
          </>
        ) : null}
        {coverage.software_honest_5sigma_runway_exhausted ? (
          <>
            {' · '}software honest ≥5σ Prefer-merge runway <code>exhausted</code>
            {coverage.promote_prep_recommended ? (
              <>
                {' · '}promote+ship prep recommended
              </>
            ) : null}
          </>
        ) : null}
        . Soft chips: <code>analytics_gates_clear</code> ≠ EQ-OPEN /{' '}
        <code>lenr_proved</code>
        {coverage.soft_chip_ne_scientific_discharge ? (
          <>
            {' '}
            (≠ scientific discharge)
          </>
        ) : null}
        .
      </Typography>

      {showEmpWhyNot ? (
        <EmpExploratoryWhyNotDiscovery testIdPrefix={`${testIdPrefix}-emp-why-not`} />
      ) : null}

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
