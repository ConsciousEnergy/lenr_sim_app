import React, { useState } from 'react';
import { Container, Typography, Paper, Box, Divider, Stack, TextField, Button, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { useInitializeSimulation } from '../api/physics/hooks';
import PhysicsVisualizationContainer from '../visualization/components/PhysicsVisualizationContainer';
import { SimulationInitializeRequest } from '../api/physics/types';

/**
 * Page for testing the integrated physics visualization
 */
const PhysicsVisualizationPage: React.FC = () => {
  const [simulationId, setSimulationId] = useState<string | null>(null);
  const [manualSimulationId, setManualSimulationId] = useState('');
  const [latticeSize, setLatticeSize] = useState(5);
  const { initializeSimulation, isLoading: isInitializing } = useInitializeSimulation();

  // Handle creating a new simulation
  const handleInitializeSimulation = async () => {
    // Create default physics configuration
    const defaultConfig: SimulationInitializeRequest = {
      models: [
        {
          model_type: 'quantum_tunneling',
          parameters: {
            barrier_width: 1e-10,
            screening_potential: 100
          }
        },
        {
          model_type: 'electron_screening',
          parameters: {
            density: 1e22,
            temperature: 300
          }
        }
      ],
      lattice: {
        type: 'fcc',
        dimensions: [latticeSize, latticeSize, latticeSize],
        constants: [3.89e-10, 3.89e-10, 3.89e-10],
        elements: generateLatticeElements([latticeSize, latticeSize, latticeSize])
      },
      conditions: {
        temperature: 300,
        pressure: 101325, // 1 atm
        electric_field: [0, 0, 1e5]
      },
      simulation_parameters: {
        time_step: 1e-15,
        total_steps: 1000,
        save_frequency: 10
      }
    };

    try {
      const response = await initializeSimulation(defaultConfig);
      setSimulationId(response.simulation_id);
    } catch (error) {
      console.error("Failed to initialize simulation:", error);
    }
  };

  // Handle using a manually entered simulation ID
  const handleUseManualId = () => {
    if (manualSimulationId.trim()) {
      setSimulationId(manualSimulationId);
    }
  };

  // Generate random lattice elements
  const generateLatticeElements = (dimensions: [number, number, number]) => {
    const [nx, ny, nz] = dimensions;
    const elements = [];
    
    // Create a 3D FCC lattice
    for (let x = 0; x < nx; x++) {
      for (let y = 0; y < ny; y++) {
        for (let z = 0; z < nz; z++) {
          // Add corner atoms
          elements.push({
            symbol: 'Pd',
            position: [x, y, z],
            occupancy: 1.0
          });
          
          // Add face-centered atoms
          if (x < nx - 1 && y < ny - 1) {
            elements.push({
              symbol: 'Pd',
              position: [x + 0.5, y + 0.5, z],
              occupancy: 1.0
            });
          }
          
          if (x < nx - 1 && z < nz - 1) {
            elements.push({
              symbol: 'Pd',
              position: [x + 0.5, y, z + 0.5],
              occupancy: 1.0
            });
          }
          
          if (y < ny - 1 && z < nz - 1) {
            elements.push({
              symbol: 'Pd',
              position: [x, y + 0.5, z + 0.5],
              occupancy: 1.0
            });
          }
        }
      }
    }
    
    // Add deuterium at octahedral sites with 80% loading
    for (let i = 0; i < elements.length; i++) {
      if (Math.random() < 0.8) {
        const basePos = elements[i].position;
        elements.push({
          symbol: 'D',
          position: [
            basePos[0] + (Math.random() * 0.2 - 0.1),
            basePos[1] + (Math.random() * 0.2 - 0.1),
            basePos[2] + (Math.random() * 0.2 - 0.1)
          ],
          occupancy: 0.8
        });
      }
    }
    
    return elements;
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Physics Visualization Test
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        This page demonstrates the integrated physics visualization with real-time WebSocket updates.
      </Typography>
      
      <Divider sx={{ my: 3 }} />
      
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
        <Box sx={{ width: { xs: '100%', md: '33%' } }}>
          <Paper elevation={3} sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Simulation Controls
            </Typography>
            
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Create New Simulation
              </Typography>
              
              <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                <InputLabel id="lattice-size-label">Lattice Size</InputLabel>
                <Select
                  labelId="lattice-size-label"
                  value={latticeSize}
                  label="Lattice Size"
                  onChange={(e) => setLatticeSize(e.target.value as number)}
                >
                  <MenuItem value={3}>3x3x3</MenuItem>
                  <MenuItem value={5}>5x5x5</MenuItem>
                  <MenuItem value={8}>8x8x8</MenuItem>
                  <MenuItem value={10}>10x10x10</MenuItem>
                </Select>
              </FormControl>
              
              <Button 
                variant="contained" 
                fullWidth 
                onClick={handleInitializeSimulation}
                disabled={isInitializing}
              >
                {isInitializing ? 'Initializing...' : 'Initialize New Simulation'}
              </Button>
            </Box>
            
            <Divider sx={{ my: 2 }} />
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Use Existing Simulation
              </Typography>
              
              <TextField
                label="Simulation ID"
                variant="outlined"
                size="small"
                fullWidth
                value={manualSimulationId}
                onChange={(e) => setManualSimulationId(e.target.value)}
                sx={{ mb: 1 }}
              />
              
              <Button 
                variant="outlined" 
                fullWidth
                onClick={handleUseManualId}
              >
                Use This ID
              </Button>
            </Box>
            
            {simulationId && (
              <Box sx={{ mt: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                <Typography variant="subtitle2" color="primary">
                  Active Simulation
                </Typography>
                <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                  {simulationId}
                </Typography>
              </Box>
            )}
          </Paper>
        </Box>
        
        <Box sx={{ width: { xs: '100%', md: '67%' } }}>
          {simulationId ? (
            <PhysicsVisualizationContainer 
              simulationId={simulationId}
              title="LENR Lattice Simulation"
              height={500}
            />
          ) : (
            <Paper 
              elevation={3} 
              sx={{ 
                p: 3, 
                height: 500, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                bgcolor: 'background.default'
              }}
            >
              <Typography variant="h6" color="text.secondary" align="center">
                Initialize a simulation or enter an existing simulation ID to start visualization
              </Typography>
            </Paper>
          )}
        </Box>
      </Stack>
    </Container>
  );
};

export default PhysicsVisualizationPage; 