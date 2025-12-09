import React, { useState, useEffect, useCallback } from 'react';
import { 
  Box, 
  Container, 
  Paper, 
  Typography, 
  Divider, 
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Snackbar,
  Alert,
  CircularProgress,
  Backdrop,
  Tooltip
} from '@mui/material';
import Grid from '@mui/material/Grid';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SaveIcon from '@mui/icons-material/Save';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import CloseIcon from '@mui/icons-material/Close';
import DownloadIcon from '@mui/icons-material/Download';
import InfoIcon from '@mui/icons-material/Info';
import LENRParameterControls from '../components/controls/LENRParameterControls';
import LENRVisualization from '../components/visualizations/LENRVisualization';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import ResultsPanel from '../components/results/ResultsPanel';

// API base URL - uses environment variable or defaults to localhost
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

/**
 * Real physics API client for LENR calculations
 */
const physicsAPI = {
  async calculateEnhancement(params) {
    const response = await fetch(`${API_BASE}/api/physics/lenr-enhancement`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        energy_kev: 0.025, // Thermal energy at room temp
        temperature_k: params.temperature || 300,
        loading_ratio: params.loadingRatio || 0.85,
        material: params.materialType || 'palladium',
        defect_density: params.defectDensity || 0.01,
        mechanisms: ['electron_screening', 'phonon_assisted', 'loading_ratio', 'defect_enhancement']
      })
    });
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return response.json();
  },
  
  async calculateReactionRate(params) {
    const response = await fetch(`${API_BASE}/api/physics/lenr-reaction-rate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        temperature_k: params.temperature || 300,
        loading_ratio: params.loadingRatio || 0.85,
        material: params.materialType || 'palladium',
        defect_density: params.defectDensity || 0.01,
        volume_cm3: 1.0,
        include_enhancements: true
      })
    });
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return response.json();
  }
};

/**
 * Generate time series data from physics calculation results
 */
function generateTimeSeriesFromPhysics(enhancement, reactionRate, params) {
  const timeSteps = params.totalSimulationTime / params.timeStepSize || 100;
  const dt = params.timeStepSize || 0.1;
  
  const timePoints = [];
  const enhancementHistory = [];
  const reactionRateHistory = [];
  const temperatureHistory = [];
  
  for (let i = 0; i < timeSteps; i++) {
    const t = i * dt;
    // Add realistic variation based on physics
    const tempVariation = 1 + 0.05 * Math.sin(2 * Math.PI * t / 5);
    const rampUp = 1 - Math.exp(-t / 2);
    
    timePoints.push(t);
    enhancementHistory.push(enhancement.total_enhancement * rampUp * tempVariation);
    reactionRateHistory.push((reactionRate?.rate || 1e10) * rampUp * tempVariation);
    temperatureHistory.push((params.temperature || 300) * tempVariation);
  }
  
  return {
    time: timePoints,
    enhancement: enhancementHistory,
    reactionRate: reactionRateHistory,
    temperature: temperatureHistory
  };
}

/**
 * Generate fallback results when API is unavailable
 */
function generateFallbackResults(params, config) {
  // Physics-based calculations using simplified models
  const T = params.temperature || 300;
  const loadingRatio = params.loadingRatio || 0.85;
  const defectDensity = params.defectDensity || 0.01;
  
  // Simplified enhancement factor calculations
  const screeningEnhancement = Math.exp(20 / Math.sqrt(T)); // Debye screening
  const loadingEnhancement = Math.pow(loadingRatio / 0.5, 2);
  const defectEnhancement = 1 + 10 * defectDensity;
  const totalEnhancement = screeningEnhancement * loadingEnhancement * defectEnhancement;
  
  const timeSteps = 100;
  const dt = 0.1;
  
  return {
    simulation_id: `fallback-${Date.now()}`,
    status: 'completed',
    parameters: params,
    results: {
      total_enhancement: totalEnhancement,
      individual_factors: {
        electron_screening: screeningEnhancement,
        loading_ratio: loadingEnhancement,
        defect_enhancement: defectEnhancement
      },
      dominant_mechanism: screeningEnhancement > loadingEnhancement ? 'electron_screening' : 'loading_ratio',
      warnings: ['Using local fallback model - backend API unavailable']
    },
    timeSeriesData: {
      time: Array.from({ length: timeSteps }, (_, i) => i * dt),
      enhancement: Array.from({ length: timeSteps }, (_, i) => 
        totalEnhancement * (1 - Math.exp(-i * dt / 2)) * (1 + 0.05 * Math.sin(i * dt))
      ),
      reactionRate: Array.from({ length: timeSteps }, (_, i) =>
        1e10 * totalEnhancement * (1 - Math.exp(-i * dt / 2))
      ),
      temperature: Array.from({ length: timeSteps }, (_, i) =>
        T * (1 + 0.02 * Math.sin(i * dt * 0.5))
      )
    },
    latticeData: config.lattice_parameters
  };
}

/**
 * LENRSimulationPage Component
 * 
 * Main page for LENR simulation model with parameter controls and visualization
 */
function LENRSimulationPage() {
  const navigate = useNavigate();
  const theme = useTheme();
  
  // Simulation states
  const [parameters, setParameters] = useState(null);
  const [simulationData, setSimulationData] = useState(null);
  const [comparisonData, setComparisonData] = useState(null);
  const [comparisonConfig, setComparisonConfig] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  
  // UI states
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [configName, setConfigName] = useState('');
  const [configDescription, setConfigDescription] = useState('');
  const [configsList, setConfigsList] = useState([]);
  const [showInfoDialog, setShowInfoDialog] = useState(false);
  const [showError, setShowError] = useState(false);
  const [simulationId, setSimulationId] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertSeverity, setAlertSeverity] = useState('info');
  const [alertOpen, setAlertOpen] = useState(false);
  const [savedSimulations, setSavedSimulations] = useState([]);
  
  // Initialize default parameters
  useEffect(() => {
    // LENR-specific default parameters
    const defaultParams = {
      materialType: 'nickel',
      secondaryMaterial: 'hydrogen',
      temperature: 400, // K
      pressure: 5.0, // atm
      catalystType: 'palladium',
      catalystConcentration: 0.05,
      electrodeConfig: 'coaxial',
      currentDensity: 0.8, // A/cm²
      pulseFrequency: 50, // Hz
      pulseWidth: 100, // μs
      magneticFieldStrength: 0.2, // T
      surfaceTreatment: 'plasma_etched',
      nanostructured: true,
      defectDensity: 0.1,
      grainSize: 50, // nm
      showLattice: true,
      showHotSpots: true,
      showEnergyFlow: true,
      timeStepSize: 0.1,
      totalSimulationTime: 10
    };
    
    // Check for pending simulation configuration from NewSimulation wizard
    const pendingSimulation = localStorage.getItem('pendingSimulation');
    if (pendingSimulation) {
      try {
        const config = JSON.parse(pendingSimulation);
        // Merge wizard parameters with defaults
        const mergedParams = {
          ...defaultParams,
          temperature: config.parameters?.temperature || defaultParams.temperature,
          pressure: config.parameters?.pressure || defaultParams.pressure,
          defectDensity: config.parameters?.defectConcentration || defaultParams.defectDensity
        };
        setParameters(mergedParams);
        
        // Show notification about loaded configuration
        setAlertMessage(`Configuration "${config.name}" loaded from wizard. Click "Run Simulation" to start.`);
        setAlertSeverity('info');
        setAlertOpen(true);
        
        // Clear the pending simulation after loading
        localStorage.removeItem('pendingSimulation');
      } catch (e) {
        console.error('Error loading pending simulation:', e);
        setParameters(defaultParams);
      }
    } else {
      setParameters(defaultParams);
    }
    
    // Fetch saved configurations (mock implementation)
    // In a real implementation, this would be an API call
    setTimeout(() => {
      setConfigsList([
        { id: 1, name: 'Nickel-Hydrogen Standard', description: 'Standard configuration for Ni-H LENR system' },
        { id: 2, name: 'Palladium-Deuterium Config', description: 'Pd-D electrolytic cell configuration' },
        { id: 3, name: 'Titanium-Hydrogen Nanostructured', description: 'Nanostructured Ti-H system with high defect density' }
      ]);
    }, 500);
  }, []);
  
  // Handle parameter changes
  const handleParametersChange = useCallback((newParameters) => {
    setParameters(prevParams => ({
      ...prevParams,
      ...newParameters
    }));
  }, []);
  
  // Run simulation with current parameters
  const runSimulation = useCallback(async () => {
    if (!parameters) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // In a real implementation, this would be an API call
      // For now we'll use the mock physics server to initialize a simulation
      const simulationConfig = {
        models: [
          {
            model_type: 'electron_screening',
            parameters: {
              enhancement_factor: 5.0,
              screening_length: 10 // pm
            }
          },
          {
            model_type: 'phonon_modes',
            parameters: {
              coupling_strength: 0.5,
              resonance_frequency: 10 // THz
            }
          }
        ],
        lattice: {
          type: parameters.materialType === 'palladium' ? 'fcc' : 
                parameters.materialType === 'titanium' ? 'hcp' : 'fcc',
          dimensions: [10, 10, 10],
          constants: [3.89, 3.89, 3.89],
          elements: [
            {
              symbol: parameters.materialType.charAt(0).toUpperCase() + parameters.materialType.slice(1),
              position: [0, 0, 0],
              occupancy: 1.0
            },
            {
              symbol: parameters.secondaryMaterial.charAt(0).toUpperCase() + parameters.secondaryMaterial.slice(1),
              position: [0.5, 0.5, 0.5],
              occupancy: parameters.materialType === 'palladium' ? 0.6 : 0.8
            }
          ]
        },
        conditions: {
          temperature: parameters.temperature,
          pressure: parameters.pressure,
          electric_field: [0, 0, parameters.currentDensity / 10],
          magnetic_field: parameters.magneticFieldStrength ? [0, 0, parameters.magneticFieldStrength] : undefined
        },
        simulation_parameters: {
          time_step: parameters.timeStepSize,
          total_steps: parameters.totalSimulationTime / parameters.timeStepSize,
          save_frequency: 10
        }
      };
      
      // Try to use real physics API
      try {
        const [enhancementResult, reactionRateResult] = await Promise.all([
          physicsAPI.calculateEnhancement(parameters),
          physicsAPI.calculateReactionRate(parameters)
        ]);
        
        const simId = `lenr-${Date.now()}`;
        setSimulationId(simId);
        
        // Transform API results into visualization-compatible format
        const simulationResults = {
          simulation_id: simId,
          status: 'completed',
          parameters: parameters,
          results: {
            enhancement: enhancementResult,
            reactionRate: reactionRateResult,
            total_enhancement: enhancementResult.total_enhancement,
            dominant_mechanism: enhancementResult.dominant_mechanism,
            individual_factors: enhancementResult.individual_factors,
            warnings: enhancementResult.warnings || []
          },
          // Generate visualization data based on real physics results
          timeSeriesData: generateTimeSeriesFromPhysics(enhancementResult, reactionRateResult, parameters),
          latticeData: simulationConfig.lattice_parameters
        };
        
        setSimulationData(simulationResults);
        setSuccessMessage('Simulation completed using real physics calculations');
        
      } catch (apiError) {
        console.warn('Real physics API unavailable, using fallback:', apiError.message);
        
        // Fallback: generate physics-based mock data
        const simId = `lenr-fallback-${Date.now()}`;
        setSimulationId(simId);
        
        const fallbackResults = generateFallbackResults(parameters, simulationConfig);
        setSimulationData(fallbackResults);
        setSuccessMessage('Simulation completed (using local physics model)');
      }
      
    } catch (err) {
      console.error('Simulation error:', err);
      setError('Failed to run simulation: ' + (err.message || 'Unknown error'));
      setShowError(true);
    } finally {
      setIsLoading(false);
    }
  }, [parameters]);
  
  // Load a saved configuration
  const loadConfiguration = useCallback(async (configId) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // In a real implementation, this would be an API call
      // For now we'll simulate loading a config
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Mock different configurations
      let loadedConfig;
      
      switch (configId) {
        case 1:
          loadedConfig = {
            materialType: 'nickel',
            secondaryMaterial: 'hydrogen',
            temperature: 400, 
            pressure: 5.0,
            catalystType: 'palladium',
            catalystConcentration: 0.05,
            electrodeConfig: 'coaxial',
            currentDensity: 0.8,
            pulseFrequency: 50,
            pulseWidth: 100,
            magneticFieldStrength: 0.2,
            surfaceTreatment: 'plasma_etched',
            nanostructured: true,
            defectDensity: 0.1,
            grainSize: 50,
            showLattice: true,
            showHotSpots: true,
            showEnergyFlow: true,
            timeStepSize: 0.1,
            totalSimulationTime: 10
          };
          break;
        case 2:
          loadedConfig = {
            materialType: 'palladium',
            secondaryMaterial: 'deuterium',
            temperature: 300, 
            pressure: 2.0,
            catalystType: 'platinum',
            catalystConcentration: 0.03,
            electrodeConfig: 'parallel',
            currentDensity: 0.5,
            pulseFrequency: 0, // DC current
            pulseWidth: 0,
            magneticFieldStrength: 0,
            surfaceTreatment: 'annealed',
            nanostructured: false,
            defectDensity: 0.05,
            grainSize: 100,
            showLattice: true,
            showHotSpots: false,
            showEnergyFlow: true,
            timeStepSize: 0.05,
            totalSimulationTime: 15
          };
          break;
        case 3:
          loadedConfig = {
            materialType: 'titanium',
            secondaryMaterial: 'hydrogen',
            temperature: 350, 
            pressure: 8.0,
            catalystType: 'nickel',
            catalystConcentration: 0.07,
            electrodeConfig: 'spiral',
            currentDensity: 1.2,
            pulseFrequency: 100,
            pulseWidth: 50,
            magneticFieldStrength: 0.5,
            surfaceTreatment: 'nanostructured',
            nanostructured: true,
            defectDensity: 0.2,
            grainSize: 20,
            showLattice: true,
            showHotSpots: true,
            showEnergyFlow: true,
            timeStepSize: 0.1,
            totalSimulationTime: 8
          };
          break;
        default:
          throw new Error('Configuration not found');
      }
      
      setParameters(loadedConfig);
      setSuccessMessage('Configuration loaded successfully');
    } catch (err) {
      console.error('Loading configuration error:', err);
      setError('Failed to load configuration: ' + (err.message || 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  // Save current configuration
  const saveConfiguration = useCallback(async () => {
    if (!parameters || !configName) return;
    
    setIsSaving(true);
    setError(null);
    
    try {
      // In a real implementation, this would be an API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock saving - in real implementation, we would post to an API
      const newConfig = {
        id: configsList.length + 1,
        name: configName,
        description: configDescription,
        parameters: { ...parameters }
      };
      
      setConfigsList(prev => [...prev, newConfig]);
      setSuccessMessage('Configuration saved successfully');
      setSaveDialogOpen(false);
      setConfigName('');
      setConfigDescription('');
    } catch (err) {
      console.error('Saving configuration error:', err);
      setError('Failed to save configuration: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSaving(false);
    }
  }, [parameters, configName, configDescription, configsList]);
  
  // Set comparison configuration
  const setComparisonMode = useCallback(async (configId) => {
    if (!configId) {
      setComparisonConfig(null);
      setComparisonData(null);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // In a real implementation, this would be an API call
      const selectedConfig = configsList.find(config => config.id === configId);
      
      if (!selectedConfig) {
        throw new Error('Configuration not found');
      }
      
      // Mock loading comparison data
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Generate mock comparison data using the physics server
      const simulationConfig = {
        models: [
          {
            model_type: 'electron_screening',
            parameters: {
              enhancement_factor: 5.0,
              screening_length: 10 // pm
            }
          },
          {
            model_type: 'phonon_modes',
            parameters: {
              coupling_strength: 0.5,
              resonance_frequency: 10 // THz
            }
          }
        ],
        lattice: {
          type: selectedConfig.parameters.materialType === 'palladium' ? 'fcc' : 
                selectedConfig.parameters.materialType === 'titanium' ? 'hcp' : 'fcc',
          dimensions: [10, 10, 10],
          constants: [3.89, 3.89, 3.89],
          elements: [
            {
              symbol: selectedConfig.parameters.materialType.charAt(0).toUpperCase() + selectedConfig.parameters.materialType.slice(1),
              position: [0, 0, 0],
              occupancy: 1.0
            },
            {
              symbol: selectedConfig.parameters.secondaryMaterial.charAt(0).toUpperCase() + selectedConfig.parameters.secondaryMaterial.slice(1),
              position: [0.5, 0.5, 0.5],
              occupancy: selectedConfig.parameters.materialType === 'palladium' ? 0.6 : 0.8
            }
          ]
        },
        conditions: {
          temperature: selectedConfig.parameters.temperature,
          pressure: selectedConfig.parameters.pressure,
          electric_field: [0, 0, selectedConfig.parameters.currentDensity / 10],
          magnetic_field: selectedConfig.parameters.magneticFieldStrength ? [0, 0, selectedConfig.parameters.magneticFieldStrength] : undefined
        },
        simulation_parameters: {
          time_step: selectedConfig.parameters.timeStepSize,
          total_steps: selectedConfig.parameters.totalSimulationTime / selectedConfig.parameters.timeStepSize,
          save_frequency: 10
        }
      };

      // Try to use real physics API for comparison
      try {
        const [enhancementResult, reactionRateResult] = await Promise.all([
          physicsAPI.calculateEnhancement(selectedConfig.parameters),
          physicsAPI.calculateReactionRate(selectedConfig.parameters)
        ]);
        
        const simId = `comparison-${Date.now()}`;
        
        const comparisonResults = {
          simulation_id: simId,
          status: 'completed',
          parameters: selectedConfig.parameters,
          results: {
            enhancement: enhancementResult,
            reactionRate: reactionRateResult,
            total_enhancement: enhancementResult.total_enhancement,
            dominant_mechanism: enhancementResult.dominant_mechanism,
            individual_factors: enhancementResult.individual_factors
          },
          timeSeriesData: generateTimeSeriesFromPhysics(enhancementResult, reactionRateResult, selectedConfig.parameters),
          latticeData: simulationConfig.lattice_parameters
        };
        
        setComparisonConfig(selectedConfig);
        setComparisonData(comparisonResults);
        setSuccessMessage('Comparison data loaded using real physics calculations');
        
      } catch (apiError) {
        console.warn('Real physics API unavailable for comparison:', apiError.message);
        
        const fallbackResults = generateFallbackResults(selectedConfig.parameters, simulationConfig);
        setComparisonConfig(selectedConfig);
        setComparisonData(fallbackResults);
        setSuccessMessage('Comparison data loaded (using local physics model)');
      }
    } catch (err) {
      console.error('Loading comparison error:', err);
      setError('Failed to load comparison data: ' + (err.message || 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [configsList]);
  
  // Download simulation results
  const downloadResults = useCallback(() => {
    if (!simulationData) return;
    
    try {
      // Create a blob with the simulation data
      const blob = new Blob(
        [JSON.stringify({ parameters, results: simulationData }, null, 2)], 
        { type: 'application/json' }
      );
      
      // Create a download link and trigger it
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `lenr_simulation_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      setSuccessMessage('Results downloaded successfully');
    } catch (err) {
      console.error('Download error:', err);
      setError('Failed to download results: ' + (err.message || 'Unknown error'));
    }
  }, [simulationData, parameters]);
  
  // Clear error/success messages
  const handleCloseAlert = () => {
    setError(null);
    setSuccessMessage(null);
  };
  
  // Render loading backdrop
  const renderLoadingBackdrop = () => (
    <Backdrop
      sx={{ 
        color: '#fff', 
        zIndex: (theme) => theme.zIndex.drawer + 1,
        flexDirection: 'column',
        gap: 2
      }}
      open={isLoading}
    >
      <CircularProgress color="inherit" />
      <Typography variant="h6">
        {comparisonConfig ? 'Loading comparison data...' : 'Running simulation...'}
      </Typography>
    </Backdrop>
  );
  
  // Render save configuration dialog
  const renderSaveDialog = () => (
    <Dialog open={saveDialogOpen} onClose={() => setSaveDialogOpen(false)} maxWidth="sm" fullWidth>
      <DialogTitle>Save Configuration</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="Configuration Name"
          fullWidth
          value={configName}
          onChange={(e) => setConfigName(e.target.value)}
          variant="outlined"
          required
          sx={{ mb: 2 }}
        />
        <TextField
          margin="dense"
          label="Description (optional)"
          fullWidth
          value={configDescription}
          onChange={(e) => setConfigDescription(e.target.value)}
          variant="outlined"
          multiline
          rows={3}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
        <Button 
          onClick={saveConfiguration} 
          color="primary" 
          disabled={!configName || isSaving}
          startIcon={isSaving ? <CircularProgress size={20} /> : <SaveIcon />}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
  
  // Render information dialog
  const renderInfoDialog = () => (
    <Dialog open={showInfoDialog} onClose={() => setShowInfoDialog(false)} maxWidth="md" fullWidth>
      <DialogTitle>
        About the LENR Simulation Model
        <IconButton
          aria-label="close"
          onClick={() => setShowInfoDialog(false)}
          sx={{ position: 'absolute', right: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Typography variant="h6" gutterBottom>
          Model Overview
        </Typography>
        <Typography paragraph>
          This simulation models Low Energy Nuclear Reactions (LENR) in metal-hydrogen systems, focusing on the interactions between host lattice, hydrogen isotopes, and catalysts. The model accounts for lattice structure, defect density, temperature, pressure, and electromagnetic field effects to predict reaction rates and energy output.
        </Typography>
        
        <Typography variant="h6" gutterBottom>
          Material Systems
        </Typography>
        <Typography paragraph>
          <strong>Nickel-Hydrogen:</strong> Common LENR system with potential for excess heat production.
        </Typography>
        <Typography paragraph>
          <strong>Palladium-Deuterium:</strong> Classic "cold fusion" system first reported by Fleischmann and Pons.
        </Typography>
        <Typography paragraph>
          <strong>Titanium-Hydrogen:</strong> Alternative host material with different lattice properties.
        </Typography>
        
        <Typography variant="h6" gutterBottom>
          Key Parameters
        </Typography>
        <Typography paragraph>
          <strong>Temperature & Pressure:</strong> Affect hydrogen loading and reaction dynamics.
        </Typography>
        <Typography paragraph>
          <strong>Catalysts:</strong> Materials that may enhance reaction rates through surface or interface effects.
        </Typography>
        <Typography paragraph>
          <strong>Electrode Configuration:</strong> Determines current distribution and electromagnetic field patterns.
        </Typography>
        <Typography paragraph>
          <strong>Pulse Parameters:</strong> Frequency and width of current/voltage pulses that may trigger non-equilibrium conditions.
        </Typography>
        <Typography paragraph>
          <strong>Nanostructuring:</strong> Surface treatments and nanoscale features that may enhance reactivity.
        </Typography>
        <Typography paragraph>
          <strong>Defect Density:</strong> Concentration of lattice defects that can serve as active reaction sites.
        </Typography>
        
        <Typography variant="h6" gutterBottom>
          Physics Models
        </Typography>
        <Typography paragraph>
          <strong>Electron Screening:</strong> Enhanced tunneling probability due to electron screening effects.
        </Typography>
        <Typography paragraph>
          <strong>Phonon Coupling:</strong> Energy transfer between nuclear and lattice degrees of freedom.
        </Typography>
        <Typography paragraph>
          <strong>Quantum Effects:</strong> Quantum coherence and many-body effects in metal-hydrogen systems.
        </Typography>
        
        <Typography variant="h6" gutterBottom>
          Simulation Limitations
        </Typography>
        <Typography paragraph>
          This model is a simplified representation of complex and still-debated LENR phenomena. Results should be considered exploratory and not definitive predictions. The simulation does not claim to resolve the theoretical foundations of LENR but provides a computational framework for exploring parameter spaces and generating hypotheses.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setShowInfoDialog(false)} color="primary">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
  
  // If parameters aren't loaded yet, show loading
  if (!parameters) {
    return (
      <Container sx={{ pt: 4, pb: 6 }}>
        <Box display="flex" justifyContent="center" alignItems="center" height="50vh">
          <CircularProgress />
        </Box>
      </Container>
    );
  }
  
  return (
    <Container maxWidth="xl" sx={{ pt: 4, pb: 6 }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1">
          LENR Simulation
          <Tooltip title="Show model information">
            <IconButton onClick={() => setShowInfoDialog(true)} size="small" sx={{ ml: 1 }}>
              <InfoIcon />
            </IconButton>
          </Tooltip>
        </Typography>
        
        <Box>
          <Button 
            variant="outlined" 
            color="primary"
            startIcon={<SaveIcon />}
            onClick={() => setSaveDialogOpen(true)}
            sx={{ mr: 1 }}
          >
            Save Config
          </Button>
          
          <Button 
            variant="contained" 
            color="primary"
            startIcon={<PlayArrowIcon />}
            onClick={runSimulation}
            disabled={isLoading}
          >
            Run Simulation
          </Button>
        </Box>
      </Box>
      
      <Grid container spacing={3}>
        {/* Parameter controls */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper 
            elevation={3} 
            sx={{ 
              p: 2,
              height: '100%',
              maxHeight: '80vh',
              overflow: 'auto'
            }}
          >
            <Typography variant="h6" gutterBottom>
              Simulation Parameters
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            <LENRParameterControls 
              parameters={parameters} 
              onChange={handleParametersChange} 
              savedConfigs={configsList}
              onLoadConfig={loadConfiguration}
            />
          </Paper>
        </Grid>
        
        {/* Visualization area */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper 
            elevation={3} 
            sx={{ 
              p: 2,
              height: '75vh',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              mb: 2
            }}>
              <Typography variant="h6">
                Visualization
                {comparisonConfig && (
                  <Typography 
                    component="span" 
                    variant="body2" 
                    color="primary"
                    sx={{ ml: 2 }}
                  >
                    Comparing with: {comparisonConfig.name}
                    <IconButton 
                      size="small" 
                      onClick={() => setComparisonMode(null)}
                      sx={{ ml: 1 }}
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Typography>
                )}
              </Typography>
              
              <Box>
                {!comparisonConfig && configsList.length > 0 && (
                  <Button
                    startIcon={<CompareArrowsIcon />}
                    onClick={() => {
                      // In a real implementation, this would open a dialog to select a config
                      // For simplicity, we'll just use the first config in the list
                      setComparisonMode(configsList[0].id);
                    }}
                    sx={{ mr: 1 }}
                    disabled={!simulationData || isLoading}
                  >
                    Compare
                  </Button>
                )}
                
                <Button
                  startIcon={<DownloadIcon />}
                  onClick={downloadResults}
                  disabled={!simulationData || isLoading}
                >
                  Download Results
                </Button>
              </Box>
            </Box>
            
            <Divider sx={{ mb: 2 }} />
            
            <Box sx={{ flexGrow: 1, overflow: 'auto', minHeight: 500 }}>
              {simulationData ? (
                <LENRVisualization 
                  parameters={parameters}
                  timeSeriesData={simulationData}
                  comparisonData={comparisonData}
                />
              ) : (
                <Box 
                  sx={{ 
                    height: '100%', 
                    display: 'flex', 
                    flexDirection: 'column',
                    justifyContent: 'center', 
                    alignItems: 'center',
                    gap: 2
                  }}
                >
                  <Typography variant="body1" color="text.secondary" align="center">
                    No simulation data available yet.
                  </Typography>
                  <Typography variant="body2" color="text.secondary" align="center">
                    Configure parameters and click "Run Simulation" to start.
                  </Typography>
                  <Button 
                    variant="contained" 
                    color="primary"
                    startIcon={<PlayArrowIcon />}
                    onClick={runSimulation}
                    sx={{ mt: 2 }}
                  >
                    Run Simulation
                  </Button>
                </Box>
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>
      
      {/* Dialogs */}
      {renderSaveDialog()}
      {renderInfoDialog()}
      {renderLoadingBackdrop()}
      
      {/* Alerts */}
      <Snackbar 
        open={!!error} 
        autoHideDuration={6000} 
        onClose={handleCloseAlert}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseAlert} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
      
      <Snackbar 
        open={!!successMessage} 
        autoHideDuration={4000} 
        onClose={handleCloseAlert}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseAlert} severity="success" sx={{ width: '100%' }}>
          {successMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
}

export default LENRSimulationPage; 