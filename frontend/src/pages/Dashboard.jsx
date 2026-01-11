import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Card, 
  Table, 
  Tag, 
  Button, 
  Space, 
  Input, 
  Row, 
  Col, 
  Statistic, 
  Typography, 
  Tooltip 
} from 'antd';
import { 
  SearchOutlined, 
  PlusOutlined, 
  ExperimentOutlined, 
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  PauseCircleOutlined,
  ThunderboltOutlined,
  FireOutlined,
  AtomOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;

// Mock simulation data
const mockSimulations = [
  {
    id: '42',
    name: 'LENR Lattice Simulation #42',
    description: 'Palladium lattice with deuterium loading under specific temperature conditions',
    status: 'running',
    progress: 68,
    createdAt: '2023-10-15T08:30:00Z',
    estimatedCompletion: '2023-10-15T09:30:00Z',
  },
  {
    id: '41',
    name: 'Nickel-Hydrogen Reaction Model',
    description: 'Simulation of energy production in Ni-H LENR system',
    status: 'completed',
    progress: 100,
    createdAt: '2023-10-14T14:15:00Z',
    completedAt: '2023-10-14T16:45:00Z',
  },
  {
    id: '40',
    name: 'Electron Screening Effects',
    description: 'Analysis of electron screening in deuterated palladium',
    status: 'paused',
    progress: 35,
    createdAt: '2023-10-13T10:00:00Z',
  },
  {
    id: '39',
    name: 'Phonon Modes in Loaded Lattice',
    description: 'Study of phonon modes in deuterium-loaded palladium lattice',
    status: 'failed',
    progress: 78,
    createdAt: '2023-10-12T09:30:00Z',
    error: 'Numerical instability in the solver'
  },
  {
    id: '38',
    name: 'Quantum Nuclear Active Environment',
    description: 'Quantum mechanical model of nuclear active environment in LENR',
    status: 'queued',
    progress: 0,
    createdAt: '2023-10-11T16:45:00Z',
  }
];

const getStatusTag = (status) => {
  const statusConfig = {
    running: { color: 'processing', text: 'Running', icon: <ClockCircleOutlined /> },
    completed: { color: 'success', text: 'Completed', icon: <CheckCircleOutlined /> },
    failed: { color: 'error', text: 'Failed', icon: <ExclamationCircleOutlined /> },
    queued: { color: 'warning', text: 'Queued', icon: <ClockCircleOutlined /> },
    paused: { color: 'default', text: 'Paused', icon: <PauseCircleOutlined /> }
  };
  
  const config = statusConfig[status] || { color: 'default', text: status };
  return (
    <Tag color={config.color} icon={config.icon}>
      {config.text}
    </Tag>
  );
};

const Dashboard = () => {
  const [simulations, setSimulations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    running: 0,
    completed: 0,
    failed: 0
  });
  
  // Fetch simulations data
  useEffect(() => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setSimulations(mockSimulations);
      
      // Calculate stats
      const newStats = {
        total: mockSimulations.length,
        running: mockSimulations.filter(sim => sim.status === 'running').length,
        completed: mockSimulations.filter(sim => sim.status === 'completed').length,
        failed: mockSimulations.filter(sim => sim.status === 'failed').length
      };
      setStats(newStats);
      
      setLoading(false);
    }, 800);
  }, []);
  
  // Filter simulations based on search text
  const filteredSimulations = simulations.filter(sim => 
    sim.name.toLowerCase().includes(searchText.toLowerCase()) ||
    sim.description.toLowerCase().includes(searchText.toLowerCase()) ||
    sim.id.includes(searchText)
  );
  
  // Responsive column configurations
  const getColumns = () => {
    // Check if we're on mobile
    const isMobile = window.innerWidth < 768;
    
    // Base columns that always show
    const baseColumns = [
      {
        title: 'ID',
        dataIndex: 'id',
        key: 'id',
        render: (id) => <Link to={`/simulation/${id}`}>{id}</Link>,
      },
      {
        title: 'Name',
        dataIndex: 'name',
        key: 'name',
        render: (text, record) => (
          <Space>
            <ExperimentOutlined />
            <Link to={`/simulation/${record.id}`} className="hover:text-primary-600">{text}</Link>
          </Space>
        ),
      },
      {
        title: 'Status',
        dataIndex: 'status',
        key: 'status',
        render: status => getStatusTag(status),
        filters: [
          { text: 'Running', value: 'running' },
          { text: 'Completed', value: 'completed' },
          { text: 'Failed', value: 'failed' },
          { text: 'Queued', value: 'queued' },
          { text: 'Paused', value: 'paused' },
        ],
        onFilter: (value, record) => record.status === value,
      }
    ];
    
    // Additional columns for larger screens
    const desktopColumns = [
      {
        title: 'Progress',
        dataIndex: 'progress',
        key: 'progress',
        render: progress => `${progress}%`,
        sorter: (a, b) => a.progress - b.progress,
      },
      {
        title: 'Created',
        dataIndex: 'createdAt',
        key: 'createdAt',
        render: date => new Date(date).toLocaleString(),
        sorter: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
      }
    ];
    
    // Actions column (always show but with responsive design)
    const actionsColumn = {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size="small" wrap>
          <Tooltip title="View Details">
            <Button type="primary" size="small">
              <Link to={`/simulation/${record.id}`}>View</Link>
            </Button>
          </Tooltip>
          {!isMobile && record.status === 'running' && (
            <Tooltip title="Pause Simulation">
              <Button size="small">Pause</Button>
            </Tooltip>
          )}
          {!isMobile && (record.status === 'paused' || record.status === 'queued') && (
            <Tooltip title="Start Simulation">
              <Button size="small" type="primary">Start</Button>
            </Tooltip>
          )}
          {!isMobile && record.status === 'failed' && (
            <Tooltip title="Retry Simulation">
              <Button size="small" type="primary" danger>Retry</Button>
            </Tooltip>
          )}
        </Space>
      ),
    };
    
    return isMobile ? 
      [...baseColumns, actionsColumn] : 
      [...baseColumns, ...desktopColumns, actionsColumn];
  };
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <Title level={2} className="m-0 text-2xl md:text-3xl">
          Simulation Dashboard
        </Title>
        <div className="flex flex-col sm:flex-row gap-3">
          <Input 
            placeholder="Search simulations" 
            prefix={<SearchOutlined />} 
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            className="flex-1"
          />
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            className="whitespace-nowrap"
          >
            <Link to="/simulation/new">New Simulation</Link>
          </Button>
        </div>
      </div>
      
      {/* Simulation Type Cards */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8}>
          <Card 
            hoverable 
            style={{ height: '100%' }}
            actions={[
              <Link to="/quantum-tunneling" key="run">Run Simulation</Link>
            ]}
          >
            <Card.Meta
              avatar={<ThunderboltOutlined style={{ fontSize: '36px', color: '#722ed1' }} />}
              title="Quantum Tunneling"
              description="Simulate quantum tunneling effects in LENR systems with adjustable barrier parameters."
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={8}>
          <Card 
            hoverable 
            style={{ height: '100%' }}
            actions={[
              <Link to="/fusion-simulation" key="run">Run Simulation</Link>
            ]}
          >
            <Card.Meta
              avatar={<FireOutlined style={{ fontSize: '36px', color: '#f5222d' }} />}
              title="Fusion Simulation"
              description="Model fusion reactions in various material lattices with customizable reaction parameters."
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={8}>
          <Card 
            hoverable 
            style={{ height: '100%' }}
            actions={[
              <Link to="/lenr-simulation" key="run">Run Simulation</Link>
            ]}
          >
            <Card.Meta
              avatar={<AtomOutlined style={{ fontSize: '36px', color: '#1890ff' }} />}
              title="LENR Simulation"
              description="Comprehensive Low Energy Nuclear Reaction simulation with advanced material and catalyst options."
            />
          </Card>
        </Col>
      </Row>
      
      <Row gutter={[16, 16]} className="stats-row">
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Total Simulations"
              value={stats.total}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Running"
              value={stats.running}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Completed"
              value={stats.completed}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Failed"
              value={stats.failed}
              valueStyle={{ color: '#f5222d' }}
            />
          </Card>
        </Col>
      </Row>
      
      <Card className="overflow-x-auto">
        <Table
          columns={getColumns()}
          dataSource={filteredSimulations}
          rowKey="id"
          loading={loading}
          pagination={{
            responsive: true,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} items`,
            defaultPageSize: window.innerWidth < 768 ? 5 : 10,
          }}
          scroll={{ x: 'max-content' }}
          size={window.innerWidth < 768 ? 'small' : 'middle'}
        />
      </Card>
    </div>
  );
};

export default Dashboard; 