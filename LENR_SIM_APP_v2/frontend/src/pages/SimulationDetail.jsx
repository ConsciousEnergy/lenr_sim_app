import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
  Typography, 
  Card, 
  Row, 
  Col, 
  Descriptions, 
  Tag, 
  Progress, 
  Tabs,
  Divider,
  Space,
  Button
} from 'antd';
import { 
  PlayCircleOutlined, 
  PauseCircleOutlined, 
  ReloadOutlined, 
  DownloadOutlined,
  EyeOutlined
} from '@ant-design/icons';
import VisualizationStream from '../components/VisualizationStream';
import ParameterControls from '../components/ParameterControls';
import SimulationResults from '../components/SimulationResults';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

// Mock data - in a real app, you would fetch this from your API
const MOCK_SIMULATIONS = {
  'sim-123': {
    id: 'sim-123',
    name: 'Lattice Heating Model',
    description: 'Simulation of heat distribution in palladium lattice with deuterium loading',
    status: 'running',
    progress: 67,
    createdAt: '2023-09-15T10:30:00Z',
    estimatedCompletion: '2023-09-15T12:30:00Z',
    parameters: {
      latticeType: 'FCC',
      latticeConstant: 3.89,
      dimensions: [50, 50, 50],
      temperature: 300,
      deuteriumConcentration: 0.7,
      thermalConductivity: 71.8
    },
    resources: {
      cpuCores: 4,
      gpuEnabled: true,
      memory: '8GB',
      estimatedRuntime: '2 hours'
    }
  },
  'sim-456': {
    id: 'sim-456',
    name: 'Electrolysis Cell Dynamics',
    description: 'Simulation of electrolysis cell with palladium cathode in heavy water',
    status: 'completed',
    progress: 100,
    createdAt: '2023-09-14T08:15:00Z',
    estimatedCompletion: '2023-09-14T10:45:00Z',
    parameters: {
      cellGeometry: 'cylindrical',
      cathodeArea: 12.5,
      anodeArea: 25.0,
      electrolyteMolarity: 0.1,
      currentDensity: 200,
      temperature: 295
    },
    resources: {
      cpuCores: 8,
      gpuEnabled: true,
      memory: '16GB',
      estimatedRuntime: '2.5 hours'
    }
  },
  'sim-789': {
    id: 'sim-789',
    name: 'Quantum Tunneling Analysis',
    description: 'Simulation of deuteron tunneling through palladium lattice potential barriers',
    status: 'error',
    progress: 43,
    createdAt: '2023-09-12T14:20:00Z',
    estimatedCompletion: null,
    parameters: {
      potentialModel: 'screened-coulomb',
      barrierHeight: 24.3,
      quantumEffects: 'WKB',
      temperatureRange: [250, 350],
      stepSize: 10
    },
    resources: {
      cpuCores: 16,
      gpuEnabled: true,
      memory: '32GB',
      estimatedRuntime: '6 hours'
    }
  }
};

const getStatusTag = (status) => {
  const statusMap = {
    'pending': { color: 'default', text: 'Pending' },
    'running': { color: 'processing', text: 'Running' },
    'paused': { color: 'warning', text: 'Paused' },
    'completed': { color: 'success', text: 'Completed' },
    'error': { color: 'error', text: 'Error' }
  };
  
  const config = statusMap[status] || statusMap.pending;
  return <Tag color={config.color}>{config.text}</Tag>;
};

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleString();
};

