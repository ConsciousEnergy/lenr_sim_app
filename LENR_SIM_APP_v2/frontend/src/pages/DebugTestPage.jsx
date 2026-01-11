import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Card, 
  CardContent, 
  CardHeader, 
  Button, 
  Box, 
  Paper, 
  FormControlLabel,
  Switch,
  Divider
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { usePhysics } from '../contexts/PhysicsContext';

// Import visualization components for testing
// Use dynamic imports to prevent crash if component fails
const UnifiedLENRVisualizerImport = React.lazy(() => 
  import('../components/visualization/UnifiedLENRVisualizer'));

// Styled component for the test container
const TestContainer = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  marginBottom: theme.spacing(3),
  border: '1px solid #ddd',
  borderRadius: 4,
  position: 'relative',
  minHeight: '400px'
}));

// Mock data for testing
const getMockPhysicsData = () => ({
  latticeData: {
    material: 'palladium',
    temperature: 300,
    pressure: 101325,
    atoms: [],
    lattice_constant: 3.89e-10
  },
  fusionData: {
    events: [
      { pos: [0, 0, 0], intensity: 50, type: 'fusion' },
      { pos: [2, 0, 1], intensity: 75, type: 'fusion' },
      { pos: [-1, 2, -1], intensity: 30, type: 'fusion' }
    ]
  },
  enhancementData: {
    enhancementFactor: 2.5,
    coherenceFactor: 0.8,
    phononAssist: 1.1,
    activeRegions: 8,
    maxTemperature: 350
  }
});

// Component for testing a visualization in isolation
const VisualizationTest = ({ title, component: Component, useRealContext = true }) => {
  const [debugMode, setDebugMode] = useState(true);
  const [useMockData, setUseMockData] = useState(!useRealContext);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Optional real context data - will use mock if real context fails
  const contextData = usePhysics();
  
  const testVisualization = async () => {
    setIsLoading(true);
    setHasError(false);
    setErrorMessage('');
    
    try {
      // Simulate loading delay
      await new Promise(resolve => setTimeout(resolve, 500));
      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
      setHasError(true);
      setErrorMessage(error.message || 'Unknown error');
    }
  };
  
  return (
    <TestContainer>
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
          <Box sx={{ flex: '1 1 400px', minWidth: 0 }}>
            <Typography variant="h6">{title}</Typography>
          </Box>
          <Box sx={{ flex: '0 0 auto' }}>
            <FormControlLabel
              control={
                <Switch 
                  checked={debugMode}
                  onChange={(e) => setDebugMode(e.target.checked)}
                />
              }
              label="Debug Mode"
            />
          </Box>
          <Box sx={{ flex: '0 0 auto' }}>
            <FormControlLabel
              control={
                <Switch 
                  checked={useMockData}
                  onChange={(e) => setUseMockData(e.target.checked)}
                />
              }
              label="Use Mock Data"
            />
          </Box>
        </Box>
        <Divider sx={{ my: 1 }} />
        <Button 
          variant="contained" 
          color="primary" 
          onClick={testVisualization}
          disabled={isLoading}
          sx={{ mr: 1 }}
        >
          {isLoading ? 'Testing...' : 'Test Component'}
        </Button>
        
        <Button 
          variant="outlined" 
          color="secondary" 
          onClick={() => setHasError(true)}
        >
          Simulate Error
        </Button>
      </Box>
      
      <Box sx={{ height: 500, border: '1px dashed #ccc' }}>
        <ErrorBoundary
          fallback={
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography color="error" variant="h6">Component Error!</Typography>
              <Typography>{errorMessage || 'The visualization component failed to render'}</Typography>
            </Box>
          }
        >
          {hasError ? (
            // Deliberately throw an error if hasError is true
            (() => { throw new Error(errorMessage || 'Simulated visualization error'); })()
          ) : (
            <React.Suspense fallback={<Box sx={{ p: 3, textAlign: 'center' }}>Loading visualization component...</Box>}>
              {Component && <Component 
                debugMode={debugMode} 
                mockData={useMockData ? getMockPhysicsData() : null}
              />}
            </React.Suspense>
          )}
        </ErrorBoundary>
      </Box>
    </TestContainer>
  );
};

