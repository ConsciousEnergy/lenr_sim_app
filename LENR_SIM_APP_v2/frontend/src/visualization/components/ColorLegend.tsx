import React from 'react';
import { styled } from '@mui/material/styles';
import { Box, Typography } from '@mui/material';
import { colorMaps } from '../utils/colorMaps';

// Styled components
const LegendContainer = styled(Box)(({ theme }) => ({
  position: 'absolute',
  bottom: theme.spacing(2),
  right: theme.spacing(2),
  backgroundColor: 'rgba(0, 0, 0, 0.6)',
  color: '#fff',
  padding: theme.spacing(1.5),
  borderRadius: theme.shape.borderRadius,
  maxWidth: '200px',
  zIndex: 100,
}));

const GradientBox = styled(Box)(() => ({
  width: '100%',
  height: '20px',
  marginTop: '4px',
  marginBottom: '8px',
  borderRadius: '4px',
}));

interface ColorLegendProps {
  min: number;
  max: number;
  visualizationType: 'temperature' | 'energy' | 'reaction_rate';
  colorMapName: string;
}

/**
 * A component that renders a color legend for visualizing physics properties
 */
const ColorLegend: React.FC<ColorLegendProps> = ({
  min,
  max,
  visualizationType,
  colorMapName
}) => {
  // Get the actual color map object from the utility
  const activeColorMap = colorMaps[colorMapName];

  // If the map name is invalid, render nothing or a fallback
  if (!activeColorMap) {
    console.warn(`ColorLegend: Invalid colorMapName provided: ${colorMapName}`);
    return null; // Or render a default/error state
  }

  // Calculate midpoint
  const avg = (min + max) / 2;

  // Get title for the visualization type
  const getTitle = () => {
    switch (visualizationType) {
      case 'temperature':
        return 'Temperature (K)';
      case 'energy':
        return 'Energy (eV)';
      case 'reaction_rate':
        return 'Reaction Rate';
      default:
        return visualizationType;
    }
  };

  // Format values based on visualization type
  const formatValue = (value: number) => {
    switch (visualizationType) {
      case 'temperature':
        return `${value.toFixed(1)} K`;
      case 'energy':
        return `${value.toFixed(3)} eV`;
      case 'reaction_rate':
        return value.toExponential(2);
      default:
        return value.toFixed(2);
    }
  };

  return (
    <LegendContainer>
      <Typography variant="subtitle2" fontWeight="bold">
        {getTitle()}
      </Typography>
      
      <GradientBox sx={{ background: activeColorMap.cssGradient }} />
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Typography variant="caption">{formatValue(min)}</Typography>
        <Typography variant="caption">{formatValue(avg)}</Typography>
        <Typography variant="caption">{formatValue(max)}</Typography>
      </Box>
      
      <Typography variant="body2" sx={{ mt: 1, fontSize: '0.75rem' }}>
        {visualizationType === 'temperature' 
          ? 'Shows temperature variation across the lattice' 
          : visualizationType === 'energy'
            ? 'Shows energy distribution in the system'
            : 'Shows reaction activity in the lattice'}
      </Typography>
    </LegendContainer>
  );
};

export default ColorLegend; 