import React from 'react';
import { Box, Typography, Paper, Grid, Divider, Alert } from '@mui/material';
import { styled } from '@mui/material/styles';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Styled components
const ResultCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: theme.palette.mode === 'dark' ? '#272727' : theme.palette.background.paper,
  boxShadow: theme.palette.mode === 'dark' ? '0 2px 8px rgba(0, 0, 0, 0.5)' : theme.shadows[2]
}));

const ResultValue = styled(Typography)(({ theme }) => ({
  fontWeight: 'bold',
  fontSize: '1.2rem',
  color: theme.palette.primary.main,
  marginBottom: theme.spacing(1),
  ...(theme.palette.mode === 'dark' && {
    color: theme.palette.primary.light, // Brighter color in dark mode for better contrast
  })
}));

const MetadataItem = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  padding: theme.spacing(0.75, 0),
  borderBottom: `1px solid ${theme.palette.divider}`
}));

// Safety utility function
const safeGet = (obj, path, defaultValue = undefined) => {
  try {
    if (!obj) return defaultValue;
    
    const value = path.split('.').reduce((o, key) => o && o[key] !== undefined ? o[key] : undefined, obj);
    return value !== undefined ? value : defaultValue;
  } catch (e) {
    return defaultValue;
  }
};

// Format scientific notation
const formatScientific = (value) => {
  // Handle null, undefined, or non-numeric values
  if (value === null || value === undefined || typeof value !== 'number' || isNaN(value)) {
    return 'N/A';
  }
  
  // Format numbers in scientific notation for better readability
  if (Math.abs(value) < 0.001 || Math.abs(value) > 1000) {
    return value.toExponential(3);
  }
  return value.toFixed(4);
};

const ResultsPanel = ({ results }) => {
  if (!results) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="body1" color="text.secondary">
          Run a simulation to see results here
        </Typography>
      </Box>
    );
  }

  // Check if we have the expected data structure
  const hasEnoughData = results && 
    (safeGet(results, 'config') || 
     safeGet(results, 'rydbergEnergy') || 
     safeGet(results, 'metadata'));

  if (!hasEnoughData) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="warning">
          Insufficient simulation data. Please ensure all parameters are set correctly.
        </Alert>
      </Box>
    );
  }
  
  // Create chart data based on available values
  // First check if we have energyLevels, if not create sample data
  let energyLevelData = [];
  if (safeGet(results, 'config.principalQuantumNumber')) {
    // Generate synthetic data if real data is missing
    const n = safeGet(results, 'config.principalQuantumNumber', 5);
    energyLevelData = Array.from({ length: n }, (_, i) => ({
      name: `n=${i+1}`,
      energy: -13.6 / ((i+1) * (i+1)) // Simple hydrogen model
    }));
  } else if (Array.isArray(safeGet(results, 'energyLevels'))) {
    // Use actual energy levels if available
    energyLevelData = results.energyLevels.map((level, index) => ({
      name: `Level ${index}`,
      energy: typeof level === 'number' ? level : 
              typeof level === 'object' && level.energy ? level.energy : 0
    }));
  }

  // Create chart for key metrics
  const keyMetricsData = [
    { name: 'Rydberg Energy', value: safeGet(results, 'rydbergEnergy', 0) },
    { name: 'Tunneling', value: safeGet(results, 'tunnelingEnhancement', 0) },
    { name: 'Electric Field', value: Math.log10(Math.abs(safeGet(results, 'electricField', 1))) } // Log scale for visuals
  ];

  return (
    <Box>
      <Grid container spacing={3}>
        {/* Key Metrics */}
        <Grid item xs={12} md={4}>
          <ResultCard>
            <Typography variant="h6" gutterBottom>
              Key Results
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Rydberg Energy
              </Typography>
              <ResultValue>
                {formatScientific(safeGet(results, 'rydbergEnergy'))} eV
              </ResultValue>
            </Box>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Electric Field
              </Typography>
              <ResultValue>
                {formatScientific(safeGet(results, 'electricField'))} V/m
              </ResultValue>
            </Box>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Tunneling Enhancement
              </Typography>
              <ResultValue>
                {formatScientific(safeGet(results, 'tunnelingEnhancement'))}
              </ResultValue>
            </Box>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Coulomb Penetration Probability
              </Typography>
              <ResultValue>
                {formatScientific(safeGet(results, 'coulombPenetration'))}
              </ResultValue>
            </Box>
            
            {/* Only show metadata section if it exists */}
            {safeGet(results, 'config') && (
              <>
                <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                  Simulation Parameters
                </Typography>
                <Divider sx={{ mb: 2 }} />
                
                {Object.entries(results.config || {}).map(([key, value]) => (
                  <MetadataItem key={key}>
                    <Typography variant="body2" color="text.secondary">
                      {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}
                    </Typography>
                    <Typography variant="body2">
                      {typeof value === 'number' ? formatScientific(value) : String(value)}
                    </Typography>
                  </MetadataItem>
                ))}
              </>
            )}
          </ResultCard>
        </Grid>
        
        {/* Energy Levels Chart */}
        <Grid item xs={12} md={4}>
          <ResultCard>
            <Typography variant="h6" gutterBottom>
              Energy Levels
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Box sx={{ flexGrow: 1, height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={energyLevelData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis label={{ value: 'Energy (eV)', angle: -90, position: 'insideLeft' }} />
                  <Tooltip contentStyle={{ backgroundColor: 'rgba(44, 44, 44, 0.9)', color: '#fff', border: 'none' }} />
                  <Bar dataKey="energy" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </ResultCard>
        </Grid>
        
        {/* Key Metrics Chart */}
        <Grid item xs={12} md={4}>
          <ResultCard>
            <Typography variant="h6" gutterBottom>
              Key Metrics
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Box sx={{ flexGrow: 1, height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    { name: 'Rydberg Energy', value: Math.abs(safeGet(results, 'rydbergEnergy', 0)) },
                    { name: 'Tunneling', value: Math.abs(safeGet(results, 'tunnelingEnhancement', 0)) },
                    { name: 'Electric Field', value: Math.log10(Math.abs(safeGet(results, 'electricField', 1))) },
                    { name: 'Coulomb Penetration', value: -Math.log10(Math.abs(safeGet(results, 'coulombPenetration', 1e-20))) }
                  ]}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip contentStyle={{ backgroundColor: 'rgba(44, 44, 44, 0.9)', color: '#fff', border: 'none' }} />
                  <Bar dataKey="value" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </ResultCard>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ResultsPanel; 