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
  AtomOutlined,
  BulbOutlined
} from '@ant-design/icons';

function AppSidebar({ collapsed, setCollapsed, toggleSidebar, isMobile }) {
  const location = useLocation();
  
  const getSelectedKey = () => {
    const path = location.pathname;
    if (path === '/' || path === '/dashboard') return 'dashboard';
    if (path.includes('/simulation')) return 'simulations';
    if (path === '/settings') return 'settings';
    if (path === '/analytics') return 'analytics';
    if (path === '/docs') return 'docs';
    if (path === '/team') return 'team';
    if (path === '/quantum-tunneling') return 'quantum-tunneling';
    if (path === '/fusion-simulation') return 'fusion-simulation';
    if (path === '/lenr-simulation') return 'lenr-simulation';
    if (path === '/bubble-fusion') return 'bubble-fusion';
    return 'dashboard';
  };

  const selectedKey = getSelectedKey();
  
  const menuItems = [
    { key: 'dashboard', icon: <DashboardOutlined />, label: 'Dashboard', path: '/dashboard' },
    { key: 'simulations', icon: <ExperimentOutlined />, label: 'Simulations', path: '/' },
    { key: 'quantum-tunneling', icon: <ThunderboltOutlined />, label: 'Quantum Tunneling', path: '/quantum-tunneling' },
    { key: 'fusion-simulation', icon: <FireOutlined />, label: 'Fusion Simulation', path: '/fusion-simulation' },
    { key: 'lenr-simulation', icon: <AtomOutlined />, label: 'LENR Simulation', path: '/lenr-simulation' },
    { key: 'bubble-fusion', icon: <BulbOutlined />, label: 'Bubble Fusion', path: '/bubble-fusion' },
    { key: 'analytics', icon: <LineChartOutlined />, label: 'Analytics', path: '/analytics' },
    { key: 'docs', icon: <BookOutlined />, label: 'Documentation', path: '/docs' },
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
          {menuItems.map((item) => (
            <li key={item.key}>
              <Link 
                to={item.path}
                className={`flex items-center px-4 py-3 text-sm ${
                  selectedKey === item.key 
                    ? 'bg-primary-50 text-primary-700 border-r-4 border-primary-500' 
                    : 'text-neutral-700 hover:bg-neutral-50'
                }`}
                onClick={isMobile ? handleToggle : undefined}
              >
                <span className={`text-lg ${(collapsed && !isMobile) ? 'ml-1' : 'mr-3'}`}>{item.icon}</span>
                {(!collapsed || isMobile) && <span>{item.label}</span>}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}

export default AppSidebar; 