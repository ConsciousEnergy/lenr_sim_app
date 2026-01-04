# LENR Simulation App - Comprehensive API Documentation

## Overview

The LENR Simulation App API provides a comprehensive set of endpoints for simulating and analyzing Low Energy Nuclear Reaction (LENR) phenomena. The API is built on FastAPI and provides REST endpoints as well as WebSocket support for real-time data streaming.

**Base URL**: `http://localhost:8000/api`  
**API Version**: 1.0.0  
**Documentation**: Available at `http://localhost:8000/api/docs` (Swagger UI) and `http://localhost:8000/api/redoc` (ReDoc)

## Authentication

Currently, the API does not require authentication for local development. In production, authentication will be implemented using JWT tokens.

## Error Handling

All endpoints return standardized error responses:

```json
{
  "status_code": 400,
  "message": "Error message",
  "error_type": "error_type",
  "details": [
    {
      "loc": ["field_name"],
      "msg": "Error message",
      "type": "error_type"
    }
  ],
  "request_id": "uuid-string"
}
```

### Error Codes

| Status Code | Error Type | Description |
|------------|------------|-------------|
| 400 | `physics_validation_error` | Invalid physics parameters |
| 400 | `calculation_error` | Calculation failed |
| 404 | `resource_not_found` | Resource not found |
| 422 | `validation_error` | Request validation failed |
| 500 | `simulation_error` | Simulation execution error |
| 500 | `server_error` | Internal server error |

## API Modules

### 1. Physics Endpoints

#### Calculate Fusion Rate

**POST** `/api/physics/calculate/rate`

Calculate fusion reaction rate with optional enhancement factors.

**Request Body:**
```json
{
  "reaction_name": "d-d",
  "conditions": {
    "temperature": 300.0,
    "density": 1.0e28
  },
  "enhancement_factors": {
    "electron_screening": 1.5,
    "phonon_assisted": 2.0
  }
}
```

**Response:**
```json
{
  "reaction_rate": 1.234e-15,
  "cross_section": 5.678e-30,
  "enhanced_rate": 3.456e-15,
  "enhancement_factor": 2.8
}
```

#### Calculate Enhancement

**POST** `/api/physics/calculate-enhancement`

Calculate enhancement factors for various mechanisms.

**Request Body:**
```json
{
  "config": {
    "electron_screening": {
      "screening_length": 2.5e-11,
      "screening_type": "thomas_fermi"
    },
    "phonon_assisted": {
      "debye_temperature": 300.0,
      "lattice_constant": 4e-10
    }
  },
  "mechanisms": ["electron_screening", "phonon_assisted"]
}
```

**Response:**
```json
{
  "total_enhancement": 245.6,
  "mechanism_contributions": {
    "electron_screening": 180.2,
    "phonon_assisted": 1.36
  },
  "metadata": {
    "calculation_time_ms": 123.45
  }
}
```

#### Quantum Tunneling

**POST** `/api/physics/quantum-tunneling`

Calculate quantum tunneling probability with advanced models.

**Request Body:**
```json
{
  "temperature": 300.0,
  "potential_type": "yukawa",
  "barrier_width": 1.5e-10,
  "z1": 1,
  "z2": 1,
  "energy_min_ev": 0.01,
  "energy_max_ev": 10.0,
  "energy_points": 100,
  "electron_screening": true,
  "screening_length": 2.5e-11,
  "phonon_assisted": true,
  "lattice_sites": 3,
  "model_type": "wkb"
}
```

**Response:**
```json
{
  "tunneling_probability": 1.2345e-20,
  "base_probability": 5.6789e-25,
  "total_enhancement_factor": 21789.5,
  "peak_energy_ev": 0.42,
  "enhancement_factors": {
    "electron_screening": 245.6,
    "phonon_assisted": 3.8,
    "coherent_tunneling": 2.3
  },
  "energy_data": {
    "energy_eV": [0.01, 0.02, ...],
    "base_probability": [...],
    "enhanced_probability": [...]
  }
}
```

#### Phonon-Nuclear Coupling

**POST** `/api/physics/phonon-nuclear-coupling`

Calculate phonon-assisted nuclear coupling effects.

**Request Body:**
```json
{
  "lattice_parameters": {
    "lattice_constant": 4e-10,
    "debye_temperature": 300.0,
    "material": "palladium"
  },
  "nuclear_parameters": {
    "reaction_name": "d-d",
    "temperature": 300.0
  },
  "coupling_strength": 0.1
}
```

