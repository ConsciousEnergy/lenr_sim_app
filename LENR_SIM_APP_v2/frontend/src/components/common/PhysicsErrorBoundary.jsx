/**
 * PhysicsErrorBoundary.jsx
 * 
 * Enhanced error boundary for physics visualization components.
 * Provides physics-specific error messages and fallback UI.
 * Captures Three.js/WebGL errors and physics calculation failures.
 */

import React from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Alert,
  AlertTitle,
  Collapse,
  IconButton,
  Chip,
  Divider,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import BugReportIcon from '@mui/icons-material/BugReport';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ScienceIcon from '@mui/icons-material/Science';
import ViewInArIcon from '@mui/icons-material/ViewInAr';

// Error categories with specific handling
const ERROR_CATEGORIES = {
  WEBGL: {
    pattern: /WebGL|GPU|CONTEXT_LOST|shader|buffer/i,
    title: 'WebGL/Graphics Error',
    icon: ViewInArIcon,
    color: 'error',
    description: 'A graphics rendering error occurred.',
    suggestions: [
      'Check if your browser supports WebGL',
      'Try refreshing the page',
      'Update your graphics drivers',
      'Reduce visualization quality settings',
    ],
  },
  THREE_JS: {
    pattern: /THREE|Object3D|Mesh|Geometry|Material|Scene|Camera|Renderer/i,
    title: 'Visualization Error',
    icon: ViewInArIcon,
    color: 'warning',
    description: '3D visualization encountered an issue.',
    suggestions: [
      'Reduce the number of particles',
      'Disable complex visual effects',
      'Try a simpler visualization mode',
    ],
  },
  PHYSICS_CALC: {
    pattern: /NaN|Infinity|overflow|underflow|convergence|numerical|calculation|physics/i,
    title: 'Physics Calculation Error',
    icon: ScienceIcon,
    color: 'warning',
    description: 'A physics calculation produced invalid results.',
    suggestions: [
      'Check simulation parameters for extreme values',
      'Reduce time step size for better numerical stability',
      'Verify input values are within physical bounds',
      'Try reducing complexity of the simulation',
    ],
  },
  MEMORY: {
    pattern: /memory|heap|allocation|out of memory|OOM/i,
    title: 'Memory Error',
    icon: WarningAmberIcon,
    color: 'error',
    description: 'The simulation ran out of memory.',
    suggestions: [
      'Reduce particle count',
      'Lower simulation resolution',
      'Close other browser tabs',
      'Try reducing time step count',
    ],
  },
  NETWORK: {
    pattern: /fetch|network|connection|timeout|CORS|API/i,
    title: 'Network Error',
    icon: WarningAmberIcon,
    color: 'warning',
    description: 'Failed to communicate with the simulation server.',
    suggestions: [
      'Check your internet connection',
      'Verify the backend server is running',
      'Try refreshing the page',
    ],
  },
  GENERIC: {
    pattern: /.*/,
    title: 'Simulation Error',
    icon: BugReportIcon,
    color: 'error',
    description: 'An unexpected error occurred.',
    suggestions: [
      'Try refreshing the page',
      'Check the browser console for details',
      'Report this issue if it persists',
    ],
  },
};

/**
 * Categorize error by examining error message and stack
 */
function categorizeError(error) {
  const errorText = `${error.message || ''} ${error.stack || ''}`;
  
  for (const [key, category] of Object.entries(ERROR_CATEGORIES)) {
    if (key !== 'GENERIC' && category.pattern.test(errorText)) {
      return { key, ...category };
    }
  }
  
  return { key: 'GENERIC', ...ERROR_CATEGORIES.GENERIC };
}

/**
 * Extract physics context from error
 */
function extractPhysicsContext(error, componentStack) {
  const context = {
    component: null,
    lastParams: null,
    possibleCause: null,
  };
  
  // Try to extract component name from stack
  const componentMatch = componentStack?.match(/in (\w+)/);
  if (componentMatch) {
    context.component = componentMatch[1];
  }
  
  // Check for specific physics-related issues
  if (/temperature|T_max|T_min/i.test(error.message)) {
    context.possibleCause = 'Temperature parameter out of valid range';
  } else if (/pressure|P_max|collapse/i.test(error.message)) {
    context.possibleCause = 'Pressure calculation exceeded physical limits';
  } else if (/radius|R_min|bubble/i.test(error.message)) {
    context.possibleCause = 'Bubble radius became invalid during collapse';
  } else if (/enhancement|tunneling/i.test(error.message)) {
    context.possibleCause = 'Enhancement factor calculation overflow';
  }
  
  return context;
}

/**
 * PhysicsErrorBoundary Component
 */
class PhysicsErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      category: null,
      physicsContext: null,
      showDetails: false,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error) {
    // Update state to render fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details
    console.error('PhysicsErrorBoundary caught an error:', error, errorInfo);
    
    // Categorize the error
    const category = categorizeError(error);
    const physicsContext = extractPhysicsContext(error, errorInfo.componentStack);
    
    this.setState({
      errorInfo,
      category,
      physicsContext,
    });
    
    // Call error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo, category);
    }
    
    // Report to external service if configured
    if (this.props.reportError) {
      this.props.reportError({
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        category: category.key,
        physicsContext,
        timestamp: new Date().toISOString(),
      });
    }
  }

  handleRetry = () => {
    const { maxRetries = 3 } = this.props;
    const { retryCount } = this.state;
    
    if (retryCount < maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        category: null,
        physicsContext: null,
        retryCount: prevState.retryCount + 1,
      }));
    }
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      category: null,
      physicsContext: null,
      showDetails: false,
      retryCount: 0,
    });
    
    // Call reset handler if provided
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  toggleDetails = () => {
    this.setState(prevState => ({
      showDetails: !prevState.showDetails,
    }));
  };

  render() {
    const { hasError, error, errorInfo, category, physicsContext, showDetails, retryCount } = this.state;
    const { children, fallback, maxRetries = 3, componentName = 'Physics Visualization' } = this.props;

    if (hasError) {
      // If a custom fallback is provided, use it
      if (fallback) {
        return fallback({ error, errorInfo, category, retry: this.handleRetry, reset: this.handleReset });
      }

      const CategoryIcon = category?.icon || BugReportIcon;
      const canRetry = retryCount < maxRetries;

      return (
        <Card 
          sx={{ 
            m: 2, 
            borderLeft: `4px solid`,
            borderColor: `${category?.color || 'error'}.main`,
          }}
        >
          <CardContent>
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <CategoryIcon 
                sx={{ 
                  fontSize: 40, 
                  mr: 2, 
                  color: `${category?.color || 'error'}.main` 
                }} 
              />
              <Box>
                <Typography variant="h5" component="h2">
                  {category?.title || 'Error'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  in {componentName}
                </Typography>
              </Box>
              {retryCount > 0 && (
                <Chip 
                  label={`Retry ${retryCount}/${maxRetries}`} 
                  size="small" 
                  sx={{ ml: 'auto' }} 
                />
              )}
            </Box>

            {/* Alert */}
            <Alert severity={category?.color || 'error'} sx={{ mb: 2 }}>
              <AlertTitle>{category?.description}</AlertTitle>
              {error?.message || 'An unexpected error occurred'}
            </Alert>

            {/* Physics Context */}
            {physicsContext?.possibleCause && (
              <Alert severity="info" sx={{ mb: 2 }}>
                <AlertTitle>Possible Cause</AlertTitle>
                {physicsContext.possibleCause}
              </Alert>
            )}

            {/* Suggestions */}
            {category?.suggestions && category.suggestions.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Suggested Actions:
                </Typography>
                <Box component="ul" sx={{ pl: 2, m: 0 }}>
                  {category.suggestions.map((suggestion, index) => (
                    <Typography 
                      key={index} 
                      component="li" 
                      variant="body2" 
                      color="text.secondary"
                      sx={{ mb: 0.5 }}
                    >
                      {suggestion}
                    </Typography>
                  ))}
                </Box>
              </Box>
            )}

            {/* Expandable Technical Details */}
            <Divider sx={{ my: 2 }} />
            
            <Box 
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                cursor: 'pointer' 
              }}
              onClick={this.toggleDetails}
            >
              <Typography variant="subtitle2">
                Technical Details
              </Typography>
              <IconButton size="small">
                {showDetails ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
            </Box>

            <Collapse in={showDetails}>
              <Box 
                sx={{ 
                  mt: 1, 
                  p: 2, 
                  bgcolor: 'grey.100', 
                  borderRadius: 1,
                  overflow: 'auto',
                  maxHeight: 300,
                }}
              >
                <Typography variant="caption" component="pre" sx={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                  Error: {error?.message}
                  {'\n\n'}
                  Stack: {error?.stack}
                  {'\n\n'}
                  Component Stack: {errorInfo?.componentStack}
                </Typography>
              </Box>
            </Collapse>
          </CardContent>

          <CardActions sx={{ justifyContent: 'flex-end', p: 2 }}>
            {canRetry && (
              <Button
                startIcon={<RefreshIcon />}
                variant="contained"
                color="primary"
                onClick={this.handleRetry}
              >
                Retry ({maxRetries - retryCount} remaining)
              </Button>
            )}
            <Button
              variant="outlined"
              onClick={this.handleReset}
            >
              Reset Component
            </Button>
          </CardActions>
        </Card>
      );
    }

    return children;
  }
}

PhysicsErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired,
  fallback: PropTypes.func,
  onError: PropTypes.func,
  onReset: PropTypes.func,
  reportError: PropTypes.func,
  maxRetries: PropTypes.number,
  componentName: PropTypes.string,
};

export default PhysicsErrorBoundary;
