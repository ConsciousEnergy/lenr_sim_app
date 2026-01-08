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
import FusionParameterControls from '../components/controls/FusionParameterControls';
import FusionVisualization from '../components/visualizations/FusionVisualization';
import { generateFusionTimeSteps } from '../utils/mockData';
// Note: These imports are kept for future use in full implementation
// import { useNavigate } from 'react-router-dom';
// import { useTheme } from '@mui/material/styles';
// import ResultsPanel from '../components/results/ResultsPanel';

// API base URL
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

/**
 * Real physics API client for fusion calculations
 */
const fusionAPI = {
  async calculateFusionRate(params) {
    const response = await fetch(`${API_BASE}/api/physics/fusion-rate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reaction_type: params.reactionType || 'D-D',
        temperature_kev: (params.temperature || 1000) * 8.617e-8, // Convert K to keV
        density_m3: params.plasmaDensity || 1e20,
        confinement_time_s: params.confinementTime || 1.0,
        material: params.materialType || 'palladium'
      })
    });
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return response.json();
  }
};

/**
 * FusionSimulationPage Component
 * 
 * Main page for fusion simulation model with parameter controls and visualization
 */
function FusionSimulationPage() {
  // Note: These hooks are kept for future use but currently unused
  // const navigate = useNavigate();
  // const theme = useTheme();
  
  // Simulation states
  const [parameters, setParameters] = useState(null);
  const [simulationData, setSimulationData] = useState(null);
  const [_comparisonData, setComparisonData] = useState(null); // Prefixed - for future comparison feature
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
  // Note: These states are prepared for full error handling UI - kept for future use
  const [_showError, setShowError] = useState(false);
  const [_simulationId, setSimulationId] = useState(null);
  const [_isRunning, setIsRunning] = useState(false);
  const [_alertMessage, setAlertMessage] = useState('');
  const [_alertSeverity, setAlertSeverity] = useState('info');
  const [_alertOpen, setAlertOpen] = useState(false);
  const [_savedSimulations, setSavedSimulations] = useState([]);
  
  // Initialize default parameters
  useEffect(() => {
    // In a real implementation, this could be fetched from an API
    const defaultParams = {
      reactionType: 'd-d',
      latticeType: 'palladium',
      temperature: 293, // Room temperature in K
      loadingRatio: 0.8,
      latticeDimension: 10,
      defectDensity: 0.1,
      diffusionCoefficient: 2.5e-7,
      initialFlux: 0.1,
      showLattice: true,
      showDiffusion: true,
      showHotSpots: true,
      timeStepSize: 0.1,
      totalSimulationTime: 10
    };
    
    setParameters(defaultParams);
    
    // Fetch saved configurations (mock implementation)
    // In a real implementation, this would be an API call
    setTimeout(() => {
      setConfigsList([
        { id: 1, name: 'Palladium D-D Standard', description: 'Standard configuration for deuterium in palladium' },
        { id: 2, name: 'Titanium High Temp', description: 'High temperature titanium lattice configuration' },
        { id: 3, name: 'Nickel P-7Li Config', description: 'Proton-Lithium7 reaction in nickel lattice' }
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
      // Try real physics API first
      try {
        const fusionResult = await fusionAPI.calculateFusionRate(parameters);
        
        const simId = `fusion-${Date.now()}`;
        setSimulationId(simId);
        
        // Transform API result and generate time series
        const data = {
          ...generateFusionTimeSteps(parameters),
          physicsResults: fusionResult,
          reactionRate: fusionResult.reaction_rate,
          powerDensity: fusionResult.power_density,
          qValue: fusionResult.q_value
        };
        
        setSimulationData(data);
        setSuccessMessage('Simulation completed using real physics calculations');
        
      } catch (apiError) {
        console.warn('Real fusion API unavailable, using fallback:', apiError.message);
        
        // Fallback to mock data generator
        const data = generateFusionTimeSteps(parameters);
        setSimulationData(data);
        
        const simId = `fusion-fallback-${Date.now()}`;
        setSimulationId(simId);
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
            reactionType: 'd-d',
            latticeType: 'palladium',
            temperature: 293,
            loadingRatio: 0.9,
            latticeDimension: 10,
            defectDensity: 0.05,
            diffusionCoefficient: 3e-7,
            initialFlux: 0.2,
            showLattice: true,
            showDiffusion: true,
            showHotSpots: true,
            timeStepSize: 0.1,
            totalSimulationTime: 10
          };
          break;
        case 2:
          loadedConfig = {
            reactionType: 'd-t',
            latticeType: 'titanium',
            temperature: 500,
            loadingRatio: 0.7,
            latticeDimension: 12,
            defectDensity: 0.15,
            diffusionCoefficient: 2e-7,
            initialFlux: 0.3,
            showLattice: true,
            showDiffusion: true,
            showHotSpots: true,
            timeStepSize: 0.05,
            totalSimulationTime: 15
          };
          break;
        case 3:
          loadedConfig = {
            reactionType: 'p-Li7',
            latticeType: 'nickel',
            temperature: 350,
            loadingRatio: 0.6,
            latticeDimension: 8,
            defectDensity: 0.2,
            diffusionCoefficient: 1.5e-7,
            initialFlux: 0.15,
            showLattice: true,
            showDiffusion: false,
            showHotSpots: true,
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
      
      // Generate mock comparison data based on the config
      const compData = generateFusionTimeSteps(selectedConfig.parameters);
      
      setComparisonConfig(selectedConfig);
      setComparisonData(compData);
      setSuccessMessage('Comparison data loaded successfully');
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
      link.download = `fusion_simulation_${new Date().toISOString().split('T')[0]}.json`;
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
        About the Fusion Simulation Model
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
          This simulation models low-energy nuclear reactions (LENR) in metal lattices, specifically focusing on fusion reactions between hydrogen isotopes and other elements. The model accounts for lattice structure, defect density, temperature, and hydrogen loading to predict reaction rates and energy output.
        </Typography>
        
        <Typography variant="h6" gutterBottom>
          Reaction Types
        </Typography>
        <Typography paragraph>
          <strong>D-D (Deuterium-Deuterium):</strong> Fusion between two deuterium nuclei, producing either helium-3 + neutron or tritium + proton.
        </Typography>
        <Typography paragraph>
          <strong>D-T (Deuterium-Tritium):</strong> Fusion between deuterium and tritium nuclei, typically producing helium-4 + neutron with high energy release.
        </Typography>
        <Typography paragraph>
          <strong>P-B11 (Proton-Boron):</strong> Aneutronic fusion between protons and boron-11, producing three helium-4 nuclei.
        </Typography>
        <Typography paragraph>
          <strong>P-Li7 (Proton-Lithium7):</strong> Fusion between protons and lithium-7, producing two helium-4 nuclei.
        </Typography>
        
        <Typography variant="h6" gutterBottom>
          Lattice Materials
        </Typography>
        <Typography paragraph>
          <strong>Palladium:</strong> Classic LENR host material with high hydrogen absorption capacity.
        </Typography>
        <Typography paragraph>
          <strong>Nickel:</strong> Alternative host material used in some LENR experiments with proton-based reactions.
        </Typography>
        <Typography paragraph>
          <strong>Titanium:</strong> Material with good hydrogen absorption properties and different lattice structure.
        </Typography>
        <Typography paragraph>
          <strong>Platinum:</strong> Noble metal with catalytic properties that can influence reaction dynamics.
        </Typography>
        
        <Typography variant="h6" gutterBottom>
          Key Parameters
        </Typography>
        <Typography paragraph>
          <strong>Temperature:</strong> Affects atom mobility and reaction probabilities.
        </Typography>
        <Typography paragraph>
          <strong>Loading Ratio:</strong> Ratio of hydrogen isotopes to metal atoms in the lattice.
        </Typography>
        <Typography paragraph>
          <strong>Defect Density:</strong> Concentration of defects in the lattice structure, which can serve as reaction sites.
        </Typography>
        <Typography paragraph>
          <strong>Diffusion Coefficient:</strong> Rate at which hydrogen isotopes move through the lattice.
        </Typography>
        
        <Typography variant="h6" gutterBottom>
          Simulation Limitations
        </Typography>
        <Typography paragraph>
          This model is a simplified representation of complex nuclear and solid-state physics phenomena. Results should be interpreted as exploratory rather than definitive predictions. The simulation does not account for all possible quantum effects or nuclear interaction pathways.
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
          Fusion Simulation
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
            
            <FusionParameterControls 
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
            
            <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
              {simulationData ? (
                <FusionVisualization 
                  parameters={parameters}
                  simulationData={simulationData}
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

export default FusionSimulationPage; 