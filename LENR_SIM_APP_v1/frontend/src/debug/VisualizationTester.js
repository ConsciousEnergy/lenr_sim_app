import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Box, Typography, Paper, Button, Grid, Tabs, Tab, Alert, Divider, CircularProgress } from '@mui/material';
import ErrorBoundary from './ErrorBoundary';
import { useLogger } from '../contexts/LogContext';
import threeCleanup from '../utils/threeCleanup';

// Lazily load the heavy LatticeVisualization component
const LatticeVisualization = lazy(() => import('../components/visualization/LatticeVisualization'));

// Component that will intentionally throw an error
const ErrorThrower = ({ shouldThrow = false }) => {
  useEffect(() => {
    if (shouldThrow) {
      throw new Error('This is an intentional test error');
    }
  }, [shouldThrow]);
  
  return <div>This component will throw an error when triggered</div>;
};

// Simple loading component while visualization loads
const LoadingFallback = () => (
  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 4 }}>
    <CircularProgress />
    <Typography variant="body1" sx={{ mt: 2 }}>
      Loading visualization components...
    </Typography>
  </Box>
);

const VisualizationTester = () => {
  const logger = useLogger();
  const [activeTab, setActiveTab] = useState(0);
  const [error, setError] = useState(null);
  const [simulationData, setSimulationData] = useState(null);
  const [shouldThrowError, setShouldThrowError] = useState(false);
  const [isVisActive, setIsVisActive] = useState(false);

  // Sample simulation data for testing
  const sampleRydbergData = {
    type: 'rydberg',
    results: {
      rydbergEnergy: -13.6,
      rydbergRadius: 0.529e-10 * 5, // 5 times Bohr radius
      overlapProbability: 0.42,
      electricField: 1e8,
      crossSection: 3.14e-20
    }
  };

  useEffect(() => {
    logger.info('VisualizationTester mounted', {
      activeTab,
      hasSimulationData: !!simulationData
    });
    
    // Only set the visualization as active when this component is mounted
    // and we're not on the debug or error testing tabs
    setIsVisActive(activeTab < 2);
    
    return () => {
      logger.debug('VisualizationTester unmounting');
      // Clean up Three.js resources
      cleanupThreeJsResources();
    };
  }, [logger, activeTab, simulationData]);

  // When tab changes, update visualization active state
  useEffect(() => {
    setIsVisActive(activeTab < 2);
  }, [activeTab]);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    logger.debug('Tab changed', { newTab: newValue });
  };

  const handleReset = () => {
    logger.info('Reset visualization test');
    setError(null);
    setSimulationData(null);
    setShouldThrowError(false);
    
    // Force cleanup of any Three.js resources
    cleanupThreeJsResources();
  };

  // Function to clean up Three.js resources
  const cleanupThreeJsResources = () => {
    // Find and remove canvas elements
    const canvasElements = document.querySelectorAll('canvas');
    canvasElements.forEach(canvas => {
      if (canvas.parentNode) {
        threeCleanup.safeRemoveElement(canvas, 'VisualizationTester');
      }
    });
    
    // Force garbage collection
    if (window.gc) {
      try {
        window.gc();
      } catch (e) {
        // Ignore errors
      }
    }
    
    // Clear any Three.js related caches
    if (window.__THREE_OBJECT_CACHE__) window.__THREE_OBJECT_CACHE__ = {};
    if (window.__THREE_TEXTURE_CACHE__) window.__THREE_TEXTURE_CACHE__ = {};
    if (window.__THREE_SHADER_CACHE__) window.__THREE_SHADER_CACHE__ = {};
    
    logger.debug('Three.js resources cleaned up by VisualizationTester');
  };

  const handleLoadSampleData = () => {
    logger.info('Loading sample data');
    setSimulationData(sampleRydbergData);
  };

  const handleStartSimulation = () => {
    logger.info('Simulation started');
    console.log('Start simulation called');
  };

  const handleStopSimulation = () => {
    logger.info('Simulation stopped');
    console.log('Stop simulation called');
  };

  const handleError = (err) => {
    logger.error('Visualization component error', err.error, {
      componentStack: err.errorInfo.componentStack
    });
    console.error('Error in visualization:', err);
    setError(err.error.message || 'Unknown error in visualization component');
  };

  const triggerTestError = () => {
    logger.warn('Triggering test error');
    setShouldThrowError(true);
  };

  const triggerLogLevels = () => {
    logger.debug('This is a debug message', { source: 'VisualizationTester' });
    logger.info('This is an info message', { source: 'VisualizationTester' });
    logger.warn('This is a warning message', { source: 'VisualizationTester' });
    logger.error('This is an error message', new Error('Test error'));
    logger.info('All log levels triggered');
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Visualization Tester
      </Typography>

      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab label="Empty Props" />
          <Tab label="With Sample Data" />
          <Tab label="Debug View" />
          <Tab label="Error Testing" />
        </Tabs>
      </Paper>

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
            onClick={handleReset}
          >
            Reset
          </Button>
        </Grid>
        <Grid item>
          <Button 
            variant="contained" 
            color="secondary" 
            onClick={handleLoadSampleData}
          >
            Load Sample Data
          </Button>
        </Grid>
        <Grid item>
          <Button 
            variant="outlined" 
            color="info" 
            onClick={triggerLogLevels}
          >
            Test Logger
          </Button>
        </Grid>
        <Grid item>
          <Button 
            variant="outlined" 
            color="error" 
            onClick={triggerTestError}
          >
            Trigger Error
          </Button>
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Paper sx={{ p: 0, mb: 2 }}>
            <ErrorBoundary 
              onError={handleError}
              componentName="VisualizationTester"
            >
              {isVisActive && (
                <Suspense fallback={<LoadingFallback />}>
                  {activeTab === 0 && (
                    <LatticeVisualization 
                      onStartSimulation={handleStartSimulation}
                      onStopSimulation={handleStopSimulation}
                    />
                  )}
                  {activeTab === 1 && (
                    <LatticeVisualization 
                      simulationData={simulationData} 
                      onStartSimulation={handleStartSimulation}
                      onStopSimulation={handleStopSimulation}
                    />
                  )}
                </Suspense>
              )}
              {activeTab === 2 && (
                <Box sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>Debug Information</Typography>
                  <Typography variant="body2" component="pre" sx={{ 
                    backgroundColor: '#f5f5f5', 
                    p: 2, 
                    borderRadius: 1,
                    overflowX: 'auto'
                  }}>
                    {JSON.stringify(simulationData, null, 2)}
                  </Typography>
                </Box>
              )}
              {activeTab === 3 && (
                <Box sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>Error Testing</Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Typography variant="body2" gutterBottom>
                    This tab allows you to test error handling and logging in the application.
                    Click the "Trigger Error" button to simulate a component error.
                  </Typography>
                  
                  <Box sx={{ mt: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                    <ErrorThrower shouldThrow={shouldThrowError} />
                  </Box>
                </Box>
              )}
            </ErrorBoundary>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default VisualizationTester; 