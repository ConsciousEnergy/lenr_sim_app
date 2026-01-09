import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  Typography,
  Switch,
  FormControlLabel,
  TextField,
  Button,
  Divider,
  Tooltip,
  IconButton,
  Stack,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Menu,
  List,
  ListItem,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SaveIcon from '@mui/icons-material/Save';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import DeleteIcon from '@mui/icons-material/Delete';


// Default parameter values
const defaultParameters = {
  // Basic Parameters
  reactionType: 'd-d',
  latticeType: 'palladium',
  temperature: 300,
  loadingRatio: 0.85,
  
  // Advanced Parameters - Plasma/Laser Fusion
  plasmaDensity: 1e20,        // particles/m³
  ionTemperature: 10,         // keV
  electronTemperature: 10,    // keV
  magneticField: 5.0,         // Tesla
  laserPower: 0,              // TW (0 = no laser)
  laserWavelength: 351,       // nm (typical ICF)
  confinementTime: 1e-6,      // seconds
  plasmaRadius: 0.01,         // meters
  compressionRatio: 1,        // for ICF
  
  // Advanced - Lattice Parameters
  latticeDimension: 10,
  defectDensity: 0.01,
  screeningEnergy: 310,       // eV
  phononCoupling: 1.0,        // coupling factor
  
  // Simulation Settings
  timeStepSize: 0.1,          // ps
  totalSimulationTime: 10,    // ps
  maxParticles: 1000,
  
  // Visualization Options
  showLattice: true,
  showDiffusion: false,
  showHotSpots: true,
  showParticles: true,
  showMagneticField: false,
  showPlasmaContour: true,
  showEnergyDistribution: false,
  colorByEnergy: true,
  showTrails: false
};

