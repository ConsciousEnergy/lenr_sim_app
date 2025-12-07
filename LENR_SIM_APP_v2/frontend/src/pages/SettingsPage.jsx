import React, { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  Paper,
  Grid,
  Tabs,
  Tab,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
  Slider,
  Button,
  Divider,
  Alert,
  Snackbar,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Collapse
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import RestoreIcon from '@mui/icons-material/Restore';
import DownloadIcon from '@mui/icons-material/Download';
import UploadIcon from '@mui/icons-material/Upload';
import BugReportIcon from '@mui/icons-material/BugReport';
import SpeedIcon from '@mui/icons-material/Speed';
import PaletteIcon from '@mui/icons-material/Palette';
import ScienceIcon from '@mui/icons-material/Science';
import View3DIcon from '@mui/icons-material/ViewInAr';
import CodeIcon from '@mui/icons-material/Code';
import StorageIcon from '@mui/icons-material/Storage';
import DeleteIcon from '@mui/icons-material/Delete';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useTheme } from '@mui/material/styles';

// Tab panel component
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
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState(0);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertSeverity, setAlertSeverity] = useState('success');
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  
  // Settings state
  const [settings, setSettings] = useState({
    appearance: {
      theme: 'system',
      density: 'normal',
      fontSize: 'medium',
      animationsEnabled: true,
      reducedMotion: false
    },
    physics: {
      precision: 'high',
      defaultTemperature: 300,
      defaultPressure: 101325,
      defaultLoadingRatio: 0.85,
      useSIUnits: true,
      showUncertainties: true
    },
    visualization: {
      qualityLevel: 'high',
      maxParticles: 5000,
      colorScheme: 'scientific',
      showAxes: true,
      showGrid: false,
      antialiasing: true,
      shadows: false
    },
    performance: {
      enableFrameRateLimit: true,
      frameRateLimit: 60,
      enableGPUAcceleration: true,
      cacheResults: true,
      cacheTTL: 3600
    },
    developer: {
      enableDevMode: false,
      verboseLogging: false,
      showPerformanceStats: false,
      experimentalFeatures: false,
      apiUrl: 'http://localhost:8000',
      wsUrl: 'ws://localhost:8000'
    }
  });
  
  // System diagnostics state
  const [diagnostics, setDiagnostics] = useState({
    apiStatus: 'unknown',
    wsStatus: 'unknown',
    gpuInfo: 'unknown',
    memoryUsage: 'unknown',
    storageUsed: 'unknown'
  });
  
  // Load settings from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('appSettings');
      if (stored) {
        const parsed = JSON.parse(stored);
        setSettings(prev => ({
          ...prev,
          ...parsed,
          appearance: { ...prev.appearance, ...parsed.appearance },
          physics: { ...prev.physics, ...parsed.physics },
          visualization: { ...prev.visualization, ...parsed.visualization },
          performance: { ...prev.performance, ...parsed.performance },
          developer: { ...prev.developer, ...parsed.developer }
        }));
      }
    } catch (e) {
      console.error('Failed to load settings:', e);
    }
  }, []);
  
  // Run diagnostics
  const runDiagnostics = async () => {
    // Check API status
    try {
      const response = await fetch(`${settings.developer.apiUrl}/api/health`);
      setDiagnostics(prev => ({
        ...prev,
        apiStatus: response.ok ? 'connected' : 'error'
      }));
    } catch (e) {
      setDiagnostics(prev => ({ ...prev, apiStatus: 'disconnected' }));
    }
    
    // Check GPU info
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (gl) {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
          setDiagnostics(prev => ({ ...prev, gpuInfo: renderer }));
        } else {
          setDiagnostics(prev => ({ ...prev, gpuInfo: 'WebGL supported' }));
        }
      } else {
        setDiagnostics(prev => ({ ...prev, gpuInfo: 'WebGL not supported' }));
      }
    } catch (e) {
      setDiagnostics(prev => ({ ...prev, gpuInfo: 'Error detecting GPU' }));
    }
    
    // Check memory usage
    if (performance && performance.memory) {
      const usedMB = Math.round(performance.memory.usedJSHeapSize / (1024 * 1024));
      const totalMB = Math.round(performance.memory.totalJSHeapSize / (1024 * 1024));
      setDiagnostics(prev => ({ 
        ...prev, 
        memoryUsage: `${usedMB} MB / ${totalMB} MB`
      }));
    } else {
      setDiagnostics(prev => ({ ...prev, memoryUsage: 'Not available' }));
    }
    
    // Check localStorage usage
    try {
      let total = 0;
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          total += localStorage[key].length * 2; // UTF-16 = 2 bytes per char
        }
      }
      const usedKB = (total / 1024).toFixed(2);
      setDiagnostics(prev => ({ ...prev, storageUsed: `${usedKB} KB` }));
    } catch (e) {
      setDiagnostics(prev => ({ ...prev, storageUsed: 'Error' }));
    }
  };
  
  // Run diagnostics on mount
  useEffect(() => {
    runDiagnostics();
  }, [settings.developer.apiUrl]);
  
  // Handle settings change
  const handleSettingChange = (category, key, value) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }));
  };
  
  // Save settings
  const handleSaveSettings = () => {
    try {
      localStorage.setItem('appSettings', JSON.stringify(settings));
      showAlert('Settings saved successfully', 'success');
    } catch (e) {
      showAlert('Failed to save settings', 'error');
    }
  };
  
  // Reset settings
  const handleResetSettings = () => {
    const defaultSettings = {
      appearance: {
        theme: 'system',
        density: 'normal',
        fontSize: 'medium',
        animationsEnabled: true,
        reducedMotion: false
      },
      physics: {
        precision: 'high',
        defaultTemperature: 300,
        defaultPressure: 101325,
        defaultLoadingRatio: 0.85,
        useSIUnits: true,
        showUncertainties: true
      },
      visualization: {
        qualityLevel: 'high',
        maxParticles: 5000,
        colorScheme: 'scientific',
        showAxes: true,
        showGrid: false,
        antialiasing: true,
        shadows: false
      },
      performance: {
        enableFrameRateLimit: true,
        frameRateLimit: 60,
        enableGPUAcceleration: true,
        cacheResults: true,
        cacheTTL: 3600
      },
      developer: {
        enableDevMode: false,
        verboseLogging: false,
        showPerformanceStats: false,
        experimentalFeatures: false,
        apiUrl: 'http://localhost:8000',
        wsUrl: 'ws://localhost:8000'
      }
    };
    
    setSettings(defaultSettings);
    localStorage.removeItem('appSettings');
    showAlert('Settings reset to defaults', 'info');
  };
  
  // Export settings
  const handleExportSettings = () => {
    const data = JSON.stringify(settings, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lenr-settings-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showAlert('Settings exported', 'success');
  };
  
  // Import settings
  const handleImportSettings = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target.result);
        setSettings(prev => ({
          ...prev,
          ...imported
        }));
        showAlert('Settings imported successfully', 'success');
      } catch (err) {
        showAlert('Invalid settings file', 'error');
      }
    };
    reader.readAsText(file);
  };
  
  // Clear all data
  const handleClearAllData = () => {
    if (window.confirm('Are you sure you want to clear all application data? This cannot be undone.')) {
      localStorage.clear();
      showAlert('All data cleared', 'warning');
      setTimeout(() => window.location.reload(), 1000);
    }
  };
  
  // Show alert helper
  const showAlert = (message, severity = 'success') => {
    setAlertMessage(message);
    setAlertSeverity(severity);
    setAlertOpen(true);
  };
  
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Settings
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Configure application preferences and behavior
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<RestoreIcon />}
            onClick={handleResetSettings}
          >
            Reset
          </Button>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSaveSettings}
          >
            Save Changes
          </Button>
        </Box>
      </Box>
      
      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab icon={<PaletteIcon />} label="Appearance" />
          <Tab icon={<ScienceIcon />} label="Physics" />
          <Tab icon={<View3DIcon />} label="Visualization" />
          <Tab icon={<SpeedIcon />} label="Performance" />
          <Tab icon={<CodeIcon />} label="Developer" />
        </Tabs>
      </Paper>
      
      {/* Appearance Tab */}
      <TabPanel value={activeTab} index={0}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Theme Settings
              </Typography>
              <Divider sx={{ mb: 3 }} />
              
              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>Theme Mode</InputLabel>
                <Select
                  value={settings.appearance.theme}
                  label="Theme Mode"
                  onChange={(e) => handleSettingChange('appearance', 'theme', e.target.value)}
                >
                  <MenuItem value="light">Light</MenuItem>
                  <MenuItem value="dark">Dark</MenuItem>
                  <MenuItem value="system">System Preference</MenuItem>
                </Select>
              </FormControl>
              
              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>UI Density</InputLabel>
                <Select
                  value={settings.appearance.density}
                  label="UI Density"
                  onChange={(e) => handleSettingChange('appearance', 'density', e.target.value)}
                >
                  <MenuItem value="compact">Compact</MenuItem>
                  <MenuItem value="normal">Normal</MenuItem>
                  <MenuItem value="comfortable">Comfortable</MenuItem>
                </Select>
              </FormControl>
              
              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>Font Size</InputLabel>
                <Select
                  value={settings.appearance.fontSize}
                  label="Font Size"
                  onChange={(e) => handleSettingChange('appearance', 'fontSize', e.target.value)}
                >
                  <MenuItem value="small">Small</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="large">Large</MenuItem>
                </Select>
              </FormControl>
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Animation Settings
              </Typography>
              <Divider sx={{ mb: 3 }} />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.appearance.animationsEnabled}
                    onChange={(e) => handleSettingChange('appearance', 'animationsEnabled', e.target.checked)}
                  />
                }
                label="Enable UI Animations"
                sx={{ mb: 2, display: 'block' }}
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.appearance.reducedMotion}
                    onChange={(e) => handleSettingChange('appearance', 'reducedMotion', e.target.checked)}
                  />
                }
                label="Reduced Motion (Accessibility)"
                sx={{ mb: 2, display: 'block' }}
              />
            </Paper>
          </Grid>
        </Grid>
      </TabPanel>
      
      {/* Physics Tab */}
      <TabPanel value={activeTab} index={1}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Simulation Defaults
              </Typography>
              <Divider sx={{ mb: 3 }} />
              
              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>Calculation Precision</InputLabel>
                <Select
                  value={settings.physics.precision}
                  label="Calculation Precision"
                  onChange={(e) => handleSettingChange('physics', 'precision', e.target.value)}
                >
                  <MenuItem value="low">Low (Faster)</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="high">High (More Accurate)</MenuItem>
                </Select>
              </FormControl>
              
              <TextField
                fullWidth
                label="Default Temperature (K)"
                type="number"
                value={settings.physics.defaultTemperature}
                onChange={(e) => handleSettingChange('physics', 'defaultTemperature', parseFloat(e.target.value))}
                sx={{ mb: 3 }}
                InputLabelProps={{ shrink: true }}
              />
              
              <TextField
                fullWidth
                label="Default Pressure (Pa)"
                type="number"
                value={settings.physics.defaultPressure}
                onChange={(e) => handleSettingChange('physics', 'defaultPressure', parseFloat(e.target.value))}
                sx={{ mb: 3 }}
                InputLabelProps={{ shrink: true }}
              />
              
              <TextField
                fullWidth
                label="Default Loading Ratio"
                type="number"
                inputProps={{ step: 0.01, min: 0, max: 1 }}
                value={settings.physics.defaultLoadingRatio}
                onChange={(e) => handleSettingChange('physics', 'defaultLoadingRatio', parseFloat(e.target.value))}
                InputLabelProps={{ shrink: true }}
              />
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Display Options
              </Typography>
              <Divider sx={{ mb: 3 }} />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.physics.useSIUnits}
                    onChange={(e) => handleSettingChange('physics', 'useSIUnits', e.target.checked)}
                  />
                }
                label="Use SI Units"
                sx={{ mb: 2, display: 'block' }}
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.physics.showUncertainties}
                    onChange={(e) => handleSettingChange('physics', 'showUncertainties', e.target.checked)}
                  />
                }
                label="Show Measurement Uncertainties"
                sx={{ mb: 2, display: 'block' }}
              />
            </Paper>
          </Grid>
        </Grid>
      </TabPanel>
      
      {/* Visualization Tab */}
      <TabPanel value={activeTab} index={2}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                3D Rendering
              </Typography>
              <Divider sx={{ mb: 3 }} />
              
              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>Quality Level</InputLabel>
                <Select
                  value={settings.visualization.qualityLevel}
                  label="Quality Level"
                  onChange={(e) => handleSettingChange('visualization', 'qualityLevel', e.target.value)}
                >
                  <MenuItem value="low">Low (Better Performance)</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                  <MenuItem value="ultra">Ultra (Best Quality)</MenuItem>
                </Select>
              </FormControl>
              
              <Box sx={{ mb: 3 }}>
                <Typography gutterBottom>
                  Maximum Particles: {settings.visualization.maxParticles.toLocaleString()}
                </Typography>
                <Slider
                  value={settings.visualization.maxParticles}
                  onChange={(e, v) => handleSettingChange('visualization', 'maxParticles', v)}
                  min={1000}
                  max={20000}
                  step={1000}
                  marks={[
                    { value: 1000, label: '' },
                    { value: 10000, label: '' },
                    { value: 20000, label: '' }
                  ]}
                />
                <Typography variant="caption" color="text.secondary">
                  Higher values may impact performance
                </Typography>
              </Box>
              
              <FormControl fullWidth>
                <InputLabel>Color Scheme</InputLabel>
                <Select
                  value={settings.visualization.colorScheme}
                  label="Color Scheme"
                  onChange={(e) => handleSettingChange('visualization', 'colorScheme', e.target.value)}
                >
                  <MenuItem value="scientific">Scientific</MenuItem>
                  <MenuItem value="spectral">Spectral</MenuItem>
                  <MenuItem value="thermal">Thermal</MenuItem>
                  <MenuItem value="grayscale">Grayscale</MenuItem>
                </Select>
              </FormControl>
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Display Options
              </Typography>
              <Divider sx={{ mb: 3 }} />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.visualization.showAxes}
                    onChange={(e) => handleSettingChange('visualization', 'showAxes', e.target.checked)}
                  />
                }
                label="Show Coordinate Axes"
                sx={{ mb: 2, display: 'block' }}
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.visualization.showGrid}
                    onChange={(e) => handleSettingChange('visualization', 'showGrid', e.target.checked)}
                  />
                }
                label="Show Grid"
                sx={{ mb: 2, display: 'block' }}
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.visualization.antialiasing}
                    onChange={(e) => handleSettingChange('visualization', 'antialiasing', e.target.checked)}
                  />
                }
                label="Antialiasing"
                sx={{ mb: 2, display: 'block' }}
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.visualization.shadows}
                    onChange={(e) => handleSettingChange('visualization', 'shadows', e.target.checked)}
                  />
                }
                label="Enable Shadows"
                sx={{ mb: 2, display: 'block' }}
              />
            </Paper>
          </Grid>
        </Grid>
      </TabPanel>
      
      {/* Performance Tab */}
      <TabPanel value={activeTab} index={3}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Rendering Performance
              </Typography>
              <Divider sx={{ mb: 3 }} />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.performance.enableFrameRateLimit}
                    onChange={(e) => handleSettingChange('performance', 'enableFrameRateLimit', e.target.checked)}
                  />
                }
                label="Enable Frame Rate Limit"
                sx={{ mb: 2, display: 'block' }}
              />
              
              {settings.performance.enableFrameRateLimit && (
                <Box sx={{ mb: 3 }}>
                  <Typography gutterBottom>
                    Frame Rate Limit: {settings.performance.frameRateLimit} FPS
                  </Typography>
                  <Slider
                    value={settings.performance.frameRateLimit}
                    onChange={(e, v) => handleSettingChange('performance', 'frameRateLimit', v)}
                    min={30}
                    max={144}
                    marks={[
                      { value: 30, label: '' },
                      { value: 60, label: '' },
                      { value: 144, label: '' }
                    ]}
                  />
                </Box>
              )}
              
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.performance.enableGPUAcceleration}
                    onChange={(e) => handleSettingChange('performance', 'enableGPUAcceleration', e.target.checked)}
                  />
                }
                label="GPU Acceleration"
                sx={{ mb: 2, display: 'block' }}
              />
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Caching
              </Typography>
              <Divider sx={{ mb: 3 }} />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.performance.cacheResults}
                    onChange={(e) => handleSettingChange('performance', 'cacheResults', e.target.checked)}
                  />
                }
                label="Cache Simulation Results"
                sx={{ mb: 2, display: 'block' }}
              />
              
              {settings.performance.cacheResults && (
                <TextField
                  fullWidth
                  label="Cache TTL (seconds)"
                  type="number"
                  value={settings.performance.cacheTTL}
                  onChange={(e) => handleSettingChange('performance', 'cacheTTL', parseInt(e.target.value))}
                  InputLabelProps={{ shrink: true }}
                />
              )}
            </Paper>
          </Grid>
        </Grid>
      </TabPanel>
      
      {/* Developer Tab */}
      <TabPanel value={activeTab} index={4}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Developer Options
              </Typography>
              <Divider sx={{ mb: 3 }} />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.developer.enableDevMode}
                    onChange={(e) => handleSettingChange('developer', 'enableDevMode', e.target.checked)}
                  />
                }
                label="Enable Developer Mode"
                sx={{ mb: 2, display: 'block' }}
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.developer.verboseLogging}
                    onChange={(e) => handleSettingChange('developer', 'verboseLogging', e.target.checked)}
                  />
                }
                label="Verbose Logging"
                sx={{ mb: 2, display: 'block' }}
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.developer.showPerformanceStats}
                    onChange={(e) => handleSettingChange('developer', 'showPerformanceStats', e.target.checked)}
                  />
                }
                label="Show Performance Stats"
                sx={{ mb: 2, display: 'block' }}
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.developer.experimentalFeatures}
                    onChange={(e) => handleSettingChange('developer', 'experimentalFeatures', e.target.checked)}
                  />
                }
                label="Enable Experimental Features"
                sx={{ mb: 2, display: 'block' }}
              />
              
              <Divider sx={{ my: 3 }} />
              
              <TextField
                fullWidth
                label="API URL"
                value={settings.developer.apiUrl}
                onChange={(e) => handleSettingChange('developer', 'apiUrl', e.target.value)}
                sx={{ mb: 2 }}
                InputLabelProps={{ shrink: true }}
              />
              
              <TextField
                fullWidth
                label="WebSocket URL"
                value={settings.developer.wsUrl}
                onChange={(e) => handleSettingChange('developer', 'wsUrl', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  System Diagnostics
                </Typography>
                <IconButton onClick={runDiagnostics} size="small">
                  <RefreshIcon />
                </IconButton>
              </Box>
              <Divider sx={{ mb: 3 }} />
              
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    {diagnostics.apiStatus === 'connected' ? 
                      <CheckCircleIcon color="success" /> : 
                      <ErrorIcon color="error" />
                    }
                  </ListItemIcon>
                  <ListItemText 
                    primary="API Connection"
                    secondary={diagnostics.apiStatus}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <View3DIcon />
                  </ListItemIcon>
                  <ListItemText 
                    primary="GPU"
                    secondary={diagnostics.gpuInfo}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <SpeedIcon />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Memory Usage"
                    secondary={diagnostics.memoryUsage}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <StorageIcon />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Local Storage"
                    secondary={diagnostics.storageUsed}
                  />
                </ListItem>
              </List>
            </Paper>
            
            <Paper sx={{ p: 3, mt: 3 }}>
              <Typography variant="h6" gutterBottom>
                Data Management
              </Typography>
              <Divider sx={{ mb: 3 }} />
              
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Button
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  onClick={handleExportSettings}
                >
                  Export Settings
                </Button>
                
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<UploadIcon />}
                >
                  Import Settings
                  <input
                    type="file"
                    accept=".json"
                    hidden
                    onChange={handleImportSettings}
                  />
                </Button>
              </Box>
              
              <Divider sx={{ my: 3 }} />
              
              <Button
                variant="outlined"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={handleClearAllData}
              >
                Clear All Data
              </Button>
              <Typography variant="caption" display="block" sx={{ mt: 1 }} color="text.secondary">
                This will clear all saved simulations, settings, and cached data.
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </TabPanel>
      
      {/* Alert Snackbar */}
      <Snackbar
        open={alertOpen}
        autoHideDuration={4000}
        onClose={() => setAlertOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={() => setAlertOpen(false)} 
          severity={alertSeverity}
          sx={{ width: '100%' }}
        >
          {alertMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default SettingsPage;
