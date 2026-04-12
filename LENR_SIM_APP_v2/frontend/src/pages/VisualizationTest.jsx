/**
 * Visualization Test Page
 * For testing the UnifiedLENRVisualizer with mock data directly
 */
import React, { useState, useEffect } from 'react';
import { Button, Card, Col, Row, Space, Switch, Typography, Alert, message } from 'antd';
import { PlayCircleOutlined, ReloadOutlined, DatabaseOutlined } from '@ant-design/icons';
import UnifiedLENRVisualizer from '../components/visualization/UnifiedLENRVisualizer';
import axios from 'axios';
import { resolveApiUrl } from '../config/api';

const { Title, Text } = Typography;

const VisualizationTest = () => {
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
        resolveApiUrl('/api/simulations/test-visualization-data'),
        {},
        { timeout: 5000 }
      );
      
      setVisualizationData(response.data);
      message.success('Loaded mock data from backend');
    } catch (err) {
      console.error('Failed to load backend mock data:', err);
      setError('Failed to load backend data. Using local mock data instead.');
      
      // Fall back to local mock data
      const localData = generateLocalMockData();
      setVisualizationData(localData);
      message.info('Using local mock data');
    } finally {
      setLoading(false);
    }
  };

  // Generate and set local mock data
  const loadLocalMockData = () => {
    setError(null);
    const data = generateLocalMockData();
    setVisualizationData(data);
    message.success('Loaded local mock data');
  };

  // Clear visualization
  const clearVisualization = () => {
    setVisualizationData(null);
    setError(null);
    message.info('Visualization cleared');
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
    <div style={{ padding: '24px' }}>
      <Title level={2}>Visualization Test Page</Title>
      
      {error && (
        <Alert
          message="Warning"
          description={error}
          type="warning"
          showIcon
          closable
          onClose={() => setError(null)}
          style={{ marginBottom: 16 }}
        />
      )}
      
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card title="Test Controls">
            <Space size="large" wrap>
              <Button
                type="primary"
                icon={<PlayCircleOutlined />}
                onClick={loadLocalMockData}
              >
                Load Local Mock Data
              </Button>
              
              <Button
                icon={<DatabaseOutlined />}
                onClick={loadBackendMockData}
                loading={loading}
              >
                Load Backend Mock Data
              </Button>
              
              <Button
                icon={<ReloadOutlined />}
                onClick={clearVisualization}
              >
                Clear Visualization
              </Button>
              
              <Space>
                <Text>Show Fusion Events:</Text>
                <Switch
                  checked={showFusion}
                  onChange={setShowFusion}
                />
              </Space>
              
              <Space>
                <Text>Show Enhancement:</Text>
                <Switch
                  checked={showEnhancement}
                  onChange={setShowEnhancement}
                />
              </Space>
            </Space>
            
            <div style={{ marginTop: 16 }}>
              <Text type="secondary">
                This page tests the UnifiedLENRVisualizer component with mock data. 
                Use the controls above to load different data sets and toggle visualization features.
              </Text>
            </div>
          </Card>
        </Col>
        
        <Col span={24}>
          <Card 
            title="3D Visualization" 
            style={{ minHeight: 600 }}
            bodyStyle={{ height: 600, position: 'relative' }}
          >
            {visualizationData ? (
              <UnifiedLENRVisualizer
                visualizationData={visualizationData}
                showLattice={true}
                showFusion={showFusion}
                showEnhancement={showEnhancement}
                loading={loading}
              />
            ) : (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                height: '100%',
                color: '#999'
              }}>
                <Text>No visualization data loaded. Click "Load Local Mock Data" to start.</Text>
              </div>
            )}
          </Card>
        </Col>
        
        {visualizationData && (
          <Col span={24}>
            <Card title="Debug Information" collapsible>
              <pre style={{ 
                maxHeight: 300, 
                overflow: 'auto',
                fontSize: '12px',
                backgroundColor: '#f5f5f5',
                padding: '12px',
                borderRadius: '4px'
              }}>
                {JSON.stringify(visualizationData, null, 2)}
              </pre>
            </Card>
          </Col>
        )}
      </Row>
    </div>
  );
};

export default VisualizationTest;
