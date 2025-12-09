import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Typography,
  Slider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tooltip,
  Switch,
  FormControlLabel,
  Paper,
  TextField,
  IconButton,
  Collapse,
  useTheme
} from '@mui/material';
import Grid from '@mui/material/Grid';
import InfoIcon from '@mui/icons-material/Info';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import RestartAltIcon from '@mui/icons-material/RestartAlt';

// Default values for each parameter
const DEFAULT_VALUES = {
  potentialType: 'coulomb',
  z1: 1,
  z2: 1,
  temperature: 300,
  pressure: 1,
  electronScreeningFactor: 1.0,
  energyKeV: 0.1,
  showWaveFunction: true,
  showTunnelingProbability: true,
  showClassicalTurningPoint: true
};

// Tooltip descriptions for each parameter
const PARAMETER_DESCRIPTIONS = {
  potentialType: 'Type of potential barrier model to use for calculations',
  z1: 'Charge of the first particle (in elementary charges)',
  z2: 'Charge of the second particle (in elementary charges)',
  temperature: 'Temperature affects the kinetic energy distribution and tunneling probability',
  pressure: 'Pressure can influence the effective distance between nuclei',
  electronScreeningFactor: 'Enhancement factor from electron screening (reduces effective Coulomb barrier)',
  energyKeV: 'Energy of incident particle in keV',
  showWaveFunction: 'Display the quantum wave function visualization',
  showTunnelingProbability: 'Show tunneling probability through the barrier',
  showClassicalTurningPoint: 'Mark the classical turning point where E = V(r)'
};

