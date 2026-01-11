# Physics Engine Integration API Specification

## Overview

This document defines the API requirements and specifications for integrating the LENR physics simulation engine with the frontend visualization system. The API provides endpoints for simulation initialization, parameter updates, real-time data streaming, and simulation control.

## Core Requirements

1. **Real-time Data Streaming**: Provide WebSocket connections for real-time physics data updates to support visualization components.
2. **Simulation Control**: Allow the frontend to start, pause, resume, and reset simulations.
3. **Parameter Configuration**: Support updating physics parameters during simulation.
4. **Model Selection**: Enable selection and configuration of different physics models (quantum tunneling, phonon modes, electron screening, etc.).
5. **Data Transformation**: Provide normalized and transformed data suitable for frontend visualization.
6. **Simulation State Management**: Support saving and restoring simulation states.
7. **Error Handling**: Provide robust error handling and reporting.
8. **Performance Optimization**: Support efficient data transfer and caching strategies.

## API Endpoints

### Simulation Initialization and Control

#### `POST /api/physics/simulation/initialize`

Initialize a new simulation with the provided configuration.

**Request Body:**
```json
{
  "simulation_id": "string",  // Optional, generated if not provided
  "models": [
    {
      "model_type": "string",  // e.g., "quantum_tunneling", "phonon_modes"
      "parameters": {
        // Model-specific parameters
      }
    }
  ],
  "lattice": {
    "type": "string",  // e.g., "fcc", "bcc", "hcp"
    "dimensions": [10, 10, 10],
    "constants": [3.89e-10, 3.89e-10, 3.89e-10],
    "elements": [
      {
        "symbol": "string",
        "position": [0, 0, 0],
        "occupancy": 1.0
      }
    ]
  },
  "conditions": {
    "temperature": 300.0,
    "pressure": 101325.0,
    "electric_field": [0, 0, 0],
    "magnetic_field": [0, 0, 0]
  },
  "simulation_parameters": {
    "time_step": 1e-15,
    "total_steps": 1000,
    "save_frequency": 10
  }
}
```

**Response:**
```json
{
  "simulation_id": "string",
  "status": "initialized",
  "websocket_url": "string",
  "models": ["string"],
  "initialized_at": "timestamp"
}
```

#### `POST /api/physics/simulation/{simulation_id}/start`

Start the specified simulation.

**Response:**
```json
{
  "simulation_id": "string",
  "status": "running",
  "started_at": "timestamp"
}
```

#### `POST /api/physics/simulation/{simulation_id}/pause`

Pause the specified simulation.

**Response:**
```json
{
  "simulation_id": "string",
  "status": "paused",
  "paused_at": "timestamp"
}
```

#### `POST /api/physics/simulation/{simulation_id}/resume`

Resume the specified simulation.

**Response:**
```json
{
  "simulation_id": "string",
  "status": "running",
  "resumed_at": "timestamp"
}
```

#### `POST /api/physics/simulation/{simulation_id}/reset`

Reset the specified simulation to its initial state.

**Response:**
```json
{
  "simulation_id": "string",
  "status": "initialized",
  "reset_at": "timestamp"
}
```

### Parameter Updates

#### `PATCH /api/physics/simulation/{simulation_id}/parameters`

Update simulation parameters while the simulation is running.

**Request Body:**
```json
{
  "conditions": {
    "temperature": 350.0
  },
  "models": [
    {
      "model_type": "quantum_tunneling",
      "parameters": {
        "screening_potential": 200.0
      }
    }
  ]
}
```

**Response:**
```json
{
  "simulation_id": "string",
  "status": "parameters_updated",
  "updated_at": "timestamp"
}
```

### Simulation State Management

#### `POST /api/physics/simulation/{simulation_id}/snapshot`

Take a snapshot of the current simulation state.

**Request Body:**
```json
{
  "name": "string",  // Optional snapshot name
  "description": "string"  // Optional description
}
```

**Response:**
```json
{
  "simulation_id": "string",
  "snapshot_id": "string",
  "name": "string",
  "created_at": "timestamp"
}
```

#### `GET /api/physics/simulation/{simulation_id}/snapshots`

List all snapshots for the specified simulation.

**Response:**
```json
{
  "simulation_id": "string",
  "snapshots": [
    {
      "snapshot_id": "string",
      "name": "string",
      "description": "string",
      "created_at": "timestamp"
    }
  ]
}
```

#### `POST /api/physics/simulation/{simulation_id}/restore/{snapshot_id}`

Restore the simulation to a previous snapshot.

**Response:**
```json
{
  "simulation_id": "string",
  "snapshot_id": "string",
  "status": "restored",
  "restored_at": "timestamp"
}
```

