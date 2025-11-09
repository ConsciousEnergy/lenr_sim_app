import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Button, 
  Table, 
  Card, 
  Badge, 
  Statistic, 
  Alert 
} from '../components/ui';

// Icons - using inline SVGs for now, can be replaced with a dedicated icon library
const ExperimentIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
  </svg>
);

const PlusIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
  </svg>
);

const ClockIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const WarningIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

const PauseIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

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

const getStatusBadge = (status) => {
  const statusConfig = {
    running: { variant: 'info', text: 'Running', icon: <ClockIcon /> },
    completed: { variant: 'success', text: 'Completed', icon: <CheckIcon /> },
    failed: { variant: 'error', text: 'Failed', icon: <WarningIcon /> },
    queued: { variant: 'warning', text: 'Queued', icon: <ClockIcon /> },
    paused: { variant: 'default', text: 'Paused', icon: <PauseIcon /> }
  };
  
  const config = statusConfig[status] || { variant: 'default', text: status };
  
  return (
    <Badge variant={config.variant} className="flex items-center gap-1">
      {config.icon}
      <span>{config.text}</span>
    </Badge>
  );
};

const DashboardConverted = () => {
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
  
  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      render: (id) => <Link to={`/simulation/${id}`} className="text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300">{id}</Link>,
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <div className="flex items-center space-x-2">
          <ExperimentIcon />
          <Link to={`/simulation/${record.id}`} className="text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300">{text}</Link>
        </div>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: status => getStatusBadge(status),
      sorter: true,
    },
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
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <div className="flex gap-2">
          <Button
            variant="primary" 
            size="sm"
            onClick={() => window.location.href = `/simulation/${record.id}`}
          >
            View
          </Button>
          
          {record.status === 'running' && (
            <Button 
              variant="secondary" 
              size="sm"
            >
              Pause
            </Button>
          )}
          
          {(record.status === 'paused' || record.status === 'queued') && (
            <Button 
              variant="primary" 
              size="sm"
            >
              Start
            </Button>
          )}
          
          {record.status === 'failed' && (
            <Button 
              variant="danger" 
              size="sm"
            >
              Retry
            </Button>
          )}
        </div>
      ),
    },
  ];
  
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 md:mb-0">
          Simulation Dashboard
        </h1>
        
        <Link to="/new-simulation">
          <Button 
            variant="primary"
            className="flex items-center gap-2"
          >
            <PlusIcon />
            <span>New Simulation</span>
          </Button>
        </Link>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <Card>
          <Statistic 
            title="Total Simulations" 
            value={stats.total} 
            prefix={<ExperimentIcon />} 
          />
        </Card>
        
        <Card>
          <Statistic 
            title="Running" 
            value={stats.running} 
            valueStyle={{ color: '#3b82f6' }} 
            prefix={<ClockIcon />} 
          />
        </Card>
        
        <Card>
          <Statistic 
            title="Completed" 
            value={stats.completed} 
            valueStyle={{ color: '#10b981' }} 
            prefix={<CheckIcon />} 
          />
        </Card>
        
        <Card>
          <Statistic 
            title="Failed" 
            value={stats.failed} 
            valueStyle={{ color: '#ef4444' }} 
            prefix={<WarningIcon />} 
          />
        </Card>
      </div>
      
      {/* Search Input */}
      <div className="mb-6">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full pl-10 p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-primary-500 dark:focus:border-primary-500"
            placeholder="Search simulations..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>
      </div>
      
      {/* Table */}
      <Card className="mb-6">
        <Table 
          columns={columns} 
          dataSource={filteredSimulations} 
          loading={loading}
          rowKey="id"
          pagination={true}
          pageSize={10}
        />
      </Card>
      
      {/* Recent Activity Alert */}
      <Alert 
        title="System Update" 
        variant="info" 
        className="mt-6"
        onClose={() => {}}
      >
        The simulation engine has been updated to version 2.1.0 with improved stability and performance.
      </Alert>
    </div>
  );
};

export default DashboardConverted; 