function SimulationDetail() {
  const { simulationId } = useParams();
  const [simulation, setSimulation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    // Simulate API fetch with setTimeout
    setLoading(true);
    
    setTimeout(() => {
      let foundSimulation = MOCK_SIMULATIONS[simulationId];
      
      // If not found in mock data, create a new simulation entry
      // This handles dynamically created simulation IDs from NewSimulation page
      if (!foundSimulation && simulationId) {
        foundSimulation = {
          id: simulationId,
          name: `New Simulation ${simulationId.replace('sim-', '')}`,
          description: 'Newly created LENR simulation - configure parameters to start',
          status: 'pending',
          progress: 0,
          createdAt: new Date().toISOString(),
          estimatedCompletion: null,
          parameters: {
            latticeType: 'FCC',
            latticeConstant: 3.89,
            dimensions: [10, 10, 10],
            temperature: 300,
            deuteriumConcentration: 0.8,
            thermalConductivity: 71.8
          },
          resources: {
            cpuCores: 4,
            gpuEnabled: true,
            memory: '8GB',
            estimatedRuntime: 'TBD'
          }
        };
      }
      
      if (foundSimulation) {
        setSimulation(foundSimulation);
        setError(null);
      } else {
        setError(`Simulation with ID ${simulationId} not found`);
      }
      
      setLoading(false);
    }, 800); // Simulate network delay
  }, [simulationId]);
  
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 24 }}>
        <Title level={3}>Loading simulation details...</Title>
      </div>
    );
  }
  
  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: 24 }}>
        <Title level={3}>Error</Title>
        <Text type="danger">{error}</Text>
      </div>
    );
  }
  
  if (!simulation) {
    return null;
  }
  
  return (
    <div>
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={16}>
            <Title level={2}>{simulation.name}</Title>
            <Text>{simulation.description}</Text>
          </Col>
          <Col xs={24} md={8} style={{ textAlign: 'right' }}>
            <Space>
              {simulation.status === 'running' && (
                <Button 
                  type="primary" 
                  icon={<PauseCircleOutlined />}
                  ghost
                >
                  Pause
                </Button>
              )}
              
              {simulation.status === 'paused' && (
                <Button 
                  type="primary" 
                  icon={<PlayCircleOutlined />}
                >
                  Resume
                </Button>
              )}
              
              {simulation.status === 'error' && (
                <Button 
                  type="primary" 
                  icon={<ReloadOutlined />}
                  danger
                >
                  Retry
                </Button>
              )}
              
              {simulation.status === 'completed' && (
                <Button 
                  type="primary" 
                  icon={<DownloadOutlined />}
                >
                  Download Results
                </Button>
              )}
              
              <Button 
                type="default" 
                icon={<EyeOutlined />}
              >
                View Data
              </Button>
            </Space>
          </Col>
        </Row>

        <Divider />
        
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <Descriptions title="Simulation Status" bordered size="small">
              <Descriptions.Item label="Status" span={3}>{getStatusTag(simulation.status)}</Descriptions.Item>
              <Descriptions.Item label="Progress" span={3}>
                <Progress percent={simulation.progress} status={simulation.status === 'error' ? 'exception' : undefined} />
              </Descriptions.Item>
              <Descriptions.Item label="Created" span={3}>{formatDate(simulation.createdAt)}</Descriptions.Item>
              {simulation.estimatedCompletion && (
                <Descriptions.Item label="Est. Completion" span={3}>
                  {formatDate(simulation.estimatedCompletion)}
                </Descriptions.Item>
              )}
            </Descriptions>
          </Col>
          
          <Col xs={24} md={12}>
            <Descriptions title="Resources" bordered size="small">
              <Descriptions.Item label="CPU Cores">{simulation.resources.cpuCores}</Descriptions.Item>
              <Descriptions.Item label="GPU Enabled">{simulation.resources.gpuEnabled ? 'Yes' : 'No'}</Descriptions.Item>
              <Descriptions.Item label="Memory">{simulation.resources.memory}</Descriptions.Item>
              <Descriptions.Item label="Est. Runtime" span={3}>{simulation.resources.estimatedRuntime}</Descriptions.Item>
            </Descriptions>
          </Col>
        </Row>
      </Card>
      
      <Tabs defaultActiveKey="live" style={{ marginBottom: 16 }}>
        <TabPane tab="Live Updates" key="live">
          <VisualizationStream 
            simulationId={simulationId}
            apiBaseUrl="/api"
            autoConnect={simulation.status === 'running'}
            maxEvents={50}
          />
        </TabPane>
        
        <TabPane tab="Parameters" key="parameters">
          <ParameterControls
            initialParameters={simulation.parameters}
            onParametersChange={(params) => console.log('Parameters changed:', params)}
            onStartSimulation={(params) => console.log('Start simulation with:', params)}
            disabled={simulation.status === 'running'}
            mode="basic"
          />
        </TabPane>
        
        <TabPane tab="Results" key="results">
          {simulation.status === 'completed' || simulation.status === 'running' ? (
            <SimulationResults 
              simulationId={simulationId}
              apiBaseUrl="/api"
              autoUpdate={simulation.status === 'running'}
              updateInterval={5000}
            />
          ) : (
            <Card>
              <div style={{ textAlign: 'center', padding: 40 }}>
                <Title level={4}>Results will be available once the simulation starts</Title>
                <Text>Current status: {getStatusTag(simulation.status)}</Text>
              </div>
            </Card>
          )}
        </TabPane>
      </Tabs>
    </div>
  );
}

export default SimulationDetail; 