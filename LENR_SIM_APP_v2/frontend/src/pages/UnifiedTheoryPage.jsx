/**
 * UnifiedTheoryPage.jsx
 * 
 * Main simulation page for the Unified LENR Theory framework.
 * Implements the bubble-lattice interaction visualization showing
 * electrodynamic ionic double-layer collapse onto lattice materials.
 */

import React, { useState, useCallback, useEffect } from 'react';
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
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import { analyticsApi } from '../services/analyticsApi';
import TheoryDocumentationPanel from '../components/physics/TheoryDocumentationPanel';

// Import new unified visualization
import UnifiedBubbleLatticeVisualization from '../components/visualizations/UnifiedBubbleLatticeVisualization';
import ErrorBoundary from '../components/ErrorBoundary';
import { usePhysics } from '../contexts/PhysicsContext';
import { resolveApiUrl } from '../config/api';
import TheoryTogglePanel from '../components/physics/TheoryTogglePanel';
import ReactionRateGovernancePanel from '../components/physics/ReactionRateGovernancePanel';
import GovernanceGlossaryDrawer from '../components/physics/GovernanceGlossaryDrawer';
import { deriveSimulationHeadlineState } from '../utils/simulationDerivedState';
import { buildTheoryConditions, resolveElectrolyteSpecies } from '../utils/theoryConditions';
import { track } from '../analytics/events';

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
    initialBubbleRadius: 3.0,
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
    initialBubbleRadius: 2.5,
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
    initialBubbleRadius: 3.5,
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
    initialBubbleRadius: 3.0,
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
    initialBubbleRadius: 2.5,
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
    initialBubbleRadius: 2.5,
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
    initialBubbleRadius: 2.0,
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
    initialBubbleRadius: 3.0,
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

