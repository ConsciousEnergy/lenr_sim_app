import React, { useState, useEffect } from 'react';
import { Row, Col, Tabs, Layout, Typography, Card, Select, Space, Divider } from 'antd';
import SimulationMonitor from './SimulationMonitor';
import SimulationVisualizer from './SimulationVisualizer';
import VisualizationStream from './VisualizationStream';

const { Content } = Layout;
const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;

/**
 * VisualizationDashboard component that integrates monitoring and visualization components
 * 
 * @param {Object} props Component props
 * @param {number} props.refreshInterval Refresh interval in seconds (default: 10)
 */
const VisualizationDashboard = ({ 
  refreshInterval = 10
}) => {
  // State
  const [selectedSimulationId, setSelectedSimulationId] = useState(null);
  const [activeTab, setActiveTab] = useState('monitor');
  const [layout, setLayout] = useState('vertical'); // 'vertical' or 'horizontal'
  
  // Handle simulation selection
  const handleSimulationSelect = (simulationId) => {
    setSelectedSimulationId(simulationId);
    
    // Switch to visualizer tab if a simulation is selected
    if (simulationId && activeTab === 'monitor') {
      setActiveTab('visualizer');
    }
  };
  
  // Toggle layout
  const toggleLayout = () => {
    setLayout(layout === 'vertical' ? 'horizontal' : 'vertical');
  };
  
  // Vertical layout (full height components)
  const renderVerticalLayout = () => (
    <Tabs 
      activeKey={activeTab} 
      onChange={setActiveTab}
      tabPosition="top"
      style={{ height: 'calc(100vh - 200px)' }}
    >
      <TabPane tab="Monitor" key="monitor" style={{ height: 'calc(100vh - 250px)' }}>
        <SimulationMonitor 
          refreshInterval={refreshInterval}
          onSimulationSelect={handleSimulationSelect}
          selectedSimulationId={selectedSimulationId}
          style={{ height: '100%' }}
        />
      </TabPane>
      
      <TabPane tab="Visualizer" key="visualizer">
        <SimulationVisualizer 
          simulationId={selectedSimulationId}
        />
      </TabPane>
      
      <TabPane tab="Event Stream" key="stream">
        <VisualizationStream 
          simulationId={selectedSimulationId}
          autoConnect={!!selectedSimulationId}
        />
      </TabPane>
    </Tabs>
  );
  
  // Horizontal layout (side-by-side components)
  const renderHorizontalLayout = () => (
    <Row gutter={[16, 16]}>
      <Col span={24} style={{ height: 'calc(50vh - 100px)', minHeight: '400px' }}>
        <SimulationMonitor 
          refreshInterval={refreshInterval}
          onSimulationSelect={handleSimulationSelect}
          selectedSimulationId={selectedSimulationId}
          style={{ height: '100%' }}
        />
      </Col>
      
      <Col xs={24} lg={16}>
        <SimulationVisualizer 
          simulationId={selectedSimulationId}
        />
      </Col>
      
      <Col xs={24} lg={8}>
        <VisualizationStream 
          simulationId={selectedSimulationId}
          autoConnect={!!selectedSimulationId}
        />
      </Col>
    </Row>
  );
  
  return (
    <Layout style={{ padding: '0 24px 24px' }}>
      <Content style={{ padding: '24px 0' }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Card>
            <Space direction="horizontal" style={{ width: '100%', justifyContent: 'space-between' }}>
              <Title level={3}>Simulation Visualization Dashboard</Title>
              
              <Space>
                <Text strong>Layout:</Text>
                <Select 
                  value={layout} 
                  onChange={setLayout}
                  style={{ width: 130 }}
                >
                  <Option value="vertical">Tabbed View</Option>
                  <Option value="horizontal">Dashboard View</Option>
                </Select>
                
                {selectedSimulationId && (
                  <>
                    <Divider type="vertical" />
                    <Text strong>Selected Simulation:</Text>
                    <Text code>{selectedSimulationId}</Text>
                  </>
                )}
              </Space>
            </Space>
          </Card>
          
          {layout === 'vertical' ? renderVerticalLayout() : renderHorizontalLayout()}
        </Space>
      </Content>
    </Layout>
  );
};

export default VisualizationDashboard; 