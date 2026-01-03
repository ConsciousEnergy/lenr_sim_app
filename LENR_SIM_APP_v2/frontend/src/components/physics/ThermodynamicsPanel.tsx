/**
 * ThermodynamicsPanel Component
 */
import React from 'react';
import { Box, Typography, Paper, LinearProgress } from '@mui/material';

interface ThermodynamicsPanelProps {
  temperature?: number;
  pressure?: number;
  enthalpy?: number;
  entropy?: number;
  heatFlux?: number;
  isLoading?: boolean;
}

const ThermodynamicsPanel: React.FC<ThermodynamicsPanelProps> = ({
  temperature = 300,
  pressure = 101325,
  enthalpy = 0,
  entropy = 0,
  heatFlux = 0,
  isLoading = false
}) => {
  if (isLoading) {
    return (
      <Box sx={{ p: 2 }}>
        <LinearProgress />
        <Typography variant="caption" sx={{ mt: 1 }}>Loading thermodynamic data...</Typography>
      </Box>
    );
  }

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>Thermodynamic State</Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="body2">Temperature:</Typography>
          <Typography variant="body2" color="error">{temperature.toFixed(1)} K</Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="body2">Pressure:</Typography>
          <Typography variant="body2">{(pressure / 1e5).toFixed(2)} bar</Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="body2">Enthalpy:</Typography>
          <Typography variant="body2">{enthalpy.toExponential(2)} J</Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="body2">Entropy:</Typography>
          <Typography variant="body2">{entropy.toExponential(2)} J/K</Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="body2">Heat Flux:</Typography>
          <Typography variant="body2" color="warning.main">{heatFlux.toExponential(2)} W/m2</Typography>
        </Box>
      </Box>
    </Paper>
  );
};

export default ThermodynamicsPanel;
