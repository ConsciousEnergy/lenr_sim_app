# Physics Data Service API Documentation

## Overview

The Physics Data Service provides a comprehensive API for managing real-time physics data streams and transformations for the LENR simulation application. It handles WebSocket connections, data processing, caching, and provides React hooks for easy integration with UI components.

## Core Components

### PhysicsDataStreamService

A singleton service for managing WebSocket connections and data subscriptions:

```typescript
import { PhysicsDataStreamService } from '../services/physics';

// Get the singleton instance
const service = PhysicsDataStreamService.getInstance();

// Connect to a simulation
service.connect('simulation-id');

// Subscribe to simulation updates
const subscriptionId = service.subscribeToSimulationUpdates((update) => {
  console.log('Received update:', update);
});

// Unsubscribe when done
service.unsubscribe(subscriptionId);

// Disconnect
service.disconnect();
```

#### Key Methods

| Method | Description |
|--------|-------------|
| `getInstance()` | Get the singleton instance of the service |
| `connect(simulationId: string)` | Connect to a simulation's WebSocket stream |
| `disconnect()` | Disconnect from the current simulation |
| `subscribeToSimulationUpdates(callback, options)` | Subscribe to full simulation updates |
| `subscribeToParameterUpdates(callback, options)` | Subscribe to parameter updates only |
| `subscribeToLatticeState(callback, options)` | Subscribe to lattice state updates only |
| `subscribeToSimulationSummary(callback, options)` | Subscribe to summary updates only |
| `unsubscribe(subscriptionId: string)` | Remove a subscription |
| `sendControlCommand(command)` | Send a control command to the server |
| `sendParameterUpdate(parameters)` | Send parameter updates to the server |
| `getConnectionStatus()` | Get the current connection status |
| `addStatusListener(listener)` | Add a connection status listener |
| `getBufferedUpdates()` | Get all buffered simulation updates |

### React Hooks

The Physics Data Service provides several React hooks for easy integration:

```typescript
import { 
  usePhysicsDataStream, 
  useSimulationUpdates,
  useLatticeState,
  useSimulationSummary 
} from '../services/physics';

function SimulationComponent({ simulationId }) {
  // Connect to data stream
  const { 
    status, 
    isConnected, 
    sendControlCommand 
  } = usePhysicsDataStream(simulationId);

  // Get simulation updates
  const { 
    updates, 
    latestUpdate
  } = useSimulationUpdates(simulationId);

  // Get the lattice state
  const { lattice } = useLatticeState(simulationId);

  // Get the simulation summary
  const { summary } = useSimulationSummary(simulationId);

  return (
    <div>
      <div>Connection Status: {status}</div>
      <button onClick={() => sendControlCommand('start')}>Start</button>
      <button onClick={() => sendControlCommand('pause')}>Pause</button>
      {/* Visualization components using lattice and summary */}
    </div>
  );
}
```

#### Available Hooks

| Hook | Description |
|------|-------------|
| `usePhysicsDataStream(simulationId)` | Manages connection to the physics data stream |
| `useSimulationUpdates(simulationId, options)` | Subscribes to simulation updates |
| `useParameterUpdates(simulationId, options)` | Subscribes to parameter updates only |
| `useLatticeState(simulationId, options)` | Subscribes to lattice state updates |
| `useSimulationSummary(simulationId, options)` | Subscribes to simulation summary updates |
| `usePhysicsData(simulationId, options)` | Provides access to all data types |

### Data Transformation Utilities

Functions for transforming physics data to visualization-friendly formats:

```typescript
import { 
  extractTimeSeriesData,
  transformLatticeForVisualization,
  calculateDataRanges,
  normalizeVisualizationData 
} from '../services/physics/dataTransformations';

// Extract time series data from simulation updates
const timeSeriesData = extractTimeSeriesData(
  simulationUpdates, 
  'average_temperature'
);

// Transform lattice data for 3D visualization
const visualizationPoints = transformLatticeForVisualization(latticeState);

// Calculate data ranges for normalization
const ranges = calculateDataRanges(visualizationPoints);

// Normalize data for visualization
const normalizedPoints = normalizeVisualizationData(visualizationPoints, ranges);
```

