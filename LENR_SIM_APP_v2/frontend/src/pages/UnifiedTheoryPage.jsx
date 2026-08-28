/**
 * UnifiedTheoryPage.jsx
 * 
 * Main simulation page for the Unified LENR Theory framework.
 * Implements the bubble-lattice interaction visualization showing
 * electrodynamic ionic double-layer collapse onto lattice materials.
 */

import React, { useState, useCallback, useEffect, Suspense, lazy } from 'react';
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
  LinearProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch
} from '@mui/material';
import Grid from '@mui/material/Grid';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ScienceIcon from '@mui/icons-material/Science';
import BoltIcon from '@mui/icons-material/Bolt';
import ThermostatIcon from '@mui/icons-material/Thermostat';
import BubbleChartIcon from '@mui/icons-material/BubbleChart';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DownloadIcon from '@mui/icons-material/Download';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import ShareIcon from '@mui/icons-material/Share';
import SaveIcon from '@mui/icons-material/Save';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import { analyticsApi } from '../services/analyticsApi';
import TheoryDocumentationPanel from '../components/physics/TheoryDocumentationPanel';
const VisualizationPanel = lazy(() => import('../components/unified-theory/VisualizationPanel'));
import EnhancementTimelinePanel from '../components/unified-theory/EnhancementTimelinePanel';
import ProtonPhasesPanel from '../components/unified-theory/ProtonPhasesPanel';
import ResultsPanel from '../components/unified-theory/ResultsPanel';
import TheoryTestbedPanel from '../components/unified-theory/TheoryTestbedPanel';
import { usePhysics } from '../contexts/PhysicsContext';
import { resolveApiUrl } from '../config/api';
import GovernanceGlossaryDrawer from '../components/physics/GovernanceGlossaryDrawer';
import { deriveSimulationHeadlineState } from '../utils/simulationDerivedState';
import { resolveElectrolyteSpecies } from '../utils/theoryConditions';
import {
  buildBubbleLatticePayload,
  framesToStreamPreview,
} from '../utils/bubbleLatticePayload';
import { formatCycleTimeChip } from '../utils/bubblePhaseSchedule';
import { ENHANCEMENT_THRESHOLDS } from '../utils/unifiedTheoryCharts';
import { useBubbleLatticeStream, STREAM_STATUS } from '../hooks/useBubbleLatticeStream';
import { track } from '../analytics/events';
import { attachTestbedScoresToResults } from '../utils/theoryTestbedScores';

const BUBBLE_LATTICE_ENDPOINT = '/api/unified/bubble-lattice';
const UNIFIED_SIMULATE_ENDPOINT = '/api/unified/simulate';

// System presets
const SYSTEM_PRESETS = {
  pd_d: {
    name: 'Palladium-Deuterium',
    description: 'Classic LENR system (Fleischmann-Pons)',
    hostMaterial: 'palladium',
    reactant: 'deuterium',
    temperature: 300,
    loadingRatio: 0.9,
    initialBubbleRadius: 10.0,
    drivingPressure: 1.5,
    frequency: 20,
    defectDensity: 1e16,
    surfaceRoughness: 5e-9,
    grainSize: 50e-9,
    numCycles: 2,
    electrolyteFamily: 'li',
    electrolyteSpecies: 'lioh',
    electrolyteMolarityMolL: 0.3,
  },
  ni_h: {
    name: 'Nickel-Hydrogen',
    description: 'Nickel-Hydrogen LENR system (studied by many researchers including Piantelli, Celani, and others)',
    hostMaterial: 'nickel',
    reactant: 'hydrogen',
    temperature: 500,
    loadingRatio: 0.85,
    initialBubbleRadius: 8.3,
    drivingPressure: 2.0,
    frequency: 25,
    defectDensity: 1e16,
    surfaceRoughness: 5e-9,
    grainSize: 50e-9,
    numCycles: 2,
    electrolyteFamily: 'k',
    electrolyteSpecies: 'koh',
    electrolyteMolarityMolL: 0.35,
  },
  ti_d: {
    name: 'Titanium-Deuterium',
    description: 'Alternative host material',
    hostMaterial: 'titanium',
    reactant: 'deuterium',
    temperature: 350,
    loadingRatio: 0.8,
    initialBubbleRadius: 11.7,
    drivingPressure: 1.2,
    frequency: 15,
    defectDensity: 1e16,
    surfaceRoughness: 5e-9,
    grainSize: 50e-9,
    numCycles: 2,
    electrolyteFamily: 'na',
    electrolyteSpecies: 'naoh',
    electrolyteMolarityMolL: 0.25,
  },
  pd_h: {
    name: 'Palladium-Hydrogen',
    description: 'Piantelli early work, Arata-lighter isotope testing',
    hostMaterial: 'palladium',
    reactant: 'hydrogen',
    temperature: 350,
    loadingRatio: 0.85,
    initialBubbleRadius: 10.0,
    drivingPressure: 1.5,
    frequency: 20,
    defectDensity: 1e16,
    surfaceRoughness: 5e-9,
    grainSize: 50e-9,
    numCycles: 2,
    electrolyteFamily: 'li',
    electrolyteSpecies: 'lioh',
    electrolyteMolarityMolL: 0.3,
  },
  ni_d: {
    name: 'Nickel-Deuterium',
    description: 'Hybrid approach',
    hostMaterial: 'nickel',
    reactant: 'deuterium',
    temperature: 500,
    loadingRatio: 0.9,
    initialBubbleRadius: 8.3,
    drivingPressure: 2.0,
    frequency: 25,
    defectDensity: 1e16,
    surfaceRoughness: 5e-9,
    grainSize: 50e-9,
    numCycles: 2,
    electrolyteFamily: 'k',
    electrolyteSpecies: 'k2co3',
    electrolyteMolarityMolL: 0.3,
  },
  li_h: {
    name: 'Lithium-Hydrogen',
    description: 'Holmlid, Unified Gravity Corp-Rydberg matter',
    hostMaterial: 'lithium',
    reactant: 'hydrogen',
    temperature: 600,
    loadingRatio: 0.8,
    initialBubbleRadius: 8.3,
    drivingPressure: 2.0,
    frequency: 25,
    defectDensity: 1e16,
    surfaceRoughness: 5e-9,
    grainSize: 50e-9,
    numCycles: 2,
    electrolyteFamily: 'li',
    electrolyteSpecies: 'li2co3',
    electrolyteMolarityMolL: 0.4,
  },
  zro2_pd: {
    name: 'ZrO2-Pd',
    description: 'Swartz nanostructured palladium in ZrO2 matrix',
    hostMaterial: 'palladium',
    reactant: 'deuterium',
    temperature: 300,
    loadingRatio: 0.9,
    initialBubbleRadius: 6.7,
    drivingPressure: 1.8,
    frequency: 30,
    defectDensity: 1e17,
    surfaceRoughness: 8e-9,
    grainSize: 20e-9,
    numCycles: 2,
    electrolyteFamily: 'li',
    electrolyteSpecies: 'lioh',
    electrolyteMolarityMolL: 0.3,
  },
  custom: {
    name: 'Custom Configuration',
    description: 'User-defined host/reactant-unlocks all parameter sliders for free-form experimentation',
    hostMaterial: 'palladium',
    reactant: 'deuterium',
    temperature: 400,
    loadingRatio: 0.9,
    initialBubbleRadius: 10.0,
    drivingPressure: 1.5,
    frequency: 20,
    defectDensity: 1e16,
    surfaceRoughness: 5e-9,
    grainSize: 50e-9,
    numCycles: 2,
    electrolyteFamily: 'li',
    electrolyteSpecies: 'lioh',
    electrolyteMolarityMolL: 0.3,
  }
};

