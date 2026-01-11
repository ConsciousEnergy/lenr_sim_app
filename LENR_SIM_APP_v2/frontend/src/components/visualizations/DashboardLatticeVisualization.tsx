import React, { useState } from 'react';
import { Box, Paper, Typography, Skeleton, IconButton, FormControl, InputLabel, Select, MenuItem, SelectChangeEvent } from '@mui/material';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import ReplayIcon from '@mui/icons-material/Replay';
import InfoIcon from '@mui/icons-material/Info';

// Import the PhysicsLatticeVisualization component directly
import PhysicsLatticeVisualization from '../visualization/PhysicsLatticeVisualization';

interface DashboardLatticeVisualizationProps {
  simulationId: string | null;
  title?: string;
  isPreview?: boolean;
  height?: number | string;
  width?: number | string;
  onFullscreenClick?: () => void;
}

/**
 * Lattice visualization component for use in the physics simulation dashboard
 * 
 * This component wraps the PhysicsLatticeVisualization with additional
 * dashboard-specific UI elements and controls.
 */
const DashboardLatticeVisualization: React.FC<DashboardLatticeVisualizationProps> = ({
  simulationId,
  title = 'Lattice Visualization',
  isPreview = false,
  height = 500,
  width = '100%',
  onFullscreenClick
}) => {
  // Visualization settings
  const [visualizationType, setVisualizationType] = useState<'temperature' | 'energy' | 'reaction_rate'>('energy');
  
  // Handle visualization type change
  const handleVisualizationTypeChange = (event: SelectChangeEvent) => {
    setVisualizationType(event.target.value as 'temperature' | 'energy' | 'reaction_rate');
  };

  // Dummy handlers for start/stop simulation
  const handleStartSimulation = () => {
    console.log('Start simulation requested from lattice visualization');
  };

  const handleStopSimulation = () => {
    console.log('Stop simulation requested from lattice visualization');
  };

  return (
    <Paper 
      elevation={2} 
      sx={{ 
        height: typeof height === 'number' ? `${height}px` : height,
        width,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Header with title and controls */}
      <Box sx={{ 
        p: 2, 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        borderBottom: '1px solid',
        borderColor: 'divider'
      }}>
        <Typography variant={isPreview ? "subtitle1" : "h6"} component="h3">
          {title}
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {/* Visualization type selector */}
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel id="visualization-type-label">Color By</InputLabel>
            <Select
              labelId="visualization-type-label"
              value={visualizationType}
              label="Color By"
              onChange={handleVisualizationTypeChange}
            >
              <MenuItem value="energy">Energy</MenuItem>
              <MenuItem value="temperature">Temperature</MenuItem>
              <MenuItem value="reaction_rate">Reaction Rate</MenuItem>
            </Select>
          </FormControl>
          
          {/* Full screen button */}
          {onFullscreenClick && (
            <IconButton onClick={onFullscreenClick} size="small">
              <FullscreenIcon />
            </IconButton>
          )}
          
          {/* Reset view button */}
          <IconButton size="small">
            <ReplayIcon />
          </IconButton>
        </Box>
      </Box>
      
      {/* Visualization content */}
      <Box sx={{ flexGrow: 1, p: isPreview ? 1 : 2, position: 'relative' }}>
        {!simulationId ? (
          <Box sx={{ 
            height: '100%', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center' 
          }}>
            <Typography variant="body2" color="text.secondary">
              No simulation data available
            </Typography>
          </Box>
        ) : (
          <PhysicsLatticeVisualization
            simulationId={simulationId}
            visualizationSettings={{
              visualizationType
            }}
            onStartSimulation={handleStartSimulation}
            onStopSimulation={handleStopSimulation}
          />
        )}
      </Box>
    </Paper>
  );
};

export default DashboardLatticeVisualization; 