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
  Alert
} from '@mui/material';
import AppLayout from '../components/layout/AppLayout';
import { usePhysics } from '../contexts/PhysicsContext';

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

  const hasData = !!simulationResult || !!theoryResult;
  const perTheory = theoryResult?.per_theory || null;

  const enhancementBreakdown = useMemo(() => {
    return simulationResult?.peak_conditions?.enhancement_breakdown || null;
  }, [simulationResult]);

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
      screenPotentialEV: obs.U_screen_eV ?? obs.screen_potential_eV ?? null,
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
      case 0: return !!(quantumData || screeningData || enhancementBreakdown?.electron_screening);
      case 1: return !!(latticeData || enhancementBreakdown?.phonon_coupling);
      case 2: return !!collapseData;
      case 3: return !!(perTheory && perTheory.length > 0);
      default: return false;
    }
  };
  const renderEnhancementLiteCard = (factorKey, factorLabel) => {
    if (!enhancementBreakdown || enhancementBreakdown[factorKey] == null) return null;
    const val = enhancementBreakdown[factorKey];
    return (
      <Grid size={{ xs: 12, md: 6 }}>
        <Paper elevation={2} sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            {factorLabel} (from Simulation)
          </Typography>
          <Typography variant="body1">
            Enhancement Factor: {formatNumber(val)}
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
    const hasLiteData = !!(enhancementBreakdown?.electron_screening);

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
          <Button component={Link} to="/unified-theory" variant="contained" color="primary">
            Go to Unified Theory
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
          {!quantumData && renderEnhancementLiteCard('quantum_tunneling', 'Quantum Tunneling')}
          {!screeningData && renderEnhancementLiteCard('electron_screening', 'Electron Screening')}
        </Grid>
      </>
    );
  };
  const renderLatticeSection = () => {
    const hasLiteData = !!(enhancementBreakdown?.phonon_coupling);

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
          <Button component={Link} to="/unified-theory" variant="contained" color="primary">
            Go to Unified Theory
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
                <Paper elevation={2} sx={{ p: 2, minHeight: 200 }}>
                  <Typography variant="h6" gutterBottom>Theory Summary</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Hagelstein&#39;s model describes coherent energy transfer between nuclear 
                    and phonon degrees of freedom. A large quantum (~24 MeV) is distributed 
                    across ~10&#8312; phonons, avoiding gamma emission.
                  </Typography>
                </Paper>
              </Grid>
            </>
          ) : (
            <>
              {renderEnhancementLiteCard('phonon_coupling', 'Phonon-Nuclear Coupling')}
              {renderEnhancementLiteCard('casimir_force', 'Casimir Force')}
              {renderEnhancementLiteCard('qed_vacuum', 'QED Vacuum Effects')}
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
          <Button component={Link} to="/unified-theory" variant="contained" color="primary">
            Go to Unified Theory
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
              <Grid container spacing={2}>
                {Object.entries(enhancementBreakdown).map(([mechanism, value]) => (
                  <Grid size={{ xs: 6, md: 3 }} key={mechanism}>
                    <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center' }}>
                      <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
                        {mechanism.replace(/_/g, ' ')}
                      </Typography>
                      <Typography variant="body1" fontWeight={600}>
                        {formatNumber(value)}
                      </Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
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
          <Button component={Link} to="/unified-theory?tab=theories" variant="contained" color="primary">
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
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" sx={{ mb: 3 }}>
          Advanced Physics Analysis
        </Typography>
        
        {!hasData ? (
          <Paper elevation={1} sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary">
              No Simulation Data Available
            </Typography>
            <Typography variant="body1" sx={{ mt: 2 }}>
              Please run a simulation first to see advanced physics analysis.
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Run a simulation from the{' '}
              <Link to="/unified-theory" style={{ color: 'inherit', fontWeight: 600 }}>
                Unified Theory
              </Link>{' '}
              page to generate data for this analysis.
            </Typography>
          </Paper>
        ) : (
          <>
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
              <Tabs
                value={activeTab}
                onChange={handleTabChange}
                aria-label="analysis tabs"
                variant="scrollable"
                scrollButtons="auto"
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