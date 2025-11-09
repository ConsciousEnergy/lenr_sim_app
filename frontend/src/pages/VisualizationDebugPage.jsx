import React, { useState } from 'react';
import { 
  Container, 
  Typography, 
  Tabs, 
  Tab, 
  Box, 
  Paper, 
  Button, 
  Grid,
  FormControlLabel,
  Switch,
  Card,
  CardContent,
  Divider
} from '@mui/material';
import ThreeJsErrorHandler from '../components/ThreeJsErrorHandler';
import VisualizationDebugger from '../components/VisualizationDebugger';

// To test rendering, we'll need to import a Three.js test component
import TestVisualizer from '../visualization/components/TestCube';

/**
 * VisualizationDebugPage
 * 
 * Provides tools for diagnosing and fixing visualization issues in the LENR Simulation application:
 * 1. Tests WebGL compatibility and displays hardware information
 * 2. Tests Three.js rendering with various complexity levels
 * 3. Diagnoses common issues and offers solutions
 * 4. Provides tools to check accessibility compliance
 */
const VisualizationDebugPage = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [showErrorHandler, setShowErrorHandler] = useState(true);
  const [testRenderingComplexity, setTestRenderingComplexity] = useState('low');
  const [errorLog, setErrorLog] = useState([]);
  const [isSuccess, setIsSuccess] = useState(null);
  
  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };
  
  // Handle error detection
  const handleError = (error, info) => {
    setErrorLog(prev => [
      ...prev, 
      { 
        message: error.message || error.toString(), 
        timestamp: new Date().toLocaleTimeString(),
        type: info?.type || 'error'
      }
    ]);
    setIsSuccess(false);
  };
  
  // Handle successful rendering
  const handleRenderSuccess = () => {
    setIsSuccess(true);
  };
  
  // Clear error log
  const clearErrorLog = () => {
    setErrorLog([]);
    setIsSuccess(null);
  };
  
  // Force a WebGL error to test error handling
  const forceWebGLError = () => {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl');
      
      if (gl) {
        // Create an invalid shader to force a WebGL error
        const shader = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(shader, 'This is not valid GLSL!');
        gl.compileShader(shader);
        
        // Check the compile status - should fail
        const compiled = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
        
        if (!compiled) {
          const error = new Error(gl.getShaderInfoLog(shader));
          handleError(error, { type: 'forced' });
        }
      } else {
        handleError(new Error('WebGL not supported'), { type: 'forced' });
      }
    } catch (e) {
      handleError(e, { type: 'forced' });
    }
  };
  
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Visualization Debugging Tools
      </Typography>
      
      <Typography variant="body1" paragraph color="text.secondary">
        This page helps diagnose and fix issues with the LENR Simulation 3D visualizations.
        Use these tools to troubleshoot WebGL, Three.js, and accessibility problems.
      </Typography>
      
      <Paper sx={{ mb: 4 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
        >
          <Tab label="Diagnostics" />
          <Tab label="Test Renderer" />
          <Tab label="Accessibility" />
          <Tab label="Performance" />
        </Tabs>
        
        {/* Diagnostics Tab */}
        <TabPanel value={activeTab} index={0}>
          <VisualizationDebugger />
        </TabPanel>
        
        {/* Test Renderer Tab */}
        <TabPanel value={activeTab} index={1}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Three.js Test Renderer
            </Typography>
            <Typography variant="body2" paragraph color="text.secondary">
              This test helps identify if your system can render Three.js scenes with different complexity levels.
              Any errors will be caught and displayed instead of crashing the application.
            </Typography>
            
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={showErrorHandler}
                      onChange={(e) => setShowErrorHandler(e.target.checked)}
                    />
                  }
                  label="Use Error Handler (recommended)"
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ mr: 2 }}>
                    Rendering Complexity:
                  </Typography>
                  <Button 
                    variant={testRenderingComplexity === 'low' ? 'contained' : 'outlined'}
                    size="small"
                    onClick={() => setTestRenderingComplexity('low')}
                    sx={{ mr: 1 }}
                  >
                    Low
                  </Button>
                  <Button 
                    variant={testRenderingComplexity === 'medium' ? 'contained' : 'outlined'}
                    size="small"
                    onClick={() => setTestRenderingComplexity('medium')}
                    sx={{ mr: 1 }}
                  >
                    Medium
                  </Button>
                  <Button 
                    variant={testRenderingComplexity === 'high' ? 'contained' : 'outlined'}
                    size="small"
                    onClick={() => setTestRenderingComplexity('high')}
                  >
                    High
                  </Button>
                </Box>
              </Grid>
            </Grid>
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={8}>
                <Box sx={{ height: 400, border: '1px solid #e0e0e0', borderRadius: 1, overflow: 'hidden' }}>
                  {showErrorHandler ? (
                    <ThreeJsErrorHandler onError={handleError}>
                      <TestVisualizer 
                        complexity={testRenderingComplexity}
                        onRenderSuccess={handleRenderSuccess}
                        onRenderError={handleError}
                      />
                    </ThreeJsErrorHandler>
                  ) : (
                    <TestVisualizer 
                      complexity={testRenderingComplexity}
                      onRenderSuccess={handleRenderSuccess}
                      onRenderError={handleError}
                    />
                  )}
                </Box>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="subtitle1">
                      Rendering Status
                    </Typography>
                    <Button 
                      size="small" 
                      variant="outlined" 
                      color="primary"
                      onClick={clearErrorLog}
                    >
                      Clear Log
                    </Button>
                  </Box>
                  
                  {isSuccess === true && (
                    <Box sx={{ bgcolor: '#e8f5e9', p: 1.5, borderRadius: 1, mb: 2 }}>
                      <Typography variant="body2" color="success.main">
                        ✓ Three.js rendering successful
                      </Typography>
                    </Box>
                  )}
                  
                  {isSuccess === false && (
                    <Box sx={{ bgcolor: '#ffebee', p: 1.5, borderRadius: 1, mb: 2 }}>
                      <Typography variant="body2" color="error.main">
                        ✕ Three.js rendering errors detected
                      </Typography>
                    </Box>
                  )}
                  
                  <Box 
                    sx={{ 
                      flex: 1, 
                      overflowY: 'auto', 
                      bgcolor: '#f5f5f5', 
                      p: 1, 
                      borderRadius: 1,
                      fontFamily: 'monospace',
                      fontSize: '0.75rem'
                    }}
                  >
                    {errorLog.length === 0 ? (
                      <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 2 }}>
                        No errors logged yet
                      </Typography>
                    ) : (
                      errorLog.map((log, index) => (
                        <Box 
                          key={index} 
                          sx={{ 
                            mb: 1, 
                            p: 1, 
                            bgcolor: log.type === 'error' ? '#ffebee' : 
                                    log.type === 'warning' ? '#fff8e1' : '#f5f5f5',
                            borderRadius: 0.5,
                            fontSize: '0.75rem'
                          }}
                        >
                          <Box component="span" sx={{ color: '#777', mr: 1 }}>
                            [{log.timestamp}]
                          </Box>
                          {log.message}
                        </Box>
                      ))
                    )}
                  </Box>
                  
                  <Button 
                    variant="outlined" 
                    color="error" 
                    size="small" 
                    onClick={forceWebGLError}
                    sx={{ mt: 2 }}
                  >
                    Force WebGL Error (Test)
                  </Button>
                </Paper>
              </Grid>
            </Grid>
          </Box>
        </TabPanel>
        
        {/* Accessibility Tab */}
        <TabPanel value={activeTab} index={2}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Visualization Accessibility Checker
            </Typography>
            
            <Typography variant="body2" paragraph>
              This tool checks all visualization components to ensure they meet accessibility standards.
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom>
                      Form Accessibility
                    </Typography>
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="body2" paragraph>
                      Form controls should have:
                    </Typography>
                    <ul>
                      <li>Proper ID attributes</li>
                      <li>Associated label elements</li>
                      <li>Name attributes for form submission</li>
                      <li>ARIA attributes when needed</li>
                    </ul>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom>
                      Visualization Accessibility
                    </Typography>
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="body2" paragraph>
                      Visualization elements should have:
                    </Typography>
                    <ul>
                      <li>Alternative representations of data</li>
                      <li>Keyboard navigation support</li>
                      <li>ARIA roles and labels</li>
                      <li>Sufficient color contrast</li>
                    </ul>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        </TabPanel>
        
        {/* Performance Tab */}
        <TabPanel value={activeTab} index={3}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Performance Optimization
            </Typography>
            
            <Typography variant="body2" paragraph>
              Use these recommendations to improve the performance of visualizations:
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom>
                      Hardware Acceleration
                    </Typography>
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="body2">
                      Ensure hardware acceleration is enabled in your browser:
                    </Typography>
                    <ul>
                      <li>Chrome: Settings → Advanced → System → Use hardware acceleration</li>
                      <li>Firefox: Settings → Performance → Use recommended performance settings</li>
                      <li>Edge: Settings → System → Use hardware acceleration</li>
                    </ul>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom>
                      Quality Settings
                    </Typography>
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="body2">
                      Adjust visualization quality for better performance:
                    </Typography>
                    <ul>
                      <li>Lower particle count</li>
                      <li>Reduce texture resolution</li>
                      <li>Disable special effects</li>
                      <li>Use wireframe mode for large models</li>
                    </ul>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom>
                      Browser Settings
                    </Typography>
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="body2">
                      Optimize your browser for better performance:
                    </Typography>
                    <ul>
                      <li>Close unused tabs</li>
                      <li>Disable unnecessary extensions</li>
                      <li>Use a modern browser (Chrome, Firefox, Edge)</li>
                      <li>Update graphics drivers</li>
                    </ul>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        </TabPanel>
      </Paper>
    </Container>
  );
};

// Tab Panel component
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`visualization-debug-tabpanel-${index}`}
      aria-labelledby={`visualization-debug-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export default VisualizationDebugPage; 