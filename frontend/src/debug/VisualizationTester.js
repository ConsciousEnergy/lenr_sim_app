import { useState } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Tabs, 
  Tab, 
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  Switch,
  FormControlLabel
} from '@mui/material';
import LatticeTestFallback from '../visualization/components/LatticeTestFallback';

/**
 * Component for testing various visualization features
 */
const VisualizationTester = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [visualizationSettings, setVisualizationSettings] = useState({
    renderQuality: 'medium',
    particleCount: 500,
    showAxes: true,
    showLegend: true,
    animationSpeed: 1.0
  });
  
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };
  
  const handleSettingChange = (setting, value) => {
    setVisualizationSettings({
      ...visualizationSettings,
      [setting]: value
    });
  };
  
  const handleSliderChange = (setting) => (event, newValue) => {
    handleSettingChange(setting, newValue);
  };
  
  const handleSwitchChange = (setting) => (event) => {
    handleSettingChange(setting, event.target.checked);
  };
  
  const handleSelectChange = (setting) => (event) => {
    handleSettingChange(setting, event.target.value);
  };
  
  return (
    <Box sx={{ padding: 3 }}>
      <Typography variant="h4" gutterBottom>
        Visualization Test Environment
      </Typography>
      <Typography variant="body1" paragraph>
        Test and debug various visualization features.
      </Typography>
      
      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange} centered>
          <Tab label="Lattice Visualization" />
          <Tab label="Energy Plots" />
          <Tab label="Particle Simulation" />
        </Tabs>
      </Paper>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={3}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Visualization Settings
            </Typography>
            
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel id="render-quality-label">Render Quality</InputLabel>
              <Select
                labelId="render-quality-label"
                value={visualizationSettings.renderQuality}
                label="Render Quality"
                onChange={handleSelectChange('renderQuality')}
              >
                <MenuItem value="low">Low</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="ultra">Ultra</MenuItem>
              </Select>
            </FormControl>
            
            <Box sx={{ mb: 3 }}>
              <Typography gutterBottom>
                Particle Count: {visualizationSettings.particleCount}
              </Typography>
              <Slider
                value={visualizationSettings.particleCount}
                onChange={handleSliderChange('particleCount')}
                min={100}
                max={2000}
                step={100}
              />
            </Box>
            
            <Box sx={{ mb: 3 }}>
              <Typography gutterBottom>
                Animation Speed: {visualizationSettings.animationSpeed}x
              </Typography>
              <Slider
                value={visualizationSettings.animationSpeed}
                onChange={handleSliderChange('animationSpeed')}
                min={0.1}
                max={3}
                step={0.1}
                marks={[
                  { value: 0.1, label: '0.1x' },
                  { value: 1, label: '1x' },
                  { value: 3, label: '3x' }
                ]}
              />
            </Box>
            
            <FormControlLabel
              control={
                <Switch
                  checked={visualizationSettings.showAxes}
                  onChange={handleSwitchChange('showAxes')}
                />
              }
              label="Show Axes"
              sx={{ mb: 1, display: 'block' }}
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={visualizationSettings.showLegend}
                  onChange={handleSwitchChange('showLegend')}
                />
              }
              label="Show Legend"
              sx={{ mb: 1, display: 'block' }}
            />
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={9}>
          <Paper 
            elevation={3} 
            sx={{ 
              height: 600, 
              overflow: 'hidden',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              p: 2
            }}
          >
            {activeTab === 0 && (
              <Box sx={{ width: '100%', height: '100%' }}>
                <LatticeTestFallback />
              </Box>
            )}
            
            {activeTab === 1 && (
              <Box sx={{ textAlign: 'center' }}>
                <Typography>Energy Plots Visualization - Coming Soon</Typography>
              </Box>
            )}
            
            {activeTab === 2 && (
              <Box sx={{ textAlign: 'center' }}>
                <Typography>Particle Simulation - Coming Soon</Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default VisualizationTester; 