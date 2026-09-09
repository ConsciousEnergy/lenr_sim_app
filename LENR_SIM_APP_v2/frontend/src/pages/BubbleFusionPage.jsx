import React, { useState, useCallback } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Paper,
  Alert,
  Divider,
  Chip,
  Button,
  useTheme,
  CircularProgress,
  Snackbar
} from '@mui/material';
import Grid from '@mui/material/Grid';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import DownloadIcon from '@mui/icons-material/Download';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';

// Import our custom components
import BubbleFusionVisualizer from '../components/visualization/BubbleFusionVisualizer';
import BubbleFusionParameterControls from '../components/controls/BubbleFusionParameterControls';
import { API_BASE_URL } from '../config/api';

// API base URL
const API_BASE = API_BASE_URL;

/** First finite number in `values`, or null. Never invent a physics default. */
export function pickFiniteNumber(...values) {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
  }
  return null;
}

/**
 * Map POST /api/physics/bubble-fusion JSON onto the page model.
 * Do not default missing enhancement to 1e13 (or any other ceiling).
 */
export function mapBubbleFusionApiResults(apiResults) {
  const collapse = apiResults?.collapse_results || {};
  // Engine reports GPa / Pa; legacy mocks used bar. Prefer engine units.
  const maxPressureGpa = pickFiniteNumber(
    collapse.max_pressure_gpa,
    apiResults.max_pressure_gpa,
    typeof collapse.max_pressure_pa === 'number' ? collapse.max_pressure_pa / 1e9 : null,
  );
  const maxPressureBar = pickFiniteNumber(
    apiResults.peak_pressure_bar,
    collapse.max_pressure_bar,
    typeof maxPressureGpa === 'number' ? maxPressureGpa * 1e4 : null,
    apiResults.max_pressure,
  );
  const collapseTimeS = pickFiniteNumber(
    apiResults.collapse_time_s,
    collapse.collapse_time_s,
    typeof collapse.collapse_time_ns === 'number' ? collapse.collapse_time_ns / 1e9 : null,
    apiResults.collapse_duration,
  );
  return {
    maxTemperature: pickFiniteNumber(
      apiResults.peak_temperature_k,
      collapse.max_temperature_k,
      apiResults.max_temperature,
    ),
    maxPressure: maxPressureBar,
    maxPressureGpa,
    minRadius: pickFiniteNumber(
      apiResults.min_radius_um,
      collapse.min_radius_um,
      apiResults.minimum_radius,
    ),
    collapseTime: collapseTimeS,
    energyRelease: pickFiniteNumber(apiResults.energy_release_j, apiResults.energy),
    fusionProbability: pickFiniteNumber(
      apiResults.fusion_probability,
      collapse.fusion_probability,
    ),
    enhancementFactor: pickFiniteNumber(
      apiResults.enhancement_factor,
      collapse.peak_enhancement,
      apiResults.peak_enhancement,
    ),
    neutronYield: pickFiniteNumber(apiResults.neutron_yield, collapse.neutron_yield_estimate),
    compressionRatio: pickFiniteNumber(
      collapse.compression_ratio,
      apiResults.compression_ratio,
    ),
    peakVelocityKmS: pickFiniteNumber(
      collapse.peak_velocity_km_s,
      apiResults.peak_velocity_km_s,
    ),
    rayleighPlesset: apiResults.rayleigh_plesset_dynamics,
    isLocalFallback: false,
  };
}

/**
 * Real physics API client for bubble fusion calculations
 */
const bubbleFusionAPI = {
  async simulate(params) {
    const response = await fetch(`${API_BASE}/api/physics/bubble-fusion`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        initial_radius_um: params.initialRadius || 10.0,
        acoustic_pressure_bar: params.drivingPressureAmplitude || 1.2,
        frequency_khz: params.frequency || 20.0,
        ambient_pressure_bar: params.ambientPressure || 1.0,
        ambient_temperature_k: params.ambientTemperature || 298.0,
        fluid_type: params.fluidType || 'water',
        gas_type: params.gasType || 'deuterium',
        gas_fraction: params.gasFraction || 0.8
      })
    });
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return response.json();
  }
};