// Debug console component
const DebugConsole = () => {
  const [logs, setLogs] = useState([]);
  
  useEffect(() => {
    // Override console methods to capture logs
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;
    
    // Add timestamp to logs
    const addLog = (type, ...args) => {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');
      
      setLogs(prev => [
        ...prev, 
        { 
          type, 
          message, 
          timestamp: new Date().toISOString().split('T')[1].split('.')[0] 
        }
      ]);
    };
    
    console.log = (...args) => {
      originalConsoleLog.apply(console, args);
      addLog('log', ...args);
    };
    
    console.error = (...args) => {
      originalConsoleError.apply(console, args);
      addLog('error', ...args);
    };
    
    console.warn = (...args) => {
      originalConsoleWarn.apply(console, args);
      addLog('warn', ...args);
    };
    
    return () => {
      // Restore original console methods
      console.log = originalConsoleLog;
      console.error = originalConsoleError;
      console.warn = originalConsoleWarn;
    };
  }, []);
  
  return (
    <Card>
      <CardHeader 
        title="Debug Console" 
        action={
          <Button size="small" onClick={() => setLogs([])}>
            Clear
          </Button>
        }
      />
      <CardContent sx={{ maxHeight: 300, overflow: 'auto' }}>
        {logs.length === 0 ? (
          <Typography color="textSecondary">No logs yet...</Typography>
        ) : (
          logs.map((log, index) => (
            <Box 
              key={index} 
              sx={{ 
                py: 0.5, 
                borderBottom: '1px solid #eee',
                color: log.type === 'error' ? 'error.main' : 
                       log.type === 'warn' ? 'warning.main' : 'inherit'
              }}
            >
              <Typography variant="caption" sx={{ mr: 1, opacity: 0.7 }}>
                [{log.timestamp}]
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 'bold', mr: 1 }}>
                {log.type.toUpperCase()}:
              </Typography>
              <Typography variant="body2" component="span">
                {log.message}
              </Typography>
            </Box>
          ))
        )}
      </CardContent>
    </Card>
  );
};

// Main debug test page
const DebugTestPage = () => {
  const [webGLInfo, setWebGLInfo] = useState(null);
  
  useEffect(() => {
    // Check WebGL capabilities
    const checkWebGL = () => {
      try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl2') || 
                  canvas.getContext('webgl') || 
                  canvas.getContext('experimental-webgl');
        
        if (!gl) {
          return { supported: false, message: 'WebGL not supported in this browser' };
        }
        
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        
        return {
          supported: true,
          version: gl.getParameter(gl.VERSION),
          vendor: debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : 'Unknown',
          renderer: debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'Unknown',
          shaderVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
          maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE)
        };
      } catch (e) {
        return { supported: false, message: e.message };
      }
    };
    
    setWebGLInfo(checkWebGL());
  }, []);

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Debug Test Page
      </Typography>
      <Typography variant="subtitle1" paragraph>
        Use this page to test visualization components in isolation
      </Typography>
      
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
        <Box sx={{ flex: '1 1 500px', minWidth: 0 }}>
          <Card sx={{ mb: 3 }}>
            <CardHeader title="System Information" />
            <CardContent>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                <Box sx={{ flex: '1 1 300px', minWidth: 0 }}>
                  <Typography variant="subtitle2">Browser Information</Typography>
                  <Typography variant="body2">
                    User Agent: {navigator.userAgent}
                  </Typography>
                </Box>
                
                <Box sx={{ flex: '1 1 300px', minWidth: 0 }}>
                  <Typography variant="subtitle2">WebGL Information</Typography>
                  {webGLInfo ? (
                    webGLInfo.supported ? (
                      <>
                        <Typography variant="body2">
                          Status: <Box component="span" sx={{ color: 'success.main' }}>Supported</Box>
                        </Typography>
                        <Typography variant="body2">Version: {webGLInfo.version}</Typography>
                        <Typography variant="body2">Vendor: {webGLInfo.vendor}</Typography>
                        <Typography variant="body2">Renderer: {webGLInfo.renderer}</Typography>
                        <Typography variant="body2">Shader Version: {webGLInfo.shaderVersion}</Typography>
                        <Typography variant="body2">Max Texture Size: {webGLInfo.maxTextureSize}</Typography>
                      </>
                    ) : (
                      <Typography variant="body2" color="error">
                        Not Supported: {webGLInfo.message}
                      </Typography>
                    )
                  ) : (
                    <Typography variant="body2">Checking WebGL support...</Typography>
                  )}
                </Box>
              </Box>
            </CardContent>
          </Card>
          
          <Typography variant="h6" gutterBottom>
            Component Tests
          </Typography>
          
          <VisualizationTest 
            title="UnifiedLENRVisualizer Component Test" 
            component={UnifiedLENRVisualizerImport}
            useRealContext={true}
          />
          
        </Box>
        
        <Box sx={{ flex: '1 1 300px', minWidth: 0 }}>
          <DebugConsole />
        </Box>
      </Box>
    </Container>
  );
};

export default DebugTestPage; 