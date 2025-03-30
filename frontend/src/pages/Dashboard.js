import React, { useState } from 'react';
import { Container, Grid, Paper, Typography, Box, Alert, CircularProgress, ToggleButtonGroup, ToggleButton, Divider } from '@mui/material';
import LatticeVisualization from '../components/visualization/LatticeVisualization';
import ParameterPanel from '../components/ParameterPanel';
import ResultsPanel from '../components/ResultsPanel';
import ExperimentalDataPanel from '../components/ExperimentalDataPanel';
import { getThermalTunneling, getImpactTunneling } from '../api/api';

function Dashboard() {
  const [simulationData, setSimulationData] = useState(null);
  const [simulationResults, setSimulationResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [simulationType, setSimulationType] = useState('thermal');
  const [simulationParams, setSimulationParams] = useState(null);

  const handleParameterChange = (parameters) => {
    console.log('Parameters updated:', parameters);
    // Update the lattice visualization based on parameters
    const mockData = {
      lattice: {
        structure: 'fcc',
        elements: ['Pd', 'D'],
        dimensions: { x: 3, y: 3, z: 3 },
        positions: [] // This would be filled with actual positions
      }
    };
    setSimulationData(mockData);
  };

  const handleSimulationTypeChange = (event, newType) => {
    if (newType !== null) {
      setSimulationType(newType);
    }
  };

  const handleRunSimulation = async (parameters) => {
    console.log(`Running ${simulationType} simulation with parameters:`, parameters);
    setLoading(true);
    setError(null);
    
    try {
      let response;
      
      if (simulationType === 'thermal') {
        // Format parameters for thermal tunneling API
        const apiParams = {
          T: parameters.T,
          lambda: parameters.lambda,
          r0: parameters.r0,
          k_spring: parameters.k_spring,
          potential: parameters.potential
        };
        
        // Store the parameters used for the simulation
        setSimulationParams(apiParams);
        
        // Call the thermal tunneling API
        response = await getThermalTunneling(apiParams);
      } else {
        // Format parameters for impact tunneling API
        const apiParams = {
          T_impact: parameters.T_impact,
          lambda: parameters.lambda,
          r0: parameters.r0,
          k_spring: parameters.k_spring,
          potential: parameters.potential,
          impact_duration: parameters.impact_duration
        };
        
        // Store the parameters used for the simulation
        setSimulationParams(apiParams);
        
        // Call the impact tunneling API
        response = await getImpactTunneling(apiParams);
      }
      
      // Transform the API response to the format expected by ResultsPanel
      const formattedResults = {
        tunnelingProbability: response.probability,
        energyLevels: response.energy_levels.map(level => level.energy),
        potentialEnergy: response.energy_levels[0]?.energy || 0,
        energy_levels: response.energy_levels, // Keep the original data for ExperimentalDataPanel
        metadata: {
          ...response.metadata,
          simulationType: simulationType
        }
      };
      
      setSimulationResults(formattedResults);
    } catch (error) {
      console.error('Error running simulation:', error);
      setError('Failed to run simulation. Please try again or check the parameters.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Grid container spacing={3}>
        {/* Parameter Panel */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Simulation Type
              </Typography>
              <ToggleButtonGroup
                value={simulationType}
                exclusive
                onChange={handleSimulationTypeChange}
                aria-label="simulation type"
                fullWidth
                size="small"
              >
                <ToggleButton value="thermal">
                  Thermal Tunneling
                </ToggleButton>
                <ToggleButton value="impact">
                  Impact Tunneling
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>
            
            <Divider sx={{ mb: 3 }} />
            
            <Typography variant="h6" gutterBottom>
              Simulation Parameters
            </Typography>
            <ParameterPanel 
              onParametersChange={handleParameterChange}
              onCalculate={handleRunSimulation}
              simulationType={simulationType}
            />
          </Paper>
        </Grid>

        {/* Visualization */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', height: 500 }}>
            <Typography variant="h6" gutterBottom>
              Lattice Visualization
            </Typography>
            <Box sx={{ flexGrow: 1, width: '100%' }}>
              <LatticeVisualization simulationData={simulationData} />
            </Box>
          </Paper>
        </Grid>

        {/* Results Panel */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Simulation Results {simulationResults && `(${simulationType.charAt(0).toUpperCase() + simulationType.slice(1)} Tunneling)`}
            </Typography>
            
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
                <CircularProgress />
                <Typography variant="body1" sx={{ ml: 2 }}>
                  Running {simulationType} simulation...
                </Typography>
              </Box>
            ) : (
              <ResultsPanel results={simulationResults} />
            )}
          </Paper>
        </Grid>
        
        {/* Experimental Data Panel */}
        <Grid item xs={12}>
          <ExperimentalDataPanel 
            simulationResults={simulationResults}
            simulationParams={simulationParams}
            simulationType={simulationType}
            isLoading={loading}
          />
        </Grid>
      </Grid>
    </Container>
  );
}

export default Dashboard;