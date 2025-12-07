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
<<<<<<< HEAD
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
=======
>>>>>>> origin/lenr_sim_app_v0.2-beta
  Select,
  MenuItem,
  FormControl,
  InputLabel,
<<<<<<< HEAD
  IconButton,
  Tooltip,
  LinearProgress
=======
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
  Tooltip,
  LinearProgress,
  useTheme
>>>>>>> origin/lenr_sim_app_v0.2-beta
} from '@mui/material';
import {
  Palette as PaletteIcon,
  Science as ScienceIcon,
<<<<<<< HEAD
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
=======
  ThreeDRotation as VisualizationIcon,
  BugReport as DebugIcon,
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
  CloudDone as ConnectedIcon,
  CloudOff as DisconnectedIcon,
  Memory as MemoryIcon,
  Storage as StorageIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { useTheme as useAppTheme } from '../contexts/ThemeContext';
>>>>>>> origin/lenr_sim_app_v0.2-beta

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
<<<<<<< HEAD
  const [activeTab, setActiveTab] = useState(0);
  const [saveMessage, setSaveMessage] = useState(null);
  
  // Settings state
=======
  const { isDarkMode, toggleTheme } = useAppTheme();
  const [activeTab, setActiveTab] = useState(0);
>>>>>>> origin/lenr_sim_app_v0.2-beta
  const [settings, setSettings] = useState({
    appearance: {
      fontSize: 'medium',
      animationsEnabled: true,
      compactMode: false
    },
    physics: {
      precision: 'high',
      defaultTemperature: 300,
<<<<<<< HEAD
      defaultPressure: 101325,
      defaultLoadingRatio: 0.85,
      autoSaveResults: true
=======
      defaultPressure: 1,
      calculationThreads: 4
>>>>>>> origin/lenr_sim_app_v0.2-beta
    },
    visualization: {
      qualityLevel: 'high',
      maxParticles: 5000,
      antialiasing: true,
<<<<<<< HEAD
      shadows: false
    },
    advanced: {
      apiUrl: 'http://localhost:8000',
=======
      showAxes: true,
      showGrid: false
    },
    advanced: {
      apiUrl: 'http://localhost:8001',
>>>>>>> origin/lenr_sim_app_v0.2-beta
      enableDebugMode: false,
      cacheTTL: 3600,
      experimentalFeatures: false
    }
  });
  
<<<<<<< HEAD
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
=======
  // System status state
  const [systemStatus, setSystemStatus] = useState({
    apiConnected: false,
    webglSupported: false,
    memoryUsage: 0,
    storageUsage: 0
  });
  
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // Check system status on mount
  useEffect(() => {
    checkSystemStatus();
    loadSettings();
  }, []);
  
  const checkSystemStatus = async () => {
    // Check API connection
    try {
      const response = await fetch('http://localhost:8001/health', { 
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
>>>>>>> origin/lenr_sim_app_v0.2-beta
        appearance: {
          fontSize: 'medium',
          animationsEnabled: true,
          compactMode: false
        },
        physics: {
          precision: 'high',
          defaultTemperature: 300,
<<<<<<< HEAD
          defaultPressure: 101325,
          defaultLoadingRatio: 0.85,
          autoSaveResults: true
=======
          defaultPressure: 1,
          calculationThreads: 4
>>>>>>> origin/lenr_sim_app_v0.2-beta
        },
        visualization: {
          qualityLevel: 'high',
          maxParticles: 5000,
          antialiasing: true,
<<<<<<< HEAD
          shadows: false
        },
        advanced: {
          apiUrl: 'http://localhost:8000',
=======
          showAxes: true,
          showGrid: false
        },
        advanced: {
          apiUrl: 'http://localhost:8001',
>>>>>>> origin/lenr_sim_app_v0.2-beta
          enableDebugMode: false,
          cacheTTL: 3600,
          experimentalFeatures: false
        }
      };
<<<<<<< HEAD
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
=======
      setSettings(defaults);
      localStorage.setItem('lenr_app_settings', JSON.stringify(defaults));
    }
  };
  
  const clearAllData = () => {
    if (window.confirm('This will clear all saved simulations, history, and settings. Are you sure?')) {
      localStorage.clear();
      sessionStorage.clear();
      window.location.reload();
>>>>>>> origin/lenr_sim_app_v0.2-beta
    }
  };
  
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };
  
<<<<<<< HEAD
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
=======
  const updateSetting = (category, key, value) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }));
