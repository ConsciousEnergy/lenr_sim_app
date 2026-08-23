import React from 'react';
import {
  Alert,
  Box,
  Chip,
  Divider,
  IconButton,
  Paper,
  Tooltip,
  Typography,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import ReactionRateGovernancePanel from '../physics/ReactionRateGovernancePanel';
import OpenQuestionsVirtualLab from '../physics/OpenQuestionsVirtualLab';
import PredictionReadoutPanel from '../physics/PredictionReadoutPanel';
import EnhancementWaterfallChart from '../physics/EnhancementWaterfallChart';
import { resolveElectrolyteSpecies } from '../../utils/theoryConditions';
import {
  PHASE_COLORS,
  getMechanismUncertaintyFanData,
  getUncertaintyFanData,
} from '../../utils/unifiedTheoryCharts';

const REGIME_MAX_TEMPERATURE_K = 2.0e6;

const resolveTemperatureLimit = (simulationData) => {
  const limit = simulationData?.collapse_results?.limits?.temperature_k;
  return {
    ceiling: limit?.ceiling ?? REGIME_MAX_TEMPERATURE_K,
    isSaturated: Boolean(limit?.is_saturated),
    valueRaw: limit?.value_raw ?? null,
    basis: limit?.basis ?? null,
    citation: limit?.citation ?? null,
  };
};

export default function ResultsPanel({
  simulationData,
  parameters,
  onOpenGlossary,
}) {
  const fanData = getUncertaintyFanData(simulationData);
  const mechanismFanData = getMechanismUncertaintyFanData(simulationData);
  const isLocalFallback = simulationData?.validation?.route_mode === 'local_fallback';
  return (
<Grid container spacing={2}>
  {isLocalFallback && (
    <Grid size={{ xs: 12 }}>
      <Alert severity="warning">
        Offline placeholder values: the backend was unreachable, so these
        numbers come from a schematic client-side fallback, not the physics
        engine. Do not cite them as simulation output.
      </Alert>
    </Grid>
  )}
  {simulationData?.open_questions && (
    <Grid size={12}>
      <OpenQuestionsVirtualLab simulationData={simulationData} />
    </Grid>
  )}
  <Grid size={{ xs: 12, md: 6 }}>
    <Paper sx={{ p: 2 }} variant="outlined">
      <Typography variant="h6" gutterBottom>Collapse Results</Typography>
      <Divider sx={{ mb: 2 }} />
      <Box sx={{ display: 'grid', gap: 1 }}>
        <Typography>Min Radius: <strong>{simulationData.collapse_results?.min_radius_um?.toFixed(2)} μm</strong></Typography>
        <Typography component="div">
          Max Temperature: <strong>{simulationData.collapse_results?.max_temperature_k?.toFixed(0)} K</strong>
          {(() => {
            const limit = resolveTemperatureLimit(simulationData);
            if (!limit.isSaturated) return null;
            return (
              <Tooltip
                title={`Clamped to the ${limit.ceiling.toExponential(1)} K reporting ceiling${
                  limit.valueRaw ? `; adiabatic closed form gives ${Number(limit.valueRaw).toExponential(1)} K` : ''
                }. ${limit.basis || ''} ${limit.citation || ''}`.trim()}
              >
                <Chip label="AT CEILING" size="small" color="warning" sx={{ ml: 1 }} />
              </Tooltip>
            );
          })()}
        </Typography>
        <Typography>Max Pressure: <strong>{simulationData.collapse_results?.max_pressure_bar?.toFixed(0)} bar</strong></Typography>
        <Typography>Compression Ratio: <strong>{simulationData.collapse_results?.compression_ratio?.toFixed(1)}x</strong></Typography>
        {simulationData.collapse_results?.bubble_dynamics?.peak_mach != null && (
          <Typography>
            Peak Mach: <strong>{Number(simulationData.collapse_results.bubble_dynamics.peak_mach).toFixed(3)}</strong>
            {simulationData.collapse_results.bubble_dynamics.compressibility_regime
              ? ` (${simulationData.collapse_results.bubble_dynamics.compressibility_regime})`
              : ''}
          </Typography>
        )}
        {simulationData.collapse_results?.bubble_dynamics?.mode && (
          <Typography>
            Dynamics: <strong>{simulationData.collapse_results.bubble_dynamics.mode}</strong>
            {simulationData.collapse_results.bubble_dynamics.solver
              ? ` · ${simulationData.collapse_results.bubble_dynamics.solver}`
              : ''}
          </Typography>
        )}
      </Box>
    </Paper>
  </Grid>
  <Grid size={{ xs: 12, md: 6 }}>
    <Paper sx={{ p: 2 }} variant="outlined">
      <Typography variant="h6" gutterBottom>Peak Proton Phases</Typography><Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>Proton phases influenced by delocalized interface electrons at lattice-electrolyte boundaries.</Typography>
      <Divider sx={{ mb: 2 }} />
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {simulationData.proton_phases && Object.entries(simulationData.proton_phases).map(([phase, fraction]) => (
          <Chip
            key={phase}
            // One decimal: rounding to whole percent hid small but
            // physically meaningful nuclear-active fractions and made
            // the four shares look like they did not sum to 100%.
            label={`${phase}: ${(fraction * 100).toFixed(1)}%`}
            sx={{ bgcolor: PHASE_COLORS[phase.toLowerCase()] || '#888', color: 'white' }}
          />
        ))}
      </Box>
    </Paper>
  </Grid>
  {fanData.length > 0 && (() => {
    const uq = simulationData.collapse_uncertainty;
    const sensitivity = uq?.sensitivity?.log10_total_enhancement_raw || {};
    const ranked = Object.entries(sensitivity)
      .sort((a, b) => b[1] - a[1])
      .filter(([, weight]) => weight > 0.01);
    return (
      <Grid size={12}>
        <Paper sx={{ p: 2 }} variant="outlined">
          <Typography variant="h6" gutterBottom>
            Collapse Uncertainty
          </Typography>
          <Divider sx={{ mb: 1 }} />
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
            Sobol predictive intervals over {uq?.inputs?.n_samples} samples
            (seed {uq?.inputs?.seed}). Dark band is the interquartile range,
            light band spans the 5th to 95th percentile, and the marker is
            the median. Log10 scale, since the four quantities span many
            decades.
          </Typography>
          <Box sx={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={fanData} layout="vertical" barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  label={{ value: 'log10(value)', position: 'insideBottom', offset: -4 }}
                />
                <YAxis type="category" dataKey="name" width={130} />
                <RechartsTooltip
                  formatter={(value, name) => [Number(value).toFixed(2), name]}
                />
                <Bar dataKey="lower" stackId="fan" fill="transparent" />
                <Bar dataKey="innerLowWidth" stackId="fan" fill="#42a5f5" fillOpacity={0.35} name="p05-p25" />
                <Bar dataKey="innerHighWidth" stackId="fan" fill="#1565c0" fillOpacity={0.75} name="p25-p75" />
                <Bar dataKey="outerHighWidth" stackId="fan" fill="#42a5f5" fillOpacity={0.35} name="p75-p95" />
              </BarChart>
            </ResponsiveContainer>
          </Box>
          {mechanismFanData.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Mechanism intervals (log10)
              </Typography>
              <Box sx={{ height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={mechanismFanData} layout="vertical" barCategoryGap="30%">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="name" width={110} />
                    <RechartsTooltip
                      formatter={(value, name) => [Number(value).toFixed(2), name]}
                    />
                    <Bar dataKey="lower" stackId="mfan" fill="transparent" />
                    <Bar dataKey="innerLowWidth" stackId="mfan" fill="#66bb6a" fillOpacity={0.35} name="p05-p25" />
                    <Bar dataKey="innerHighWidth" stackId="mfan" fill="#2e7d32" fillOpacity={0.75} name="p25-p75" />
                    <Bar dataKey="outerHighWidth" stackId="mfan" fill="#66bb6a" fillOpacity={0.35} name="p75-p95" />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </Box>
          )}
          {ranked.length > 0 && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Dominant contributors to the enhancement spread:{' '}
                {ranked
                  .map(([key, weight]) => `${key.replace(/_/g, ' ')} ${(weight * 100).toFixed(0)}%`)
                  .join(', ')}
              </Typography>
            </Box>
          )}
          <Alert severity="warning" sx={{ mt: 1, py: 0 }}>
            <Typography variant="caption">
              {uq?.provenance?.note}
            </Typography>
          </Alert>
        </Paper>
      </Grid>
    );
  })()}

  {/* Reaction-Rate Engine governance (v0.3.6-beta) */}
  <Grid size={12}>
    <Paper sx={{ p: 0 }} variant="outlined">
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, pt: 2 }}>
        <Typography variant="h6">Reaction-Rate Engine</Typography>
        <Tooltip title="What do these claim tiers mean?">
          <IconButton size="small" onClick={onOpenGlossary} aria-label="Open governance glossary">
            <HelpOutlineIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
      <Divider sx={{ mt: 1 }} />
      <ReactionRateGovernancePanel
        block={simulationData.reaction_rate_engine}
        onOpenGlossary={onOpenGlossary}
      />
    </Paper>
  </Grid>

  <Grid size={12}>
    <Paper sx={{ p: 2 }} variant="outlined">
      <Typography variant="h6" gutterBottom>Electrolyte Contribution</Typography>
      <Divider sx={{ mb: 2 }} />
      <Box sx={{ display: 'grid', gap: 1 }}>
        <Typography>
          Family: <strong>{simulationData.electrolyte_diagnostics?.electrolyte_family || parameters.electrolyteFamily || 'li'}</strong>
        </Typography>
        <Typography>
          Species: <strong>{simulationData.electrolyte_diagnostics?.electrolyte_species || resolveElectrolyteSpecies(parameters.electrolyteFamily || 'li', parameters.electrolyteSpecies)}</strong>
        </Typography>
        <Typography>
          Activity Multiplier: <strong>{(simulationData.electrolyte_diagnostics?.activity_multiplier || simulationData.peak_conditions?.electrolyte_multiplier || 1).toFixed(3)}x</strong>
        </Typography>
        <Typography>
          Support Level: <strong>{simulationData.electrolyte_diagnostics?.support_level || 'validated'}</strong>
        </Typography>
      </Box>
    </Paper>
  </Grid>
  
  {/* Enhancement Breakdown Waterfall */}
  <Grid size={12}>
    <Paper sx={{ p: 2 }} variant="outlined">
      <Typography variant="h6" gutterBottom>Enhancement Mechanism Breakdown</Typography>
      <Divider sx={{ mb: 2 }} />
      {(() => {
        const peakEntry = simulationData.enhancement_timeline?.find(e => e.phase === 'MINIMUM')
          || simulationData.enhancement_timeline?.[Math.floor(simulationData.enhancement_timeline.length / 2)]
          || {};
        const breakdown =
          simulationData.peak_conditions?.enhancement_breakdown
          || peakEntry.enhancement_breakdown
          || {};
        const saturation = breakdown.saturation || null;
        const prediction = breakdown.prediction || null;
        const governedTotal = prediction?.physics_governed?.total;
        const claimTotal = prediction?.claim_tier_display?.total ?? breakdown.total;

        return (
          <Box>
            <PredictionReadoutPanel prediction={prediction} />
            {saturation?.any_saturated && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                {saturation.saturated_mechanisms.length} mechanism(s) reached the claim-tier
                display ceiling. Saturated segments are reporting limits, not physical predictions.
              </Alert>
            )}
            <EnhancementWaterfallChart breakdown={breakdown} />
            <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {typeof governedTotal === 'number' && (
                <Chip
                  label={`Physics governed: ${governedTotal.toExponential(2)}`}
                  color="primary"
                  size="small"
                />
              )}
              <Chip label={`Claim-tier display: ${Number(claimTotal).toExponential(2)}`} size="small" />
            </Box>
          </Box>
        );
      })()}
    </Paper>
  </Grid>
  
  {/* Parkhomov Transmutation Validation (v0.3.6-beta §3C) */}
  {simulationData.transmutation_validation && (
    <Grid size={12}>
      <Paper sx={{ p: 2 }} variant="outlined">
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="h6" gutterBottom>
            Transmutation Validation
          </Typography>
          {(() => {
            const match = simulationData.transmutation_validation.parkhomov_match || 'none';
            const total = simulationData.transmutation_validation.total_candidates || 0;
            const color = match === 'exact' ? 'success' : match === 'partial' ? 'warning' : 'default';
            const label = match === 'none'
              ? 'Parkhomov: no match'
              : `Parkhomov: ${total} ${match} match${total === 1 ? '' : 'es'}`;
            return <Chip label={label} color={color} size="small" />;
          })()}
        </Box>
        <Divider sx={{ mb: 2 }} />
        {(simulationData.transmutation_validation.matching_reactions || []).length > 0 ? (
          <Box sx={{ display: 'grid', gap: 1 }}>
            {simulationData.transmutation_validation.matching_reactions.slice(0, 5).map((rxn, idx) => {
              const formatSide = (side) =>
                (side || [])
                  .map((e) => (e.A > 0 ? `${e.symbol}-${e.A}` : e.symbol))
                  .join(' + ');
              return (
                <Box
                  key={idx}
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    p: 1,
                    borderRadius: 1,
                    bgcolor: 'action.hover',
                  }}
                >
                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                    {formatSide(rxn.reactants)} {'->'} {formatSide(rxn.products)}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Chip label={rxn.category} size="small" variant="outlined" />
                    <Chip
                      label={`${(rxn.energy_mev || 0).toFixed(2)} MeV`}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  </Box>
                </Box>
              );
            })}
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary">
            No Parkhomov reactions matched the inferred host/reactant pathway. This
            does not invalidate the simulation — the curated table only covers
            common Pd-D, Ni-H, Li-H, and Ti-D channels.
          </Typography>
        )}
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
          Data: Dr. Alexander Parkhomov (2018), LENR Academy (curated subset).
        </Typography>
      </Paper>
    </Grid>
  )}

  <Grid size={12}>
    <Alert severity="info">
      <Typography variant="body2">
        The visualization shows how ionic double-layer bubbles collapse onto hydrogen-loaded lattice materials.
        Protons transition through force regimes: <strong>EM {'->'} Screened {'->'} Weak Capture {'->'} Nuclear</strong>.
        Peak enhancement occurs at minimum bubble radius when compression maximizes field strength.
      </Typography>
    </Alert>
  </Grid>
</Grid>
  );
}
