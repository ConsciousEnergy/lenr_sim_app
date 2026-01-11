import React, { useState, useEffect, useCallback, memo } from 'react';
import { 
  Box, Typography, Paper, Button, Stepper, Step, StepLabel, 
  CircularProgress, Grid, Alert, Accordion, AccordionSummary, 
  AccordionDetails, Divider, Badge, List, ListItem, ListItemIcon, 
  ListItemText, Collapse, Card, CardContent, LinearProgress, Tooltip, Chip
} from '@mui/material';

// Icons
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import DeveloperBoardIcon from '@mui/icons-material/DeveloperBoard';
import MemoryIcon from '@mui/icons-material/Memory';
import StorageIcon from '@mui/icons-material/Storage';
import SpeedIcon from '@mui/icons-material/Speed';
import LanguageIcon from '@mui/icons-material/Language';
import SignalWifiStatusbar4BarIcon from '@mui/icons-material/SignalWifiStatusbar4Bar';
import WifiOffIcon from '@mui/icons-material/WifiOff';

// Debug components
import ThreeJsDebug from './ThreeJsDebug';
import TestRydbergModel from './testRydbergModel';
import ErrorBoundary from './ErrorBoundary';
import { useLogger } from '../contexts/LogContext';
import api from '../utils/api';

// Test categories
const TEST_CATEGORIES = [
  {
    id: 'imports',
    title: 'Module Imports',
    description: 'Tests the loading of critical modules and dependencies',
    component: null,
    status: 'pending'
  },
  {
    id: 'threejs',
    title: 'Three.js Capabilities',
    description: 'Tests the WebGL and Three.js rendering capabilities',
    component: ThreeJsDebug,
    status: 'pending'
  },
  {
    id: 'physics',
    title: 'Physics Models',
    description: 'Tests the Rydberg Matter physics models and calculations',
    component: TestRydbergModel,
    status: 'pending'
  }
];

