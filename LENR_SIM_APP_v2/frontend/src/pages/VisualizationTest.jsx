/**
 * Visualization Test Page
 * For testing the UnifiedLENRVisualizer with mock data directly
 */
import React, { useState, useEffect } from 'react';
import { Button, Card, CardContent, CardHeader, Stack, Switch, Typography, Alert, FormControlLabel, Box } from '@mui/material';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';
import StorageIcon from '@mui/icons-material/Storage';
import { useSnackbar } from 'notistack';
import UnifiedLENRVisualizer from '../components/visualization/UnifiedLENRVisualizer';
import axios from 'axios';

const VisualizationTest = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [visualizationData, setVisualizationData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [autoRotate, setAutoRotate] = useState(false);
  const [showFusion, setShowFusion] = useState(true);
  const [showEnhancement, setShowEnhancement] = useState(true);
  const [error, setError] = useState(null);

  // Generate local mock data
  const generateLocalMockData = () => {
    console.log('Generating local mock visualization data');
    
    const latticeSize = 6;
    const latticeConstant = 3.89;
    const latticePoints = [];
    
    // Generate FCC lattice points
    for (let x = 0; x < latticeSize; x++) {
      for (let y = 0; y < latticeSize; y++) {
        for (let z = 0; z < latticeSize; z++) {
          // Corner atoms
          latticePoints.push({ 
            x: x * latticeConstant, 
            y: y * latticeConstant, 
            z: z * latticeConstant,
            type: 'host'
          });
          
          // Face-centered atoms (FCC structure)
          if (x < latticeSize - 1 && y < latticeSize - 1) {
            latticePoints.push({ 
              x: (x + 0.5) * latticeConstant, 
              y: (y + 0.5) * latticeConstant, 
              z: z * latticeConstant,
              type: 'host'
            });
          }
          if (x < latticeSize - 1 && z < latticeSize - 1) {
            latticePoints.push({ 
              x: (x + 0.5) * latticeConstant, 
              y: y * latticeConstant, 
              z: (z + 0.5) * latticeConstant,
              type: 'host'
            });
          }
          if (y < latticeSize - 1 && z < latticeSize - 1) {
            latticePoints.push({ 
              x: x * latticeConstant, 
              y: (y + 0.5) * latticeConstant, 
              z: (z + 0.5) * latticeConstant,
              type: 'host'
            });
          }
        }
      }
    }
    
    // Generate fusion events
    const fusionEvents = [];
    for (let i = 0; i < 8; i++) {
      fusionEvents.push({
        position: {
          x: Math.random() * (latticeSize - 1) * latticeConstant,
          y: Math.random() * (latticeSize - 1) * latticeConstant,
          z: Math.random() * (latticeSize - 1) * latticeConstant
        },
        energy: Math.random() * 15 + 5,
        time: Math.random() * 60
      });
    }
    
    // Generate enhancement regions
    const enhancementData = {
      regions: [
        {
          coordinates: {
            x: latticeSize * latticeConstant * 0.3,
            y: latticeSize * latticeConstant * 0.3,
            z: latticeSize * latticeConstant * 0.3
          },
          radius: 4.0,
          enhancement_factor: 2.0,
          type: 'phonon_coupling'
        },
        {
          coordinates: {
            x: latticeSize * latticeConstant * 0.7,
            y: latticeSize * latticeConstant * 0.7,
            z: latticeSize * latticeConstant * 0.7
          },
          radius: 3.0,
          enhancement_factor: 3.0,
          type: 'quantum_coherence'
        }
      ]
    };
    
    // Generate time series data
    const energyData = Array(120).fill(0).map((_, i) => 
      12 + 6 * Math.sin(i * 0.1) + Math.random() * 3
    );
    
    const temperatureData = Array(120).fill(0).map((_, i) => ({
      time: i * 0.1,
      value: 300 + 25 * Math.sin(i * 0.05) + Math.random() * 10
    }));
    
    return {
      latticeData: {
        type: 'FCC',
        material: 'palladium',
        temperature: 300,
        loading_ratio: 0.7,
        points: latticePoints
      },
      fusionEvents: showFusion ? fusionEvents : [],
      enhancementData: showEnhancement ? enhancementData : { regions: [] },
      energyData: energyData,
      temperatureData: temperatureData,
      fluidDynamicsData: []
    };
  };

  // Load mock data from backend
  const loadBackendMockData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Try to fetch test data from the mock backend endpoint
      const response = await axios.post(
        'http://localhost:8000/api/simulations/test-visualization-data',
        {},
        { timeout: 5000 }
      );
      
      setVisualizationData(response.data);
      enqueueSnackbar('Loaded mock data from backend', { variant: 'success' });
    } catch (err) {
      console.error('Failed to load backend mock data:', err);
      setError('Failed to load backend data. Using local mock data instead.');
      
      // Fall back to local mock data
      const localData = generateLocalMockData();
      setVisualizationData(localData);
      enqueueSnackbar('Using local mock data', { variant: 'info' });
    } finally {
      setLoading(false);
    }
  };

  // Generate and set local mock data
  const loadLocalMockData = () => {
    setError(null);
    const data = generateLocalMockData();
    setVisualizationData(data);
    enqueueSnackbar('Loaded local mock data', { variant: 'success' });
  };

  // Clear visualization
  const clearVisualization = () => {
    setVisualizationData(null);
    setError(null);
    enqueueSnackbar('Visualization cleared', { variant: 'info' });
  };

  // Update visualization when fusion/enhancement toggles change
  useEffect(() => {
    if (visualizationData) {
      const updatedData = {
        ...visualizationData,
        fusionEvents: showFusion ? visualizationData.fusionEvents : [],
        enhancementData: showEnhancement ? visualizationData.enhancementData : { regions: [] }
      };
      setVisualizationData(updatedData);
    }
  }, [showFusion, showEnhancement]);

  // Load initial data on mount
  useEffect(() => {
    loadLocalMockData();
  }, []);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h2" gutterBottom>Visualization Test Page</Typography>
      
      {error && (
        <Alert
          severity="warning"
          onClose={() => setError(null)}
          sx={{ mb: 2 }}
        >
          {error}
        </Alert>
      )}
      
      <Stack spacing={2}>
        <Card>
          <CardHeader title="Test Controls" />
          <CardContent>
            <Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap alignItems="center">
              <Button
                variant="contained"
                startIcon={<PlayCircleOutlineIcon />}
                onClick={loadLocalMockData}
              >
                Load Local Mock Data
              </Button>
              
              <Button
                variant="outlined"
                startIcon={<StorageIcon />}
                onClick={loadBackendMockData}
                disabled={loading}
              >
                Load Backend Mock Data
              </Button>
              
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={clearVisualization}
              >
                Clear Visualization
              </Button>
              
              <FormControlLabel
                control={<Switch checked={showFusion} onChange={(e) => setShowFusion(e.target.checked)} />}
                label="Show Fusion Events"
              />
              
              <FormControlLabel
                control={<Switch checked={showEnhancement} onChange={(e) => setShowEnhancement(e.target.checked)} />}
                label="Show Enhancement"
              />
            </Stack>
            
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary">
                This page tests the UnifiedLENRVisualizer component with mock data. 
                Use the controls above to load different data sets and toggle visualization features.
              </Typography>
            </Box>
          </CardContent>
        </Card>
        
        <Card sx={{ minHeight: 600 }}>
          <CardHeader title="3D Visualization" />
          <CardContent sx={{ height: 600, position: 'relative' }}>
            {visualizationData ? (
              <UnifiedLENRVisualizer
                visualizationData={visualizationData}
                showLattice={true}
                showFusion={showFusion}
                showEnhancement={showEnhancement}
                loading={loading}
              />
            ) : (
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                height: '100%',
                color: 'text.disabled'
              }}>
                <Typography>No visualization data loaded. Click "Load Local Mock Data" to start.</Typography>
              </Box>
            )}
          </CardContent>
        </Card>
        
        {visualizationData && (
          <Card>
            <CardHeader title="Debug Information" />
            <CardContent>
              <Box
                component="pre"
                sx={{ 
                  maxHeight: 300, 
                  overflow: 'auto',
                  fontSize: '12px',
                  backgroundColor: '#f5f5f5',
                  p: 1.5,
                  borderRadius: 1
                }}
              >
                {JSON.stringify(visualizationData, null, 2)}
              </Box>
            </CardContent>
          </Card>
        )}
      </Stack>
    </Box>
  );
};

export default VisualizationTest;
