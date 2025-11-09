import { useState, useEffect } from 'react';
import { Layout, Card, Select, Typography, Space, Form, Divider, Switch, Button } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import VisualizationStream from '../components/VisualizationStream';

const { Header, Content } = Layout;
const { Title, Text } = Typography;
const { Option } = Select;

const VisualizationStreamPage = () => {
  const [simulations, setSimulations] = useState([]);
  const [selectedSimulation, setSelectedSimulation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [autoConnect, setAutoConnect] = useState(true);
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

  // eslint-disable-next-line react-hooks/exhaustive-deps
useEffect(() => {
    fetchSimulations();
  }, []);

  const fetchSimulations = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/simulations`);
      
      if (!response.ok) {
        throw new Error(`Error fetching simulations: ${response.statusText}`);
      }
      
      const data = await response.json();
      setSimulations(data.simulations || []);
    } catch (error) {
      console.error('Failed to fetch simulations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSimulationChange = (simulationId) => {
    setSelectedSimulation(simulationId);
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: '#fff', padding: '0 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '100%' }}>
          <Title level={3} style={{ margin: 0 }}>Simulation Visualization Stream</Title>
        </div>
      </Header>
      
      <Content style={{ padding: '20px' }}>
        <Card>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Form 
              layout="inline" 
              id="visualization-stream-form" 
              name="visualization-stream-form"
              role="form"
              aria-label="Visualization stream controls"
            >
              <Form.Item 
                label="Select Simulation" 
                htmlFor="simulation-selector"
                name="simulation"
              >
                <Select
                  placeholder="Select a simulation"
                  style={{ width: 300 }}
                  onChange={handleSimulationChange}
                  loading={loading}
                  value={selectedSimulation}
                  allowClear
                  id="simulation-selector"
                  name="simulation-selector"
                  aria-label="Select a simulation to visualize"
                >
                  {simulations.map(sim => (
                    <Option key={sim.id} value={sim.id} id={`simulation-option-${sim.id}`}>
                      {sim.name || sim.id} - {sim.status}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
              
              <Form.Item name="refresh-simulations">
                <Button
                  type="text"
                  onClick={fetchSimulations}
                  icon={<ReloadOutlined aria-hidden="true" />}
                  id="refresh-simulations-button"
                  name="refresh-simulations-button"
                  aria-label="Refresh simulations list"
                />
              </Form.Item>

              <Form.Item 
                label="Auto-connect" 
                htmlFor="auto-connect-switch"
                name="auto-connect"
              >
                <Switch 
                  checked={autoConnect} 
                  onChange={setAutoConnect} 
                  id="auto-connect-switch"
                  name="auto-connect-switch"
                  aria-label="Toggle auto-connect"
                />
              </Form.Item>
            </Form>
            
            <Divider />
            
            <VisualizationStream 
              simulationId={selectedSimulation}
              apiBaseUrl={API_BASE_URL}
              autoConnect={autoConnect}
              maxEvents={50}
            />
          </Space>
        </Card>
      </Content>
    </Layout>
  );
};

export default VisualizationStreamPage; 