### Data Retrieval

#### `GET /api/physics/simulation/{simulation_id}/status`

Get the current status of the simulation.

**Response:**
```json
{
  "simulation_id": "string",
  "status": "string",  // "initialized", "running", "paused", "completed", "error"
  "current_step": 500,
  "total_steps": 1000,
  "elapsed_time": 500.0,  // In simulation time
  "wall_time": 5.0,  // In real seconds
  "error": "string"  // Only present if status is "error"
}
```

#### `GET /api/physics/simulation/{simulation_id}/results`

Get the current results of the simulation.

**Query Parameters:**
- `step`: Get results at a specific step
- `format`: Response format, e.g., "json", "csv"

**Response:**
```json
{
  "simulation_id": "string",
  "step": 500,
  "time": 5e-13,
  "lattice": {
    "dimensions": [10, 10, 10],
    "points": [
      {
        "position": [0, 0, 0],
        "element": "string",
        "energy": 0.0,
        "temperature": 300.0,
        "reaction_rate": 0.0
      }
    ],
    "connections": [
      [0, 1],
      [1, 2]
    ]
  },
  "summary": {
    "average_temperature": 300.0,
    "total_energy": 1e-10,
    "reaction_counts": {
      "d-d": 5,
      "p-d": 2
    }
  }
}
```

## WebSocket API

### Connection

Connect to the WebSocket endpoint provided during simulation initialization.

```
ws://server/api/ws/physics/{simulation_id}
```

### Message Types

#### Simulation Updates

Server-sent message with current simulation state:

```json
{
  "type": "simulation_update",
  "simulation_id": "string",
  "step": 500,
  "time": 5e-13,
  "lattice": {
    // Compressed lattice data
  },
  "summary": {
    "average_temperature": 300.0,
    "total_energy": 1e-10
  }
}
```

#### Parameter Updates

Client-sent message to update simulation parameters:

```json
{
  "type": "parameter_update",
  "simulation_id": "string",
  "parameters": {
    "temperature": 350.0
  }
}
```

#### Control Commands

Client-sent message to control the simulation:

```json
{
  "type": "control_command",
  "simulation_id": "string",
  "command": "pause|resume|reset|stop"
}
```

## Use Cases

### 1. Visualizing Lattice Dynamics

The frontend uses the API to retrieve and visualize lattice structure and dynamics, including:

- Displaying atomic positions and connections
- Visualizing energy distributions with color mapping
- Showing temperature gradients across the lattice
- Animating particle movements and interactions

### 2. Real-time Simulation Control

Users interact with the simulation through UI controls that:

- Initialize a simulation with specific parameters
- Start, pause, and reset simulations
- Adjust parameters during simulation
- Take snapshots of interesting states
- Export data for further analysis

### 3. Model Comparison and Analysis

Researchers use the API to:

- Compare different physics models
- Study parameter sensitivity
- Analyze reaction rates and energy outputs
- Validate theoretical predictions

### 4. Data Export and Sharing

Scientists export simulation results to:

- Share with colleagues
- Integrate with other analysis tools
- Generate publication-quality visualizations
- Archive for future reference

## Error Handling

All API endpoints return standard HTTP status codes:

- 200: Success
- 400: Bad Request (invalid parameters)
- 404: Not Found (simulation or snapshot not found)
- 409: Conflict (e.g., trying to start an already running simulation)
- 500: Internal Server Error

Error responses include detailed information:

```json
{
  "error": "string",
  "code": "string",
  "details": "string",
  "timestamp": "timestamp"
}
```

## Performance Considerations

- WebSocket connections use binary message format for large data transfers
- Lattice data is compressed when appropriate
- Optional level-of-detail parameter allows for simplified data during real-time interactions
- Client-side caching is used for previously retrieved data 

## Implementation Examples

### Frontend Integration

The following TypeScript example demonstrates how to initialize a simulation and handle real-time updates:

