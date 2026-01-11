import { useState } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  TextField, 
  Button, 
  Slider, 
  Grid, 
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';

/**
 * Component for testing the Rydberg model for LENR simulations
 */
const TestRydbergModel = () => {
  const [parameters, setParameters] = useState({
    temperature: 300,
    density: 1.0,
    electronEnergy: 5.0,
    materialCoefficient: 0.8,
    interactionStrength: 0.5
  });
  
  const [results, setResults] = useState(null);
  const [selectedMaterial, setSelectedMaterial] = useState('palladium');
  
  const materials = [
    { id: 'palladium', name: 'Palladium (Pd)' },
    { id: 'nickel', name: 'Nickel (Ni)' },
    { id: 'titanium', name: 'Titanium (Ti)' },
    { id: 'platinum', name: 'Platinum (Pt)' }
  ];
  
  const handleParameterChange = (param) => (event, newValue) => {
    setParameters({
      ...parameters,
      [param]: newValue !== undefined ? newValue : parseFloat(event.target.value)
    });
  };
  
  const handleMaterialChange = (event) => {
    setSelectedMaterial(event.target.value);
  };
  
  const runSimulation = () => {
    // Simulate calculation results
    const simulatedResults = {
      enhancementFactor: (Math.random() * 5 + parameters.interactionStrength * 10).toFixed(3),
      tunnellingProbability: (Math.random() * 0.001 * parameters.electronEnergy).toExponential(3),
      phononCoupling: (parameters.materialCoefficient * 0.5 + Math.random() * 0.2).toFixed(3),
      reactionRate: (Math.exp(-10/parameters.temperature) * parameters.density * 0.1).toExponential(4),
      energyOutput: (parameters.temperature * parameters.density * 0.05).toFixed(2),
      timestamp: new Date().toISOString()
    };
    
    setResults(simulatedResults);
  };
  
  return (
    <Box sx={{ padding: 3 }}>
      <Typography variant="h4" gutterBottom>
        Rydberg Model Test Environment
      </Typography>
      <Typography variant="body1" paragraph>
        Test and debug the Rydberg model parameters for LENR simulations.
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Model Parameters
            </Typography>
            
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel id="material-select-label">Material</InputLabel>
              <Select
                labelId="material-select-label"
                value={selectedMaterial}
                label="Material"
                onChange={handleMaterialChange}
              >
                {materials.map((material) => (
                  <MenuItem key={material.id} value={material.id}>
                    {material.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <Box sx={{ mb: 3 }}>
              <Typography gutterBottom>
                Temperature (K): {parameters.temperature}
              </Typography>
              <Slider
                value={parameters.temperature}
                onChange={handleParameterChange('temperature')}
                min={100}
                max={1000}
                step={10}
                marks={[
                  { value: 100, label: '100K' },
                  { value: 500, label: '500K' },
                  { value: 1000, label: '1000K' }
                ]}
              />
            </Box>
            
            <Box sx={{ mb: 3 }}>
              <Typography gutterBottom>
                Density (g/cm³): {parameters.density}
              </Typography>
              <Slider
                value={parameters.density}
                onChange={handleParameterChange('density')}
                min={0.1}
                max={3.0}
                step={0.1}
                marks={[
                  { value: 0.1, label: '0.1' },
                  { value: 1.5, label: '1.5' },
                  { value: 3.0, label: '3.0' }
                ]}
              />
            </Box>
            
            <Box sx={{ mb: 3 }}>
              <Typography gutterBottom>
                Electron Energy (eV): {parameters.electronEnergy}
              </Typography>
              <Slider
                value={parameters.electronEnergy}
                onChange={handleParameterChange('electronEnergy')}
                min={0.5}
                max={20}
                step={0.5}
                marks={[
                  { value: 0.5, label: '0.5eV' },
                  { value: 10, label: '10eV' },
                  { value: 20, label: '20eV' }
                ]}
              />
            </Box>
            
            <Box sx={{ mb: 3 }}>
              <Typography gutterBottom>
                Material Coefficient: {parameters.materialCoefficient}
              </Typography>
              <Slider
                value={parameters.materialCoefficient}
                onChange={handleParameterChange('materialCoefficient')}
                min={0.1}
                max={1.0}
                step={0.05}
                marks={[
                  { value: 0.1, label: '0.1' },
                  { value: 0.5, label: '0.5' },
                  { value: 1.0, label: '1.0' }
                ]}
              />
            </Box>
            
            <Box sx={{ mb: 3 }}>
              <Typography gutterBottom>
                Interaction Strength: {parameters.interactionStrength}
              </Typography>
              <Slider
                value={parameters.interactionStrength}
                onChange={handleParameterChange('interactionStrength')}
                min={0.1}
                max={1.0}
                step={0.05}
                marks={[
                  { value: 0.1, label: '0.1' },
                  { value: 0.5, label: '0.5' },
                  { value: 1.0, label: '1.0' }
                ]}
              />
            </Box>
            
            <Button 
              variant="contained" 
              color="primary" 
              startIcon={<PlayArrowIcon />}
              onClick={runSimulation}
              fullWidth
            >
              Run Simulation
            </Button>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Simulation Results
            </Typography>
            
            {results ? (
              <>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Parameter</TableCell>
                        <TableCell align="right">Value</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      <TableRow>
                        <TableCell>Enhancement Factor</TableCell>
                        <TableCell align="right">{results.enhancementFactor}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Tunnelling Probability</TableCell>
                        <TableCell align="right">{results.tunnellingProbability}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Phonon Coupling</TableCell>
                        <TableCell align="right">{results.phononCoupling}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Reaction Rate</TableCell>
                        <TableCell align="right">{results.reactionRate}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Energy Output (W/cm³)</TableCell>
                        <TableCell align="right">{results.energyOutput}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
                
                <Box sx={{ mt: 3 }}>
                  <Typography variant="caption" display="block" color="text.secondary">
                    Calculation timestamp: {results.timestamp}
                  </Typography>
                </Box>
              </>
            ) : (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography color="text.secondary">
                  No simulation results yet. Adjust parameters and run the simulation.
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default TestRydbergModel; 