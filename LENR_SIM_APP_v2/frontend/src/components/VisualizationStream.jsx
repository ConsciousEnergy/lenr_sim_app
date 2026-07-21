import React, { useState, useEffect, useRef } from 'react';
import {
  Card,
  CardHeader,
  CardContent,
  Chip,
  Typography,
  Alert,
  AlertTitle,
  CircularProgress,
  Stack,
  Button,
  Box
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import BoltIcon from '@mui/icons-material/Bolt';
import { createVisualizationWebSocket } from '../utils/visualizationWebSocket';

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  
  // Get MUI Chip color for an event type
  const getEventColor = (eventType) => {
    const eventTypeMap = {
      'temperature': 'error',
      'pressure': 'info',
      'density': 'success',
      'velocity': 'secondary',
      'energy': 'warning',
      'error': 'error',
      'warning': 'warning',
      'info': 'info'
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
          <Box>
            <Typography component="span" sx={{ fontWeight: 700 }}>Snapshot taken at timestep {event.timestep}</Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
              {event.metrics && Object.entries(event.metrics).map(([key, value]) => (
                <Chip key={key} size="small" label={`${key}: ${value}`} />
              ))}
            </Stack>
          </Box>
        );
        
      case 'statistic':
        return (
          <Box>
            <Typography component="span" sx={{ fontWeight: 700 }}>{event.name || 'Statistic update'}</Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
              <Chip size="small" color="info" label={`Value: ${event.value}`} />
              {event.unit && <Chip size="small" color="info" variant="outlined" label={`Unit: ${event.unit}`} />}
            </Stack>
          </Box>
        );
        
      case 'milestone':
        return (
          <Box>
            <Typography component="span" sx={{ fontWeight: 700 }}>{event.name || 'Milestone reached'}</Typography>
            <Box>
              <Typography component="span">{event.description}</Typography>
            </Box>
          </Box>
        );
        
      case 'error':
        return (
          <Alert severity="error">
            <AlertTitle>{event.message || 'Error occurred'}</AlertTitle>
            {event.details}
          </Alert>
        );
        
      case 'warning':
        return (
          <Alert severity="warning">
            <AlertTitle>{event.message || 'Warning'}</AlertTitle>
            {event.details}
          </Alert>
        );
        
      default:
        // Generic event display
        return (
          <Box>
            <Typography component="span">{event.message || JSON.stringify(event.data || {})}</Typography>
          </Box>
        );
    }
  };
  
  return (
    <Card>
      <CardHeader
        title={
          <Stack direction="row" spacing={1} alignItems="center">
            <ShowChartIcon fontSize="small" />
            <span>Visualization Stream</span>
            {connected && <Chip size="small" color="success" label="Connected" />}
            {!connected && !connecting && <Chip size="small" color="error" label="Disconnected" />}
            {connecting && <Chip size="small" color="info" label="Connecting..." />}
          </Stack>
        }
        action={
          <Stack direction="row" spacing={1}>
            <Button 
              variant={connected ? 'outlined' : 'contained'}
              startIcon={<RefreshIcon />}
              onClick={handleConnect}
              loading={connecting}
            >
              {connected ? 'Reconnect' : 'Connect'}
            </Button>
            <Button 
              variant="outlined"
              onClick={handleClearEvents} 
              disabled={events.length === 0}
            >
              Clear
            </Button>
          </Stack>
        }
      />
      <CardContent>
        {/* Error message if any */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            <AlertTitle>Connection Error</AlertTitle>
            {error}
          </Alert>
        )}
        
        {/* Loading state */}
        {connecting && (
          <Box sx={{ textAlign: 'center', py: 2.5, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <CircularProgress />
            <Box sx={{ mt: 2 }}>Connecting to visualization stream...</Box>
          </Box>
        )}
        
        {/* Events list */}
        {!connecting && (
          <>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary" component="span">
                <BoltIcon fontSize="inherit" sx={{ verticalAlign: 'middle' }} /> Showing last {Math.min(events.length, maxEvents)} events
                {simulationId && <> for simulation <Box component="code">{simulationId.slice(-8)}</Box></>}
              </Typography>
            </Box>
            
            {events.length === 0 ? (
              <Box sx={{ textAlign: 'center', color: 'text.disabled', py: 4 }}>
                <Typography color="text.secondary">
                  {connected 
                    ? 'No visualization events received yet' 
                    : 'Connect to start receiving visualization events'}
                </Typography>
              </Box>
            ) : (
              <Stack spacing={1}>
                {events.map((event, index) => (
                  <Card key={index} variant="outlined" sx={{ width: '100%' }}>
                    <CardHeader
                      title={
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Chip size="small" color={getEventColor(event.type)} label={event.type || 'Event'} />
                          <Typography variant="body2" component="span">
                            <AccessTimeIcon fontSize="inherit" sx={{ verticalAlign: 'middle' }} /> {formatTimestamp(event.timestamp)}
                          </Typography>
                        </Stack>
                      }
                    />
                    <CardContent>
                      {renderEventContent(event)}
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default VisualizationStream;