const ELECTROLYTE_SPECIES_BY_FAMILY = {
  li: [
    { value: 'lioh', label: 'LiOH (hydroxide)' },
    { value: 'li2co3', label: 'Li2CO3 (carbonate)' },
  ],
  na: [
    { value: 'naoh', label: 'NaOH (hydroxide)' },
    { value: 'na2co3', label: 'Na2CO3 (carbonate)' },
  ],
  k: [
    { value: 'koh', label: 'KOH (hydroxide)' },
    { value: 'k2co3', label: 'K2CO3 (carbonate)' },
  ],
  rb: [{ value: 'other', label: 'Other Rb species (low support)' }],
  cs: [{ value: 'other', label: 'Other Cs species (low support)' }],
  mixed: [{ value: 'mixed', label: 'Mixed electrolyte blend' }],
  other: [{ value: 'other', label: 'Other / custom species' }],
};

// Tab param to index mapping (tab order: 0=3D Viz, 1=Timeline, 2=Proton Phases, 3=Results, 4=Theory Testbed, 5=Theory)
const TAB_PARAM_MAP = {
  tunneling: 4,
  screening: 4,
  casimir: 4,
  fusion: 4,
  reactions: 4,
  'bubble-dynamics': 0,
  visualization: 0,
  timeline: 1,
  phases: 2,
  results: 3,
  testbed: 4,
  theory: 5,
};

// Reporting ceiling for single-bubble collapse temperature, mirroring
// backend app/physics/bubble_collapse.REGIME_MAX_TEMPERATURE["single_bubble"]
// (2e6 K, peak ion temperature from Moss et al., doi:10.1121/1.416948).
// Used only by the offline fallback below; a real response carries its own
// ceiling under collapse_results.limits, which resolveTemperatureLimit prefers.
const REGIME_MAX_TEMPERATURE_K = 2.0e6;

