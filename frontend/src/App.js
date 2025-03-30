import React, { useState, useEffect } from 'react';
import { CssBaseline, Container, Box, Typography, CircularProgress } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import theme from './theme';
import './App.css';

// Will import actual components as they're developed
// import ParameterPanel from './components/ParameterPanel';
// import Cluster3D from './components/Cluster3D';
// import Uploader from './components/Uploader';

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [serverStatus, setServerStatus] = useState('Checking...');

  useEffect(() => {
    // Check if backend is reachable
    const checkBackendStatus = async () => {
      try {
        const response = await fetch('/health');
        const data = await response.json();
        if (data.status === 'healthy') {
          setServerStatus('Connected');
        } else {
          setServerStatus('Available, but reporting issues');
        }
      } catch (error) {
        setServerStatus('Unavailable');
        console.error('Failed to connect to backend:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkBackendStatus();
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="lg" className="app-container">
        <Box sx={{ my: 4 }} className="app-header">
          <Typography variant="h2" component="h1" gutterBottom align="center" className="app-title">
            LENR Simulation App
          </Typography>
          
          <Box sx={{ my: 2, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary">
              Backend Status: {' '}
              {isLoading ? (
                <CircularProgress size={20} sx={{ ml: 1, verticalAlign: 'middle' }} />
              ) : (
                <span className={`status-indicator ${
                  serverStatus === 'Connected' ? 'connected' : 
                  serverStatus === 'Unavailable' ? 'error' : 'warning'
                }`}>
                  {serverStatus}
                </span>
              )}
            </Typography>
          </Box>

          <Box sx={{ mt: 8, textAlign: 'center' }} className="hero-section">
            <Typography variant="h4" gutterBottom>
              Welcome to the LENR Simulation Application
            </Typography>
            <Typography variant="body1" paragraph>
              This application provides tools for modeling Low Energy Nuclear Reactions 
              through quantum tunneling simulations, parameter adjustments, and 
              interactive visualizations.
            </Typography>
            <Typography variant="body1">
              The interface is currently under development. Please check back soon
              for the full interactive features.
            </Typography>
          </Box>
        </Box>
      </Container>
    </ThemeProvider>
  );
}

export default App; 