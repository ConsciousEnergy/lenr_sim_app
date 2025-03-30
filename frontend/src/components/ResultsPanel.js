import React from 'react';
import { Box, Typography, Paper, Grid, Divider, CircularProgress, Alert } from '@mui/material';
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

const ResultsPanel = ({ results, loading }) => {
  if (loading) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
          Calculating simulation results...
        </Typography>
      </Box>
    );
  }

  if (!results) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="body1" color="text.secondary">
          Run a simulation to see results here
        </Typography>
      </Box>
    );
  }

  // Check for API error response
  if (results.error) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="error">
          {results.error || 'An error occurred during calculation'}
        </Alert>
      </Box>
    );
  }

  // Format energy levels for chart from API format
  const energyLevelData = results.energy_levels 
    ? results.energy_levels.map(level => ({
        name: `n=${level.n}`,
        energy: level.energy
      }))
    : [];

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
                Tunneling Probability
              </Typography>
              <ResultValue>
                {results.probability 
                  ? results.probability.toExponential(4)
                  : 'N/A'}
              </ResultValue>
            </Box>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Energy Levels
              </Typography>
              <ResultValue>
                {results.energy_levels ? results.energy_levels.length : 0}
              </ResultValue>
            </Box>
            
            <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
              Calculation Metadata
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            {results.metadata && Object.entries(results.metadata).map(([key, value]) => (
              <MetadataItem key={key}>
                <Typography variant="body2" color="text.secondary">
                  {key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
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
            {energyLevelData.length > 0 ? (
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
            ) : (
              <Box sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  No energy level data available
                </Typography>
              </Box>
            )}
          </ResultCard>
        </Grid>
        
        {/* Input Parameters */}
        <Grid item xs={12} md={4}>
          <ResultCard>
            <Typography variant="h6" gutterBottom>
              Input Parameters
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Box sx={{ flexGrow: 1 }}>
              {results.input_params && Object.entries(results.input_params).map(([key, value]) => (
                <MetadataItem key={key}>
                  <Typography variant="body2" color="text.secondary">
                    {key === 'lambda' ? 'λ (m)' : 
                     key === 'T' ? 'Temperature (K)' :
                     key === 'r0' ? 'r₀ (m)' :
                     key === 'k_spring' ? 'Spring Constant (N/m)' :
                     key === 'potential' ? 'Potential Type' :
                     key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                  </Typography>
                  <Typography variant="body2">
                    {typeof value === 'number' && (key === 'lambda' || key === 'r0')
                      ? value.toExponential(2)
                      : String(value)}
                  </Typography>
                </MetadataItem>
              ))}
            </Box>
          </ResultCard>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ResultsPanel; 