**Response:**
```json
{
  "coupling_factor": 2.45,
  "phonon_contribution": 1.8,
  "nuclear_contribution": 1.36,
  "enhancement_mechanisms": {
    "coherent_phonon": 1.2,
    "resonant_enhancement": 1.05
  }
}
```

#### Get Available Reactions

**GET** `/api/physics/available-reactions`

Get list of all available fusion reactions.

**Response:**
```json
[
  {
    "name": "d-d",
    "reactants": [{"z": 1, "a": 2}, {"z": 1, "a": 2}],
    "products": [{"z": 2, "a": 3}, {"z": 0, "a": 1}],
    "q_value_mev": 4.03
  }
]
```

#### Custom Reactions

**POST** `/api/physics/reactions/custom`

Create a custom fusion reaction.

**Request Body:**
```json
{
  "name": "custom-reaction",
  "reactants": [{"z": 1, "a": 1}, {"z": 1, "a": 1}],
  "products": [{"z": 2, "a": 2}],
  "q_value_mev": 0.5
}
```

**GET** `/api/physics/reactions/custom`

Get all custom reactions.

**DELETE** `/api/physics/reactions/custom/{reaction_name}`

Delete a custom reaction.

### 2. Multi-Physics Coupling Endpoints

#### Start Simulation

**POST** `/api/multi-physics/simulations`

Start a new multi-physics coupled simulation.

**Request Body:**
```json
{
  "domain_size": [0.01, 0.01, 0.01],
  "resolution": [20, 20, 20],
  "simulation_time": 0.01,
  "time_step": 1e-6,
  "reactions": ["d-d"],
  "mechanisms": ["electron_screening", "coherent_tunneling"],
  "initial_temperature": 300.0,
  "species_densities": {"d": 1.0e28},
  "thermal_conductivity": 10.0,
  "heat_capacity": 500.0,
  "material_density": 1000.0
}
```

**Response:**
```json
{
  "simulation_id": "uuid-string",
  "status": "pending",
  "message": "Simulation queued",
  "estimated_duration": 120.5
}
```

#### Get Simulation Status

**GET** `/api/multi-physics/simulations/{simulation_id}/status`

Get the current status of a simulation.

**Response:**
```json
{
  "simulation_id": "uuid-string",
  "status": "running",
  "progress": 0.45,
  "elapsed_time": 54.2,
  "estimated_remaining": 66.3
}
```

#### Get Simulation Results

**GET** `/api/multi-physics/simulations/{simulation_id}/results`

Get results from a completed simulation.

**Response:**
```json
{
  "simulation_id": "uuid-string",
  "status": "completed",
  "results": {
    "temperature_field": [[...], [...]],
    "reaction_rates": [[...], [...]],
    "time_points": [0.0, 1e-6, ...],
    "total_reactions": 1.234e15
  },
  "metadata": {
    "completion_time": "2025-01-15T10:30:00Z",
    "total_time_steps": 10000
  }
}
```

#### List All Simulations

**GET** `/api/multi-physics/simulations`

Get list of all simulations with their statuses.

#### Delete Simulation

**DELETE** `/api/multi-physics/simulations/{simulation_id}`

Delete a simulation and its results.

### 3. Visualization Endpoints

#### Register Simulation for Visualization

**POST** `/api/visualization/register-simulation/{simulation_id}`

Register a simulation for real-time visualization streaming.

**Response:**
```json
{
  "simulation_id": "uuid-string",
  "status": "registered",
  "websocket_url": "ws://localhost:8000/api/visualization/ws/{client_id}"
}
```

#### WebSocket Connection

**WebSocket** `/api/visualization/ws/{client_id}`

Real-time streaming of visualization events.

**Message Format:**
```json
{
  "simulation_id": "uuid-string",
  "event_type": "data_update",
  "source": "nuclear_domain",
  "data": {
    "temperature": 350.5,
    "reaction_rate": 1.234e-15
  },
  "timestamp": "2025-01-15T10:30:00Z"
}
```

**Event Types:**
- `simulation_started`
- `data_update`
- `simulation_completed`
- `error`

### 4. Results and Analysis Endpoints

#### Get Simulation Results

**GET** `/api/results/simulations/{simulation_id}/results`

Get detailed results from a simulation.

#### Analyze Results

**POST** `/api/results/simulations/{simulation_id}/analyze`

Perform analysis on simulation results.