>>>>>>> origin/lenr_sim_app_v0.2-beta
  };
  
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
<<<<<<< HEAD
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
=======
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
>>>>>>> origin/lenr_sim_app_v0.2-beta
        </Alert>
      )}
      
      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
<<<<<<< HEAD
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab icon={<PaletteIcon />} label="Appearance" iconPosition="start" />
          <Tab icon={<ScienceIcon />} label="Physics" iconPosition="start" />
          <Tab icon={<ThreeDIcon />} label="Visualization" iconPosition="start" />
          <Tab icon={<BugReportIcon />} label="Debug" iconPosition="start" />
=======
        <Tabs value={activeTab} onChange={handleTabChange} variant="fullWidth">
          <Tab icon={<PaletteIcon />} label="Appearance" />
          <Tab icon={<ScienceIcon />} label="Physics" />
          <Tab icon={<VisualizationIcon />} label="Visualization" />
          <Tab icon={<DebugIcon />} label="Debug & Advanced" />
>>>>>>> origin/lenr_sim_app_v0.2-beta
        </Tabs>
      </Paper>
      
      {/* Appearance Tab */}
      <TabPanel value={activeTab} index={0}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>Appearance Settings</Typography>
<<<<<<< HEAD
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Customize the look and feel of the application.
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
=======
          <Divider sx={{ mb: 3 }} />
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
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
            
            <Grid item xs={12} md={6}>
>>>>>>> origin/lenr_sim_app_v0.2-beta
              <FormControl fullWidth>
                <InputLabel>Font Size</InputLabel>
                <Select
                  value={settings.appearance.fontSize}
<<<<<<< HEAD
                  onChange={(e) => updateSetting('appearance', 'fontSize', e.target.value)}
                  label="Font Size"
=======
                  label="Font Size"
                  onChange={(e) => updateSetting('appearance', 'fontSize', e.target.value)}
>>>>>>> origin/lenr_sim_app_v0.2-beta
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
<<<<<<< HEAD
                  />
                }
                label="Enable animations"
=======
                    color="primary"
                  />
                }
                label="Enable Animations"
>>>>>>> origin/lenr_sim_app_v0.2-beta
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.appearance.compactMode}
                    onChange={(e) => updateSetting('appearance', 'compactMode', e.target.checked)}
<<<<<<< HEAD
                  />
                }
                label="Compact mode"
=======
                    color="primary"
                  />
                }
                label="Compact Mode"
>>>>>>> origin/lenr_sim_app_v0.2-beta
              />
            </Grid>
          </Grid>
        </Paper>
      </TabPanel>
      
      {/* Physics Tab */}
      <TabPanel value={activeTab} index={1}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>Physics Settings</Typography>
<<<<<<< HEAD
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Configure default physics simulation parameters.
          </Typography>
=======
          <Divider sx={{ mb: 3 }} />
>>>>>>> origin/lenr_sim_app_v0.2-beta
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Calculation Precision</InputLabel>
                <Select
                  value={settings.physics.precision}
<<<<<<< HEAD
                  onChange={(e) => updateSetting('physics', 'precision', e.target.value)}
                  label="Calculation Precision"
                >
                  <MenuItem value="low">Low (Faster)</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="high">High (More Accurate)</MenuItem>
=======
                  label="Calculation Precision"
                  onChange={(e) => updateSetting('physics', 'precision', e.target.value)}
                >
                  <MenuItem value="low">Low (Fast)</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="high">High (Accurate)</MenuItem>
>>>>>>> origin/lenr_sim_app_v0.2-beta
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="Default Temperature (K)"
                value={settings.physics.defaultTemperature}
<<<<<<< HEAD
                onChange={(e) => updateSetting('physics', 'defaultTemperature', parseFloat(e.target.value))}
=======
                onChange={(e) => updateSetting('physics', 'defaultTemperature', Number(e.target.value))}
                InputProps={{ inputProps: { min: 0, max: 10000 } }}
>>>>>>> origin/lenr_sim_app_v0.2-beta
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
<<<<<<< HEAD
                label="Default Pressure (Pa)"
                value={settings.physics.defaultPressure}
                onChange={(e) => updateSetting('physics', 'defaultPressure', parseFloat(e.target.value))}
