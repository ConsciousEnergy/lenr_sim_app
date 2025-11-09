import React, { useState, useEffect, useRef } from 'react';
import { Box, FormControl, InputLabel, Select, MenuItem, Alert, Button, Stack, CircularProgress } from '@mui/material';
import UnifiedLENRVisualizer from './UnifiedLENRVisualizer';
import SimplifiedLatticeVisualizer from './SimplifiedLatticeVisualizer';
import { optimizeRenderer, optimizeScene } from '../../visualization/utils/renderingOptimizations';

/**
 * A component that allows users to switch between different visualization types
 * based on their device capability and performance needs.
 */
const VisualizationSwitcher = ({ 
  simulationData, 
  loading, 
  onRefresh, 
  optimizeRendering = false,
  containerRef,
  onRenderingStart,
  onRenderingComplete
}) => {
  const [visualizationType, setVisualizationType] = useState('2d');
  const [hasWebGLSupport, setHasWebGLSupport] = useState(true);
  const [hasPerformanceIssue, setHasPerformanceIssue] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [isRecovering, setIsRecovering] = useState(false);
  const [renderStartTime, setRenderStartTime] = useState(0);
  const [renderingTimeWarning, setRenderingTimeWarning] = useState(false);
  const visualizerRef = useRef(null);

  // Check for WebGL support
  useEffect(() => {
    const checkWebGLSupport = () => {
      try {
        const canvas = document.createElement('canvas');
        const support = !!(
          window.WebGLRenderingContext && 
          (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
        );
        setHasWebGLSupport(support);
        
        if (!support) {
          console.warn('WebGL is not supported in this browser');
        }
        
        return support;
      } catch (e) {
        console.error('Error checking WebGL support:', e);
        setHasWebGLSupport(false);
        return false;
      }
    };
    
    checkWebGLSupport();
  }, []);
  
  // Monitor rendering performance
  useEffect(() => {
    let frameRateMonitor;
    let lowFPSCounter = 0;
    let lastFrameTime = 0;
    let frameTimesQueue = [];
    const QUEUE_SIZE = 30; // track 30 frames
    const FPS_THRESHOLD = 20; // 20 FPS threshold for performance warning
    
    if (visualizationType === '3d' && hasWebGLSupport && simulationData) {
      // Start monitoring framerate
      if (onRenderingStart) onRenderingStart();
      setRenderStartTime(performance.now());
      
      const checkFrameRate = () => {
        const now = performance.now();
        
        if (lastFrameTime > 0) {
          const frameTime = now - lastFrameTime;
          const fps = 1000 / frameTime;
          
          // Add to queue
          frameTimesQueue.push(fps);
          if (frameTimesQueue.length > QUEUE_SIZE) {
            frameTimesQueue.shift();
          }
          
          // Calculate average FPS
          if (frameTimesQueue.length >= 10) {
            const avgFPS = frameTimesQueue.reduce((sum, fps) => sum + fps, 0) / frameTimesQueue.length;
            
            if (avgFPS < FPS_THRESHOLD) {
              lowFPSCounter++;
              if (lowFPSCounter >= 5) {
                // Persistent low FPS
                setHasPerformanceIssue(true);
                setRenderingTimeWarning(true);
              }
            } else {
              lowFPSCounter = 0;
            }
            
            // Check render time
            const totalRenderTime = performance.now() - renderStartTime;
            if (totalRenderTime > 5000 && !renderingTimeWarning) {
              // Rendering is taking too long
              setRenderingTimeWarning(true);
            }
          }
        }
        
        lastFrameTime = now;
        frameRateMonitor = requestAnimationFrame(checkFrameRate);
      };
      
      frameRateMonitor = requestAnimationFrame(checkFrameRate);
      
      return () => {
        if (frameRateMonitor) {
          cancelAnimationFrame(frameRateMonitor);
        }
        if (onRenderingComplete) onRenderingComplete();
      };
    }
    
    return () => {
      if (frameRateMonitor) {
        cancelAnimationFrame(frameRateMonitor);
      }
    };
  }, [visualizationType, hasWebGLSupport, simulationData, onRenderingStart, onRenderingComplete]);
  
  // Handle visualization type change
  const handleVisualizationTypeChange = (event) => {
    // Reset performance warning
    setHasPerformanceIssue(false);
    setRenderingTimeWarning(false);
    setVisualizationType(event.target.value);
  };
  
  // Handle fallback to 2D in case of errors
  const handleVisualizationError = (error) => {
    console.error('Visualization error:', error);
    
    if (visualizationType === '3d' && retryCount < 2) {
      // Try to recover by doing a final retry for 3D
      setIsRecovering(true);
      setRetryCount(prevCount => prevCount + 1);
      
      setTimeout(() => {
        setIsRecovering(false);
      }, 2000);
    } else {
      // Fall back to 2D after multiple 3D failures
      console.warn('Falling back to 2D visualization due to repeated errors');
      setVisualizationType('2d');
      setHasPerformanceIssue(true);
    }
  };
  
  // Apply optimizations to the visualizer
  const applyOptimizations = (renderer, scene) => {
    if (optimizeRendering || hasPerformanceIssue) {
      if (renderer) optimizeRenderer(renderer);
      if (scene) optimizeScene(scene);
      return true;
    }
    return false;
  };
  
  // Render the visualizer
  const renderVisualizer = () => {
    if (loading || isRecovering) {
      return (
        <Box display="flex" justifyContent="center" alignItems="center" height="100%" width="100%">
          <CircularProgress id="visualizer-loading-indicator" aria-label="Loading visualization" />
        </Box>
      );
    }
    
    if (!simulationData) {
      return (
        <Box 
          display="flex" 
          justifyContent="center" 
          alignItems="center" 
          height="100%" 
          width="100%"
          flexDirection="column"
        >
          <Alert 
            severity="info" 
            id="no-data-alert"
            sx={{ mb: 2 }}
          >
            No simulation data available to visualize.
          </Alert>
          <Button 
            variant="contained" 
            onClick={onRefresh}
            id="load-data-button"
          >
            Load Data
          </Button>
        </Box>
      );
    }
    
    switch (visualizationType) {
      case '3d':
        return hasWebGLSupport ? (
          <UnifiedLENRVisualizer
            ref={visualizerRef}
            data={simulationData}
            onError={handleVisualizationError}
            applyOptimizations={applyOptimizations}
          />
        ) : (
          <Box>
            <Alert 
              severity="warning" 
              id="webgl-not-supported-alert"
            >
              3D visualization requires WebGL, which is not supported by your browser. 
              Using 2D visualization instead.
            </Alert>
            <SimplifiedLatticeVisualizer 
              data={simulationData} 
            />
          </Box>
        );
      case '2d':
      default:
        return (
          <SimplifiedLatticeVisualizer 
            data={simulationData}
          />
        );
    }
  };

  return (
    <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 2, borderBottom: '1px solid rgba(0, 0, 0, 0.1)' }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <FormControl sx={{ minWidth: 200 }} size="small" id="visualization-type-control">
            <InputLabel id="visualization-type-label" htmlFor="visualization-type-select">Visualization Type</InputLabel>
            <Select
              labelId="visualization-type-label"
              id="visualization-type-select"
              value={visualizationType}
              label="Visualization Type"
              onChange={handleVisualizationTypeChange}
              name="visualization-type"
              aria-labelledby="visualization-type-label"
              disabled={loading || isRecovering}
            >
              <MenuItem id="visualization-type-3d" value="3d">3D Visualization</MenuItem>
              <MenuItem id="visualization-type-2d" value="2d">2D Simplified View</MenuItem>
            </Select>
          </FormControl>
          
          {hasPerformanceIssue && (
            <Alert 
              severity="warning" 
              id="performance-issue-alert"
              sx={{ 
                py: 0.5, 
                flexGrow: 1 
              }}
            >
              Performance issues detected. Consider using 2D view for better performance.
            </Alert>
          )}
          
          {renderingTimeWarning && !hasPerformanceIssue && (
            <Alert 
              severity="info" 
              id="rendering-time-warning"
              sx={{ 
                py: 0.5, 
                flexGrow: 1 
              }}
            >
              Complex visualization may affect performance. Optimizations applied.
            </Alert>
          )}
        </Stack>
      </Box>
      
      <Box sx={{ flexGrow: 1, position: 'relative', overflow: 'hidden' }}>
        {renderVisualizer()}
      </Box>
    </Box>
  );
};

export default VisualizationSwitcher; 