**Request Body:**
```json
{
  "analysis_type": "energy_balance",
  "parameters": {
    "time_range": [0.0, 0.01],
    "spatial_region": [0, 10, 0, 10, 0, 10]
  }
}
```

#### Export Results

**GET** `/api/results/simulations/{simulation_id}/export?format=json`

Export simulation results in various formats (json, csv, hdf5).

### 5. Diagnostics Endpoints

#### System Information

**GET** `/api/diagnostics/system`

Get system information including CPU, memory, and disk usage.

**Response:**
```json
{
  "cpu_percent": 45.2,
  "memory": {
    "total_gb": 16.0,
    "available_gb": 8.5,
    "percent": 46.9
  },
  "disk": {
    "total_gb": 500.0,
    "free_gb": 250.0,
    "percent": 50.0
  }
}
```

#### Memory Usage

**GET** `/api/diagnostics/memory`

Get detailed memory usage information.

#### Force Garbage Collection

**POST** `/api/diagnostics/gc`

Force garbage collection to free memory.

#### Application Status

**GET** `/api/diagnostics/status`

Get application health status.

### 6. Logging Endpoints

#### Get Available Logs

**GET** `/api/logs/available`

Get list of available log files.

**Response:**
```json
["app.log", "errors.log", "performance.log"]
```

#### Get Log Entries

**GET** `/api/logs/{log_name}?lines=100`

Get log entries from a specific log file.

**Query Parameters:**
- `lines`: Number of lines to retrieve (default: 100)
- `level`: Filter by log level (optional)

#### Clear Log

**POST** `/api/logs/clear/{log_name}`

Clear a specific log file.

### 7. Fitting Endpoints

#### Get Available Models

**GET** `/api/fitting/models`

Get list of available fitting models.

**Response:**
```json
["exponential", "power_law", "gaussian", "polynomial"]
```

#### Fit Data

**POST** `/api/fitting/fit`

Fit experimental data to a model.

**Request Body:**
```json
{
  "model": "exponential",
  "data": {
    "x": [1.0, 2.0, 3.0, 4.0],
    "y": [2.0, 4.0, 8.0, 16.0]
  },
  "initial_guess": {"a": 1.0, "b": 0.5}
}
```

**Response:**
```json
{
  "parameters": {"a": 1.0, "b": 0.693},
  "r_squared": 0.999,
  "residuals": [...]
}
```

## Rate Limiting

Currently, there are no rate limits enforced. In production, rate limiting will be implemented based on:
- Endpoint complexity
- User authentication level
- System load

## Timeout Handling

Different endpoints have different timeout values:
- Standard physics calculations: 180s
- Enhancement calculations: 360s
- Multi-physics simulations: 300s
- WebSocket connections: No timeout

Timeout errors return status code 408 with error type `timeout_error`.

## Best Practices

1. **Use appropriate endpoints**: Use specific endpoints rather than generic ones when possible
2. **Handle errors gracefully**: Always check response status codes
3. **Use WebSockets for real-time data**: For streaming simulation data, use WebSocket connections
4. **Poll for long-running operations**: For simulations, poll the status endpoint rather than waiting
5. **Cache enhancement calculations**: Enhancement factors can be cached for repeated calculations
6. **Monitor resource usage**: Use diagnostics endpoints to monitor system health

## Examples

### Python Example

```python
import requests

# Calculate fusion rate
response = requests.post(
    "http://localhost:8000/api/physics/calculate/rate",
    json={
        "reaction_name": "d-d",
        "conditions": {
            "temperature": 300.0,
            "density": 1.0e28
        }
    }
)
result = response.json()
print(f"Reaction rate: {result['reaction_rate']}")
```

### JavaScript Example

```javascript
// Calculate enhancement
const response = await fetch('http://localhost:8000/api/physics/calculate-enhancement', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    config: {
      electron_screening: {
        screening_length: 2.5e-11
      }
    },
    mechanisms: ['electron_screening']
  })
});

const result = await response.json();
console.log(`Total enhancement: ${result.total_enhancement}`);
```

### WebSocket Example

```javascript
const ws = new WebSocket('ws://localhost:8000/api/visualization/ws/client123');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log(`Event: ${data.event_type}`, data.data);
};
```

## Support

For API support:
- Check the interactive documentation at `/api/docs`
- Review error messages for detailed information
- Check logs using the logging endpoints
- Open an issue on GitHub with request/response details
