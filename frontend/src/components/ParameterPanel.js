import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Slider, 
  TextField, 
  Paper, 
  Grid, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem,
  Button,
  Tooltip
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { styled } from '@mui/material/styles';
import PresetsSelector from './PresetsSelector';

// Custom styled components
const ParameterBox = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  borderRadius: theme.shape.borderRadius,
  boxShadow: theme.shadows[2],
  marginBottom: theme.spacing(3),
}));

const InfoIconStyled = styled(InfoIcon)(({ theme }) => ({
  fontSize: '1rem',
  marginLeft: theme.spacing(1),
  color: theme.palette.info.main,
  cursor: 'help',
}));

const ParameterPanel = ({ parameters, onParameterChange, onStartSimulation, isLoading }) => {
  // Define local state for parameters if not provided externally
  const [localParameters, setLocalParameters] = useState({
    T: 300, // Temperature in Kelvin
    lambda: 1e-10, // Tunneling parameter in meters
    r0: 1e-10, // Equilibrium separation in meters
    k_spring: 1000, // Spring constant in N/m
    potential: 'harmonic', // Potential model type
    impactT: 0, // Impact temperature (for impact tunneling)
    impactDuration: 0, // Impact duration in seconds
    nTimeSteps: 1000, // Number of time steps
  });

  // Use external parameters if provided
  const effectiveParameters = parameters || localParameters;
  
  // Sliders have different ranges for different parameters
  const sliderRanges = {
    T: { min: 10, max: 1000, step: 10 },
    lambda: { min: 1e-11, max: 1e-9, step: 1e-11 },
    r0: { min: 5e-11, max: 5e-10, step: 5e-11 },
    k_spring: { min: 100, max: 10000, step: 100 },
    impactT: { min: 0, max: 10000, step: 100 },
    impactDuration: { min: 0, max: 1e-11, step: 1e-13 },
    nTimeSteps: { min: 100, max: 10000, step: 100 }
  };
  
  // Format slider values to readable form
  const formatSliderValue = (param, value) => {
    if (param === 'lambda' || param === 'r0' || param === 'impactDuration') {
      return `${value.toExponential(2)}`;
    }
    return value.toString();
  };

  // Handle slider changes
  const handleSliderChange = (param) => (event, newValue) => {
    if (parameters) {
      // If using external parameters, call the callback
      onParameterChange(param, newValue);
    } else {
      // Otherwise update local state
      setLocalParameters({ ...localParameters, [param]: newValue });
      // Call the callback with the entire parameter object if needed
      onParameterChange && onParameterChange(param, newValue);
    }
  };

  // Handle text input changes
  const handleInputChange = (param) => (event) => {
    const value = event.target.value === '' ? '' : Number(event.target.value);
    if (value !== '' && !isNaN(value) && value >= sliderRanges[param].min && value <= sliderRanges[param].max) {
      if (parameters) {
        // If using external parameters, call the callback
        onParameterChange(param, value);
      } else {
        // Otherwise update local state
        setLocalParameters({ ...localParameters, [param]: value });
        // Call the callback with the entire parameter object if needed
        onParameterChange && onParameterChange(param, value);
      }
    }
  };

  // Handle potential type change
  const handlePotentialChange = (event) => {
    const newValue = event.target.value;
    if (parameters) {
      // If using external parameters, call the callback
      onParameterChange('potential', newValue);
    } else {
      // Otherwise update local state
      setLocalParameters({ ...localParameters, potential: newValue });
      // Call the callback with the entire parameter object if needed
      onParameterChange && onParameterChange('potential', newValue);
    }
  };

  // Handle start simulation button click
  const handleStartSimulation = () => {
    onStartSimulation && onStartSimulation();
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Simulation Parameters
      </Typography>
      
      <ParameterBox>
        <Typography variant="h6" gutterBottom>
          Potential Model
        </Typography>
        <FormControl fullWidth margin="normal">
          <InputLabel id="potential-select-label">Potential Type</InputLabel>
          <Select
            labelId="potential-select-label"
            id="potential-select"
            value={effectiveParameters.potential}
            label="Potential Type"
            onChange={handlePotentialChange}
          >
            <MenuItem value="harmonic">Harmonic Oscillator</MenuItem>
            <MenuItem value="morse">Morse Potential</MenuItem>
          </Select>
        </FormControl>
      </ParameterBox>

      <ParameterBox>
        <Typography variant="h6" gutterBottom>
          Thermal Tunneling Parameters
        </Typography>
        
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12}>
            <Box display="flex" alignItems="center">
              <Typography id="T-slider-label">
                Temperature (K)
              </Typography>
              <Tooltip title="The system temperature affects the Boltzmann distribution of energy states">
                <InfoIconStyled />
              </Tooltip>
            </Box>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs>
                <Slider
                  value={effectiveParameters.T}
                  onChange={handleSliderChange('T')}
                  aria-labelledby="T-slider-label"
                  min={sliderRanges.T.min}
                  max={sliderRanges.T.max}
                  step={sliderRanges.T.step}
                  marks={[
                    { value: sliderRanges.T.min, label: sliderRanges.T.min },
                    { value: sliderRanges.T.max, label: sliderRanges.T.max }
                  ]}
                  valueLabelDisplay="auto"
                  valueLabelFormat={(value) => formatSliderValue('T', value)}
                />
              </Grid>
              <Grid item>
                <TextField
                  value={effectiveParameters.T}
                  onChange={handleInputChange('T')}
                  inputProps={{
                    step: sliderRanges.T.step,
                    min: sliderRanges.T.min,
                    max: sliderRanges.T.max,
                    type: 'number',
                    'aria-labelledby': 'T-slider-label',
                  }}
                  size="small"
                  sx={{ width: 80 }}
                />
              </Grid>
            </Grid>
          </Grid>

          <Grid item xs={12}>
            <Box display="flex" alignItems="center">
              <Typography id="lambda-slider-label">
                Tunneling Parameter λ (m)
              </Typography>
              <Tooltip title="The tunneling parameter represents the characteristic length of quantum tunneling">
                <InfoIconStyled />
              </Tooltip>
            </Box>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs>
                <Slider
                  value={effectiveParameters.lambda}
                  onChange={handleSliderChange('lambda')}
                  aria-labelledby="lambda-slider-label"
                  min={sliderRanges.lambda.min}
                  max={sliderRanges.lambda.max}
                  step={sliderRanges.lambda.step}
                  marks={[
                    { value: sliderRanges.lambda.min, label: formatSliderValue('lambda', sliderRanges.lambda.min) },
                    { value: sliderRanges.lambda.max, label: formatSliderValue('lambda', sliderRanges.lambda.max) }
                  ]}
                  valueLabelDisplay="auto"
                  valueLabelFormat={(value) => formatSliderValue('lambda', value)}
                />
              </Grid>
              <Grid item>
                <TextField
                  value={effectiveParameters.lambda.toExponential(2)}
                  onChange={handleInputChange('lambda')}
                  inputProps={{
                    step: sliderRanges.lambda.step,
                    min: sliderRanges.lambda.min,
                    max: sliderRanges.lambda.max,
                    type: 'number',
                    'aria-labelledby': 'lambda-slider-label',
                  }}
                  size="small"
                  sx={{ width: 120 }}
                />
              </Grid>
            </Grid>
          </Grid>

          <Grid item xs={12}>
            <Box display="flex" alignItems="center">
              <Typography id="r0-slider-label">
                Equilibrium Separation r₀ (m)
              </Typography>
              <Tooltip title="The distance between nuclei at equilibrium">
                <InfoIconStyled />
              </Tooltip>
            </Box>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs>
                <Slider
                  value={effectiveParameters.r0}
                  onChange={handleSliderChange('r0')}
                  aria-labelledby="r0-slider-label"
                  min={sliderRanges.r0.min}
                  max={sliderRanges.r0.max}
                  step={sliderRanges.r0.step}
                  marks={[
                    { value: sliderRanges.r0.min, label: formatSliderValue('r0', sliderRanges.r0.min) },
                    { value: sliderRanges.r0.max, label: formatSliderValue('r0', sliderRanges.r0.max) }
                  ]}
                  valueLabelDisplay="auto"
                  valueLabelFormat={(value) => formatSliderValue('r0', value)}
                />
              </Grid>
              <Grid item>
                <TextField
                  value={effectiveParameters.r0.toExponential(2)}
                  onChange={handleInputChange('r0')}
                  inputProps={{
                    step: sliderRanges.r0.step,
                    min: sliderRanges.r0.min,
                    max: sliderRanges.r0.max,
                    type: 'number',
                    'aria-labelledby': 'r0-slider-label',
                  }}
                  size="small"
                  sx={{ width: 120 }}
                />
              </Grid>
            </Grid>
          </Grid>

          <Grid item xs={12}>
            <Box display="flex" alignItems="center">
              <Typography id="k-spring-slider-label">
                Spring Constant k (N/m)
              </Typography>
              <Tooltip title="The spring constant determines the stiffness of the bond">
                <InfoIconStyled />
              </Tooltip>
            </Box>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs>
                <Slider
                  value={effectiveParameters.k_spring}
                  onChange={handleSliderChange('k_spring')}
                  aria-labelledby="k-spring-slider-label"
                  min={sliderRanges.k_spring.min}
                  max={sliderRanges.k_spring.max}
                  step={sliderRanges.k_spring.step}
                  marks={[
                    { value: sliderRanges.k_spring.min, label: sliderRanges.k_spring.min },
                    { value: sliderRanges.k_spring.max, label: sliderRanges.k_spring.max }
                  ]}
                  valueLabelDisplay="auto"
                />
              </Grid>
              <Grid item>
                <TextField
                  value={effectiveParameters.k_spring}
                  onChange={handleInputChange('k_spring')}
                  inputProps={{
                    step: sliderRanges.k_spring.step,
                    min: sliderRanges.k_spring.min,
                    max: sliderRanges.k_spring.max,
                    type: 'number',
                    'aria-labelledby': 'k-spring-slider-label',
                  }}
                  size="small"
                  sx={{ width: 100 }}
                />
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </ParameterBox>
      
      <Box mt={3} display="flex" justifyContent="center">
        <Button 
          variant="contained" 
          color="primary" 
          size="large"
          startIcon={<PlayArrowIcon />}
          onClick={handleStartSimulation}
          disabled={isLoading}
        >
          {isLoading ? 'Running...' : 'Start Simulation'}
        </Button>
      </Box>
    </Box>
  );
};

export default ParameterPanel; 