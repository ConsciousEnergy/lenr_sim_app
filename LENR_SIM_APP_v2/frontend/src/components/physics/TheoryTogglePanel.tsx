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
} from '@mui/material';
import Grid from '@mui/material/Grid';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ScienceIcon from '@mui/icons-material/Science';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import BoltIcon from '@mui/icons-material/Bolt';
import LinkIcon from '@mui/icons-material/Link';
import { usePhysics, TheoryContributionResult } from '../../contexts/PhysicsContext';

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
  conditions?: Record<string, number>;
}

const TheoryTogglePanel: React.FC<TheoryTogglePanelProps> = ({ conditions }) => {
  const {
    availableTheories,
    enabledTheories,
    theoryConfigs: _theoryConfigs,
    theoryResult,
    isLoadingTheories,
    setEnabledTheories,
    setTheoryConfigs: _setTheoryConfigs,
    fetchTheories,
    runTheories,
    runCoupledTheories,
    coupledResult,
  } = usePhysics();

  const [coupledMode, setCoupledMode] = useState(false);

  // Fetch theories on mount
  useEffect(() => {
    if (availableTheories.length === 0) {
      fetchTheories();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      setEnabledTheories(
        enabledTheories.includes(theoryId)
          ? enabledTheories.filter((id) => id !== theoryId)
          : [...enabledTheories, theoryId],
      );
    },
    [enabledTheories, setEnabledTheories],
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
        sx={{ mb: 2 }}
      >
        {coupledMode ? 'Run Coupled Pipeline' : 'Run Selected Theories'}
      </Button>

      <Divider sx={{ mb: 1 }} />

      {/* Theory list */}
      {availableTheories.map((theory) => {
        const isEnabled = enabledTheories.includes(theory.theory_id);
        const contribution = contributionMap[theory.theory_id];
        const conf = contribution ? confidenceLabel(contribution.confidence) : null;

        return (
          <Accordion
            key={theory.theory_id}
            disableGutters
            elevation={0}
            sx={{
              '&:before': { display: 'none' },
              bgcolor: 'transparent',
              border: '1px solid',
              borderColor: isEnabled ? 'primary.dark' : 'divider',
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

              {/* Contribution bar if available */}
              {contribution && (
                <Box sx={{ mb: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="caption">Enhancement</Typography>
                    <Typography variant="caption" fontWeight="bold">
                      {contribution.enhancement_factor.toExponential(1)}x
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(
                      100,
                      (Math.log10(Math.max(contribution.enhancement_factor, 1)) / 5) * 100,
                    )}
                    color={contribution.is_applicable ? 'primary' : 'inherit'}
                    sx={{ height: 6, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.1)' }}
                  />
                  {conf && (
                    <Box sx={{ mt: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">
                        Confidence:
                      </Typography>
                      <Chip label={conf.label} size="small" color={conf.color} sx={{ height: 16, fontSize: '0.6rem' }} />
                    </Box>
                  )}
                </Box>
              )}

              {/* Coupling arrows (coupled mode only) */}
              {coupledMode && coupledResult?.coupling_map?.[theory.theory_id] && (
                <Box sx={{ mb: 0.5 }}>
                  <Typography variant="caption" color="success.main" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.65rem' }}>
                    <LinkIcon sx={{ fontSize: 12 }} /> Fed by:
                  </Typography>
                  {coupledResult.coupling_map[theory.theory_id].map((c) => (
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
            </AccordionDetails>
          </Accordion>
        );
      })}

      {availableTheories.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>
          No theories available. Is the backend running?
        </Typography>
      )}
    </Box>
  );
};

export default TheoryTogglePanel;
