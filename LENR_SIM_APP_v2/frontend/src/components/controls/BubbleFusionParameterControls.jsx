import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Paper,
  Typography,
  Slider,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Box,
  Tooltip,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

// Default values and param descriptions
const PARAMETER_DESCRIPTIONS = {
  initialRadius: 'Initial bubble radius (μm)',
  drivingPressureAmplitude: 'Amplitude of acoustic pressure wave (bar)',
  frequency: 'Frequency of acoustic waves (kHz)',
  ambientPressure: 'Ambient pressure of the liquid (bar)',
  ambientTemperature: 'Ambient temperature of the liquid (K)',
  fluidType: 'Type of fluid for cavitation',
  gasType: 'Type of dissolved gas in the fluid',
  gasFraction: 'Fraction of dissolved gas (0-1)',
  timeStepSize: 'Time step for simulation (ns)',
  totalSimulationTime: 'Total simulation time (μs)'
};

const DEFAULT_VALUES = {
  // Bubble parameters
  initialRadius: 10.0, // μm
  drivingPressureAmplitude: 1.2, // bar
  frequency: 20, // kHz
  ambientPressure: 1.0, // bar
  ambientTemperature: 298, // K
  fluidType: 'water',
  
  // Gas parameters
  gasType: 'deuterium',
  gasFraction: 0.8, // fraction of dissolved gas
  
  // Visualization options
  showPressureField: true,
  showTemperatureField: true,
  showCollapse: true,
  
  // Simulation parameters
  timeStepSize: 1.0, // ns
  totalSimulationTime: 1.0 // μs
};

const FLUID_TYPES = [
  { value: 'water', label: 'Water (H₂O)' },
  { value: 'acetone', label: 'Acetone' },
  { value: 'deuterated_acetone', label: 'Deuterated Acetone' },
  { value: 'heavy_water', label: 'Heavy Water (D₂O)' }
];

const GAS_TYPES = [
  { value: 'hydrogen', label: 'Hydrogen (H₂)' },
  { value: 'deuterium', label: 'Deuterium (D₂)' },
  { value: 'helium', label: 'Helium (He)' },
  { value: 'xenon', label: 'Xenon (Xe)' },
  { value: 'argon', label: 'Argon (Ar)' }
];

