import React from 'react';
import { 
  Box, 
  FormControl, 
  FormLabel, 
  RadioGroup, 
  Radio, 
  FormControlLabel, 
  Switch, 
  Slider, 
  Typography, 
  Divider, 
  Paper,
  Select,
  MenuItem,
  SelectChangeEvent,
  Tooltip,
  IconButton,
  Grid,
  Stack
} from '@mui/material';
import { VisualizationMode } from './LatticeStructure';
import SpeedIcon from '@mui/icons-material/Speed';

interface VisualizationControlsProps {
  visualizationMode: VisualizationMode;
  visualizationType: 'temperature' | 'energy' | 'reaction_rate';
  showLegend: boolean;
  showParticleMovement: boolean;
  showWaveAnimations: boolean;
  showUnitCell: boolean;
  visualEffectsIntensity: number;
  autoRotate: boolean;
  performanceMode: 'auto' | 'low' | 'medium' | 'high';
  simplifyLargeDatasets: boolean;
  colorMapName: string;
  onVisualizationModeChange: (mode: VisualizationMode) => void;
  onVisualizationTypeChange: (type: 'temperature' | 'energy' | 'reaction_rate') => void;
  onShowLegendChange: (show: boolean) => void;
  onShowParticleMovementChange: (show: boolean) => void;
  onShowWaveAnimationsChange: (show: boolean) => void;
  onShowUnitCellChange: (show: boolean) => void;
  onVisualEffectsIntensityChange: (intensity: number) => void;
  onAutoRotateChange: (autoRotate: boolean) => void;
  onPerformanceModeChange: (mode: 'auto' | 'low' | 'medium' | 'high') => void;
  onSimplifyLargeDatasetsChange: (simplify: boolean) => void;
  onColorMapChange: (colorMap: string) => void;
}

/**
 * A component that provides controls for customizing the lattice visualization
 */
