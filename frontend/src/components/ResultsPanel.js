import React from 'react';
import { Box, Typography, Paper, Grid, Divider, Chip } from '@mui/material';
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

  // Determine simulation type from metadata
  const simulationType = results.metadata.simulationType || 'thermal';
  const isImpact = simulationType === 'impact';

  // Get color based on probability magnitude
  const getProbabilityColor = (prob) => {
    if (prob < 1e-20) return '#d32f2f'; // very low - red
    if (prob < 1e-15) return '#f57c00'; // low - orange
    if (prob < 1e-10) return '#ffb300'; // medium - amber
    return '#388e3c'; // high - green
  };
  
  // Format probability for display
  const formatProbability = (prob) => {
    return prob.toExponential(4);
  };

  // Convert energy levels to chart data
  const energyLevelData = results.energyLevels.map((level, index) => ({
    name: `Level ${index}`,
    energy: level
  }));

  // Create potential energy chart data
  const potentialEnergyData = [
    { name: 'Potential Energy', value: results.potentialEnergy }
  ];

  // Format metadata to be more readable
  const formatMetadataKey = (key) => {
    return key
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <Box>
      <Grid container spacing={3}>
        {/* Key Metrics */}
        <Grid item xs={12} md={4}>
          <ResultCard>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="h6">
                Key Results
              </Typography>
              <Chip 
                label={isImpact ? 'Impact Tunneling' : 'Thermal Tunneling'} 
                color={isImpact ? 'secondary' : 'primary'} 
                size="small"
              />
            </Box>
            <Divider sx={{ mb: 2 }} />
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Tunneling Probability
              </Typography>
              <ResultValue sx={{ color: getProbabilityColor(results.tunnelingProbability) }}>
                {formatProbability(results.tunnelingProbability)}
              </ResultValue>
              <Typography variant="caption" color="text.secondary">
                {isImpact ? 'Under high-energy impact conditions' : 'At thermal equilibrium'}
              </Typography>
            </Box>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Potential Energy
              </Typography>
              <ResultValue>
                {results.potentialEnergy.toFixed(4)} eV
              </ResultValue>
            </Box>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Energy Levels
              </Typography>
              <ResultValue>
                {results.energyLevels.length}
              </ResultValue>
            </Box>
            
            <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
              Calculation Metadata
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            {Object.entries(results.metadata).filter(([key]) => key !== 'simulationType').map(([key, value]) => (
              <MetadataItem key={key}>
                <Typography variant="body2" color="text.secondary">
                  {formatMetadataKey(key)}
                </Typography>
                <Typography variant="body2">
                  {typeof value === 'number' && key.includes('time') 
                    ? `${value.toFixed(2)} ms` 
                    : String(value)}
                </Typography>
              </MetadataItem>
            ))}
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
        
        {/* Potential Energy Chart */}
        <Grid item xs={12} md={4}>
          <ResultCard>
            <Typography variant="h6" gutterBottom>
              Potential Energy
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Box sx={{ flexGrow: 1, height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={potentialEnergyData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis label={{ value: 'Energy (eV)', angle: -90, position: 'insideLeft' }} />
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