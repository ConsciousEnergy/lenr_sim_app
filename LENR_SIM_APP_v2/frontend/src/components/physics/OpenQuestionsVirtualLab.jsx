/**
 * OpenQuestionsVirtualLab — when/how under named conditions and data.
 */
import React, { Suspense, lazy, useCallback, useState } from 'react';
import {
  Alert,
  Box,
  Chip,
  Divider,
  Paper,
  Stack,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import MechanismPathDiagram from './MechanismPathDiagram';
import OpenQuestionsCharts from './OpenQuestionsCharts';
import OpenQuestionsWorkingHypothesis from './OpenQuestionsWorkingHypothesis';
import OpenQuestionsScenarioControls from './OpenQuestionsScenarioControls';
import TscClusterSceneUnavailable from './TscClusterSceneFallback';
import { CLAIM_TIERS } from '../../utils/theoryGovernance';

// three / @react-three ship in their own chunk; only load them when a WH with
// Dicke geometry is actually present. If that chunk fails to evaluate (e.g. the
// R3F reconciler rejects the installed React runtime) fall back to the same
// numbers as text instead of tripping the page-level error boundary.
const TscClusterScene = lazy(() =>
  import('./TscClusterScene').catch(() => ({ default: TscClusterSceneUnavailable })),
);

export const LOCAL_FALLBACK_OPEN_QUESTIONS = {
  schema: 'lenr-open-questions-v1',
  route_mode: 'local_fallback',
  rate_mode: 'two_body',
  determination: {
    status: 'INCONCLUSIVE',
    oracle_a: { note: 'local_fallback: Oracle A not evaluated.' },
    oracle_b: { note: 'UNAVAILABLE on local_fallback' },
    oracle_emp: { evaluated: false },
  },
  occurrence: { anchored: false, emp_gates: [] },
  when: {},
  how: {},
  emp_chips: [],
  lenr_proved: false,
  q_mev_gap: { id: 'EQ-OPEN-MEV-01', status: 'OPEN', claim_tier: 'speculative_exploratory' },
  q_radiation: { id: 'EQ-OPEN-RAD-01', status: 'OPEN', claim_tier: 'speculative_exploratory' },
  q_statistical: { id: 'EQ-OPEN-RATE-01', status: 'OPEN', claim_tier: 'established_reference' },
  q_electron_capture: {
    id: 'EQ-OPEN-EC-01',
    status: 'OPEN',
    claim_tier: 'speculative_exploratory',
    dimmed: true,
    occurrence_claimed: false,
    unmet_reason: 'No backend electron-capture threshold calculation is available in local fallback.',
  },
  q_integrated_yield: {
    id: 'EQ-OPEN-YIELD-01',
    status: 'OPEN',
    claim_tier: 'empirical_lenr_correlation',
    dimmed: true,
    occurrence_claimed: false,
    observed_integrated_he4_yield_atoms: null,
    observed_integrated_yield_note: 'No observed integrated yield was supplied.',
  },
  composition: { not_combinable: true, illegal_product: null },
  open_ids: [
    'EQ-OPEN-MEV-01',
    'EQ-OPEN-RAD-01',
    'EQ-OPEN-RATE-01',
    'EQ-OPEN-EC-01',
    'EQ-OPEN-YIELD-01',
  ],
};

function copyText(text) {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text);
  }
}

function LeanId({ id }) {
  const onCopy = useCallback(() => copyText(id), [id]);
  return (
    <Tooltip title="Copy Lean / IR id">
      <Chip
        label={id}
        size="small"
        variant="outlined"
        onClick={onCopy}
        sx={{ fontFamily: 'monospace' }}
      />
    </Tooltip>
  );
}

function TierChip({ tier }) {
  if (!tier) return null;
  const info = CLAIM_TIERS[tier];
  return (
    <Chip
      label={info?.label || tier}
      title={info?.description}
      color={info?.color || 'default'}
      size="small"
      variant="outlined"
    />
  );
}

function QuestionRow({ title, block, dimmed = false, children }) {
  if (!block) return null;
  return (
    <Box sx={{ opacity: dimmed || block.dimmed ? 0.55 : 1, mb: 1.5 }}>
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
        <Typography variant="subtitle2">{title}</Typography>
        <Chip label={block.status || 'OPEN'} size="small" color={block.status === 'OPEN' ? 'warning' : 'default'} />
        <TierChip tier={block.claim_tier} />
        {block.id && <LeanId id={block.id} />}
        {(block.lean_theorems || []).map((id) => (
          <LeanId key={id} id={id} />
        ))}
      </Stack>
      {children}
    </Box>
  );
}

