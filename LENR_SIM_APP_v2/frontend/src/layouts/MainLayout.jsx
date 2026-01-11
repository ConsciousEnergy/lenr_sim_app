import { useState } from 'react';
import { Layout, Menu, Button, Drawer, Typography } from 'antd';
import { MenuFoldOutlined, MenuUnfoldOutlined, DashboardOutlined, ExperimentOutlined, LineChartOutlined, SettingOutlined, HomeOutlined, PlusCircleOutlined } from '@ant-design/icons';
import { Link, useLocation } from 'react-router-dom';
import VisualizationStream from '../components/VisualizationStream';

const { Header, Sider, Content } = Layout;

const MainLayout = ({ children, simulationId }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [streamVisible, setStreamVisible] = useState(false);
  const location = useLocation();

  const toggleCollapsed = () => {
    setCollapsed(!collapsed);
  };

  const toggleStream = () => {
    setStreamVisible(!streamVisible);
  };

  const menuItems = [
    {
      key: '/',
      icon: <DashboardOutlined />,
      label: <Link to="/">Dashboard</Link>,
    },
    {
      key: '/simulations',
      icon: <ExperimentOutlined />,
      label: <Link to="/simulations">Simulations</Link>,
    },
    {
      key: '/results',
      icon: <LineChartOutlined />,
      label: <Link to="/results">Results</Link>,
    },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: <Link to="/settings">Settings</Link>,
    },
  ];

  const selectedKeys = menuItems
    .filter(item => location.pathname === item.key || location.pathname.startsWith(item.key + '/'))
    .map(item => item.key);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} trigger={null} width={240}>
        <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <h2 style={{ color: '#fff', margin: 0, fontSize: collapsed ? '14px' : '18px' }}>
            {collapsed ? 'LENR' : 'LENR Simulator'}
          </h2>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={selectedKeys}
          items={menuItems}
        />
      </Sider>
      <Layout>
        <Header style={{ padding: 0, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={toggleCollapsed}
            style={{ fontSize: '16px', width: 64, height: 64 }}
          />
          <div>
            <Button
              type="primary"
              icon={<PlusCircleOutlined />}
              style={{ marginRight: 16 }}
            >
              <Link to="/new-simulation" style={{ color: 'white' }}>New Simulation</Link>
            </Button>
            {simulationId && (
              <Button
                type="primary"
                onClick={toggleStream}
                style={{ marginRight: 16 }}
              >
                {streamVisible ? 'Hide Stream' : 'Show Stream'}
              </Button>
            )}
          </div>
        </Header>
        <Content
          style={{
            margin: '24px 16px',
            padding: 24,
            background: '#fff',
            minHeight: 280,
            overflow: 'auto',
          }}
        >
          {children}
        </Content>
      </Layout>
      
      {simulationId && (
        <Drawer
          title="Simulation Stream"
          placement="right"
          closable={true}
          onClose={() => setStreamVisible(false)}
          visible={streamVisible}
          width={400}
        >
          <VisualizationStream
            simulationId={simulationId}
            autoConnect={streamVisible}
            maxEvents={50}
          />
        </Drawer>
      )}
    </Layout>
  );
};

export default MainLayout; 