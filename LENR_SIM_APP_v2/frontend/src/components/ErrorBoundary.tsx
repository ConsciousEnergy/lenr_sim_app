import React, { Component, ReactNode, ErrorInfo } from "react";
import { Box, Paper, Typography, Button, Collapse, Alert, AlertTitle } from '@mui/material';
import { Refresh as RefreshIcon, ExpandMore as ExpandMoreIcon, BugReport as BugIcon } from '@mui/icons-material';

interface ErrorBoundaryProps {
  fallback?: ReactNode;
  children: ReactNode;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

/**
 * Error boundary component to catch and handle React component errors
 * Provides a user-friendly error display with MUI components
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, showDetails: false };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("Error caught by ErrorBoundary:", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  handleReload = (): void => {
    window.location.reload();
  };

  toggleDetails = (): void => {
    this.setState(prev => ({ showDetails: !prev.showDetails }));
  };

  render(): ReactNode {
    const { hasError, error, errorInfo, showDetails } = this.state;
    const { fallback, children } = this.props;

    if (hasError) {
      if (fallback) return fallback;

      return (
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '60vh',
          p: 3 
        }}>
          <Paper sx={{ maxWidth: 600, p: 4, textAlign: 'center' }}>
            <BugIcon sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
            
            <Typography variant="h5" gutterBottom color="error">
              Something went wrong
            </Typography>
            
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              An unexpected error occurred. You can try refreshing the page or go back to the dashboard.
            </Typography>

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mb: 3 }}>
              <Button 
                variant="contained" 
                startIcon={<RefreshIcon />}
                onClick={this.handleReload}
              >
                Refresh Page
              </Button>
              <Button 
                variant="outlined"
                href="/dashboard"
              >
                Go to Dashboard
              </Button>
            </Box>

            <Button
              size="small"
              onClick={this.toggleDetails}
              endIcon={<ExpandMoreIcon sx={{ 
                transform: showDetails ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s'
              }} />}
            >
              {showDetails ? 'Hide' : 'Show'} Technical Details
            </Button>

            <Collapse in={showDetails}>
              <Alert severity="error" sx={{ mt: 2, textAlign: 'left' }}>
                <AlertTitle>Error Details</AlertTitle>
                <Typography variant="body2" component="pre" sx={{ 
                  whiteSpace: 'pre-wrap', 
                  wordBreak: 'break-word',
                  fontSize: '0.75rem',
                  maxHeight: 200,
                  overflow: 'auto'
                }}>
                  {error?.toString()}
                  {errorInfo?.componentStack && (
                    <>
                      {'\n\nComponent Stack:'}
                      {errorInfo.componentStack}
                    </>
                  )}
                </Typography>
              </Alert>
            </Collapse>
          </Paper>
        </Box>
      );
    }

    return children;
  }
}

export { ErrorBoundary };
export default ErrorBoundary;
