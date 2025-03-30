import React, { useState } from 'react';
import { Container, Grid, Paper, Typography, Box } from '@mui/material';
import LatticeVisualization from '../components/visualization/LatticeVisualization';
import ParameterPanel from '../components/ParameterPanel';
import ResultsPanel from '../components/ResultsPanel';

function Dashboard() {
  const [simulationData, setSimulationData] = useState(null);
  const [simulationResults, setSimulationResults] = useState(null);

  const handleParameterChange = (parameters) => {
    console.log('Parameters updated:', parameters);
    // Simulate fetching data based on parameters
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

  const handleRunSimulation = async (parameters) => {
    console.log('Running simulation with parameters:', parameters);
    
    try {
      // In a real implementation, this would make an API call
      // For now, let's mock the results
      setTimeout(() => {
        const mockResults = {
          energyLevels: [-2.5, -1.8, -1.2, -0.5, 0.2, 0.8],
          tunnelingProbability: 0.0023,
          potentialEnergy: -3.2,
          metadata: {
            calculationTime: '0.45s',
            iterations: 1000,
            convergence: true
          }
        };
        setSimulationResults(mockResults);
      }, 1500);
    } catch (error) {
      console.error('Error running simulation:', error);
    }
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
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
            <Box sx={{ flexGrow: 1, width: '100%' }}>
              <LatticeVisualization simulationData={simulationData} />
            </Box>
          </Paper>
        </Grid>

        {/* Results Panel */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Simulation Results
            </Typography>
            <ResultsPanel results={simulationResults} />
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
}

export default Dashboard;