import React from 'react';
import { Box, Typography, Paper, Grid, Divider } from '@mui/material';
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

  // Convert energy levels to chart data
  const energyLevelData = results.energyLevels.map((level, index) => ({
    name: `Level ${index}`,
    energy: level
  }));

  // Create potential energy chart data
  const potentialEnergyData = [
    { name: 'Potential Energy', value: results.potentialEnergy }
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
                Tunneling Probability
              </Typography>
              <ResultValue>
                {(results.tunnelingProbability * 100).toFixed(4)}%
              </ResultValue>
            </Box>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Potential Energy
              </Typography>
              <ResultValue>
                {results.potentialEnergy} eV
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
            
            {Object.entries(results.metadata).map(([key, value]) => (
              <MetadataItem key={key}>
                <Typography variant="body2" color="text.secondary">
                  {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}
                </Typography>
                <Typography variant="body2">
                  {value.toString()}
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