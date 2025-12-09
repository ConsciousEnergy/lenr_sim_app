import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  FormControl,
  FormControlLabel,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Slider,
  Typography,
  Switch,
  Button,
  Box,
  Divider,
  Tooltip,
  Card,
  CardContent,
  IconButton,
  Collapse
} from '@mui/material';
import Grid from '@mui/material/Grid';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ReplayIcon from '@mui/icons-material/Replay';
import SettingsIcon from '@mui/icons-material/Settings';

/**
 * LENR Parameter Controls Component
 * 
 * Provides a user interface for adjusting LENR simulation parameters
 */
const LENRParameterControls = ({
  parameters,
  onChange,
  savedConfigs = [],
  onLoadConfig,
  disabled = false
}) => {
  // State for expandable sections
  const [expandedSections, setExpandedSections] = useState({
    materials: true,
    conditions: true,
    electrode: true,
    catalysts: true,
    structure: false,
    visualization: false,
    advanced: false
  });

  // Handle section expansion toggle
  const handleSectionToggle = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Handle parameter changes
  const handleChange = (paramName, value) => {
    onChange({ [paramName]: value });
  };

  // Handle slider changes
  const handleSliderChange = (paramName) => (event, newValue) => {
    handleChange(paramName, newValue);
  };

  // Handle input changes
  const handleInputChange = (paramName) => (event) => {
    const value = event.target.value;
    
    // Handle numeric inputs
    if (!isNaN(value) && value !== '') {
      handleChange(paramName, Number(value));
    } else if (typeof value === 'string' || typeof value === 'boolean') {
      // Handle string and boolean inputs
      handleChange(paramName, value);
    }
  };

  // Handle select changes
  const handleSelectChange = (paramName) => (event) => {
    handleChange(paramName, event.target.value);
  };

  // Handle switch changes
  const handleSwitchChange = (paramName) => (event) => {
    handleChange(paramName, event.target.checked);
  };

  // Load a saved configuration
  const handleLoadConfig = (configId) => {
    if (onLoadConfig) {
      onLoadConfig(configId);
    }
  };

  // Reset to default values
  const handleResetDefaults = () => {
    const defaultParams = {
      materialType: 'nickel',
      secondaryMaterial: 'hydrogen',
      temperature: 400,
      pressure: 5.0,
      catalystType: 'palladium',
      catalystConcentration: 0.05,
      electrodeConfig: 'coaxial',
      currentDensity: 0.8,
      pulseFrequency: 50,
      pulseWidth: 100,
      magneticFieldStrength: 0.2,
      surfaceTreatment: 'plasma_etched',
      nanostructured: true,
      defectDensity: 0.1,
      grainSize: 50,
      showLattice: true,
      showHotSpots: true,
      showEnergyFlow: true,
      timeStepSize: 0.1,
      totalSimulationTime: 10
    };
    
    onChange(defaultParams);
  };

  // Render parameter section
  const renderSectionHeader = (title, section, description = null) => (
    <Box 
      sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        mb: 1
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <Typography variant="subtitle1" fontWeight="medium">
          {title}
        </Typography>
        {description && (
          <Tooltip title={description} arrow>
            <IconButton size="small" sx={{ ml: 0.5 }}>
              <InfoOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>
      <IconButton 
        size="small" 
        onClick={() => handleSectionToggle(section)}
      >
        {expandedSections[section] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
      </IconButton>
    </Box>
  );

  if (!parameters) {
    return null;
  }

  return (
    <div>
      {/* Saved configurations */}
      {savedConfigs.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Load Saved Configuration
          </Typography>
          <Grid container spacing={1}>
            {savedConfigs.map(config => (
              <Grid size={12} key={config.id}>
                <Button 
                  variant="outlined" 
                  size="small" 
                  fullWidth
                  onClick={() => handleLoadConfig(config.id)}
                  disabled={disabled}
                  title={config.description}
                  sx={{ justifyContent: 'flex-start', textTransform: 'none' }}
                >
                  {config.name}
                </Button>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      <Button
        startIcon={<ReplayIcon />}
        variant="outlined"
        size="small"
        onClick={handleResetDefaults}
        disabled={disabled}
        sx={{ mb: 2 }}
      >
        Reset to Defaults
      </Button>

      {/* Materials Section */}
      {renderSectionHeader('Material System', 'materials', 'Core materials for the LENR system')}
      <Collapse in={expandedSections.materials}>
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth disabled={disabled}>
              <InputLabel>Host Material</InputLabel>
              <Select
                value={parameters.materialType}
                onChange={handleSelectChange('materialType')}
                label="Host Material"
              >
                <MenuItem value="nickel">Nickel</MenuItem>
                <MenuItem value="palladium">Palladium</MenuItem>
                <MenuItem value="titanium">Titanium</MenuItem>
                <MenuItem value="platinum">Platinum</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth disabled={disabled}>
              <InputLabel>Secondary Material</InputLabel>
              <Select
                value={parameters.secondaryMaterial}
                onChange={handleSelectChange('secondaryMaterial')}
                label="Secondary Material"
              >
                <MenuItem value="hydrogen">Hydrogen</MenuItem>
                <MenuItem value="deuterium">Deuterium</MenuItem>
                <MenuItem value="lithium">Lithium</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Collapse>

      {/* Conditions Section */}
      {renderSectionHeader('Environmental Conditions', 'conditions', 'Temperature, pressure, and other conditions')}
      <Collapse in={expandedSections.conditions}>
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={12}>
            <Typography gutterBottom>
              Temperature: {parameters.temperature} K
            </Typography>
            <Slider
              value={parameters.temperature}
              onChange={handleSliderChange('temperature')}
              min={273}
              max={1273}
              step={1}
              disabled={disabled}
              valueLabelDisplay="auto"
              marks={[
                { value: 273, label: '273K' },
                { value: 1273, label: '1273K' }
              ]}
              sx={{ '& .MuiSlider-markLabel': { fontSize: '0.65rem' }, mb: 1 }}
            />
          </Grid>

          <Grid size={12}>
            <Typography gutterBottom>
              Pressure: {parameters.pressure} atm
            </Typography>
            <Slider
              value={parameters.pressure}
              onChange={handleSliderChange('pressure')}
              min={0.1}
              max={30}
              step={0.1}
              disabled={disabled}
              valueLabelDisplay="auto"
              marks={[
                { value: 0.1, label: '0.1' },
                { value: 30, label: '30' }
              ]}
              sx={{ '& .MuiSlider-markLabel': { fontSize: '0.65rem' }, mb: 1 }}
            />
          </Grid>

          <Grid size={12}>
            <Typography gutterBottom>
              Magnetic Field Strength: {parameters.magneticFieldStrength} T
            </Typography>
            <Slider
              value={parameters.magneticFieldStrength}
              onChange={handleSliderChange('magneticFieldStrength')}
              min={0}
              max={2}
              step={0.01}
              disabled={disabled}
              valueLabelDisplay="auto"
              marks={[
                { value: 0, label: '0' },
                { value: 2, label: '2T' }
              ]}
              sx={{ '& .MuiSlider-markLabel': { fontSize: '0.65rem' }, mb: 1 }}
            />
          </Grid>
        </Grid>
      </Collapse>

      {/* Electrode Configuration Section */}
      {renderSectionHeader('Electrode Configuration', 'electrode', 'Current and pulse parameters')}
      <Collapse in={expandedSections.electrode}>
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={12}>
            <FormControl fullWidth disabled={disabled}>
              <InputLabel>Electrode Configuration</InputLabel>
              <Select
                value={parameters.electrodeConfig}
                onChange={handleSelectChange('electrodeConfig')}
                label="Electrode Configuration"
              >
                <MenuItem value="parallel">Parallel Plates</MenuItem>
                <MenuItem value="coaxial">Coaxial</MenuItem>
                <MenuItem value="spiral">Spiral</MenuItem>
                <MenuItem value="mesh">Mesh</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid size={12}>
            <Typography gutterBottom>
              Current Density: {parameters.currentDensity} A/cm²
            </Typography>
            <Slider
              value={parameters.currentDensity}
              onChange={handleSliderChange('currentDensity')}
              min={0}
              max={5}
              step={0.01}
              disabled={disabled}
              valueLabelDisplay="auto"
              marks={[
                { value: 0, label: '0' },
                { value: 5, label: '5' }
              ]}
              sx={{ '& .MuiSlider-markLabel': { fontSize: '0.65rem' }, mb: 1 }}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography gutterBottom>
              Pulse Frequency: {parameters.pulseFrequency} Hz
            </Typography>
            <Slider
              value={parameters.pulseFrequency}
              onChange={handleSliderChange('pulseFrequency')}
              min={0}
              max={1000}
              step={1}
              disabled={disabled}
              valueLabelDisplay="auto"
              marks={[
                { value: 0, label: '0 (DC)' },
                { value: 1000, label: '1kHz' }
              ]}
              sx={{ '& .MuiSlider-markLabel': { fontSize: '0.65rem' }, mb: 1 }}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography gutterBottom>
              Pulse Width: {parameters.pulseWidth} μs
            </Typography>
            <Slider
              value={parameters.pulseWidth}
              onChange={handleSliderChange('pulseWidth')}
              min={0}
              max={500}
              step={1}
              disabled={disabled}
              valueLabelDisplay="auto"
              marks={[
                { value: 0, label: '0' },
                { value: 500, label: '500μs' }
              ]}
              sx={{ '& .MuiSlider-markLabel': { fontSize: '0.65rem' }, mb: 1 }}
            />
          </Grid>
        </Grid>
      </Collapse>

      {/* Catalyst Section */}
      {renderSectionHeader('Catalyst Properties', 'catalysts', 'Catalyst materials and concentrations')}
      <Collapse in={expandedSections.catalysts}>
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth disabled={disabled}>
              <InputLabel>Catalyst Type</InputLabel>
              <Select
                value={parameters.catalystType}
                onChange={handleSelectChange('catalystType')}
                label="Catalyst Type"
              >
                <MenuItem value="none">None</MenuItem>
                <MenuItem value="palladium">Palladium</MenuItem>
                <MenuItem value="platinum">Platinum</MenuItem>
                <MenuItem value="ruthenium">Ruthenium</MenuItem>
                <MenuItem value="silver">Silver</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography gutterBottom>
              Concentration: {parameters.catalystConcentration}
            </Typography>
            <Slider
              value={parameters.catalystConcentration}
              onChange={handleSliderChange('catalystConcentration')}
              min={0}
              max={0.3}
              step={0.001}
              disabled={disabled || parameters.catalystType === 'none'}
              valueLabelDisplay="auto"
              marks={[
                { value: 0, label: '0' },
                { value: 0.3, label: '0.3' }
              ]}
              sx={{ '& .MuiSlider-markLabel': { fontSize: '0.65rem' }, mb: 1 }}
            />
          </Grid>

          <Grid size={12}>
            <FormControl fullWidth disabled={disabled}>
              <InputLabel>Surface Treatment</InputLabel>
              <Select
                value={parameters.surfaceTreatment}
                onChange={handleSelectChange('surfaceTreatment')}
                label="Surface Treatment"
              >
                <MenuItem value="none">None</MenuItem>
                <MenuItem value="annealed">Annealed</MenuItem>
                <MenuItem value="plasma_etched">Plasma Etched</MenuItem>
                <MenuItem value="nanostructured">Nanostructured</MenuItem>
                <MenuItem value="oxide_layer">Oxide Layer</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Collapse>

      {/* Material Structure Section */}
      {renderSectionHeader('Material Structure', 'structure', 'Structural properties of the material system')}
      <Collapse in={expandedSections.structure}>
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={parameters.nanostructured}
                  onChange={handleSwitchChange('nanostructured')}
                  disabled={disabled}
                />
              }
              label="Nanostructured Material"
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography gutterBottom>
              Grain Size: {parameters.grainSize} nm
            </Typography>
            <Slider
              value={parameters.grainSize}
              onChange={handleSliderChange('grainSize')}
              min={5}
              max={500}
              step={1}
              disabled={disabled || !parameters.nanostructured}
              valueLabelDisplay="auto"
              marks={[
                { value: 5, label: '5nm' },
                { value: 500, label: '500nm' }
              ]}
              sx={{ '& .MuiSlider-markLabel': { fontSize: '0.65rem' }, mb: 1 }}
            />
          </Grid>

          <Grid size={12}>
            <Typography gutterBottom>
              Defect Density: {parameters.defectDensity}
            </Typography>
            <Slider
              value={parameters.defectDensity}
              onChange={handleSliderChange('defectDensity')}
              min={0}
              max={0.5}
              step={0.01}
              disabled={disabled}
              valueLabelDisplay="auto"
              marks={[
                { value: 0, label: '0' },
                { value: 0.5, label: '0.5' }
              ]}
              sx={{ '& .MuiSlider-markLabel': { fontSize: '0.65rem' }, mb: 1 }}
            />
          </Grid>
        </Grid>
      </Collapse>

      {/* Visualization Section */}
      {renderSectionHeader('Visualization Options', 'visualization', 'Options for visualizing the simulation')}
      <Collapse in={expandedSections.visualization}>
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={parameters.showLattice}
                  onChange={handleSwitchChange('showLattice')}
                  disabled={disabled}
                />
              }
              label="Show Lattice"
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 4 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={parameters.showHotSpots}
                  onChange={handleSwitchChange('showHotSpots')}
                  disabled={disabled}
                />
              }
              label="Show Hot Spots"
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 4 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={parameters.showEnergyFlow}
                  onChange={handleSwitchChange('showEnergyFlow')}
                  disabled={disabled}
                />
              }
              label="Show Energy Flow"
            />
          </Grid>
        </Grid>
      </Collapse>

      {/* Advanced Section */}
      {renderSectionHeader('Advanced Settings', 'advanced', 'Advanced simulation parameters')}
      <Collapse in={expandedSections.advanced}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography gutterBottom>
              Time Step Size: {parameters.timeStepSize}
            </Typography>
            <Slider
              value={parameters.timeStepSize}
              onChange={handleSliderChange('timeStepSize')}
              min={0.01}
              max={1}
              step={0.01}
              disabled={disabled}
              valueLabelDisplay="auto"
              marks={[
                { value: 0.01, label: '0.01' },
                { value: 1, label: '1' }
              ]}
              sx={{ '& .MuiSlider-markLabel': { fontSize: '0.65rem' }, mb: 1 }}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography gutterBottom>
              Simulation Time: {parameters.totalSimulationTime}
            </Typography>
            <Slider
              value={parameters.totalSimulationTime}
              onChange={handleSliderChange('totalSimulationTime')}
              min={1}
              max={100}
              step={1}
              disabled={disabled}
              valueLabelDisplay="auto"
              marks={[
                { value: 1, label: '1s' },
                { value: 100, label: '100s' }
              ]}
              sx={{ '& .MuiSlider-markLabel': { fontSize: '0.65rem' }, mb: 1 }}
            />
          </Grid>
        </Grid>
      </Collapse>
    </div>
  );
};

LENRParameterControls.propTypes = {
  parameters: PropTypes.object,
  onChange: PropTypes.func.isRequired,
  savedConfigs: PropTypes.array,
  onLoadConfig: PropTypes.func,
  disabled: PropTypes.bool
};

export default LENRParameterControls; 