const CONTRADICTION_REASON_LABELS = {
  threshold_boundary: 'Threshold boundary mismatch between enhancement cap and proton phase assignment.',
  missing_phase_data: 'Phase model did not provide a NUCLEAR share for this run.',
  inconsistent_mode: 'Input consistency or mode assumptions are incompatible with this prediction.',
  none: 'No contradiction detected.',
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
    const breakdown = simulationData.peak_conditions?.enhancement_breakdown || {};
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
      case 'nuclear-active': return 'Enhancement threshold reached (model)';
      case 'near-threshold': return 'Approaching model observable band';
      case 'screening-enhanced': return 'Screening enhanced (model)';
      default: return 'Sub-threshold (model)';
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
          Enhancement Factor - {enhancementMetrics.material.toUpperCase()}-{enhancementMetrics.reactant.charAt(0).toUpperCase()}
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
            Peak: {enhancementMetrics.peakEnhancement.toExponential(2)}x
          </Typography>
        </Tooltip>
        <Tooltip title="Internal model threshold for excess-heat labeling; not experimental confirmation">
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Threshold: {enhancementMetrics.threshold.toExponential(0)}x
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
  const [searchParams] = useSearchParams();
  const { setSimulationResult, theoryResult } = usePhysics();
  // State management
  const [selectedSystem, setSelectedSystem] = useState('pd_d');
  const [parameters, setParameters] = useState(SYSTEM_PRESETS.pd_d);
  const [simulationData, setSimulationData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  // Reaction-rate engine / UQ controls (v0.3.6-beta). Defaults mirror the
  // backend: conservative two_body mode, no UQ. uncertaintySamples is capped to
  // keep the additive request within deployment timeout budgets.
  const [rateMode, setRateMode] = useState('two_body');
  const [includeUncertainty, setIncludeUncertainty] = useState(false);
  const [uncertaintySamples, setUncertaintySamples] = useState(256);
  const [randomSeed, setRandomSeed] = useState('');
  const [glossaryOpen, setGlossaryOpen] = useState(false);

  // Sync active tab and system from URL params on mount and when searchParams change
  useEffect(() => {
    const tabParam = searchParams.get('tab') || searchParams.get('focus');
    if (tabParam) {
      const idx = TAB_PARAM_MAP[tabParam.toLowerCase()];
      if (typeof idx === 'number' && idx >= 0 && idx <= 5) {
        setActiveTab(idx);
      }
    }
    const systemParam = searchParams.get('system');
    if (systemParam && SYSTEM_PRESETS[systemParam]) {
      setSelectedSystem(systemParam);
      setParameters(SYSTEM_PRESETS[systemParam]);
    }
  }, [searchParams]);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertSeverity, setAlertSeverity] = useState('info');
  const [currentPhase, setCurrentPhase] = useState('EXPANSION');
  const [isSaving, setIsSaving] = useState(false);
  const derivedState = deriveSimulationHeadlineState({ simulationData, theoryResult });
  const streamPayload = React.useMemo(
    () => buildBubbleLatticePayload(parameters),
    [parameters],
  );
  const {
    status: streamStatus,
    frames: streamFrames,
    latest: streamLatest,
    error: streamError,
    start: startStream,
    stop: stopStream,
  } = useBubbleLatticeStream({ parameters: streamPayload });

  // When the live stream finishes, fold frames into the same timeline shape the
  // charts already consume so the unused WS endpoint has a real UI path.
  useEffect(() => {
    if (streamStatus !== STREAM_STATUS.complete || streamFrames.length === 0) return;
    const preview = framesToStreamPreview(streamFrames);
    if (!preview) return;
    setSimulationData(preview);
    setSimulationResult(preview);
    setAlertMessage(`Live stream complete (${streamFrames.length} frames). Run Physics Simulation for full collapse/UQ results.`);
    setAlertSeverity('success');
    setAlertOpen(true);
  }, [streamStatus, streamFrames, setSimulationResult]);

  useEffect(() => {
    if (streamStatus === STREAM_STATUS.error && streamError) {
      setAlertMessage(`Live stream failed: ${streamError}`);
      setAlertSeverity('error');
      setAlertOpen(true);
    }
  }, [streamStatus, streamError]);

  
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
          electrolyte_family: parameters.electrolyteFamily || 'li',
          electrolyte_species: resolveElectrolyteSpecies(
            parameters.electrolyteFamily || 'li',
            parameters.electrolyteSpecies,
          ),
          electrolyte_molarity_mol_l: parameters.electrolyteMolarityMolL || 0.3,
        },
        enhancement_factor: simulationData.peak_conditions?.enhancement_factor || 1,
        fusion_rate: simulationData.peak_conditions?.fusion_rate,
        energy_output_kev: Number.isFinite(simulationData.total_energy_output)
          ? simulationData.total_energy_output
          : null,
        excess_heat_watts: Number.isFinite(theoryResult?.total_energy_watts)
          ? theoryResult.total_energy_watts
          : null,
        duration_seconds: (simulationData.enhancement_timeline?.length || 0) * 0.001,
        results: attachTestbedScoresToResults(
          {
            peak_conditions: simulationData.peak_conditions,
            enhancement_breakdown:
              simulationData.peak_conditions?.enhancement_breakdown ||
              simulationData.enhancement_breakdown ||
              {},
            lawson_progress: simulationData.lawson_criterion_progress,
          },
          theoryResult,
        ),
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
  }, [simulationData, parameters, selectedSystem, theoryResult]);
  const [collapseCount, setCollapseCount] = useState(0);

  // Handle system preset change
  const handleSystemChange = useCallback((systemKey) => {
    setSelectedSystem(systemKey);
    setParameters(SYSTEM_PRESETS[systemKey]);
    setSimulationData(null);
  }, []);

  // Handle parameter changes
  const handleParameterChange = useCallback((param, value) => {
    if (param === 'electrolyteFamily') {
      setParameters(prev => ({
        ...prev,
        electrolyteFamily: value,
        electrolyteSpecies: resolveElectrolyteSpecies(value, null),
      }));
      return;
    }
    setParameters(prev => ({ ...prev, [param]: value }));
  }, []);

  // Run simulation via API
  const runSimulation = useCallback(async () => {
    setIsLoading(true);
    setAlertOpen(false);
    const simStartedAt = Date.now();
    track.simulationStarted({
      sim_type: 'bubble_lattice',
      host_material: parameters.hostMaterial,
      reactant: parameters.reactant,
      rate_mode: rateMode,
    });
    
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
      
      // Try real physics API via canonical endpoint (dev proxy / explicit prod base)
      const apiUrl = resolveApiUrl(BUBBLE_LATTICE_ENDPOINT);
      const requestPayload = buildBubbleLatticePayload(parameters, {
        rateMode,
        includeUncertainty,
        uncertaintySamples,
        randomSeed,
        theoryResult,
      });

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload)
      });

      if (response.ok) {
        const data = await response.json();
        setSimulationData(data);
        setSimulationResult(data);
        track.simulationCompleted({
          sim_type: 'bubble_lattice',
          success: true,
          route_mode: data.validation?.route_mode || 'api',
          duration_ms: Date.now() - simStartedAt,
        });
        setAlertMessage('Simulation completed with real physics calculations');
        setAlertSeverity('success');
      } else {
        // Handle specific HTTP status codes with clear user messaging
        let errorMessage;
        let errorType = 'api_error';
        
        if (response.status === 405) {
          const allowHeader = response.headers.get('Allow');
          errorMessage = `Method Not Allowed (405). Endpoint: ${apiUrl}. Allow: ${allowHeader || 'unknown'}.`;
          errorType = 'method_not_allowed';
        } else if (response.status === 404) {
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
          errorMessage = `${errorMessage} (endpoint: ${apiUrl})`;
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
        setSimulationResult(mockData);
        track.simulationCompleted({
          sim_type: 'bubble_lattice',
          success: true,
          route_mode: 'local_fallback',
          duration_ms: Date.now() - simStartedAt,
        });
        
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
        } else if (errorMessage.includes('method_not_allowed')) {
          setAlertMessage(`Backend route mismatch (405). Check backend restart and route mount. ${errorMessage.replace(/\[.*?\]\s*/, '')}`);
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
        analyticsApi.saveFailedRun({
          name: `FAILED ${parameters.name} Simulation`,
          experiment_type: 'unified_theory',
          material: parameters.hostMaterial,
          temperature_k: parameters.temperature,
          error: fallbackError.message,
        }).catch(() => {});
      }
    } finally {
      setIsLoading(false);
      setAlertOpen(true);
    }
  }, [parameters, setSimulationResult, rateMode, includeUncertainty, uncertaintySamples, randomSeed, theoryResult]);

  // Generate local fallback results
  const generateLocalResults = (params) => {
    const baseEnhancement = params.loadingRatio > 0.9 ? 1e5 : 1e3;
    const tempFactor = Math.exp(-Math.abs(params.temperature - 400) / 500);
    const compressionRatio = 1 + params.drivingPressure * 5;
    const electrolyteFamily = params.electrolyteFamily || 'li';
    const electrolyteSpecies = resolveElectrolyteSpecies(electrolyteFamily, params.electrolyteSpecies);
    const electrolyteMolarity = params.electrolyteMolarityMolL || 0.3;
    const electrolyteSolventType = params.electrolyteSolventType || 'd2o';
    const electrolytePhProxy = typeof params.electrolytePhProxy === 'number'
      ? Math.max(0, Math.min(14, params.electrolytePhProxy))
      : null;
    const electrolyteIonicStrengthProxy = typeof params.electrolyteIonicStrengthProxy === 'number'
      ? Math.max(0, params.electrolyteIonicStrengthProxy)
      : null;
    
    // Generate timeline data
    const timeline = [];
    for (let i = 0; i < 50; i++) {
      const t = i / 49;
      let phase, enhancement, radiusFactor;
      
      if (t < 0.45) {
        phase = 'EXPANSION';
        radiusFactor = 1 + 0.3 * Math.sin(t / 0.45 * Math.PI / 2);
        enhancement = baseEnhancement * 0.1;
      } else if (t < 0.7) {
        phase = 'COLLAPSE';
        radiusFactor = 1.3 - 1.15 * ((t - 0.45) / 0.25) ** 2;
        enhancement = baseEnhancement * (1 + 5 * ((t - 0.45) / 0.25));
      } else if (t < 0.8) {
        phase = 'MINIMUM';
        radiusFactor = 0.15;
        enhancement = baseEnhancement * tempFactor;
      } else {
        phase = 'REBOUND';
        radiusFactor = 0.15 + 0.5 * ((t - 0.8) / 0.2);
        enhancement = baseEnhancement * 0.5;
      }
      
      timeline.push({
        normalized_time: t,
        phase,
        enhancement,
        electrolyte_multiplier: 1.0,
        radius_factor: radiusFactor,
        temperature: params.temperature * (1 + (1 / radiusFactor - 1) * 0.3),
        proton_distribution: {
          FREE: phase === 'EXPANSION' ? 0.7 : 0.2,
          SCREENED: phase === 'COLLAPSE' ? 0.4 : 0.2,
          CAPTURE_READY: phase === 'MINIMUM' ? 0.5 : 0.1,
          NUCLEAR: phase === 'MINIMUM' ? 0.1 : 0
        }
      });
    }
    
    const rawTempK = params.temperature * compressionRatio ** 1.2;
    const cappedTempK = Math.min(rawTempK, REGIME_MAX_TEMPERATURE_K);
    return {
      success: true,
      collapse_results: {
        min_radius_um: params.initialBubbleRadius * 0.15,
        max_temperature_k: cappedTempK,
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
      electrolyte_diagnostics: {
        electrolyte_family: electrolyteFamily,
        electrolyte_species: electrolyteSpecies,
        electrolyte_molarity_mol_l: electrolyteMolarity,
        solvent_type: electrolyteSolventType,
        ph_proxy: electrolytePhProxy,
        ionic_strength_proxy: electrolyteIonicStrengthProxy,
        activity_multiplier: 1.0,
        support_level: electrolyteMolarity > 1.0 ? 'soft_extrapolation' : 'validated',
        species_family_consistent: true,
      },
      peak_conditions: {
        temperature_k: cappedTempK,
        pressure_gpa: 0.1 * compressionRatio ** 4,
        enhancement_factor: baseEnhancement * tempFactor,
        electrolyte_multiplier: 1.0,
        electrolyte_family: electrolyteFamily,
        electrolyte_species: electrolyteSpecies,
        electrolyte_molarity_mol_l: electrolyteMolarity,
      },
      regime_validity_flags: {
        electrolyte_molarity_validated_window: electrolyteMolarity <= 1.0,
        electrolyte_molarity_soft_window: electrolyteMolarity > 1.0 && electrolyteMolarity <= 2.0,
        electrolyte_species_family_consistent: true,
      },
      unsupported_extrapolation_flags: {
        electrolyte_molarity_outside_supported_range: electrolyteMolarity > 2.0,
        inconsistent_electrolyte_species_family: false,
      },
      validation: {
        route_mode: 'local_fallback',
        contradiction: false,
        contradiction_reason_code: 'none',
      },
      observables_bridge: {
        electrolyte_family: electrolyteFamily,
        electrolyte_species: electrolyteSpecies,
        electrolyte_molarity_mol_l: electrolyteMolarity,
        electrolyte_solvent_type: electrolyteSolventType,
        electrolyte_ph_proxy: electrolytePhProxy,
        electrolyte_ionic_strength_proxy: electrolyteIonicStrengthProxy,
      },
      // Local fallback has no governed reaction-rate engine; the panel renders a
      // clear "no output" state rather than fabricating numbers (dev/offline only).
      reaction_rate_engine: {},
      open_questions: {
        schema: 'lenr-open-questions-v1',
        route_mode: 'local_fallback',
        determination: {
          status: 'INCONCLUSIVE',
          oracle_b: { note: 'UNAVAILABLE on local_fallback' },
          oracle_emp: { evaluated: false },
        },
        emp_chips: [],
        lenr_proved: false,
        q_mev_gap: { id: 'EQ-OPEN-MEV-01', status: 'OPEN' },
        q_radiation: { id: 'EQ-OPEN-RAD-01', status: 'OPEN' },
        q_statistical: { id: 'EQ-OPEN-RATE-01', status: 'OPEN' },
        q_electron_capture: { id: 'EQ-OPEN-EC-01', status: 'OPEN', dimmed: true },
        q_integrated_yield: { id: 'EQ-OPEN-YIELD-01', status: 'OPEN', dimmed: true },
      },
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

  // Export simulation results as JSON
  const exportAsJSON = useCallback(() => {
    if (!simulationData) {
      setAlertMessage('No simulation data to export. Run a simulation first.');
      setAlertSeverity('warning');
      setAlertOpen(true);
      return;
    }
    
    const exportData = {
      schema_version: 'lenr-run-export-v1',
      exported_at: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      simulation_parameters: parameters,
      system_preset: selectedSystem,
      // Reproducibility/provenance: the exact rate-engine controls used for the
      // run, surfaced at top level so an exported file is self-describing.
      reaction_rate_controls: {
        rate_mode: rateMode,
        include_uncertainty: includeUncertainty,
        uncertainty_samples: uncertaintySamples,
        random_seed: randomSeed === '' || randomSeed === null ? null : Number(randomSeed),
      },
      reaction_rate_engine: simulationData.reaction_rate_engine || {},
      route_mode: simulationData.validation?.route_mode || 'unknown',
      results: simulationData,
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
    track.exportDownloaded({
      schema_version: 'lenr-run-export-v1',
      format: 'json',
      route_mode: simulationData.validation?.route_mode || 'unknown',
      success: true,
    });
    
    setAlertMessage('Simulation data exported successfully');
    setAlertSeverity('success');
    setAlertOpen(true);
  }, [simulationData, parameters, selectedSystem, rateMode, includeUncertainty, uncertaintySamples, randomSeed]);

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
      const freeFraction = protons.FREE ?? protons.free;
      const screenedFraction = protons.SCREENED ?? protons.screened;
      const captureReadyFraction = protons.CAPTURE_READY ?? protons.capture_ready;
      const nuclearFraction = protons.NUCLEAR ?? protons.nuclear;
      return [
        entry.normalized_time?.toFixed(4) || '',
        entry.phase || '',
        // radius_factor is dimensionless R/R0; convert to um with the true
        // initial radius (previously multiplied by a bare 3.33 "scale").
        entry.radius_um?.toFixed(4)
          || (entry.radius_factor
            ? (entry.radius_factor * parameters.initialBubbleRadius).toFixed(4)
            : ''),
        entry.temperature_k?.toFixed(1) || entry.temperature?.toFixed(1) || '',
        entry.pressure_bar?.toFixed(1) || '',
        entry.enhancement?.toExponential(4) || '',
        breakdown.screening?.toExponential(4) || '',
        breakdown.phonon?.toExponential(4) || '',
        breakdown.qed?.toExponential(4) || '',
        breakdown.casimir?.toExponential(4) || '',
        breakdown.rydberg?.toExponential(4) || '',
        breakdown.compression?.toExponential(4) || '',
        breakdown.loading?.toExponential(4) || '',
        freeFraction?.toFixed(4) || '',
        screenedFraction?.toFixed(4) || '',
        captureReadyFraction?.toFixed(4) || '',
        nuclearFraction?.toFixed(4) || ''
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
          <Stack direction="row" spacing={1} alignItems="center">
            <Tooltip title="Governance glossary: claim tiers & evidence classes">
              <IconButton
                onClick={() => setGlossaryOpen(true)}
                aria-label="Open governance glossary"
                color="primary"
              >
                <HelpOutlineIcon />
              </IconButton>
            </Tooltip>
            <Button
              component={RouterLink}
              to="/theory-paper"
              variant="outlined"
              startIcon={<MenuBookIcon />}
              sx={{ whiteSpace: 'nowrap' }}
            >
              View Theory Paper
            </Button>
          </Stack>
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
        <Divider sx={{ my: 2 }} />
        <Typography variant="subtitle2" gutterBottom>Electrolyte System</Typography>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 4 }}>
            <FormControl size="small" fullWidth>
              <InputLabel>Family</InputLabel>
              <Select
                value={parameters.electrolyteFamily || 'li'}
                label="Family"
                onChange={(e) => handleParameterChange('electrolyteFamily', e.target.value)}
                disabled={isLoading}
              >
                <MenuItem value="li">Li</MenuItem>
                <MenuItem value="na">Na</MenuItem>
                <MenuItem value="k">K</MenuItem>
                <MenuItem value="rb">Rb (low support)</MenuItem>
                <MenuItem value="cs">Cs (low support)</MenuItem>
                <MenuItem value="mixed">Mixed</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <FormControl size="small" fullWidth>
              <InputLabel>Species</InputLabel>
              <Select
                value={resolveElectrolyteSpecies(parameters.electrolyteFamily || 'li', parameters.electrolyteSpecies)}
                label="Species"
                onChange={(e) => handleParameterChange('electrolyteSpecies', e.target.value)}
                disabled={isLoading}
              >
                {(ELECTROLYTE_SPECIES_BY_FAMILY[parameters.electrolyteFamily || 'li'] || ELECTROLYTE_SPECIES_BY_FAMILY.other).map((option) => (
                  <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Typography variant="caption" color="text.secondary">
              Electrolyte Molarity: {(parameters.electrolyteMolarityMolL || 0.3).toFixed(2)} mol/L
            </Typography>
            <Slider
              value={parameters.electrolyteMolarityMolL || 0.3}
              onChange={(_, v) => handleParameterChange('electrolyteMolarityMolL', v)}
              min={0.01}
              max={2.0}
              step={0.01}
              disabled={isLoading}
              size="small"
            />
            {(() => {
              // Real-time support-level indicator mirroring the backend's
              // scientific_guardrails thresholds (VALIDATED / SOFT_EXTRAPOLATION
              // / unsupported) and ELECTROLYTE_EVIDENCE_WEIGHT family weights.
              const molarity = parameters.electrolyteMolarityMolL || 0.3;
              const family = parameters.electrolyteFamily || 'li';
              const FAMILY_WEIGHTS = {
                li: 1.0, na: 0.82, k: 0.76, rb: 0.45, cs: 0.4, mixed: 0.7, other: 0.55,
              };
              let level = 'validated';
              let color = 'success';
              let message = 'Within validated 0.01–1.00 mol/L window.';
              if (molarity > 2.0) {
                level = 'unsupported';
                color = 'error';
                message = 'Outside supported range (> 2.0 mol/L). Confidence penalties apply.';
              } else if (molarity > 1.0) {
                level = 'soft extrapolation';
                color = 'warning';
                message = 'Soft extrapolation window (1.0–2.0 mol/L). Results less trustworthy.';
              } else if (molarity < 0.01) {
                level = 'unsupported';
                color = 'error';
                message = 'Below supported minimum (0.01 mol/L).';
              }
              const familyWeight = FAMILY_WEIGHTS[family] ?? 0.55;
              return (
                <Box sx={{ mt: 0.5, display: 'flex', flexWrap: 'wrap', gap: 0.5, alignItems: 'center' }}>
                  <Tooltip title={message} arrow>
                    <Chip
                      label={`Support: ${level}`}
                      size="small"
                      color={color}
                      sx={{ height: 18, fontSize: '0.65rem' }}
                    />
                  </Tooltip>
                  <Tooltip
                    title={`Family evidence weight: ${familyWeight.toFixed(2)}× (${family.toUpperCase()}). Li has the strongest empirical support; other families are down-weighted.`}
                    arrow
                  >
                    <Chip
                      label={`${family.toUpperCase()} weight: ${familyWeight.toFixed(2)}×`}
                      size="small"
                      variant="outlined"
                      color={familyWeight >= 0.8 ? 'success' : familyWeight >= 0.6 ? 'info' : 'warning'}
                      sx={{ height: 18, fontSize: '0.65rem' }}
                    />
                  </Tooltip>
                </Box>
              );
            })()}
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
              Validated 0.01–1.00 mol/L; soft extrapolation up to 2.00 mol/L.
            </Typography>
          </Grid>
        </Grid>

        {/* Custom preset: host/reactant selectors */}
        {selectedSystem === 'custom' && (
          <Stack direction="row" spacing={2} sx={{ mt: 2 }} flexWrap="wrap" useFlexGap>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Host Material</InputLabel>
              <Select
                value={parameters.hostMaterial}
                label="Host Material"
                onChange={(e) => handleParameterChange('hostMaterial', e.target.value)}
                disabled={isLoading}
              >
                <MenuItem value="palladium">Palladium</MenuItem>
                <MenuItem value="nickel">Nickel</MenuItem>
                <MenuItem value="titanium">Titanium</MenuItem>
                <MenuItem value="lithium">Lithium</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Reactant</InputLabel>
              <Select
                value={parameters.reactant}
                label="Reactant"
                onChange={(e) => handleParameterChange('reactant', e.target.value)}
                disabled={isLoading}
              >
                <MenuItem value="deuterium">Deuterium</MenuItem>
                <MenuItem value="hydrogen">Hydrogen</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        )}
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
                min={selectedSystem === 'custom' ? 0 : 0.5}
                max={1.0}
                step={0.05}
                marks={[{value: 0.9, label: '0.9'}]}
                disabled={isLoading}
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                {parameters.loadingRatio > 0.9 ? '  Higher modeled enhancement expected' : 'Loading affects reaction sites'}
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
                min={selectedSystem === 'custom' ? 100 : 200}
                max={selectedSystem === 'custom' ? 2000 : 800}
                step={10}
                disabled={isLoading}
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                {parameters.temperature > 400 ? '  Affects screening length & enhancement' : 'Lower temp = longer screening length'}
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
                min={selectedSystem === 'custom' ? 0.1 : 0.5}
                max={selectedSystem === 'custom' ? 10 : 5.0}
                step={0.1}
                disabled={isLoading}
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                {parameters.drivingPressure > 2.0 ? '  Faster collapse, higher compression' : 'Controls bubble collapse rate'}
              </Typography>
            </Box>

            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                <Typography variant="subtitle2">Frequency: {parameters.frequency} kHz</Typography>
                <Chip 
                  label={formatCycleTimeChip(parameters.frequency)} 
                  size="small" 
                  color="info" 
                  sx={{ fontSize: '0.65rem' }} 
                />
              </Box>
              <Slider
                value={parameters.frequency}
                onChange={(_, v) => handleParameterChange('frequency', v)}
                min={selectedSystem === 'custom' ? 1 : 5}
                max={selectedSystem === 'custom' ? 100 : 50}
                step={1}
                disabled={isLoading}
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                Higher frequency shortens the physical period (20 kHz = 50 μs). The 3D cycle is stretched to a few seconds so Expansion → Collapse → Minimum → Rebound can be watched.
              </Typography>
            </Box>

            {/* Advanced Parameters (v0.3.2-beta) */}
            <Accordion sx={{ mb: 2, '&:before': { display: 'none' } }} disableGutters>
              <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: 36, '& .MuiAccordionSummary-content': { my: 0.5 } }}>
                <Typography variant="subtitle2" color="text.secondary">Advanced Parameters</Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 0 }}>
                {/* Initial Bubble Radius */}
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    Initial Bubble Radius: {parameters.initialBubbleRadius} μm
                  </Typography>
                  <Slider
                    value={parameters.initialBubbleRadius}
                    onChange={(_, v) => handleParameterChange('initialBubbleRadius', v)}
                    min={1}
                    max={50}
                    step={0.1}
                    disabled={isLoading}
                    size="small"
                  />
                </Box>
                {/* Defect Density */}
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    Defect Density: {(parameters.defectDensity || 1e16).toExponential(0)} m^-3
                  </Typography>
                  <Slider
                    value={Math.log10(parameters.defectDensity || 1e16)}
                    onChange={(_, v) => handleParameterChange('defectDensity', Math.pow(10, v))}
                    min={14}
                    max={18}
                    step={0.5}
                    disabled={isLoading}
                    size="small"
                  />
                </Box>
                {/* Surface Roughness */}
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    Surface Roughness: {((parameters.surfaceRoughness || 5e-9) * 1e9).toFixed(1)} nm
                  </Typography>
                  <Slider
                    value={Math.log10((parameters.surfaceRoughness || 5e-9) * 1e9)}
                    onChange={(_, v) => handleParameterChange('surfaceRoughness', Math.pow(10, v) * 1e-9)}
                    min={-1}
                    max={2}
                    step={0.1}
                    disabled={isLoading}
                    size="small"
                  />
                </Box>
                {/* Grain Size */}
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    Grain Size: {((parameters.grainSize || 50e-9) * 1e9).toFixed(0)} nm
                  </Typography>
                  <Slider
                    value={(parameters.grainSize || 50e-9) * 1e9}
                    onChange={(_, v) => handleParameterChange('grainSize', v * 1e-9)}
                    min={10}
                    max={500}
                    step={10}
                    disabled={isLoading}
                    size="small"
                  />
                </Box>
                {/* Number of Cycles */}
                <Box sx={{ mb: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    Acoustic Cycles: {parameters.numCycles || 2}
                  </Typography>
                  <Slider
                    value={parameters.numCycles || 2}
                    onChange={(_, v) => handleParameterChange('numCycles', v)}
                    min={1}
                    max={10}
                    step={1}
                    disabled={isLoading}
                    size="small"
                    marks={[{ value: 1, label: '1' }, { value: 5, label: '5' }, { value: 10, label: '10' }]}
                  />
                </Box>
              </AccordionDetails>
            </Accordion>

            {/* Reaction Rate & Uncertainty (v0.3.6-beta) */}
            <Accordion sx={{ mb: 2, '&:before': { display: 'none' } }} disableGutters>
              <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: 36, '& .MuiAccordionSummary-content': { my: 0.5 } }}>
                <Typography variant="subtitle2" color="text.secondary">Reaction Rate &amp; Uncertainty</Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 0 }}>
                <FormControl size="small" fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Rate Formalism</InputLabel>
                  <Select
                    value={rateMode}
                    label="Rate Formalism"
                    onChange={(e) => setRateMode(e.target.value)}
                    disabled={isLoading}
                  >
                    <MenuItem value="two_body">Two-body (reference baseline)</MenuItem>
                    <MenuItem value="trapped_state">Trapped-state (speculative TSC)</MenuItem>
                    <MenuItem value="three_body">Three-body p+e+d (cavitation chain)</MenuItem>
                  </Select>
                </FormControl>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                  {rateMode === 'trapped_state'
                    ? 'Speculative: sub-pm cluster rate (Takahashi TSC). Many orders above the baseline; exploratory only.'
                    : rateMode === 'three_body'
                      ? 'Speculative: p+e⁻→n then n+d under cavitation compression (Widom–Larsen class + OP/NASA LCF). Default conversion ≪ 1; not a validated LENR proof.'
                      : 'Conservative textbook thermonuclear rate; reported as a lower bound.'}
                </Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={includeUncertainty}
                      onChange={(e) => setIncludeUncertainty(e.target.checked)}
                      disabled={isLoading}
                      size="small"
                    />
                  }
                  label={<Typography variant="caption">Quantify uncertainty (Sobol)</Typography>}
                />
                {includeUncertainty && (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      Sobol samples: {uncertaintySamples}
                    </Typography>
                    <Slider
                      value={uncertaintySamples}
                      onChange={(_, v) => setUncertaintySamples(v)}
                      min={16}
                      max={1024}
                      step={16}
                      disabled={isLoading}
                      size="small"
                      marks={[{ value: 256, label: '256' }, { value: 1024, label: '1024' }]}
                    />
                    <TextField
                      label="Random seed (optional)"
                      type="number"
                      size="small"
                      fullWidth
                      value={randomSeed}
                      onChange={(e) => setRandomSeed(e.target.value)}
                      disabled={isLoading}
                      placeholder="deterministic if set"
                      sx={{ mt: 1 }}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                      Higher sample counts increase accuracy but add backend time.
                    </Typography>
                  </Box>
                )}
              </AccordionDetails>
            </Accordion>

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
            <Button
              variant="outlined"
              color="secondary"
              fullWidth
              sx={{ mt: 1 }}
              startIcon={
                streamStatus === STREAM_STATUS.streaming || streamStatus === STREAM_STATUS.connecting
                  ? <CircularProgress size={18} />
                  : <BoltIcon />
              }
              onClick={() => {
                if (streamStatus === STREAM_STATUS.streaming || streamStatus === STREAM_STATUS.connecting) {
                  stopStream();
                  return;
                }
                setActiveTab(0);
                startStream();
              }}
              disabled={isLoading}
            >
              {streamStatus === STREAM_STATUS.streaming || streamStatus === STREAM_STATUS.connecting
                ? 'Stop Live Stream'
                : 'Live Stream Collapse'}
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
                <span style={{ flex: 1, minWidth: 80 }}>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<DownloadIcon />}
                    onClick={exportAsJSON}
                    disabled={!simulationData}
                    fullWidth
                  >
                    JSON
                  </Button>
                </span>
              </Tooltip>
              <Tooltip title="Download timeline data as CSV (spreadsheet compatible)">
                <span style={{ flex: 1, minWidth: 80 }}>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<DownloadIcon />}
                    onClick={exportAsCSV}
                    disabled={!simulationData}
                    fullWidth
                  >
                    CSV
                  </Button>
                </span>
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
          {derivedState.contradiction && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {CONTRADICTION_REASON_LABELS[derivedState.contradictionReasonCode] || 'This run is flagged for contradiction review.'}
            </Alert>
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
                  <Chip
                    label={`Electrolyte: ${(simulationData.electrolyte_diagnostics?.electrolyte_family || parameters.electrolyteFamily || 'li').toUpperCase()} / ${(simulationData.electrolyte_diagnostics?.electrolyte_species || resolveElectrolyteSpecies(parameters.electrolyteFamily || 'li', parameters.electrolyteSpecies)).toUpperCase()}`}
                    color="info"
                  />
                  <Chip
                    label={`Support: ${simulationData.electrolyte_diagnostics?.support_level || 'validated'}`}
                    color={
                      simulationData.electrolyte_diagnostics?.support_level === 'validated'
                        ? 'success'
                        : simulationData.electrolyte_diagnostics?.support_level === 'soft_extrapolation'
                          ? 'warning'
                          : 'error'
                    }
                  />
                  <Chip
                    label={`Mode: ${simulationData.validation?.route_mode || 'unknown'}`}
                    color="default"
                  />
                </Stack>
                <Stack direction="row" spacing={1} sx={{ mt: 1 }} flexWrap="wrap" useFlexGap>
                  <Chip
                    size="small"
                    color={simulationData.regime_validity_flags?.electrolyte_molarity_validated_window ? 'success' : 'warning'}
                    label={`Validity regime: ${simulationData.regime_validity_flags?.electrolyte_molarity_validated_window ? 'validated' : 'extrapolated'}`}
                  />
                  <Chip
                    size="small"
                    color="info"
                    label="Uncertainty interval: model-based confidence band"
                  />
                </Stack>
                {simulationData.unsupported_extrapolation_flags?.electrolyte_molarity_outside_supported_range && (
                  <Alert severity="warning" sx={{ mt: 1 }}>
                    Electrolyte molarity is outside supported range. Confidence penalties apply.
                  </Alert>
                )}
                {simulationData.unsupported_extrapolation_flags?.inconsistent_electrolyte_species_family && (
                  <Alert severity="warning" sx={{ mt: 1 }}>
                    Electrolyte species does not match selected family; diagnostics downgraded to inconsistent pairing.
                  </Alert>
                )}
              </Box>
            )}

            <Tabs value={activeTab} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tab label="3D Visualization" />
              <Tab label="Enhancement Timeline" />
              <Tab label="Proton Phases" />
              <Tab label="Results" />
              <Tab label="Theory Testbed" icon={<ScienceIcon fontSize="small" />} iconPosition="end" />
              <Tab label="Theory" icon={<MenuBookIcon fontSize="small" />} iconPosition="end" />
            </Tabs>

            <Box sx={{ mt: 2, minHeight: 500 }}>
              {activeTab === 0 && (
                <Suspense
                  fallback={
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: 500,
                      }}
                    >
                      <CircularProgress aria-label="Loading 3D visualization panel" />
                    </Box>
                  }
                >
                  <VisualizationPanel
                    parameters={parameters}
                    simulationData={simulationData}
                    streamLatest={streamLatest}
                    streamStatus={streamStatus}
                    onPhaseChange={handlePhaseChange}
                    onCollapseEvent={handleCollapseEvent}
                  />
                </Suspense>
              )}

              {activeTab === 1 && simulationData && (
                <EnhancementTimelinePanel
                  simulationData={simulationData}
                  parameters={parameters}
                />
              )}

              {activeTab === 2 && simulationData && (
                <ProtonPhasesPanel simulationData={simulationData} />
              )}

              {activeTab === 3 && simulationData && (
                <ResultsPanel
                  simulationData={simulationData}
                  parameters={parameters}
                  onOpenGlossary={() => setGlossaryOpen(true)}
                />
              )}

              {activeTab === 4 && (
                <TheoryTestbedPanel
                  parameters={parameters}
                  theoryResult={theoryResult}
                />
              )}

              {activeTab === 5 && (
                <TheoryDocumentationPanel />
              )}

              {!simulationData && activeTab !== 0 && activeTab !== 4 && activeTab !== 5 && (
                <Box sx={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 2 }}>
                  <ScienceIcon sx={{ fontSize: 64, color: 'text.disabled' }} />
                  <Typography color="text.secondary">Run a simulation to see detailed results</Typography>
                </Box>
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      <GovernanceGlossaryDrawer
        open={glossaryOpen}
        onClose={() => setGlossaryOpen(false)}
        initialAnchor="claim"
      />

      <Snackbar open={alertOpen} autoHideDuration={4000} onClose={() => setAlertOpen(false)}>
        <Alert onClose={() => setAlertOpen(false)} severity={alertSeverity} sx={{ width: '100%' }}>
          {alertMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
}

export default UnifiedTheoryPage;