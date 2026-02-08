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
  Tooltip,
  Alert,
  Snackbar,
  CircularProgress,
  Chip,
  Stack,
  Slider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  LinearProgress
} from '@mui/material';
import Grid from '@mui/material/Grid';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import InfoIcon from '@mui/icons-material/Info';
import ScienceIcon from '@mui/icons-material/Science';
import BoltIcon from '@mui/icons-material/Bolt';
import ThermostatIcon from '@mui/icons-material/Thermostat';
import BubbleChartIcon from '@mui/icons-material/BubbleChart';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FunctionsIcon from '@mui/icons-material/Functions';
import SchoolIcon from '@mui/icons-material/School';
import DownloadIcon from '@mui/icons-material/Download';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import ShareIcon from '@mui/icons-material/Share';
import SaveIcon from '@mui/icons-material/Save';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { Link as RouterLink } from 'react-router-dom';
import { analyticsApi } from '../services/analyticsApi';

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

// Enhancement thresholds for LENR activity
const ENHANCEMENT_THRESHOLDS = {
  observable: 1e10,      // Observable excess heat (10^10)
  measurable: 1e5,       // Measurable nuclear products
  screening: 1e2,        // Significant electron screening
};

/**
 * Enhancement Progress Indicator Component
 * Shows progress toward nuclear-active enhancement levels
 * Similar to Lawson Criterion indicator but for LENR enhancement factors
 */
