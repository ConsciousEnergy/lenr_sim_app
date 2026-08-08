/**
 * TheoryTogglePanel.tsx
 *
 * Side-panel component for the LENR Theory Testbed.
 * Provides:
 *  - Checkbox toggles for each registered theory
 *  - Per-theory parameter sliders
 *  - Colour-coded contribution bars (enhancement + energy)
 *  - "Theory confidence" indicator per module
 *
 * Consumes PhysicsContext for theory state and API calls.
 */

import React, { useEffect, useMemo, useCallback, useState } from 'react';
import {
  Box,
  Typography,
  Switch,
  FormControlLabel,
  Chip,
  Paper,
  Divider,
  Tooltip,
  LinearProgress,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button,
  Alert,
  TextField,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import TuneIcon from '@mui/icons-material/Tune';
import ScienceIcon from '@mui/icons-material/Science';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import BoltIcon from '@mui/icons-material/Bolt';
import LinkIcon from '@mui/icons-material/Link';
import ExploreIcon from '@mui/icons-material/Explore';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import AssessmentIcon from '@mui/icons-material/Assessment';
import { Link as RouterLink } from 'react-router-dom';
import { usePhysics, TheoryContributionResult } from '../../contexts/PhysicsContext';
import { track } from '../../analytics/events';
import {
  claimTierMultiplier,
  buildRegimeGateReason,
  CLAIM_TIERS,
  EVIDENCE_CLASSES,
} from '../../utils/theoryGovernance';
import GovernanceGlossaryDrawer from './GovernanceGlossaryDrawer';

// Colour map for theory categories
const CATEGORY_COLORS: Record<string, string> = {
  primary: '#4caf50',
  secondary: '#9c27b0',
  base: '#ff9800',
  general: '#2196f3',
};

/** Map a confidence value (0-1) to a label + colour. */
function confidenceLabel(c: number): { label: string; color: 'success' | 'warning' | 'error' | 'info' } {
  if (c >= 0.7) return { label: 'High', color: 'success' };
  if (c >= 0.4) return { label: 'Medium', color: 'warning' };
  if (c > 0) return { label: 'Low', color: 'error' };
  return { label: 'N/A', color: 'info' };
}

// ── MHD Dimensionless Parameter Dashboard ─────────────────────────────────
// Shown only for the Bubble-MHD theory when results are available.

/** Classify a dimensionless number into a colour-coded regime chip. */
function mhdRegimeChip(
  label: string,
  value: number | undefined,
  thresholds: { low: number; high: number },
  lowLabel: string,
  highLabel: string,
) {
  if (value === undefined || value === null) return null;
  let color: 'default' | 'info' | 'warning' | 'success' | 'error' = 'default';
  let regime = '';
  if (value < thresholds.low) {
    color = 'info';
    regime = lowLabel;
  } else if (value > thresholds.high) {
    color = 'success';
    regime = highLabel;
  } else {
    color = 'warning';
    regime = 'transitional';
  }
  return (
    <Tooltip title={`${label} = ${value.toExponential(2)} — ${regime}`} arrow>
      <Chip
        label={`${label}: ${value < 0.01 || value > 1e3 ? value.toExponential(1) : value.toFixed(2)}`}
        size="small"
        color={color}
        variant="outlined"
        sx={{ fontSize: '0.6rem', height: 20, mr: 0.5, mb: 0.5 }}
      />
    </Tooltip>
  );
}

/** MHD dashboard rendered inside the Bubble-MHD accordion. */
const MHDParameterDashboard: React.FC<{ observables: Record<string, number> }> = ({
  observables,
}) => {
  const params = [
    { key: 'magnetic_reynolds_number', label: 'Rm', low: 0.1, high: 10, lowL: 'diffusive', highL: 'frozen-in flux' },
    { key: 'hartmann_number', label: 'Ha', low: 1, high: 100, lowL: 'viscous', highL: 'slug flow' },
    { key: 'lundquist_number', label: 'S', low: 1, high: 1e4, lowL: 'resistive', highL: 'Petschek reconnection' },
    { key: 'plasma_beta', label: 'β', low: 0.1, high: 10, lowL: 'magnetically dominated', highL: 'kinetically dominated' },
    { key: 'hall_parameter', label: 'β_H', low: 0.1, high: 1, lowL: 'resistive MHD', highL: 'Hall-MHD' },
    { key: 'stuart_number', label: 'N', low: 0.1, high: 10, lowL: 'inertia-dominated', highL: 'EM-dominated' },
    { key: 'magnetic_prandtl_number', label: 'Pm', low: 1e-3, high: 1, lowL: 'Pm≪1 (liquid metal)', highL: 'Pm≥1 (hot plasma)' },
  ];

  const highlights = [
    { key: 'alfven_velocity_m_s', label: 'Alfvén vel', unit: 'm/s' },
    { key: 'B_compressed_T', label: 'B compressed', unit: 'T' },
    { key: 'faraday_emf_V', label: 'Faraday EMF', unit: 'V' },
    { key: 'screening_energy_eV', label: 'Screening', unit: 'eV' },
    { key: 'flux_compression_ratio', label: 'Flux compr.', unit: '×' },
    { key: 'nuclear_power_W_m3', label: 'Nuclear power', unit: 'W/m³' },
    { key: 'neutron_rate_m3_s', label: 'Neutron rate', unit: '/m³s' },
    { key: 'v_collapse_m_s', label: 'Collapse vel', unit: 'm/s' },
  ];

  return (
    <Paper sx={{ p: 1, mt: 1, bgcolor: 'rgba(20,30,55,0.7)', border: '1px solid', borderColor: 'info.dark', borderRadius: 1 }}>
      <Typography variant="caption" color="info.main" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
        <BoltIcon sx={{ fontSize: 14 }} /> MHD Dimensionless Parameters
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', mb: 0.5 }}>
        {params.map((p) => {
          const chip = mhdRegimeChip(
            p.label,
            observables[p.key],
            { low: p.low, high: p.high },
            p.lowL,
            p.highL,
          );
          return chip ? <React.Fragment key={p.key}>{chip}</React.Fragment> : null;
        })}
      </Box>
      <Divider sx={{ my: 0.5, borderColor: 'rgba(255,255,255,0.1)' }} />
      <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
        Key Observables
      </Typography>
      <Grid container spacing={0.5}>
        {highlights.map((h) => {
          const val = observables[h.key];
          if (val === undefined || val === null) return null;
          return (
            <Grid size={6} key={h.key}>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>
                {h.label}
              </Typography>
              <Typography variant="caption" sx={{ display: 'block', fontWeight: 'bold', fontSize: '0.65rem' }}>
                {val < 0.01 || val > 1e4 ? val.toExponential(2) : val.toFixed(3)} {h.unit}
              </Typography>
            </Grid>
          );
        })}
      </Grid>
    </Paper>
  );
};

interface TheoryTogglePanelProps {
  /** Physical conditions to pass when running theories. */
  conditions?: Record<string, number | string>;
}

const TheoryTogglePanel: React.FC<TheoryTogglePanelProps> = ({ conditions }) => {
  const {
    availableTheories,
    enabledTheories,
    theoryConfigs,
    theoryResult,
    isLoadingTheories,
    setEnabledTheories,
    setTheoryConfigs,
    fetchTheories,
    runTheories,
    runCoupledTheories,
    coupledResult,
  } = usePhysics();

  const [coupledMode, setCoupledMode] = useState(false);
  const [glossaryOpen, setGlossaryOpen] = useState(false);
  const [glossaryAnchor, setGlossaryAnchor] = useState<'evidence' | 'claim' | null>(null);

  const openGlossary = useCallback((anchor: 'evidence' | 'claim' | null) => {
    setGlossaryAnchor(anchor);
    setGlossaryOpen(true);
  }, []);

  // Fetch theories on mount
  useEffect(() => {
    if (availableTheories.length === 0) {
      fetchTheories();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Partition theories into primary LENR tracks and "context tracks".
  // Context tracks are cross-regime / comparison-only entries (see
  // backend theory_pipeline.THEORY_COMPOSITION_GROUPS). They are always
  // visible but visually separated so they cannot be mistaken for
  // first-class LENR mechanisms.
  const { primaryTheories, contextTheories } = useMemo(() => {
    const primary: typeof availableTheories = [];
    const context: typeof availableTheories = [];
    for (const theory of availableTheories) {
      if (theory.category === 'context_line') {
        context.push(theory);
      } else {
        primary.push(theory);
      }
    }
    return { primaryTheories: primary, contextTheories: context };
  }, [availableTheories]);

  // Build a lookup from theory_id -> contribution result
  const contributionMap = useMemo(() => {
    const map: Record<string, TheoryContributionResult> = {};
    if (theoryResult?.per_theory) {
      theoryResult.per_theory.forEach((c) => {
        map[c.theory_id] = c;
      });
    }
    return map;
  }, [theoryResult]);

  // Toggle a single theory on/off
  const handleToggle = useCallback(
    (theoryId: string) => {
      const enabled = !enabledTheories.includes(theoryId);
      track.theoryToggled({ theory_id: theoryId, enabled });
      setEnabledTheories(
        enabled
          ? [...enabledTheories, theoryId]
          : enabledTheories.filter((id) => id !== theoryId),
      );
    },
    [enabledTheories, setEnabledTheories],
  );

  /**
   * Override one configurable parameter for one theory. An empty string clears
   * the override so the module's own default applies again; sending an empty
   * override object would otherwise pin the parameter to NaN.
   */
  const handleConfigChange = useCallback(
    (theoryId: string, paramName: string, rawValue: string, isNumeric: boolean) => {
      const next = { ...theoryConfigs };
      const forTheory = { ...(next[theoryId] || {}) };

      if (rawValue === '') {
        delete forTheory[paramName];
      } else if (isNumeric) {
        const parsed = Number(rawValue);
        if (Number.isNaN(parsed)) return;
        forTheory[paramName] = parsed;
      } else {
        forTheory[paramName] = rawValue;
      }

      if (Object.keys(forTheory).length === 0) {
        delete next[theoryId];
      } else {
        next[theoryId] = forTheory;
      }
      setTheoryConfigs(next);
    },
    [theoryConfigs, setTheoryConfigs],
  );

  /** Drop all overrides for one theory. */
  const handleConfigReset = useCallback(
    (theoryId: string) => {
      if (!theoryConfigs[theoryId]) return;
      const next = { ...theoryConfigs };
      delete next[theoryId];
      setTheoryConfigs(next);
    },
    [theoryConfigs, setTheoryConfigs],
  );

  // Run theories with current conditions (coupled or independent)
  const handleRun = useCallback(() => {
    if (conditions) {
      if (coupledMode) {
        runCoupledTheories(conditions);
      } else {
        runTheories(conditions);
      }
    }
  }, [conditions, runTheories, runCoupledTheories, coupledMode]);

  if (isLoadingTheories) {
    return (
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <CircularProgress size={20} />
        <Typography variant="body2">Loading theories...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <ScienceIcon fontSize="small" color="primary" />
        Theory Modules
        <Chip
          label={`${availableTheories.length} theories`}
          size="small"
          color="primary"
          variant="outlined"
          sx={{ fontSize: '0.7rem', height: 22 }}
        />
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
        Toggle theories on/off and adjust parameters. Run to see per-theory contributions.
        {availableTheories.length > 0 && (
          <> All {availableTheories.length} registered backend theory modules are listed below.</>
        )}
      </Typography>

      {/* Combined results summary */}
      {theoryResult && (
        <Paper sx={{ p: 1.5, mb: 2, bgcolor: 'rgba(25,35,60,0.6)', border: '1px solid', borderColor: 'primary.dark' }}>
          <Typography variant="caption" color="text.secondary">
            Combined Enhancement
          </Typography>
          <Typography variant="h6" color="primary">
            {theoryResult.combined_enhancement.toExponential(2)}x
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Energy: {theoryResult.total_energy_watts.toExponential(2)} W
          </Typography>
          {theoryResult.contract_version && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              Contract: {theoryResult.contract_version}
            </Typography>
          )}
        </Paper>
      )}

      {/* Coupled Mode toggle */}
      <Paper sx={{ p: 1, mb: 1.5, bgcolor: coupledMode ? 'rgba(46,125,50,0.15)' : 'rgba(255,255,255,0.03)', border: '1px solid', borderColor: coupledMode ? 'success.dark' : 'divider', borderRadius: 1 }}>
        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={coupledMode}
              onChange={(e) => setCoupledMode(e.target.checked)}
              color="success"
            />
          }
          label={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <LinkIcon sx={{ fontSize: 16 }} />
              <Typography variant="body2">Coupled Mode</Typography>
            </Box>
          }
        />
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', ml: 4.5, mt: -0.5 }}>
          {coupledMode
            ? 'Theories run in dependency order — outputs feed downstream inputs'
            : 'Theories run independently (no cross-coupling)'}
        </Typography>
      </Paper>

      {/* Coupling execution order indicator */}
      {coupledMode && coupledResult && (
        <Alert severity="info" sx={{ mb: 1, py: 0, '& .MuiAlert-message': { py: 0.5 } }}>
          <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
            Execution order:
          </Typography>
          <Typography variant="caption" sx={{ display: 'block', fontSize: '0.65rem' }}>
            {coupledResult.execution_order.join(' → ')}
          </Typography>
        </Alert>
      )}

      {/* Run button */}
      <Button
        variant="contained"
        size="small"
        fullWidth
        startIcon={coupledMode ? <LinkIcon /> : <PlayArrowIcon />}
        onClick={handleRun}
        disabled={!conditions || enabledTheories.length === 0}
        color={coupledMode ? 'success' : 'primary'}
        sx={{ mb: theoryResult?.per_theory?.length ? 1 : 2 }}
      >
        {coupledMode ? 'Run Coupled Pipeline' : 'Run Selected Theories'}
      </Button>

      {/* Closes the loop: without a route back, users returned to Advanced Analysis
          by hand and often re-ran the simulation instead, which never fills the
          Theory Summary tab. */}
      {!!theoryResult?.per_theory?.length && (
        <Button
          component={RouterLink}
          to="/advanced-analysis"
          variant="outlined"
          size="small"
          fullWidth
          startIcon={<AssessmentIcon />}
          sx={{ mb: 2 }}
        >
          View in Advanced Analysis
        </Button>
      )}

      <Divider sx={{ mb: 1 }} />

      {/* Section header: Primary LENR theories */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
        <ScienceIcon sx={{ fontSize: 16, color: 'primary.main' }} />
        <Typography variant="subtitle2" color="primary">
          Primary LENR theories
        </Typography>
        <Chip
          label={`${primaryTheories.length}`}
          size="small"
          variant="outlined"
          sx={{ height: 18, fontSize: '0.65rem' }}
        />
        <Box sx={{ flex: 1 }} />
        <Tooltip title="Open governance glossary — claim tiers & evidence classes">
          <Button
            size="small"
            startIcon={<MenuBookIcon sx={{ fontSize: 14 }} />}
            onClick={() => openGlossary(null)}
            sx={{ fontSize: '0.65rem', py: 0, minWidth: 0 }}
          >
            glossary
          </Button>
        </Tooltip>
      </Box>

      {primaryTheories.map((theory) =>
        renderTheoryAccordion({
          theory,
          isEnabled: enabledTheories.includes(theory.theory_id),
          contribution: contributionMap[theory.theory_id],
          handleToggle,
          coupledMode,
          coupledResult,
          onOpenGlossary: openGlossary,
          configOverrides: theoryConfigs[theory.theory_id],
          onConfigChange: handleConfigChange,
          onConfigReset: handleConfigReset,
        }),
      )}

      {/* Context tracks section (down-weighted comparison theories) */}
      {contextTheories.length > 0 && (
        <>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 2, mb: 1 }}>
            <ExploreIcon sx={{ fontSize: 16, color: 'warning.main' }} />
            <Typography variant="subtitle2" color="warning.main">
              Context tracks
            </Typography>
            <Chip
              label={`${contextTheories.length}`}
              size="small"
              variant="outlined"
              color="warning"
              sx={{ height: 18, fontSize: '0.65rem' }}
            />
            <Tooltip
              title={
                'Comparison-only tracks (e.g. stellar-scaling MHD) are always visible but strongly down-weighted in the final score so they cannot dominate LENR-specific mechanisms. See the governance glossary for multipliers.'
              }
            >
              <InfoOutlinedIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
            </Tooltip>
          </Box>
          <Alert
            severity="warning"
            icon={<ExploreIcon fontSize="inherit" />}
            sx={{
              mb: 1,
              py: 0,
              '& .MuiAlert-message': { py: 0.5, fontSize: '0.7rem' },
            }}
          >
            These tracks are quantitative comparisons from other physical
            regimes (e.g. stellar plasma). Visible for transparency only.
          </Alert>
          {contextTheories.map((theory) =>
            renderTheoryAccordion({
              theory,
              isEnabled: enabledTheories.includes(theory.theory_id),
              contribution: contributionMap[theory.theory_id],
              handleToggle,
              coupledMode,
              coupledResult,
              isContextTrack: true,
              onOpenGlossary: openGlossary,
              configOverrides: theoryConfigs[theory.theory_id],
              onConfigChange: handleConfigChange,
              onConfigReset: handleConfigReset,
            }),
          )}
        </>
      )}

      {availableTheories.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>
          No theories available. Is the backend running?
        </Typography>
      )}

      <GovernanceGlossaryDrawer
        open={glossaryOpen}
        onClose={() => setGlossaryOpen(false)}
        initialAnchor={glossaryAnchor}
      />
    </Box>
  );
};

// ---------------------------------------------------------------------------
// Per-theory accordion renderer (extracted so it can be reused by both the
// primary-theories section and the context-tracks section).
// ---------------------------------------------------------------------------

interface RenderTheoryAccordionArgs {
  theory: {
    theory_id: string;
    theory_name: string;
    description: string;
    category: string;
    references: string[];
    configurable_parameters?: Record<string, any>;
  };
  isEnabled: boolean;
  contribution: TheoryContributionResult | undefined;
  handleToggle: (_id: string) => void;
  coupledMode: boolean;
  coupledResult: { coupling_map?: Record<string, Array<{ source_id: string }>> } | null | undefined;
  isContextTrack?: boolean;
  onOpenGlossary: (_anchor: 'evidence' | 'claim' | null) => void;
  configOverrides?: Record<string, any>;
  onConfigChange: (
    _theoryId: string,
    _paramName: string,
    _rawValue: string,
    _isNumeric: boolean,
  ) => void;
  onConfigReset: (_theoryId: string) => void;
}

function renderTheoryAccordion(args: RenderTheoryAccordionArgs): React.ReactElement {
  const {
    theory,
    isEnabled,
    contribution,
    handleToggle,
    coupledMode,
    coupledResult,
    isContextTrack = false,
    onOpenGlossary,
    configOverrides,
    onConfigChange,
    onConfigReset,
  } = args;

  const conf = contribution ? confidenceLabel(contribution.confidence) : null;
  const tier = contribution?.claim_tier;
  const tierInfo = tier ? CLAIM_TIERS[tier] : undefined;
  const evidenceInfo = contribution?.evidence_class
    ? EVIDENCE_CLASSES[contribution.evidence_class]
    : undefined;
  const tierMult = claimTierMultiplier(tier);
  const rawEnhancement = contribution?.enhancement_factor ?? 0;
  const effectiveEnhancement = rawEnhancement * tierMult;
  const regimeGateReason =
    contribution && contribution.is_applicable === false
      ? buildRegimeGateReason(
          contribution.provenance as Record<string, unknown> | undefined,
          contribution.parameters_used,
        )
      : null;

  return (
    <Accordion
      key={theory.theory_id}
      disableGutters
      elevation={0}
      sx={{
        '&:before': { display: 'none' },
        bgcolor: isContextTrack ? 'rgba(255,152,0,0.04)' : 'transparent',
        border: isContextTrack ? '1px dashed' : '1px solid',
        borderColor: isContextTrack
          ? 'warning.dark'
          : isEnabled
            ? 'primary.dark'
            : 'divider',
        mb: 1,
        borderRadius: 1,
        overflow: 'hidden',
      }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: 48 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 1 }}>
          <Switch
            size="small"
            checked={isEnabled}
            onChange={() => handleToggle(theory.theory_id)}
            onClick={(e) => e.stopPropagation()}
          />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body2" noWrap>
              {theory.theory_name}
            </Typography>
          </Box>
          <Chip
            label={theory.category}
            size="small"
            sx={{
              fontSize: '0.6rem',
              height: 18,
              bgcolor: CATEGORY_COLORS[theory.category] || '#666',
              color: 'white',
            }}
          />
        </Box>
      </AccordionSummary>
      <AccordionDetails sx={{ pt: 0, pb: 1 }}>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
          {theory.description}
        </Typography>

        {/* Inline regime-gate reason when inapplicable */}
        {regimeGateReason && (
          <Alert
            severity="info"
            variant="outlined"
            icon={<InfoOutlinedIcon fontSize="inherit" />}
            sx={{ mb: 1, py: 0, '& .MuiAlert-message': { py: 0.5, fontSize: '0.7rem' } }}
          >
            <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block' }}>
              Not applicable under current conditions
            </Typography>
            <Typography variant="caption">{regimeGateReason}</Typography>
          </Alert>
        )}

        {/* Contribution bar if available */}
        {contribution && (
          <Box sx={{ mb: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5, alignItems: 'center' }}>
              <Typography variant="caption">Enhancement</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography variant="caption" fontWeight="bold">
                  {rawEnhancement.toExponential(1)}x
                </Typography>
                <Tooltip
                  arrow
                  title={
                    <Box sx={{ maxWidth: 260 }}>
                      <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block', mb: 0.5 }}>
                        Why this score?
                      </Typography>
                      <Typography variant="caption" sx={{ display: 'block' }}>
                        <strong>Raw enhancement:</strong> {rawEnhancement.toExponential(2)}×
                      </Typography>
                      <Typography variant="caption" sx={{ display: 'block' }}>
                        <strong>Claim-tier multiplier:</strong> {tierMult.toFixed(2)}× (
                        {tierInfo?.label ?? tier ?? 'unknown tier'})
                      </Typography>
                      <Typography variant="caption" sx={{ display: 'block' }}>
                        <strong>Effective contribution:</strong>{' '}
                        {effectiveEnhancement.toExponential(2)}×
                      </Typography>
                      <Divider sx={{ my: 0.5, borderColor: 'rgba(255,255,255,0.15)' }} />
                      <Typography variant="caption" sx={{ display: 'block', fontStyle: 'italic' }}>
                        Effective = Raw × multiplier. Speculative and
                        cross-regime tiers are down-weighted so they cannot
                        dominate aggregated scores.
                      </Typography>
                    </Box>
                  }
                >
                  <HelpOutlineIcon sx={{ fontSize: 14, color: 'text.secondary', cursor: 'help' }} />
                </Tooltip>
              </Box>
            </Box>
            <LinearProgress
              variant="determinate"
              value={Math.min(
                100,
                (Math.log10(Math.max(rawEnhancement, 1)) / 5) * 100,
              )}
              color={contribution.is_applicable ? 'primary' : 'inherit'}
              sx={{ height: 6, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.1)' }}
            />
            {tierMult < 1.0 && (
              <Typography
                variant="caption"
                color="warning.main"
                sx={{ display: 'block', mt: 0.25, fontSize: '0.6rem' }}
              >
                Down-weighted to {effectiveEnhancement.toExponential(1)}× by
                claim-tier multiplier ({tierMult.toFixed(2)}×).
              </Typography>
            )}

            {conf && (
              <Box sx={{ mt: 0.5, display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                <Typography variant="caption" color="text.secondary">
                  Confidence:
                </Typography>
                <Chip label={conf.label} size="small" color={conf.color} sx={{ height: 16, fontSize: '0.6rem' }} />
                {contribution.evidence_class && (
                  <Tooltip
                    arrow
                    title={
                      evidenceInfo
                        ? `${evidenceInfo.label}: ${evidenceInfo.description} (click for glossary)`
                        : 'Click to open governance glossary'
                    }
                  >
                    <Chip
                      onClick={() => onOpenGlossary('evidence')}
                      label={contribution.evidence_class}
                      size="small"
                      variant="outlined"
                      clickable
                      sx={{ height: 16, fontSize: '0.55rem' }}
                    />
                  </Tooltip>
                )}
                {contribution.claim_tier && (
                  <Tooltip
                    arrow
                    title={
                      tierInfo
                        ? `${tierInfo.label} (×${tierInfo.multiplier.toFixed(2)}): ${tierInfo.description} (click for glossary)`
                        : 'Click to open governance glossary'
                    }
                  >
                    <Chip
                      onClick={() => onOpenGlossary('claim')}
                      label={`tier: ${contribution.claim_tier.replace(/_/g, ' ')}`}
                      size="small"
                      variant="outlined"
                      clickable
                      color={tierInfo?.color ?? 'default'}
                      sx={{ height: 16, fontSize: '0.55rem' }}
                    />
                  </Tooltip>
                )}
              </Box>
            )}
            {contribution.confidence_breakdown?.weighted_score !== undefined && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                Weighted confidence: {(Number(contribution.confidence_breakdown.weighted_score) * 100).toFixed(1)}%
              </Typography>
            )}
            {contribution.uncertainty_interval?.lower_95 !== undefined && contribution.uncertainty_interval?.upper_95 !== undefined && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                95% CI: {Number(contribution.uncertainty_interval.lower_95).toFixed(2)} - {Number(contribution.uncertainty_interval.upper_95).toFixed(2)}
              </Typography>
            )}
          </Box>
        )}

        {/* Per-theory parameter overrides. Sent as theory_configs on the next run. */}
        {theory.configurable_parameters &&
          Object.keys(theory.configurable_parameters).length > 0 && (
            <TheoryParameterEditor
              theoryId={theory.theory_id}
              configurableParameters={theory.configurable_parameters}
              overrides={configOverrides}
              onChange={onConfigChange}
              onReset={onConfigReset}
            />
          )}

        {/* Coupling arrows (coupled mode only) */}
        {coupledMode && coupledResult?.coupling_map?.[theory.theory_id] && (
          <Box sx={{ mb: 0.5 }}>
            <Typography variant="caption" color="success.main" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.65rem' }}>
              <LinkIcon sx={{ fontSize: 12 }} /> Fed by:
            </Typography>
            {coupledResult.coupling_map[theory.theory_id].map((c: { source_id: string }) => (
              <Chip
                key={c.source_id}
                label={`← ${c.source_id.replace(/_/g, ' ')}`}
                size="small"
                color="success"
                variant="outlined"
                sx={{ fontSize: '0.55rem', height: 16, mr: 0.5, mb: 0.3 }}
              />
            ))}
          </Box>
        )}

        {/* MHD Parameter Dashboard (Bubble-MHD only) */}
        {theory.theory_id === 'bubble_mhd_confinement' &&
          contribution?.observables &&
          Object.keys(contribution.observables).length > 0 && (
            <MHDParameterDashboard observables={contribution.observables} />
          )}

        {/* References */}
        {theory.references && theory.references.length > 0 && (
          <Box sx={{ mt: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              Refs: {theory.references.slice(0, 2).join('; ')}
            </Typography>
          </Box>
        )}
        {contribution?.falsification_conditions?.length ? (
          <Box sx={{ mt: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              Invalid if: {contribution.falsification_conditions[0]}
            </Typography>
          </Box>
        ) : null}
      </AccordionDetails>
    </Accordion>
  );
}

// ---------------------------------------------------------------------------
// Per-theory parameter overrides
// ---------------------------------------------------------------------------

interface TheoryParameterEditorProps {
  theoryId: string;
  configurableParameters: Record<string, any>;
  overrides?: Record<string, any>;
  onChange: (
    _theoryId: string,
    _paramName: string,
    _rawValue: string,
    _isNumeric: boolean,
  ) => void;
  onReset: (_theoryId: string) => void;
}

/**
 * Editor for a theory's `configurable_parameters`, which the backend returns as
 * `{ name: { default, description } }`. Leaving a field blank means "use the
 * module default" rather than sending an explicit value.
 */
const TheoryParameterEditor: React.FC<TheoryParameterEditorProps> = ({
  theoryId,
  configurableParameters,
  overrides,
  onChange,
  onReset,
}) => {
  const entries = Object.entries(configurableParameters);
  const overrideCount = overrides ? Object.keys(overrides).length : 0;

  return (
    <Accordion
      disableGutters
      elevation={0}
      sx={{ bgcolor: 'transparent', '&:before': { display: 'none' }, mb: 0.5 }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon sx={{ fontSize: 16 }} />}
        sx={{ minHeight: 0, px: 0, '& .MuiAccordionSummary-content': { my: 0.5 } }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <TuneIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
          <Typography variant="caption" color="text.secondary">
            Parameters ({entries.length})
          </Typography>
          {overrideCount > 0 && (
            <Chip
              label={`${overrideCount} overridden`}
              size="small"
              color="info"
              variant="outlined"
              sx={{ height: 16, fontSize: '0.55rem' }}
            />
          )}
        </Box>
      </AccordionSummary>
      <AccordionDetails sx={{ px: 0, pt: 0 }}>
        <Grid container spacing={1}>
          {entries.map(([name, meta]) => {
            const defaultValue = meta && typeof meta === 'object' ? meta.default : meta;
            const description =
              meta && typeof meta === 'object' ? meta.description : undefined;
            const isNumeric = typeof defaultValue === 'number';
            const current = overrides?.[name];
            return (
              <Grid size={{ xs: 12, sm: 6 }} key={name}>
                <Tooltip title={description || name} arrow>
                  <TextField
                    label={name}
                    size="small"
                    fullWidth
                    type={isNumeric ? 'number' : 'text'}
                    value={current ?? ''}
                    placeholder={String(defaultValue ?? '')}
                    onChange={(e) => onChange(theoryId, name, e.target.value, isNumeric)}
                    InputLabelProps={{ shrink: true, sx: { fontSize: '0.7rem' } }}
                    inputProps={{ style: { fontSize: '0.7rem' } }}
                  />
                </Tooltip>
              </Grid>
            );
          })}
        </Grid>
        {overrideCount > 0 && (
          <Button
            size="small"
            onClick={() => onReset(theoryId)}
            sx={{ mt: 1, fontSize: '0.65rem' }}
          >
            Reset to defaults
          </Button>
        )}
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: 'block', mt: 0.5, fontSize: '0.6rem' }}
        >
          Blank uses the module default. Overrides apply on the next run.
        </Typography>
      </AccordionDetails>
    </Accordion>
  );
};

export default TheoryTogglePanel;
