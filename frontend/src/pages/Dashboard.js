import React, { useState } from 'react';
import { Container, Grid, Paper, Typography, Box, Alert, CircularProgress, Snackbar } from '@mui/material';
import LatticeVisualization from '../components/visualization/LatticeVisualization';
import ParameterPanel from '../components/ParameterPanel';
import ResultsPanel from '../components/ResultsPanel';
import * as api from '../api/api';

// Set this to true to use mock API for development/testing
const USE_MOCK_API = true;

function Dashboard() {
  const [simulationData, setSimulationData] = useState(null);
  const [simulationResults, setSimulationResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [simulationStatus, setSimulationStatus] = useState('ready'); // ready, running, paused, completed, error
  const [simulationParameters, setSimulationParameters] = useState(null);

  const handleParameterChange = (parameters) => {
    console.log('Parameters updated:', parameters);
    setSimulationParameters(parameters);
    // We still maintain this function, but don't trigger API calls
    // on every parameter change to avoid excessive API requests
  };

  const handleRunSimulation = async (parameters) => {
    try {
      setLoading(true);
      setError(null);
      setSimulationStatus('running');
      
      // Call the API to run the simulation
      let response;
      if (USE_MOCK_API) {
        response = await api.mockRunSimulation(parameters);
      } else {
        response = await api.runSimulation(parameters);
      }
      
      // Update simulation data and results
      setSimulationData(response.data);
      setSimulationResults(response.results);
      
      setSimulationStatus('completed');
    } catch (err) {
      console.error('Error running simulation:', err);
      setError('Failed to run simulation. Please try again.');
      setSimulationStatus('error');
    } finally {
      setLoading(false);
    }
  };

  // New simulation control handlers
  const handleSimulationStart = async () => {
    if (!simulationParameters) {
      setError('Please set simulation parameters first');
      return;
    }
    
    try {
      setSimulationStatus('running');
      setLoading(true);
      
      // Call the API to start or resume the simulation
      let response;
      if (USE_MOCK_API) {
        response = await api.mockRunSimulation(simulationParameters);
      } else {
        response = await api.runSimulation(simulationParameters);
      }
      
      // Update with initial data
      setSimulationData(response.data);
      
      // In a real application, you might set up a polling mechanism or WebSocket
      // to receive updates about the simulation progress
      setLoading(false);
    } catch (err) {
      console.error('Error starting simulation:', err);
      setError('Failed to start simulation. Please try again.');
      setSimulationStatus('error');
      setLoading(false);
    }
  };
  
  const handleSimulationPause = async () => {
    try {
      setSimulationStatus('paused');
      
      // Call API to pause the simulation
      if (!USE_MOCK_API) {
        await api.pauseSimulation();
      }
      
    } catch (err) {
      console.error('Error pausing simulation:', err);
      setError('Failed to pause simulation. Please try again.');
    }
  };
  
  const handleSimulationStop = async () => {
    try {
      setSimulationStatus('ready');
      
      // Call API to stop the simulation
      if (!USE_MOCK_API) {
        await api.stopSimulation();
      }
      
    } catch (err) {
      console.error('Error stopping simulation:', err);
      setError('Failed to stop simulation. Please try again.');
    }
  };
  
  const handleSimulationReset = () => {
    // Reset the simulation state
    setSimulationStatus('ready');
    setSimulationData(null);
    setSimulationResults(null);
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {error && (
        <Snackbar 
          open={!!error} 
          autoHideDuration={6000} 
          onClose={() => setError(null)}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        </Snackbar>
      )}
      
      <Grid container spacing={3}>
        {/* Parameter Panel */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Simulation Parameters
            </Typography>
            <ParameterPanel 
              onParameterChange={handleParameterChange}
              onRunSimulation={handleRunSimulation}
            />
          </Paper>
        </Grid>

        {/* Visualization */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', height: 500 }}>
            <Typography variant="h6" gutterBottom>
              Lattice Visualization
            </Typography>
            <Box sx={{ flexGrow: 1, width: '100%', position: 'relative' }}>
              {loading && (
                <Box 
                  sx={{ 
                    position: 'absolute', 
                    top: 0, 
                    left: 0, 
                    right: 0, 
                    bottom: 0, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    backgroundColor: 'rgba(255, 255, 255, 0.7)',
                    zIndex: 10
                  }}
                >
                  <CircularProgress />
                </Box>
              )}
              <LatticeVisualization 
                simulationData={simulationData}
                simulationStatus={simulationStatus}
                onSimulationStart={handleSimulationStart}
                onSimulationPause={handleSimulationPause}
                onSimulationStop={handleSimulationStop}
                onSimulationReset={handleSimulationReset}
              />
            </Box>
          </Paper>
        </Grid>

        {/* Results Panel */}
        <Grid item xs={12}>
          <ResultsPanel results={simulationResults} />
        </Grid>
      </Grid>
    </Container>
  );
}

export default Dashboard;