const VisualizationControls: React.FC<VisualizationControlsProps> = ({
  visualizationMode,
  visualizationType,
  showLegend,
  showParticleMovement,
  showWaveAnimations,
  showUnitCell,
  visualEffectsIntensity,
  autoRotate,
  performanceMode,
  simplifyLargeDatasets,
  colorMapName,
  onVisualizationModeChange,
  onVisualizationTypeChange,
  onShowLegendChange,
  onShowParticleMovementChange,
  onShowWaveAnimationsChange,
  onShowUnitCellChange,
  onVisualEffectsIntensityChange,
  onAutoRotateChange,
  onPerformanceModeChange,
  onSimplifyLargeDatasetsChange,
  onColorMapChange
}) => {
  const handleModeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onVisualizationModeChange(event.target.value as VisualizationMode);
  };

  const handleTypeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onVisualizationTypeChange(event.target.value as 'temperature' | 'energy' | 'reaction_rate');
  };

  const handleIntensityChange = (_event: Event, newValue: number | number[]) => {
    onVisualEffectsIntensityChange(newValue as number);
  };
  
  const handlePerformanceModeChange = (event: SelectChangeEvent<'auto' | 'low' | 'medium' | 'high'>) => {
    onPerformanceModeChange(event.target.value as 'auto' | 'low' | 'medium' | 'high');
  };

  const handleColorMapChange = (event: SelectChangeEvent<string>) => {
    onColorMapChange(event.target.value);
  };

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="h6" gutterBottom>
          Visualization Controls
        </Typography>
        <Tooltip title="Performance Settings">
          <IconButton color="primary" size="small">
            <SpeedIcon />
          </IconButton>
        </Tooltip>
      </Box>
      
      <Stack 
        direction={{ xs: 'column', md: 'row' }} 
        spacing={2} 
        divider={<Divider orientation="vertical" flexItem />}
      >
        {/* Visualization Mode */}
        <FormControl component="fieldset" sx={{ minWidth: '200px' }}>
          <FormLabel component="legend">Display Mode</FormLabel>
          <RadioGroup value={visualizationMode} onChange={handleModeChange}>
            <FormControlLabel value="solid" control={<Radio size="small" />} label="Solid" />
            <FormControlLabel value="wireframe" control={<Radio size="small" />} label="Wireframe" />
            <FormControlLabel value="points" control={<Radio size="small" />} label="Points" />
          </RadioGroup>
        </FormControl>
        
        {/* Visualization Data Type */}
        <FormControl component="fieldset" sx={{ minWidth: '200px' }}>
          <FormLabel component="legend">Data Visualization</FormLabel>
          <RadioGroup value={visualizationType} onChange={handleTypeChange}>
            <FormControlLabel value="energy" control={<Radio size="small" />} label="Energy Levels" />
            <FormControlLabel value="temperature" control={<Radio size="small" />} label="Temperature" />
            <FormControlLabel value="reaction_rate" control={<Radio size="small" />} label="Reaction Rate" />
          </RadioGroup>
        </FormControl>
        
        {/* Visual Options */}
        <Box sx={{ minWidth: '200px' }}>
          <FormLabel component="legend" sx={{ mb: 1 }}>Visual Options</FormLabel>
          
          <FormControlLabel
            control={
              <Switch 
                checked={showLegend} 
                onChange={(e) => onShowLegendChange(e.target.checked)}
                size="small"
              />
            }
            label="Show Legend"
          />
          
          <FormControlLabel
            control={
              <Switch 
                checked={showUnitCell} 
                onChange={(e) => onShowUnitCellChange(e.target.checked)}
                size="small"
              />
            }
            label="Show Unit Cell"
          />
          
          <FormControlLabel
            control={
              <Switch 
                checked={autoRotate} 
                onChange={(e) => onAutoRotateChange(e.target.checked)}
                size="small"
              />
            }
            label="Auto-Rotate"
          />
        </Box>
        
        {/* Effects Options */}
        <Box sx={{ minWidth: '200px' }}>
          <FormLabel component="legend" sx={{ mb: 1 }}>Effects Options</FormLabel>
          
          <FormControlLabel
            control={
              <Switch 
                checked={showParticleMovement} 
                onChange={(e) => onShowParticleMovementChange(e.target.checked)}
                size="small"
              />
            }
            label="Show Particle Movement"
          />
          
          <FormControlLabel
            control={
              <Switch 
                checked={showWaveAnimations} 
                onChange={(e) => onShowWaveAnimationsChange(e.target.checked)}
                size="small"
              />
            }
            label="Show Wave Animations"
          />
          
          <Box sx={{ px: 2, mt: 2 }}>
            <Typography id="intensity-slider" gutterBottom>
              Effects Intensity: {visualEffectsIntensity.toFixed(1)}
            </Typography>
            <Slider
              value={visualEffectsIntensity}
              onChange={handleIntensityChange}
              aria-labelledby="intensity-slider"
              step={0.1}
              marks
              min={0}
              max={2}
              valueLabelDisplay="auto"
            />
          </Box>
        </Box>
        
        {/* Performance Options */}
        <Box sx={{ minWidth: '200px' }}>
          <FormLabel component="legend" sx={{ mb: 1 }}>
            Performance Settings
          </FormLabel>
          
          <FormControl fullWidth sx={{ mb: 2 }}>
            <FormLabel component="legend" sx={{ fontSize: '0.875rem', mb: 0.5 }}>
              Performance Mode
            </FormLabel>
            <Select
              value={performanceMode}
              onChange={handlePerformanceModeChange}
              size="small"
            >
              <MenuItem value="auto">Automatic</MenuItem>
              <MenuItem value="low">Low (Better Quality)</MenuItem>
              <MenuItem value="medium">Medium (Balanced)</MenuItem>
              <MenuItem value="high">High (Better Performance)</MenuItem>
            </Select>
          </FormControl>
          
          <FormControlLabel
            control={
              <Switch 
                checked={simplifyLargeDatasets} 
                onChange={(e) => onSimplifyLargeDatasetsChange(e.target.checked)}
                size="small"
              />
            }
            label="Simplify Large Datasets"
          />
          
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            These settings help optimize rendering performance for large lattice structures.
          </Typography>
        </Box>
        
        {/* Data Visualization */}
        <Box sx={{ minWidth: '200px' }}>
          <FormLabel component="legend" sx={{ mb: 1 }}>
            Data Visualization
          </FormLabel>
          
          <FormControl fullWidth sx={{ mb: 2 }}>
            <FormLabel component="legend" sx={{ fontSize: '0.875rem', mb: 0.5 }}>
              Color Map
            </FormLabel>
            <Select
              value={colorMapName}
              onChange={handleColorMapChange}
              size="small"
            >
              <MenuItem value="default">Default</MenuItem>
              <MenuItem value="thermal">Thermal</MenuItem>
              <MenuItem value="plasma">Plasma</MenuItem>
              <MenuItem value="viridis">Viridis</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Stack>
    </Paper>
  );
};

export default VisualizationControls; 