function formatScientific(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric.toExponential(2) : '—';
}

function ElectronCaptureDetails({ block }) {
  if (!block) return null;
  const threshold = Number(block.electron_capture_threshold_mev);
  const massInput = Number(block.mass_renormalization_input_mstar_over_me);
  const massThreshold = Number(block.mass_renormalization_threshold_mstar_over_me);
  const hasComputedThresholds = [threshold, massInput, massThreshold].every(Number.isFinite);

  return (
    <Box sx={{ mt: 0.75, pl: 1 }} data-testid="q4-computed-fields">
      {hasComputedThresholds && (
        <Typography variant="body2" color="text.secondary">
          Energy gate {threshold.toFixed(3)} MeV · m*/mₑ {massInput.toFixed(2)}
          {' / '}{massThreshold.toFixed(2)} required · mass gate{' '}
          {block.mass_renormalization_threshold_met ? 'met in scenario' : 'not met'}
        </Typography>
      )}
      {block.energy_deficit_mev != null && (
        <Typography variant="caption" color="text.secondary" display="block">
          Remaining energy deficit: {Number(block.energy_deficit_mev).toFixed(3)} MeV.
          {' '}Threshold status does not establish capture occurrence.
        </Typography>
      )}
      {block.unmet_reason && (
        <Typography variant="caption" color="text.secondary" display="block">
          Open because: {block.unmet_reason}
        </Typography>
      )}
    </Box>
  );
}

function IntegratedYieldDetails({ block }) {
  if (!block) return null;
  const discrepancy = block.reported_integrated_yield_discrepancy;
  const band = discrepancy?.factor_band;
  const bandLabel = Array.isArray(band) && band.length === 2
    ? `${Number(band[0]).toExponential(0).replace('e+', 'e')}–${Number(band[1]).toExponential(0).replace('e+', 'e')}×`
    : null;

  return (
    <Box sx={{ mt: 0.75, pl: 1 }} data-testid="q5-computed-fields">
      {block.expected_he4_rate_per_s != null ? (
        <Typography variant="body2" color="text.secondary">
          Expected He-4 from supplied excess power: {formatScientific(block.expected_he4_rate_per_s)} atoms/s active
          {' · '}{formatScientific(block.duty_adjusted_expected_he4_rate_per_s)} atoms/s duty-adjusted
          {' · '}{formatScientific(block.expected_integrated_he4_yield_atoms)} atoms over the supplied window
        </Typography>
      ) : (
        <Typography variant="body2" color="text.secondary">
          Expected He-4 rate unavailable until excess power is supplied.
        </Typography>
      )}
      {bandLabel && (
        <Typography variant="caption" color="text.secondary" display="block">
          Reported / known integrated-yield shortfall: {bandLabel} lower than the Miles expectation.
        </Typography>
      )}
      {block.retention_time_resolved_caveat && (
        <Typography variant="caption" color="text.secondary" display="block">
          {block.retention_time_resolved_caveat}
        </Typography>
      )}
      {block.observed_integrated_he4_yield_atoms == null && block.observed_integrated_yield_note && (
        <Typography variant="caption" color="text.secondary" display="block">
          {block.observed_integrated_yield_note}
        </Typography>
      )}
    </Box>
  );
}

