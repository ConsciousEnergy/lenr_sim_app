import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  Divider, 
  Switch, 
  FormControlLabel, 
  Slider, 
  TextField, 
  Button, 
  Grid, 
  Alert, 
  Snackbar,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  List,
  ListItem,
  ListItemText,
  ListSubheader,
  Tab,
  Tabs,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  CircularProgress
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SaveIcon from '@mui/icons-material/Save';
import RestoreIcon from '@mui/icons-material/Restore';
import InfoIcon from '@mui/icons-material/Info';
import ScienceIcon from '@mui/icons-material/Science';
import TuneIcon from '@mui/icons-material/Tune';
import MemoryIcon from '@mui/icons-material/Memory';
import SpeedIcon from '@mui/icons-material/Speed';
import BuildIcon from '@mui/icons-material/Build';
import Tooltip from '@mui/material/Tooltip';
import { useLogger } from '../contexts/LogContext';
import { useAppSettings } from '../contexts/AppSettingsContext';

// TabPanel component for tab navigation
const TabPanel = (props) => {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 2 }}>{children}</Box>}
    </div>
  );
};

// Main Settings Component
const SettingsPage = () => {
  const logger = useLogger();
  const { 
    settings: appSettings, 
    isLoaded,
    saveSettings: saveAppSettings,
    updateSetting,
    updateCategory,
    resetSettings: resetAppSettings,
    defaultSettings
  } = useAppSettings();
  
  const [activeTab, setActiveTab] = useState(0);
  const [localSettings, setLocalSettings] = useState(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info'
  });

  // Initialize local settings when app settings are loaded
  useEffect(() => {
    if (isLoaded && appSettings) {
      setLocalSettings({...appSettings});
    }
  }, [isLoaded, appSettings]);

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Handle setting changes
  const handleSettingChange = (category, settingName, value) => {
    if (!localSettings) return;
    
    setLocalSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [settingName]: value
      }
    }));
  };

  // Save settings
  const saveSettings = () => {
    try {
      if (!localSettings) return;
      
      const success = saveAppSettings(localSettings);
      
      if (success) {
        logger.info('Settings saved to app context and storage');
        setSnackbar({
          open: true,
          message: 'Settings saved and applied successfully',
          severity: 'success'
        });
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (error) {
      logger.error('Error saving settings', error);
      setSnackbar({
        open: true,
        message: 'Error saving settings: ' + error.message,
        severity: 'error'
      });
    }
  };

  // Apply individual setting directly to app context
  const applySettingDirectly = (category, settingName, value) => {
    try {
      const success = updateSetting(category, settingName, value);
      
      if (success) {
        // Update local settings too
        handleSettingChange(category, settingName, value);
        return true;
      }
      return false;
    } catch (error) {
      logger.error('Error applying setting directly', error);
      return false;
    }
  };

  // Reset settings to defaults
  const resetSettings = () => {
    try {
      const success = resetAppSettings();
      
      if (success) {
        setLocalSettings({...defaultSettings});
        logger.info('Settings reset to defaults');
        setSnackbar({
          open: true,
          message: 'Settings reset to defaults',
          severity: 'info'
        });
      } else {
        throw new Error('Failed to reset settings');
      }
    } catch (error) {
      logger.error('Error resetting settings', error);
      setSnackbar({
        open: true,
        message: 'Error resetting settings: ' + error.message,
        severity: 'error'
      });
    }
  };

  // Export settings to file
  const exportSettings = () => {
    try {
      const settingsStr = JSON.stringify(localSettings || appSettings, null, 2);
      const blob = new Blob([settingsStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = 'lenr_simulation_settings.json';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      logger.info('Settings exported to file');
      setSnackbar({
        open: true,
        message: 'Settings exported to file',
        severity: 'success'
      });
    } catch (error) {
      logger.error('Error exporting settings', error);
      setSnackbar({
        open: true,
        message: 'Error exporting settings: ' + error.message,
        severity: 'error'
      });
    }
  };

  // Import settings from file
  const importSettings = (event) => {
    try {
      const file = event.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importedSettings = JSON.parse(e.target.result);
          setLocalSettings(importedSettings);
          logger.info('Settings imported from file');
          setSnackbar({
            open: true,
            message: 'Settings imported successfully. Click Save to apply.',
            severity: 'success'
          });
        } catch (parseError) {
          logger.error('Error parsing settings file', parseError);
          setSnackbar({
            open: true,
            message: 'Error parsing settings file: ' + parseError.message,
            severity: 'error'
          });
        }
      };
      
      reader.readAsText(file);
    } catch (error) {
      logger.error('Error importing settings', error);
      setSnackbar({
        open: true,
        message: 'Error importing settings: ' + error.message,
        severity: 'error'
      });
    }
  };

  // Close snackbar
  const handleCloseSnackbar = () => {
    setSnackbar({...snackbar, open: false});
  };

  // Check if settings have changed
  const hasSettingsChanged = () => {
    if (!localSettings || !appSettings) return false;
    return JSON.stringify(localSettings) !== JSON.stringify(appSettings);
  };

  // If settings aren't loaded yet, show loading state
  if (!isLoaded || !localSettings || !localSettings.lenrPhysics) {
    return (
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
        <CircularProgress />
        <Typography variant="body1" sx={{ ml: 2 }}>
          Loading settings...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Application Settings
      </Typography>
      
      <Box sx={{ mb: 3 }}>
        <Typography variant="body1" color="text.secondary">
          Configure the application settings to customize your experience and adjust LENR simulation parameters.
        </Typography>
      </Box>
      
      <Paper sx={{ mb: 3 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={handleTabChange} aria-label="settings tabs">
            <Tab icon={<TuneIcon />} label="Appearance" />
            <Tab icon={<MemoryIcon />} label="Visualization" />
            <Tab icon={<ScienceIcon />} label="Simulation" />
            <Tab icon={<BuildIcon />} label="LENR Physics" />
            <Tab icon={<SpeedIcon />} label="Advanced" />
          </Tabs>
        </Box>
        
        {/* Appearance Settings */}
        <TabPanel value={activeTab} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel id="theme-select-label">Theme</InputLabel>
                <Select
                  labelId="theme-select-label"
                  value={localSettings.appearance.theme}
                  label="Theme"
                  onChange={(e) => handleSettingChange('appearance', 'theme', e.target.value)}
                >
                  <MenuItem value="light">Light</MenuItem>
                  <MenuItem value="dark">Dark</MenuItem>
                  <MenuItem value="system">System Default</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel id="font-size-select-label">Font Size</InputLabel>
                <Select
                  labelId="font-size-select-label"
                  value={localSettings.appearance.fontSize}
                  label="Font Size"
                  onChange={(e) => handleSettingChange('appearance', 'fontSize', e.target.value)}
                >
                  <MenuItem value="small">Small</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="large">Large</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={localSettings.appearance.animationsEnabled}
                    onChange={(e) => handleSettingChange('appearance', 'animationsEnabled', e.target.checked)}
                  />
                }
                label="Enable Animations"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={localSettings.appearance.highContrastMode}
                    onChange={(e) => handleSettingChange('appearance', 'highContrastMode', e.target.checked)}
                  />
                }
                label="High Contrast Mode"
              />
            </Grid>
          </Grid>
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
            <Button 
              variant="outlined"
              color="primary"
              onClick={() => {
                if (localSettings?.appearance) {
                  updateCategory('appearance', localSettings.appearance);
                  setSnackbar({
                    open: true,
                    message: 'Appearance settings applied',
                    severity: 'success'
                  });
                }
              }}
            >
              Apply Changes
            </Button>
          </Box>
        </TabPanel>
        
        {/* Visualization Settings */}
        <TabPanel value={activeTab} index={1}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel id="render-quality-label">Render Quality</InputLabel>
                <Select
                  labelId="render-quality-label"
                  value={localSettings.visualization.renderQuality}
                  label="Render Quality"
                  onChange={(e) => handleSettingChange('visualization', 'renderQuality', e.target.value)}
                >
                  <MenuItem value="low">Low (Better Performance)</MenuItem>
                  <MenuItem value="medium">Medium (Balanced)</MenuItem>
                  <MenuItem value="high">High (Best Visual Quality)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Box>
                <Typography gutterBottom>Particle Count</Typography>
                <Slider
                  value={localSettings.visualization.particleCount}
                  onChange={(e, newValue) => handleSettingChange('visualization', 'particleCount', newValue)}
                  min={50}
                  max={500}
                  step={10}
                  marks={[
                    { value: 50, label: '50' },
                    { value: 200, label: '200' },
                    { value: 500, label: '500' }
                  ]}
                  valueLabelDisplay="auto"
                />
              </Box>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={localSettings.visualization.showAxes}
                    onChange={(e) => handleSettingChange('visualization', 'showAxes', e.target.checked)}
                  />
                }
                label="Show Coordinate Axes"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={localSettings.visualization.showGrid}
                    onChange={(e) => handleSettingChange('visualization', 'showGrid', e.target.checked)}
                  />
                }
                label="Show Grid"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={localSettings.visualization.useAntialiasing}
                    onChange={(e) => handleSettingChange('visualization', 'useAntialiasing', e.target.checked)}
                  />
                }
                label="Enable Antialiasing"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Box>
                <Typography gutterBottom>Max FPS Limit</Typography>
                <Slider
                  value={localSettings.visualization.maxFPS}
                  onChange={(e, newValue) => handleSettingChange('visualization', 'maxFPS', newValue)}
                  min={30}
                  max={120}
                  step={10}
                  marks={[
                    { value: 30, label: '30' },
                    { value: 60, label: '60' },
                    { value: 120, label: '120' }
                  ]}
                  valueLabelDisplay="auto"
                />
              </Box>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Box>
                <Typography gutterBottom>Atom Scale (Size)</Typography>
                <Slider
                  value={localSettings.visualization.atomScale}
                  onChange={(e, newValue) => handleSettingChange('visualization', 'atomScale', newValue)}
                  min={0.5}
                  max={2.0}
                  step={0.1}
                  marks={[
                    { value: 0.5, label: '0.5x' },
                    { value: 1.0, label: '1.0x' },
                    { value: 2.0, label: '2.0x' }
                  ]}
                  valueLabelDisplay="auto"
                />
              </Box>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Box>
                <Typography gutterBottom>Electron Cloud Visibility</Typography>
                <Slider
                  value={localSettings.visualization.electronCloudVisibility}
                  onChange={(e, newValue) => handleSettingChange('visualization', 'electronCloudVisibility', newValue)}
                  min={0.2}
                  max={1.0}
                  step={0.1}
                  marks={[
                    { value: 0.2, label: '20%' },
                    { value: 0.6, label: '60%' },
                    { value: 1.0, label: '100%' }
                  ]}
                  valueLabelDisplay="auto"
                />
              </Box>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={localSettings.visualization.showTunnelingPaths}
                    onChange={(e) => handleSettingChange('visualization', 'showTunnelingPaths', e.target.checked)}
                  />
                }
                label="Show Tunneling Paths"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={localSettings.visualization.colorIntensityByEnergy}
                    onChange={(e) => handleSettingChange('visualization', 'colorIntensityByEnergy', e.target.checked)}
                  />
                }
                label="Color Intensity by Energy"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Background Color"
                type="text"
                value={localSettings.visualization.backgroundColor}
                onChange={(e) => handleSettingChange('visualization', 'backgroundColor', e.target.value)}
                fullWidth
              />
            </Grid>
          </Grid>
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
            <Button 
              variant="outlined"
              color="primary"
              onClick={() => {
                if (localSettings?.visualization) {
                  updateCategory('visualization', localSettings.visualization);
                  setSnackbar({
                    open: true,
                    message: 'Visualization settings applied',
                    severity: 'success'
                  });
                }
              }}
            >
              Apply Changes
            </Button>
          </Box>
        </TabPanel>
        
        {/* Simulation Settings */}
        <TabPanel value={activeTab} index={2}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel id="precision-select-label">Default Precision</InputLabel>
                <Select
                  labelId="precision-select-label"
                  value={localSettings.simulation.defaultPrecision}
                  label="Default Precision"
                  onChange={(e) => handleSettingChange('simulation', 'defaultPrecision', e.target.value)}
                >
                  <MenuItem value="low">Low (Fast)</MenuItem>
                  <MenuItem value="medium">Medium (Balanced)</MenuItem>
                  <MenuItem value="high">High (Accurate)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Box>
                <Typography gutterBottom>Max Iterations</Typography>
                <Slider
                  value={localSettings.simulation.maxIterations}
                  onChange={(e, newValue) => handleSettingChange('simulation', 'maxIterations', newValue)}
                  min={100}
                  max={5000}
                  step={100}
                  marks={[
                    { value: 100, label: '100' },
                    { value: 1000, label: '1000' },
                    { value: 5000, label: '5000' }
                  ]}
                  valueLabelDisplay="auto"
                />
              </Box>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Box>
                <Typography gutterBottom>Principal Quantum Number</Typography>
                <Slider
                  value={localSettings.simulation.principalQuantumNumber}
                  onChange={(e, newValue) => handleSettingChange('simulation', 'principalQuantumNumber', newValue)}
                  min={3}
                  max={20}
                  step={1}
                  marks={[
                    { value: 5, label: '5' },
                    { value: 10, label: '10' },
                    { value: 15, label: '15' }
                  ]}
                  valueLabelDisplay="auto"
                />
                <Typography variant="caption" color="text.secondary">
                  Higher values create larger Rydberg orbitals
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Box>
                <Typography gutterBottom>Tunneling Enhancement Factor</Typography>
                <Slider
                  value={localSettings.simulation.tunnelingEnhancementFactor}
                  onChange={(e, newValue) => handleSettingChange('simulation', 'tunnelingEnhancementFactor', newValue)}
                  min={1}
                  max={100}
                  step={1}
                  marks={[
                    { value: 1, label: '1x' },
                    { value: 50, label: '50x' },
                    { value: 100, label: '100x' }
                  ]}
                  valueLabelDisplay="auto"
                />
                <Typography variant="caption" color="text.secondary">
                  Increases quantum tunneling probability
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Default Timestep"
                type="number"
                inputProps={{ step: 0.001, min: 0.001, max: 0.1 }}
                value={localSettings.simulation.defaultTimestep}
                onChange={(e) => handleSettingChange('simulation', 'defaultTimestep', parseFloat(e.target.value))}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Save Path"
                value={localSettings.simulation.savePath}
                onChange={(e) => handleSettingChange('simulation', 'savePath', e.target.value)}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={localSettings.simulation.autosaveResults}
                    onChange={(e) => handleSettingChange('simulation', 'autosaveResults', e.target.checked)}
                  />
                }
                label="Autosave Results"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={localSettings.simulation.useFastMath}
                    onChange={(e) => handleSettingChange('simulation', 'useFastMath', e.target.checked)}
                  />
                }
                label="Use Fast Math (Less Accurate)"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={localSettings.simulation.autoPlaySimulation}
                    onChange={(e) => handleSettingChange('simulation', 'autoPlaySimulation', e.target.checked)}
                  />
                }
                label="Auto-play Simulation"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={localSettings.simulation.includeBoseEinsteinStats}
                    onChange={(e) => handleSettingChange('simulation', 'includeBoseEinsteinStats', e.target.checked)}
                  />
                }
                label="Include Bose-Einstein Statistics"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={localSettings.simulation.useQuantumCorrections}
                    onChange={(e) => handleSettingChange('simulation', 'useQuantumCorrections', e.target.checked)}
                  />
                }
                label="Use Quantum Corrections"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel id="electron-pairing-label">Electron Pairing Mode</InputLabel>
                <Select
                  labelId="electron-pairing-label"
                  value={localSettings.simulation.pairedElectronMode}
                  label="Electron Pairing Mode"
                  onChange={(e) => handleSettingChange('simulation', 'pairedElectronMode', e.target.value)}
                >
                  <MenuItem value="spin-paired">Spin-Paired</MenuItem>
                  <MenuItem value="orbital-sharing">Orbital-Sharing</MenuItem>
                  <MenuItem value="independent">Independent Electrons</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
            <Button 
              variant="outlined"
              color="primary"
              onClick={() => {
                if (localSettings?.simulation) {
                  updateCategory('simulation', localSettings.simulation);
                  setSnackbar({
                    open: true,
                    message: 'Simulation settings applied',
                    severity: 'success'
                  });
                }
              }}
            >
              Apply Changes
            </Button>
          </Box>
        </TabPanel>
        
        {/* LENR Physics Tab */}
        <TabPanel value={activeTab} index={3}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel id="model-type-label">LENR Model Type</InputLabel>
                <Select
                  labelId="model-type-label"
                  value={localSettings?.lenrPhysics?.modelType || "rydberg"}
                  label="LENR Model Type"
                  onChange={(e) => handleSettingChange('lenrPhysics', 'modelType', e.target.value)}
                >
                  <MenuItem value="rydberg">Rydberg Matter Model</MenuItem>
                  <MenuItem value="widom-larsen">Widom-Larsen Theory</MenuItem>
                  <MenuItem value="bose-einstein">Bose-Einstein Condensate</MenuItem>
                  <MenuItem value="hydroton">Hydroton Model</MenuItem>
                </Select>
              </FormControl>
              
              <FormControlLabel
                control={
                  <Switch
                    checked={localSettings?.lenrPhysics?.includeCoulombBarrier || false}
                    onChange={(e) => handleSettingChange('lenrPhysics', 'includeCoulombBarrier', e.target.checked)}
                  />
                }
                label={
                  <Tooltip title="Include electrostatic Coulomb repulsion barriers in calculations">
                    <Typography>Include Coulomb Barrier</Typography>
                  </Tooltip>
                }
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={localSettings?.lenrPhysics?.includeScreeningEffects || false}
                    onChange={(e) => handleSettingChange('lenrPhysics', 'includeScreeningEffects', e.target.checked)}
                  />
                }
                label={
                  <Tooltip title="Model electron screening effects that reduce barrier height">
                    <Typography>Include Screening Effects</Typography>
                  </Tooltip>
                }
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={localSettings?.lenrPhysics?.includeMagneticEffects || false}
                    onChange={(e) => handleSettingChange('lenrPhysics', 'includeMagneticEffects', e.target.checked)}
                  />
                }
                label={
                  <Tooltip title="Include magnetic interactions in the model (experimental)">
                    <Typography>Include Magnetic Effects</Typography>
                  </Tooltip>
                }
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel id="palladium-isotope-label">Palladium Isotope</InputLabel>
                <Select
                  labelId="palladium-isotope-label"
                  value={localSettings?.lenrPhysics?.palladiumIsotope || "Pd-106"}
                  label="Palladium Isotope"
                  onChange={(e) => handleSettingChange('lenrPhysics', 'palladiumIsotope', e.target.value)}
                >
                  <MenuItem value="Pd-natural">Natural Abundance</MenuItem>
                  <MenuItem value="Pd-104">Pd-104</MenuItem>
                  <MenuItem value="Pd-105">Pd-105</MenuItem>
                  <MenuItem value="Pd-106">Pd-106</MenuItem>
                  <MenuItem value="Pd-108">Pd-108</MenuItem>
                  <MenuItem value="Pd-110">Pd-110</MenuItem>
                </Select>
              </FormControl>
              
              <Box sx={{ mb: 3 }}>
                <Typography gutterBottom>Deuterium Loading Ratio (D/Pd)</Typography>
                <Slider
                  value={localSettings?.lenrPhysics?.deuteriumLoading || 0.85}
                  onChange={(e, newValue) => handleSettingChange('lenrPhysics', 'deuteriumLoading', newValue)}
                  step={0.01}
                  marks={[
                    { value: 0.6, label: '0.6' },
                    { value: 0.8, label: '0.8' },
                    { value: 1.0, label: '1.0' }
                  ]}
                  min={0.6}
                  max={1.0}
                  valueLabelDisplay="auto"
                />
                <Typography variant="caption" color="text.secondary">
                  Higher loading ratios typically increase excess heat production
                </Typography>
              </Box>
              
              <Box sx={{ mb: 3 }}>
                <Typography gutterBottom>Minimum Rydberg Radius (Å)</Typography>
                <Slider
                  value={localSettings?.lenrPhysics?.minRydbergRadius || 10}
                  onChange={(e, newValue) => handleSettingChange('lenrPhysics', 'minRydbergRadius', newValue)}
                  step={1}
                  marks={[
                    { value: 5, label: '5Å' },
                    { value: 35, label: '35Å' }
                  ]}
                  min={5}
                  max={35}
                  valueLabelDisplay="auto"
                />
              </Box>
            </Grid>
            
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={localSettings?.lenrPhysics?.enableFusionEvents || false}
                      onChange={(e) => handleSettingChange('lenrPhysics', 'enableFusionEvents', e.target.checked)}
                    />
                  }
                  label={
                    <Tooltip title="Enable fusion reactions in the simulation">
                      <Typography sx={{ fontWeight: 'bold' }}>Enable Fusion Events</Typography>
                    </Tooltip>
                  }
                />
                
                <FormControl sx={{ minWidth: 200 }}>
                  <InputLabel id="emission-model-label">Emission Model</InputLabel>
                  <Select
                    labelId="emission-model-label"
                    value={localSettings?.lenrPhysics?.emissionModel || "phonon-coupled"}
                    label="Emission Model"
                    onChange={(e) => handleSettingChange('lenrPhysics', 'emissionModel', e.target.value)}
                  >
                    <MenuItem value="direct-gamma">Direct Gamma</MenuItem>
                    <MenuItem value="phonon-coupled">Phonon-Coupled</MenuItem>
                    <MenuItem value="neutron-emission">Neutron Emission</MenuItem>
                    <MenuItem value="transmutation">Transmutation</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              <Alert severity="info" sx={{ mt: 2 }}>
                These physics settings directly affect the simulation results and visualization. Advanced parameters should be adjusted with caution.
              </Alert>
            </Grid>
          </Grid>
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
            <Button 
              variant="outlined"
              color="primary"
              onClick={() => {
                if (localSettings?.lenrPhysics) {
                  updateCategory('lenrPhysics', localSettings.lenrPhysics);
                  setSnackbar({
                    open: true,
                    message: 'LENR physics settings applied',
                    severity: 'success'
                  });
                }
              }}
            >
              Apply Changes
            </Button>
          </Box>
        </TabPanel>
        
        {/* Advanced Settings */}
        <TabPanel value={activeTab} index={4}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={localSettings.advanced.enableDevTools}
                    onChange={(e) => handleSettingChange('advanced', 'enableDevTools', e.target.checked)}
                  />
                }
                label="Enable Developer Tools"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={localSettings.advanced.debugLogging}
                    onChange={(e) => handleSettingChange('advanced', 'debugLogging', e.target.checked)}
                  />
                }
                label="Enable Debug Logging"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={localSettings.advanced.useExperimentalFeatures}
                    onChange={(e) => handleSettingChange('advanced', 'useExperimentalFeatures', e.target.checked)}
                  />
                }
                label="Use Experimental Features"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={localSettings.advanced.allowRemoteDataFetching}
                    onChange={(e) => handleSettingChange('advanced', 'allowRemoteDataFetching', e.target.checked)}
                  />
                }
                label="Allow Remote Data Fetching"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={localSettings.advanced.useGPUAcceleration}
                    onChange={(e) => handleSettingChange('advanced', 'useGPUAcceleration', e.target.checked)}
                  />
                }
                label="Use GPU Acceleration (WebGL)"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={localSettings.advanced.experimentalCollectiveEffects}
                    onChange={(e) => handleSettingChange('advanced', 'experimentalCollectiveEffects', e.target.checked)}
                  />
                }
                label="Enable Collective Quantum Effects"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Maximum Concurrent Calculations"
                type="number"
                inputProps={{ min: 1, max: 16 }}
                value={localSettings.advanced.maxConcurrentCalculations}
                onChange={(e) => handleSettingChange('advanced', 'maxConcurrentCalculations', parseInt(e.target.value, 10))}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Memory Limit (MB)"
                type="number"
                inputProps={{ min: 512, max: 8192 }}
                value={localSettings.advanced.memoryLimit}
                onChange={(e) => handleSettingChange('advanced', 'memoryLimit', parseInt(e.target.value, 10))}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Cache Timeout (minutes)"
                type="number"
                inputProps={{ min: 5, max: 1440 }}
                value={localSettings.advanced.cacheTimeoutMinutes}
                onChange={(e) => handleSettingChange('advanced', 'cacheTimeoutMinutes', parseInt(e.target.value, 10))}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel id="precision-bits-label">Calculation Precision</InputLabel>
                <Select
                  labelId="precision-bits-label"
                  value={localSettings.advanced.precisionBits}
                  label="Calculation Precision"
                  onChange={(e) => handleSettingChange('advanced', 'precisionBits', parseInt(e.target.value, 10))}
                >
                  <MenuItem value={32}>32-bit (Faster)</MenuItem>
                  <MenuItem value={64}>64-bit (Standard)</MenuItem>
                  <MenuItem value={128}>128-bit (High Precision)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Box>
                <Typography gutterBottom>Maximum Lattice Size</Typography>
                <Slider
                  value={localSettings.advanced.maxLatticeSize}
                  onChange={(e, newValue) => handleSettingChange('advanced', 'maxLatticeSize', newValue)}
                  min={3}
                  max={10}
                  step={1}
                  marks={[
                    { value: 3, label: '3' },
                    { value: 5, label: '5' },
                    { value: 10, label: '10' }
                  ]}
                  valueLabelDisplay="auto"
                />
                <Typography variant="caption" color="text.secondary">
                  Larger values require more memory and processing power
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12}>
              <Alert severity="warning">
                Advanced settings may affect application stability and performance. Changes to these settings should be made with caution.
              </Alert>
            </Grid>
          </Grid>
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
            <Button 
              variant="outlined"
              color="primary"
              onClick={() => {
                if (localSettings?.advanced) {
                  updateCategory('advanced', localSettings.advanced);
                  setSnackbar({
                    open: true,
                    message: 'Advanced settings applied',
                    severity: 'success'
                  });
                }
              }}
            >
              Apply Changes
            </Button>
          </Box>
        </TabPanel>

        {/* Add buttons for importing and exporting settings */}
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between' }}>
          <Box>
            <input
              type="file"
              id="settings-import"
              accept=".json"
              style={{ display: 'none' }}
              onChange={importSettings}
            />
            <label htmlFor="settings-import">
              <Button
                variant="outlined"
                color="primary"
                component="span"
              >
                Import Settings
              </Button>
            </label>
            <Button
              variant="outlined"
              color="primary"
              onClick={exportSettings}
              sx={{ ml: 1 }}
            >
              Export Settings
            </Button>
          </Box>
          
          <Box>
            <Button
              variant="outlined"
              color="secondary"
              onClick={resetSettings}
              startIcon={<RestoreIcon />}
              sx={{ mr: 1 }}
            >
              Reset
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={saveSettings}
              startIcon={<SaveIcon />}
              disabled={!hasSettingsChanged()}
            >
              Save Settings
            </Button>
          </Box>
        </Box>
      </Paper>
      
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default SettingsPage; 