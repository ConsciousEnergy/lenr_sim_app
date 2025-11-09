import React, { useState } from 'react';
import { Box, Paper, Stack, ThemeProvider, Grid } from '@mui/material';
import LatticeStructureWithPhysics from './LatticeStructureWithPhysics';
import VisualizationControls from './VisualizationControls';
import PhysicsInfoPanel from './PhysicsInfoPanel';
import { VisualizationMode } from './LatticeStructure';
import { usePhysicsWebSocket } from '../../api/physics/hooks';
import ColorLegend from './ColorLegend';
import { getMinValue, getMaxValue } from './utils';
import { theme } from '../../styles/theme';

interface PhysicsLatticeVisualizationContainerProps {
  simulationId: string | null;
  width?: number;
  height?: number;
}

/**
 * A container component that combines all physics visualization components
 */
const PhysicsLatticeVisualizationContainer: React.FC<PhysicsLatticeVisualizationContainerProps> = ({
  simulationId,
  width = 1200,
  height = 800
}) => {
  // Visualization settings state
  const [visualizationMode, setVisualizationMode] = useState<VisualizationMode>('solid');
  const [visualizationType, setVisualizationType] = useState<'temperature' | 'energy' | 'reaction_rate'>('energy');
  const [showLegend, setShowLegend] = useState(true);
  const [showParticleMovement, setShowParticleMovement] = useState(true);
  const [showWaveAnimations, setShowWaveAnimations] = useState(true);
  const [showUnitCell, setShowUnitCell] = useState(true);
  const [visualEffectsIntensity, setVisualEffectsIntensity] = useState(1.0);
  const [autoRotate, setAutoRotate] = useState(false);
  const [colorMapName, setColorMapName] = useState('default');
  
  // Performance settings
  const [performanceMode, setPerformanceMode] = useState<'auto' | 'low' | 'medium' | 'high'>('auto');
  const [simplifyLargeDatasets, setSimplifyLargeDatasets] = useState(true);

  // Get WebSocket connection status and last message
  const { isConnected, lastMessage } = usePhysicsWebSocket(simulationId);

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ 
        flexGrow: 1, 
        p: 1,
        display: 'grid',
        gridTemplateColumns: '1fr',
        '@media (min-width: 900px)': {
          gridTemplateColumns: '1fr 3fr'
        },
        gap: 2
      }}>
        {/* Controls & Info Panel */}
        <Box>
          <Stack spacing={2}>
            {/* Visualization Controls */}
            <VisualizationControls
              visualizationMode={visualizationMode}
              visualizationType={visualizationType}
              showLegend={showLegend}
              showParticleMovement={showParticleMovement}
              showWaveAnimations={showWaveAnimations}
              showUnitCell={showUnitCell}
              visualEffectsIntensity={visualEffectsIntensity}
              autoRotate={autoRotate}
              performanceMode={performanceMode}
              simplifyLargeDatasets={simplifyLargeDatasets}
              onVisualizationModeChange={setVisualizationMode}
              onVisualizationTypeChange={setVisualizationType}
              onShowLegendChange={setShowLegend}
              onShowParticleMovementChange={setShowParticleMovement}
              onShowWaveAnimationsChange={setShowWaveAnimations}
              onShowUnitCellChange={setShowUnitCell}
              onVisualEffectsIntensityChange={setVisualEffectsIntensity}
              onAutoRotateChange={setAutoRotate}
              onPerformanceModeChange={setPerformanceMode}
              onSimplifyLargeDatasetsChange={setSimplifyLargeDatasets}
              colorMapName={colorMapName}
              onColorMapChange={setColorMapName}
            />
            
            {/* Physics Info Panel */}
            <Paper sx={{ p: 2 }}>
              <PhysicsInfoPanel
                simulationData={lastMessage?.type === 'simulation_update' ? lastMessage : null}
                visualizationType={visualizationType}
                isConnected={isConnected}
              />
            </Paper>
          </Stack>
        </Box>
        
        {/* Main Visualization Area */}
        <Paper sx={{ p: 2, height: '100%', minHeight: '600px' }}>
          {/* Render the lattice structure with physics data */}
          <Box sx={{ position: 'relative', height: '100%', width: '100%' }}>
            <LatticeStructureWithPhysics
              simulationId={simulationId}
              width={width * 0.7}
              height={height * 0.7}
              mode={visualizationMode}
              visualizationType={visualizationType}
              showLegend={showLegend}
              showParticleMovement={showParticleMovement}
              showWaveAnimations={showWaveAnimations}
              visualEffectsIntensity={visualEffectsIntensity}
              autoRotate={autoRotate}
              performanceMode={performanceMode}
              simplifyLargeDatasets={simplifyLargeDatasets}
            />
            
            {/* Color Legend */}
            <Box sx={{ position: 'absolute', bottom: 16, right: 16, width: '200px' }}>
              <ColorLegend 
                colorMapName={colorMapName}
                visualizationType={visualizationType}
                min={getMinValue()}
                max={getMaxValue()}
              />
            </Box>
          </Box>
        </Paper>
      </Box>
    </ThemeProvider>
  );
};

export default PhysicsLatticeVisualizationContainer; 