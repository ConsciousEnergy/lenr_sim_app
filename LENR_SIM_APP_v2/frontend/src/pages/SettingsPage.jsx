import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Tabs,
  Tab,
  Grid,
  Switch,
  FormControlLabel,
  Slider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
  Button,
  Divider,
  Alert,
  AlertTitle,
  Chip,
  Stack,
  Card,
  CardContent,
  IconButton,
  LinearProgress,
  useTheme
} from '@mui/material';
import {
  Palette as PaletteIcon,
  Science as ScienceIcon,
  ThreeDRotation as VisualizationIcon,
  BugReport as DebugIcon,
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
  CloudDone as ConnectedIcon,
  CloudOff as DisconnectedIcon,
  Memory as MemoryIcon,
  Storage as StorageIcon,
} from '@mui/icons-material';
import { useTheme as useAppTheme } from '../contexts/ThemeContext';
import { resolveApiUrl } from '../config/api';

// Tab Panel Component
function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const SettingsPage = () => {
  const _theme = useTheme();
  const { isDarkMode, toggleTheme } = useAppTheme();
  const [activeTab, setActiveTab] = useState(0);
  const [settings, setSettings] = useState({
    appearance: {
      fontSize: 'medium',
      animationsEnabled: true,
      compactMode: false
    },
    physics: {
      precision: 'high',
      defaultTemperature: 300,
      defaultPressure: 1,
      calculationThreads: 4
    },
    visualization: {
      qualityLevel: 'high',
      maxParticles: 5000,
      antialiasing: true,
      showAxes: true,
      showGrid: false
    },
    advanced: {
      apiUrl: '',
      enableDebugMode: false,
      cacheTTL: 3600,
      experimentalFeatures: false
    }
  });
  
  // System status state
  const [systemStatus, setSystemStatus] = useState({
    apiConnected: false,
    webglSupported: false,
    memoryUsage: 0,
    storageUsage: 0
  });
  
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);
  
  // Check system status on mount
  useEffect(() => {
    checkSystemStatus().finally(() => setStatusLoading(false));
    loadSettings();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  const checkSystemStatus = async (apiUrl = null) => {
    // Use provided apiUrl or settings value or default
    const customBase = (apiUrl || settings.advanced?.apiUrl || '').trim();
    const baseUrl = customBase ? customBase.replace(/\/$/, '') : '';
    
    // Check API connection
    try {
      const healthPath = baseUrl ? `${baseUrl}/api/health` : resolveApiUrl('/api/health');
      const response = await fetch(healthPath, { 
        method: 'GET',
        signal: AbortSignal.timeout(3000)
      });
      setSystemStatus(prev => ({ ...prev, apiConnected: response.ok }));
    } catch {
      setSystemStatus(prev => ({ ...prev, apiConnected: false }));
    }
    
    // Check WebGL support
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    setSystemStatus(prev => ({ ...prev, webglSupported: !!gl }));
    
    // Check memory usage (if available)
    if (performance.memory) {
      const used = performance.memory.usedJSHeapSize;
      const total = performance.memory.jsHeapSizeLimit;
      setSystemStatus(prev => ({ ...prev, memoryUsage: Math.round((used / total) * 100) }));
    }
    
    // Check localStorage usage
    let storageUsed = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        storageUsed += localStorage.getItem(key).length * 2; // UTF-16 = 2 bytes per char
      }
    }
    const storageMB = (storageUsed / (1024 * 1024)).toFixed(2);
    setSystemStatus(prev => ({ ...prev, storageUsage: storageMB }));
  };
  
  const loadSettings = () => {
    try {
      const stored = localStorage.getItem('lenr_app_settings');
      if (stored) {
        setSettings(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };
  
  const saveSettings = () => {
    setLoading(true);
    try {
      localStorage.setItem('lenr_app_settings', JSON.stringify(settings));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const resetSettings = () => {
    if (window.confirm('Are you sure you want to reset all settings to defaults?')) {
      const defaults = {
        appearance: {
          fontSize: 'medium',
          animationsEnabled: true,
          compactMode: false
        },
        physics: {
          precision: 'high',
          defaultTemperature: 300,
          defaultPressure: 1,
          calculationThreads: 4
        },
        visualization: {
          qualityLevel: 'high',
          maxParticles: 5000,
          antialiasing: true,
          showAxes: true,
          showGrid: false
        },
        advanced: {
          apiUrl: '',
          enableDebugMode: false,
          cacheTTL: 3600,
          experimentalFeatures: false
        }
      };
      setSettings(defaults);
      localStorage.setItem('lenr_app_settings', JSON.stringify(defaults));
    }
  };
  
  const clearAllData = () => {
    if (window.confirm('This will clear all saved simulations, history, and settings. Are you sure?')) {
      localStorage.clear();
      sessionStorage.clear();
      window.location.reload();
    }
  };
  
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };
  
  const updateSetting = (category, key, value) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }));
  };
  
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 600 }}>
          Settings
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Configure application preferences, physics parameters, and visualization options
        </Typography>
      </Box>
      
      {saveSuccess && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Settings saved successfully!
        </Alert>
      )}
      
      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange} variant="fullWidth">
          <Tab icon={<PaletteIcon />} label="Appearance" />
          <Tab icon={<ScienceIcon />} label="Physics" />
          <Tab icon={<VisualizationIcon />} label="Visualization" />
          <Tab icon={<DebugIcon />} label="Debug & Advanced" />
        </Tabs>
      </Paper>
      
      {/* Appearance Tab */}
      <TabPanel value={activeTab} index={0}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>Appearance Settings</Typography>
          <Divider sx={{ mb: 3 }} />
          
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={isDarkMode}
                    onChange={toggleTheme}
                    color="primary"
                  />
                }
                label="Dark Mode"
              />
              <Typography variant="body2" color="text.secondary" sx={{ ml: 4 }}>
                Toggle between light and dark theme
              </Typography>
            </Grid>
            
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Font Size</InputLabel>
                <Select
                  value={settings.appearance.fontSize}
                  label="Font Size"
                  onChange={(e) => updateSetting('appearance', 'fontSize', e.target.value)}
                >
                  <MenuItem value="small">Small</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="large">Large</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.appearance.animationsEnabled}
                    onChange={(e) => updateSetting('appearance', 'animationsEnabled', e.target.checked)}
                    color="primary"
                  />
                }
                label="Enable Animations"
              />
            </Grid>
            
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.appearance.compactMode}
                    onChange={(e) => updateSetting('appearance', 'compactMode', e.target.checked)}
                    color="primary"
                  />
                }
                label="Compact Mode"
              />
            </Grid>
          </Grid>
        </Paper>
      </TabPanel>
      
      {/* Physics Tab */}
      <TabPanel value={activeTab} index={1}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>Physics Settings</Typography>
          <Divider sx={{ mb: 3 }} />
          
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Calculation Precision</InputLabel>
                <Select
                  value={settings.physics.precision}
                  label="Calculation Precision"
                  onChange={(e) => updateSetting('physics', 'precision', e.target.value)}
                >
                  <MenuItem value="low">Low (Fast)</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="high">High (Accurate)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                type="number"
                label="Default Temperature (K)"
                value={settings.physics.defaultTemperature}
                onChange={(e) => updateSetting('physics', 'defaultTemperature', Number(e.target.value))}
                InputProps={{ inputProps: { min: 0, max: 10000 } }}
              />
            </Grid>
            
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                type="number"
                label="Default Pressure (atm)"
                value={settings.physics.defaultPressure}
                onChange={(e) => updateSetting('physics', 'defaultPressure', Number(e.target.value))}
                InputProps={{ inputProps: { min: 0, max: 1000 } }}
              />
            </Grid>
            
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography gutterBottom>Calculation Threads: {settings.physics.calculationThreads}</Typography>
              <Slider
                value={settings.physics.calculationThreads}
                onChange={(e, v) => updateSetting('physics', 'calculationThreads', v)}
                min={1}
                max={8}
                step={1}
                marks
                valueLabelDisplay="auto"
              />
            </Grid>
          </Grid>
        </Paper>
      </TabPanel>
      
      {/* Visualization Tab */}
      <TabPanel value={activeTab} index={2}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>Visualization Settings</Typography>
          <Divider sx={{ mb: 3 }} />
          
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Quality Level</InputLabel>
                <Select
                  value={settings.visualization.qualityLevel}
                  label="Quality Level"
                  onChange={(e) => updateSetting('visualization', 'qualityLevel', e.target.value)}
                >
                  <MenuItem value="low">Low (Better Performance)</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="high">High (Better Quality)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography gutterBottom>Max Particles: {settings.visualization.maxParticles}</Typography>
              <Slider
                value={settings.visualization.maxParticles}
                onChange={(e, v) => updateSetting('visualization', 'maxParticles', v)}
                min={100}
                max={10000}
                step={100}
                valueLabelDisplay="auto"
              />
              <Typography variant="caption" color="text.secondary">
                Higher values may impact performance
              </Typography>
            </Grid>
            
            <Grid size={{ xs: 12, md: 4 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.visualization.antialiasing}
                    onChange={(e) => updateSetting('visualization', 'antialiasing', e.target.checked)}
                  />
                }
                label="Antialiasing"
              />
            </Grid>
            
            <Grid size={{ xs: 12, md: 4 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.visualization.showAxes}
                    onChange={(e) => updateSetting('visualization', 'showAxes', e.target.checked)}
                  />
                }
                label="Show Axes"
              />
            </Grid>
            
            <Grid size={{ xs: 12, md: 4 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.visualization.showGrid}
                    onChange={(e) => updateSetting('visualization', 'showGrid', e.target.checked)}
                  />
                }
                label="Show Grid"
              />
            </Grid>
          </Grid>
        </Paper>
      </TabPanel>
      
      {/* Debug & Advanced Tab */}
      <TabPanel value={activeTab} index={3}>
        <Grid container spacing={3}>
          {/* System Status */}
          <Grid size={12}>
            <Paper sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">System Status</Typography>
                <IconButton onClick={() => { setStatusLoading(true); checkSystemStatus().finally(() => setStatusLoading(false)); }} size="small">
                  <RefreshIcon />
                </IconButton>
              </Box>
              {statusLoading && <LinearProgress sx={{ mb: 1 }} />}
              <Divider sx={{ mb: 2 }} />
              
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Card variant="outlined">
                    <CardContent sx={{ textAlign: 'center' }}>
                      {systemStatus.apiConnected ? (
                        <ConnectedIcon sx={{ fontSize: 40, color: 'success.main' }} />
                      ) : (
                        <DisconnectedIcon sx={{ fontSize: 40, color: 'error.main' }} />
                      )}
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        API Server
                      </Typography>
                      <Chip 
                        size="small"
                        label={systemStatus.apiConnected ? 'Connected' : 'Disconnected'}
                        color={systemStatus.apiConnected ? 'success' : 'error'}
                        sx={{ mt: 1 }}
                      />
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Card variant="outlined">
                    <CardContent sx={{ textAlign: 'center' }}>
                      <VisualizationIcon sx={{ fontSize: 40, color: systemStatus.webglSupported ? 'success.main' : 'error.main' }} />
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        WebGL
                      </Typography>
                      <Chip 
                        size="small"
                        label={systemStatus.webglSupported ? 'Supported' : 'Not Supported'}
                        color={systemStatus.webglSupported ? 'success' : 'error'}
                        sx={{ mt: 1 }}
                      />
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Card variant="outlined">
                    <CardContent sx={{ textAlign: 'center' }}>
                      <MemoryIcon sx={{ fontSize: 40, color: 'primary.main' }} />
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        Memory Usage
                      </Typography>
                      <Typography variant="h6">
                        {systemStatus.memoryUsage || 'N/A'}%
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Card variant="outlined">
                    <CardContent sx={{ textAlign: 'center' }}>
                      <StorageIcon sx={{ fontSize: 40, color: 'primary.main' }} />
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        Local Storage
                      </Typography>
                      <Typography variant="h6">
                        {systemStatus.storageUsage} MB
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
          
          {/* Advanced Settings */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>Advanced Settings</Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Stack spacing={2}>
                <TextField
                  fullWidth
                  label="API URL"
                  value={settings.advanced.apiUrl}
                  onChange={(e) => updateSetting('advanced', 'apiUrl', e.target.value)}
                  size="small"
                />
                
                <TextField
                  fullWidth
                  type="number"
                  label="Cache TTL (seconds)"
                  value={settings.advanced.cacheTTL}
                  onChange={(e) => updateSetting('advanced', 'cacheTTL', Number(e.target.value))}
                  size="small"
                />
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.advanced.enableDebugMode}
                      onChange={(e) => updateSetting('advanced', 'enableDebugMode', e.target.checked)}
                    />
                  }
                  label="Enable Debug Mode"
                />
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.advanced.experimentalFeatures}
                      onChange={(e) => updateSetting('advanced', 'experimentalFeatures', e.target.checked)}
                    />
                  }
                  label="Enable Experimental Features"
                />
              </Stack>
            </Paper>
          </Grid>
          
          {/* Danger Zone */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper sx={{ p: 3, borderColor: 'error.main', borderWidth: 1, borderStyle: 'solid' }}>
              <Typography variant="h6" color="error" gutterBottom>Danger Zone</Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Stack spacing={2}>
                <Alert severity="warning">
                  <AlertTitle>Caution</AlertTitle>
                  These actions cannot be undone.
                </Alert>
                
                <Button
                  variant="outlined"
                  color="warning"
                  startIcon={<RefreshIcon />}
                  onClick={resetSettings}
                  fullWidth
                >
                  Reset Settings to Defaults
                </Button>
                
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={clearAllData}
                  fullWidth
                >
                  Clear All Data
                </Button>
              </Stack>
            </Paper>
          </Grid>
          
          {/* Quick Links */}
          <Grid size={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>Debug Tools</Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                <Button variant="outlined" href="/visualization-test">
                  Visualization Test
                </Button>
                <Button variant="outlined" href="/diagnostics">
                  Diagnostics
                </Button>
                <Button variant="outlined" href="/three-test">
                  Three.js Test
                </Button>
                <Button variant="outlined" href="/visualization-debug">
                  Visualization Debug
                </Button>
              </Stack>
            </Paper>
          </Grid>
        </Grid>
      </TabPanel>
      
      {/* Save/Reset Buttons */}
      <Paper sx={{ p: 2, mt: 3 }}>
        <Stack direction="row" spacing={2} justifyContent="flex-end">
          <Button variant="outlined" onClick={resetSettings}>
            Reset to Defaults
          </Button>
          <Button 
            variant="contained" 
            onClick={saveSettings}
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Settings'}
          </Button>
        </Stack>
      </Paper>
    </Container>
  );
};

export default SettingsPage;
