/**
 * PhononNuclearPanel Component
 */
import React from 'react';
import { Box, Typography, Paper, Chip, Stack } from '@mui/material';

interface PhononMode {
  frequency: number;
  amplitude: number;
  coupling: number;
}

interface PhononNuclearPanelProps {
  phononModes?: PhononMode[];
  couplingStrength?: number;
  latticeTemperature?: number;
  isLoading?: boolean;
}

const PhononNuclearPanel: React.FC<PhononNuclearPanelProps> = ({
  phononModes = [],
  couplingStrength = 0.0,
  latticeTemperature = 300,
  isLoading = false
}) => {
  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>Phonon-Nuclear Coupling</Typography>
      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Lattice Temperature: {latticeTemperature} K
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Coupling Strength: {couplingStrength.toExponential(2)}
        </Typography>
      </Box>
      {phononModes.length > 0 ? (
        <Stack spacing={1}>
          <Typography variant="subtitle2">Active Phonon Modes:</Typography>
          {phononModes.map((mode, index) => (
            <Chip
              key={index}
              label={mode.frequency.toFixed(1) + " THz"}
              size="small"
              color={mode.coupling > 0.5 ? "primary" : "default"}
            />
          ))}
        </Stack>
      ) : (
        <Typography variant="body2" color="text.secondary">
          No active phonon modes detected
        </Typography>
      )}
    </Paper>
  );
};

export default PhononNuclearPanel;
