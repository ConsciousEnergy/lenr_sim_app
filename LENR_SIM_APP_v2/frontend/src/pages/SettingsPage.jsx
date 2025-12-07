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
  TextField,
  Button,
  Divider,
  Card,
  CardContent,
  Chip,
  Alert,
  AlertTitle,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Tooltip,
  LinearProgress
} from '@mui/material';
import {
  Palette as PaletteIcon,
  Science as ScienceIcon,
  ThreeDRotation as ThreeDIcon,
  BugReport as BugReportIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
  Storage as StorageIcon,
  Memory as MemoryIcon,
  Speed as SpeedIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { Link } from 'react-router-dom';

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
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState(0);
  const [saveMessage, setSaveMessage] = useState(null);
  
  // Settings state
  const [settings, setSettings] = useState({
    appearance: {
      fontSize: 'medium',
      animationsEnabled: true,
      compactMode: false
    },
    physics: {
      precision: 'high',
      defaultTemperature: 300,
      defaultPressure: 101325,
      defaultLoadingRatio: 0.85,
      autoSaveResults: true
    },
    visualization: {
      qualityLevel: 'high',
      maxParticles: 5000,
      antialiasing: true,
      shadows: false
    },
    advanced: {
      apiUrl: 'http://localhost:8000',
      enableDebugMode: false,
      cacheTTL: 3600,
      experimentalFeatures: false
    }
  });
  
  // Debug/Diagnostics state
  const [diagnostics, setDiagnostics] = useState({
    apiStatus: 'checking',
    webglSupport: 'unknown',
    memoryUsage: 0,
    storageUsed: 0
  });
  
  // Load settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem('lenr_app_settings');
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings));
      } catch (e) {
        console.error('Failed to load settings:', e);
      }
    }
    
    // Run diagnostics
    runDiagnostics();
  }, []);
  
  // Run diagnostics checks
  const runDiagnostics = async () => {
    // Check API status
    setDiagnostics(prev => ({ ...prev, apiStatus: 'checking' }));
    try {
      const response = await fetch(`${settings.advanced.apiUrl}/health`, { 
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });
      setDiagnostics(prev => ({ 
        ...prev, 
        apiStatus: response.ok ? 'connected' : 'error' 
      }));
    } catch (error) {
      setDiagnostics(prev => ({ ...prev, apiStatus: 'disconnected' }));
    }
    
    // Check WebGL support
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      setDiagnostics(prev => ({ 
        ...prev, 
        webglSupport: gl ? 'supported' : 'unsupported' 
      }));
    } catch (error) {
      setDiagnostics(prev => ({ ...prev, webglSupport: 'error' }));
    }
    
    // Check memory usage (approximate)
    if (performance && performance.memory) {
      const memoryMB = Math.round(performance.memory.usedJSHeapSize / (1024 * 1024));
      setDiagnostics(prev => ({ ...prev, memoryUsage: memoryMB }));
    }
    
    // Check localStorage usage
    try {
      let total = 0;
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          total += localStorage.getItem(key).length * 2; // UTF-16 = 2 bytes per char
        }
      }
      setDiagnostics(prev => ({ ...prev, storageUsed: Math.round(total / 1024) }));
    } catch (error) {
      console.error('Failed to calculate storage:', error);
    }
  };
  
  // Update a setting
  const updateSetting = (section, key, value) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }));
  };
  
  // Save settings
  const handleSaveSettings = () => {
    try {
      localStorage.setItem('lenr_app_settings', JSON.stringify(settings));
      setSaveMessage({ type: 'success', text: 'Settings saved successfully!' });
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      setSaveMessage({ type: 'error', text: 'Failed to save settings.' });
    }
  };
  
  // Reset settings to defaults
  const handleResetSettings = () => {
    if (window.confirm('Are you sure you want to reset all settings to defaults?')) {
      const defaultSettings = {
        appearance: {
          fontSize: 'medium',
          animationsEnabled: true,
          compactMode: false
        },
        physics: {
          precision: 'high',
          defaultTemperature: 300,
          defaultPressure: 101325,
          defaultLoadingRatio: 0.85,
          autoSaveResults: true
        },
        visualization: {
          qualityLevel: 'high',
          maxParticles: 5000,
          antialiasing: true,
          shadows: false
        },
        advanced: {
          apiUrl: 'http://localhost:8000',
          enableDebugMode: false,
          cacheTTL: 3600,
          experimentalFeatures: false
        }
      };
      setSettings(defaultSettings);
      localStorage.setItem('lenr_app_settings', JSON.stringify(defaultSettings));
      setSaveMessage({ type: 'success', text: 'Settings reset to defaults!' });
      setTimeout(() => setSaveMessage(null), 3000);
    }
  };
  
  // Clear all cache and stored data
  const handleClearCache = () => {
    if (window.confirm('This will clear all cached data and simulation history. Continue?')) {
      localStorage.removeItem('lenr_simulation_history');
      localStorage.removeItem('lenr_cached_results');
      setSaveMessage({ type: 'success', text: 'Cache cleared successfully!' });
      runDiagnostics(); // Refresh storage stats
      setTimeout(() => setSaveMessage(null), 3000);
    }
  };
  
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };
  
  // Status indicator component
  const StatusIndicator = ({ status, labels }) => {
    const statusConfig = {
      connected: { color: 'success', icon: <CheckCircleIcon />, label: labels?.connected || 'Connected' },
      checking: { color: 'warning', icon: <RefreshIcon className="spin" />, label: labels?.checking || 'Checking...' },
      disconnected: { color: 'error', icon: <ErrorIcon />, label: labels?.disconnected || 'Disconnected' },
      error: { color: 'error', icon: <ErrorIcon />, label: labels?.error || 'Error' },
      supported: { color: 'success', icon: <CheckCircleIcon />, label: labels?.supported || 'Supported' },
      unsupported: { color: 'error', icon: <WarningIcon />, label: labels?.unsupported || 'Not Supported' },
      unknown: { color: 'default', icon: <InfoIcon />, label: labels?.unknown || 'Unknown' }
    };
    
    const config = statusConfig[status] || statusConfig.unknown;
    
    return (
      <Chip 
        icon={config.icon} 
        label={config.label} 
        color={config.color} 
        size="small" 
        variant="outlined"
      />
    );
  };
  
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 600 }}>
            Settings
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Configure application preferences and view system diagnostics
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" onClick={handleResetSettings}>
            Reset Defaults
          </Button>
          <Button variant="contained" onClick={handleSaveSettings}>
            Save Changes
          </Button>
        </Box>
      </Box>
      
      {/* Save message alert */}
      {saveMessage && (
        <Alert severity={saveMessage.type} sx={{ mb: 3 }} onClose={() => setSaveMessage(null)}>
          {saveMessage.text}
        </Alert>
      )}
      
      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab icon={<PaletteIcon />} label="Appearance" iconPosition="start" />
          <Tab icon={<ScienceIcon />} label="Physics" iconPosition="start" />
          <Tab icon={<ThreeDIcon />} label="Visualization" iconPosition="start" />
          <Tab icon={<BugReportIcon />} label="Debug" iconPosition="start" />
        </Tabs>
      </Paper>
      
      {/* Appearance Tab */}
      <TabPanel value={activeTab} index={0}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>Appearance Settings</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Customize the look and feel of the application.
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Font Size</InputLabel>
                <Select
                  value={settings.appearance.fontSize}
                  onChange={(e) => updateSetting('appearance', 'fontSize', e.target.value)}
                  label="Font Size"
                >
                  <MenuItem value="small">Small</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="large">Large</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.appearance.animationsEnabled}
                    onChange={(e) => updateSetting('appearance', 'animationsEnabled', e.target.checked)}
                  />
                }
                label="Enable animations"
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.appearance.compactMode}
                    onChange={(e) => updateSetting('appearance', 'compactMode', e.target.checked)}
                  />
                }
                label="Compact mode"
              />
            </Grid>
          </Grid>
        </Paper>
      </TabPanel>
      
      {/* Physics Tab */}
      <TabPanel value={activeTab} index={1}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>Physics Settings</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Configure default physics simulation parameters.
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Calculation Precision</InputLabel>
                <Select
                  value={settings.physics.precision}
                  onChange={(e) => updateSetting('physics', 'precision', e.target.value)}
                  label="Calculation Precision"
                >
                  <MenuItem value="low">Low (Faster)</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="high">High (More Accurate)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="Default Temperature (K)"
                value={settings.physics.defaultTemperature}
                onChange={(e) => updateSetting('physics', 'defaultTemperature', parseFloat(e.target.value))}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="Default Pressure (Pa)"
                value={settings.physics.defaultPressure}
                onChange={(e) => updateSetting('physics', 'defaultPressure', parseFloat(e.target.value))}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Typography gutterBottom>Default Loading Ratio</Typography>
              <Slider
                value={settings.physics.defaultLoadingRatio}
                onChange={(e, v) => updateSetting('physics', 'defaultLoadingRatio', v)}
                min={0}
                max={1}
                step={0.01}
                valueLabelDisplay="auto"
                marks={[
                  { value: 0, label: '0' },
                  { value: 1, label: '1' }
                ]}
              />
            </Grid>
            
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.physics.autoSaveResults}
                    onChange={(e) => updateSetting('physics', 'autoSaveResults', e.target.checked)}
                  />
                }
                label="Auto-save simulation results"
              />
            </Grid>
          </Grid>
        </Paper>
      </TabPanel>
      
      {/* Visualization Tab */}
      <TabPanel value={activeTab} index={2}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>Visualization Settings</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Configure 3D visualization and rendering options.
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Quality Level</InputLabel>
                <Select
                  value={settings.visualization.qualityLevel}
                  onChange={(e) => updateSetting('visualization', 'qualityLevel', e.target.value)}
                  label="Quality Level"
                >
                  <MenuItem value="low">Low (Better Performance)</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="high">High (Better Quality)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Typography gutterBottom>Maximum Particles: {settings.visualization.maxParticles}</Typography>
              <Slider
                value={settings.visualization.maxParticles}
                onChange={(e, v) => updateSetting('visualization', 'maxParticles', v)}
                min={1000}
                max={20000}
                step={1000}
                valueLabelDisplay="auto"
                marks={[
                  { value: 1000, label: '1k' },
                  { value: 20000, label: '20k' }
                ]}
              />
              <Typography variant="caption" color="text.secondary">
                Higher values may impact performance
              </Typography>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.visualization.antialiasing}
                    onChange={(e) => updateSetting('visualization', 'antialiasing', e.target.checked)}
                  />
                }
                label="Enable antialiasing"
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.visualization.shadows}
                    onChange={(e) => updateSetting('visualization', 'shadows', e.target.checked)}
                  />
                }
                label="Enable shadows"
              />
            </Grid>
          </Grid>
        </Paper>
      </TabPanel>
      
      {/* Debug Tab */}
      <TabPanel value={activeTab} index={3}>
        <Grid container spacing={3}>
          {/* System Status Card */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">System Status</Typography>
                <Tooltip title="Refresh diagnostics">
                  <IconButton onClick={runDiagnostics} size="small">
                    <RefreshIcon />
                  </IconButton>
                </Tooltip>
              </Box>
              
              <List>
                <ListItem sx={{ flexWrap: 'wrap', gap: 1 }}>
                  <ListItemIcon>
                    <SpeedIcon />
                  </ListItemIcon>
                  <ListItemText 
                    primary="API Server" 
                    secondary={settings.advanced.apiUrl}
                    sx={{ minWidth: 120, flex: '1 1 auto' }}
                  />
                  <Box sx={{ ml: 'auto' }}>
                    <StatusIndicator status={diagnostics.apiStatus} />
                  </Box>
                </ListItem>
                
                <ListItem sx={{ flexWrap: 'wrap', gap: 1 }}>
                  <ListItemIcon>
                    <ThreeDIcon />
                  </ListItemIcon>
                  <ListItemText 
                    primary="WebGL Support" 
                    secondary="Required for 3D visualizations"
                    sx={{ minWidth: 120, flex: '1 1 auto' }}
                  />
                  <Box sx={{ ml: 'auto' }}>
                    <StatusIndicator 
                      status={diagnostics.webglSupport} 
                      labels={{ supported: 'Supported', unsupported: 'Not Supported' }}
                    />
                  </Box>
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>
                    <MemoryIcon />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Memory Usage" 
                    secondary={`${diagnostics.memoryUsage} MB used`} 
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>
                    <StorageIcon />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Local Storage" 
                    secondary={`${diagnostics.storageUsed} KB used`} 
                  />
                </ListItem>
              </List>
            </Paper>
          </Grid>
          
          {/* Debug Tools Card */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" gutterBottom>Debug Tools</Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Button
                  component={Link}
                  to="/visualization-test"
                  variant="outlined"
                  startIcon={<ThreeDIcon />}
                  fullWidth
                >
                  Open Visualization Test Page
                </Button>
                
                <Button
                  component={Link}
                  to="/diagnostics"
                  variant="outlined"
                  startIcon={<BugReportIcon />}
                  fullWidth
                >
                  Open Diagnostics Tool
                </Button>
                
                <Divider sx={{ my: 1 }} />
                
                <Button
                  variant="outlined"
                  color="warning"
                  startIcon={<DeleteIcon />}
                  onClick={handleClearCache}
                  fullWidth
                >
                  Clear Cache & Storage
                </Button>
              </Box>
              
              <Divider sx={{ my: 3 }} />
              
              <Typography variant="subtitle2" gutterBottom>Advanced Options</Typography>
              
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.advanced.enableDebugMode}
                    onChange={(e) => updateSetting('advanced', 'enableDebugMode', e.target.checked)}
                  />
                }
                label="Enable debug mode"
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.advanced.experimentalFeatures}
                    onChange={(e) => updateSetting('advanced', 'experimentalFeatures', e.target.checked)}
                  />
                }
                label="Enable experimental features"
              />
              
              <TextField
                fullWidth
                label="API URL"
                value={settings.advanced.apiUrl}
                onChange={(e) => updateSetting('advanced', 'apiUrl', e.target.value)}
                size="small"
                sx={{ mt: 2 }}
              />
            </Paper>
          </Grid>
          
          {/* Environment Info */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>Environment Information</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="body2" color="text.secondary">App Version</Typography>
                  <Typography variant="body1">2.0.0-beta</Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="body2" color="text.secondary">Browser</Typography>
                  <Typography variant="body1">{navigator.userAgent.split(' ').slice(-2, -1)[0]}</Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="body2" color="text.secondary">Platform</Typography>
                  <Typography variant="body1">{navigator.platform}</Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="body2" color="text.secondary">Screen Resolution</Typography>
                  <Typography variant="body1">{window.screen.width} x {window.screen.height}</Typography>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
        </Grid>
      </TabPanel>
    </Container>
  );
};

export default SettingsPage;