function OracleBPanel({ oracleB, mechanismPaths, viewMode }) {
  if (!oracleB?.hypotheses?.length) return null;

  if (viewMode === 'diagram') {
    const paths = mechanismPaths?.length
      ? mechanismPaths
      : oracleB.hypotheses.map((row) => ({ id: row.id, posterior: row.posterior }));
    return (
      <Box sx={{ mb: 2 }} data-testid="oracle-b-diagrams">
        <Typography variant="subtitle2" gutterBottom>Oracle B — mechanism path diagrams</Typography>
        <Stack spacing={2}>
          {paths.map((row) => (
            <MechanismPathDiagram
              key={row.id}
              pathId={row.id}
              diagramSpec={row.diagram_spec}
              posterior={row.posterior ?? 0}
            />
          ))}
        </Stack>
      </Box>
    );
  }

  return (
    <Box sx={{ mb: 2 }} data-testid="oracle-b-panel">
      <Typography variant="subtitle2" gutterBottom>Oracle B — mechanism paths</Typography>
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
        Priors: {oracleB.priors_source || 'default_skeptical'}
        {oracleB.occurrence_anchored ? ' · occurrence anchored' : ''}
      </Typography>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Hypothesis</TableCell>
            <TableCell align="right">Posterior</TableCell>
            <TableCell align="right">log10 BF vs two_body</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {oracleB.hypotheses.map((row) => (
            <TableRow key={row.id}>
              <TableCell>{row.id}</TableCell>
              <TableCell align="right">{(row.posterior * 100).toFixed(1)}%</TableCell>
              <TableCell align="right">
                {Number(row.log10_bayes_vs_two_body).toFixed(2)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}

function WhenHowRow({ occurrence, when, how }) {
  return (
    <Box sx={{ mb: 2 }} data-testid="when-how-row">
      {occurrence?.anchored && (
        <Chip
          label="Occurrence anchored (Miles EMP)"
          color="success"
          size="small"
          sx={{ mr: 1, mb: 1 }}
          data-testid="occurrence-anchored-chip"
        />
      )}
      {when?.threshold_crossed != null && (
        <Chip
          label={when.threshold_crossed ? 'Threshold crossed' : 'Threshold not crossed'}
          color={when.threshold_crossed ? 'success' : 'warning'}
          size="small"
          sx={{ mr: 1, mb: 1 }}
        />
      )}
      {when?.stimulation_active && (
        <Chip label="Stimulation active" size="small" sx={{ mr: 1, mb: 1 }} />
      )}
      {when?.loading_ratio != null && (
        <Chip label={`loading ${when.loading_ratio}`} size="small" sx={{ mr: 1, mb: 1 }} />
      )}
      {how?.best_mechanism_path && (
        <Chip
          label={`path: ${how.best_mechanism_path}`}
          size="small"
          variant="outlined"
          sx={{ mr: 1, mb: 1 }}
        />
      )}
      {how?.fgr_parameters && (
        <Typography variant="caption" color="text.secondary" display="block">
          FGR: P_occ={String(how.fgr_parameters.P_occ ?? '—')}
          {' · '}Γ_tun={String(how.fgr_parameters.Gamma_tun ?? '—')}
          {' · '}log10 N={String(how.fgr_parameters.log10_n_events ?? when?.active_mode_log10_n ?? '—')}
        </Typography>
      )}
    </Box>
  );
}

function NextMeasurementPanel({ items }) {
  if (!items?.length) return null;
  return (
    <Box sx={{ mb: 2 }} data-testid="next-measurement-ivg">
      <Typography variant="subtitle2" gutterBottom>Next measurement (IVG)</Typography>
      {items.map((row) => (
        <Typography key={row.observable} variant="body2">
          #{row.rank} {row.observable}: {row.rationale}
        </Typography>
      ))}
    </Box>
  );
}

export default function OpenQuestionsVirtualLab({ simulationData, openQuestions }) {
  const [oracleView, setOracleView] = useState('table');
  const routeMode = simulationData?.validation?.route_mode;
  const raw = openQuestions || simulationData?.open_questions;
  const isFallback = routeMode === 'local_fallback' || raw?.route_mode === 'local_fallback';
  const oq = raw && Object.keys(raw).length
    ? raw
    : (isFallback ? LOCAL_FALLBACK_OPEN_QUESTIONS : null);
  if (!oq) return null;

  const status = oq.determination?.status || (isFallback ? 'INCONCLUSIVE' : 'OPEN');
  const empChips = isFallback ? [] : (oq.emp_chips || []);
  const illegal = oq.composition?.illegal_product;
  const tscLeak = oq.composition?.tsc_enhancement_can_scale_two_body;
  const wh = oq.working_hypothesis;

  return (
    <Paper sx={{ p: 2 }} variant="outlined" data-testid="open-questions-virtual-lab">
      <Typography variant="h6" gutterBottom>Open questions virtual lab</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        When and how under named conditions and data. Not a nature theorem. Not LENR_PROVED.
      </Typography>

      <Alert
        severity={status === 'RATE_BUDGET_DOES_NOT_CLOSE' ? 'warning' : 'info'}
        sx={{ mb: 2 }}
      >
        <Typography variant="subtitle2">
          Oracle A / B status: {String(status).split('_').join(' ')}
        </Typography>
        {status === 'RATE_BUDGET_DOES_NOT_CLOSE' && (
          <Typography variant="body2">
            Two-body rate budget does not close under f ≤ 10^5
            (log10 N_events = −40). Occurrence EMP is separate from this reference.
          </Typography>
        )}
        {status === 'OCCURRENCE_ANCHORED_EMP' && (
          <Typography variant="body2">
            Miles-band heat–He anchors occurrence; mechanism path remains open.
          </Typography>
        )}
        {isFallback && (
          <Typography variant="body2">
            local_fallback: INCONCLUSIVE / UNAVAILABLE. No EMP chips.
          </Typography>
        )}
      </Alert>

      <WhenHowRow occurrence={oq.occurrence} when={oq.when} how={oq.how} />

      <OpenQuestionsWorkingHypothesis workingHypothesis={oq.working_hypothesis} />
      {wh?.dicke && (
        <Suspense
          fallback={(
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
              Loading TSC cluster scene…
            </Typography>
          )}
        >
          <TscClusterScene
            dicke={wh.dicke}
            alphaStopping={wh.q1?.alpha_stopping}
            channels={wh.channels}
          />
        </Suspense>
      )}
      {wh?.id && (
        <OpenQuestionsScenarioControls q1={wh.q1} q2={wh.q2} q3={wh.q3} dicke={wh.dicke} />
      )}

      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
        {(oq.determination?.oracle_a?.lean_theorems || ['EQ-RATE-2B-NC-01']).map((id) => (
          <LeanId key={id} id={id} />
        ))}
        <TierChip tier="established_reference" />
      </Stack>

      <Box sx={{ mb: 2 }}>
        <Tabs value={oracleView} onChange={(_, value) => setOracleView(value)} sx={{ mb: 1 }}>
          <Tab label="Table" value="table" data-testid="oracle-b-tab-table" />
          <Tab label="Diagram" value="diagram" data-testid="oracle-b-tab-diagram" />
        </Tabs>
        <OracleBPanel
          oracleB={oq.determination?.oracle_b}
          mechanismPaths={oq.how?.mechanism_paths}
          viewMode={oracleView}
        />
      </Box>

      <NextMeasurementPanel items={oq.determination?.next_measurement} />

      <Divider sx={{ mb: 2 }} />
      <QuestionRow title="Q1 MeV energy gap" block={oq.q_mev_gap} />
      <QuestionRow title="Q2 Radiation suppression" block={oq.q_radiation} />
      <QuestionRow title="Q3 Statistical feasibility" block={oq.q_statistical} />
      <QuestionRow title="Q4 Electron capture" block={oq.q_electron_capture} dimmed>
        <ElectronCaptureDetails block={oq.q_electron_capture} />
      </QuestionRow>
      <QuestionRow title="Q5 Integrated yield" block={oq.q_integrated_yield} dimmed>
        <IntegratedYieldDetails block={oq.q_integrated_yield} />
      </QuestionRow>

      <Typography variant="subtitle2" sx={{ mt: 2 }}>Composition (three engines, never multiplied)</Typography>
      <Typography variant="body2" color="text.secondary">
        route_mode: {oq.route_mode || routeMode || 'unknown'} · not combinable
      </Typography>
      {illegal != null && (
        <Typography
          variant="body2"
          sx={{ textDecoration: 'line-through' }}
          color="error"
        >
          illegal product {Number(illegal).toExponential(0)} (not physical)
        </Typography>
      )}
      {tscLeak && (
        <Alert severity="warning" sx={{ mt: 1 }}>
          Takahashi TSC enhancement can scale two-body f_enh as a coherence-group
          rival. It is not trapped_state and must not multiply that rate.
        </Alert>
      )}

      {empChips.map((chip) => (
        <Chip
          key={chip.id}
          label={chip.label}
          size="small"
          sx={{ mr: 1, mt: 1 }}
          variant="outlined"
        />
      ))}

      <OpenQuestionsCharts openQuestions={oq} />
    </Paper>
  );
}
