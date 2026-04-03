import React, { Component, useEffect, useState } from 'react';
import { Typography, Button, Box, Alert, Paper } from '@mui/material';

/**
 * Error boundary component specifically for Three.js and WebGL related errors.
 * This captures rendering errors and provides fallback UI.
 */
class ThreeJsErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(_error) {
    // Update state to trigger fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error information
    console.error('ThreeJS Error:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });

    // Store error in window for debugging tools
    if (!window.threeJSErrors) {
      window.threeJSErrors = [];
    }
    window.threeJSErrors.push({ error, errorInfo, timestamp: new Date() });
    window.threeJSErrorsDetected = true;

    // Report to any error tracking service if available
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ? (
        this.props.fallback(this.state.error, this.state.errorInfo)
      ) : (
        <Paper sx={{ p: 3, m: 2, bgcolor: '#fff8f8', color: '#d32f2f', border: '1px solid #ffcdd2' }}>
          <Typography variant="h6" gutterBottom>
            Visualization Error
          </Typography>
          <Typography variant="body2" paragraph>
            There was an error rendering the 3D visualization. This may be due to WebGL limitations or compatibility issues.
          </Typography>
          
          {this.state.error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {this.state.error.toString()}
            </Alert>
          )}
          
          <Button 
            variant="outlined" 
            color="error" 
            onClick={() => this.setState({ hasError: false })}
          >
            Try Again
          </Button>
        </Paper>
      );
    }

    return this.props.children;
  }
}

/**
 * Monitors for ThreeJS and WebGL related errors by intercepting console methods.
 * This is useful for detecting issues that don't cause crashes but may affect rendering.
 */
const ThreeJsErrorMonitor = ({ children, onDetectError }) => {
  const [_errors, setErrors] = useState([]);
  const [_warnings, setWarnings] = useState([]);

  useEffect(() => {
    // Track if component is mounted
    let isMounted = true;
    
    // Setup global error detection
    window.threeJSErrorsDetected = false;
    window.threeJSErrors = [];
    window.webGLErrors = [];

    // Save original console methods
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;

    // Helper to determine if an error is related to ThreeJS or WebGL
    const isThreeJsOrWebGLError = (args) => {
      const errorString = args.map(arg => 
        typeof arg === 'string' ? arg : (arg instanceof Error ? arg.message : JSON.stringify(arg))
      ).join(' ');
      
      const threeJsKeywords = ['three', 'threejs', 'webgl', 'renderer', 'context', 'shader', 'canvas', 'texture', 'gl'];
      return threeJsKeywords.some(keyword => errorString.toLowerCase().includes(keyword));
    };

    // Patch console.error
    console.error = (...args) => {
      // Call original method
      originalConsoleError.apply(console, args);

      // Check if this is a ThreeJS or WebGL related error
      if (isThreeJsOrWebGLError(args)) {
        const error = {
          message: args.map(arg => 
            typeof arg === 'string' ? arg : (arg instanceof Error ? arg.message : JSON.stringify(arg))
          ).join(' '),
          timestamp: new Date()
        };

        // Store for global access
        window.threeJSErrors.push(error);
        window.threeJSErrorsDetected = true;

        // Update component state if still mounted
        if (isMounted) {
          setErrors(prev => [...prev, error]);
          if (onDetectError) onDetectError('error', error);
        }
      }
    };

    // Patch console.warn
    console.warn = (...args) => {
      // Call original method
      originalConsoleWarn.apply(console, args);

      // Check if this is a ThreeJS or WebGL related warning
      if (isThreeJsOrWebGLError(args)) {
        const warning = {
          message: args.map(arg => 
            typeof arg === 'string' ? arg : (arg instanceof Error ? arg.message : JSON.stringify(arg))
          ).join(' '),
          timestamp: new Date()
        };

        // Update component state if still mounted
        if (isMounted) {
          setWarnings(prev => [...prev, warning]);
          if (onDetectError) onDetectError('warning', warning);
        }
      }
    };

    // Listen for WebGL context lost events on all canvases
    const handleContextLost = (e) => {
      e.preventDefault();
      const error = {
        message: 'WebGL context lost. This may indicate a driver or browser issue.',
        timestamp: new Date(),
        target: e.target
      };
      
      window.webGLErrors.push(error);
      
      if (isMounted) {
        setErrors(prev => [...prev, error]);
        if (onDetectError) onDetectError('error', error);
      }
    };

    // Find all canvases and add listeners
    const canvases = document.querySelectorAll('canvas');
    canvases.forEach(canvas => {
      canvas.addEventListener('webglcontextlost', handleContextLost);
    });

    // Cleanup
    return () => {
      isMounted = false;
      
      // Restore original console methods
      console.error = originalConsoleError;
      console.warn = originalConsoleWarn;
      
      // Remove canvas listeners
      canvases.forEach(canvas => {
        canvas.removeEventListener('webglcontextlost', handleContextLost);
      });
    };
  }, [onDetectError]);

  return children;
};

/**
 * Combined error handler component for ThreeJS/WebGL that provides both
 * error boundary functionality and error monitoring.
 */
const ThreeJsErrorHandler = ({ children, onError, fallback }) => {
  const [hasMonitoredErrors, setHasMonitoredErrors] = useState(false);
  
  const handleDetectedError = (type, error) => {
    setHasMonitoredErrors(true);
    if (onError) {
      onError(error, { type });
    }
  };
  
  return (
    <ThreeJsErrorBoundary onError={onError} fallback={fallback}>
      <ThreeJsErrorMonitor onDetectError={handleDetectedError}>
        {children}
        
        {/* Only render warning if non-fatal errors were detected */}
        {hasMonitoredErrors && (
          <Box sx={{ mt: 2, p: 1.5, bgcolor: '#fff3e0', borderRadius: 1, fontSize: '0.875rem' }}>
            <Typography variant="body2" color="warning.main">
              WebGL/Three.js warnings were detected. Performance may be affected.
            </Typography>
          </Box>
        )}
      </ThreeJsErrorMonitor>
    </ThreeJsErrorBoundary>
  );
};

export { ThreeJsErrorBoundary, ThreeJsErrorMonitor };
export default ThreeJsErrorHandler; 