// Parameter descriptions and limits
const PARAMETER_METADATA = {
  // === BASIC PARAMETERS ===
  reactionType: {
    label: 'Reaction Type',
    description: 'Type of fusion reaction being simulated',
    section: 'basic',
    options: [
      { value: 'd-d', label: 'Deuterium-Deuterium', description: 'Fusion of two deuterium nuclei (3.27 MeV)' },
      { value: 'd-t', label: 'Deuterium-Tritium', description: 'Fusion of deuterium and tritium (17.6 MeV)' },
      { value: 'p-B11', label: 'Proton-Boron-11', description: 'Aneutronic fusion (8.7 MeV)' },
      { value: 'p-Li7', label: 'Proton-Lithium-7', description: 'Fusion of proton and lithium-7' }
    ]
  },
  latticeType: {
    label: 'Lattice Material',
    description: 'Host lattice material for the fusion reaction',
    section: 'basic',
    options: [
      { value: 'palladium', label: 'Palladium (Pd)', description: 'High hydrogen solubility, 275K Debye temp' },
      { value: 'nickel', label: 'Nickel (Ni)', description: 'Lower cost, 450K Debye temp' },
      { value: 'titanium', label: 'Titanium (Ti)', description: 'Strong hydride former, 420K Debye temp' },
      { value: 'platinum', label: 'Platinum (Pt)', description: 'Catalytic properties' }
    ]
  },
  temperature: {
    label: 'Temperature',
    description: 'Operating temperature in Kelvin',
    section: 'basic',
    min: 77,
    max: 1273,
    defaultValue: 300,
    unit: 'K',
    step: 10
  },
  loadingRatio: {
    label: 'Loading Ratio',
    description: 'Ratio of hydrogen isotopes to metal atoms (H/M)',
    section: 'basic',
    min: 0.1,
    max: 1.0,
    defaultValue: 0.85,
    unit: 'H/M',
    step: 0.01
  },
  
  // === ADVANCED PARAMETERS - PLASMA ===
  plasmaDensity: {
    label: 'Plasma Density',
    description: 'Number density of plasma particles (n_e)',
    section: 'advanced',
    min: 1e18,
    max: 1e25,
    defaultValue: 1e20,
    unit: 'm⁻³',
    step: 1e18,
    scientific: true
  },
  ionTemperature: {
    label: 'Ion Temperature',
    description: 'Temperature of plasma ions (T_i)',
    section: 'advanced',
    min: 0.1,
    max: 100,
    defaultValue: 10,
    unit: 'keV',
    step: 0.5
  },
  electronTemperature: {
    label: 'Electron Temperature',
    description: 'Temperature of plasma electrons (T_e)',
    section: 'advanced',
    min: 0.1,
    max: 100,
    defaultValue: 10,
    unit: 'keV',
    step: 0.5
  },
  magneticField: {
    label: 'Magnetic Field',
    description: 'External magnetic field strength for confinement',
    section: 'advanced',
    min: 0,
    max: 20,
    defaultValue: 5.0,
    unit: 'T',
    step: 0.1
  },
  laserPower: {
    label: 'Laser Power',
    description: 'Total laser power for ICF (0 = MCF mode)',
    section: 'advanced',
    min: 0,
    max: 500,
    defaultValue: 0,
    unit: 'TW',
    step: 10
  },
  laserWavelength: {
    label: 'Laser Wavelength',
    description: 'Laser wavelength for ICF experiments',
    section: 'advanced',
    min: 193,
    max: 1064,
    defaultValue: 351,
    unit: 'nm',
    step: 1
  },
  confinementTime: {
    label: 'Confinement Time',
    description: 'Energy confinement time (τ_E)',
    section: 'advanced',
    min: 1e-12,
    max: 10,
    defaultValue: 1e-6,
    unit: 's',
    step: 1e-9,
    scientific: true
  },
  plasmaRadius: {
    label: 'Plasma Radius',
    description: 'Characteristic plasma radius',
    section: 'advanced',
    min: 0.001,
    max: 10,
    defaultValue: 0.01,
    unit: 'm',
    step: 0.001
  },
  compressionRatio: {
    label: 'Compression Ratio',
    description: 'Target compression ratio for ICF',
    section: 'advanced',
    min: 1,
    max: 1000,
    defaultValue: 1,
    unit: '×',
    step: 10
  },
  screeningEnergy: {
    label: 'Screening Energy',
    description: 'Electron screening energy enhancement',
    section: 'advanced',
    min: 0,
    max: 1000,
    defaultValue: 310,
    unit: 'eV',
    step: 10
  },
  phononCoupling: {
    label: 'Phonon Coupling',
    description: 'Phonon-nuclear coupling factor',
    section: 'advanced',
    min: 0,
    max: 10,
    defaultValue: 1.0,
    unit: '',
    step: 0.1
  },
  latticeDimension: {
    label: 'Lattice Dimension',
    description: 'Size of the lattice structure (N×N×N)',
    section: 'advanced',
    min: 5,
    max: 50,
    defaultValue: 10,
    unit: 'cells',
    step: 1
  },
  defectDensity: {
    label: 'Defect Density',
    description: 'Density of defects in the lattice structure',
    section: 'advanced',
    min: 0,
    max: 0.5,
    defaultValue: 0.01,
    unit: '',
    step: 0.001
  },
  timeStepSize: {
    label: 'Time Step Size',
    description: 'Simulation time step',
    section: 'advanced',
    min: 0.001,
    max: 1.0,
    defaultValue: 0.1,
    unit: 'ps',
    step: 0.01
  },
  totalSimulationTime: {
    label: 'Total Simulation Time',
    description: 'Total duration of simulation',
    section: 'advanced',
    min: 1,
    max: 1000,
    defaultValue: 10,
    unit: 'ps',
    step: 1
  },
  
  // === VISUALIZATION OPTIONS ===
  showLattice: {
    label: 'Show Lattice',
    description: 'Display the metal lattice structure',
    section: 'visualization',
    defaultValue: true
  },
  showDiffusion: {
    label: 'Show Diffusion',
    description: 'Display particle diffusion paths',
    section: 'visualization',
    defaultValue: false
  },
  showHotSpots: {
    label: 'Show Hotspots',
    description: 'Highlight regions of high fusion activity',
    section: 'visualization',
    defaultValue: true
  },
  showParticles: {
    label: 'Show Particles',
    description: 'Display individual plasma particles',
    section: 'visualization',
    defaultValue: true
  },
  showMagneticField: {
    label: 'Show Magnetic Field',
    description: 'Display magnetic field lines',
    section: 'visualization',
    defaultValue: false
  },
  showPlasmaContour: {
    label: 'Show Plasma Contour',
    description: 'Display plasma density contours',
    section: 'visualization',
    defaultValue: true
  },
  showEnergyDistribution: {
    label: 'Show Energy Distribution',
    description: 'Display energy distribution heatmap',
    section: 'visualization',
    defaultValue: false
  },
  colorByEnergy: {
    label: 'Color by Energy',
    description: 'Color particles by their energy level',
    section: 'visualization',
    defaultValue: true
  },
  showTrails: {
    label: 'Show Particle Trails',
    description: 'Display particle trajectory trails',
    section: 'visualization',
    defaultValue: false
  }
};

