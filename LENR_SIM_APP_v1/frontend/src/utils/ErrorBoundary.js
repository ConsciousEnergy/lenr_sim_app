import React from 'react';
import { Typography, Box, Button, Paper } from '@mui/material';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null 
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
    
    // Log the error to console
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
    
    // You can also log to an error reporting service here
  }

  handleReset = () => {
    this.setState({ 
      hasError: false,
      error: null,
      errorInfo: null
    });
    
    // Attempt to recover by reloading the page
    window.location.href = '/';
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '100vh', 
          p: 3 
        }}>
          <Paper sx={{ p: 4, maxWidth: 800, width: '100%' }}>
            <Typography variant="h4" color="error" gutterBottom>
              Something went wrong
            </Typography>
            
            <Typography variant="body1" paragraph>
              There was an error rendering this part of the application.
            </Typography>
            
            {this.state.error && (
              <Box sx={{ mt: 2, mb: 3, overflow: 'auto', maxHeight: 200 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Error details:
                </Typography>
                <Typography 
                  variant="body2" 
                  component="pre" 
                  sx={{ 
                    p: 2, 
                    bgcolor: 'rgba(0,0,0,0.05)', 
                    borderRadius: 1,
                    whiteSpace: 'pre-wrap',
                    overflow: 'auto'
                  }}
                >
                  {this.state.error.toString()}
                </Typography>
              </Box>
            )}
            
            <Button 
              variant="contained" 
              color="primary" 
              onClick={this.handleReset}
            >
              Return to Dashboard
            </Button>
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
} 