// Component that tests critical imports
const ImportTests = ({ onComplete }) => {
  const [results, setResults] = useState({
    status: 'running',
    testedModules: [],
    error: null
  });

  // Run the import tests automatically on component mount
  React.useEffect(() => {
    const testModules = async () => {
      const moduleTests = [
        { name: 'react', importStatement: 'import React from "react"' },
        { name: 'react-dom', importStatement: 'import ReactDOM from "react-dom"' },
        { name: 'react-router-dom', importStatement: 'import { BrowserRouter } from "react-router-dom"' },
        { name: '@mui/material', importStatement: 'import { Button } from "@mui/material"' },
        { name: 'three', importStatement: 'import * as THREE from "three"' },
        { name: 'axios', importStatement: 'import axios from "axios"' }
      ];

      const results = [];
      
      for (const module of moduleTests) {
        try {
          // Dynamically import each module
          const imported = await import(/* webpackIgnore: true */ module.name);
          results.push({
            name: module.name,
            status: 'success',
            importStatement: module.importStatement,
            details: imported ? 'Imported successfully' : 'Import returned undefined'
          });
        } catch (error) {
          results.push({
            name: module.name,
            status: 'error',
            importStatement: module.importStatement,
            details: error.message
          });
        }
      }

      // Check if all modules were imported successfully
      const hasErrors = results.some(result => result.status === 'error');
      
      setResults({
        status: hasErrors ? 'error' : 'success',
        testedModules: results,
        error: hasErrors ? 'Some modules failed to import' : null
      });

      // Report back to parent component
      if (onComplete) {
        onComplete({
          id: 'imports',
          status: hasErrors ? 'error' : 'success',
          details: `${results.filter(r => r.status === 'success').length} of ${results.length} modules imported successfully`
        });
      }
    };

    testModules();
  }, [onComplete]);

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>Import Tests</Typography>
      
      {results.status === 'running' ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <CircularProgress size={24} />
          <Typography>Testing module imports...</Typography>
        </Box>
      ) : (
        <>
          <Typography variant="body1" gutterBottom>
            {results.status === 'success' 
              ? 'All critical modules imported successfully' 
              : 'Some modules failed to import'}
          </Typography>
          
          <Divider sx={{ my: 2 }} />
          
          <Grid container spacing={1}>
            {results.testedModules.map((module, index) => (
              <Grid item xs={12} sm={6} key={index}>
                <Paper 
                  variant="outlined" 
                  sx={{ 
                    p: 1.5, 
                    display: 'flex', 
                    alignItems: 'flex-start',
                    backgroundColor: module.status === 'success' ? 'success.light' : 'error.light',
                    opacity: 0.8
                  }}
                >
                  {module.status === 'success' ? (
                    <CheckCircleIcon color="success" sx={{ mr: 1 }} />
                  ) : (
                    <ErrorIcon color="error" sx={{ mr: 1 }} />
                  )}
                  <Box>
                    <Typography variant="subtitle1">{module.name}</Typography>
                    <Typography variant="body2" sx={{ opacity: 0.7 }}>
                      {module.importStatement}
                    </Typography>
                    {module.status === 'error' && (
                      <Typography variant="body2" color="error.dark">
                        {module.details}
                      </Typography>
                    )}
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </>
      )}
    </Paper>
  );
};

// Memoized test result item for better performance
const TestResultItem = memo(({ test, expanded, toggleExpand }) => {
  const getIcon = () => {
    switch (test.status) {
      case 'passed':
        return <CheckCircleIcon color="success" />;
      case 'failed':
        return <ErrorIcon color="error" />;
      case 'warning':
        return <WarningIcon color="warning" />;
      case 'running':
        return <CircularProgress size={20} />;
      default:
        return <HourglassEmptyIcon color="disabled" />;
    }
  };

  return (
    <>
      <ListItem button onClick={() => toggleExpand(test.id)}>
        <ListItemIcon>
          {getIcon()}
        </ListItemIcon>
        <ListItemText 
          primary={test.name} 
          secondary={test.status === 'failed' ? 'Failed' : test.status === 'passed' ? 'Passed' : test.status}
        />
        {expanded ? <ExpandLess /> : <ExpandMore />}
      </ListItem>
      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <Box sx={{ pl: 4, pr: 2, py: 1, bgcolor: 'background.paper' }}>
          {test.details && (
            <Typography variant="body2" component="pre" sx={{ 
              whiteSpace: 'pre-wrap',
              overflowX: 'auto',
              backgroundColor: '#f5f5f5',
              p: 1,
              borderRadius: 1,
              maxHeight: '200px',
              overflowY: 'auto'
            }}>
              {test.details}
            </Typography>
          )}
          {test.error && (
            <Typography variant="body2" color="error">
              Error: {test.error}
            </Typography>
          )}
          {test.duration && (
            <Typography variant="caption" color="text.secondary">
              Duration: {test.duration}ms
            </Typography>
          )}
        </Box>
      </Collapse>
      <Divider />
    </>
  );
});

// Component to show system information
const SystemInfo = memo(() => {
  const [systemInfo, setSystemInfo] = useState({
    browser: {
      name: 'Unknown',
      version: 'Unknown',
      userAgent: navigator.userAgent,
      language: navigator.language,
      cookiesEnabled: navigator.cookieEnabled,
      doNotTrack: navigator.doNotTrack === '1' || navigator.doNotTrack === 'yes'
    },
    screen: {
      width: window.screen.width,
      height: window.screen.height,
      colorDepth: window.screen.colorDepth,
      pixelRatio: window.devicePixelRatio || 1,
      orientation: window.screen.orientation ? window.screen.orientation.type : 'Unknown'
    },
    system: {
      platform: navigator.platform,
      cores: navigator.hardwareConcurrency || 'Unknown',
      memory: 'Unknown',
      connection: 'Unknown',
      online: navigator.onLine
    },
    webGL: {
      supported: false,
      renderer: 'Unknown',
      vendor: 'Unknown',
      version: 'Unknown',
      shadingLanguageVersion: 'Unknown',
      extensions: []
    },
    performance: {
      memory: window.performance && window.performance.memory ? {
        jsHeapSizeLimit: window.performance.memory.jsHeapSizeLimit,
        totalJSHeapSize: window.performance.memory.totalJSHeapSize,
        usedJSHeapSize: window.performance.memory.usedJSHeapSize
      } : null,
      timing: window.performance ? window.performance.timing : null
    }
  });
  
  useEffect(() => {
    // Detect browser
    const detectBrowser = () => {
      const userAgent = navigator.userAgent;
      let name = 'Unknown';
      let version = 'Unknown';
      
      // Extract browser name and version
      if (userAgent.indexOf('Firefox') > -1) {
        name = 'Firefox';
        version = userAgent.match(/Firefox\/([0-9.]+)/)[1];
      } else if (userAgent.indexOf('Chrome') > -1 && userAgent.indexOf('Edg') === -1) {
        name = 'Chrome';
        version = userAgent.match(/Chrome\/([0-9.]+)/)[1];
      } else if (userAgent.indexOf('Safari') > -1 && userAgent.indexOf('Chrome') === -1) {
        name = 'Safari';
        version = userAgent.match(/Version\/([0-9.]+)/)[1];
      } else if (userAgent.indexOf('Edg') > -1) {
        name = 'Edge';
        version = userAgent.match(/Edg\/([0-9.]+)/)[1];
      } else if (userAgent.indexOf('MSIE') > -1 || userAgent.indexOf('Trident') > -1) {
        name = 'Internet Explorer';
        version = userAgent.match(/(?:MSIE |rv:)([0-9.]+)/)[1];
      }
      
      return { name, version };
    };
    
    // Test WebGL
    const testWebGL = () => {
      try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        
        if (gl) {
          return {
            supported: true,
            renderer: gl.getParameter(gl.RENDERER),
            vendor: gl.getParameter(gl.VENDOR),
            version: gl.getParameter(gl.VERSION),
            shadingLanguageVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
            extensions: gl.getSupportedExtensions()
          };
        }
        
        return { supported: false };
      } catch (e) {
        return { supported: false, error: e.message };
      }
    };
    
    // Detect network connection
    const detectConnection = () => {
      const connection = navigator.connection || 
                         navigator.mozConnection || 
                         navigator.webkitConnection;
      
      if (connection) {
        return {
          type: connection.effectiveType || 'Unknown',
          downlink: connection.downlink || 'Unknown',
          rtt: connection.rtt || 'Unknown',
          saveData: connection.saveData || false
        };
      }
      
      return 'Unknown';
    };
    
    // Update system info
    const browser = detectBrowser();
    const webGL = testWebGL();
    const connection = detectConnection();
    
    setSystemInfo(prev => ({
      ...prev,
      browser: {
        ...prev.browser,
        name: browser.name,
        version: browser.version
      },
      system: {
        ...prev.system,
        connection
      },
      webGL
    }));
    
  }, []);
  
  const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };
  
  const getMemoryUsage = () => {
    if (!systemInfo.performance.memory) return null;
    
    const { totalJSHeapSize, jsHeapSizeLimit } = systemInfo.performance.memory;
    const percentage = (totalJSHeapSize / jsHeapSizeLimit) * 100;
    
    return {
      used: formatBytes(systemInfo.performance.memory.usedJSHeapSize),
      total: formatBytes(totalJSHeapSize),
      limit: formatBytes(jsHeapSizeLimit),
      percentage: Math.min(percentage, 100).toFixed(1)
    };
  };
  
  const memoryUsage = getMemoryUsage();
  
  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h5" gutterBottom>
        System Information
      </Typography>
      
      <Grid container spacing={2}>
        {/* Hardware & System */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <DeveloperBoardIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">
                  Hardware & System
                </Typography>
              </Box>
              
              <List dense>
                <ListItem>
                  <ListItemText 
                    primary="Platform" 
                    secondary={systemInfo.system.platform} 
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="CPU Cores" 
                    secondary={systemInfo.system.cores} 
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="Screen Resolution" 
                    secondary={`${systemInfo.screen.width}x${systemInfo.screen.height} (${systemInfo.screen.pixelRatio}x DPR)`} 
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="Color Depth" 
                    secondary={`${systemInfo.screen.colorDepth} bit`} 
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Browser Information */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <LanguageIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">
                  Browser Information
                </Typography>
              </Box>
              
              <List dense>
                <ListItem>
                  <ListItemText 
                    primary="Browser" 
                    secondary={`${systemInfo.browser.name} ${systemInfo.browser.version}`} 
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="Language" 
                    secondary={systemInfo.browser.language} 
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="Cookies Enabled" 
                    secondary={systemInfo.browser.cookiesEnabled ? 'Yes' : 'No'} 
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="Do Not Track" 
                    secondary={systemInfo.browser.doNotTrack ? 'Enabled' : 'Disabled'} 
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Memory Status */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <MemoryIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">
                  Memory Status
                </Typography>
              </Box>
              
              {memoryUsage ? (
                <>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" gutterBottom>
                      JavaScript Heap Usage: {memoryUsage.percentage}%
                    </Typography>
                    <LinearProgress 
                      variant="determinate" 
                      value={parseFloat(memoryUsage.percentage)} 
                      color={
                        parseFloat(memoryUsage.percentage) > 80 ? 'error' : 
                        parseFloat(memoryUsage.percentage) > 60 ? 'warning' : 'success'
                      }
                      sx={{ height: 10, borderRadius: 5 }}
                    />
                  </Box>
                  
                  <List dense>
                    <ListItem>
                      <ListItemText 
                        primary="Used Memory" 
                        secondary={memoryUsage.used} 
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText 
                        primary="Total Memory" 
                        secondary={memoryUsage.total} 
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText 
                        primary="Memory Limit" 
                        secondary={memoryUsage.limit} 
                      />
                    </ListItem>
                  </List>
                </>
              ) : (
                <Alert severity="info">
                  Memory performance information is not available in this browser.
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>
        
        {/* Network Status */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                {systemInfo.system.online ? (
                  <SignalWifiStatusbar4BarIcon color="success" sx={{ mr: 1 }} />
                ) : (
                  <WifiOffIcon color="error" sx={{ mr: 1 }} />
                )}
                <Typography variant="h6">
                  Network Status
                </Typography>
              </Box>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="body1" gutterBottom>
                  Status: {systemInfo.system.online ? (
                    <Typography component="span" color="success.main">Online</Typography>
                  ) : (
                    <Typography component="span" color="error.main">Offline</Typography>
                  )}
                </Typography>
              </Box>
              
              {typeof systemInfo.system.connection === 'object' ? (
                <List dense>
                  <ListItem>
                    <ListItemText 
                      primary="Connection Type" 
                      secondary={systemInfo.system.connection.type || 'Unknown'} 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="Downlink Speed" 
                      secondary={
                        systemInfo.system.connection.downlink !== 'Unknown' 
                          ? `${systemInfo.system.connection.downlink} Mbps` 
                          : 'Unknown'
                      } 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="Round Trip Time" 
                      secondary={
                        systemInfo.system.connection.rtt !== 'Unknown' 
                          ? `${systemInfo.system.connection.rtt} ms` 
                          : 'Unknown'
                      } 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="Data Saver" 
                      secondary={systemInfo.system.connection.saveData ? 'Enabled' : 'Disabled'} 
                    />
                  </ListItem>
                </List>
              ) : (
                <Alert severity="info">
                  Detailed network information is not available in this browser.
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>
        
        {/* WebGL Support */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  WebGL Information
                </Typography>
                <Box sx={{ ml: 2 }}>
                  {systemInfo.webGL.supported ? (
                    <Chip 
                      color="success" 
                      size="small" 
                      label="Supported" 
                    />
                  ) : (
                    <Chip 
                      color="error" 
                      size="small" 
                      label="Not Supported" 
                    />
                  )}
                </Box>
              </Box>
              
              {systemInfo.webGL.supported ? (
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <List dense>
                      <ListItem>
                        <ListItemText 
                          primary="Renderer" 
                          secondary={systemInfo.webGL.renderer} 
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText 
                          primary="Vendor" 
                          secondary={systemInfo.webGL.vendor} 
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText 
                          primary="WebGL Version" 
                          secondary={systemInfo.webGL.version} 
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText 
                          primary="Shading Language" 
                          secondary={systemInfo.webGL.shadingLanguageVersion} 
                        />
                      </ListItem>
                    </List>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" gutterBottom>
                      Supported Extensions:
                    </Typography>
                    <Paper 
                      variant="outlined" 
                      sx={{ 
                        maxHeight: 150, 
                        overflow: 'auto', 
                        p: 1
                      }}
                    >
                      <List dense>
                        {systemInfo.webGL.extensions.slice(0, 10).map((ext, index) => (
                          <ListItem key={index}>
                            <ListItemText primary={ext} />
                          </ListItem>
                        ))}
                        {systemInfo.webGL.extensions.length > 10 && (
                          <ListItem>
                            <ListItemText 
                              primary={`And ${systemInfo.webGL.extensions.length - 10} more...`} 
                              primaryTypographyProps={{ color: 'text.secondary' }}
                            />
                          </ListItem>
                        )}
                      </List>
                    </Paper>
                  </Grid>
                </Grid>
              ) : (
                <Alert severity="warning">
                  WebGL is not supported in your browser. The 3D visualization features will not work properly.
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
});

const TestRunner = () => {
  const logger = useLogger();
  const [activeStep, setActiveStep] = useState(0);
  const [testResults, setTestResults] = useState(
    TEST_CATEGORIES.map(test => ({ ...test }))
  );
  const [isLoading, setIsLoading] = useState(false);
  const [expandedTests, setExpandedTests] = useState({});
  const [tests, setTests] = useState([]);
  const [error, setError] = useState(null);

  const handleStepChange = (step) => {
    setActiveStep(step);
  };

  const handleTestComplete = (result) => {
    setTestResults(prev => 
      prev.map(test => 
        test.id === result.id ? { ...test, ...result } : test
      )
    );
    
    // Auto-advance to next step after a brief delay
    setTimeout(() => {
      if (activeStep < TEST_CATEGORIES.length - 1) {
        setActiveStep(prevStep => prevStep + 1);
      }
    }, 500);
  };

  const handleAccordionChange = (testId) => {
    setExpandedTests(prev => ({
      ...prev,
      [testId]: !prev[testId]
    }));
  };

  const handleRunAllTests = () => {
    setIsLoading(true);
    // Reset test results
    setTestResults(TEST_CATEGORIES.map(test => ({ ...test, status: 'pending' })));
    // Start at the first test
    setActiveStep(0);
    // Set first test as expanded
    setExpandedTests({ imports: true });
    setIsLoading(false);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success':
        return <CheckCircleIcon color="success" />;
      case 'error':
        return <ErrorIcon color="error" />;
      case 'warning':
        return <WarningIcon color="warning" />;
      default:
        return null;
    }
  };

  const renderTestComponent = (test) => {
    if (test.id === 'imports') {
      return <ImportTests onComplete={handleTestComplete} />;
    }
    
    if (test.component) {
      const TestComponent = test.component;
      return (
        <ErrorBoundary
          onError={() => handleTestComplete({ 
            id: test.id, 
            status: 'error', 
            details: 'Test component crashed' 
          })}
        >
          <TestComponent />
        </ErrorBoundary>
      );
    }
    
    return (
      <Alert severity="warning">
        No test component defined for {test.title}
      </Alert>
    );
  };

  // Simulated test data - in a real app, this would come from an API
  const runTests = useCallback(async () => {
    logger.info('Starting test run');
    setIsLoading(true);
    setError(null);
    
    try {
      // Dummy delay to simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // In a real app, you would fetch this from the backend
      // Here, we're just simulating test results
      const testResults = [
        {
          id: 1,
          name: 'API Connectivity Test',
          status: 'passed',
          details: 'Connected to API endpoint successfully. Response time: 120ms',
          duration: 120
        },
        {
          id: 2,
          name: 'Database Connection Test',
          status: 'passed',
          details: 'Successfully connected to database and executed test query',
          duration: 250
        },
        {
          id: 3,
          name: 'Model Loading Test',
          status: 'passed',
          details: 'All scientific models loaded correctly',
          duration: 180
        },
        {
          id: 4,
          name: 'Data Processing Test',
          status: 'warning',
          details: 'Data processing completed but with warnings: Some sample data points contained NaN values',
          duration: 320
        },
        {
          id: 5,
          name: 'Visualization Test',
          status: 'passed',
          details: 'Three.js renderer initialized and test scene rendered successfully',
          duration: 420
        }
      ];
      
      setTests(testResults);
      logger.info('Test run completed', { passed: testResults.filter(t => t.status === 'passed').length, total: testResults.length });
    } catch (err) {
      logger.error('Error running tests', err);
      setError('Failed to run tests: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  }, [logger]);
  
  const checkHealth = useCallback(async () => {
    logger.info('Checking system health');
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await api.get('/diagnostics/health/detailed', {}, 30000);
      
      // Process health data into test results
      const healthTests = [
        {
          id: 'health-1',
          name: 'System Status',
          status: data.status === 'healthy' ? 'passed' : 'failed',
          details: `Status: ${data.status}\nTimestamp: ${data.timestamp}`,
          duration: 100
        },
        {
          id: 'health-2',
          name: 'Memory Usage',
          status: data.system.memory_percent < 80 ? 'passed' : data.system.memory_percent < 90 ? 'warning' : 'failed',
          details: `Memory: ${data.system.memory_percent}% used\nAvailable: ${formatBytes(data.system.memory_available)}\nTotal: ${formatBytes(data.system.memory_total)}`,
          duration: 50
        },
        {
          id: 'health-3',
          name: 'Disk Usage',
          status: data.system.disk_percent < 80 ? 'passed' : data.system.disk_percent < 90 ? 'warning' : 'failed',
          details: `Disk: ${data.system.disk_percent}% used\nFree: ${formatBytes(data.system.disk_free)}\nTotal: ${formatBytes(data.system.disk_total)}`,
          duration: 50
        }
      ];
      
      setTests(healthTests);
      logger.info('Health check completed');
    } catch (err) {
      logger.error('Error checking health', err);
      setError('Failed to check health: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  }, [logger]);

  function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        System Diagnostics
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={runTests}
            disabled={isLoading}
          >
            Run Tests
          </Button>
        </Grid>
        <Grid item>
          <Button 
            variant="contained" 
            color="secondary" 
            onClick={checkHealth}
            disabled={isLoading}
          >
            Check Health
          </Button>
        </Grid>
      </Grid>
      
      <Paper sx={{ mb: 3 }}>
        <List disablePadding>
          {isLoading && tests.length === 0 ? (
            <Box sx={{ p: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
              <CircularProgress />
              <Typography variant="body1" sx={{ mt: 2 }}>
                Running diagnostics...
              </Typography>
            </Box>
          ) : tests.length === 0 ? (
            <ListItem>
              <ListItemText primary="No tests have been run yet" />
            </ListItem>
          ) : (
            tests.map(test => (
              <TestResultItem 
                key={test.id} 
                test={test} 
                expanded={!!expandedTests[test.id]} 
                toggleExpand={handleAccordionChange}
              />
            ))
          )}
        </List>
      </Paper>
      
      <Typography variant="body2" color="text.secondary">
        These diagnostic tests help identify potential issues with the application.
        Run these tests when experiencing problems or to verify system health.
      </Typography>
    </Box>
  );
};

export default TestRunner; 