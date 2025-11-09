import { useState } from 'react';
import { Layout, Typography, Breadcrumb, Card, Tabs, Space, Button } from 'antd';
import { DashboardOutlined, BarChartOutlined, LineChartOutlined } from '@ant-design/icons';
import SimulationMonitor from '../components/SimulationMonitor';
import VisualizationStream from '../components/VisualizationStream';

const { Content } = Layout;
const { Title } = Typography;
const { TabPane } = Tabs;

/**
 * Enhanced VisualizationPage component that integrates multiple visualization tools
 */
const VisualizationPage = () => {
  const [activeTab, setActiveTab] = useState('monitor');
  
  return (
    <Layout className="site-layout">
      <Content style={{ margin: '0 16px', padding: 24 }}>
        <Breadcrumb style={{ margin: '16px 0' }}>
          <Breadcrumb.Item>Home</Breadcrumb.Item>
          <Breadcrumb.Item>Visualization</Breadcrumb.Item>
        </Breadcrumb>
        
        <div className="site-layout-background" style={{ padding: 24, minHeight: 360 }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Title level={2}>Simulation Visualization</Title>
            
            <Tabs 
              activeKey={activeTab} 
              onChange={setActiveTab}
              tabPosition="top"
              size="large"
              style={{ marginBottom: 32 }}
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
                <SimulationMonitor 
                  autoConnect={false} 
                  onStatusChange={(status) => {
                    console.log('Simulation status changed:', status);
                  }} 
                />
              </TabPane>
              
              <TabPane 
                tab={
                  <span>
                    <LineChartOutlined />
                    Real-time Stream
                  </span>
                } 
                key="stream"
              >
                <VisualizationStream 
                  autoConnect={false}
                  maxEvents={50}
                />
              </TabPane>
              
              <TabPane 
                tab={
                  <span>
                    <BarChartOutlined />
                    Analysis Dashboard
                  </span>
                } 
                key="dashboard"
              >
                <Card>
                  <Space direction="vertical" align="center" style={{ width: '100%', padding: 40 }}>
                    <Title level={4}>Advanced Analysis Dashboard</Title>
                    <p>This feature will provide advanced analysis tools for simulation results.</p>
                    <Button type="primary">Coming Soon</Button>
                  </Space>
                </Card>
              </TabPane>
            </Tabs>
          </Space>
        </div>
      </Content>
    </Layout>
  );
};

export default VisualizationPage; 