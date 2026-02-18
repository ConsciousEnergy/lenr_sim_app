/**
 * QEDVisualization Component
 */
import React from 'react';
import { Box, Typography, Paper, LinearProgress } from '@mui/material';

interface QEDVisualizationProps {
  screeningFactor?: number;
  vacuumPolarization?: number;
  electronDensity?: number;
  isLoading?: boolean;
}

const QEDVisualization: React.FC<QEDVisualizationProps> = ({
  screeningFactor = 1.0,
  vacuumPolarization = 0.0,
  electronDensity = 1e22,
  isLoading = false
}) => {
  if (isLoading) {
    return (
      <Box sx={{ p: 2 }}>
        <LinearProgress />
        <Typography variant="caption" sx={{ mt: 1 }}>Loading QED data...</Typography>
      </Box>
    );
  }

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>QED Enhancement Factors</Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="body2">Screening Factor:</Typography>
          <Typography variant="body2" color="primary">{screeningFactor.toExponential(2)}</Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="body2">Vacuum Polarization:</Typography>
          <Typography variant="body2" color="secondary">{vacuumPolarization.toExponential(2)}</Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="body2">Electron Density:</Typography>
          <Typography variant="body2">{electronDensity.toExponential(2)} m^-3</Typography>
        </Box>
      </Box>
    </Paper>
  );
};

export default QEDVisualization;
