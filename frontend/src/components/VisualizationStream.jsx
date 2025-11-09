import { useState, useEffect, useRef } from 'react';
import { Card, List, Tag, Typography, Empty, Spin, Alert, Divider, Space, Button } from 'antd';
import { ReloadOutlined, ClockCircleOutlined, LineChartOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { createVisualizationWebSocket } from '../utils/visualizationWebSocket';

const { Title, Text } = Typography;

/**
 * Component that subscribes to and displays real-time visualization events from a simulation
 * 
 * @param {Object} props Component props
 * @param {string} props.simulationId The ID of the simulation to monitor
 * @param {string} props.apiBaseUrl Base URL for the API (used for WebSocket connection)
 * @param {boolean} props.autoConnect Whether to connect automatically on mount
 * @param {number} props.maxEvents Maximum number of events to display
 */
const VisualizationStream = ({ 
  simulationId, 
  apiBaseUrl = '', 
  autoConnect = true,
  maxEvents = 50
}) => {
  // State
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [events, setEvents] = useState([]);
  const [error, setError] = useState(null);
  
  // References
  const webSocketRef = useRef(null);
  const eventsRef = useRef([]);
  
  // Initialize WebSocket connection
  const initializeWebSocket = () => {
    if (!simulationId) return;
    
    setConnecting(true);
    setError(null);
    
    try {
      // Get or create the WebSocket connection
      const wsInstance = createVisualizationWebSocket(apiBaseUrl);
      
      // Store reference
      webSocketRef.current = wsInstance;
      
      // Setup event handlers
      wsInstance.onConnected(() => {
        setConnected(true);
        setConnecting(false);
        
        // Subscribe to simulation events
        wsInstance.subscribeToSimulation(simulationId);
      });
      
      wsInstance.onDisconnected(() => {
        setConnected(false);
      });
      
      wsInstance.onError((err) => {
        setError(`WebSocket error: ${err.message || 'Unknown error'}`);
        setConnecting(false);
      });
      
      // Register visualization event listener
      wsInstance.registerVisualizationListener(simulationId, handleVisualizationEvent);
      
      // Connect if not already connected
      if (!wsInstance.isConnected()) {
        wsInstance.connect();
      } else {
        // Already connected, just update state
        setConnected(true);
        setConnecting(false);
        // Subscribe to simulation events
        wsInstance.subscribeToSimulation(simulationId);
      }
    } catch (err) {
      setError(`Failed to initialize WebSocket: ${err.message}`);
      setConnecting(false);
    }
  };
  
  // Handle incoming visualization events
  const handleVisualizationEvent = (event) => {
    // Add timestamp if not present
    const eventWithTimestamp = {
      ...event,
      timestamp: event.timestamp || new Date().toISOString()
    };
    
    // Update events, keeping only the most recent ones
    setEvents(prevEvents => {
      const updatedEvents = [eventWithTimestamp, ...prevEvents].slice(0, maxEvents);
      eventsRef.current = updatedEvents;
      return updatedEvents;
    });
  };
  
  // Connect/disconnect on mount/unmount
  useEffect(() => {
    if (autoConnect && simulationId) {
      initializeWebSocket();
    }
    
    // Cleanup on unmount
    return () => {
      if (webSocketRef.current) {
        const ws = webSocketRef.current;
        // Unsubscribe from simulation
        ws.unsubscribeFromSimulation(simulationId);
        // Unregister event listener
        ws.unregisterVisualizationListener(simulationId, handleVisualizationEvent);
      }
    };
  }, [simulationId, autoConnect]);
  
  // Handle manual connection/reconnection
  const handleConnect = () => {
    if (connected) {
      // Disconnect first if already connected
      if (webSocketRef.current) {
        webSocketRef.current.disconnect();
      }
    }
    
    // Initialize connection
    initializeWebSocket();
  };
  
  // Clear events
  const handleClearEvents = () => {
    setEvents([]);
    eventsRef.current = [];
  };
  
  // Format timestamp for display
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Unknown';
    
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString();
    } catch (error) {
      return timestamp;
    }
  };
  
  // Get color for event type
  const getEventColor = (eventType) => {
    const eventTypeMap = {
      'temperature': 'red',
      'pressure': 'blue',
      'density': 'green',
      'velocity': 'purple',
      'energy': 'orange',
      'error': 'error',
      'warning': 'warning',
      'info': 'processing'
    };
    
    return eventTypeMap[eventType?.toLowerCase()] || 'default';
  };
  
  // Render event content based on type
  const renderEventContent = (event) => {
    if (!event) return null;
    
    // Handle different event types
    switch (event.type?.toLowerCase()) {
      case 'snapshot':
        return (
          <div>
            <Text strong>Snapshot taken at timestep {event.timestep}</Text>
            <div>
              {event.metrics && Object.entries(event.metrics).map(([key, value]) => (
                <Tag key={key}>{key}: {value}</Tag>
              ))}
            </div>
          </div>
        );
        
      case 'statistic':
        return (
          <div>
            <Text strong>{event.name || 'Statistic update'}</Text>
            <div>
              <Tag color="blue">Value: {event.value}</Tag>
              {event.unit && <Tag color="cyan">Unit: {event.unit}</Tag>}
            </div>
          </div>
        );
        
      case 'milestone':
        return (
          <div>
            <Text strong>{event.name || 'Milestone reached'}</Text>
            <div>
              <Text>{event.description}</Text>
            </div>
          </div>
        );
        
      case 'error':
        return (
          <Alert 
            type="error" 
            message={event.message || 'Error occurred'} 
            description={event.details} 
            showIcon 
          />
        );
        
      case 'warning':
        return (
          <Alert 
            type="warning" 
            message={event.message || 'Warning'} 
            description={event.details} 
            showIcon 
          />
        );
        
      default:
        // Generic event display
        return (
          <div>
            <Text>{event.message || JSON.stringify(event.data || {})}</Text>
          </div>
        );
    }
  };
  
  return (
    <Card
      title={
        <Space>
          <LineChartOutlined />
          <span>Visualization Stream</span>
          {connected && <Tag color="success">Connected</Tag>}
          {!connected && !connecting && <Tag color="error">Disconnected</Tag>}
          {connecting && <Tag color="processing">Connecting...</Tag>}
        </Space>
      }
      extra={
        <Space>
          <Button 
            type={connected ? "default" : "primary"}
            icon={<ReloadOutlined />}
            onClick={handleConnect}
            loading={connecting}
          >
            {connected ? 'Reconnect' : 'Connect'}
          </Button>
          <Button 
            onClick={handleClearEvents} 
            disabled={events.length === 0}
          >
            Clear
          </Button>
        </Space>
      }
    >
      {/* Error message if any */}
      {error && (
        <Alert 
          type="error" 
          message="Connection Error" 
          description={error}
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}
      
      {/* Loading state */}
      {connecting && (
        <div style={{ textAlign: 'center', padding: '20px 0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Spin />
          <div style={{ marginTop: 16 }}>Connecting to visualization stream...</div>
        </div>
      )}
      
      {/* Events list */}
      {!connecting && (
        <>
          <div style={{ marginBottom: 16 }}>
            <Text type="secondary">
              <ThunderboltOutlined /> Showing last {Math.min(events.length, maxEvents)} events
              {simulationId && <> for simulation <Text code>{simulationId.slice(-8)}</Text></>}
            </Text>
          </div>
          
          {events.length === 0 ? (
            <Empty 
              description={
                <span>
                  {connected 
                    ? "No visualization events received yet" 
                    : "Connect to start receiving visualization events"}
                </span>
              } 
            />
          ) : (
            <List
              dataSource={events}
              renderItem={(event) => (
                <List.Item>
                  <Card 
                    type="inner" 
                    style={{ width: '100%' }}
                    title={
                      <Space>
                        <Tag color={getEventColor(event.type)}>
                          {event.type || 'Event'}
                        </Tag>
                        <span>
                          <ClockCircleOutlined /> {formatTimestamp(event.timestamp)}
                        </span>
                      </Space>
                    }
                  >
                    {renderEventContent(event)}
                  </Card>
                </List.Item>
              )}
            />
          )}
        </>
      )}
    </Card>
  );
};

export default VisualizationStream; 