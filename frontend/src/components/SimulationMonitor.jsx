import { useState, useEffect, useCallback } from 'react';
import { 
  Card, 
  Table, 
  Tag, 
  Button, 
  Space, 
  Tooltip, 
  Input, 
  Select, 
  DatePicker, 
  Typography, 
  Statistic, 
  Row, 
  Col,
  Divider,
  Progress,
  Badge,
  Empty,
  Spin,
  Alert
} from 'antd';
import { 
  ReloadOutlined, 
  SearchOutlined, 
  PlayCircleOutlined, 
  PauseCircleOutlined, 
  StopOutlined,
  BarChartOutlined,
  ExportOutlined, 
  EyeOutlined,
  SyncOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  LineChartOutlined,
  ExperimentOutlined,
  RocketOutlined
} from '@ant-design/icons';
import { useTheme } from '../contexts/ThemeContext'; // Assuming ThemeContext is used

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

const API_BASE_URL = 'http://localhost:8000'; // Corrected hardcoded port

/**
 * Component for monitoring active simulations and their status
 */
const SimulationMonitor = ({ 
  apiBaseUrl,
  onViewSimulation,
  refreshInterval = 10,
  maxSimulations = 100,
  onSimulationSelect,
  selectedSimulationId,
  style = {}
}) => {
  // State
  const [simulations, setSimulations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    status: [],
    search: '',
    dateRange: null
  });
  const [stats, setStats] = useState({
    total: 0,
    running: 0,
    completed: 0,
    failed: 0,
    queued: 0
  });
  const [sortedInfo, setSortedInfo] = useState({
    columnKey: 'created_at',
    order: 'descend'
  });
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(null);
  
  // Fetch simulations data
  const fetchSimulations = useCallback(async (showRefreshing = true) => {
    if (showRefreshing) {
      setRefreshing(true);
    }
    
    try {
      setError(null);
      setLoading(true);
      
      const targetUrl = `${apiBaseUrl || API_BASE_URL}/api/simulations`;
      console.log(`[SimulationMonitor] Attempting to fetch from: ${targetUrl}`);
      
      const response = await fetch(targetUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch simulations: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Process simulations data
      const simulationList = Array.isArray(data.simulations) 
        ? data.simulations 
        : Array.isArray(data) 
          ? data 
          : [];
      
      setSimulations(simulationList);
      setLastRefreshed(new Date());
      
      // Update statistics
      const runningCount = simulationList.filter(sim => sim.status === 'running').length;
      const completedCount = simulationList.filter(sim => sim.status === 'completed').length;
      const failedCount = simulationList.filter(sim => sim.status === 'failed').length;
      const queuedCount = simulationList.filter(sim => sim.status === 'queued').length;
      
      setStats({
        total: simulationList.length,
        running: runningCount,
        completed: completedCount,
        failed: failedCount,
        queued: queuedCount
      });
      
      // If we have simulations but no selection, select the most recent running one
      if (simulationList.length > 0 && !selectedSimulationId && onSimulationSelect) {
        const runningSimulation = simulationList.find(sim => 
          sim.status?.toLowerCase() === 'running'
        );
        
        if (runningSimulation) {
          onSimulationSelect(runningSimulation.id);
        } else {
          // If no running simulation, select the most recent one
          const mostRecent = [...simulationList].sort((a, b) => {
            return new Date(b.created_at || b.startTime || 0) - 
                   new Date(a.created_at || a.startTime || 0);
          })[0];
          
          if (mostRecent) {
            onSimulationSelect(mostRecent.id);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching simulations:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [apiBaseUrl, onSimulationSelect, selectedSimulationId]);
  
  // Initial fetch and set up auto-refresh
  useEffect(() => {
    // Initial fetch
    fetchSimulations(false);
    
    // Set up auto-refresh if interval > 0
    let intervalId;
    if (refreshInterval > 0) {
      intervalId = setInterval(() => {
        fetchSimulations(true);
      }, refreshInterval * 1000);
    }
    
    // Clean up
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [fetchSimulations, refreshInterval]);
  
  // Handle simulation control actions
  const handleControlAction = async (action, simulationId) => {
    try {
      setLoading(true);
      
      const response = await fetch(`${apiBaseUrl || API_BASE_URL}/api/simulations/${simulationId}/${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to ${action} simulation: ${response.statusText}`);
      }
      
      // Refresh simulations
      fetchSimulations();
    } catch (err) {
      setError(err.message);
      console.error(`Error performing ${action} action:`, err);
    } finally {
      setLoading(false);
    }
  };
  
  // View simulation results
  const handleViewSimulation = (simulationId) => {
    if (onViewSimulation) {
      onViewSimulation(simulationId);
    } else {
      window.open(`/visualization/${simulationId}`, '_blank');
    }
  };
  
  // Export simulation results
  const handleExportResults = async (simulationId) => {
    try {
      const response = await fetch(`${apiBaseUrl || API_BASE_URL}/api/simulations/${simulationId}/export`);
      
      if (!response.ok) {
        throw new Error(`Failed to export simulation results: ${response.statusText}`);
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `simulation-${simulationId}-results.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      setError(err.message);
      console.error('Error exporting simulation results:', err);
    }
  };
  
  // Handle filter changes
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };
  
  // Handle table change (sorting)
  const handleTableChange = (pagination, filters, sorter) => {
    setSortedInfo(sorter);
  };
  
  // Filter simulations based on current filters
  const getFilteredSimulations = () => {
    return simulations
      .filter(sim => {
        // Filter by status
        if (filters.status.length > 0 && !filters.status.includes(sim.status)) {
          return false;
        }
        
        // Filter by search term
        if (filters.search && !sim.name.toLowerCase().includes(filters.search.toLowerCase()) && 
            !sim.id.includes(filters.search)) {
          return false;
        }
        
        // Filter by date range
        if (filters.dateRange && filters.dateRange.length === 2) {
          const createdAt = new Date(sim.created_at);
          const startDate = filters.dateRange[0].startOf('day').toDate();
          const endDate = filters.dateRange[1].endOf('day').toDate();
          
          if (createdAt < startDate || createdAt > endDate) {
            return false;
          }
        }
        
        return true;
      })
      .slice(0, maxSimulations); // Limit the number of displayed simulations
  };
  
  // Format simulation duration
  const formatDuration = (startTime, endTime) => {
    if (!startTime) return 'Not started';
    
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const durationMs = end - start;
    
    const seconds = Math.floor(durationMs / 1000) % 60;
    const minutes = Math.floor(durationMs / (1000 * 60)) % 60;
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };
  
  // Get status color
  const getStatusColor = (status) => {
    const statusMap = {
      'running': 'processing',
      'completed': 'success',
      'failed': 'error',
      'queued': 'warning',
      'paused': 'default'
    };
    
    return statusMap[status] || 'default';
  };
  
  // Get status icon
  const getStatusIcon = (status) => {
    const statusLower = status?.toLowerCase();
    
    if (statusLower === 'running') {
      return <SyncOutlined spin />;
    } else if (statusLower === 'completed' || statusLower === 'succeeded') {
      return <CheckCircleOutlined />;
    } else if (statusLower === 'failed' || statusLower === 'error') {
      return <CloseCircleOutlined />;
    } else if (statusLower === 'queued' || statusLower === 'pending') {
      return <ClockCircleOutlined />;
    }
    
    return null;
  };
  
  // Table columns
  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      ellipsis: true,
      width: 120,
      render: (id) => <Text copyable>{id}</Text>
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
      sortOrder: sortedInfo.columnKey === 'name' ? sortedInfo.order : null,
      render: (name, record) => (
        <Space>
          <Text>{name || 'Unnamed Simulation'}</Text>
          {record.status === 'running' && (
            <Badge status="processing" />
          )}
        </Space>
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 150,
      filters: [
        { text: 'Running', value: 'running' },
        { text: 'Completed', value: 'completed' },
        { text: 'Failed', value: 'failed' },
        { text: 'Queued', value: 'queued' },
        { text: 'Paused', value: 'paused' }
      ],
      sorter: (a, b) => a.status.localeCompare(b.status),
      sortOrder: sortedInfo.columnKey === 'status' ? sortedInfo.order : null,
      render: (status, record) => {
        // Add progress for running simulations
        if (status === 'running' && record.progress !== undefined) {
          return (
            <Space direction="vertical" style={{ width: '100%' }}>
              <Badge status={getStatusColor(status)} icon={getStatusIcon(status)} text={status.charAt(0).toUpperCase() + status.slice(1)} />
              <Progress percent={Math.round(record.progress * 100)} size="small" />
            </Space>
          );
        }
        
        return <Badge status={getStatusColor(status)} icon={getStatusIcon(status)} text={status.charAt(0).toUpperCase() + status.slice(1)} />;
      }
    },
    {
      title: 'Started',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 170,
      sorter: (a, b) => new Date(a.created_at) - new Date(b.created_at),
      sortOrder: sortedInfo.columnKey === 'created_at' ? sortedInfo.order : null,
      render: (date) => new Date(date).toLocaleString()
    },
    {
      title: 'Duration',
      key: 'duration',
      width: 120,
      render: (_, record) => formatDuration(record.started_at, record.completed_at)
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 220,
      render: (_, record) => (
        <Space size="small">
          {record.status === 'running' && (
            <Tooltip title="Pause">
              <Button 
                icon={<PauseCircleOutlined />} 
                size="small"
                onClick={() => handleControlAction('pause', record.id)}
              />
            </Tooltip>
          )}
          
          {record.status === 'paused' && (
            <Tooltip title="Resume">
              <Button 
                icon={<PlayCircleOutlined />} 
                type="primary"
                size="small"
                onClick={() => handleControlAction('resume', record.id)}
              />
            </Tooltip>
          )}
          
          {['running', 'paused', 'queued'].includes(record.status) && (
            <Tooltip title="Stop">
              <Button 
                icon={<StopOutlined />} 
                danger
                size="small"
                onClick={() => handleControlAction('stop', record.id)}
              />
            </Tooltip>
          )}
          
          <Tooltip title="View Results">
            <Button 
              icon={<EyeOutlined />}
              size="small"
              onClick={() => handleViewSimulation(record.id)}
              disabled={!['running', 'completed'].includes(record.status)}
            />
          </Tooltip>
          
          <Tooltip title="Charts">
            <Button 
              icon={<BarChartOutlined />}
              size="small"
              onClick={() => handleViewSimulation(record.id)}
              disabled={!['running', 'completed'].includes(record.status)}
            />
          </Tooltip>
          
          {record.status === 'completed' && (
            <Tooltip title="Export Results">
              <Button 
                icon={<ExportOutlined />}
                size="small"
                onClick={() => handleExportResults(record.id)}
              />
            </Tooltip>
          )}
        </Space>
      )
    }
  ];
  
  return (
    <Card
      title={
        <Space>
          <ExperimentOutlined />
          <span>Simulation Monitor</span>
          {refreshInterval > 0 && (
            <Tag color="default">
              Auto-refresh: {refreshInterval}s
            </Tag>
          )}
        </Space>
      }
      extra={
        <Space>
          <Button 
            icon={<SyncOutlined spin={refreshing} />} 
            onClick={fetchSimulations}
            disabled={loading}
          >
            Refresh
          </Button>
          {selectedSimulationId && (
            <Select
              value={selectedSimulationId}
              onChange={(value) => onSimulationSelect(value)}
              style={{ width: 180 }}
              placeholder="Select Simulation"
            >
              {simulations.map(sim => (
                <Option key={sim.id} value={sim.id}>
                  {sim.name || `Sim ${sim.id.slice(-8)}`}
                </Option>
              ))}
            </Select>
          )}
        </Space>
      }
      style={{ height: '100%', ...style }}
    >
      {/* Error message */}
      {error && (
        <Alert
          type="error"
          message="Error loading simulations"
          description={error}
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}
      
      {/* Stats row */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={6}>
          <Statistic 
            title="Total Simulations" 
            value={stats.total} 
            prefix={<RocketOutlined />} 
          />
        </Col>
        <Col xs={12} sm={6}>
          <Statistic 
            title="Running" 
            value={stats.running} 
            valueStyle={{ color: '#1890ff' }}
            prefix={<SyncOutlined spin={stats.running > 0} />} 
          />
        </Col>
        <Col xs={12} sm={6}>
          <Statistic 
            title="Completed" 
            value={stats.completed} 
            valueStyle={{ color: '#52c41a' }}
            prefix={<CheckCircleOutlined />} 
          />
        </Col>
        <Col xs={12} sm={6}>
          <Statistic 
            title="Failed" 
            value={stats.failed} 
            valueStyle={{ color: '#f5222d' }}
            prefix={<CloseCircleOutlined />} 
          />
        </Col>
      </Row>
      
      {/* Last updated info */}
      {lastRefreshed && (
        <div style={{ marginBottom: 16 }}>
          <Text type="secondary">
            <ClockCircleOutlined /> Last updated: {lastRefreshed.toLocaleTimeString()}
          </Text>
        </div>
      )}
      
      {/* Table of simulations */}
      <div style={{ height: 'calc(100vh - 270px)', minHeight: '400px', overflow: 'auto' }}>
        {loading && simulations.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <Spin />
            <div style={{ marginTop: 16 }}>Loading simulations...</div>
          </div>
      ) : (
        simulations.length === 0 ? (
          <Empty description="No simulations found" />
        ) : (
          <Table
              dataSource={getFilteredSimulations()}
            columns={columns}
            rowKey="id"
            pagination={{ 
                pageSize: 15,
              showTotal: (total) => `Total ${total} simulations`
            }}
            onChange={handleTableChange}
              size="small"
              scroll={{ y: 'calc(100vh - 320px)' }}
              loading={loading}
              rowClassName={(record) => record.id === selectedSimulationId ? 'selected-row' : ''}
              onRow={(record) => ({
                onClick: () => {
                  if (onSimulationSelect) {
                    onSimulationSelect(record.id);
                  }
                }
              })}
          />
        )
      )}
      </div>
    </Card>
  );
};

export default SimulationMonitor; 

// Add CSS at the end of file
const style = document.createElement('style');
style.innerHTML = `
  .selected-row {
    background-color: #e6f7ff;
  }
  
  .ant-card-body {
    padding: 12px !important;
    height: calc(100% - 57px);
    overflow: hidden;
  }
`;
document.head.appendChild(style); 