#### Key Transformation Functions

| Function | Description |
|----------|-------------|
| `extractTimeSeriesData(updates, property, aggregation)` | Extract time series data from updates |
| `extractMultiSeriesData(updates, properties)` | Extract multi-series data for charts |
| `transformLatticeForVisualization(lattice)` | Transform lattice data for 3D visualization |
| `calculateDataRanges(points, properties)` | Calculate data ranges for normalization |
| `normalizeVisualizationData(points, ranges)` | Normalize data based on calculated ranges |
| `downsampleTimeSeriesData(data, targetPoints)` | Reduce the number of data points |
| `applyMovingAverage(data, windowSize)` | Apply smoothing to time series data |
| `calculateLatticeCenter(lattice)` | Calculate the center of mass of a lattice |
| `calculateElementDistribution(lattice)` | Get distribution of elements in the lattice |
| `calculateLatticeBounds(lattice)` | Calculate the bounding box of a lattice |

### Caching Mechanisms

The Physics Data Service includes built-in caching to improve performance:

```typescript
// The cache is managed automatically by PhysicsDataStreamService,
// but can be accessed directly if needed:
import { PhysicsDataCache } from '../services/physics/dataCache';

const cache = new PhysicsDataCache();

// Add a simulation update to the cache
cache.addSimulationUpdate(update);

// Get cached data
const lattice = cache.getLatticeState();
const summary = cache.getSimulationSummary();
const updates = cache.getSimulationUpdates();

// Use cached data with a generator function
const timeSeriesData = cache.getTimeSeriesData('temperature', () => {
  return extractTimeSeriesData(updates, 'average_temperature');
});

// Clear the cache
cache.clearCache();

// Get cache statistics
const stats = cache.getCacheStats();
```

#### Caching Features

- **Time-series Data**: Automatically caches time-series data with expiration
- **LRU Cache**: Uses Least Recently Used caching strategy for visualization data
- **Cache Invalidation**: Automatically invalidates caches when new data arrives
- **Memory Management**: Limits the number of updates stored to prevent memory issues

## WebSocket Message Types

The service handles multiple WebSocket message types:

### Simulation Update

```typescript
{
  type: 'simulation_update',
  simulation_id: string,
  step: number,
  time: number,
  lattice: {
    dimensions: [number, number, number],
    points: Array<{
      position: [number, number, number],
      element: string,
      energy: number,
      temperature: number,
      reaction_rate: number
    }>,
    connections: Array<[number, number]>
  },
  summary: {
    average_temperature: number,
    total_energy: number,
    reaction_counts: Record<string, number>
  }
}
```

### Parameter Update

```typescript
{
  type: 'parameter_update',
  simulation_id: string,
  parameters: Record<string, any>
}
```

### Control Command

```typescript
{
  type: 'control_command',
  simulation_id: string,
  command: 'start' | 'pause' | 'resume' | 'reset' | 'stop'
}
```

## Subscription Options

When subscribing to data updates, you can provide options to customize behavior:

```typescript
const subscriptionOptions = {
  // Buffer size for storing updates
  bufferSize: 100,
  
  // Throttle updates to reduce rendering load (in milliseconds)
  throttleMs: 100,
  
  // Filter function to only process certain updates
  filter: (data) => data.summary.average_temperature > 300
};

service.subscribeToSimulationUpdates(callback, subscriptionOptions);
```

## Error Handling and Reconnection

The service includes built-in error handling and reconnection logic:

- **Automatic Reconnection**: Attempts to reconnect to the WebSocket server on disconnection
- **Exponential Backoff**: Increases wait time between reconnection attempts
- **Error Events**: Emits error events that can be subscribed to via `addEventListener`
- **Connection Status**: Provides current connection status via `getConnectionStatus()`

## Performance Optimization

The Physics Data Service is optimized for high-performance visualization:

- **Data Throttling**: Limits the frequency of updates to prevent UI lag
- **Efficient Caching**: Stores processed data to avoid redundant calculations
- **Selective Updates**: Allows subscribing to specific data types to reduce processing
- **Data Transformation**: Provides utilities for downsampling and smoothing data 