import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Grid,
  Typography,
  Paper,
  Box,
  Tabs,
  Tab,
  Button,
  Chip,
  Divider,
  Alert,
  Tooltip
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import AppLayout from '../components/layout/AppLayout';
import { usePhysics } from '../contexts/PhysicsContext';
import EnhancementWaterfallChart from '../components/physics/EnhancementWaterfallChart';
import PredictionReadoutPanel from '../components/physics/PredictionReadoutPanel';
import ScreeningProvenancePanel from '../components/physics/ScreeningProvenancePanel';
import TheoryFidelityHonestySummary from '../components/physics/TheoryFidelityHonestySummary';

function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function findTheory(perTheory, theoryId) {
  if (!perTheory) return null;
  return perTheory.find(t => t.theory_id === theoryId) || null;
}

const AdvancedAnalysisPage = () => {
  const [activeTab, setActiveTab] = useState(2);
  const { simulationResult, theoryResult } = usePhysics();
  const theme = useTheme();

  // Tracked separately rather than as one OR-gate. A persisted simulation used to
  // satisfy a combined `hasData`, so the page rendered as ready while the
  // theory-dependent tabs stayed permanently empty.
  const hasSimulationData = !!simulationResult;
  const hasTheoryData = !!(theoryResult?.per_theory?.length);
  const hasData = hasSimulationData || hasTheoryData;
  const perTheory = theoryResult?.per_theory || null;
  const observablesBridge = theoryResult?.observables_bridge || null;

  const enhancementBreakdown = useMemo(() => {
    return simulationResult?.peak_conditions?.enhancement_breakdown || null;
  }, [simulationResult]);

  // The backend emits `screening` and `phonon`; this page previously read
  // `electron_screening` and `phonon_coupling`, so the lite cards never rendered.
  // Both spellings are accepted so older cached payloads still work.
  const liteScreening = useMemo(() => (
    enhancementBreakdown?.screening ?? enhancementBreakdown?.electron_screening ?? null
  ), [enhancementBreakdown]);

  const litePhonon = useMemo(() => (
    enhancementBreakdown?.phonon ?? enhancementBreakdown?.phonon_coupling ?? null
  ), [enhancementBreakdown]);

  // Per-mechanism saturation provenance (additive backend field). When a mechanism
  // is saturated its displayed value is the claim-tier ceiling, not a prediction.
  const saturation = enhancementBreakdown?.saturation || null;

  const quantumData = useMemo(() => {
    const qt = findTheory(perTheory, 'quantum_tunneling');
    if (!qt) return null;
    const obs = qt.observables || {};
    return {
      gamowProbability: obs.gamow_probability ?? null,
      sommerfeldParameter: obs.sommerfeld_parameter ?? null,
      gamowExponent: obs.gamow_exponent ?? null,
      coulombBarrierEV: obs.coulomb_barrier_eV ?? null,
      thermalEnergyEV: obs.thermal_energy_eV ?? null,
    };
  }, [perTheory]);

  const screeningData = useMemo(() => {
    const es = findTheory(perTheory, 'electron_screening');
    if (!es) return null;
    const obs = es.observables || {};
    return {
      screenPotentialEV: obs.screening_potential_eV ?? obs.U_screen_eV ?? obs.screen_potential_eV ?? null,
      debyeLengthNm: obs.lambda_D_nm ?? obs.debye_length_nm ?? null,
      screeningEnhancement: es.enhancement_factor ?? null,
    };
  }, [perTheory]);

  const latticeData = useMemo(() => {
    const hp = findTheory(perTheory, 'hagelstein_phonon');
    if (!hp) return null;
    const obs = hp.observables || {};
    return {
      phononNumber: obs.phonon_number ?? obs.n_phonons ?? null,
      couplingElement: obs.coupling_matrix_element ?? null,
      energyPerPhonon: obs.energy_per_phonon ?? obs.energy_per_phonon_eV ?? null,
      debyeTemperature: obs.debye_temperature_K ?? null,
      phononFrequency: obs.phonon_frequency_Hz ?? null,
    };
  }, [perTheory]);

  const collapseData = useMemo(() => {
    if (!simulationResult?.collapse_results) return null;
    const cr = simulationResult.collapse_results;
    return {
      minRadiusUm: cr.min_radius_um,
      maxTemperatureK: cr.max_temperature_k,
      maxPressureBar: cr.max_pressure_bar,
      compressionRatio: cr.compression_ratio,
      collapseTimeUs: cr.collapse_time_us,
      peakFieldVm: cr.peak_field_v_m,
      peakEnhancement: cr.peak_enhancement,
      limits: cr.limits || null,
      mechanismProvenance: cr.mechanism_provenance || null,
    };
  }, [simulationResult]);

  const peakConditions = simulationResult?.peak_conditions || null;
  const protonPhases = simulationResult?.proton_phases || null;

  useEffect(() => {
    if (quantumData || screeningData) { setActiveTab(0); return; }
    if (latticeData) { setActiveTab(1); return; }
    if (collapseData) { setActiveTab(2); return; }
    if (perTheory && perTheory.length > 0) { setActiveTab(3); return; }
  }, [quantumData, screeningData, latticeData, collapseData, perTheory]);

  const handleTabChange = (_event, newValue) => {
    setActiveTab(newValue);
  };

  const formatNumber = (val, mode = 'exponential', digits = 4) => {
    if (val == null || isNaN(val)) return 'N/A';
    if (mode === 'exponential') return Number(val).toExponential(digits);
    if (mode === 'fixed') return Number(val).toFixed(digits);
    return String(val);
  };

  const tabHasData = (index) => {
    switch (index) {
      case 0: return !!(quantumData || screeningData || liteScreening != null);
      case 1: return !!(latticeData || litePhonon != null);
      case 2: return !!collapseData;
      case 3: return hasTheoryData;
      default: return false;
    }
  };

  /** Chip marking a value that was clamped to the reporting ceiling. */
  const renderSaturationChip = (mechanismKey) => {
    const mechanism = saturation?.mechanisms?.[mechanismKey];
    if (!mechanism?.is_saturated) return null;
    const log10Raw = mechanism.log10_value_raw;
    return (
      <>
        <Tooltip
          title={
            `Clamped to the ${formatNumber(mechanism.ceiling)} claim-tier display ceiling. ` +
            `Uncapped model value is about 10^${log10Raw != null ? Number(log10Raw).toFixed(1) : '?'}. ` +
            'This is a reporting limit, not a physical prediction.'
          }
        >
          <Chip label="SATURATED" size="small" color="warning" sx={{ ml: 1 }} />
        </Tooltip>
        <Typography variant="caption" color="text.secondary" display="block">
          {`raw ≈ 10^${log10Raw != null ? Number(log10Raw).toFixed(1) : '?'}`}
        </Typography>
      </>
    );
  };

  const renderEnhancementLiteCard = (factorKey, factorLabel, explicitValue) => {
    const val = explicitValue !== undefined ? explicitValue : enhancementBreakdown?.[factorKey];
    if (val == null) return null;
    return (
      <Grid size={{ xs: 12, md: 6 }}>
        <Paper elevation={2} sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            {factorLabel} (from Simulation)
          </Typography>
          <Typography variant="body1" component="div">
            Enhancement Factor: {formatNumber(val)}
            {renderSaturationChip(factorKey)}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Extracted from the bubble-lattice simulation peak conditions.
          </Typography>
        </Paper>
      </Grid>
    );
  };

  const renderQuantumTunnelingSection = () => {
    const hasTheoryData = !!(quantumData || screeningData);
    const hasLiteData = liteScreening != null;

    if (!hasTheoryData && !hasLiteData) {
      return (
        <Paper elevation={1} sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
            No quantum tunneling data available.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Run the theory pipeline from the Unified Theory page to generate detailed per-theory analysis,
            or run a bubble-lattice simulation to see enhancement factors.
          </Typography>
          <Button component={Link} to="/unified-theory?tab=testbed" variant="contained" color="primary">
            Go to Theory Testbed
          </Button>
        </Paper>
      );
    }

    return (
      <>
        {!hasTheoryData && hasLiteData && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Showing enhancement factors from the bubble-lattice simulation.
            Run &ldquo;Run Selected Theories&rdquo; on the Unified Theory page for full per-theory observables.
          </Alert>
        )}
        <Grid container spacing={3}>
          {quantumData && (
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper elevation={2} sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>Gamow Tunneling Parameters</Typography>
                <Typography variant="body1">
                  Gamow Probability: {formatNumber(quantumData.gamowProbability)}
                </Typography>
                <Typography variant="body1">
                  Sommerfeld Parameter: {formatNumber(quantumData.sommerfeldParameter, 'fixed', 2)}
                </Typography>
                <Typography variant="body1">
                  Gamow Exponent: {formatNumber(quantumData.gamowExponent, 'fixed', 2)}
                </Typography>
                <Typography variant="body1">
                  Coulomb Barrier: {formatNumber(quantumData.coulombBarrierEV, 'fixed', 1)} eV
                </Typography>
                <Typography variant="body1">
                  Thermal Energy: {formatNumber(quantumData.thermalEnergyEV)} eV
                </Typography>
              </Paper>
            </Grid>
          )}
          {screeningData && (
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper elevation={2} sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>Electron Screening</Typography>
                <Typography variant="body1">
                  Screen Potential: {formatNumber(screeningData.screenPotentialEV, 'fixed', 2)} eV
                </Typography>
                <Typography variant="body1">
                  Debye Length: {formatNumber(screeningData.debyeLengthNm, 'fixed', 2)} nm
                </Typography>
                <Typography variant="body1">
                  Screening Enhancement: {formatNumber(screeningData.screeningEnhancement, 'exponential', 2)}
                </Typography>
              </Paper>
            </Grid>
          )}
          {!screeningData && renderEnhancementLiteCard('screening', 'Electron Screening', liteScreening)}
        </Grid>
      </>
    );
  };
  const renderLatticeSection = () => {
    const hasLiteData = litePhonon != null;

    if (!latticeData && !hasLiteData) {
      return (
        <Paper elevation={1} sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
            No lattice dynamics data available.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Run the theory pipeline (with Hagelstein Phonon enabled) to see lattice analysis,
            or run a bubble-lattice simulation for enhancement factors.
          </Typography>
          <Button component={Link} to="/unified-theory?tab=testbed" variant="contained" color="primary">
            Go to Theory Testbed
          </Button>
        </Paper>
      );
    }

    return (
      <>
        {!latticeData && hasLiteData && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Showing enhancement factors from the bubble-lattice simulation.
            Run &ldquo;Run Selected Theories&rdquo; for full phonon-nuclear coupling observables.
          </Alert>
        )}
        <Grid container spacing={3}>
          {latticeData ? (
            <>
              <Grid size={{ xs: 12, md: 6 }}>
                <Paper elevation={2} sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>Hagelstein Phonon-Nuclear Coupling</Typography>
                  {latticeData.phononNumber != null && (
                    <Typography variant="body1">
                      Phonon Number: {formatNumber(latticeData.phononNumber)}
                    </Typography>
                  )}
                  {latticeData.couplingElement != null && (
                    <Typography variant="body1">
                      Coupling Matrix Element: {formatNumber(latticeData.couplingElement)}
                    </Typography>
                  )}
                  {latticeData.energyPerPhonon != null && (
                    <Typography variant="body1">
                      Energy per Phonon: {formatNumber(latticeData.energyPerPhonon)} eV
                    </Typography>
                  )}
                  {latticeData.debyeTemperature != null && (
                    <Typography variant="body1">
                      Debye Temperature: {formatNumber(latticeData.debyeTemperature, 'fixed', 1)} K
                    </Typography>
                  )}
                  {latticeData.phononFrequency != null && (
                    <Typography variant="body1">
                      Phonon Frequency: {formatNumber(latticeData.phononFrequency)} Hz
                    </Typography>
                  )}
                </Paper>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Paper elevation={2} sx={{ p: 2, minHeight: 200 }} data-testid="theory-summary-honesty">
                  <Typography variant="h6" gutterBottom>Theory Summary</Typography>
                  {(() => {
                    const hp = findTheory(perTheory, 'hagelstein_phonon');
                    const fidelity = hp?.model_fidelity || 'approximate';
                    const empirical = hp?.empirical_support || 'speculative';
                    const freeParams = Array.isArray(hp?.free_or_fitted_parameters)
                      ? hp.free_or_fitted_parameters
                      : [];
                    const approx = hp?.author_equations_vs_simulator_approximations || {};
                    const approxBits = Object.entries(approx)
                      .filter(([, v]) => String(v).includes('simulator') || String(v).includes('approx') || String(v).includes('deferred'))
                      .map(([k, v]) => `${k}=${v}`);
                    return (
                      <>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          Hagelstein phonon-nuclear coupling is shown as pipeline observables only.
                          Model fidelity and empirical support are independent axes — not a validity
                          endorsement. EQ-OPEN-* stay OPEN.
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                          <Chip size="small" variant="outlined" label={`fidelity: ${String(fidelity).replace(/_/g, ' ')}`} />
                          <Chip size="small" variant="outlined" label={`empirical: ${String(empirical).replace(/_/g, ' ')}`} />
                          {hp?.claim_tier && (
                            <Chip size="small" variant="outlined" label={`tier: ${String(hp.claim_tier).replace(/_/g, ' ')}`} />
                          )}
                        </Box>
                        {approxBits.length > 0 && (
                          <Alert severity="info" sx={{ mb: 1, py: 0.5 }}>
                            <Typography variant="caption">
                              Simulator approximations: {approxBits.join('; ')}
                            </Typography>
                          </Alert>
                        )}
                        {freeParams.length > 0 && (
                          <Alert severity="warning" sx={{ mb: 1, py: 0.5 }}>
                            <Typography variant="caption">
                              Free/fitted parameters:{' '}
                              {freeParams
                                .map((p) => (typeof p === 'string' ? p : `${p?.name || 'param'}${p?.kind ? `:${p.kind}` : ''}`))
                                .join('; ')}
                            </Typography>
                          </Alert>
                        )}
                        <TheoryFidelityHonestySummary theoryResult={theoryResult} />
                      </>
                    );
                  })()}
                </Paper>
              </Grid>
            </>
          ) : (
            <>
              {renderEnhancementLiteCard('phonon', 'Phonon-Nuclear Coupling', litePhonon)}
              {renderEnhancementLiteCard('casimir', 'Casimir Force')}
              {renderEnhancementLiteCard('qed', 'QED Vacuum Effects')}
              {renderEnhancementLiteCard('rydberg', 'Rydberg Matter')}
              {renderEnhancementLiteCard('compression', 'Compression Density')}
              {renderEnhancementLiteCard('loading', 'Loading Ratio')}
              {renderEnhancementLiteCard('electrolyte', 'Electrolyte Activity')}
            </>
          )}
        </Grid>
      </>
    );
  };
  const renderCollapseSection = () => {
    if (!collapseData) {
      return (
        <Paper elevation={1} sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
            No bubble collapse data available.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Run a bubble-lattice simulation from the Unified Theory page.
          </Typography>
          <Button component={Link} to="/unified-theory?tab=testbed" variant="contained" color="primary">
            Go to Theory Testbed
          </Button>
        </Paper>
      );
    }

    return (
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper elevation={2} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Collapse Results</Typography>
            <Typography variant="body1">
              Min Radius: {formatNumber(collapseData.minRadiusUm, 'fixed', 3)} &mu;m
            </Typography>
            <Typography variant="body1">
              Max Temperature: {formatNumber(collapseData.maxTemperatureK, 'fixed', 0)} K
            </Typography>
            <Typography variant="body1">
              Max Pressure: {formatNumber(collapseData.maxPressureBar, 'fixed', 0)} bar
            </Typography>
            <Typography variant="body1">
              Compression Ratio: {formatNumber(collapseData.compressionRatio, 'fixed', 1)}x
            </Typography>
            {collapseData.collapseTimeUs != null && (
              <Typography variant="body1">
                Collapse Time: {formatNumber(collapseData.collapseTimeUs, 'fixed', 3)} &mu;s
              </Typography>
            )}
            {collapseData.peakEnhancement != null && (
              <Typography variant="body1">
                Peak Enhancement: {formatNumber(collapseData.peakEnhancement)}
              </Typography>
            )}
          </Paper>
        </Grid>

        {collapseData.limits && (
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper elevation={2} sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>Reporting Limits</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Literature-anchored ceilings applied to the adiabatic closed form.
                Saturated values are bounds, not predictions.
              </Typography>
              {['temperature_k', 'pressure_pa', 'compression_ratio'].map((key) => {
                const lim = collapseData.limits[key];
                if (!lim) return null;
                const label = key === 'temperature_k'
                  ? 'Temperature'
                  : key === 'pressure_pa'
                    ? 'Pressure'
                    : 'Compression';
                const unit = key === 'temperature_k' ? 'K' : key === 'pressure_pa' ? 'Pa' : 'x';
                const calculatedBound = key === 'temperature_k'
                  ? lim.calculated_bound_k
                  : key === 'pressure_pa'
                    ? lim.calculated_bound_pa
                    : lim.calculated_bound;
                return (
                  <Box key={key} sx={{ mb: 1 }}>
                    <Typography variant="body2" component="div">
                      {label}: {formatNumber(lim.value, key === 'compression_ratio' ? 'fixed' : 'exponential', key === 'compression_ratio' ? 1 : 2)} {unit}
                      {lim.is_saturated && (
                        <Chip label="SATURATED" size="small" color="warning" sx={{ ml: 1 }} />
                      )}
                    </Typography>
                    {lim.value_raw != null && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        raw (adiabatic): {formatNumber(lim.value_raw)} {unit}
                      </Typography>
                    )}
                    {calculatedBound != null && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        calculated bound: {formatNumber(calculatedBound)} {unit}
                        {lim.basis ? ` · ${lim.basis}` : ''}
                      </Typography>
                    )}
                    {lim.citation && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        {lim.citation}
                      </Typography>
                    )}
                  </Box>
                );
              })}
            </Paper>
          </Grid>
        )}

        {collapseData.mechanismProvenance?.screening && (
          <Grid size={12}>
            <ScreeningProvenancePanel screening={collapseData.mechanismProvenance.screening} />
          </Grid>
        )}

        {protonPhases && (
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper elevation={2} sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>Proton Phase Distribution</Typography>
              {Object.entries(protonPhases).map(([phase, fraction]) => (
                <Box key={phase} sx={{ mb: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2">{phase}</Typography>
                    <Chip label={`${(Number(fraction) * 100).toFixed(1)}%`} size="small" />
                  </Box>
                </Box>
              ))}
            </Paper>
          </Grid>
        )}

        {peakConditions && (
          <Grid size={12}>
            <Paper elevation={2} sx={{ p: 2, mt: 2 }}>
              <Typography variant="h6" gutterBottom>Peak Conditions</Typography>
              <Grid container spacing={2}>
                {peakConditions.temperature_k != null && (
                  <Grid size={{ xs: 6, md: 3 }}>
                    <Typography variant="body2" color="text.secondary">Temperature</Typography>
                    <Typography variant="body1">{formatNumber(peakConditions.temperature_k, 'fixed', 0)} K</Typography>
                  </Grid>
                )}
                {peakConditions.pressure_gpa != null && (
                  <Grid size={{ xs: 6, md: 3 }}>
                    <Typography variant="body2" color="text.secondary">Pressure</Typography>
                    <Typography variant="body1">{formatNumber(peakConditions.pressure_gpa, 'fixed', 2)} GPa</Typography>
                  </Grid>
                )}
                {peakConditions.enhancement_factor != null && (
                  <Grid size={{ xs: 6, md: 3 }}>
                    <Typography variant="body2" color="text.secondary">Enhancement</Typography>
                    <Typography variant="body1">{formatNumber(peakConditions.enhancement_factor)}</Typography>
                  </Grid>
                )}
                {peakConditions.electric_field_v_m != null && (
                  <Grid size={{ xs: 6, md: 3 }}>
                    <Typography variant="body2" color="text.secondary">Electric Field</Typography>
                    <Typography variant="body1">{formatNumber(peakConditions.electric_field_v_m)} V/m</Typography>
                  </Grid>
                )}
              </Grid>
            </Paper>
          </Grid>
        )}

        {enhancementBreakdown && (
          <Grid size={12}>
            <Paper elevation={2} sx={{ p: 2, mt: 2 }}>
              <Typography variant="h6" gutterBottom>Enhancement Breakdown</Typography>
              <PredictionReadoutPanel prediction={enhancementBreakdown.prediction} />
              {saturation?.any_saturated && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  {saturation.saturated_mechanisms.length} mechanism(s) reached the{' '}
                  {formatNumber(saturation.ceiling)} claim-tier display ceiling, so their
                  displayed values are identical by construction. The uncapped magnitude
                  is shown beneath each saturated value; these are reporting limits, not
                  physical predictions.
                  <Box component="ul" sx={{ mt: 1, mb: 0, pl: 2 }}>
                    {Object.entries(saturation.mechanisms || {})
                      .filter(([, mechanism]) => mechanism?.is_saturated)
                      .map(([key, mechanism]) => (
                        <Typography component="li" variant="caption" key={key}>
                          {key}: raw ≈ 10^{
                            mechanism.log10_value_raw != null
                              ? Number(mechanism.log10_value_raw).toFixed(1)
                              : '?'
                          }
                        </Typography>
                      ))}
                  </Box>
                </Alert>
              )}
              <EnhancementWaterfallChart
                breakdown={enhancementBreakdown}
                screeningProvenance={simulationResult?.collapse_results?.mechanism_provenance?.screening}
              />
            </Paper>
          </Grid>
        )}
      </Grid>
    );
  };
  const renderTheorySummary = () => {
    if (!perTheory || perTheory.length === 0) {
      return (
        <Paper elevation={1} sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
            No per-theory analysis data available.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Use &quot;Run Selected Theories&quot; on the Unified Theory page to populate this view.
          </Typography>
          <Button component={Link} to="/unified-theory?tab=testbed" variant="contained" color="primary">
            Go to Theory Testbed
          </Button>
        </Paper>
      );
    }

    const applicable = perTheory.filter(t => t.is_applicable);
    const notApplicable = perTheory.filter(t => !t.is_applicable);

    return (
      <Box>
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            {applicable.length} applicable / {perTheory.length} total theories
          </Typography>
          {theoryResult && (
            <>
              <Divider sx={{ my: 1 }} />
              <Typography variant="body1">
                Combined Enhancement: {formatNumber(theoryResult.combined_enhancement)}
              </Typography>
              <Typography variant="body1">
                Total Energy Output: {formatNumber(theoryResult.total_energy_watts)} W
              </Typography>
            </>
          )}
        </Box>

        <Grid container spacing={2}>
          {applicable.map((theory) => (
            <Grid size={{ xs: 12, md: 6 }} key={theory.theory_id}>
              <Paper elevation={2} sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle1" fontWeight={600}>{theory.theory_name}</Typography>
                  <Chip
                    label={`${(theory.confidence * 100).toFixed(0)}%`}
                    size="small"
                    color={theory.confidence > 0.7 ? 'success' : theory.confidence > 0.4 ? 'warning' : 'default'}
                  />
                </Box>
                <Typography variant="body2">
                  Enhancement: {formatNumber(theory.enhancement_factor)}
                </Typography>
                {theory.energy_output_watts > 0 && (
                  <Typography variant="body2">
                    Energy: {formatNumber(theory.energy_output_watts)} W
                  </Typography>
                )}
                {Object.keys(theory.observables || {}).length > 0 && (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="caption" color="text.secondary">Key Observables:</Typography>
                    {Object.entries(theory.observables).slice(0, 4).map(([key, val]) => (
                      <Typography key={key} variant="body2" sx={{ fontSize: '0.8rem' }}>
                        {key}: {formatNumber(val)}
                      </Typography>
                    ))}
                  </Box>
                )}
              </Paper>
            </Grid>
          ))}
        </Grid>

        {notApplicable.length > 0 && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              Not Applicable Under Current Conditions ({notApplicable.length})
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {notApplicable.map(t => (
                <Chip key={t.theory_id} label={t.theory_name} size="small" variant="outlined" />
              ))}
            </Box>
          </Box>
        )}
      </Box>
    );
  };
  return (
    <AppLayout>
      <Box sx={{ p: 3, bgcolor: 'background.default', color: 'text.primary' }}>
        <Typography variant="h4" sx={{ mb: 3 }}>
          Advanced Physics Analysis
        </Typography>
        
        {!hasData ? (
          <Paper elevation={1} sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary">
              No Analysis Data Available
            </Typography>
            <Typography variant="body1" sx={{ mt: 2, mb: 1 }}>
              This page reads two independent data sources. Run either or both.
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              &ldquo;Run Physics Simulation&rdquo; fills Bubble Collapse.
              &ldquo;Run Selected Theories&rdquo; on the Theory Testbed fills Theory Summary.
            </Typography>
            <Button component={Link} to="/unified-theory?tab=testbed" variant="contained" color="primary">
              Go to Theory Testbed
            </Button>
          </Paper>
        ) : (
          <>
            {/* Which of the two sources is missing, so a half-populated page is not
                mistaken for a complete one. */}
            {hasSimulationData && !hasTheoryData && (
              <Alert
                severity="info"
                sx={{ mb: 2 }}
                action={(
                  <Button component={Link} to="/unified-theory?tab=testbed" size="small" color="inherit">
                    Theory Testbed
                  </Button>
                )}
              >
                Simulation data loaded. Theory Summary and the per-theory observables stay
                empty until you use &ldquo;Run Selected Theories&rdquo; on the Theory Testbed.
              </Alert>
            )}
            {hasTheoryData && !hasSimulationData && (
              <Alert
                severity="info"
                sx={{ mb: 2 }}
                action={(
                  <Button component={Link} to="/unified-theory" size="small" color="inherit">
                    Unified Theory
                  </Button>
                )}
              >
                Theory results loaded. Bubble Collapse stays empty until you use
                &ldquo;Run Physics Simulation&rdquo; on the Unified Theory page.
              </Alert>
            )}
            {observablesBridge && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Observable bridge active: heat, helium proxy, and radiation bound fields are coming from the backend contract.
              </Alert>
            )}
            <Box
              sx={{
                borderBottom: 1,
                borderColor: 'divider',
                mb: 3,
                bgcolor: theme.palette.mode === 'dark' ? '#1e1e1e' : theme.palette.background.paper,
                borderRadius: 1,
                px: 1,
              }}
            >
              <Tabs
                value={activeTab}
                onChange={handleTabChange}
                aria-label="analysis tabs"
                variant="fullWidth"
                sx={{
                  '& .MuiTab-root': {
                    color: theme.palette.mode === 'dark' ? '#90caf9' : theme.palette.text.secondary,
                    textTransform: 'uppercase',
                    fontWeight: 500,
                    minWidth: 0,
                  },
                  '& .MuiTab-root.Mui-selected': {
                    color: theme.palette.primary.main,
                  },
                  '& .MuiTabs-indicator': {
                    backgroundColor: theme.palette.primary.main,
                  },
                }}
              >
                <Tab
                  label="Quantum Tunneling"
                  icon={tabHasData(0) ? <Chip label="data" size="small" color="success" sx={{ height: 18, fontSize: '0.65rem' }} /> : undefined}
                  iconPosition="end"
                />
                <Tab
                  label="Lattice Dynamics"
                  icon={tabHasData(1) ? <Chip label="data" size="small" color="success" sx={{ height: 18, fontSize: '0.65rem' }} /> : undefined}
                  iconPosition="end"
                />
                <Tab
                  label="Bubble Collapse"
                  icon={tabHasData(2) ? <Chip label="data" size="small" color="success" sx={{ height: 18, fontSize: '0.65rem' }} /> : undefined}
                  iconPosition="end"
                />
                <Tab
                  label="Theory Summary"
                  icon={tabHasData(3) ? <Chip label="data" size="small" color="success" sx={{ height: 18, fontSize: '0.65rem' }} /> : undefined}
                  iconPosition="end"
                />
              </Tabs>
            </Box>
            
            <TabPanel value={activeTab} index={0}>
              {renderQuantumTunnelingSection()}
            </TabPanel>
            
            <TabPanel value={activeTab} index={1}>
              {renderLatticeSection()}
            </TabPanel>
            
            <TabPanel value={activeTab} index={2}>
              {renderCollapseSection()}
            </TabPanel>

            <TabPanel value={activeTab} index={3}>
              {renderTheorySummary()}
            </TabPanel>
          </>
        )}
      </Box>
    </AppLayout>
  );
};

export default AdvancedAnalysisPage;