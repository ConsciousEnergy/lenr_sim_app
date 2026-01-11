import React from 'react';
import { Box, Typography, Paper, Grid, Divider, Alert } from '@mui/material';
import { styled } from '@mui/material/styles';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Styled components
const ResultCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  height: '100%',
  display: 'flex',
  flexDirection: 'column'
}));

const ResultValue = styled(Typography)(({ theme }) => ({
  fontWeight: 'bold',
  fontSize: '1.2rem',
  color: theme.palette.primary.main
}));

const MetadataItem = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  padding: theme.spacing(0.5, 0),
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
  
  // Create chart for key metrics if needed
  let energyLevelData = [];
  
  if (results?.energyLevels?.length === 0) {
    // Create placeholder energy levels if none are available
    energyLevelData = [
      { name: 'Level 0', energy: -13.6 },
      { name: 'Level 1', energy: -3.4 },
      { name: 'Level 2', energy: -1.5 },
      { name: 'Level 3', energy: -0.85 }
    ];
  } else if (Array.isArray(safeGet(results, 'energyLevels'))) {
    // Use actual energy levels if available
    energyLevelData = results.energyLevels.map((level, index) => ({
      name: `Level ${index}`,
      energy: typeof level === 'number' ? level : 
              typeof level === 'object' && level.energy ? level.energy : 0
    }));
  }

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
                  <Tooltip />
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
                  <Tooltip />
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