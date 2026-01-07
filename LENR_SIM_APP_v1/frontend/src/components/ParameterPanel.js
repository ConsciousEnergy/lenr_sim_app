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

const ParameterPanel = ({ onParametersChange, onCalculate }) => {
  // Default parameter values
  const [parameters, setParameters] = useState({
    T: 300, // Temperature in Kelvin
    lambda: 1e-10, // Tunneling parameter in meters
    r0: 1e-10, // Equilibrium separation in meters
    k_spring: 1000, // Spring constant in N/m
    potential: 'harmonic', // Potential model type
    T_impact: 5000, // Impact temperature (for impact tunneling)
    impact_duration: 1e-12, // Impact duration in seconds
  });

  // Sliders have different ranges for different parameters
  const sliderRanges = {
    T: { min: 10, max: 1000, step: 10 },
    lambda: { min: 1e-11, max: 1e-9, step: 1e-11 },
    r0: { min: 5e-11, max: 5e-10, step: 5e-11 },
    k_spring: { min: 100, max: 10000, step: 100 },
    T_impact: { min: 1000, max: 10000, step: 100 },
    impact_duration: { min: 1e-13, max: 1e-11, step: 1e-13 },
  };
  
  // Format slider values to readable form
  const formatSliderValue = (param, value) => {
    if (param === 'lambda' || param === 'r0' || param === 'impact_duration') {
      return `${value.toExponential(2)}`;
    }
    return value.toString();
  };

  // Handle slider changes
  const handleSliderChange = (param) => (event, newValue) => {
    setParameters({ ...parameters, [param]: newValue });
  };

  // Handle text input changes
  const handleInputChange = (param) => (event) => {
    const value = event.target.value === '' ? '' : Number(event.target.value);
    if (value !== '' && !isNaN(value) && value >= sliderRanges[param].min && value <= sliderRanges[param].max) {
      setParameters({ ...parameters, [param]: value });
    }
  };

  // Handle potential type change
  const handlePotentialChange = (event) => {
    setParameters({ ...parameters, potential: event.target.value });
  };

  // Send parameters to parent when they change
  useEffect(() => {
    onParametersChange && onParametersChange(parameters);
  }, [parameters, onParametersChange]);

  // Handle calculation button click
  const handleCalculate = () => {
    onCalculate && onCalculate(parameters);
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
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
            value={parameters.potential}
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
                  value={parameters.T}
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
                  value={parameters.T}
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
                  value={parameters.lambda}
                  onChange={handleSliderChange('lambda')}
                  aria-labelledby="lambda-slider-label"
                  min={sliderRanges.lambda.min}
                  max={sliderRanges.lambda.max}
                  step={sliderRanges.lambda.step}
                  marks={[
                    { value: sliderRanges.lambda.min, label: `${sliderRanges.lambda.min.toExponential(0)}` },
                    { value: sliderRanges.lambda.max, label: `${sliderRanges.lambda.max.toExponential(0)}` }
                  ]}
                  valueLabelDisplay="auto"
                  valueLabelFormat={(value) => formatSliderValue('lambda', value)}
                />
              </Grid>
              <Grid item>
                <TextField
                  value={parameters.lambda.toExponential(2)}
                  onChange={handleInputChange('lambda')}
                  size="small"
                  sx={{ width: 120 }}
                />
              </Grid>
            </Grid>
          </Grid>

          <Grid item xs={12}>
            <Box display="flex" alignItems="center">
              <Typography id="r0-slider-label">
                Equilibrium Position r₀ (m)
              </Typography>
              <Tooltip title="The equilibrium separation distance between nuclei in the potential well">
                <InfoIconStyled />
              </Tooltip>
            </Box>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs>
                <Slider
                  value={parameters.r0}
                  onChange={handleSliderChange('r0')}
                  aria-labelledby="r0-slider-label"
                  min={sliderRanges.r0.min}
                  max={sliderRanges.r0.max}
                  step={sliderRanges.r0.step}
                  marks={[
                    { value: sliderRanges.r0.min, label: `${sliderRanges.r0.min.toExponential(0)}` },
                    { value: sliderRanges.r0.max, label: `${sliderRanges.r0.max.toExponential(0)}` }
                  ]}
                  valueLabelDisplay="auto"
                  valueLabelFormat={(value) => formatSliderValue('r0', value)}
                />
              </Grid>
              <Grid item>
                <TextField
                  value={parameters.r0.toExponential(2)}
                  onChange={handleInputChange('r0')}
                  size="small"
                  sx={{ width: 120 }}
                />
              </Grid>
            </Grid>
          </Grid>

          <Grid item xs={12}>
            <Box display="flex" alignItems="center">
              <Typography id="k-slider-label">
                Spring Constant (N/m)
              </Typography>
              <Tooltip title="Determines the stiffness of the potential well">
                <InfoIconStyled />
              </Tooltip>
            </Box>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs>
                <Slider
                  value={parameters.k_spring}
                  onChange={handleSliderChange('k_spring')}
                  aria-labelledby="k-slider-label"
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
                  value={parameters.k_spring}
                  onChange={handleInputChange('k_spring')}
                  inputProps={{
                    step: sliderRanges.k_spring.step,
                    min: sliderRanges.k_spring.min,
                    max: sliderRanges.k_spring.max,
                    type: 'number',
                    'aria-labelledby': 'k-slider-label',
                  }}
                  size="small"
                  sx={{ width: 80 }}
                />
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </ParameterBox>

      <ParameterBox>
        <Typography variant="h6" gutterBottom>
          Impact Tunneling Parameters
        </Typography>
        
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12}>
            <Box display="flex" alignItems="center">
              <Typography id="T-impact-slider-label">
                Impact Temperature (K)
              </Typography>
              <Tooltip title="The effective temperature during high-energy impact events">
                <InfoIconStyled />
              </Tooltip>
            </Box>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs>
                <Slider
                  value={parameters.T_impact}
                  onChange={handleSliderChange('T_impact')}
                  aria-labelledby="T-impact-slider-label"
                  min={sliderRanges.T_impact.min}
                  max={sliderRanges.T_impact.max}
                  step={sliderRanges.T_impact.step}
                  marks={[
                    { value: sliderRanges.T_impact.min, label: sliderRanges.T_impact.min },
                    { value: sliderRanges.T_impact.max, label: sliderRanges.T_impact.max }
                  ]}
                  valueLabelDisplay="auto"
                />
              </Grid>
              <Grid item>
                <TextField
                  value={parameters.T_impact}
                  onChange={handleInputChange('T_impact')}
                  inputProps={{
                    step: sliderRanges.T_impact.step,
                    min: sliderRanges.T_impact.min,
                    max: sliderRanges.T_impact.max,
                    type: 'number',
                    'aria-labelledby': 'T-impact-slider-label',
                  }}
                  size="small"
                  sx={{ width: 80 }}
                />
              </Grid>
            </Grid>
          </Grid>

          <Grid item xs={12}>
            <Box display="flex" alignItems="center">
              <Typography id="impact-duration-slider-label">
                Impact Duration (s)
              </Typography>
              <Tooltip title="The characteristic timescale of the impact event">
                <InfoIconStyled />
              </Tooltip>
            </Box>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs>
                <Slider
                  value={parameters.impact_duration}
                  onChange={handleSliderChange('impact_duration')}
                  aria-labelledby="impact-duration-slider-label"
                  min={sliderRanges.impact_duration.min}
                  max={sliderRanges.impact_duration.max}
                  step={sliderRanges.impact_duration.step}
                  marks={[
                    { value: sliderRanges.impact_duration.min, label: `${sliderRanges.impact_duration.min.toExponential(0)}` },
                    { value: sliderRanges.impact_duration.max, label: `${sliderRanges.impact_duration.max.toExponential(0)}` }
                  ]}
                  valueLabelDisplay="auto"
                  valueLabelFormat={(value) => formatSliderValue('impact_duration', value)}
                />
              </Grid>
              <Grid item>
                <TextField
                  value={parameters.impact_duration.toExponential(2)}
                  onChange={handleInputChange('impact_duration')}
                  size="small"
                  sx={{ width: 120 }}
                />
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </ParameterBox>

      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
        <Button 
          variant="contained" 
          color="primary" 
          size="large"
          startIcon={<PlayArrowIcon />}
          onClick={handleCalculate}
        >
          Run Simulation
        </Button>
      </Box>
    </Box>
  );
};

export default ParameterPanel; 