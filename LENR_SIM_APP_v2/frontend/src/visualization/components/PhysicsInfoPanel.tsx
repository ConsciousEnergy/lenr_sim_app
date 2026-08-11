import React from 'react';
import { 
  Paper, 
  Typography, 
  Box, 
  Divider, 
  Chip,
  List,
  ListItem,
  ListItemText,
  Grid
} from '@mui/material';
import { SimulationUpdateMessage } from '../../api/physics/types';

// Enhanced simulation summary interface to handle the properties we're displaying
interface EnhancedSimulationSummary {
  average_temperature: number;
  total_energy: number;
  reaction_rate: number;
  // Additional properties used for visualization
  min_temperature?: number;
  max_temperature?: number;
  min_energy?: number;
  max_energy?: number;
  average_energy?: number;
  min_reaction_rate?: number;
  max_reaction_rate?: number;
  average_reaction_rate?: number;
  key_metrics?: {
    enhancement_factor?: number;
  };
}

interface PhysicsInfoPanelProps {
  simulationData: SimulationUpdateMessage | null;
  visualizationType: 'temperature' | 'energy' | 'reaction_rate';
  isConnected: boolean;
}

/**
 * Component to display physics information and stats from the simulation
 */
const PhysicsInfoPanel: React.FC<PhysicsInfoPanelProps> = ({
  simulationData,
  visualizationType,
  isConnected
}) => {
  // If no data, show placeholder or loading
  if (!simulationData) {
    return (
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6">Simulation Data</Typography>
        <Box sx={{ my: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
          <Typography variant="body2" color="text.secondary">
            No simulation data available yet. Start a simulation to see physics data.
          </Typography>
        </Box>
      </Paper>
    );
  }

  const { summary, simulation_id, step, time, lattice } = simulationData;
  
  // Type assertion for the summary to match our enhanced interface
  const enhancedSummary = summary as unknown as EnhancedSimulationSummary;

  return (
    <Paper sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="h6">Simulation Data</Typography>
        <Chip 
          label={isConnected ? "Connected" : "Disconnected"} 
          color={isConnected ? "success" : "error"} 
          size="small" 
        />
      </Box>

      <Divider sx={{ mb: 2 }} />

      <Grid container spacing={2}>
        {/* Simulation metadata */}
        <Grid className="grid-item" sx={{ gridColumn: { xs: 'span 12', sm: 'span 6' } }}>
          <Typography variant="subtitle2">Simulation Info</Typography>
          <List dense>
            <ListItem disablePadding>
              <ListItemText 
                primary="Simulation ID" 
                secondary={simulation_id || 'N/A'} 
              />
            </ListItem>
            <ListItem disablePadding>
              <ListItemText 
                primary="Current Step" 
                secondary={step !== undefined ? step.toLocaleString() : 'N/A'} 
              />
            </ListItem>
            <ListItem disablePadding>
              <ListItemText 
                primary="Simulation Time" 
                secondary={time !== undefined ? `${time.toFixed(6)} s` : 'N/A'} 
              />
            </ListItem>
            <ListItem disablePadding>
              <ListItemText 
                primary="Lattice Points" 
                secondary={lattice?.points?.length.toLocaleString() || 'N/A'} 
              />
            </ListItem>
          </List>
        </Grid>

        {/* Physics data */}
        <Grid className="grid-item" sx={{ gridColumn: { xs: 'span 12', sm: 'span 6' } }}>
          <Typography variant="subtitle2">Physics Parameters</Typography>
          <List dense>
            {enhancedSummary && (
              <>
                <ListItem disablePadding>
                  <ListItemText 
                    primary="Average Temperature" 
                    secondary={`${enhancedSummary.average_temperature?.toFixed(2)} K`} 
                  />
                </ListItem>
                <ListItem disablePadding>
                  <ListItemText 
                    primary="Total Energy" 
                    secondary={enhancedSummary.total_energy ? enhancedSummary.total_energy.toExponential(3) + ' J' : 'N/A'} 
                  />
                </ListItem>
                <ListItem disablePadding>
                  <ListItemText 
                    primary="Reaction Rate" 
                    secondary={enhancedSummary.reaction_rate ? enhancedSummary.reaction_rate.toExponential(3) + ' /s' : 'N/A'} 
                  />
                </ListItem>
                {enhancedSummary.key_metrics && (
                  <ListItem disablePadding>
                    <ListItemText 
                      primary="Enhancement Factor" 
                      secondary={typeof enhancedSummary.key_metrics.enhancement_factor === 'number'
                        ? `${enhancedSummary.key_metrics.enhancement_factor.toFixed(2)}x`
                        : 'N/A'} 
                    />
                  </ListItem>
                )}
              </>
            )}
          </List>
        </Grid>
      </Grid>

      <Divider sx={{ my: 2 }} />

      {/* Current visualization type details */}
      <Box>
        <Typography variant="subtitle2" gutterBottom>
          {visualizationType === 'temperature' 
            ? 'Temperature Distribution' 
            : visualizationType === 'energy' 
              ? 'Energy Distribution' 
              : 'Reaction Activity'}
        </Typography>
        
        <Typography variant="body2" color="text.secondary" paragraph>
          {visualizationType === 'temperature' 
            ? 'Temperature varies across the lattice based on energy release from nuclear reactions and phonon interactions.' 
            : visualizationType === 'energy' 
              ? 'Energy distribution shows local energy density from nuclear and quantum processes.' 
              : 'Reaction rate shows the probability of nuclear reactions occurring at each lattice site.'}
        </Typography>
        
        {/* Data range and stats for the current visualization */}
        {enhancedSummary && (
          <Box sx={{ mt: 1 }}>
            <Grid container spacing={1}>
              <Grid className="grid-item" sx={{ gridColumn: 'span 4' }}>
                <Paper sx={{ p: 1, textAlign: 'center', bgcolor: 'background.default' }}>
                  <Typography variant="caption" display="block">Min</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {visualizationType === 'temperature' 
                      ? `${enhancedSummary.min_temperature?.toFixed(1) || 'N/A'} K` 
                      : visualizationType === 'energy' 
                        ? `${enhancedSummary.min_energy?.toExponential(2) || 'N/A'} eV` 
                        : enhancedSummary.min_reaction_rate?.toExponential(2) || 'N/A'}
                  </Typography>
                </Paper>
              </Grid>
              <Grid className="grid-item" sx={{ gridColumn: 'span 4' }}>
                <Paper sx={{ p: 1, textAlign: 'center', bgcolor: 'background.default' }}>
                  <Typography variant="caption" display="block">Average</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {visualizationType === 'temperature' 
                      ? `${enhancedSummary.average_temperature?.toFixed(1) || 'N/A'} K` 
                      : visualizationType === 'energy' 
                        ? `${enhancedSummary.average_energy?.toExponential(2) || 'N/A'} eV` 
                        : enhancedSummary.average_reaction_rate?.toExponential(2) || 'N/A'}
                  </Typography>
                </Paper>
              </Grid>
              <Grid className="grid-item" sx={{ gridColumn: 'span 4' }}>
                <Paper sx={{ p: 1, textAlign: 'center', bgcolor: 'background.default' }}>
                  <Typography variant="caption" display="block">Max</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {visualizationType === 'temperature' 
                      ? `${enhancedSummary.max_temperature?.toFixed(1) || 'N/A'} K` 
                      : visualizationType === 'energy' 
                        ? `${enhancedSummary.max_energy?.toExponential(2) || 'N/A'} eV` 
                        : enhancedSummary.max_reaction_rate?.toExponential(2) || 'N/A'}
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </Box>
        )}
      </Box>
    </Paper>
  );
};

export default PhysicsInfoPanel; 