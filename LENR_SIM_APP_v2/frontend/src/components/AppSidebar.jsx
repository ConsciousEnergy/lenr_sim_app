import { Link, useLocation } from 'react-router-dom';
import {
  DashboardOutlined,
  ExperimentOutlined,
  SettingOutlined,
  LineChartOutlined,
  BookOutlined,
  TeamOutlined,
  MenuUnfoldOutlined,
  MenuFoldOutlined,
  CloseOutlined,
  ThunderboltOutlined,
  FireOutlined,
  ApiOutlined,
  BulbOutlined,
  InfoCircleOutlined,
  FundProjectionScreenOutlined,
  BarChartOutlined,
  EyeOutlined,
  BugOutlined,
  DotChartOutlined,
  RadarChartOutlined
} from '@ant-design/icons';

function AppSidebar({ collapsed, setCollapsed, toggleSidebar, isMobile }) {
  const location = useLocation();
  
  const getSelectedKey = () => {
    const path = location.pathname;
    if (path === '/' || path === '/dashboard') return 'dashboard';
    if (path === '/unified-theory') return 'unified-theory';
    if (path === '/simulations' || path === '/new-simulation') return 'simulations';
    if (path === '/lenr-simulation') return 'lenr-simulation';
    if (path === '/fusion-simulation') return 'fusion-simulation';
    if (path === '/quantum-tunneling') return 'quantum-tunneling';
    if (path === '/bubble-fusion') return 'bubble-fusion';
    if (path === '/analytics') return 'analytics';
    if (path === '/real-time-visualization') return 'real-time-viz';
    if (path === '/physics-dashboard') return 'physics-dashboard';
    if (path === '/physics-visualization') return 'physics-viz';
    if (path === '/documentation' || path === '/docs') return 'docs';
    if (path === '/theory') return 'theory-docs';
    if (path === '/about') return 'about';
    if (path === '/team') return 'team';
    if (path === '/settings') return 'settings';
    if (path.includes('/simulation/')) return 'simulations';
    return 'dashboard';
  };

  const selectedKey = getSelectedKey();
  
  const menuItems = [
    { key: 'dashboard', icon: <DashboardOutlined />, label: 'Dashboard', path: '/' },
    { key: 'divider1', type: 'divider' },
    { key: 'unified-theory', icon: <FundProjectionScreenOutlined />, label: 'Unified Theory', path: '/unified-theory', highlight: true },
    { key: 'simulations', icon: <ExperimentOutlined />, label: 'Run Simulations', path: '/simulations' },
    { key: 'lenr-simulation', icon: <ApiOutlined />, label: 'LENR Simulation', path: '/lenr-simulation', indent: true },
    { key: 'fusion-simulation', icon: <FireOutlined />, label: 'Fusion Simulation', path: '/fusion-simulation', indent: true },
    { key: 'quantum-tunneling', icon: <ThunderboltOutlined />, label: 'Quantum Tunneling', path: '/quantum-tunneling', indent: true },
    { key: 'bubble-fusion', icon: <BulbOutlined />, label: 'Bubble Fusion', path: '/bubble-fusion', indent: true },
    { key: 'divider2', type: 'divider' },
    { key: 'analytics', icon: <LineChartOutlined />, label: 'Analytics', path: '/analytics' },
    { key: 'real-time-viz', icon: <DotChartOutlined />, label: 'Real-Time Viz', path: '/real-time-visualization', indent: true },
    { key: 'physics-dashboard', icon: <BarChartOutlined />, label: 'Physics Dashboard', path: '/physics-dashboard', indent: true },
    { key: 'physics-viz', icon: <RadarChartOutlined />, label: 'Physics Viz', path: '/physics-visualization', indent: true },
    { key: 'divider3', type: 'divider' },
    { key: 'docs', icon: <BookOutlined />, label: 'Documentation', path: '/documentation' },
    { key: 'theory-docs', icon: <BookOutlined />, label: 'Theory Guide', path: '/theory', indent: true },
    { key: 'about', icon: <InfoCircleOutlined />, label: 'About', path: '/about', indent: true },
    { key: 'divider4', type: 'divider' },
    { key: 'team', icon: <TeamOutlined />, label: 'Team', path: '/team' },
    { key: 'settings', icon: <SettingOutlined />, label: 'Settings', path: '/settings' },
  ];
  
  const handleToggle = () => {
    if (toggleSidebar) {
      toggleSidebar();
    } else if (setCollapsed) {
      setCollapsed(!collapsed);
    }
  };
  
  return (
    <aside className={`bg-white border-r border-neutral-200 transition-all duration-300 h-full 
      ${collapsed && !isMobile ? 'w-20' : 'w-64'}
      ${isMobile ? 'shadow-lg' : ''}
    `}>
      <div className="flex justify-between items-center h-16 px-4 border-b border-neutral-200">
        {(!collapsed || isMobile) && <span className="text-lg font-semibold text-neutral-900">LENR App</span>}
        <button 
          onClick={handleToggle} 
          className="p-2 rounded-md hover:bg-neutral-100 text-neutral-700"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isMobile ? 
            <CloseOutlined /> : 
            (collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />)
          }
        </button>
      </div>
      
      <nav className="py-4">
        <ul>
          {menuItems.map((item) => {
            if (item.type === 'divider') {
              return (
                <li key={item.key} className="my-2">
                  <hr className="border-neutral-200 mx-4" />
                </li>
              );
            }
            return (
            <li key={item.key}>
              <Link 
                to={item.path}
                className={`flex items-center px-4 py-3 text-sm ${
                    item.indent ? 'pl-12' : ''
                  } ${
                  selectedKey === item.key 
                    ? 'bg-primary-50 text-primary-700 border-r-4 border-primary-500' 
                    : item.highlight
                    ? 'text-primary-600 bg-primary-50/50 hover:bg-primary-100 font-medium'
                    : 'text-neutral-700 hover:bg-neutral-50'
                }`}
                onClick={isMobile ? handleToggle : undefined}
              >
                <span className={`text-lg ${(collapsed && !isMobile) ? 'ml-1' : 'mr-3'}`}>{item.icon}</span>
                {(!collapsed || isMobile) && <span>{item.label}</span>}
                {(!collapsed || isMobile) && item.highlight && (
                  <span className="ml-auto text-xs bg-primary-500 text-white px-2 py-0.5 rounded-full">NEW</span>
                )}
              </Link>
            </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}

export default AppSidebar; 