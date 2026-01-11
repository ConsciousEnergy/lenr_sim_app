# Real-Time Updates for Simulation Results

## Overview

The SimulationResults component has been enhanced to support real-time updates via WebSockets, with a fallback to polling when WebSocket connections are not available or fail. This enables researchers to view simulation data as it's generated, providing immediate feedback on simulation behavior.

## Implementation Details

### WebSocket Integration

The SimulationResults component uses the `visualizationWebSocket` utility to establish and maintain a WebSocket connection to the server:

```jsx
import { createVisualizationWebSocket, registerVisualizationListener, unregisterVisualizationListener } 
  from '../utils/visualizationWebSocket';
```

This connection enables the component to receive real-time updates about simulation data without having to repeatedly poll the server.

### Connection Management

The component intelligently manages connection state:

1. **WebSocket Priority**: The system first attempts to establish a WebSocket connection
2. **Polling Fallback**: If WebSockets are unavailable, it falls back to polling
3. **Automatic Recovery**: If the WebSocket connection drops, it automatically attempts to reconnect
4. **Status Indicators**: The UI clearly shows when real-time updates are active

### Data Handling

Data processing is unified for both WebSocket events and polling responses:

```jsx
// Process simulation data (used for both WebSocket and API responses)
const processSimulationData = (newData) => {
  if (!newData) return;
  
  try {
    // Check if this is just new points or a complete dataset
    if (Array.isArray(newData.timeSeriesData) && newData.timeSeriesData.length > 0) {
      // Full dataset
      setData(newData);
    } else if (Array.isArray(newData) && newData.length > 0) {
      // Just new data points to append
      setData(prevData => {
        // Keep a maximum of 100 points to avoid performance issues
        const updatedTimeSeries = [...prevData.timeSeriesData, ...newData].slice(-100);
        
        // Update statistics
        const statistics = {
          maxTemperature: Math.max(...updatedTimeSeries.map(d => d.temperature)),
          minTemperature: Math.min(...updatedTimeSeries.map(d => d.temperature)),
          avgTemperature: updatedTimeSeries.reduce((sum, d) => sum + d.temperature, 0) / updatedTimeSeries.length,
          maxEnergy: Math.max(...updatedTimeSeries.map(d => d.energy)),
          totalNeutrons: updatedTimeSeries.reduce((sum, d) => sum + d.neutronCount, 0),
          peakReactionRate: Math.max(...updatedTimeSeries.map(d => d.reactionRate))
        };
        
        return {
          timeSeriesData: updatedTimeSeries,
          tableData: updatedTimeSeries.filter((_, i) => i % 10 === 0), // Update table data too
          statistics
        };
      });
    }
  } catch (err) {
    console.error('Error processing simulation data:', err);
  }
};
```

### User Experience Enhancements

The component provides visual feedback about the data update mechanism:

```jsx
<div style={{ 
  background: '#f5f5f5', 
  padding: '10px 16px', 
  borderRadius: 4,
  marginBottom: 16
}}>
  <Text>
    <strong>Data points:</strong> {data.timeSeriesData.length} &nbsp;&nbsp;|&nbsp;&nbsp;
    <strong>Last update:</strong> {new Date().toLocaleTimeString()} &nbsp;&nbsp;|&nbsp;&nbsp;
    <strong>Updates:</strong> {dataFetchCountRef.current} &nbsp;&nbsp;|&nbsp;&nbsp;
    <strong>Source:</strong> {usingWebSocket ? 
      <Text type="success">WebSocket <ApiOutlined /></Text> : 
      <Text type="warning">Polling</Text>
    }
  </Text>
</div>
```

### WebSocket Utility Improvements

The `visualizationWebSocket.js` utility was enhanced with:

1. Connection status methods: `onConnected`, `onDisconnected`, `onError`, `getConnectionStatus`
2. Fixed potential infinite recursion by renaming properties
3. Improved error handling and reconnection logic

## Performance Considerations

- Limited to 100 data points to avoid performance issues with charts
- Efficient update pattern for charts using `isAnimationActive={false}`
- Properly cleans up resources on unmount

## Usage

The SimulationResults component can be used with the following props:

```jsx
<SimulationResults
  simulationId="sim-123"
  apiBaseUrl="/api" 
  autoUpdate={true}
  updateInterval={5000}
/>
```

- `simulationId`: Required ID of the simulation to monitor
- `apiBaseUrl`: Base URL for the API (default: '')
- `autoUpdate`: Whether to enable auto-updating (default: true)
- `updateInterval`: Polling interval in milliseconds (default: 5000) 