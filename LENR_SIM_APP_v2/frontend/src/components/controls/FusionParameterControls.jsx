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
  reactionType: 'd-d',
  latticeType: 'palladium',
  temperature: 300,
  loadingRatio: 0.8,
  latticeDimension: 3,
  defectDensity: 0.01,
  showLattice: true,
  showDiffusion: true,
  showHotSpots: true
};

// Parameter descriptions and limits
const PARAMETER_METADATA = {
  reactionType: {
    label: 'Reaction Type',
    description: 'Type of fusion reaction being simulated',
    options: [
      { value: 'd-d', label: 'Deuterium-Deuterium', description: 'Fusion of two deuterium nuclei' },
      { value: 'd-t', label: 'Deuterium-Tritium', description: 'Fusion of deuterium and tritium nuclei' },
      { value: 'p-B11', label: 'Proton-Boron-11', description: 'Fusion of proton and boron-11 nuclei' },
      { value: 'p-Li7', label: 'Proton-Lithium-7', description: 'Fusion of proton and lithium-7 nuclei' }
    ]
  },
  latticeType: {
    label: 'Lattice Material',
    description: 'Host lattice material for the fusion reaction',
    options: [
      { value: 'palladium', label: 'Palladium', description: 'Palladium metal lattice' },
      { value: 'nickel', label: 'Nickel', description: 'Nickel metal lattice' },
      { value: 'titanium', label: 'Titanium', description: 'Titanium metal lattice' },
      { value: 'platinum', label: 'Platinum', description: 'Platinum metal lattice' }
    ]
  },
  temperature: {
    label: 'Temperature',
    description: 'Operating temperature in Kelvin',
    min: 77,
    max: 1273,
    defaultValue: 300,
    unit: 'K',
    step: 10
  },
  loadingRatio: {
    label: 'Loading Ratio',
    description: 'Ratio of hydrogen isotopes to metal atoms',
    min: 0.1,
    max: 1.0,
    defaultValue: 0.85,
    unit: 'H/M',
    step: 0.01
  },
  latticeDimension: {
    label: 'Lattice Dimension',
    description: 'Size of the lattice structure (N×N×N)',
    min: 5,
    max: 50,
    defaultValue: 10,
    unit: 'cells',
    step: 1
  },
  defectDensity: {
    label: 'Defect Density',
    description: 'Density of defects in the lattice structure',
    min: 0,
    max: 0.5,
    defaultValue: 0.1,
    unit: '',
    step: 0.01
  },
  showLattice: {
    label: 'Show Lattice',
    description: 'Display the metal lattice structure',
    defaultValue: true
  },
  showDiffusion: {
    label: 'Show Diffusion',
    description: 'Display particle diffusion paths',
    defaultValue: false
  },
  showHotSpots: {
    label: 'Show Hotspots',
    description: 'Highlight regions of high fusion activity',
    defaultValue: true
  }
};

/**
 * FusionParameterControls component for managing fusion simulation parameters
 * 
 * @param {Object} props - Component props
 * @param {Object} props.parameters - Current parameter values
 * @param {Function} props.onChange - Callback function for parameter changes
 */
function FusionParameterControls({ parameters, onChange }) {
  const [localParams, setLocalParams] = useState({...defaultParameters, ...parameters});
  const [configName, setConfigName] = useState('');
  const [expandedSection, setExpandedSection] = useState('basic');
  const [loadMenuAnchor, setLoadMenuAnchor] = useState(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);
  const [savedConfigs, setSavedConfigs] = useState([]);
  
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
      name: configName.trim(),
      params: {...localParams},
      timestamp: new Date().toISOString()
    };
    
    const updatedConfigs = [...savedConfigs, newConfig];
    setSavedConfigs(updatedConfigs);
    setConfigName('');
    
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
  const handleDeleteConfig = (configId) => {
    const updatedConfigs = savedConfigs.filter(config => config.id !== configId);
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
    parametersBySection[meta.section].push(key);
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
    const value = localParams[paramName] || metadata.defaultValue;
    
    return (
      <Box key={paramName} sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Typography sx={{ flexGrow: 1 }}>
            {metadata.label}
            {metadata.unit && ` (${metadata.unit})`}
          </Typography>
          <TextField
            value={value}
            onChange={(e) => handleParamChange(paramName, parseFloat(e.target.value))}
            variant="outlined"
            size="small"
            sx={{ width: '80px' }}
            type="number"
            inputProps={{
              min: metadata.min,
              max: metadata.max,
              step: metadata.step
            }}
          />
        </Box>
        <Slider
          value={value}
          onChange={(_, newValue) => handleParamChange(paramName, newValue)}
          min={metadata.min}
          max={metadata.max}
          step={metadata.step}
          valueLabelDisplay="auto"
        />
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
              key={config.name}
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
            } else if (typeof PARAMETER_METADATA[paramName].default === 'boolean') {
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
            } else if (typeof PARAMETER_METADATA[paramName].default === 'boolean') {
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
          <IconButton color="primary" onClick={() => setSaveDialogOpen(true)} disabled={!configName.trim()}>
            <SaveIcon />
          </IconButton>
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
                  key={config.id}
                  secondaryAction={
                    <IconButton 
                      edge="end" 
                      aria-label="delete"
                      onClick={() => handleDeleteConfig(config.id)}
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
    reactionType: PropTypes.string,
    latticeType: PropTypes.string,
    temperature: PropTypes.number,
    loadingRatio: PropTypes.number,
    latticeDimension: PropTypes.number,
    defectDensity: PropTypes.number,
    showLattice: PropTypes.bool,
    showDiffusion: PropTypes.bool,
    showHotSpots: PropTypes.bool
  }),
  onChange: PropTypes.func.isRequired,
  savedConfigs: PropTypes.array,
  onLoadConfig: PropTypes.func
};

FusionParameterControls.defaultProps = {
  parameters: defaultParameters,
  savedConfigs: [],
  onLoadConfig: null
};

export default FusionParameterControls; 