const BubbleFusionParameterControls = ({ 
  initialValues = {}, 
  onChange = () => {} 
}) => {
  const [params, setParams] = useState({ ...DEFAULT_VALUES, ...initialValues });
  const [expanded, setExpanded] = useState({
    bubbleParams: true,
    gasParams: true,
    visualizationOptions: false,
    simulationParams: true
  });

  // Effect to propagate changes to parent
  useEffect(() => {
    if (onChange) {
      onChange(params);
    }
  }, [params, onChange]);

  // Handle slider value changes
  const handleSliderChange = (param) => (event, newValue) => {
    setParams({ ...params, [param]: newValue });
  };

  // Handle text input changes with validation
  const handleInputChange = (param, min, max) => (event) => {
    const value = parseFloat(event.target.value);
    if (!isNaN(value) && value >= min && value <= max) {
      setParams({ ...params, [param]: value });
    }
  };

  // Handle select changes
  const handleSelectChange = (param) => (event) => {
    setParams({ ...params, [param]: event.target.value });
  };

  // Handle toggle changes
  const handleToggleChange = (param) => (event) => {
    setParams({ ...params, [param]: event.target.checked });
  };

  // Handle accordion expansion
  const handleAccordionChange = (panel) => (event, isExpanded) => {
    setExpanded({ ...expanded, [panel]: isExpanded });
  };

  // Reset to default values
  const handleReset = () => {
    setParams(DEFAULT_VALUES);
  };

  // Render parameter slider with label and value display
  const renderParameterSlider = (param, min, max, step, unit) => {
    const sliderId = `slider-${param}`;
    const inputId = `input-${param}`;
    const labelId = `label-${param}`;
    
    return (
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Tooltip title={PARAMETER_DESCRIPTIONS[param] || param}>
            <Typography variant="body2" color="textSecondary" id={labelId}>
              {PARAMETER_DESCRIPTIONS[param] || param}
            </Typography>
          </Tooltip>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <TextField
              id={inputId}
              name={param}
              value={params[param]}
              onChange={handleInputChange(param, min, max)}
              type="number"
              size="small"
              inputProps={{
                min,
                max,
                step,
                'aria-labelledby': labelId
              }}
              sx={{ width: 80 }}
            />
            <Typography variant="body2" color="textSecondary" sx={{ ml: 1, minWidth: 20 }}>
              {unit}
            </Typography>
          </Box>
        </Box>
        <Slider
          id={sliderId}
          value={params[param]}
          onChange={handleSliderChange(param)}
          min={min}
          max={max}
          step={step}
          sx={{ mt: 1 }}
          aria-labelledby={labelId}
          name={`${param}-slider`}
        />
      </Box>
    );
  };

  return (
    <Paper sx={{ p: 2 }} role="form" aria-label="Bubble fusion parameters" id="bubble-fusion-params-form">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" id="bubble-fusion-params-heading">Simulation Parameters</Typography>
        <Tooltip title="Reset to default values">
          <IconButton 
            onClick={handleReset} 
            size="small" 
            aria-label="Reset to default values"
            id="reset-params-button"
            name="reset-params"
          >
            <RestartAltIcon aria-hidden="true" />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Bubble Parameters */}
      <Accordion 
        expanded={expanded.bubbleParams} 
        onChange={handleAccordionChange('bubbleParams')}
        id="bubble-params-accordion"
      >
        <AccordionSummary 
          expandIcon={<ExpandMoreIcon aria-hidden="true" />}
          id="bubble-params-header"
          aria-controls="bubble-params-content"
          aria-expanded={expanded.bubbleParams}
        >
          <Typography variant="subtitle1">Bubble Parameters</Typography>
        </AccordionSummary>
        <AccordionDetails id="bubble-params-content">
          {renderParameterSlider('initialRadius', 1, 100, 0.1, 'μm')}
          {renderParameterSlider('drivingPressureAmplitude', 0.1, 5, 0.1, 'bar')}
          {renderParameterSlider('frequency', 1, 100, 1, 'kHz')}
          {renderParameterSlider('ambientPressure', 0.1, 10, 0.1, 'bar')}
          {renderParameterSlider('ambientTemperature', 273, 373, 1, 'K')}
          
          <FormControl fullWidth size="small" sx={{ mt: 2, mb: 1 }} id="fluid-type-control">
            <InputLabel id="fluid-type-label" htmlFor="fluid-type">Fluid Type</InputLabel>
            <Select
              labelId="fluid-type-label"
              id="fluid-type"
              name="fluidType"
              value={params.fluidType}
              label="Fluid Type"
              onChange={handleSelectChange('fluidType')}
              aria-labelledby="fluid-type-label"
            >
              {FLUID_TYPES.map((type) => (
                <MenuItem key={type.value} value={type.value} id={`fluid-type-${type.value}`}>
                  {type.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </AccordionDetails>
      </Accordion>

      {/* Gas Parameters */}
      <Accordion 
        expanded={expanded.gasParams} 
        onChange={handleAccordionChange('gasParams')}
        id="gas-params-accordion"
      >
        <AccordionSummary 
          expandIcon={<ExpandMoreIcon aria-hidden="true" />}
          id="gas-params-header"
          aria-controls="gas-params-content"
          aria-expanded={expanded.gasParams}
        >
          <Typography variant="subtitle1">Gas Parameters</Typography>
        </AccordionSummary>
        <AccordionDetails id="gas-params-content">
          <FormControl fullWidth size="small" sx={{ mb: 2 }} id="gas-type-control">
            <InputLabel id="gas-type-label" htmlFor="gas-type">Gas Type</InputLabel>
            <Select
              labelId="gas-type-label"
              id="gas-type"
              name="gasType"
              value={params.gasType}
              label="Gas Type"
              onChange={handleSelectChange('gasType')}
              aria-labelledby="gas-type-label"
            >
              {GAS_TYPES.map((type) => (
                <MenuItem key={type.value} value={type.value} id={`gas-type-${type.value}`}>
                  {type.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          {renderParameterSlider('gasFraction', 0, 1, 0.01, '')}
        </AccordionDetails>
      </Accordion>

      {/* Visualization Options */}
      <Accordion 
        expanded={expanded.visualizationOptions} 
        onChange={handleAccordionChange('visualizationOptions')}
        id="visualization-options-accordion"
      >
        <AccordionSummary 
          expandIcon={<ExpandMoreIcon aria-hidden="true" />}
          id="visualization-options-header"
          aria-controls="visualization-options-content"
          aria-expanded={expanded.visualizationOptions}
        >
          <Typography variant="subtitle1">Visualization Options</Typography>
        </AccordionSummary>
        <AccordionDetails id="visualization-options-content">
          <FormControlLabel
            control={
              <Switch
                checked={params.showPressureField}
                onChange={handleToggleChange('showPressureField')}
                id="show-pressure-field-toggle"
                name="showPressureField"
              />
            }
            label="Show Pressure Field"
            id="show-pressure-field-label"
            htmlFor="show-pressure-field-toggle"
          />
          <FormControlLabel
            control={
              <Switch
                checked={params.showTemperatureField}
                onChange={handleToggleChange('showTemperatureField')}
                id="show-temperature-field-toggle"
                name="showTemperatureField"
              />
            }
            label="Show Temperature Field"
            id="show-temperature-field-label"
            htmlFor="show-temperature-field-toggle"
          />
          <FormControlLabel
            control={
              <Switch
                checked={params.showCollapse}
                onChange={handleToggleChange('showCollapse')}
                id="show-collapse-toggle"
                name="showCollapse"
              />
            }
            label="Show Collapse Animation"
            id="show-collapse-label"
            htmlFor="show-collapse-toggle"
          />
        </AccordionDetails>
      </Accordion>

      {/* Simulation Parameters */}
      <Accordion 
        expanded={expanded.simulationParams} 
        onChange={handleAccordionChange('simulationParams')}
        id="simulation-params-accordion"
      >
        <AccordionSummary 
          expandIcon={<ExpandMoreIcon aria-hidden="true" />}
          id="simulation-params-header"
          aria-controls="simulation-params-content"
          aria-expanded={expanded.simulationParams}
        >
          <Typography variant="subtitle1">Simulation Parameters</Typography>
        </AccordionSummary>
        <AccordionDetails id="simulation-params-content">
          {renderParameterSlider('timeStepSize', 0.01, 10, 0.01, 'ns')}
          {renderParameterSlider('totalSimulationTime', 0.1, 10, 0.1, 'μs')}
        </AccordionDetails>
      </Accordion>

      <Box sx={{ mt: 2 }}>
        <Tooltip title="These parameters control the acoustic cavitation simulation.">
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <HelpOutlineIcon fontSize="small" sx={{ mr: 0.5, color: 'info.main' }} aria-hidden="true" />
            <Typography variant="caption" color="textSecondary" id="parameters-help-text">
              Adjust parameters to explore different bubble collapse regimes
            </Typography>
          </Box>
        </Tooltip>
      </Box>
    </Paper>
  );
};

BubbleFusionParameterControls.propTypes = {
  initialValues: PropTypes.object,
  onChange: PropTypes.func
};

export default BubbleFusionParameterControls; 