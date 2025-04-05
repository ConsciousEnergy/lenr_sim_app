import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Paper,
  Typography, 
  Slider, 
  Grid, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem,
  TextField,
  Button,
  Divider,
  List,
  ListItem,
  ListItemText,
  Alert
} from '@mui/material';
import { styled } from '@mui/material/styles';
import RydbergMatterModel from '../models/RydbergMatterModel';
import { styled as muiStyled } from '@mui/material/styles';

// Extract the function from the imported object
const { generateRydbergSimulationParams } = RydbergMatterModel;

const SimulationPanel = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  borderRadius: theme.shape.borderRadius,
  boxShadow: theme.shadows[2],
  height: '100%',
  overflow: 'auto'
}));

// Styled slider component with improved styling for dark mode
const StyledSlider = muiStyled(Slider)(({ theme }) => ({
  '& .MuiSlider-markLabel': {
    color: theme.palette.mode === 'dark' ? '#CCCCCC' : theme.palette.text.secondary,
  },
  marginTop: theme.spacing(1.5),
  marginBottom: theme.spacing(1.5)
}));

// SliderControl with improved spacing
const SliderControl = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(3), // More bottom margin
  '& .MuiTypography-root': {
    marginBottom: theme.spacing(1), // Add space between label and slider
  }
}));

const ResultsPanel = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  marginTop: theme.spacing(2),
  backgroundColor: theme.palette.grey[50]
}));

const formatScientific = (value) => {
  // Handle null, undefined, or non-numeric values
  if (value === null || value === undefined || typeof value !== 'number' || isNaN(value)) {
    return 'N/A';
  }
  
  // Format numbers in scientific notation for better readability
  if (Math.abs(value) < 0.001 || Math.abs(value) > 1000) {
    return value.toExponential(3);
  }
  return value.toFixed(4);
};