```typescript
import { physicsApiClient } from './api/physics/physicsApiClient';
import { PhysicsWebSocketClient } from './api/physics/websocketClient';
import { SimulationInitializeRequest } from './api/physics/types';

// 1. Initialize a simulation
const initializeSimulation = async () => {
  const config: SimulationInitializeRequest = {
    models: [
      {
        model_type: 'quantum_tunneling',
        parameters: {
          screening_potential: 150.0,
          barrier_width: 2.5e-10
        }
      }
    ],
    lattice: {
      type: 'fcc',
      dimensions: [10, 10, 10],
      constants: [3.89e-10, 3.89e-10, 3.89e-10],
      elements: [
        {
          symbol: 'Pd',
          position: [0, 0, 0],
          occupancy: 1.0
        }
      ]
    },
    conditions: {
      temperature: 300.0,
      pressure: 101325.0
    },
    simulation_parameters: {
      time_step: 1e-15,
      total_steps: 10000,
      save_frequency: 10
    }
  };

  try {
    const response = await physicsApiClient.initializeSimulation(config);
    console.log(`Simulation initialized with ID: ${response.simulation_id}`);
    return response.simulation_id;
  } catch (error) {
    console.error('Failed to initialize simulation:', error);
    throw error;
  }
};

// 2. Start the simulation and connect to WebSocket for updates
const startSimulationAndListen = async (simulationId: string) => {
  try {
    // Start the simulation
    await physicsApiClient.startSimulation(simulationId);
    
    // Connect to WebSocket for real-time updates
    const wsClient = new PhysicsWebSocketClient(simulationId);
    
    // Listen for simulation updates
    wsClient.addEventListener('simulation_update', (message) => {
      console.log(`Step ${message.step} received:`, message.summary);
      // Update your visualization with the latest data
      updateVisualization(message.lattice, message.summary);
    });
    
    // Handle connection events
    wsClient.addEventListener('open', () => {
      console.log('WebSocket connection established');
    });
    
    wsClient.addEventListener('error', (error) => {
      console.error('WebSocket error:', error);
    });
    
    wsClient.addEventListener('close', (event) => {
      console.log('WebSocket connection closed:', event);
    });
    
    // Connect
    wsClient.connect();
    
    return wsClient;
  } catch (error) {
    console.error('Error starting simulation:', error);
    throw error;
  }
};

// 3. Update parameters during simulation
const updateSimulationParameters = async (simulationId: string) => {
  try {
    await physicsApiClient.updateParameters(simulationId, {
      conditions: {
        temperature: 350.0
      }
    });
    console.log('Parameters updated successfully');
  } catch (error) {
    console.error('Failed to update parameters:', error);
  }
};

// 4. Take a snapshot of the simulation
const takeSnapshot = async (simulationId: string) => {
  try {
    const snapshot = await physicsApiClient.takeSnapshot(simulationId, {
      name: 'High-temperature state',
      description: 'Snapshot taken after temperature increased to 350K'
    });
    console.log(`Snapshot created with ID: ${snapshot.snapshot_id}`);
  } catch (error) {
    console.error('Failed to take snapshot:', error);
  }
};

// Helper function to update visualization (implementation depends on your visualization library)
const updateVisualization = (lattice, summary) => {
  // Example implementation using a hypothetical visualization component
  myLatticeVisualizer.updateData(lattice);
  myEnergyChart.updateData(summary.total_energy);
  myTemperatureMap.updateData(lattice.points.map(p => p.temperature));
};
```

### React Hooks Usage

When using React, you can leverage the provided hooks for simpler integration:

```typescript
import { useEffect, useState } from 'react';
import { 
  useInitializeSimulation, 
  useSimulationControl,
  usePhysicsWebSocket,
  useUpdateParameters
} from './api/physics/hooks';

const LENRSimulationComponent = () => {
  const [simulationId, setSimulationId] = useState<string | null>(null);
  
  // Initialize simulation hook
  const { 
    initializeSimulation, 
    isLoading: isInitializing
  } = useInitializeSimulation();
  
  // Simulation control hook
  const { 
    startSimulation, 
    pauseSimulation, 
    resumeSimulation,
    resetSimulation,
    status,
    isLoading: isControlLoading
  } = useSimulationControl(simulationId);
  
  // WebSocket hook for real-time updates
  const { 
    isConnected,
    simulationUpdates,
    error: wsError,
    sendControlCommand
  } = usePhysicsWebSocket(simulationId);
  
  // Parameter updates hook
  const { 
    updateParameters, 
    isLoading: isUpdatingParams 
  } = useUpdateParameters(simulationId);
  
  // Initialize simulation on component mount
  useEffect(() => {
    const init = async () => {
      if (!simulationId) {
        try {
          const config = {
            models: [{ model_type: 'quantum_tunneling', parameters: {} }],
            lattice: {
              type: 'fcc',
              dimensions: [5, 5, 5],
              constants: [3.89e-10, 3.89e-10, 3.89e-10],
              elements: [{ symbol: 'Pd', position: [0, 0, 0], occupancy: 1.0 }]
            },
            conditions: { temperature: 300.0, pressure: 101325.0 },
            simulation_parameters: { time_step: 1e-15, total_steps: 1000, save_frequency: 10 }
          };
          
          const response = await initializeSimulation(config);
          setSimulationId(response.simulation_id);
        } catch (error) {
          console.error('Failed to initialize simulation:', error);
        }
      }
    };
    
    init();
  }, []);
  
  // Use the latest simulation update for visualization
  const latestUpdate = simulationUpdates[simulationUpdates.length - 1];
  
  return (
    <div>
      <h2>LENR Simulation Control</h2>
      
      {/* Status indicator */}
      <div>
        Status: {status || 'Not initialized'} 
        {isConnected ? '(WebSocket Connected)' : '(WebSocket Disconnected)'}
      </div>
      
      {/* Control buttons */}
      <div>
        <button onClick={() => startSimulation()} disabled={isControlLoading || !simulationId}>
          Start
        </button>
        <button onClick={() => pauseSimulation()} disabled={isControlLoading || !simulationId}>
          Pause
        </button>
        <button onClick={() => resumeSimulation()} disabled={isControlLoading || !simulationId}>
          Resume
        </button>
        <button onClick={() => resetSimulation()} disabled={isControlLoading || !simulationId}>
          Reset
        </button>
      </div>
      
      {/* Parameter controls */}
      <div>
        <h3>Update Parameters</h3>
        <button 
          onClick={() => updateParameters({ conditions: { temperature: 350.0 } })}
          disabled={isUpdatingParams || !simulationId}
        >
          Increase Temperature
        </button>
      </div>
      
      {/* Simulation visualization */}
      {latestUpdate && (
        <div>
          <h3>Latest Update (Step {latestUpdate.step})</h3>
          <pre>{JSON.stringify(latestUpdate.summary, null, 2)}</pre>
          
          {/* Replace with actual visualization components */}
          <LatticeVisualization latticeData={latestUpdate.lattice} />
          <EnergyChart energyData={latestUpdate.summary.total_energy} />
        </div>
      )}
      
      {/* Error display */}
      {wsError && (
        <div className="error">
          WebSocket Error: {wsError.message}
        </div>
      )}
    </div>
  );
};
```

