/**
 * Test component for verifying the TypeScript implementation of UnifiedLENRVisualizer
 */
import React from 'react';
import { Box, Typography, Card, CardContent, Button } from '@mui/material';
import UnifiedLENRVisualizer from './UnifiedLENRVisualizer';
import { VisualizationData } from './interfaces';

const TypeScriptTest: React.FC = () => {
  const [visualizationData, setVisualizationData] = React.useState<VisualizationData | null>(null);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);

  // Generate mock visualization data
  const generateMockData = (): VisualizationData => {
    return {
      latticeData: {
        material: 'palladium',
        temperature: 300,
        pressure: 101325,
        lattice_constant: 3.89e-10,
        loading_ratio: 0.6,
        type: 'FCC',
      },
      fusionEvents: [
        {
          position: { x: 2, y: 2, z: 2 },
          intensity: 0.8,
          type: 'dd_fusion'
        },
        {
          position: { x: 4, y: 3, z: 1 },
          intensity: 0.6,
          type: 'dt_fusion'
        }
      ],
      enhancementData: {
        regions: [
          {
            coordinates: { x: 3, y: 3, z: 3 },
            radius: 2,
            intensity: 0.7,
            type: 'phonon_enhancement'
          }
        ],
        enhancementFactor: 1.5,
        coherenceFactor: 0.8,
        phononAssist: 1.2,
      }
    };
  };

  // Load mock data
  const handleLoadMockData = () => {
    setLoading(true);
    try {
      // Simulate API delay
      setTimeout(() => {
        const mockData = generateMockData();
        setVisualizationData(mockData);
        setLoading(false);
      }, 1000);
    } catch (err) {
      setError('Error loading mock data');
      setLoading(false);
    }
  };

  // Clear data
  const handleClearData = () => {
    setVisualizationData(null);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        TypeScript Visualization Test
      </Typography>
      
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Visualization Controls
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <Button 
              variant="contained" 
              color="primary" 
              onClick={handleLoadMockData}
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Load Mock Data'}
            </Button>
            <Button 
              variant="outlined" 
              color="secondary" 
              onClick={handleClearData}
              disabled={loading}
            >
              Clear Data
            </Button>
          </Box>
          
          {error && (
            <Typography color="error" sx={{ mt: 2 }}>
              {error}
            </Typography>
          )}
          
          <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
            This component tests the TypeScript implementation of the UnifiedLENRVisualizer.
            Click "Load Mock Data" to generate and load mock visualization data.
          </Typography>
        </CardContent>
      </Card>
      
      <Box sx={{ height: '600px', border: '1px solid #ddd', borderRadius: 1, overflow: 'hidden' }}>
        <UnifiedLENRVisualizer 
          visualizationData={visualizationData || undefined}
          loading={loading}
          showLattice={true}
          showFusion={true}
          showEnhancement={true}
        />
      </Box>
    </Box>
  );
};

export default TypeScriptTest; 