const TunnelingParameterControls = ({ initialValues = {}, onChange = () => {} }) => {
  const theme = useTheme();

  // Merge provided initial values with defaults
  const mergedInitialValues = { ...DEFAULT_VALUES, ...initialValues };
  
  // State for all parameters
  const [parameters, setParameters] = useState(mergedInitialValues);
  
  // State for advanced panel visibility
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // Use ref to track onChange to avoid infinite loops
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  
  // Update parent component when parameters change
  useEffect(() => {
    onChangeRef.current(parameters);
  }, [parameters]);
  
  // Generic handler for slider changes
  const handleSliderChange = (name) => (event, value) => {
    setParameters(prev => ({ ...prev, [name]: value }));
  };
  
  // Generic handler for input changes
  const handleInputChange = (name) => (event) => {
    let value;
    if (event.target.type === 'checkbox') {
      value = event.target.checked;
    } else if (event.target.type === 'number') {
      // Use parseInt for atomic numbers (z1, z2), parseFloat for other numbers
      if (name === 'z1' || name === 'z2') {
        value = parseInt(event.target.value, 10);
        // Validate atomic number range (1-92)
        if (isNaN(value) || value < 1) value = 1;
        if (value > 92) value = 92;
      } else {
        value = parseFloat(event.target.value);
        // Add NaN validation - keep previous value if NaN
        if (isNaN(value)) {
          return; // Don't update state with NaN
        }
      }
    } else {
      value = event.target.value;
    }
    
    setParameters(prev => ({ ...prev, [name]: value }));
  };
  
  // Reset all parameters to defaults
  const handleReset = () => {
    setParameters(DEFAULT_VALUES);
  };
  
  // Create a parameter slider with label and tooltip
  const ParameterSlider = ({ 
    name, 
    label, 
    min, 
    max, 
    step = 1, 
    valueLabelFormat = x => x,
    marks = false
  }) => (
    <Box sx={{ width: '100%', mb: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
        <Typography id={`${name}-slider-label`} variant="body2" color="textSecondary">
          {label}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Typography variant="body2" color="textPrimary" sx={{ mr: 1 }}>
            {valueLabelFormat(parameters[name])}
          </Typography>
          <Tooltip title={PARAMETER_DESCRIPTIONS[name] || ''}>
            <InfoIcon fontSize="small" color="action" />
          </Tooltip>
        </Box>
      </Box>
      <Slider
        value={parameters[name]}
        onChange={handleSliderChange(name)}
        aria-labelledby={`${name}-slider-label`}
        min={min}
        max={max}
        step={step}
        marks={marks}
        valueLabelDisplay="auto"
        valueLabelFormat={valueLabelFormat}
        sx={{
          '& .MuiSlider-markLabel': {
            fontSize: '0.7rem',
            top: 22
          },
          mb: marks ? 1 : 0
        }}
      />
    </Box>
  );

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Tunneling Parameters</Typography>
        <IconButton onClick={handleReset} size="small" color="primary" title="Reset to defaults">
          <RestartAltIcon />
        </IconButton>
      </Box>
      
      <Grid container spacing={2}>
        {/* Basic parameters section */}
        <Grid size={{ xs: 12, md: 6 }}>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel id="potential-type-label">Potential Type</InputLabel>
            <Select
              labelId="potential-type-label"
              id="potential-type"
              value={parameters.potentialType}
              label="Potential Type"
              onChange={handleInputChange('potentialType')}
            >
              <MenuItem value="coulomb">Coulomb</MenuItem>
              <MenuItem value="yukawa">Yukawa (Screened)</MenuItem>
              <MenuItem value="morse">Morse</MenuItem>
            </Select>
          </FormControl>
          
          <ParameterSlider
            name="energyKeV"
            label="Energy (keV)"
            min={0.01}
            max={10}
            step={0.01}
            valueLabelFormat={v => `${v} keV`}
            marks={[
              { value: 0.01, label: '0.01' },
              { value: 10, label: '10' }
            ]}
          />
          
          <ParameterSlider
            name="temperature"
            label="Temperature"
            min={1}
            max={5000}
            step={1}
            valueLabelFormat={v => `${v} K`}
            marks={[
              { value: 1, label: '1K' },
              { value: 5000, label: '5000K' }
            ]}
          />
        </Grid>
        
        <Grid size={{ xs: 12, md: 6 }}>
          <ParameterSlider
            name="electronScreeningFactor"
            label="Electron Screening Enhancement"
            min={1}
            max={100}
            step={0.1}
            valueLabelFormat={v => `${v.toFixed(1)}x`}
            marks={[
              { value: 1, label: '1x' },
              { value: 100, label: '100x' }
            ]}
          />
          
          <Box sx={{ mb: 2 }}>
            <Grid container spacing={2}>
              <Grid size={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Z₁ (charge)"
                  value={parameters.z1}
                  onChange={handleInputChange('z1')}
                  InputProps={{ inputProps: { min: 1, max: 92, step: 1 } }}
                  size="small"
                />
              </Grid>
              <Grid size={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Z₂ (charge)"
                  value={parameters.z2}
                  onChange={handleInputChange('z2')}
                  InputProps={{ inputProps: { min: 1, max: 92, step: 1 } }}
                  size="small"
                />
              </Grid>
            </Grid>
          </Box>
          
          <ParameterSlider
            name="pressure"
            label="Pressure"
            min={0.1}
            max={100}
            step={0.1}
            valueLabelFormat={v => `${v} atm`}
            marks={[
              { value: 0.1, label: '0.1' },
              { value: 100, label: '100' }
            ]}
          />
        </Grid>
      </Grid>
      
      {/* Advanced options section */}
      <Box sx={{ mt: 1 }}>
        <Box 
          onClick={() => setShowAdvanced(!showAdvanced)} 
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            cursor: 'pointer',
            color: theme.palette.primary.main
          }}
        >
          {showAdvanced ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          <Typography variant="body2" color="inherit">
            {showAdvanced ? 'Hide Visualization Options' : 'Show Visualization Options'}
          </Typography>
        </Box>
        
        <Collapse in={showAdvanced}>
          <Box sx={{ mt: 2, pt: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={parameters.showWaveFunction}
                      onChange={handleInputChange('showWaveFunction')}
                      color="primary"
                    />
                  }
                  label="Wave Function"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={parameters.showTunnelingProbability}
                      onChange={handleInputChange('showTunnelingProbability')}
                      color="primary"
                    />
                  }
                  label="Tunneling Probability"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={parameters.showClassicalTurningPoint}
                      onChange={handleInputChange('showClassicalTurningPoint')}
                      color="primary"
                    />
                  }
                  label="Classical Turning Point"
                />
              </Grid>
            </Grid>
          </Box>
        </Collapse>
      </Box>
    </Paper>
  );
};

TunnelingParameterControls.propTypes = {
  initialValues: PropTypes.shape({
    potentialType: PropTypes.string,
    z1: PropTypes.number,
    z2: PropTypes.number,
    temperature: PropTypes.number,
    pressure: PropTypes.number,
    electronScreeningFactor: PropTypes.number,
    energyKeV: PropTypes.number,
    showWaveFunction: PropTypes.bool,
    showTunnelingProbability: PropTypes.bool,
    showClassicalTurningPoint: PropTypes.bool
  }),
  onChange: PropTypes.func
};

export default TunnelingParameterControls; 