// Proton phase colors for charts
const PHASE_COLORS = {
  free: '#3498db',
  screened: '#00ffff',
  capture_ready: '#f1c40f',
  nuclear: '#ff4500'
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

// Enhancement thresholds for LENR activity
const ENHANCEMENT_THRESHOLDS = {
  observable: 1e5,      // Observable excess heat (10^5)
  measurable: 1e3,       // Measurable nuclear products
  screening: 1e1,        // Significant electron screening
};

// Reporting ceiling for single-bubble collapse temperature, mirroring
// backend app/physics/bubble_collapse.REGIME_MAX_TEMPERATURE["single_bubble"]
// (2e6 K, peak ion temperature from Moss et al., doi:10.1121/1.416948).
// Used only by the offline fallback below; a real response carries its own
// ceiling under collapse_results.limits, which resolveTemperatureLimit prefers.
const REGIME_MAX_TEMPERATURE_K = 2.0e6;

/**
 * Read the temperature reporting limit from a response, falling back to the
 * mirrored constant. The backend is authoritative: hardcoding the ceiling here
 * previously understated it by 200x and mislabelled saturation.
 */
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
        energy_output_kev: simulationData.total_energy_output || 0,
        duration_seconds: (simulationData.enhancement_timeline?.length || 0) * 0.001,
        results: {
          peak_conditions: simulationData.peak_conditions,
          enhancement_breakdown:
            simulationData.peak_conditions?.enhancement_breakdown ||
            simulationData.enhancement_breakdown ||
            {},
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
      const electrolyteFamily = parameters.electrolyteFamily || 'li';
      const electrolyteSpecies = resolveElectrolyteSpecies(electrolyteFamily, parameters.electrolyteSpecies);
      const electrolyteMolarity = parameters.electrolyteMolarityMolL || 0.3;
      const electrolyteSolventType = parameters.electrolyteSolventType || 'd2o';
      const electrolytePhProxy = typeof parameters.electrolytePhProxy === 'number'
        ? Math.max(0, Math.min(14, parameters.electrolytePhProxy))
        : null;
      const electrolyteIonicStrengthProxy = typeof parameters.electrolyteIonicStrengthProxy === 'number'
        ? Math.max(0, parameters.electrolyteIonicStrengthProxy)
        : null;
      const requestPayload = {
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
          defect_density: parameters.defectDensity || 1e16,
          surface_roughness: parameters.surfaceRoughness || 5e-9,
          grain_size: parameters.grainSize || 50e-9,
          electrolyte_family: electrolyteFamily,
          electrolyte_species: electrolyteSpecies,
          electrolyte_molarity_mol_l: electrolyteMolarity,
          solvent_type: electrolyteSolventType,
          ph_proxy: electrolytePhProxy,
          ionic_strength_proxy: electrolyteIonicStrengthProxy,
        },
        electrolyte: {
          family: electrolyteFamily,
          species: electrolyteSpecies,
          molarity_mol_l: electrolyteMolarity,
          solvent_type: electrolyteSolventType,
          ph_proxy: electrolytePhProxy,
          ionic_strength_proxy: electrolyteIonicStrengthProxy,
        },
        num_cycles: parameters.numCycles || 2,
        // Additive reaction-rate engine / UQ controls (v0.3.6-beta).
        rate_mode: rateMode,
        include_uncertainty: includeUncertainty,
        uncertainty_samples: uncertaintySamples,
        random_seed:
          randomSeed === '' || randomSeed === null ? null : Number(randomSeed),
      };

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
      }
    } finally {
      setIsLoading(false);
      setAlertOpen(true);
    }
  }, [parameters, setSimulationResult, rateMode, includeUncertainty, uncertaintySamples, randomSeed]);

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
        electrolyte_multiplier: 1.0,
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
    
    const rawTempK = params.temperature * compressionRatio ** 1.2;
    const cappedTempK = Math.min(rawTempK, REGIME_MAX_TEMPERATURE_K);
    return {
      success: true,
      collapse_results: {
        min_radius_um: params.initialBubbleRadius * 0.15 * 3.33,
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

  // Prepare chart data.
  //
  // `enhancement` is clamped to the 1e5 display ceiling, so plotting log10 of it
  // draws a flat line at 5.0 across the whole collapse. The backend also emits
  // `enhancement_log10_raw`, which is the uncapped magnitude; that is the series
  // with real structure, so it is primary and the capped one is kept alongside.
  const getEnhancementChartData = () => {
    if (!simulationData?.enhancement_timeline) return [];
    const baseRadiusUm = (parameters.initialBubbleRadius || 10) * 3.33;
    return simulationData.enhancement_timeline.map(point => {
      const cappedLog10 = Math.log10(Math.max(1, point.enhancement));
      const rawLog10 = typeof point.enhancement_log10_raw === 'number'
        && Number.isFinite(point.enhancement_log10_raw)
        ? point.enhancement_log10_raw
        : cappedLog10;
      return {
        time: (point.normalized_time * 100).toFixed(0) + '%',
        enhancement: rawLog10,
        enhancementCapped: cappedLog10,
        isSaturated: Boolean(point.enhancement_is_saturated),
        electrolyteMultiplier: point.electrolyte_multiplier || simulationData.electrolyte_diagnostics?.activity_multiplier || 1.0,
        temperature: point.temperature_k ?? point.temperature,
        pressureBar: point.pressure_bar ?? null,
        radius: point.radius_factor
          ? point.radius_factor * 100
          : point.radius_um
            ? (point.radius_um / Math.max(baseRadiusUm, 0.001)) * 100
            : 100
      };
    });
  };

  const getProtonPhaseChartData = () => {
    if (!simulationData?.enhancement_timeline) return [];
    return simulationData.enhancement_timeline.map(point => ({
      time: (point.normalized_time * 100).toFixed(0) + '%',
      ...point.proton_distribution
    }));
  };

  /**
   * The integrated Rayleigh-Plesset collapse curve (additive
   * `collapse_trajectory`). This is the actual solved trajectory the peak
   * conditions came from, rather than the normalized-time envelope.
   */
  const getCollapseTrajectoryData = () => {
    const trajectory = simulationData?.collapse_trajectory;
    if (!trajectory?.time_s?.length) return [];
    const velocities = trajectory.wall_velocity_m_s;
    return trajectory.time_s.map((timeS, index) => ({
      timeUs: Number((timeS * 1e6).toFixed(4)),
      radiusUm: trajectory.radius_um[index],
      wallVelocity: velocities ? velocities[index] : null,
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
        entry.radius_um?.toFixed(4) || (entry.radius_factor ? (entry.radius_factor * 3.33).toFixed(4) : ''),
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
                  label={`~${Math.round((1 / parameters.frequency) / 0.02)}s cycle`} 
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
                Higher frequency = faster cycles (visualization slowed 50x for observation)
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
                    step={0.5}
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
                  {simulationData?.electrolyte_diagnostics && (
                    <Stack direction="row" spacing={1} sx={{ mb: 1 }} flexWrap="wrap" useFlexGap>
                      <Chip
                        size="small"
                        color="info"
                        label={`Electrolyte multiplier: ${(simulationData.electrolyte_diagnostics.activity_multiplier || 1).toFixed(3)}x`}
                      />
                      <Chip
                        size="small"
                        color="default"
                        label={`Species-family consistent: ${simulationData.electrolyte_diagnostics.species_family_consistent ? 'yes' : 'no'}`}
                      />
                    </Stack>
                  )}
                  <UnifiedBubbleLatticeVisualization
                    parameters={parameters}
                    simulationData={simulationData}
                    onPhaseChange={handlePhaseChange}
                    onCollapseEvent={handleCollapseEvent}
                    height={550}
                  />
                </ErrorBoundary>
              )}

              {activeTab === 1 && simulationData && (() => {
                const chartData = getEnhancementChartData();
                const saturatedPoints = chartData.filter((point) => point.isSaturated).length;
                return (
                  <Box sx={{ minHeight: 480 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Enhancement Factor During Collapse Cycle (log10 scale)
                    </Typography>
                    {saturatedPoints > 0 && (
                      <Alert severity="info" sx={{ mb: 1, py: 0 }}>
                        <Typography variant="caption">
                          {saturatedPoints} of {chartData.length} samples exceed the{' '}
                          {ENHANCEMENT_THRESHOLDS.observable.toExponential(0)} display ceiling.
                          The solid line is the uncapped model magnitude; the dashed line is
                          the reported (clamped) value, which is flat where it saturates.
                        </Typography>
                      </Alert>
                    )}
                    <ResponsiveContainer width="100%" height="85%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="time" />
                        <YAxis yAxisId="left" label={{ value: 'log10(Enhancement)', angle: -90, position: 'insideLeft' }} />
                        <YAxis yAxisId="right" orientation="right" label={{ value: 'Radius %', angle: 90, position: 'insideRight' }} />
                        <YAxis yAxisId="right2" orientation="right" hide domain={[0.7, 1.2]} />
                        <RechartsTooltip />
                        <Legend />
                        <Line yAxisId="left" type="monotone" dataKey="enhancement" stroke="#8884d8" name="Enhancement (uncapped log10)" strokeWidth={2} dot={false} />
                        <Line yAxisId="left" type="monotone" dataKey="enhancementCapped" stroke="#ce93d8" name="Enhancement (reported, clamped)" strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
                        <Line yAxisId="right" type="monotone" dataKey="radius" stroke="#82ca9d" name="Bubble Radius %" dot={false} />
                        <Line yAxisId="right2" type="monotone" dataKey="electrolyteMultiplier" stroke="#ff9800" name="Electrolyte Multiplier" strokeDasharray="5 4" dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                    {(() => {
                      const trajectory = getCollapseTrajectoryData();
                      if (trajectory.length === 0) return null;
                      const minRadius = Math.min(...trajectory.map((p) => p.radiusUm));
                      return (
                        <Box sx={{ mt: 4, height: 320 }}>
                          <Typography variant="subtitle2" gutterBottom>
                            Integrated Collapse Trajectory (Rayleigh-Plesset)
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                            Solved R(t) behind the reported peak conditions. Minimum radius{' '}
                            {minRadius.toExponential(2)} μm
                            {simulationData.collapse_trajectory?.sample_count
                              ? ` from ${simulationData.collapse_trajectory.sample_count} samples`
                              : ''}
                            .
                          </Typography>
                          <ResponsiveContainer width="100%" height="80%">
                            <LineChart data={trajectory}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis
                                dataKey="timeUs"
                                label={{ value: 'Time (μs)', position: 'insideBottom', offset: -4 }}
                              />
                              <YAxis
                                yAxisId="radius"
                                label={{ value: 'Radius (μm)', angle: -90, position: 'insideLeft' }}
                              />
                              <YAxis yAxisId="velocity" orientation="right" hide />
                              <RechartsTooltip />
                              <Legend />
                              <Line yAxisId="radius" type="monotone" dataKey="radiusUm" stroke="#29b6f6" name="Radius (μm)" strokeWidth={2} dot={false} />
                              <Line yAxisId="velocity" type="monotone" dataKey="wallVelocity" stroke="#ef5350" name="Wall velocity (m/s)" strokeWidth={1} strokeDasharray="4 3" dot={false} />
                            </LineChart>
                          </ResponsiveContainer>
                        </Box>
                      );
                    })()}
                  </Box>
                );
              })()}

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
                      <Line type="monotone" dataKey="NUCLEAR" stroke={PHASE_COLORS.nuclear} name="Model nuclear-active phase" strokeWidth={2} />
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
                  {/* Reaction-Rate Engine governance (v0.3.6-beta) */}
                  <Grid size={12}>
                    <Paper sx={{ p: 0 }} variant="outlined">
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, pt: 2 }}>
                        <Typography variant="h6">Reaction-Rate Engine</Typography>
                        <Tooltip title="What do these claim tiers mean?">
                          <IconButton size="small" onClick={() => setGlossaryOpen(true)} aria-label="Open governance glossary">
                            <HelpOutlineIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                      <Divider sx={{ mt: 1 }} />
                      <ReactionRateGovernancePanel
                        block={simulationData.reaction_rate_engine}
                        onOpenGlossary={() => setGlossaryOpen(true)}
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
                  
                  {/* Enhancement Breakdown Chart */}
                  <Grid size={12}>
                    <Paper sx={{ p: 2 }} variant="outlined">
                      <Typography variant="h6" gutterBottom>Enhancement Mechanism Breakdown</Typography>
                      <Divider sx={{ mb: 2 }} />
                      {(() => {
                        // Prefer peak_conditions (thermo-consistent) over a MINIMUM
                        // timeline sample; filter non-numeric keys like `saturation`.
                        const peakEntry = simulationData.enhancement_timeline?.find(e => e.phase === 'MINIMUM')
                          || simulationData.enhancement_timeline?.[Math.floor(simulationData.enhancement_timeline.length / 2)]
                          || {};
                        const breakdown =
                          simulationData.peak_conditions?.enhancement_breakdown
                          || peakEntry.enhancement_breakdown
                          || {};
                        const saturation = breakdown.saturation || null;

                        // Prepare data for bar chart with log scale values
                        const mechanismColors = {
                          screening: '#4caf50',
                          phonon: '#2196f3',
                          qed: '#ff9800',
                          casimir: '#9c27b0',
                          rydberg: '#f44336',
                          compression: '#00bcd4',
                          loading: '#795548',
                          electrolyte: '#607d8b',
                        };

                        const chartData = Object.entries(breakdown)
                          .filter(([key, value]) => key !== 'total' && typeof value === 'number')
                          .map(([key, value]) => {
                            const detail = saturation?.mechanisms?.[key];
                            const logRaw = detail?.log10_value_raw;
                            const safeValue = Math.max(Number(value) || 1, 1);
                            const logValue = (typeof logRaw === 'number' && Number.isFinite(logRaw))
                              ? logRaw
                              : Math.log10(safeValue);
                            return {
                              name: key.charAt(0).toUpperCase() + key.slice(1),
                              value: safeValue,
                              logValue,
                              color: mechanismColors[key] || '#888',
                              displayValue: safeValue.toExponential(1),
                              isSaturated: !!detail?.is_saturated,
                            };
                          })
                          .sort((a, b) => b.logValue - a.logValue);

                        const totalEnhancement = typeof breakdown.total === 'number' ? breakdown.total : 1;
                        
                        return (
                          <Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                              <Typography variant="body2" color="text.secondary">
                                Log10 scale visualization of mechanism contributions
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
                                  label={{ value: 'Log10(Enhancement)', position: 'bottom', offset: -5 }}
                                />
                                <YAxis type="category" dataKey="name" width={75} />
                                <RechartsTooltip 
                                  formatter={(value, name, props) => [
                                    `${props.payload.value.toExponential(2)} (log10 ${props.payload.logValue.toFixed(2)})`,
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
              )}

              {activeTab === 4 && (
                <Box>
                  {theoryResult?.observables_bridge && (
                    <Alert severity="info" sx={{ mb: 2 }}>
                      Observables bridge active: excess heat, helium proxy, and radiation bounds are available from backend contract.
                    </Alert>
                  )}
                  <Alert severity="info" sx={{ mb: 3 }}>
                    <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 1 }}>
                      LENR Theory Testbed
                    </Typography>
                    <Typography variant="body2">
                      Toggle individual theory modules on/off, adjust parameters, and compare
                      their contributions side-by-side. Run the pipeline to see each theory's
                      enhancement factor and confidence under the current simulation conditions.
                    </Typography>
                  </Alert>

                  <TheoryTogglePanel conditions={buildTheoryConditions({ parameters })} />
                </Box>
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