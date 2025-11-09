import React, { useState } from 'react';
import { Box, Paper, Typography, Divider, Container, Alert } from '@mui/material';
import PhysicsParameterSet from './PhysicsParameterSets';

/**
 * Demo component for Physics Parameter Input controls
 */
const PhysicsSimulationDemo: React.FC = () => {
  const [currentParameters, setCurrentParameters] = useState<Record<string, number>>({});
  const [simulationParameters, setSimulationParameters] = useState<Record<string, number> | null>(null);

  const handleParametersChange = (parameters: Record<string, number>) => {
    setCurrentParameters(parameters);
  };

  const handleStartSimulation = (parameters: Record<string, number>) => {
    setSimulationParameters(parameters);
    // In a real implementation, we would call an API to start the simulation
    console.log('Starting simulation with parameters:', parameters);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        LENR Physics Simulation Parameters
      </Typography>
      
      <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' } }}>
        <Box sx={{ flex: 1 }}>
          <PhysicsParameterSet
            onParametersChange={handleParametersChange}
            onStartSimulation={handleStartSimulation}
          />
        </Box>
        
        <Box sx={{ flex: 1 }}>
          <Paper elevation={2} sx={{ p: 2, height: '100%' }}>
            <Typography variant="h5" gutterBottom>Parameter Preview</Typography>
            <Divider sx={{ mb: 2 }} />
            
            <Typography variant="subtitle1" gutterBottom>
              Current Parameters:
            </Typography>
            
            <Box sx={{ 
              p: 2, 
              backgroundColor: 'background.default', 
              borderRadius: 1,
              fontFamily: 'monospace',
              fontSize: 14,
              height: '200px',
              overflow: 'auto'
            }}>
              <pre>{JSON.stringify(currentParameters, null, 2)}</pre>
            </Box>

            {simulationParameters && (
              <>
                <Typography variant="subtitle1" gutterBottom sx={{ mt: 3 }}>
                  Simulation Started With:
                </Typography>
                
                <Alert severity="success" sx={{ mb: 2 }}>
                  Simulation started successfully!
                </Alert>
                
                <Box sx={{ 
                  p: 2, 
                  backgroundColor: 'background.default', 
                  borderRadius: 1,
                  fontFamily: 'monospace',
                  fontSize: 14,
                  height: '200px',
                  overflow: 'auto'
                }}>
                  <pre>{JSON.stringify(simulationParameters, null, 2)}</pre>
                </Box>
              </>
            )}
          </Paper>
        </Box>
      </Box>
    </Container>
  );
};

export default PhysicsSimulationDemo; 