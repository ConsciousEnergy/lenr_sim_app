import React from 'react';
import { Progress, Card, Tag, Typography, Space, Button, Descriptions, Alert } from 'antd';
import { 
  ClockCircleOutlined, 
  CheckCircleOutlined, 
  ExclamationCircleOutlined, 
  LoadingOutlined, 
  BarChartOutlined,
  DeleteOutlined,
  PlayCircleOutlined,
  ThunderboltOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;

const stageColors = {
  initializing: '#1890ff', // Blue
  setup: '#52c41a',        // Green
  processing: '#fa8c16',   // Orange
  analyzing: '#722ed1',    // Purple
  finalizing: '#13c2c2',   // Cyan
  completed: '#52c41a',    // Green
  failed: '#f5222d',       // Red
  cancelled: '#faad14'     // Gold
};

const stageIcons = {
  initializing: <LoadingOutlined />,
  setup: <LoadingOutlined />,
  processing: <BarChartOutlined />,
  analyzing: <BarChartOutlined />,
  finalizing: <LoadingOutlined />,
  completed: <CheckCircleOutlined />,
  failed: <ExclamationCircleOutlined />,
  cancelled: <ClockCircleOutlined />
};

const formatTimestamp = (timestamp) => {
  if (!timestamp) return 'N/A';
  const date = new Date(timestamp);
  return date.toLocaleString();
};

const calculateElapsedTime = (startTime, endTime) => {
  if (!startTime) return 'N/A';
  
  const start = new Date(startTime);
  const end = endTime ? new Date(endTime) : new Date();
  
  const elapsedMs = end - start;
  const seconds = Math.floor(elapsedMs / 1000);
  
  if (seconds < 60) return `${seconds} seconds`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ${seconds % 60} seconds`;
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours} hours ${minutes} minutes`;
};

const SimulationStatusPanel = ({ simulation, onDelete, onTrigger }) => {
  if (!simulation) {
    return (
      <Card className="simulation-status-panel" title="Simulation Status">
        <Text type="secondary">No active simulation selected</Text>
      </Card>
    );
  }

  const {
    id,
    status,
    current_stage,
    stage_progress = 0,
    overall_progress = 0,
    message,
    error_message,
    created_at,
    started_at,
    completed_at,
    needs_trigger = false   // New flag to indicate a stuck simulation
  } = simulation;

  const isCompleted = ['completed', 'failed', 'cancelled'].includes(status);
  const isStuck = needs_trigger || 
                  (status === 'initializing' && started_at && 
                   new Date() - new Date(started_at) > 30000);  // 30 seconds in initializing state
  const statusColor = stageColors[status] || stageColors.processing;
  const statusIcon = stageIcons[status] || stageIcons.processing;
  
  // Calculate elapsed time
  const elapsedTime = calculateElapsedTime(started_at, completed_at);
  
  // Determine if the simulation is potentially stuck
  const checkIfPotentiallyStuck = () => {
    if (isCompleted) return false;
    if (needs_trigger) return true;
    
    // Check start time
    if (started_at) {
      const startDate = new Date(started_at);
      const currentDate = new Date();
      const elapsedMs = currentDate - startDate;
      
      // If in initializing state for more than 30 seconds
      if (status === 'initializing' && elapsedMs > 30000) {
        return true;
      }
      
      // If in processing state with no progress for more than 2 minutes
      if (status === 'processing' && elapsedMs > 120000 && overall_progress < 10) {
        return true;
      }
    }
    
    return false;
  };
  
  const potentiallyStuck = checkIfPotentiallyStuck();

  return (
    <Card 
      className="simulation-status-panel"
      title={
        <Space>
          <span>Simulation Status</span>
          <Tag color={statusColor} icon={statusIcon}>
            {status.toUpperCase()}
          </Tag>
          {potentiallyStuck && (
            <Tag color="orange" icon={<ExclamationCircleOutlined />}>
              MAY BE STUCK
            </Tag>
          )}
        </Space>
      }
      extra={
        <Space>
          {/* Add trigger button for simulations that might be stuck */}
          {potentiallyStuck && onTrigger && (
            <Button 
              type="primary" 
              icon={<ThunderboltOutlined />} 
              onClick={() => onTrigger(id)}
              ghost
            >
              Trigger Progress
            </Button>
          )}
          <Button 
            type="text" 
            danger 
            icon={<DeleteOutlined />} 
            onClick={() => onDelete && onDelete(id)}
            disabled={!isCompleted}
          >
            {isCompleted ? 'Delete' : 'Running...'}
          </Button>
        </Space>
      }
    >
      {error_message && (
        <Alert
          message="Simulation Error"
          description={error_message}
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}
      
      {/* Show warning for potentially stuck simulations */}
      {potentiallyStuck && (
        <Alert
          message="Simulation may be stuck"
          description={
            <div>
              <p>This simulation appears to be taking longer than expected. You can:</p>
              <ul style={{ paddingLeft: '16px', marginBottom: '8px' }}>
                <li>Wait longer - some complex simulations need more time</li>
                <li>Use the "Trigger Progress" button to attempt to advance the simulation</li>
                <li>Delete and recreate the simulation with different parameters</li>
              </ul>
            </div>
          }
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <Descriptions size="small" column={2} layout="vertical" bordered>
        <Descriptions.Item label="Simulation ID">{id}</Descriptions.Item>
        <Descriptions.Item label="Current Stage">{current_stage}</Descriptions.Item>
        <Descriptions.Item label="Created At">{formatTimestamp(created_at)}</Descriptions.Item>
        <Descriptions.Item label="Duration">
          {elapsedTime}
        </Descriptions.Item>
      </Descriptions>

      <div style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <Text strong>Stage Progress:</Text>
          <Text type="secondary">{Math.round(stage_progress)}%</Text>
        </div>
        <Progress 
          percent={Math.round(stage_progress)} 
          status={status === 'failed' ? 'exception' : potentiallyStuck ? 'exception' : 'active'} 
          strokeColor={potentiallyStuck ? '#faad14' : statusColor}
          showInfo={false}
        />
      </div>

      <div style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <Text strong>Overall Progress:</Text>
          <Text type="secondary">{Math.round(overall_progress)}%</Text>
        </div>
        <Progress 
          percent={Math.round(overall_progress)} 
          status={status === 'failed' ? 'exception' : status === 'completed' ? 'success' : potentiallyStuck ? 'exception' : 'active'} 
          strokeColor={potentiallyStuck ? '#faad14' : statusColor}
        />
      </div>

      {message && (
        <div style={{ marginTop: 16 }}>
          <Text strong>Status Message:</Text>
          <div style={{ 
            background: '#f5f5f5', 
            padding: '8px 12px', 
            borderRadius: 4, 
            marginTop: 8 
          }}>
            {message}
          </div>
        </div>
      )}
    </Card>
  );
};

export default SimulationStatusPanel; 