## Error Handling Best Practices

### Client-Side Error Handling

When integrating with the Physics API, implement the following error handling strategies:

1. **Handle Network Errors**: Use try/catch blocks around all API calls to handle network failures.

2. **Implement Retry Logic**: For transient errors, implement exponential backoff.

   ```typescript
   const fetchWithRetry = async (url, options, maxRetries = 3) => {
     let retries = 0;
     while (retries < maxRetries) {
       try {
         const response = await fetch(url, options);
         if (response.ok) return response.json();
         
         // Handle HTTP errors
         const errorData = await response.json();
         if (response.status === 429 || response.status >= 500) {
           // Retry for server errors and rate limiting
           retries++;
           const delay = 2 ** retries * 1000; // Exponential backoff
           await new Promise(resolve => setTimeout(resolve, delay));
           continue;
         }
         
         throw new Error(errorData.error || 'API request failed');
       } catch (error) {
         if (retries === maxRetries - 1) throw error;
         retries++;
         const delay = 2 ** retries * 1000;
         await new Promise(resolve => setTimeout(resolve, delay));
       }
     }
   };
   ```

3. **WebSocket Reconnection**: Implement automatic reconnection for WebSocket connections.

4. **Graceful Degradation**: When real-time data is unavailable, fall back to polling endpoints.

### Common Error Codes

| Error Code | Description | Handling Strategy |
|------------|-------------|-------------------|
| `INVALID_PARAMETERS` | Request contains invalid parameters | Fix parameters based on validation errors |
| `SIMULATION_NOT_FOUND` | Simulation ID does not exist | Redirect to simulation creation |
| `ALREADY_RUNNING` | Simulation is already running | Update UI to reflect current state |
| `ALREADY_PAUSED` | Simulation is already paused | Update UI to reflect current state |
| `MODEL_NOT_SUPPORTED` | Requested physics model is not available | Show supported model options |
| `RESOURCE_EXHAUSTED` | Server resource limits reached | Implement backoff or suggest parameter reduction |

## Security Considerations

1. **API Authentication**: All API requests should include appropriate authentication headers.

2. **Input Validation**: Validate all user inputs before sending to the API.

3. **Rate Limiting**: Implement client-side throttling to respect server rate limits.

4. **Secure WebSockets**: Ensure WebSocket connections use secure protocols (wss://).

## Versioning and Backward Compatibility

The API follows semantic versioning. Breaking changes are indicated by incrementing the major version number. The current version is v1.

API versioning is specified in the URL path or through Accept headers:

```
/api/v1/physics/simulation/initialize
```

Or:

```
Accept: application/json; version=1
```

## Browser Support

The Physics API client and WebSocket implementations support all modern browsers:

- Chrome (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Edge (latest 2 versions)

For older browsers, polyfills may be required for WebSocket and Fetch API support. 