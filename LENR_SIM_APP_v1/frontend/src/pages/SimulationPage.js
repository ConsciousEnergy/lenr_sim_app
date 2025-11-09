import React, { useState } from 'react';
import { Container, Grid, Paper, Typography, Box } from '@mui/material';
import LatticeVisualization from '../components/visualization/LatticeVisualization';
import LENRSimulationPanel from '../components/LENRSimulationPanel';

const SimulationPage = () => {
  const [simulationData, setSimulationData] = useState(null);
  
  // Handle simulation updates
  const handleSimulationUpdate = (results) => {
    console.log("Simulation updated with results:", results);
    setSimulationData({
      type: 'rydberg',
      results: results
    });
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        LENR Simulation
      </Typography>
      
      <Grid container spacing={3}>
        {/* Visualization Panel */}
        <Grid item xs={12} md={8}>
          <Box sx={{ height: '65vh' }}>
            <LatticeVisualization 
              simulationData={simulationData}
              visualizationSettings={{
                showEnergyDistribution: true,
                showPhononActivity: true
              }}
            />
          </Box>
        </Grid>
        
        {/* Simulation Controls */}
        <Grid item xs={12} md={4}>
          <Box sx={{ height: '65vh' }}>
            <LENRSimulationPanel 
              onSimulationUpdate={handleSimulationUpdate}
            />
          </Box>
        </Grid>
      </Grid>
    </Container>
  );
};

export default SimulationPage; 