import { useState, useEffect, useCallback } from 'react';
import { useParams, useLocation } from 'react-router-dom';
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
import { simulationApi } from '../api/simulationApi';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

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
  const location = useLocation();
  const preview = location.state?.simulationPreview || null;
  const [simulation, setSimulation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState('');

  const buildSimulationFromPreview = useCallback((snapshot) => ({
    id: snapshot.id ?? simulationId,
    name: snapshot.name ?? `${snapshot.type || 'Simulation'} (${snapshot.id || simulationId})`,
    description: `Loaded from analytics history snapshot (${snapshot.source || 'unknown source'})`,
    status: snapshot.status || 'completed',
    progress: snapshot.status === 'completed' ? 100 : 0,
    createdAt: snapshot.timestamp || new Date().toISOString(),
    estimatedCompletion: null,
    parameters: snapshot.parameters || {},
    resources: {
      cpuCores: 4,
      gpuEnabled: false,
      memory: 'N/A',
      estimatedRuntime: 'N/A',
    },
  }), [simulationId]);

  const fetchSimulation = useCallback(async () => {
    if (!simulationId) return;
    setLoading(true);
    setError(null);

    try {
      // Use the real API client (falls back to mock internally when backend is unreachable)
      const data = await simulationApi.getSimulationStatus(simulationId);

      // Normalise field names -- the API may return snake_case or camelCase
      setSimulation({
        id: data.id ?? data.simulation_id ?? simulationId,
        name: data.name ?? data.simulation_name ?? `Simulation ${simulationId}`,
        description: data.description ?? '',
        status: data.status ?? 'pending',
        progress: data.progress ?? 0,
        createdAt: data.createdAt ?? data.created_at ?? new Date().toISOString(),
        estimatedCompletion: data.estimatedCompletion ?? data.estimated_completion ?? null,
        parameters: data.parameters ?? {},
        resources: data.resources ?? {
          cpuCores: data.cpu_cores ?? 4,
          gpuEnabled: data.gpu_enabled ?? false,
          memory: data.memory ?? '8GB',
          estimatedRuntime: data.estimated_runtime ?? 'N/A',
        },
      });
      setNotice('');
    } catch (err) {
      console.error('Failed to fetch simulation:', err);
      if (preview) {
        setSimulation(buildSimulationFromPreview(preview));
        setNotice(`Live details unavailable for ${simulationId}. Showing stored history snapshot.`);
        setError(null);
      } else {
        setError(`Unable to load simulation ${simulationId}. ${err.message ?? ''}`);
      }
    } finally {
      setLoading(false);
    }
  }, [simulationId, preview, buildSimulationFromPreview]);

  useEffect(() => {
    fetchSimulation();
  }, [fetchSimulation]);
  
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
        <div style={{ marginTop: 16 }}>
          <Button type="primary" icon={<ReloadOutlined />} onClick={fetchSimulation}>
            Retry
          </Button>
        </div>
      </div>
    );
  }
  
  if (!simulation) {
    return null;
  }
  
  return (
    <div>
      <Card style={{ marginBottom: 16 }}>
        {notice ? (
          <Card style={{ marginBottom: 16, background: '#fffbe6', borderColor: '#ffe58f' }}>
            <Text>{notice}</Text>
          </Card>
        ) : null}
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