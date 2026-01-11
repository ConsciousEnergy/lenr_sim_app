import { useState } from 'react';
import { 
  Layout, 
  Row, 
  Col, 
  Tabs, 
  Card, 
  Typography, 
  Button, 
  Space, 
  Drawer
} from 'antd';
import { 
  DashboardOutlined, 
  LineChartOutlined, 
  NotificationOutlined 
} from '@ant-design/icons';
import SimulationMonitor from '../components/SimulationMonitor';
import VisualizationStream from '../components/VisualizationStream';

const { Header, Content } = Layout;
const { Title } = Typography;
const { TabPane } = Tabs;

/**
 * Simulation Dashboard page that combines monitoring and visualization components
 */
const SimulationDashboard = () => {
  // State
  const [selectedSimulationId, setSelectedSimulationId] = useState(null);
  const [streamDrawerVisible, setStreamDrawerVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('monitor');
  
  // Handle simulation selection for visualization
  const handleViewSimulation = (simulationId) => {
    setSelectedSimulationId(simulationId);
    
    // If on mobile, open drawer with visualization stream
    if (window.innerWidth < 768) {
      setStreamDrawerVisible(true);
    } else {
      // On desktop, switch to the visualization tab
      setActiveTab('visualization');
    }
  };
  
  // Toggle stream drawer (for mobile view)
  const toggleStreamDrawer = () => {
    setStreamDrawerVisible(!streamDrawerVisible);
  };
  
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: '#fff', padding: '0 16px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)' }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space align="center">
              <DashboardOutlined style={{ fontSize: 24 }} />
              <Title level={3} style={{ margin: 0 }}>Simulation Dashboard</Title>
            </Space>
          </Col>
          <Col>
            <Space>
              {selectedSimulationId && (
                <Button 
                  type="primary"
                  icon={<NotificationOutlined />}
                  onClick={toggleStreamDrawer}
                  style={{ display: { xs: 'inline-block', md: 'none' } }}
                >
                  Stream
                </Button>
              )}
            </Space>
          </Col>
        </Row>
      </Header>
      
      <Content style={{ padding: '16px' }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} md={24} lg={24}>
            <Tabs 
              activeKey={activeTab} 
              onChange={setActiveTab}
              size="large"
              type="card"
            >
              <TabPane 
                tab={
                  <span>
                    <DashboardOutlined />
                    Simulation Monitor
                  </span>
                } 
                key="monitor"
              >
                <Card>
                  <SimulationMonitor
                    onViewSimulation={handleViewSimulation}
                    refreshInterval={10000}
                  />
                </Card>
              </TabPane>
              
              {selectedSimulationId && (
                <TabPane
                  tab={
                    <span>
                      <LineChartOutlined />
                      Visualization ({selectedSimulationId.slice(-8)})
                    </span>
                  }
                  key="visualization"
                >
                  <Row gutter={[16, 16]}>
                    <Col xs={24}>
                      <VisualizationStream
                        simulationId={selectedSimulationId}
                        autoConnect={true}
                        maxEvents={50}
                      />
                    </Col>
                  </Row>
                </TabPane>
              )}
            </Tabs>
          </Col>
        </Row>
      </Content>
      
      {/* Mobile drawer for visualization stream */}
      <Drawer
        title={`Visualization Stream (${selectedSimulationId ? selectedSimulationId.slice(-8) : ''})`}
        placement="right"
        closable={true}
        onClose={() => setStreamDrawerVisible(false)}
        visible={streamDrawerVisible}
        width={320}
      >
        {selectedSimulationId && (
          <VisualizationStream
            simulationId={selectedSimulationId}
            autoConnect={true}
            maxEvents={20}
          />
        )}
      </Drawer>
    </Layout>
  );
};

export default SimulationDashboard; 