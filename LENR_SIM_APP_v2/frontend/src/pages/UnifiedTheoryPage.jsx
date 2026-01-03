/**
 * UnifiedTheoryPage.jsx
 * 
 * Main simulation page for the Unified LENR Theory framework.
 * Implements the bubble-lattice interaction visualization showing
 * electrodynamic ionic double-layer collapse onto lattice materials.
 */

import React, { useState, useCallback } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Divider,
  Button,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  Alert,
  Snackbar,
  CircularProgress,
  Chip,
  Stack,
  Slider
} from '@mui/material';
import Grid from '@mui/material/Grid';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import InfoIcon from '@mui/icons-material/Info';
import ScienceIcon from '@mui/icons-material/Science';
import BoltIcon from '@mui/icons-material/Bolt';
import ThermostatIcon from '@mui/icons-material/Thermostat';
import BubbleChartIcon from '@mui/icons-material/BubbleChart';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import { Link as RouterLink } from 'react-router-dom';

// Import new unified visualization
import UnifiedBubbleLatticeVisualization from '../components/visualizations/UnifiedBubbleLatticeVisualization';
import ErrorBoundary from '../components/ErrorBoundary';

// API base URL
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// System presets
const SYSTEM_PRESETS = {
  pd_d: {
    name: 'Palladium-Deuterium',
    description: 'Classic LENR system (Fleischmann-Pons)',
    hostMaterial: 'palladium',
    reactant: 'deuterium',
    temperature: 300,
    loadingRatio: 0.9,
    initialBubbleRadius: 3.0,
    drivingPressure: 1.5,
    frequency: 20
  },
  ni_h: {
    name: 'Nickel-Hydrogen',
    description: 'Nickel-Hydrogen LENR system (studied by many researchers including Piantelli, Celani, and others)',
    hostMaterial: 'nickel',
    reactant: 'hydrogen',
    temperature: 500,
    loadingRatio: 0.85,
    initialBubbleRadius: 2.5,
    drivingPressure: 2.0,
    frequency: 25
  },
  ti_d: {
    name: 'Titanium-Deuterium',
    description: 'Alternative host material',
    hostMaterial: 'titanium',
    reactant: 'deuterium',
    temperature: 350,
    loadingRatio: 0.8,
    initialBubbleRadius: 3.5,
    drivingPressure: 1.2,
    frequency: 15
  }
};

// Proton phase colors for charts
const PHASE_COLORS = {
  free: '#3498db',
  screened: '#00ffff',
  capture_ready: '#f1c40f',
  nuclear: '#ff4500'
};

