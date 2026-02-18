import React, { useState } from 'react';
import { Box, Typography, Card, CircularProgress, Alert, Button, Stack, Tabs, Tab } from '@mui/material';
import { SyncOutlined, WarningOutlined } from '@mui/icons-material';

import LatticeStructureWithPhysics from './LatticeStructureWithPhysics';
import MHDFluidSimulation from './MHDFluidSimulation';
import { usePhysicsVisualization, VisualizationType } from '../hooks/usePhysicsVisualization';
import { useSimulationControl } from '../../api/physics/hooks';

interface PhysicsVisualizationContainerProps {
  simulationId: string | null;
  title?: string;
  width?: number | string;
  height?: number | string;
  defaultVisualizationType?: VisualizationType;
  showControls?: boolean;
  showVisualizationOptions?: boolean;
}

/**
 * Main container for physics visualizations, handling data connection and visualization type switching
 */
const PhysicsVisualizationContainer: React.FC<PhysicsVisualizationContainerProps> = ({
  simulationId,
  title = 'Physics Simulation',
  width = '100%',
  height = 600,
  defaultVisualizationType = 'energy',
  showControls = true,
  showVisualizationOptions = true
}) => {
  // Track active visualization type and mode
  const [visualizationType, setVisualizationType] = useState<VisualizationType>(defaultVisualizationType);
  const [activeTab, setActiveTab] = useState<'lattice' | 'mhd'>('lattice');

  // Connect to physics data using custom hook
  const {
    latticeData,
    mhdData,
    isLoading,
    error,
    lastUpdate,
    dataRange,
    isConnected,
    reconnect
  } = usePhysicsVisualization(simulationId, {
    visualizationType,
    refreshInterval: 1000
  });

  // Simulation control hooks
  const {
    startSimulation,
    pauseSimulation,
    resumeSimulation,
    resetSimulation,
    status
  } = useSimulationControl(simulationId);

  // Handle visualization type change
  const handleVisualizationTypeChange = (
    event: React.MouseEvent<HTMLElement>,
    newVisualizationType: VisualizationType | null
  ) => {
    if (newVisualizationType) {
      setVisualizationType(newVisualizationType);
    }
  };

  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: 'lattice' | 'mhd') => {
    setActiveTab(newValue);
  };

  return (
    <Card elevation={3} sx={{ overflow: 'hidden' }}>
      {/* Header */}
      <Box sx={{ p: 2, bgcolor: 'primary.dark', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" component="h2">
          {title}
        </Typography>
        
        <Box display="flex" alignItems="center">
          {isConnected ? (
            <Box component="span" sx={{ display: 'flex', alignItems: 'center', mr: 1, color: 'success.light' }}>
              <SyncOutlined sx={{ mr: 0.5, animation: 'spin 2s linear infinite', '@keyframes spin': { '0%': { transform: 'rotate(0deg)' }, '100%': { transform: 'rotate(360deg)' } } }} />
              <Typography variant="body2" component="span">Connected</Typography>
            </Box>
          ) : (
            <Box component="span" sx={{ display: 'flex', alignItems: 'center', mr: 1, color: 'warning.light' }}>
              <WarningOutlined sx={{ mr: 0.5 }} />
              <Typography variant="body2" component="span">Disconnected</Typography>
            </Box>
          )}
        </Box>
      </Box>

      {/* Error message */}
      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 0 }}
          action={
            <Button color="inherit" size="small" onClick={reconnect}>
              Reconnect
            </Button>
          }
        >
          {error.message}
        </Alert>
      )}

      {/* Tabs for different visualization types */}
      <Tabs 
        value={activeTab} 
        onChange={handleTabChange} 
        sx={{ borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab label="Lattice Structure" value="lattice" />
        <Tab label="MHD/Fluid Dynamics" value="mhd" />
      </Tabs>

      {/* Loading indicator */}
      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: height, width: width }}>
          <CircularProgress />
        </Box>
      )}

      {/* Visualization options */}
      {showVisualizationOptions && !isLoading && (
        <Box sx={{ p: 1, borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={visualizationType} 
            onChange={handleVisualizationTypeChange}
            aria-label="visualization type"
            sx={{ minHeight: 'auto' }}
          >
            <Tab label="Energy" value="energy" />
            <Tab label="Temperature" value="temperature" />
            <Tab label="Reaction Rate" value="reaction_rate" />
          </Tabs>
        </Box>
      )}

      {/* Visualization area */}
      <Box sx={{ width, height: height, position: 'relative', overflow: 'hidden' }}>
        {!isLoading && activeTab === 'lattice' && latticeData && (
          <LatticeStructureWithPhysics
            simulationId={simulationId}
            width={typeof width === 'number' ? width : undefined}
            height={typeof height === 'number' ? height : undefined}
            mode="solid"
            visualizationType={visualizationType}
            showLegend={true}
            showParticleMovement={true}
            showWaveAnimations={true}
          />
        )}

        {!isLoading && activeTab === 'mhd' && mhdData && (
          <MHDFluidSimulation
            width={typeof width === 'number' ? width : undefined}
            height={typeof height === 'number' ? height : undefined}
            simulationId={simulationId}
            conductivity={5.0}
            viscosity={1.0}
            showVectors={true}
            showStreamlines={true}
            showTemperature={visualizationType === 'temperature'}
            showPressure={false}
            colorMap="viridis"
          />
        )}
      </Box>

      {/* Controls */}
      {showControls && (
        <Box sx={{ p: 1.5, display: 'flex', justifyContent: 'center', borderTop: 1, borderColor: 'divider' }}>
          <Stack direction="row" spacing={1}>
            <Button 
              variant="contained" 
              color="primary" 
              size="small"
              onClick={startSimulation}
              disabled={!simulationId || status === 'running' || !isConnected}
            >
              Start
            </Button>
            <Button 
              variant="outlined" 
              color="primary" 
              size="small"
              onClick={pauseSimulation}
              disabled={!simulationId || status !== 'running' || !isConnected}
            >
              Pause
            </Button>
            <Button 
              variant="outlined" 
              color="primary" 
              size="small"
              onClick={resumeSimulation}
              disabled={!simulationId || status !== 'paused' || !isConnected}
            >
              Resume
            </Button>
            <Button 
              variant="outlined" 
              color="secondary" 
              size="small"
              onClick={resetSimulation}
              disabled={!simulationId || !isConnected}
            >
              Reset
            </Button>
            {!isConnected && (
              <Button 
                variant="outlined" 
                color="warning" 
                size="small"
                onClick={reconnect}
              >
                Reconnect
              </Button>
            )}
          </Stack>
        </Box>
      )}

      {/* Status bar */}
      {lastUpdate && (
        <Box sx={{ 
          p: 1, 
          borderTop: 1, 
          borderColor: 'divider', 
          bgcolor: 'action.hover', 
          display: 'flex', 
          justifyContent: 'space-between',
          fontSize: '0.8rem'
        }}>
          <Typography variant="caption">Step: {lastUpdate.step}</Typography>
          <Typography variant="caption">Time: {lastUpdate.time.toFixed(5)}</Typography>
          <Typography variant="caption">
            Data Range: {dataRange.min.toFixed(2)} - {dataRange.max.toFixed(2)}
          </Typography>
        </Box>
      )}
    </Card>
  );
};

export default PhysicsVisualizationContainer; 