/**
 * Structured “why not discovery” for EMP / instrument-MoE exploratory rows
 * (BDS-343 / BDS-344 / BDS-346 / BDS-348). Soft honesty optics only — never
 * claims ≥5σ discovery, EQ-OPEN closure, or lenr_proved. Lean dual-Kasagi +
 * instrument_floor NC + lab-ask proxies bind analytics / lab-ask receipt ≠
 * EQ-OPEN / lenr_proved.
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
  NEXT_LAB_MOE_TARGETS,
  REFUSED_FABRICATED_MOE_CAMPAIGNS,
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
        ).         Soft chip language stays <code>analytics_gates_clear</code>, never
        “≥5σ met”. Clearing those flags does <strong>not</strong> close EQ-OPEN-*
        or set <code>lenr_proved</code>
        {coverage.analytics_eligible_ne_eq_open ? (
          <>
            {' '}
            (<code>analytics_eligible ≠ EQ-OPEN</code>
            {coverage.lean_dual_kasagi_nc_bound ? (
              <>
                {' · '}Lean <code>dual_kasagi_analytics_does_not_close_eq_open_or_lenr</code>
              </>
            ) : null}
            {coverage.lean_all_eq_open_nc_bound ? (
              <>
                {' · '}Lean{' '}
                <code>discovery_grade_analytics_does_not_close_any_eq_open</code>
              </>
            ) : null}
            )
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
        {coverage.lean_instrument_floor_nc_bound ? (
          <Chip
            size="small"
            variant="outlined"
            label="Lean instrument_floor ⇏ discovery"
            data-testid={`${testIdPrefix}-floor-nc-chip`}
            sx={{ fontSize: '0.65rem' }}
          />
        ) : null}
        {coverage.lean_all_eq_open_nc_bound ? (
          <Chip
            size="small"
            variant="outlined"
            label="Lean analytics ≠ any of Q1–Q5"
            data-testid={`${testIdPrefix}-lean-all-eq-open`}
            sx={{ fontSize: '0.65rem' }}
          />
        ) : null}
        {coverage.lean_lab_ask_nc_bound ? (
          <Chip
            size="small"
            variant="outlined"
            label="Lean lab-ask ≠ EQ-OPEN discharge"
            data-testid={`${testIdPrefix}-lean-lab-ask`}
            sx={{ fontSize: '0.65rem' }}
          />
        ) : null}
        {coverage.soft_chip_ne_scientific_discharge ? (
          <Chip
            size="small"
            variant="outlined"
            label="soft chip ≠ scientific discharge"
            data-testid={`${testIdPrefix}-soft-chip-lock`}
            sx={{ fontSize: '0.65rem' }}
          />
        ) : null}
        {coverage.software_honest_5sigma_runway_exhausted ? (
          <Chip
            size="small"
            color="info"
            variant="outlined"
            label="software ≥5σ runway exhausted"
            data-testid={`${testIdPrefix}-runway-exhausted-chip`}
            sx={{ fontSize: '0.65rem' }}
          />
        ) : null}
        {coverage.promote_prep_recommended ? (
          <Chip
            size="small"
            color="info"
            variant="outlined"
            label="promote+ship prep recommended"
            data-testid={`${testIdPrefix}-promote-prep-chip`}
            sx={{ fontSize: '0.65rem' }}
          />
        ) : null}
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
      {Array.isArray(coverage.refused_fabricated_moe_campaigns) &&
      coverage.refused_fabricated_moe_campaigns.length > 0 ? (
        <Stack
          spacing={0.5}
          sx={{ mb: 1 }}
          data-testid={`${testIdPrefix}-refused-moe`}
        >
          <Typography variant="caption" sx={{ fontWeight: 600 }}>
            Refused fabricated MoE campaigns (σ_Q stays null)
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            display="block"
            data-testid={`${testIdPrefix}-locked-s-heat`}
          >
            Locked S_heat arithmetic: Kasagi NiCu{' '}
            <code>{coverage.locked_s_heat?.['kasagi-nicu-radiant-2026']}</code>, Kasagi
            Ni <code>{coverage.locked_s_heat?.['kasagi-ni-radiant-2026']}</code>, Miles
            exploratory <code>{coverage.locked_s_heat?.['miles-1993']}</code>, Celani
            exploratory <code>{coverage.locked_s_heat?.['celani-constantan-2019']}</code>.
            Campaign model-output σ_Q=
            <code>{coverage.campaign_model_output_sigma_Q_W}</code> is not discovery MoE.
          </Typography>
          {coverage.refused_fabricated_moe_campaigns.map((row) => (
            <Typography
              key={row.id}
              variant="caption"
              color="text.secondary"
              display="block"
              data-testid={`${testIdPrefix}-refused-${row.id}`}
            >
              <code>{row.id}</code> ({row.label}): {row.published_peak_note} —{' '}
              <code>{row.decision}</code>
            </Typography>
          ))}
        </Stack>
      ) : null}
      {coverage.software_honest_5sigma_runway_exhausted ? (
        <Typography
          variant="caption"
          color="text.secondary"
          display="block"
          sx={{ mb: 1 }}
          data-testid={`${testIdPrefix}-scientific-blockers`}
        >
          Remaining scientific blockers (no flag flips):{' '}
          {(coverage.remaining_scientific_blockers || []).join('; ')}. Concrete
          next lab/MoE targets below. Next ops step when humans ask:
          promote+ship prep — not auto <code>main</code> / Path B.
        </Typography>
      ) : null}
      {NEXT_LAB_MOE_TARGETS.length > 0 ? (
        <Stack spacing={0.75} sx={{ mb: 1 }} data-testid={`${testIdPrefix}-next-lab-targets`}>
          <Typography variant="caption" sx={{ fontWeight: 600 }}>
            Next lab / MoE targets (blocked awaiting lab; ask met ≠ EQ-OPEN discharge)
          </Typography>
          {coverage.lab_ask_met_ne_eq_open_discharge ? (
            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
              data-testid={`${testIdPrefix}-lab-ask-ne-discharge`}
            >
              Lean <code>lab_ask_proxies_do_not_discharge_eq_open</code>: even all five
              asks notionally met keep EQ-OPEN-* OPEN and <code>lenr_proved</code> false.
            </Typography>
          ) : null}
          {NEXT_LAB_MOE_TARGETS.map((row) => (
            <Stack
              key={row.id}
              spacing={0.15}
              data-testid={`${testIdPrefix}-next-lab-${row.id}`}
            >
              <Typography variant="caption" color="text.secondary" display="block">
                <code>{row.avenue_id}</code> → {row.eq_open_ids.join(', ')}:{' '}
                {row.target}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                display="block"
                data-testid={`${testIdPrefix}-lab-acceptance-${row.id}`}
              >
                Accept when: {row.lab_acceptance}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                display="block"
                data-testid={`${testIdPrefix}-corpus-gap-${row.id}`}
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
              {Array.isArray(row.daq_observables) && row.daq_observables.length > 0 ? (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  display="block"
                  data-testid={`${testIdPrefix}-daq-${row.id}`}
                >
                  DAQ fields (planned):{' '}
                  <code>{row.daq_observables.join(', ')}</code>
                </Typography>
              ) : null}
            </Stack>
          ))}
        </Stack>
      ) : null}
      {REFUSED_FABRICATED_MOE_CAMPAIGNS.length > 0 ? (
        <Stack
          spacing={0.5}
          sx={{ mb: 1 }}
          data-testid={`${testIdPrefix}-refused-campaigns`}
        >
          <Typography variant="caption" sx={{ fontWeight: 600 }}>
            Refused fabricated discovery MoE (primary-source hunt; eligible stays 2/26)
          </Typography>
          <Chip
            size="small"
            color="warning"
            variant="outlined"
            label="refuse Iwamura/Mizuno/Arata/Celani discovery σ"
            data-testid={`${testIdPrefix}-refuse-chip`}
            sx={{ fontSize: '0.65rem', alignSelf: 'flex-start' }}
          />
          {REFUSED_FABRICATED_MOE_CAMPAIGNS.map((row) => (
            <Stack
              key={row.id}
              spacing={0.1}
              data-testid={`${testIdPrefix}-refuse-${row.id}`}
            >
              <Typography variant="caption" color="text.secondary" display="block">
                <code>{row.id}</code> · {row.label} · decision=
                <code>{row.decision}</code>
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                display="block"
                data-testid={`${testIdPrefix}-refuse-missing-${row.id}`}
              >
                Missing: {row.missing}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                Cites attempted:{' '}
                <code>{(row.primary_cites || []).join('; ')}</code>
              </Typography>
            </Stack>
          ))}
        </Stack>
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