=======
                label="Default Pressure (atm)"
                value={settings.physics.defaultPressure}
                onChange={(e) => updateSetting('physics', 'defaultPressure', Number(e.target.value))}
                InputProps={{ inputProps: { min: 0, max: 1000 } }}
>>>>>>> origin/lenr_sim_app_v0.2-beta
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
<<<<<<< HEAD
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
=======
              <Typography gutterBottom>Calculation Threads: {settings.physics.calculationThreads}</Typography>
              <Slider
                value={settings.physics.calculationThreads}
                onChange={(e, v) => updateSetting('physics', 'calculationThreads', v)}
                min={1}
                max={8}
                step={1}
                marks
                valueLabelDisplay="auto"
>>>>>>> origin/lenr_sim_app_v0.2-beta
              />
            </Grid>
          </Grid>
        </Paper>
      </TabPanel>
      
      {/* Visualization Tab */}
      <TabPanel value={activeTab} index={2}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>Visualization Settings</Typography>
<<<<<<< HEAD
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Configure 3D visualization and rendering options.
          </Typography>
=======
          <Divider sx={{ mb: 3 }} />
>>>>>>> origin/lenr_sim_app_v0.2-beta
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Quality Level</InputLabel>
                <Select
                  value={settings.visualization.qualityLevel}
<<<<<<< HEAD
                  onChange={(e) => updateSetting('visualization', 'qualityLevel', e.target.value)}
                  label="Quality Level"
=======
                  label="Quality Level"
                  onChange={(e) => updateSetting('visualization', 'qualityLevel', e.target.value)}
>>>>>>> origin/lenr_sim_app_v0.2-beta
                >
                  <MenuItem value="low">Low (Better Performance)</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="high">High (Better Quality)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={6}>
<<<<<<< HEAD
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
=======
              <Typography gutterBottom>Max Particles: {settings.visualization.maxParticles}</Typography>
              <Slider
                value={settings.visualization.maxParticles}
                onChange={(e, v) => updateSetting('visualization', 'maxParticles', v)}
                min={100}
                max={10000}
                step={100}
                valueLabelDisplay="auto"
>>>>>>> origin/lenr_sim_app_v0.2-beta
              />
              <Typography variant="caption" color="text.secondary">
                Higher values may impact performance
              </Typography>
            </Grid>
            
<<<<<<< HEAD
            <Grid item xs={12} md={6}>
=======
            <Grid item xs={12} md={4}>
>>>>>>> origin/lenr_sim_app_v0.2-beta
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.visualization.antialiasing}
                    onChange={(e) => updateSetting('visualization', 'antialiasing', e.target.checked)}
                  />
                }
<<<<<<< HEAD
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
=======
                label="Antialiasing"
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
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
            
            <Grid item xs={12} md={4}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.visualization.showGrid}
                    onChange={(e) => updateSetting('visualization', 'showGrid', e.target.checked)}
                  />
                }
                label="Show Grid"
>>>>>>> origin/lenr_sim_app_v0.2-beta
              />
            </Grid>
          </Grid>
        </Paper>
      </TabPanel>
      
<<<<<<< HEAD
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
=======
      {/* Debug & Advanced Tab */}
      <TabPanel value={activeTab} index={3}>
        <Grid container spacing={3}>
          {/* System Status */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">System Status</Typography>
                <IconButton onClick={checkSystemStatus} size="small">
                  <RefreshIcon />
                </IconButton>
              </Box>
              <Divider sx={{ mb: 2 }} />
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
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
                
                <Grid item xs={12} sm={6} md={3}>
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
                
                <Grid item xs={12} sm={6} md={3}>
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
                
                <Grid item xs={12} sm={6} md={3}>
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
>>>>>>> origin/lenr_sim_app_v0.2-beta
                </Grid>
              </Grid>
            </Paper>
          </Grid>
<<<<<<< HEAD
        </Grid>
      </TabPanel>
=======
          
          {/* Advanced Settings */}
          <Grid item xs={12} md={6}>
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
          <Grid item xs={12} md={6}>
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
          <Grid item xs={12}>
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
>>>>>>> origin/lenr_sim_app_v0.2-beta
    </Container>
  );
};

export default SettingsPage;