/**
 * FusionParameterControls component for managing fusion simulation parameters
 * 
 * @param {Object} props - Component props
 * @param {Object} props.parameters - Current parameter values
 * @param {Function} props.onChange - Callback function for parameter changes
 */
function FusionParameterControls({ 
  parameters = defaultParameters, 
  onChange = () => {},
  savedConfigs: initialSavedConfigs = [],
  onLoadConfig = null 
}) {
  const [localParams, setLocalParams] = useState({...defaultParameters, ...parameters});
  const [configName, setConfigName] = useState('');
  const [expandedSection, setExpandedSection] = useState('basic');
  const [loadMenuAnchor, setLoadMenuAnchor] = useState(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);
  const [savedConfigs, setSavedConfigs] = useState(initialSavedConfigs);
  
  // Update local params when parent parameters change
  useEffect(() => {
    setLocalParams(prevParams => ({...prevParams, ...parameters}));
  }, [parameters]);
  
  // Handle parameter change
  const handleParamChange = (param, value) => {
    const updatedParams = {...localParams, [param]: value};
    setLocalParams(updatedParams);
    onChange(updatedParams);
  };
  
  // Reset parameters to default values
  const handleReset = () => {
    setLocalParams(defaultParameters);
    onChange(defaultParameters);
  };
  
  // Save current configuration
  const handleSaveConfig = () => {
    if (!configName.trim()) return;
    
    const newConfig = {
      id: `config-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: configName.trim(),
      params: {...localParams},
      timestamp: new Date().toISOString()
    };
    
    const updatedConfigs = [...savedConfigs, newConfig];
    setSavedConfigs(updatedConfigs);
    setConfigName('');
    setSaveDialogOpen(false); // Close save dialog after saving
    
    // Store in localStorage
    try {
      localStorage.setItem('fusionConfigs', JSON.stringify(updatedConfigs));
    } catch (error) {
      console.error('Failed to save configuration:', error);
    }
  };
  
  // Load saved configurations from localStorage
  useEffect(() => {
    try {
      const storedConfigs = localStorage.getItem('fusionConfigs');
      if (storedConfigs) {
        setSavedConfigs(JSON.parse(storedConfigs));
      }
    } catch (error) {
      console.error('Failed to load saved configurations:', error);
    }
  }, []);
  
  // Load a saved configuration
  const handleLoadConfig = (config) => {
    setLocalParams(config.params);
    onChange(config.params);
    setLoadDialogOpen(false); // Close load dialog after loading
    handleCloseLoadMenu(); // Close menu if open
  };
  
  // Export configuration to JSON file
  const handleExportConfig = () => {
    const exportData = {
      name: configName || 'Fusion Configuration',
      parameters: localParams,
      timestamp: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `fusion-config-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  // Import configuration from JSON file
  const handleImportConfig = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedConfig = JSON.parse(e.target.result);
        if (importedConfig.parameters) {
          setLocalParams(importedConfig.parameters);
          onChange(importedConfig.parameters);
          
          // Add to saved configs if it has a name
          if (importedConfig.name) {
            const newConfig = {
              id: `config-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              name: importedConfig.name,
              params: importedConfig.parameters,
              timestamp: importedConfig.timestamp || new Date().toISOString()
            };
            
            const updatedConfigs = [...savedConfigs, newConfig];
            setSavedConfigs(updatedConfigs);
            localStorage.setItem('fusionConfigs', JSON.stringify(updatedConfigs));
          }
        } else {
          console.error('Invalid configuration format');
        }
      } catch (error) {
        console.error('Failed to parse imported configuration:', error);
      }
    };
    reader.readAsText(file);
    
    // Reset file input
    event.target.value = null;
  };
  
  // Handle accordion expansion
  const handleAccordionChange = (section) => (_, isExpanded) => {
    setExpandedSection(isExpanded ? section : false);
  };
  
  
  // Handle closing the load configuration menu
  const handleCloseLoadMenu = () => {
    setLoadMenuAnchor(null);
  };
  
  // Handle deleting a configuration
  const handleDeleteConfig = (configIdOrName) => {
    // Validate that we have a valid identifier to prevent unintended deletions
    if (!configIdOrName) {
      console.warn('Cannot delete config: no id or name provided');
      return;
    }
    
    const updatedConfigs = savedConfigs.filter(config => 
      config.id !== configIdOrName && config.name !== configIdOrName
    );
    setSavedConfigs(updatedConfigs);
    try {
      localStorage.setItem('fusionConfigs', JSON.stringify(updatedConfigs));
    } catch (error) {
      console.error('Failed to update saved configurations:', error);
    }
  };
  
  // Group parameters by section
  const parametersBySection = {
    basic: [],
    advanced: [],
    visualization: [],
    simulation: []
  };
  
  Object.entries(PARAMETER_METADATA).forEach(([key, meta]) => {
    // Default to 'basic' section if not specified
    const section = meta.section || 'basic';
    if (parametersBySection[section]) {
      parametersBySection[section].push(key);
    } else {
      parametersBySection.basic.push(key);
    }
  });
  
  
  // Helper render functions for different parameter types
  const renderSelect = (paramName) => {
    const metadata = PARAMETER_METADATA[paramName];
    const value = localParams[paramName];
    
    return (
      <FormControl key={paramName} fullWidth sx={{ mb: 2 }}>
        <InputLabel id={`${paramName}-label`}>{metadata.label}</InputLabel>
        <Select
          labelId={`${paramName}-label`}
          value={value}
          label={metadata.label}
          onChange={(e) => handleParamChange(paramName, e.target.value)}
        >
          {metadata.options.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              <Box>
                <Typography>{option.label}</Typography>
                {option.description && (
                  <Typography variant="caption" color="text.secondary">
                    {option.description}
                  </Typography>
                )}
              </Box>
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    );
  };

  const renderSlider = (paramName) => {
    const metadata = PARAMETER_METADATA[paramName];
    const value = localParams[paramName] ?? metadata.defaultValue;
    
    // For scientific notation parameters, use logarithmic scale
    const isScientific = metadata.scientific;
    let displayValue = value;
    let sliderValue = value;
    
    if (isScientific && value > 0) {
      // Use log scale for slider
      sliderValue = Math.log10(value);
    }
    
    const formatValue = (val) => {
      if (isScientific && val > 1000) {
        return val.toExponential(2);
      }
      return typeof val === 'number' && !Number.isInteger(val) ? val.toFixed(3) : val;
    };
    
    return (
      <Box key={paramName} sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, gap: 1 }}>
          <Typography sx={{ flexGrow: 1 }}>
            {metadata.label}
            {metadata.unit && ` (${metadata.unit})`}
          </Typography>
          <Tooltip title={metadata.description}>
            <HelpOutlineIcon fontSize="small" color="action" />
          </Tooltip>
          <TextField
            value={formatValue(value)}
            onChange={(e) => {
              const parsed = parseFloat(e.target.value);
              if (!isNaN(parsed)) {
                handleParamChange(paramName, parsed);
              }
            }}
            variant="outlined"
            size="small"
            sx={{ width: isScientific ? '120px' : '80px' }}
            type={isScientific ? 'text' : 'number'}
            inputProps={{
              min: metadata.min,
              max: metadata.max,
              step: metadata.step
            }}
          />
        </Box>
        {isScientific ? (
          <Slider
            value={Math.log10(Math.max(value, metadata.min))}
            onChange={(_, newValue) => handleParamChange(paramName, Math.pow(10, newValue))}
            min={Math.log10(metadata.min)}
            max={Math.log10(metadata.max)}
            step={0.1}
            valueLabelDisplay="auto"
            valueLabelFormat={(v) => `10^${v.toFixed(1)}`}
          />
        ) : (
          <Slider
            value={value}
            onChange={(_, newValue) => handleParamChange(paramName, newValue)}
            min={metadata.min}
            max={metadata.max}
            step={metadata.step}
            valueLabelDisplay="auto"
          />
        )}
      </Box>
    );
  };

  const renderToggle = (paramName) => {
    const metadata = PARAMETER_METADATA[paramName];
    const value = localParams[paramName] ?? metadata.defaultValue;
    
    return (
      <FormControlLabel
        key={paramName}
        control={
          <Switch
            checked={value}
            onChange={(e) => handleParamChange(paramName, e.target.checked)}
          />
        }
        label={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography>{metadata.label}</Typography>
            <Tooltip title={metadata.description}>
              <HelpOutlineIcon fontSize="small" color="action" />
            </Tooltip>
          </Box>
        }
      />
    );
  };

  
  // Render the load configuration menu
  const renderLoadMenu = () => (
    <Menu
      id="load-config-menu"
      anchorEl={loadMenuAnchor}
      keepMounted
      open={Boolean(loadMenuAnchor)}
      onClose={handleCloseLoadMenu}
    >
      <Typography variant="subtitle2" sx={{ px: 2, py: 1 }}>
        Saved Configurations
      </Typography>
      <Divider />
      {savedConfigs && savedConfigs.length > 0 ? (
        <List sx={{ width: '100%', maxWidth: 360, minWidth: 250 }}>
          {savedConfigs.map((config) => (
            <ListItem 
              key={config.id || config.name}
              button
              onClick={() => handleLoadConfig(config)}
            >
              <ListItemText
                primary={config.name}
                secondary={config.timestamp}
                secondaryTypographyProps={{ noWrap: true }}
              />
            </ListItem>
          ))}
        </List>
      ) : (
        <Box sx={{ p: 2 }}>
          <Typography variant="body2" color="text.secondary">
            No saved configurations
          </Typography>
        </Box>
      )}
    </Menu>
  );
  
  return (
    <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
      {/* Header with Reset Button */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button
          startIcon={<RestartAltIcon />}
          variant="outlined"
          size="small"
          onClick={handleReset}
        >
          Reset Defaults
        </Button>
      </Box>
      
      {/* Basic Parameters Section */}
      <Accordion 
        expanded={expandedSection === 'basic'} 
        onChange={handleAccordionChange('basic')}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1">Basic Parameters</Typography>
        </AccordionSummary>
        <AccordionDetails>
          {parametersBySection.basic.map((paramName) => {
            if (PARAMETER_METADATA[paramName].options) {
              return renderSelect(paramName);
            } else if (PARAMETER_METADATA[paramName].min !== undefined) {
              return renderSlider(paramName);
            } else if (typeof PARAMETER_METADATA[paramName].defaultValue === 'boolean') {
              return renderToggle(paramName);
            }
            return null;
          })}
        </AccordionDetails>
      </Accordion>
      
      {/* Advanced Parameters Section */}
      <Accordion 
        expanded={expandedSection === 'advanced'} 
        onChange={handleAccordionChange('advanced')}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1">Advanced Parameters</Typography>
        </AccordionSummary>
        <AccordionDetails>
          {parametersBySection.advanced.map((paramName) => {
            if (PARAMETER_METADATA[paramName].options) {
              return renderSelect(paramName);
            } else if (PARAMETER_METADATA[paramName].min !== undefined) {
              return renderSlider(paramName);
            } else if (typeof PARAMETER_METADATA[paramName].defaultValue === 'boolean') {
              return renderToggle(paramName);
            }
            return null;
          })}
        </AccordionDetails>
      </Accordion>
      
      {/* Visualization Options Section */}
      <Accordion 
        expanded={expandedSection === 'visualization'} 
        onChange={handleAccordionChange('visualization')}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1">Visualization Options</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            {parametersBySection.visualization.map((paramName) => 
              renderToggle(paramName)
            )}
          </Box>
        </AccordionDetails>
      </Accordion>
      
      {/* Configuration Management */}
      <Divider sx={{ my: 1 }} />
      <Typography variant="subtitle2">Configuration Management</Typography>
      
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
        <TextField
          label="Configuration Name"
          variant="outlined"
          size="small"
          value={configName}
          onChange={(e) => setConfigName(e.target.value)}
          fullWidth
        />
        <Tooltip title="Save Configuration">
          <span>
            <IconButton color="primary" onClick={() => setSaveDialogOpen(true)} disabled={!configName.trim()}>
              <SaveIcon />
            </IconButton>
          </span>
        </Tooltip>
      </Box>
      
      <Stack direction="row" spacing={1} justifyContent="space-between">
        <Button
          startIcon={<FileDownloadIcon />}
          size="small"
          onClick={handleExportConfig}
        >
          Export
        </Button>
        
        <Button
          component="label"
          startIcon={<FileUploadIcon />}
          size="small"
        >
          Import
          <input
            type="file"
            accept=".json"
            hidden
            onChange={handleImportConfig}
          />
        </Button>
      </Stack>
      
      {/* Load Configuration Menu */}
      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="outlined"
          size="small"
          startIcon={<FolderOpenIcon />}
          onClick={() => setLoadDialogOpen(true)}
          disabled={!savedConfigs || savedConfigs.length === 0}
        >
          Load Config
        </Button>
      </Box>
      
      {/* Saved Configurations */}
      {renderLoadMenu()}
      
      {/* Save Configuration Dialog */}
      <Dialog open={saveDialogOpen} onClose={() => setSaveDialogOpen(false)}>
        <DialogTitle>Save Configuration</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Configuration Name"
            fullWidth
            variant="outlined"
            value={configName}
            onChange={(e) => setConfigName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleSaveConfig}
            disabled={!configName.trim()}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Load Configuration Dialog */}
      <Dialog 
        open={loadDialogOpen} 
        onClose={() => setLoadDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Load Configuration</DialogTitle>
        <DialogContent>
          {savedConfigs && savedConfigs.length > 0 ? (
            <List>
              {savedConfigs.map((config) => (
                <ListItem
                  key={config.id || config.name}
                  secondaryAction={
                    <IconButton 
                      edge="end" 
                      aria-label="delete"
                      onClick={() => handleDeleteConfig(config.id || config.name)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  }
                >
                  <ListItemText 
                    primary={config.name}
                    secondary={new Date(config.timestamp).toLocaleString()}
                  />
                  <Button 
                    variant="outlined" 
                    size="small"
                    onClick={() => handleLoadConfig(config)}
                  >
                    Load
                  </Button>
                </ListItem>
              ))}
            </List>
          ) : (
            <Typography>No saved configurations</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLoadDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

FusionParameterControls.propTypes = {
  parameters: PropTypes.shape({
    // Basic
    reactionType: PropTypes.string,
    latticeType: PropTypes.string,
    temperature: PropTypes.number,
    loadingRatio: PropTypes.number,
    // Advanced - Plasma
    plasmaDensity: PropTypes.number,
    ionTemperature: PropTypes.number,
    electronTemperature: PropTypes.number,
    magneticField: PropTypes.number,
    laserPower: PropTypes.number,
    laserWavelength: PropTypes.number,
    confinementTime: PropTypes.number,
    plasmaRadius: PropTypes.number,
    compressionRatio: PropTypes.number,
    // Advanced - Lattice
    latticeDimension: PropTypes.number,
    defectDensity: PropTypes.number,
    screeningEnergy: PropTypes.number,
    phononCoupling: PropTypes.number,
    // Simulation
    timeStepSize: PropTypes.number,
    totalSimulationTime: PropTypes.number,
    maxParticles: PropTypes.number,
    // Visualization
    showLattice: PropTypes.bool,
    showDiffusion: PropTypes.bool,
    showHotSpots: PropTypes.bool,
    showParticles: PropTypes.bool,
    showMagneticField: PropTypes.bool,
    showPlasmaContour: PropTypes.bool,
    showEnergyDistribution: PropTypes.bool,
    colorByEnergy: PropTypes.bool,
    showTrails: PropTypes.bool
  }),
  onChange: PropTypes.func,
  savedConfigs: PropTypes.array,
  onLoadConfig: PropTypes.func
};

export default FusionParameterControls; 