const LENRSimulationPanel = ({ onSimulationUpdate }) => {
  // State for simulation parameters
  const [params, setParams] = useState({
    principalQuantumNumber: 10,
    orbitalExtension: 10,
    nuclearRadius: 0.1,
    potentialDifference: 0.1,
    doubleLayerDistance: 1,
    casimirArea: 1,
    casimirDistance: 1,
    originalBarrierHeight: 1000,
    reducedBarrierHeight: 500,
    particleMass: 2,
    barrierWidth: 1,
    particleDensity: 1e28,
    atomicNumber: 1, // Add atomic number parameter needed for calculateElectricField
    targetZ: 1, // Atomic number of target nucleus
    collisionEnergy: 0.1, // keV
    screeningFactor: 1.2 // Enhanced screening due to Rydberg electron cloud
  });
  
  // State for simulation results
  const [results, setResults] = useState(null);
  // Add error state
  const [error, setError] = useState(null);
  
  // Run the simulation when parameters change
  useEffect(() => {
    try {
      // Reset error state
      setError(null);
      
      // Check if the function exists
      if (typeof generateRydbergSimulationParams !== 'function') {
        throw new Error('Simulation function not available');
      }
      
      // Run simulation with error handling
      const simulationResults = generateRydbergSimulationParams(params);
      setResults(simulationResults);
      
      if (onSimulationUpdate) {
        onSimulationUpdate(simulationResults);
      }
    } catch (err) {
      console.error('Error in simulation:', err);
      setError(err.message || 'An error occurred while running the simulation');
      // Still notify parent, but with null results
      if (onSimulationUpdate) {
        onSimulationUpdate(null);
      }
    }
  }, [params, onSimulationUpdate]);
  
  // Handler for slider changes
  const handleSliderChange = (param) => (event, newValue) => {
    setParams({
      ...params,
      [param]: newValue
    });
  };
  
  // Handler for text input changes
  const handleInputChange = (param) => (event) => {
    const value = event.target.value === '' ? '' : Number(event.target.value);
    setParams({
      ...params,
      [param]: value
    });
  };
  
  // Add a safe property accessor function
  const safeGet = (obj, path, defaultValue = 'N/A') => {
    try {
      if (!obj) return defaultValue;
      
      const value = path.split('.').reduce((o, key) => o && o[key] !== undefined ? o[key] : undefined, obj);
      return value !== undefined ? value : defaultValue;
    } catch (e) {
      return defaultValue;
    }
  };

  return (
    <SimulationPanel>
      <Typography variant="h6" gutterBottom>
        LENR Simulation Parameters
      </Typography>
      <Divider sx={{ mb: 2 }} />
      
      {/* Display error message if there is one */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <SliderControl>
            <Typography gutterBottom>
              Principal Quantum Number (n): {params.principalQuantumNumber}
            </Typography>
            <Slider
              value={params.principalQuantumNumber}
              onChange={handleSliderChange('principalQuantumNumber')}
              min={1}
              max={20}
              step={1}
              marks={[
                { value: 1, label: '1' },
                { value: 10, label: '10' },
                { value: 20, label: '20' }
              ]}
            />
          </SliderControl>
          
          <SliderControl>
            <Typography gutterBottom>
              Orbital Extension (Bohr radii): {params.orbitalExtension}
            </Typography>
            <Slider
              value={params.orbitalExtension}
              onChange={handleSliderChange('orbitalExtension')}
              min={1}
              max={20}
              step={1}
            />
          </SliderControl>
          
          <SliderControl>
            <Typography gutterBottom>
              Nuclear Radius (nm): {params.nuclearRadius}
            </Typography>
            <Slider
              value={params.nuclearRadius}
              onChange={handleSliderChange('nuclearRadius')}
              min={0.01}
              max={0.5}
              step={0.01}
            />
          </SliderControl>
          
          <SliderControl>
            <Typography gutterBottom>
              Potential Difference (V): {params.potentialDifference}
            </Typography>
            <Slider
              value={params.potentialDifference}
              onChange={handleSliderChange('potentialDifference')}
              min={0.01}
              max={1}
              step={0.01}
            />
          </SliderControl>
          
          <SliderControl>
            <Typography gutterBottom>
              Double Layer Distance (nm): {params.doubleLayerDistance}
            </Typography>
            <Slider
              value={params.doubleLayerDistance}
              onChange={handleSliderChange('doubleLayerDistance')}
              min={0.1}
              max={10}
              step={0.1}
            />
          </SliderControl>
          
          {/* New Nuclear Fusion Parameters Section */}
          <Typography variant="subtitle1" sx={{ mt: 3, mb: 1 }}>
            Nuclear Fusion Parameters
          </Typography>
          <Divider sx={{ mb: 2 }} />
          
          <SliderControl>
            <Typography gutterBottom>
              Target Nucleus Z: {params.targetZ}
            </Typography>
            <Slider
              value={params.targetZ}
              onChange={handleSliderChange('targetZ')}
              min={1}
              max={10}
              step={1}
              marks={[
                { value: 1, label: 'H' },
                { value: 2, label: 'He' },
                { value: 3, label: 'Li' }
              ]}
            />
          </SliderControl>
          
          <SliderControl>
            <Typography gutterBottom>
              Collision Energy (keV): {params.collisionEnergy}
            </Typography>
            <Slider
              value={params.collisionEnergy}
              onChange={handleSliderChange('collisionEnergy')}
              min={0.01}
              max={10}
              step={0.01}
              marks={[
                { value: 0.01, label: '0.01' },
                { value: 1, label: '1' },
                { value: 10, label: '10' }
              ]}
              scale={(x) => x}
            />
          </SliderControl>
          
          <SliderControl>
            <Typography gutterBottom>
              Screening Factor: {params.screeningFactor}
            </Typography>
            <StyledSlider
              value={params.screeningFactor}
              onChange={handleSliderChange('screeningFactor')}
              min={1}
              max={5}
              step={0.1}
              marks={[
                { value: 1, label: 'No screening' },
                { value: 5, label: 'Enhanced' }
              ]}
            />
          </SliderControl>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <SliderControl>
            <Typography gutterBottom>
              Casimir Area (μm²): {params.casimirArea}
            </Typography>
            <Slider
              value={params.casimirArea}
              onChange={handleSliderChange('casimirArea')}
              min={0.1}
              max={10}
              step={0.1}
            />
          </SliderControl>
          
          <SliderControl>
            <Typography gutterBottom>
              Casimir Distance (nm): {params.casimirDistance}
            </Typography>
            <Slider
              value={params.casimirDistance}
              onChange={handleSliderChange('casimirDistance')}
              min={0.1}
              max={10}
              step={0.1}
            />
          </SliderControl>
          
          <SliderControl>
            <Typography gutterBottom>
              Original Barrier Height (eV): {params.originalBarrierHeight}
            </Typography>
            <Slider
              value={params.originalBarrierHeight}
              onChange={handleSliderChange('originalBarrierHeight')}
              min={100}
              max={2000}
              step={100}
            />
          </SliderControl>
          
          <SliderControl>
            <Typography gutterBottom>
              Reduced Barrier Height (eV): {params.reducedBarrierHeight}
            </Typography>
            <Slider
              value={params.reducedBarrierHeight}
              onChange={handleSliderChange('reducedBarrierHeight')}
              min={100}
              max={params.originalBarrierHeight}
              step={10}
            />
          </SliderControl>
          
          <SliderControl>
            <Typography gutterBottom>
              Particle Density (10²⁸ m⁻³): {params.particleDensity / 1e28}
            </Typography>
            <Slider
              value={params.particleDensity / 1e28}
              onChange={(e, val) => handleSliderChange('particleDensity')(e, val * 1e28)}
              min={0.1}
              max={10}
              step={0.1}
            />
          </SliderControl>
          
          <SliderControl>
            <Typography gutterBottom>
              Atomic Number (Z): {params.atomicNumber}
            </Typography>
            <Slider
              value={params.atomicNumber}
              onChange={handleSliderChange('atomicNumber')}
              min={1}
              max={10}
              step={1}
              marks={[
                { value: 1, label: '1' },
                { value: 5, label: '5' },
                { value: 10, label: '10' }
              ]}
            />
          </SliderControl>
        </Grid>
      </Grid>
      
      {results && (
        <ResultsPanel>
          <Typography variant="h6" gutterBottom>
            Simulation Results
          </Typography>
          <Divider sx={{ mb: 2 }} />
          
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="Rydberg Energy"
                    secondary={`${formatScientific(safeGet(results, 'rydbergEnergy'))} eV`}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Rydberg Radius"
                    secondary={`${formatScientific(safeGet(results, 'rydbergRadius'))} nm`}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Overlap Probability"
                    secondary={formatScientific(safeGet(results, 'overlapProbability'))}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Electric Field"
                    secondary={`${formatScientific(safeGet(results, 'electricField'))} V/m`}
                  />
                </ListItem>
              </List>
            </Grid>
            <Grid item xs={12} md={6}>
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="Cross-Section"
                    secondary={`${formatScientific(safeGet(results, 'crossSection'))} m²`}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Casimir Force"
                    secondary={`${formatScientific(safeGet(results, 'casimirForce'))} N`}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Tunneling Enhancement"
                    secondary={formatScientific(safeGet(results, 'tunnelingEnhancement'))}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="BEC Temperature"
                    secondary={`${formatScientific(safeGet(results, 'becTemperature'))} K`}
                  />
                </ListItem>
              </List>
            </Grid>
          </Grid>
        </ResultsPanel>
      )}
    </SimulationPanel>
  );
};

export default LENRSimulationPanel; 