function UnifiedTheoryPage() {
  // State management
  const [selectedSystem, setSelectedSystem] = useState('pd_d');
  const [parameters, setParameters] = useState(SYSTEM_PRESETS.pd_d);
  const [simulationData, setSimulationData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertSeverity, setAlertSeverity] = useState('info');
  const [currentPhase, setCurrentPhase] = useState('EXPANSION');
  const [collapseCount, setCollapseCount] = useState(0);

  // Handle system preset change
  const handleSystemChange = useCallback((systemKey) => {
    setSelectedSystem(systemKey);
    setParameters(SYSTEM_PRESETS[systemKey]);
    setSimulationData(null);
  }, []);

  // Handle parameter changes
  const handleParameterChange = useCallback((param, value) => {
    setParameters(prev => ({ ...prev, [param]: value }));
  }, []);

  // Run simulation via API
  const runSimulation = useCallback(async () => {
    setIsLoading(true);
    setAlertOpen(false);
    
    try {
      // Validate parameters before sending
      if (parameters.loadingRatio < 0 || parameters.loadingRatio > 1) {
        throw new Error('Loading ratio must be between 0 and 1');
      }
      if (parameters.temperature < 0 || parameters.temperature > 2000) {
        throw new Error('Temperature must be between 0 and 2000 K');
      }
      if (parameters.drivingPressure < 0 || parameters.drivingPressure > 10) {
        throw new Error('Driving pressure must be between 0 and 10 bar');
      }
      if (parameters.frequency < 1 || parameters.frequency > 100) {
        throw new Error('Frequency must be between 1 and 100 kHz');
      }
      
      // Try real physics API
      // #region agent log
      const apiUrl = `${API_BASE}/api/unified/bubble-lattice`;
      console.log('[DEBUG] Making API call to:', apiUrl);
      console.log('[DEBUG] API_BASE:', API_BASE);
      
      // First, test if backend is reachable
      try {
        const healthCheck = await fetch(`${API_BASE}/health`);
        console.log('[DEBUG] Backend health check:', healthCheck.status, healthCheck.statusText);
        if (!healthCheck.ok) {
          console.warn('[DEBUG] Backend health check failed:', healthCheck.status);
        }
      } catch (healthError) {
        console.error('[DEBUG] Backend health check error:', healthError);
        console.error('[DEBUG] Backend may not be running on', API_BASE);
      }
      
      fetch('http://127.0.0.1:7242/ingest/25eed4d9-bda7-4fa1-a967-06c14c0e3ae5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'UnifiedTheoryPage.jsx:137',message:'API call attempt',data:{url:apiUrl,method:'POST',apiBase:API_BASE},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bubble: {
            initial_radius_um: parameters.initialBubbleRadius * 3.33,
            driving_pressure_bar: parameters.drivingPressure,
            frequency_khz: parameters.frequency,
            ambient_temperature_k: parameters.temperature
          },
          material: {
            host_material: parameters.hostMaterial,
            reactant: parameters.reactant
          },
          lattice: {
            loading_ratio: parameters.loadingRatio,
            defect_density: 1e16,
            surface_roughness: 5e-9
          },
          num_cycles: 2
        })
      });

      // #region agent log
      console.log('[DEBUG] API response:', {status: response.status, statusText: response.statusText, ok: response.ok, url: response.url});
      fetch('http://127.0.0.1:7242/ingest/25eed4d9-bda7-4fa1-a967-06c14c0e3ae5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'UnifiedTheoryPage.jsx:160',message:'API response received',data:{status:response.status,statusText:response.statusText,ok:response.ok,url:response.url},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      if (response.ok) {
        const data = await response.json();
        setSimulationData(data);
        setAlertMessage('Simulation completed with real physics calculations');
        setAlertSeverity('success');
      } else {
        // Handle specific HTTP status codes
        let errorMessage;
        if (response.status === 404) {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/25eed4d9-bda7-4fa1-a967-06c14c0e3ae5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'UnifiedTheoryPage.jsx:168',message:'404 error detected',data:{status:404,url:response.url},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
          // #endregion
          errorMessage = 'Backend API endpoint not found. Using local calculations.';
        } else if (response.status === 500) {
          errorMessage = 'Backend server error. Using local calculations.';
        } else {
          try {
            const errorData = await response.json();
            errorMessage = errorData.detail || errorData.message || `API error: ${response.status}`;
          } catch {
            errorMessage = `API error: ${response.status} ${response.statusText}`;
          }
        }
        throw new Error(errorMessage);
      }
    } catch (error) {
      // Handle network errors and API failures gracefully
      const errorMessage = error.message || 'Unknown error occurred';
      
      // Only log to console if it's not a 404 (expected when backend is not available)
      if (!errorMessage.includes('404') && !errorMessage.includes('not found')) {
        console.warn('Simulation API unavailable:', errorMessage);
      }
      
      // Fallback to local mock calculations (this is expected behavior)
      try {
        const mockData = generateLocalResults(parameters);
        setSimulationData(mockData);
        
        // Provide user-friendly message
        if (errorMessage.includes('404') || errorMessage.includes('not found')) {
          setAlertMessage('Simulation completed using local calculations (backend API not available)');
          setAlertSeverity('info');
        } else {
          setAlertMessage(`Simulation completed using local calculations. ${errorMessage}`);
        setAlertSeverity('warning');
        }
      } catch (fallbackError) {
        console.error('Fallback calculation failed:', fallbackError);
        setAlertMessage(`Simulation failed: ${fallbackError.message || 'Unknown error'}`);
        setAlertSeverity('error');
      }
    } finally {
      setIsLoading(false);
      setAlertOpen(true);
    }
  }, [parameters]);

  // Generate local fallback results
  const generateLocalResults = (params) => {
    const baseEnhancement = params.loadingRatio > 0.9 ? 1e5 : 1e3;
    const tempFactor = Math.exp(-Math.abs(params.temperature - 400) / 500);
    const compressionRatio = 1 + params.drivingPressure * 5;
    
    // Generate timeline data
    const timeline = [];
    for (let i = 0; i < 50; i++) {
      const t = i / 49;
      let phase, enhancement, radiusFactor;
      
      if (t < 0.4) {
        phase = 'EXPANSION';
        radiusFactor = 1 + 0.3 * Math.sin(t / 0.4 * Math.PI / 2);
        enhancement = baseEnhancement * 0.1;
      } else if (t < 0.55) {
        phase = 'COLLAPSE';
        radiusFactor = 1.3 - 1.15 * ((t - 0.4) / 0.15) ** 2;
        enhancement = baseEnhancement * (1 + 5 * ((t - 0.4) / 0.15));
      } else if (t < 0.6) {
        phase = 'MINIMUM';
        radiusFactor = 0.15;
        enhancement = baseEnhancement * tempFactor;
      } else if (t < 0.7) {
        phase = 'REBOUND';
        radiusFactor = 0.15 + 0.5 * ((t - 0.6) / 0.1);
        enhancement = baseEnhancement * 0.5;
      } else {
        phase = 'RECOVERY';
        radiusFactor = 0.65 + 0.35 * ((t - 0.7) / 0.3);
        enhancement = baseEnhancement * 0.2;
      }
      
      timeline.push({
        normalized_time: t,
        phase,
        enhancement,
        radius_factor: radiusFactor,
        temperature: params.temperature * (1 + (1 / radiusFactor - 1) * 0.3),
        proton_distribution: {
          FREE: phase === 'EXPANSION' || phase === 'RECOVERY' ? 0.7 : 0.2,
          SCREENED: phase === 'COLLAPSE' ? 0.4 : 0.2,
          CAPTURE_READY: phase === 'MINIMUM' ? 0.5 : 0.1,
          NUCLEAR: phase === 'MINIMUM' ? 0.1 : 0
        }
      });
    }
    
    return {
      success: true,
      collapse_results: {
        min_radius_um: params.initialBubbleRadius * 0.15 * 3.33,
        max_temperature_k: params.temperature * compressionRatio ** 1.2,
        max_pressure_bar: 101.325 * compressionRatio ** 4,
        compression_ratio: compressionRatio,
        peak_enhancement: baseEnhancement * tempFactor
      },
      proton_phases: {
        FREE: 0.3,
        SCREENED: 0.35,
        CAPTURE_READY: 0.25,
        NUCLEAR: 0.1
      },
      enhancement_timeline: timeline,
      peak_conditions: {
        temperature_k: params.temperature * compressionRatio ** 1.2,
        pressure_gpa: 0.1 * compressionRatio ** 4,
        enhancement_factor: baseEnhancement * tempFactor
      }
    };
  };

  const handlePhaseChange = useCallback((phase) => {
    setCurrentPhase(phase);
  }, []);

  const handleCollapseEvent = useCallback(() => {
    setCollapseCount(prev => prev + 1);
  }, []);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Prepare chart data
  const getEnhancementChartData = () => {
    if (!simulationData?.enhancement_timeline) return [];
    return simulationData.enhancement_timeline.map(point => ({
      time: (point.normalized_time * 100).toFixed(0) + '%',
      enhancement: Math.log10(Math.max(1, point.enhancement)),
      temperature: point.temperature,
      radius: point.radius_factor * 100
    }));
  };

  const getProtonPhaseChartData = () => {
    if (!simulationData?.enhancement_timeline) return [];
    return simulationData.enhancement_timeline.map(point => ({
      time: (point.normalized_time * 100).toFixed(0) + '%',
      ...point.proton_distribution
    }));
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <BubbleChartIcon color="primary" fontSize="large" />
              Unified Bubble-Lattice LENR Simulation
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Electrodynamic ionic double-layer bubble collapse onto lattice-loaded materials with proton phase transitions
            </Typography>
          </Box>
          <Button
            component={RouterLink}
            to="/theory"
            variant="outlined"
            startIcon={<MenuBookIcon />}
            sx={{ whiteSpace: 'nowrap' }}
          >
            View Theory Paper
          </Button>
        </Box>
      </Box>

      {/* System Selection */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>System Configuration</Typography>
        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
          {Object.entries(SYSTEM_PRESETS).map(([key, preset]) => (
            <Chip
              key={key}
              label={preset.name}
              onClick={() => handleSystemChange(key)}
              color={selectedSystem === key ? 'primary' : 'default'}
              variant={selectedSystem === key ? 'filled' : 'outlined'}
              icon={<ScienceIcon />}
              sx={{ py: 2.5 }}
            />
          ))}
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {SYSTEM_PRESETS[selectedSystem].description}
        </Typography>
      </Paper>

      <Grid container spacing={3}>
        {/* Left Column - Parameters */}
        <Grid size={{ xs: 12, md: 3 }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Parameters</Typography>
            
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                <Typography variant="subtitle2">Loading Ratio: {parameters.loadingRatio}</Typography>
                {parameters.loadingRatio > 0.9 && (
                  <Chip label="High Loading" size="small" color="success" sx={{ fontSize: '0.65rem' }} />
                )}
              </Box>
              <Slider
                value={parameters.loadingRatio}
                onChange={(_, v) => handleParameterChange('loadingRatio', v)}
                min={0.5}
                max={1.0}
                step={0.05}
                marks={[{value: 0.9, label: '0.9'}]}
                disabled={isLoading}
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                {parameters.loadingRatio > 0.9 ? '↑ Higher enhancement expected' : 'Loading affects reaction sites'}
              </Typography>
            </Box>

            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                <Typography variant="subtitle2">Temperature: {parameters.temperature} K</Typography>
                {parameters.temperature > 400 && (
                  <Chip label="High Temp" size="small" color="warning" sx={{ fontSize: '0.65rem' }} />
                )}
              </Box>
              <Slider
                value={parameters.temperature}
                onChange={(_, v) => handleParameterChange('temperature', v)}
                min={200}
                max={800}
                step={10}
                disabled={isLoading}
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                {parameters.temperature > 400 ? '↑ Affects screening length & enhancement' : 'Lower temp = longer screening length'}
              </Typography>
            </Box>

            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                <Typography variant="subtitle2">Driving Pressure: {parameters.drivingPressure} bar</Typography>
                {parameters.drivingPressure > 2.0 && (
                  <Chip label="High Pressure" size="small" color="error" sx={{ fontSize: '0.65rem' }} />
                )}
              </Box>
              <Slider
                value={parameters.drivingPressure}
                onChange={(_, v) => handleParameterChange('drivingPressure', v)}
                min={0.5}
                max={5.0}
                step={0.1}
                disabled={isLoading}
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                {parameters.drivingPressure > 2.0 ? '↑ Faster collapse, higher compression' : 'Controls bubble collapse rate'}
              </Typography>
            </Box>

            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                <Typography variant="subtitle2">Frequency: {parameters.frequency} kHz</Typography>
                <Chip 
                  label={`~${Math.round((1 / parameters.frequency) / 0.02)}s cycle`} 
                  size="small" 
                  color="info" 
                  sx={{ fontSize: '0.65rem' }} 
                />
              </Box>
              <Slider
                value={parameters.frequency}
                onChange={(_, v) => handleParameterChange('frequency', v)}
                min={5}
                max={50}
                step={1}
                disabled={isLoading}
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                Higher frequency = faster cycles (visualization slowed 50x for observation)
              </Typography>
            </Box>

            <Button
              variant="contained"
              color="primary"
              fullWidth
              startIcon={isLoading ? <CircularProgress size={20} /> : <PlayArrowIcon />}
              onClick={runSimulation}
              disabled={isLoading}
              sx={{ mt: 2 }}
            >
              {isLoading ? 'Calculating...' : 'Run Physics Simulation'}
            </Button>

            {/* Live status */}
            <Paper sx={{ p: 1.5, mt: 2, bgcolor: 'action.hover' }}>
              <Typography variant="caption" color="text.secondary">Live Status</Typography>
              <Box sx={{ mt: 1 }}>
                <Chip label={`Phase: ${currentPhase}`} size="small" sx={{ mr: 1 }} />
                <Chip label={`Cycles: ${collapseCount}`} size="small" color="info" />
              </Box>
            </Paper>
          </Paper>
        </Grid>

        {/* Right Column - Visualization */}
        <Grid size={{ xs: 12, md: 9 }}>
          <Paper sx={{ p: 2 }}>
            {/* Results Summary */}
            {simulationData && (
              <Box sx={{ mb: 2 }}>
                <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                  <Chip
                    icon={<BoltIcon />}
                    label={`Peak Enhancement: ${simulationData.peak_conditions?.enhancement_factor?.toExponential(2) || 'N/A'}`}
                    color="primary"
                  />
                  <Chip
                    icon={<ThermostatIcon />}
                    label={`Peak Temp: ${simulationData.collapse_results?.max_temperature_k?.toFixed(0) || 'N/A'} K`}
                    color="warning"
                  />
                  <Chip
                    label={`Compression: ${simulationData.collapse_results?.compression_ratio?.toFixed(1) || 'N/A'}x`}
                    color="success"
                  />
                </Stack>
              </Box>
            )}

            <Tabs value={activeTab} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tab label="3D Visualization" />
              <Tab label="Enhancement Timeline" />
              <Tab label="Proton Phases" />
              <Tab label="Results" />
              <Tab label="Theory" icon={<MenuBookIcon fontSize="small" />} iconPosition="end" />
            </Tabs>

            <Box sx={{ mt: 2, minHeight: 500 }}>
              {activeTab === 0 && (
                <ErrorBoundary
                  fallback={
                    <Alert severity="error" sx={{ mt: 2 }}>
                      <Typography variant="h6">Visualization Error</Typography>
                      <Typography variant="body2">
                        An error occurred while rendering the 3D visualization. 
                        Please try refreshing the page or adjusting the parameters.
                      </Typography>
                    </Alert>
                  }
                >
                  <UnifiedBubbleLatticeVisualization
                    parameters={parameters}
                    simulationData={simulationData}
                    onPhaseChange={handlePhaseChange}
                    onCollapseEvent={handleCollapseEvent}
                    height={550}
                  />
                </ErrorBoundary>
              )}

              {activeTab === 1 && simulationData && (
                <Box sx={{ height: 450 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Enhancement Factor During Collapse Cycle (log10 scale)
                  </Typography>
                  <ResponsiveContainer width="100%" height="90%">
                    <LineChart data={getEnhancementChartData()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="time" />
                      <YAxis yAxisId="left" label={{ value: 'log₁₀(Enhancement)', angle: -90, position: 'insideLeft' }} />
                      <YAxis yAxisId="right" orientation="right" label={{ value: 'Radius %', angle: 90, position: 'insideRight' }} />
                      <RechartsTooltip />
                      <Legend />
                      <Line yAxisId="left" type="monotone" dataKey="enhancement" stroke="#8884d8" name="Enhancement" strokeWidth={2} />
                      <Line yAxisId="right" type="monotone" dataKey="radius" stroke="#82ca9d" name="Bubble Radius %" />
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
              )}

              {activeTab === 2 && simulationData && (
                <Box sx={{ height: 450 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Proton Phase Distribution During Collapse
                  </Typography>
                  <ResponsiveContainer width="100%" height="90%">
                    <LineChart data={getProtonPhaseChartData()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="time" />
                      <YAxis label={{ value: 'Fraction', angle: -90, position: 'insideLeft' }} />
                      <RechartsTooltip />
                      <Legend />
                      <Line type="monotone" dataKey="FREE" stroke={PHASE_COLORS.free} name="Free (EM)" strokeWidth={2} />
                      <Line type="monotone" dataKey="SCREENED" stroke={PHASE_COLORS.screened} name="Screened" strokeWidth={2} />
                      <Line type="monotone" dataKey="CAPTURE_READY" stroke={PHASE_COLORS.capture_ready} name="Capture Ready" strokeWidth={2} />
                      <Line type="monotone" dataKey="NUCLEAR" stroke={PHASE_COLORS.nuclear} name="Nuclear Active" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
              )}

              {activeTab === 3 && simulationData && (
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Paper sx={{ p: 2 }} variant="outlined">
                      <Typography variant="h6" gutterBottom>Collapse Results</Typography>
                      <Divider sx={{ mb: 2 }} />
                      <Box sx={{ display: 'grid', gap: 1 }}>
                        <Typography>Min Radius: <strong>{simulationData.collapse_results?.min_radius_um?.toFixed(2)} μm</strong></Typography>
                        <Typography>Max Temperature: <strong>{simulationData.collapse_results?.max_temperature_k?.toFixed(0)} K</strong></Typography>
                        <Typography>Max Pressure: <strong>{simulationData.collapse_results?.max_pressure_bar?.toFixed(0)} bar</strong></Typography>
                        <Typography>Compression Ratio: <strong>{simulationData.collapse_results?.compression_ratio?.toFixed(1)}x</strong></Typography>
                      </Box>
                    </Paper>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Paper sx={{ p: 2 }} variant="outlined">
                      <Typography variant="h6" gutterBottom>Peak Proton Phases</Typography>
                      <Divider sx={{ mb: 2 }} />
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {simulationData.proton_phases && Object.entries(simulationData.proton_phases).map(([phase, fraction]) => (
                          <Chip
                            key={phase}
                            label={`${phase}: ${(fraction * 100).toFixed(0)}%`}
                            sx={{ bgcolor: PHASE_COLORS[phase.toLowerCase()] || '#888', color: 'white' }}
                          />
                        ))}
                      </Box>
                    </Paper>
                  </Grid>
                  <Grid size={12}>
                    <Alert severity="info">
                      <Typography variant="body2">
                        The visualization shows how ionic double-layer bubbles collapse onto hydrogen-loaded lattice materials.
                        Protons transition through force regimes: <strong>EM → Screened → Weak Capture → Nuclear</strong>.
                        Peak enhancement occurs at minimum bubble radius when compression maximizes field strength.
                      </Typography>
                    </Alert>
                  </Grid>
                </Grid>
              )}

              {activeTab === 4 && (
                <Box>
                  <Alert severity="info" sx={{ mb: 3 }}>
                    <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 1 }}>
                      Unified LENR Theoretical Framework
                    </Typography>
                    <Typography variant="body2">
                      This simulation implements the comprehensive theoretical model integrating Rydberg Matter, 
                      halo electrons, double-layer QED effects, Casimir forces, and quantum tunneling enhancements.
                    </Typography>
                  </Alert>

                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Paper sx={{ p: 2 }} variant="outlined">
                        <Typography variant="h6" gutterBottom>Core Mechanisms</Typography>
                        <Divider sx={{ mb: 2 }} />
                        <Stack spacing={1}>
                          <Chip label="Rydberg Matter - Extended orbitals enable energy localization" size="small" />
                          <Chip label="Halo Electrons - Enhanced nuclear overlap (~10⁻³)" size="small" />
                          <Chip label="Double-Layer QED - Field strengths up to 10⁸ V/m" size="small" />
                          <Chip label="Casimir Effect - Quantum vacuum energy focusing" size="small" />
                          <Chip label="Oppenheimer-Phillips - Deuteron stripping reactions" size="small" />
                        </Stack>
                      </Paper>
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Paper sx={{ p: 2 }} variant="outlined">
                        <Typography variant="h6" gutterBottom>Proton Phase Transitions</Typography>
                        <Divider sx={{ mb: 2 }} />
                        <Stack spacing={1}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ width: 16, height: 16, bgcolor: '#3498db', borderRadius: '50%' }} />
                            <Typography variant="body2"><strong>FREE (EM)</strong> - Normal electromagnetic behavior</Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ width: 16, height: 16, bgcolor: '#00ffff', borderRadius: '50%' }} />
                            <Typography variant="body2"><strong>SCREENED</strong> - Coulomb barrier lowered 10-100 eV</Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ width: 16, height: 16, bgcolor: '#f1c40f', borderRadius: '50%' }} />
                            <Typography variant="body2"><strong>CAPTURE READY</strong> - Weak force coupling (p + e⁻ → n + νₑ)</Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ width: 16, height: 16, bgcolor: '#ff4500', borderRadius: '50%' }} />
                            <Typography variant="body2"><strong>NUCLEAR</strong> - Strong force engagement</Typography>
                          </Box>
                        </Stack>
                      </Paper>
                    </Grid>
                    <Grid size={12}>
                      <Paper sx={{ p: 2, bgcolor: 'action.hover' }} variant="outlined">
                        <Typography variant="h6" gutterBottom>Key Equations</Typography>
                        <Divider sx={{ mb: 2 }} />
                        <Grid container spacing={2}>
                          <Grid size={{ xs: 12, md: 4 }}>
                            <Typography variant="caption" color="text.secondary">Rayleigh-Plesset (Bubble Collapse)</Typography>
                            <Box sx={{ p: 1, bgcolor: 'background.paper', borderRadius: 1, fontFamily: 'monospace', fontSize: '0.75rem' }}>
                              RR̈ + 3/2Ṙ² = (1/ρ)[P_b - P_∞ - 2σ/R + ε₀E²/2]
                            </Box>
                          </Grid>
                          <Grid size={{ xs: 12, md: 4 }}>
                            <Typography variant="caption" color="text.secondary">Tunneling Probability</Typography>
                            <Box sx={{ p: 1, bgcolor: 'background.paper', borderRadius: 1, fontFamily: 'monospace', fontSize: '0.75rem' }}>
                              P = exp(-2/ℏ ∫√[2m(V-E)]dx)
                            </Box>
                          </Grid>
                          <Grid size={{ xs: 12, md: 4 }}>
                            <Typography variant="caption" color="text.secondary">Halo Electron Overlap</Typography>
                            <Box sx={{ p: 1, bgcolor: 'background.paper', borderRadius: 1, fontFamily: 'monospace', fontSize: '0.75rem' }}>
                              P_overlap = (1/πa³)exp(-2r₀/a) ≈ 10⁻³
                            </Box>
                          </Grid>
                        </Grid>
                      </Paper>
                    </Grid>
                  </Grid>

                  <Box sx={{ mt: 3, textAlign: 'center' }}>
                    <Button
                      component={RouterLink}
                      to="/theory"
                      variant="contained"
                      size="large"
                      startIcon={<MenuBookIcon />}
                    >
                      View Complete Theory Documentation
                    </Button>
                    <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 1 }}>
                      Full theoretical framework including historical context, computational methods, and experimental validation
                    </Typography>
                  </Box>
                </Box>
              )}

              {!simulationData && activeTab !== 0 && activeTab !== 4 && (
                <Box sx={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 2 }}>
                  <ScienceIcon sx={{ fontSize: 64, color: 'text.disabled' }} />
                  <Typography color="text.secondary">Run a simulation to see detailed results</Typography>
                </Box>
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      <Snackbar open={alertOpen} autoHideDuration={4000} onClose={() => setAlertOpen(false)}>
        <Alert onClose={() => setAlertOpen(false)} severity={alertSeverity} sx={{ width: '100%' }}>
          {alertMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
}

export default UnifiedTheoryPage;