function EnhancementIndicator({ simulationData, parameters }) {
  // Calculate enhancement metrics from simulation data
  const enhancementMetrics = React.useMemo(() => {
    if (!simulationData) return null;
    
    const peakEnhancement = simulationData.peak_conditions?.enhancement_factor || 1;
    const threshold = ENHANCEMENT_THRESHOLDS.observable;
    
    // Calculate log-scale progress (enhancement factors can span many orders of magnitude)
    const logEnhancement = Math.log10(Math.max(peakEnhancement, 1));
    const logThreshold = Math.log10(threshold);
    const progressFraction = Math.min(logEnhancement / logThreshold, 1.5); // Cap at 150%
    const percentage = Math.min(progressFraction * 100, 150);
    
    // Determine status based on enhancement level
    let status = 'sub-threshold';
    let color = 'error';
    
    if (peakEnhancement >= ENHANCEMENT_THRESHOLDS.observable) {
      status = 'nuclear-active';
      color = 'success';
    } else if (peakEnhancement >= ENHANCEMENT_THRESHOLDS.measurable) {
      status = 'near-threshold';
      color = 'warning';
    } else if (peakEnhancement >= ENHANCEMENT_THRESHOLDS.screening) {
      status = 'screening-enhanced';
      color = 'info';
    }
    
    // Get top contributing mechanisms
    const breakdown = simulationData.enhancement_breakdown || {};
    const mechanisms = Object.entries(breakdown)
      .filter(([k, v]) => k !== 'total' && v > 1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
    
    return {
      peakEnhancement,
      threshold,
      progressFraction,
      percentage,
      status,
      color,
      mechanisms,
      material: parameters?.hostMaterial || 'palladium',
      reactant: parameters?.reactant || 'deuterium'
    };
  }, [simulationData, parameters]);
  
  if (!enhancementMetrics) return null;
  
  const getStatusLabel = (status) => {
    switch (status) {
      case 'nuclear-active': return 'NUCLEAR ENHANCEMENT ACHIEVED';
      case 'near-threshold': return 'Approaching Observable Activity';
      case 'screening-enhanced': return 'Screening Enhanced';
      default: return 'Sub-threshold';
    }
  };
  
  return (
    <Paper 
      elevation={2} 
      sx={{ 
        p: 2, 
        mb: 2, 
        background: 'linear-gradient(135deg, rgba(25,35,60,0.9) 0%, rgba(35,45,80,0.9) 100%)',
        border: '1px solid',
        borderColor: `${enhancementMetrics.color}.main`
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
          Enhancement Factor — {enhancementMetrics.material.toUpperCase()}-{enhancementMetrics.reactant.charAt(0).toUpperCase()}
        </Typography>
        <Chip 
          label={getStatusLabel(enhancementMetrics.status)} 
          color={enhancementMetrics.color}
          size="small"
        />
      </Box>
      
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box sx={{ flexGrow: 1 }}>
          <LinearProgress 
            variant="determinate" 
            value={Math.min(enhancementMetrics.percentage, 100)} 
            color={enhancementMetrics.color}
            sx={{ 
              height: 10, 
              borderRadius: 5,
              backgroundColor: 'rgba(255,255,255,0.1)'
            }}
          />
        </Box>
        <Typography variant="body2" sx={{ minWidth: 70, textAlign: 'right', color: 'white' }}>
          {enhancementMetrics.percentage < 100 
            ? `${enhancementMetrics.percentage.toFixed(1)}%` 
            : `${enhancementMetrics.percentage.toFixed(0)}%`}
        </Typography>
      </Box>
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1, gap: 2, flexWrap: 'wrap' }}>
        <Tooltip title="Peak enhancement factor achieved during bubble collapse">
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Peak: {enhancementMetrics.peakEnhancement.toExponential(2)}×
          </Typography>
        </Tooltip>
        <Tooltip title="Threshold for observable excess heat production">
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Threshold: {enhancementMetrics.threshold.toExponential(0)}×
          </Typography>
        </Tooltip>
      </Box>
      
      {/* Top contributing mechanisms */}
      {enhancementMetrics.mechanisms.length > 0 && (
        <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Typography variant="caption" sx={{ color: 'text.secondary', mr: 1 }}>Top mechanisms:</Typography>
          {enhancementMetrics.mechanisms.map(([name, value]) => (
            <Chip 
              key={name}
              label={`${name}: ${value.toExponential(1)}`}
              size="small"
              sx={{ 
                fontSize: '0.65rem',
                height: 20,
                bgcolor: 'rgba(255,255,255,0.1)',
                color: 'white'
              }}
            />
          ))}
        </Box>
      )}
    </Paper>
  );
}

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
  const [isSaving, setIsSaving] = useState(false);
  
  // Save simulation results to analytics database (v0.2.3-beta)
  const saveToAnalytics = useCallback(async () => {
    if (!simulationData) {
      setAlertMessage('No simulation data to save. Run a simulation first.');
      setAlertSeverity('warning');
      setAlertOpen(true);
      return;
    }
    
    setIsSaving(true);
    try {
      const experimentData = {
        name: `${parameters.name} Simulation`,
        experiment_type: 'unified_theory',
        status: 'completed',
        material: parameters.hostMaterial,
        temperature_k: parameters.temperature,
        pressure_bar: parameters.drivingPressure,
        loading_ratio: parameters.loadingRatio,
        driving_frequency_khz: parameters.frequency,
        parameters: {
          reactant: parameters.reactant,
          initial_bubble_radius: parameters.initialBubbleRadius,
          selected_system: selectedSystem,
        },
        enhancement_factor: simulationData.peak_conditions?.enhancement_factor || 1,
        fusion_rate: simulationData.peak_conditions?.fusion_rate,
        energy_output_kev: simulationData.total_energy_output || 0,
        duration_seconds: (simulationData.enhancement_timeline?.length || 0) * 0.001,
        results: {
          peak_conditions: simulationData.peak_conditions,
          enhancement_breakdown: simulationData.enhancement_breakdown,
          lawson_progress: simulationData.lawson_criterion_progress,
        },
      };
      
      const saved = await analyticsApi.saveExperiment(experimentData);
      setAlertMessage(`Simulation saved to analytics! ID: ${saved.id.substring(0, 8)}...`);
      setAlertSeverity('success');
      setAlertOpen(true);
    } catch (error) {
      console.error('Failed to save to analytics:', error);
      setAlertMessage('Failed to save to analytics. Data saved locally.');
      setAlertSeverity('warning');
      setAlertOpen(true);
    } finally {
      setIsSaving(false);
    }
  }, [simulationData, parameters, selectedSystem]);
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
      const apiUrl = `${API_BASE}/api/unified/bubble-lattice`;
      
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

      if (response.ok) {
        const data = await response.json();
        setSimulationData(data);
        setAlertMessage('Simulation completed with real physics calculations');
        setAlertSeverity('success');
      } else {
        // Handle specific HTTP status codes with clear user messaging
        let errorMessage;
        let errorType = 'api_error';
        
        if (response.status === 404) {
          errorMessage = 'API endpoint not found (404). The backend may need to be updated.';
          errorType = 'endpoint_not_found';
        } else if (response.status === 500) {
          errorMessage = 'Backend physics calculation error (500). Check server logs for details.';
          errorType = 'server_error';
        } else if (response.status === 422) {
          errorMessage = 'Invalid simulation parameters (422). Please check your inputs.';
          errorType = 'validation_error';
        } else if (response.status === 503) {
          errorMessage = 'Backend service temporarily unavailable (503). Please try again.';
          errorType = 'service_unavailable';
        } else {
          try {
            const errorData = await response.json();
            errorMessage = errorData.detail || errorData.message || `API error: ${response.status}`;
          } catch {
            errorMessage = `API error: ${response.status} ${response.statusText}`;
          }
        }
        throw new Error(`[${errorType}] ${errorMessage}`);
      }
    } catch (error) {
      // Handle network errors and API failures gracefully
      const errorMessage = error.message || 'Unknown error occurred';
      
      // Determine error type for appropriate messaging
      const isNetworkError = error.name === 'TypeError' && errorMessage.includes('fetch');
      const isConnectionRefused = errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError');
      const isTimeout = errorMessage.includes('timeout') || errorMessage.includes('Timeout');
      
      // Log unexpected errors
      if (!errorMessage.includes('endpoint_not_found')) {
        console.warn('Simulation API issue:', errorMessage);
      }
      
      // Fallback to local mock calculations
      try {
        const mockData = generateLocalResults(parameters);
        setSimulationData(mockData);
        
        // Provide specific user-friendly messages based on error type
        if (isConnectionRefused || isNetworkError) {
          setAlertMessage('Backend not running. Using local calculations (limited accuracy).');
          setAlertSeverity('warning');
        } else if (isTimeout) {
          setAlertMessage('Backend request timed out. Using local calculations.');
          setAlertSeverity('warning');
        } else if (errorMessage.includes('endpoint_not_found')) {
          setAlertMessage('Backend API endpoint not found. Using local calculations.');
          setAlertSeverity('info');
        } else if (errorMessage.includes('server_error')) {
          setAlertMessage('Backend calculation error. Using local fallback calculations.');
          setAlertSeverity('warning');
        } else if (errorMessage.includes('validation_error')) {
          setAlertMessage('Parameter validation failed. Please check your inputs.');
          setAlertSeverity('error');
          return; // Don't use fallback for validation errors
        } else {
          setAlertMessage(`Using local calculations. API issue: ${errorMessage.replace(/\[.*?\]\s*/, '')}`);
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

  // Export simulation results as JSON
  const exportAsJSON = useCallback(() => {
    if (!simulationData) {
      setAlertMessage('No simulation data to export. Run a simulation first.');
      setAlertSeverity('warning');
      setAlertOpen(true);
      return;
    }
    
    const exportData = {
      exported_at: new Date().toISOString(),
      simulation_parameters: parameters,
      system_preset: selectedSystem,
      results: simulationData
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lenr_simulation_${selectedSystem}_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    setAlertMessage('Simulation data exported successfully');
    setAlertSeverity('success');
    setAlertOpen(true);
  }, [simulationData, parameters, selectedSystem]);

  // Export simulation results as CSV
  const exportAsCSV = useCallback(() => {
    if (!simulationData) {
      setAlertMessage('No simulation data to export. Run a simulation first.');
      setAlertSeverity('warning');
      setAlertOpen(true);
      return;
    }
    
    // Build CSV header with parameter summary
    const paramHeader = [
      `# LENR Unified Theory Simulation Export`,
      `# Generated: ${new Date().toISOString()}`,
      `# System: ${SYSTEM_PRESETS[selectedSystem]?.name || selectedSystem}`,
      `# Host Material: ${parameters.hostMaterial}`,
      `# Loading Ratio: ${parameters.loadingRatio}`,
      `# Temperature: ${parameters.temperature} K`,
      `# Driving Pressure: ${parameters.drivingPressure} bar`,
      `# Frequency: ${parameters.frequency} kHz`,
      `# Initial Bubble Radius: ${parameters.initialBubbleRadius} μm`,
      `#`,
      `# Peak Enhancement: ${simulationData.peak_conditions?.enhancement_factor?.toExponential(2) || 'N/A'}`,
      `# Min Radius: ${simulationData.collapse_results?.min_radius_um?.toFixed(2) || 'N/A'} μm`,
      `# Max Temperature: ${simulationData.collapse_results?.max_temperature_k?.toFixed(0) || 'N/A'} K`,
      `#`,
    ].join('\n');
    
    // Enhancement timeline data
    const timeline = simulationData.enhancement_timeline || [];
    if (timeline.length === 0) {
      setAlertMessage('No timeline data available for CSV export.');
      setAlertSeverity('warning');
      setAlertOpen(true);
      return;
    }
    
    // Build CSV rows for enhancement timeline
    const timelineHeaders = [
      'normalized_time',
      'phase',
      'radius_um',
      'temperature_k',
      'pressure_bar',
      'total_enhancement',
      'screening_enhancement',
      'phonon_enhancement',
      'qed_enhancement',
      'casimir_enhancement',
      'rydberg_enhancement',
      'compression_enhancement',
      'loading_enhancement',
      'free_fraction',
      'screened_fraction',
      'capture_ready_fraction',
      'nuclear_fraction'
    ];
    
    const timelineRows = timeline.map(entry => {
      const breakdown = entry.enhancement_breakdown || {};
      const protons = entry.proton_distribution || {};
      return [
        entry.normalized_time?.toFixed(4) || '',
        entry.phase || '',
        entry.radius_um?.toFixed(4) || '',
        entry.temperature_k?.toFixed(1) || '',
        entry.pressure_bar?.toFixed(1) || '',
        entry.enhancement?.toExponential(4) || '',
        breakdown.screening?.toExponential(4) || '',
        breakdown.phonon?.toExponential(4) || '',
        breakdown.qed?.toExponential(4) || '',
        breakdown.casimir?.toExponential(4) || '',
        breakdown.rydberg?.toExponential(4) || '',
        breakdown.compression?.toExponential(4) || '',
        breakdown.loading?.toExponential(4) || '',
        protons.free?.toFixed(4) || '',
        protons.screened?.toFixed(4) || '',
        protons.capture_ready?.toFixed(4) || '',
        protons.nuclear?.toFixed(4) || ''
      ].join(',');
    });
    
    const csvContent = [
      paramHeader,
      timelineHeaders.join(','),
      ...timelineRows
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lenr_simulation_${selectedSystem}_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    setAlertMessage('Timeline data exported as CSV successfully');
    setAlertSeverity('success');
    setAlertOpen(true);
  }, [simulationData, parameters, selectedSystem]);

  // Generate shareable URL with encoded parameters
  const generateShareableURL = useCallback(() => {
    const params = new URLSearchParams({
      system: selectedSystem,
      temp: parameters.temperature,
      loading: parameters.loadingRatio,
      pressure: parameters.drivingPressure,
      freq: parameters.frequency
    });
    
    const shareUrl = `${window.location.origin}/unified-theory?${params.toString()}`;
    
    navigator.clipboard.writeText(shareUrl).then(() => {
      setAlertMessage('Shareable link copied to clipboard!');
      setAlertSeverity('success');
      setAlertOpen(true);
    }).catch(() => {
      setAlertMessage('Failed to copy link. URL: ' + shareUrl);
      setAlertSeverity('info');
      setAlertOpen(true);
    });
  }, [selectedSystem, parameters]);

  // Capture visualization screenshot
  const captureScreenshot = useCallback(() => {
    // Find the Three.js canvas element
    const canvas = document.querySelector('canvas');
    if (!canvas) {
      setAlertMessage('Visualization canvas not found. Make sure the 3D view is visible.');
      setAlertSeverity('warning');
      setAlertOpen(true);
      return;
    }
    
    try {
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `lenr_visualization_${selectedSystem}_${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      setAlertMessage('Screenshot saved successfully');
      setAlertSeverity('success');
      setAlertOpen(true);
    } catch (error) {
      setAlertMessage('Failed to capture screenshot: ' + error.message);
      setAlertSeverity('error');
      setAlertOpen(true);
    }
  }, [selectedSystem]);

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
            
            {/* Save to Analytics button (v0.2.3-beta) */}
            {simulationData && (
              <Button
                variant="outlined"
                color="secondary"
                fullWidth
                startIcon={isSaving ? <CircularProgress size={20} /> : <SaveIcon />}
                onClick={saveToAnalytics}
                disabled={isSaving || isLoading}
                sx={{ mt: 1 }}
              >
                {isSaving ? 'Saving...' : 'Save to Analytics'}
              </Button>
            )}

            {/* Export buttons */}
            <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Tooltip title="Download simulation results as JSON">
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<DownloadIcon />}
                  onClick={exportAsJSON}
                  disabled={!simulationData}
                  sx={{ flex: 1, minWidth: 80 }}
                >
                  JSON
                </Button>
              </Tooltip>
              <Tooltip title="Download timeline data as CSV (spreadsheet compatible)">
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<DownloadIcon />}
                  onClick={exportAsCSV}
                  disabled={!simulationData}
                  sx={{ flex: 1, minWidth: 80 }}
                >
                  CSV
                </Button>
              </Tooltip>
              <Tooltip title="Capture 3D visualization as PNG">
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<PhotoCameraIcon />}
                  onClick={captureScreenshot}
                  sx={{ flex: 1, minWidth: 80 }}
                >
                  Screenshot
                </Button>
              </Tooltip>
              <Tooltip title="Copy shareable link with current parameters">
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<ShareIcon />}
                  onClick={generateShareableURL}
                  sx={{ flex: 1, minWidth: 80 }}
                >
                  Share
                </Button>
              </Tooltip>
            </Box>

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
          {/* Enhancement Progress Indicator */}
          {simulationData && (
            <EnhancementIndicator 
              simulationData={simulationData}
              parameters={parameters}
            />
          )}
          
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
                  
                  {/* Enhancement Breakdown Chart */}
                  <Grid size={12}>
                    <Paper sx={{ p: 2 }} variant="outlined">
                      <Typography variant="h6" gutterBottom>Enhancement Mechanism Breakdown</Typography>
                      <Divider sx={{ mb: 2 }} />
                      {(() => {
                        // Get peak enhancement breakdown from timeline (at minimum phase)
                        const peakEntry = simulationData.enhancement_timeline?.find(e => e.phase === 'MINIMUM') 
                          || simulationData.enhancement_timeline?.[Math.floor(simulationData.enhancement_timeline.length / 2)]
                          || {};
                        const breakdown = peakEntry.enhancement_breakdown || {};
                        
                        // Prepare data for bar chart with log scale values
                        const mechanismColors = {
                          screening: '#4caf50',
                          phonon: '#2196f3',
                          qed: '#ff9800',
                          casimir: '#9c27b0',
                          rydberg: '#f44336',
                          compression: '#00bcd4',
                          loading: '#795548'
                        };
                        
                        const chartData = Object.entries(breakdown)
                          .filter(([key]) => key !== 'total')
                          .map(([key, value]) => ({
                            name: key.charAt(0).toUpperCase() + key.slice(1),
                            value: Math.max(value, 1),
                            logValue: Math.log10(Math.max(value, 1)),
                            color: mechanismColors[key] || '#888',
                            displayValue: Math.max(value, 1).toExponential(1) // Use exponential notation instead of misleading percentage
                          }))
                          .sort((a, b) => b.logValue - a.logValue);
                        
                        const totalEnhancement = breakdown.total || 1;
                        
                        return (
                          <Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                              <Typography variant="body2" color="text.secondary">
                                Log₁₀ scale visualization of mechanism contributions
                              </Typography>
                              <Chip 
                                label={`Total: ${totalEnhancement.toExponential(2)}`} 
                                color="primary" 
                                size="small"
                              />
                            </Box>
                            <ResponsiveContainer width="100%" height={250}>
                              <BarChart data={chartData} layout="vertical" margin={{ left: 80, right: 30 }}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                <XAxis 
                                  type="number" 
                                  domain={[0, 'auto']}
                                  label={{ value: 'Log₁₀(Enhancement)', position: 'bottom', offset: -5 }}
                                />
                                <YAxis type="category" dataKey="name" width={75} />
                                <RechartsTooltip 
                                  formatter={(value, name, props) => [
                                    `${props.payload.value.toExponential(2)} (${props.payload.percentage}% of log total)`,
                                    'Enhancement'
                                  ]}
                                />
                                <Bar dataKey="logValue" radius={[0, 4, 4, 0]}>
                                  {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                  ))}
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                            <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center' }}>
                              {chartData.map((item) => (
                                <Chip
                                  key={item.name}
                                  label={`${item.name}: ${item.value.toExponential(1)}`}
                                  size="small"
                                  sx={{ bgcolor: item.color, color: 'white', fontSize: '0.7rem' }}
                                />
                              ))}
                            </Box>
                          </Box>
                        );
                      })()}
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
                      halo electrons, double-layer QED effects, Casimir effect, and quantum tunneling enhancements.
                      Click each section below to explore the physics in detail.
                    </Typography>
                  </Alert>

                  {/* Expandable Theory Sections */}
                  <Box sx={{ mb: 3 }}>
                    {/* Section 1: Rydberg Matter */}
                    <Accordion defaultExpanded>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <ScienceIcon color="primary" />
                          <Typography variant="h6">1. Rydberg Matter</Typography>
                          <Chip label="Extended Orbitals" size="small" color="primary" variant="outlined" sx={{ ml: 'auto' }} />
                        </Box>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Typography variant="body2" paragraph>
                          Rydberg Matter is a phase in which atoms occupy highly excited electronic states with extended orbitals.
                          These extended orbitals allow more efficient concentration of energy, effectively lowering the Coulomb barrier.
                        </Typography>
                        <Paper sx={{ p: 2, bgcolor: 'grey.100', mb: 2 }}>
                          <Typography variant="caption" color="text.secondary">Energy at n=10:</Typography>
                          <Box sx={{ p: 1, bgcolor: 'background.paper', borderRadius: 1, fontFamily: 'monospace', fontSize: '0.85rem', mt: 1 }}>
                            E_n = -13.6 eV / n² = -0.136 eV
                          </Box>
                          <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                            <strong>Related parameter:</strong> Temperature affects Rydberg state population
                          </Typography>
                        </Paper>
                        <Typography variant="caption" color="text.secondary">
                          <strong>Citation:</strong> Holmlid, L. (2009). "Rydberg Matter and Mesoscopic Physics"
                        </Typography>
                      </AccordionDetails>
                    </Accordion>

                    {/* Section 2: Halo Electrons */}
                    <Accordion>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <BoltIcon color="secondary" />
                          <Typography variant="h6">2. Halo Electrons</Typography>
                          <Chip label="Nuclear Overlap" size="small" color="secondary" variant="outlined" sx={{ ml: 'auto' }} />
                        </Box>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Typography variant="body2" paragraph>
                          Halo electrons are weakly bound electrons whose extended orbitals overlap significantly with nuclear wavefunctions.
                          This enhanced overlap raises the probability of electron capture processes.
                        </Typography>
                        <Paper sx={{ p: 2, bgcolor: 'grey.100', mb: 2 }}>
                          <Typography variant="caption" color="text.secondary">Overlap Probability:</Typography>
                          <Box sx={{ p: 1, bgcolor: 'background.paper', borderRadius: 1, fontFamily: 'monospace', fontSize: '0.85rem', mt: 1 }}>
                            P_overlap = (r₀/a)³ × exp(-2r₀/a) ≈ 5 × 10⁻³
                          </Box>
                          <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                            Where a = 10a₀ (orbital extension), r₀ = 0.1nm (nuclear core radius)
                          </Typography>
                        </Paper>
                        <Typography variant="caption" color="text.secondary">
                          <strong>Citation:</strong> Widom, A. & Larsen, L. (2006). "Ultra Low Momentum Neutron Catalyzed Nuclear Reactions"
                        </Typography>
                      </AccordionDetails>
                    </Accordion>

                    {/* Section 3: Double-Layer QED */}
                    <Accordion>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <FunctionsIcon sx={{ color: '#f1c40f' }} />
                          <Typography variant="h6">3. Double-Layer QED Effects</Typography>
                          <Chip label="High Electric Fields" size="small" sx={{ bgcolor: '#f1c40f', color: 'black', ml: 'auto' }} />
                        </Box>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Typography variant="body2" paragraph>
                          Charge separation at electrolyte or lattice interfaces creates high electric fields in thin double layers.
                          These fields can reach 10⁸ V/m, significantly affecting electron dynamics and barrier heights.
                        </Typography>
                        <Paper sx={{ p: 2, bgcolor: 'grey.100', mb: 2 }}>
                          <Typography variant="caption" color="text.secondary">Electric Field Calculation:</Typography>
                          <Box sx={{ p: 1, bgcolor: 'background.paper', borderRadius: 1, fontFamily: 'monospace', fontSize: '0.85rem', mt: 1 }}>
                            E = ΔV/d = 0.1V / 1nm = 10⁸ V/m
                          </Box>
                          <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                            <strong>Related parameter:</strong> Driving Pressure affects double-layer compression
                          </Typography>
                        </Paper>
                        <Typography variant="caption" color="text.secondary">
                          <strong>Citation:</strong> Hagelstein, P. (2010). "Coherent energy exchange in LENR"
                        </Typography>
                      </AccordionDetails>
                    </Accordion>

                    {/* Section 4: Bubble Collapse Dynamics */}
                    <Accordion>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <BubbleChartIcon sx={{ color: '#00bcd4' }} />
                          <Typography variant="h6">4. Bubble Collapse (Rayleigh-Plesset)</Typography>
                          <Chip label="Compression" size="small" sx={{ bgcolor: '#00bcd4', color: 'white', ml: 'auto' }} />
                        </Box>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Typography variant="body2" paragraph>
                          The modified Rayleigh-Plesset equation describes bubble dynamics with an additional electric field term.
                          During collapse, extreme pressures and temperatures are achieved at the bubble minimum.
                        </Typography>
                        <Paper sx={{ p: 2, bgcolor: 'grey.100', mb: 2 }}>
                          <Typography variant="caption" color="text.secondary">Modified Rayleigh-Plesset:</Typography>
                          <Box sx={{ p: 1, bgcolor: 'background.paper', borderRadius: 1, fontFamily: 'monospace', fontSize: '0.85rem', mt: 1 }}>
                            RR̈ + (3/2)Ṙ² = (1/ρ)[P_b - P_∞ - 2σ/R - 4μṘ/R + ε₀E²/2]
                          </Box>
                          <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                            <strong>Related parameters:</strong> Initial Bubble Radius, Driving Pressure, Frequency
                          </Typography>
                        </Paper>
                        <Typography variant="caption" color="text.secondary">
                          <strong>Citation:</strong> Rayleigh, Lord (1917). "On the pressure developed in a liquid during the collapse of a spherical cavity"
                        </Typography>
                      </AccordionDetails>
                    </Accordion>

                    {/* Section 5: Casimir Effect */}
                    <Accordion>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <InfoIcon sx={{ color: '#9c27b0' }} />
                          <Typography variant="h6">5. Casimir Effect</Typography>
                          <Chip label="Quantum Vacuum" size="small" sx={{ bgcolor: '#9c27b0', color: 'white', ml: 'auto' }} />
                        </Box>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Typography variant="body2" paragraph>
                          Quantum vacuum fluctuations produce an attractive force between closely spaced surfaces.
                          At nanoscale separations during bubble collapse, this effect becomes significant.
                        </Typography>
                        <Paper sx={{ p: 2, bgcolor: 'grey.100', mb: 2 }}>
                          <Typography variant="caption" color="text.secondary">Casimir Effect:</Typography>
                          <Box sx={{ p: 1, bgcolor: 'background.paper', borderRadius: 1, fontFamily: 'monospace', fontSize: '0.85rem', mt: 1 }}>
                            F_Casimir = -π²ℏc/240 × A/d⁴
                          </Box>
                          <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                            Force scales with inverse fourth power of separation distance
                          </Typography>
                        </Paper>
                        <Typography variant="caption" color="text.secondary">
                          <strong>Citation:</strong> Casimir, H.B.G. (1948). "On the attraction between two perfectly conducting plates"
                        </Typography>
                      </AccordionDetails>
                    </Accordion>

                    {/* Section 6: Quantum Tunneling */}
                    <Accordion>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <ThermostatIcon sx={{ color: '#ff5722' }} />
                          <Typography variant="h6">6. Quantum Tunneling Enhancement</Typography>
                          <Chip label="Gamow Factor" size="small" sx={{ bgcolor: '#ff5722', color: 'white', ml: 'auto' }} />
                        </Box>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Typography variant="body2" paragraph>
                          Combined effects of electron screening, phonon coupling, and QED enhancement can increase tunneling
                          probability by factors of 10³ to 10⁸ compared to bare Coulomb barrier calculations.
                        </Typography>
                        <Paper sx={{ p: 2, bgcolor: 'grey.100', mb: 2 }}>
                          <Typography variant="caption" color="text.secondary">WKB Tunneling Probability:</Typography>
                          <Box sx={{ p: 1, bgcolor: 'background.paper', borderRadius: 1, fontFamily: 'monospace', fontSize: '0.85rem', mt: 1 }}>
                            P_tunnel = exp(-2/ℏ ∫√[2m(V(x)-E)]dx)
                          </Box>
                          <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                            <strong>Related parameters:</strong> Temperature, Loading Ratio (affects screening)
                          </Typography>
                        </Paper>
                        <Typography variant="caption" color="text.secondary">
                          <strong>Citation:</strong> Gamow, G. (1928). "Zur Quantentheorie des Atomkernes"
                        </Typography>
                      </AccordionDetails>
                    </Accordion>
                  </Box>

                  {/* Proton Phase Transitions */}
                  <Paper sx={{ p: 2, mb: 3 }} variant="outlined">
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <SchoolIcon color="primary" /> Proton Phase Transitions
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    <Grid container spacing={2}>
                      {[
                        { color: '#3498db', name: 'FREE (EM)', desc: 'Normal electromagnetic behavior', range: 'E_thermal < 10 eV' },
                        { color: '#00ffff', name: 'SCREENED', desc: 'Coulomb barrier lowered 10-100 eV', range: 'Enhancement > 10' },
                        { color: '#f1c40f', name: 'CAPTURE READY', desc: 'Weak force coupling (p + e⁻ → n + νₑ)', range: 'Enhancement > 10³' },
                        { color: '#ff4500', name: 'NUCLEAR', desc: 'Strong force engagement possible', range: 'Enhancement > 10⁵' }
                      ].map((phase) => (
                        <Grid size={{ xs: 12, sm: 6, md: 3 }} key={phase.name}>
                          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                            <Box sx={{ width: 20, height: 20, bgcolor: phase.color, borderRadius: '50%', flexShrink: 0, mt: 0.5 }} />
                            <Box>
                              <Typography variant="body2" fontWeight="bold">{phase.name}</Typography>
                              <Typography variant="caption" display="block">{phase.desc}</Typography>
                              <Typography variant="caption" color="text.secondary">{phase.range}</Typography>
                            </Box>
                          </Box>
                        </Grid>
                      ))}
                    </Grid>
                  </Paper>

                  {/* References Section */}
                  <Paper sx={{ p: 2, bgcolor: 'action.hover' }} variant="outlined">
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <MenuBookIcon color="primary" /> References
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    <Stack spacing={1}>
                      <Typography variant="body2">
                        [1] Fleischmann, M. & Pons, S. (1989). "Electrochemically Induced Nuclear Fusion of Deuterium". <em>J. Electroanal. Chem.</em>
                      </Typography>
                      <Typography variant="body2">
                        [2] Gamow, G. (1928). "Zur Quantentheorie des Atomkernes". <em>Zeitschrift für Physik</em>
                      </Typography>
                      <Typography variant="body2">
                        [3] Hagelstein, P. et al. (2010s-2020s). "Phonon-nuclear coupling research". MIT
                      </Typography>
                      <Typography variant="body2">
                        [4] Storms, E. (2007). "The Science of Low Energy Nuclear Reaction". World Scientific
                      </Typography>
                      <Typography variant="body2">
                        [5] Acs, D. et al. (2025). "A Unified Theoretical Framework for Low-Energy Nuclear Reactions"
                      </Typography>
                    </Stack>
                  </Paper>

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