const BubbleFusionPage = () => {
  const _theme = useTheme();
  
  // State for simulation parameters
  const [parameters, setParameters] = useState({
    // Bubble parameters
    initialRadius: 10.0, // μm
    drivingPressureAmplitude: 1.2, // bar
    frequency: 20, // kHz
    ambientPressure: 1.0, // bar
    ambientTemperature: 298, // K
    fluidType: 'water',
    
    // Gas parameters
    gasType: 'deuterium',
    gasFraction: 0.8, // fraction of dissolved gas
    
    // Visualization options (pressure rings default off — they obscure radius/phase HUD)
    showPressureField: false,
    showTemperatureField: true,
    showCollapse: true,
    
    // Simulation parameters
    timeStepSize: 1.0, // ns
    totalSimulationTime: 1.0 // μs
  });
  
  // State for calculation results
  const [results, setResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [_error, setError] = useState(null);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertSeverity, setAlertSeverity] = useState('success');
  
  // Handle parameter changes
  const handleParameterChange = useCallback((newParams) => {
    setParameters(prevParams => ({
      ...prevParams,
      ...newParams
    }));
  }, []);
  
  // Run simulation
  const runSimulation = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Try real physics API first
      try {
        const apiResults = await bubbleFusionAPI.simulate(parameters);
        setResults(mapBubbleFusionApiResults(apiResults));
        setAlertMessage('Simulation completed using real physics calculations');
        setAlertSeverity('success');
        setAlertOpen(true);
        
      } catch (apiError) {
        console.warn('Real bubble fusion API unavailable, using fallback:', apiError.message);
        
        // Fallback to physics-based mock calculations
        const P_ratio = parameters.drivingPressureAmplitude / parameters.ambientPressure;
        const compressionRatio = Math.pow(P_ratio, 0.4);
        const maxTemp = parameters.ambientTemperature * Math.pow(compressionRatio, 1.4);
        
        const fallbackResults = {
          maxTemperature: maxTemp,
          maxPressure: parameters.ambientPressure * Math.pow(compressionRatio, 1.4) * 1000,
          maxPressureGpa: null,
          minRadius: parameters.initialRadius / compressionRatio,
          collapseTime: 1e-6 / (parameters.frequency * 1000),
          energyRelease: 4/3 * Math.PI * Math.pow(parameters.initialRadius * 1e-6, 3) * 
                         parameters.ambientPressure * 1e5 * (compressionRatio - 1) * 1e-12,
          fusionProbability: null,
          enhancementFactor: null,
          neutronYield: null,
          compressionRatio,
          peakVelocityKmS: null,
          isLocalFallback: true,
        };
        
        setResults(fallbackResults);
        setAlertMessage(
          'Backend unreachable. Schematic local fallback only — not physics-engine output. Do not cite these numbers.',
        );
        setAlertSeverity('warning');
        setAlertOpen(true);
      }
      
    } catch (err) {
      setError(err.message || 'An error occurred during simulation');
      setAlertMessage('Simulation failed: ' + (err.message || 'Unknown error'));
      setAlertSeverity('error');
      setAlertOpen(true);
    } finally {
      setIsLoading(false);
    }
  }, [parameters]);
  
  // Handle probability calculation from visualizer
  const handleProbabilityCalculated = useCallback((probability) => {
    if (!results) {
      // If we don't have full results yet, create a partial result
      setResults(prev => ({
        ...prev,
        fusionProbability: probability,
      }));
    }
  }, [results]);
  
  // Download results as JSON
  const handleDownloadResults = () => {
    if (!results) return;
    
    const data = {
      parameters,
      results,
      timestamp: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `bubble-fusion-data-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  const handleCloseAlert = () => {
    setAlertOpen(false);
  };
  
  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Acoustic Cavitation Fusion Simulation
        </Typography>
        <Typography variant="subtitle1" color="textSecondary" gutterBottom>
          Interactive simulation of sonofusion (bubble fusion) phenomenon
        </Typography>
        <Divider sx={{ my: 2 }} />
      </Box>
      
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 4 }}>
          <BubbleFusionParameterControls 
            initialValues={parameters}
            onChange={handleParameterChange}
          />
          
          <Button
            variant="contained"
            color="primary"
            startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <PlayArrowIcon />}
            onClick={runSimulation}
            disabled={isLoading}
            fullWidth
            sx={{ mt: 2 }}
          >
            {isLoading ? 'Running...' : 'Run Simulation'}
          </Button>
          
          {results && (
            <Paper sx={{ p: 2, mt: 2 }}>
              <Typography variant="h6" gutterBottom>
                Simulation Results
              </Typography>
              
              <Box sx={{ mb: 1 }}>
                <Typography variant="body2" color="textSecondary">
                  Maximum Temperature:
                </Typography>
                <Typography variant="h6" color="primary">
                  {results.maxTemperature?.toLocaleString() || 'N/A'} K
                </Typography>
              </Box>
              
              <Box sx={{ mb: 1 }}>
                <Typography variant="body2" color="textSecondary">
                  Maximum Pressure:
                </Typography>
                <Typography variant="h6" color="primary">
                  {results.maxPressureGpa != null
                    ? `${Number(results.maxPressureGpa).toFixed(2)} GPa`
                    : results.maxPressure != null
                      ? `${Number(results.maxPressure).toLocaleString()} bar`
                      : 'N/A'}
                </Typography>
              </Box>
              
              <Box sx={{ mb: 1 }}>
                <Typography variant="body2" color="textSecondary">
                  Minimum Radius:
                </Typography>
                <Typography variant="h6" color="primary">
                  {results.minRadius?.toFixed(3) || 'N/A'} μm
                </Typography>
              </Box>

              <Box sx={{ mb: 1 }}>
                <Typography variant="body2" color="textSecondary">
                  Compression Ratio:
                </Typography>
                <Typography variant="h6" color="primary">
                  {results.compressionRatio != null
                    ? `${Number(results.compressionRatio).toFixed(1)}×`
                    : 'N/A'}
                </Typography>
              </Box>

              <Box sx={{ mb: 1 }}>
                <Typography variant="body2" color="textSecondary">
                  Peak Collapse Velocity:
                </Typography>
                <Typography variant="h6" color="primary">
                  {results.peakVelocityKmS != null
                    ? `${Number(results.peakVelocityKmS).toFixed(2)} km/s`
                    : 'N/A'}
                </Typography>
              </Box>
              
              <Divider sx={{ my: 1 }} />
              <Typography variant="body2" sx={{ mt: 1 }}>
                Fusion Parameters:
              </Typography>
              
              {results.isLocalFallback && (
                <Alert severity="warning" sx={{ mt: 1, mb: 1 }}>
                  Schematic fallback — not a laboratory measurement and not the physics engine.
                  Title and metrics must not be read as “real physics” while this banner is shown.
                </Alert>
              )}
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                <Chip 
                  label={
                    results.enhancementFactor != null
                      ? `Enhancement: ${Number(results.enhancementFactor).toExponential(2)}x`
                      : 'Enhancement: not provided'
                  }
                  color={results.enhancementFactor != null ? 'primary' : 'default'}
                  size="small" 
                  variant="outlined"
                />
                <Chip 
                  label={`Probability: ${results.fusionProbability?.toExponential(2) || 'N/A'}`} 
                  color="secondary" 
                  size="small" 
                  variant="outlined"
                />
                {results.neutronYield != null && (
                  <Chip 
                    label={`Neutrons: ${Number(results.neutronYield).toFixed(2)}/collapse`} 
                    color={results.neutronYield > 0 ? "success" : "default"} 
                    size="small"
                  />
                )}
              </Box>
              
              <Button 
                variant="outlined" 
                startIcon={<DownloadIcon />} 
                size="small"
                onClick={handleDownloadResults}
                fullWidth
                sx={{ mt: 2 }}
              >
                Download Results
              </Button>
            </Paper>
          )}
          
          <Paper sx={{ p: 2, mt: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <InfoOutlinedIcon color="info" sx={{ mr: 1 }} />
              <Typography variant="subtitle2">
                About Bubble Fusion
              </Typography>
            </Box>
            <Typography variant="body2" paragraph>
              Bubble fusion (sonofusion) is a proposed form of nuclear fusion that uses acoustic waves to 
              induce rapid compression and heating of gas bubbles in a liquid. This creates extreme conditions 
              inside the collapsing bubbles that may potentially overcome the Coulomb barrier for fusion.
            </Typography>
            <Typography variant="body2">
              When bubbles collapse, temperatures can briefly reach millions of degrees and pressures can 
              exceed thousands of atmospheres. This phenomena, called sonoluminescence when light is emitted, 
              might create conditions suitable for nuclear fusion reactions under specific circumstances.
            </Typography>
          </Paper>
        </Grid>
        
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <BubbleFusionVisualizer
              initialRadius={parameters.initialRadius}
              drivingPressureAmplitude={parameters.drivingPressureAmplitude}
              frequency={parameters.frequency}
              showPressureField={parameters.showPressureField}
              showTemperatureField={parameters.showTemperatureField}
              showCollapse={parameters.showCollapse}
              width={800}
              height={500}
              onRenderComplete={handleProbabilityCalculated}
            />
            
            <Box sx={{ mt: 2 }}>
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  This simulation models acoustic cavitation using the Rayleigh-Plesset equation modified to account
                  for compressibility effects. The model calculates conditions inside the bubble at the moment of collapse
                  and estimates fusion probabilities based on the achieved temperatures and pressures.
                </Typography>
              </Alert>
            </Box>
          </Paper>
        </Grid>
      </Grid>
      
      <Snackbar
        open={alertOpen}
        autoHideDuration={6000}
        onClose={handleCloseAlert}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseAlert} severity={alertSeverity}>
          {alertMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default BubbleFusionPage; 