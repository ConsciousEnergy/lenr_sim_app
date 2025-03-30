import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Grid, 
  Container, 
  Paper, 
  Typography, 
  Tabs, 
  Tab, 
  Alert, 
  useTheme, 
  useMediaQuery 
} from '@mui/material';
import ParameterPanel from '../components/ParameterPanel';
import ResultsPanel from '../components/ResultsPanel';
import ExperimentalDataUploader from '../components/Uploader';
import LatticeVisualization from '../components/visualization/LatticeVisualization';
import ExportModule from '../components/data/ExportModule';
import PresetSelector from '../components/PresetSelector';
import * as api from '../api/api';

const USE_MOCK_API = process.env.NODE_ENV === 'development';

const Dashboard = () => {
  const theme = useTheme();
  const isLargeScreen = useMediaQuery(theme.breakpoints.up('lg'));
  
  // Simulation state
  const [simulationData, setSimulationData] = useState(null);
  const [results, setResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [simulationStatus, setSimulationStatus] = useState('ready'); // ready, running, paused, completed, error
  
  // Parameter state
  const [parameters, setParameters] = useState({
    T: 300,
    lambda: 1e-10,
    r0: 1e-10,
    k_spring: 10000,
    potential: 'harmonic',
    nTimeSteps: 1000,
    impactT: 0,
    impactDuration: 0
  });
  
  // Experimental data state
  const [experimentalData, setExperimentalData] = useState(null);
  
  // Visual settings state
  const [visualizationSettings, setVisualizationSettings] = useState({
    colorMode: 'default',
    showLabels: true,
    animationSpeed: 1
  });
  
  // Handle parameter changes
  const handleParameterChange = (param, value) => {
    setParameters(prev => ({ ...prev, [param]: value }));
  };
  
  // Handle preset selection
  const handlePresetSelect = (presetParams) => {
    setParameters({...presetParams});
  };
  
  // Handle experimental data upload
  const handleExperimentalDataUpload = (data) => {
    console.log('Experimental data uploaded:', data);
    setExperimentalData(data);
  };
  
  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };
  
  // Simulation control handlers
  const handleStartSimulation = async () => {
    setIsLoading(true);
    setError(null);
    setSimulationStatus('running');
    
    try {
      const data = await api.runSimulation(parameters, USE_MOCK_API);
      setSimulationData(data);
      setResults(data.results);
      setSimulationStatus('completed');
    } catch (err) {
      console.error('Simulation error:', err);
      setError('Failed to run simulation: ' + (err.message || 'Unknown error'));
      setSimulationStatus('error');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handlePauseSimulation = async () => {
    try {
      await api.pauseSimulation(USE_MOCK_API);
      setSimulationStatus('paused');
    } catch (err) {
      console.error('Failed to pause simulation:', err);
    }
  };
  
  const handleStopSimulation = async () => {
    try {
      await api.stopSimulation(USE_MOCK_API);
      setSimulationStatus('ready');
    } catch (err) {
      console.error('Failed to stop simulation:', err);
    }
  };
  
  const handleResetSimulation = async () => {
    try {
      // We can now use the mock function in development mode
      if (USE_MOCK_API) {
        await api.mockResetSimulation();
      } else {
        await api.resetSimulation();
      }
      setSimulationData(null);
      setResults(null);
      setSimulationStatus('ready');
    } catch (err) {
      console.error('Failed to reset simulation:', err);
    }
  };
  
  // Prepare additional simulation parameters for visualization components
  const simulationParameters = {
    ...parameters,
    lattice: {
      structure: 'fcc',
      host_metal: 'Pd',
      fuel: 'D',
      loading: 0.6, // D/Pd ratio
      dimensions: { x: 5, y: 5, z: 5 }
    }
  };
  
  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      
      <Grid container spacing={3}>
        {/* Left column - Parameters & Experimental Data */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
              <Tabs value={activeTab} onChange={handleTabChange} aria-label="dashboard tabs">
                <Tab label="Parameters" />
                <Tab label="Experimental Data" />
                <Tab label="Presets" />
              </Tabs>
            </Box>
            
            <Box hidden={activeTab !== 0} sx={{ flexGrow: 1 }}>
              <ParameterPanel 
                parameters={parameters} 
                onParameterChange={handleParameterChange}
                onStartSimulation={handleStartSimulation}
                isLoading={isLoading}
              />
            </Box>
            
            <Box hidden={activeTab !== 1} sx={{ flexGrow: 1 }}>
              <ExperimentalDataUploader 
                onDataParsed={handleExperimentalDataUpload}
              />
            </Box>
            
            <Box hidden={activeTab !== 2} sx={{ flexGrow: 1 }}>
              <PresetSelector onPresetSelect={handlePresetSelect} />
            </Box>
          </Paper>
        </Grid>
        
        {/* Center column - Visualization */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', height: isLargeScreen ? 600 : 500 }}>
            <Typography variant="h6" gutterBottom>
              3D Lattice Visualization
            </Typography>
            
            <Box sx={{ flexGrow: 1, position: 'relative' }}>
              <LatticeVisualization 
                simulationData={simulationData}
                visualizationSettings={visualizationSettings}
                onSimulationStart={handleStartSimulation}
                onSimulationPause={handlePauseSimulation}
                onSimulationStop={handleStopSimulation}
                onSimulationReset={handleResetSimulation}
                simulationStatus={simulationStatus}
                simulationParameters={simulationParameters}
              />
            </Box>
          </Paper>
        </Grid>
        
        {/* Results & Export */}
        <Grid item xs={12}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column' }}>
                <Typography variant="h6" gutterBottom>
                  Simulation Results
                </Typography>
                <ResultsPanel 
                  results={results} 
                  isLoading={isLoading} 
                  error={error}
                />
              </Paper>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column' }}>
                <Typography variant="h6" gutterBottom>
                  Data Analysis
                </Typography>
                <ExportModule
                  simulationResults={results}
                  experimentalData={experimentalData}
                  simulationParameters={parameters}
                />
              </Paper>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Dashboard;