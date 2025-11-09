import { useState } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Divider, 
  Switch, 
  FormControlLabel, 
  Slider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
  Button,
  Grid,
  Alert
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import RestoreIcon from '@mui/icons-material/Restore';

/**
 * SettingsPage component for configuring application settings
 */
const SettingsPage = () => {
  const [settings, setSettings] = useState({
    appearance: {
      theme: 'dark',
      density: 'normal',
      animationsEnabled: true
    },
    performance: {
      maxParticles: 5000,
      graphicsQuality: 'medium',
      enableFrameRateLimit: true,
      frameRateLimit: 60
    },
    simulation: {
      defaultTemperature: 300,
      defaultPressure: 1,
      defaultDensity: 1.0,
      autoSaveResults: true,
      autoSaveInterval: 5
    },
    developer: {
      enableDevMode: false,
      verboseLogging: false,
      showPerformanceStats: false,
      experimentalFeatures: false
    }
  });
  
  const [saveStatus, setSaveStatus] = useState(null);
  
  const handleAppearanceChange = (key, value) => {
    setSettings({
      ...settings,
      appearance: {
        ...settings.appearance,
        [key]: value
      }
    });
  };
  
  const handlePerformanceChange = (key, value) => {
    setSettings({
      ...settings,
      performance: {
        ...settings.performance,
        [key]: value
      }
    });
  };
  
  const handleSimulationChange = (key, value) => {
    setSettings({
      ...settings,
      simulation: {
        ...settings.simulation,
        [key]: value
      }
    });
  };
  
  const handleDeveloperChange = (key, value) => {
    setSettings({
      ...settings,
      developer: {
        ...settings.developer,
        [key]: value
      }
    });
  };
  
  const handleSaveSettings = () => {
    // Simulate saving settings
    setSaveStatus('success');
    setTimeout(() => setSaveStatus(null), 3000);
  };
  
  const handleResetDefaults = () => {
    // Reset to default values
    setSettings({
      appearance: {
        theme: 'dark',
        density: 'normal',
        animationsEnabled: true
      },
      performance: {
        maxParticles: 5000,
        graphicsQuality: 'medium',
        enableFrameRateLimit: true,
        frameRateLimit: 60
      },
      simulation: {
        defaultTemperature: 300,
        defaultPressure: 1,
        defaultDensity: 1.0,
        autoSaveResults: true,
        autoSaveInterval: 5
      },
      developer: {
        enableDevMode: false,
        verboseLogging: false,
        showPerformanceStats: false,
        experimentalFeatures: false
      }
    });
    setSaveStatus('reset');
    setTimeout(() => setSaveStatus(null), 3000);
  };
  
  return (
    <Box sx={{ padding: 3 }}>
      <Typography variant="h4" gutterBottom>
        Application Settings
      </Typography>
      <Typography variant="body1" paragraph>
        Configure application settings and preferences.
      </Typography>
      
      {saveStatus === 'success' && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Settings saved successfully
        </Alert>
      )}
      
      {saveStatus === 'reset' && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Settings reset to defaults
        </Alert>
      )}
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Appearance
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel id="theme-select-label">Theme</InputLabel>
              <Select
                labelId="theme-select-label"
                value={settings.appearance.theme}
                label="Theme"
                onChange={(e) => handleAppearanceChange('theme', e.target.value)}
              >
                <MenuItem value="light">Light</MenuItem>
                <MenuItem value="dark">Dark</MenuItem>
                <MenuItem value="system">System Preference</MenuItem>
              </Select>
            </FormControl>
            
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel id="density-select-label">UI Density</InputLabel>
              <Select
                labelId="density-select-label"
                value={settings.appearance.density}
                label="UI Density"
                onChange={(e) => handleAppearanceChange('density', e.target.value)}
              >
                <MenuItem value="compact">Compact</MenuItem>
                <MenuItem value="normal">Normal</MenuItem>
                <MenuItem value="comfortable">Comfortable</MenuItem>
              </Select>
            </FormControl>
            
            <FormControlLabel
              control={
                <Switch
                  checked={settings.appearance.animationsEnabled}
                  onChange={(e) => handleAppearanceChange('animationsEnabled', e.target.checked)}
                />
              }
              label="Enable UI Animations"
            />
          </Paper>
          
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Performance
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            <Box sx={{ mb: 3 }}>
              <Typography gutterBottom>
                Max Particles: {settings.performance.maxParticles}
              </Typography>
              <Slider
                value={settings.performance.maxParticles}
                onChange={(e, value) => handlePerformanceChange('maxParticles', value)}
                min={1000}
                max={20000}
                step={1000}
                marks={[
                  { value: 1000, label: '1K' },
                  { value: 10000, label: '10K' },
                  { value: 20000, label: '20K' }
                ]}
              />
            </Box>
            
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel id="quality-select-label">Graphics Quality</InputLabel>
              <Select
                labelId="quality-select-label"
                value={settings.performance.graphicsQuality}
                label="Graphics Quality"
                onChange={(e) => handlePerformanceChange('graphicsQuality', e.target.value)}
              >
                <MenuItem value="low">Low</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="ultra">Ultra</MenuItem>
              </Select>
            </FormControl>
            
            <FormControlLabel
              control={
                <Switch
                  checked={settings.performance.enableFrameRateLimit}
                  onChange={(e) => handlePerformanceChange('enableFrameRateLimit', e.target.checked)}
                />
              }
              label="Enable Frame Rate Limit"
              sx={{ mb: 2, display: 'block' }}
            />
            
            {settings.performance.enableFrameRateLimit && (
              <Box sx={{ mb: 2 }}>
                <Typography gutterBottom>
                  Frame Rate Limit: {settings.performance.frameRateLimit} FPS
                </Typography>
                <Slider
                  value={settings.performance.frameRateLimit}
                  onChange={(e, value) => handlePerformanceChange('frameRateLimit', value)}
                  min={30}
                  max={144}
                  step={1}
                  marks={[
                    { value: 30, label: '30' },
                    { value: 60, label: '60' },
                    { value: 144, label: '144' }
                  ]}
                />
              </Box>
            )}
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Simulation Defaults
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            <TextField
              label="Default Temperature (K)"
              type="number"
              value={settings.simulation.defaultTemperature}
              onChange={(e) => handleSimulationChange('defaultTemperature', parseFloat(e.target.value))}
              fullWidth
              margin="normal"
              InputLabelProps={{ shrink: true }}
            />
            
            <TextField
              label="Default Pressure (atm)"
              type="number"
              value={settings.simulation.defaultPressure}
              onChange={(e) => handleSimulationChange('defaultPressure', parseFloat(e.target.value))}
              fullWidth
              margin="normal"
              InputLabelProps={{ shrink: true }}
            />
            
            <TextField
              label="Default Density (g/cm³)"
              type="number"
              value={settings.simulation.defaultDensity}
              onChange={(e) => handleSimulationChange('defaultDensity', parseFloat(e.target.value))}
              fullWidth
              margin="normal"
              InputLabelProps={{ shrink: true }}
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={settings.simulation.autoSaveResults}
                  onChange={(e) => handleSimulationChange('autoSaveResults', e.target.checked)}
                />
              }
              label="Auto-Save Simulation Results"
              sx={{ mt: 2, display: 'block' }}
            />
            
            {settings.simulation.autoSaveResults && (
              <TextField
                label="Auto-Save Interval (minutes)"
                type="number"
                value={settings.simulation.autoSaveInterval}
                onChange={(e) => handleSimulationChange('autoSaveInterval', parseInt(e.target.value))}
                fullWidth
                margin="normal"
                InputLabelProps={{ shrink: true }}
                inputProps={{ min: 1, max: 60 }}
              />
            )}
          </Paper>
          
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Developer Options
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            <FormControlLabel
              control={
                <Switch
                  checked={settings.developer.enableDevMode}
                  onChange={(e) => handleDeveloperChange('enableDevMode', e.target.checked)}
                />
              }
              label="Enable Developer Mode"
              sx={{ mb: 1, display: 'block' }}
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={settings.developer.verboseLogging}
                  onChange={(e) => handleDeveloperChange('verboseLogging', e.target.checked)}
                />
              }
              label="Verbose Logging"
              sx={{ mb: 1, display: 'block' }}
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={settings.developer.showPerformanceStats}
                  onChange={(e) => handleDeveloperChange('showPerformanceStats', e.target.checked)}
                />
              }
              label="Show Performance Statistics"
              sx={{ mb: 1, display: 'block' }}
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={settings.developer.experimentalFeatures}
                  onChange={(e) => handleDeveloperChange('experimentalFeatures', e.target.checked)}
                />
              }
              label="Enable Experimental Features"
              sx={{ mb: 1, display: 'block' }}
            />
          </Paper>
        </Grid>
      </Grid>
      
      <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<SaveIcon />}
          onClick={handleSaveSettings}
        >
          Save Settings
        </Button>
        <Button 
          variant="outlined" 
          startIcon={<RestoreIcon />}
          onClick={handleResetDefaults}
        >
          Reset to Defaults
        </Button>
      </Box>
    </Box>
  );
};

export default SettingsPage; 