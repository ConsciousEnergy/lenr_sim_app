# Basic Multi-Physics Simulation Tutorial

This tutorial will guide you through running a basic multi-physics simulation using the LENR Simulation API. You'll learn how to set up and run a deuterium-deuterium fusion simulation with coupled thermal and nuclear effects.

## Prerequisites

- LENR Simulation API running (local or remote)
- HTTP client (like curl, Postman, or your programming language's HTTP library)
- Basic understanding of nuclear physics concepts

## Step 1: Understand the Simulation Parameters

Before starting, it's important to understand the key parameters for our simulation:

- **Domain Size**: Physical dimensions of our simulation space (in meters)
- **Resolution**: Grid resolution for numerical calculations
- **Simulation Time**: Total physical time to simulate (in seconds)
- **Time Step**: Size of each time step (in seconds)
- **Reactions**: Nuclear reactions to model (e.g., "d-d" for deuterium-deuterium fusion)
- **Mechanisms**: Enhancement mechanisms that could increase reaction rates
- **Initial Temperature**: Starting temperature of the system (in Kelvin)
- **Species Densities**: Density of reactant species (in m⁻³)
- **Material Properties**: Thermal conductivity, heat capacity, and density of the material

## Step 2: Start a New Simulation

Send a POST request to the `/api/multi-physics/simulations` endpoint with your simulation parameters:

```bash
curl -X POST http://localhost:8010/api/multi-physics/simulations \
  -H "Content-Type: application/json" \
  -d '{
    "domain_size": [0.01, 0.01, 0.01],
    "resolution": [10, 10, 10],
    "simulation_time": 0.001,
    "time_step": 1e-6,
    "reactions": ["d-d"],
    "mechanisms": ["electron_screening"],
    "initial_temperature": 300.0,
    "species_densities": {"d": 1.0e28},
    "thermal_conductivity": 10.0,
    "heat_capacity": 500.0,
    "material_density": 1000.0
  }'
```

### Python Example

```python
import requests
import json

url = "http://localhost:8010/api/multi-physics/simulations"
payload = {
    "domain_size": [0.01, 0.01, 0.01],
    "resolution": [10, 10, 10],
    "simulation_time": 0.001,
    "time_step": 1e-6,
    "reactions": ["d-d"],
    "mechanisms": ["electron_screening"],
    "initial_temperature": 300.0,
    "species_densities": {"d": 1.0e28},
    "thermal_conductivity": 10.0,
    "heat_capacity": 500.0,
    "material_density": 1000.0
}

response = requests.post(url, json=payload)
print(response.json())
```

You should receive a response with a simulation ID:

```json
{
  "simulation_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "status": "pending",
  "message": "Simulation started in the background",
  "estimated_duration": 1.0
}
```

Save this simulation ID, as you'll need it to check the status and retrieve results.

## Step 3: Check Simulation Status

While the simulation is running, you can check its status by sending a GET request to the `/api/multi-physics/simulations/{simulation_id}/status` endpoint:

```bash
curl -X GET http://localhost:8010/api/multi-physics/simulations/3fa85f64-5717-4562-b3fc-2c963f66afa6/status
```

### Python Example

```python
import requests
import time

simulation_id = "3fa85f64-5717-4562-b3fc-2c963f66afa6"
status_url = f"http://localhost:8010/api/multi-physics/simulations/{simulation_id}/status"

# Poll status until simulation is complete
while True:
    response = requests.get(status_url)
    status_data = response.json()
    print(f"Status: {status_data['status']}, Progress: {status_data['progress']}%")
    
    if status_data['status'] in ['completed', 'failed']:
        break
        
    time.sleep(0.5)  # Wait before checking again
```

The response will show the current status and progress:

```json
{
  "simulation_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "status": "running",
  "progress": 45.5,
  "current_time": 0.000455,
  "message": "Simulation in progress"
}
```

Continue polling until the status changes to "completed".

## Step 4: Retrieve Simulation Results

Once the simulation is complete, retrieve the results by sending a GET request to the `/api/multi-physics/simulations/{simulation_id}/results` endpoint:

```bash
curl -X GET http://localhost:8010/api/multi-physics/simulations/3fa85f64-5717-4562-b3fc-2c963f66afa6/results
```

### Python Example

```python
import requests
import matplotlib.pyplot as plt

results_url = f"http://localhost:8010/api/multi-physics/simulations/{simulation_id}/results"
response = requests.get(results_url)
results = response.json()

# Plot the results
plt.figure(figsize=(10, 6))
plt.plot(results['times'], results['max_temperatures'], label='Max Temperature (K)')
plt.xlabel('Time (s)')
plt.ylabel('Temperature (K)')
plt.title('Temperature Evolution')
plt.legend()
plt.grid(True)
plt.savefig('temperature_evolution.png')
plt.show()
```

The response will contain the simulation results:

```json
{
  "simulation_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "status": "completed",
  "times": [0.0, 0.000001, 0.000002, ... ],
  "max_temperatures": [300.0, 300.0001, 300.0002, ... ],
  "mean_reaction_rates": [1.2e-30, 1.21e-30, 1.22e-30, ... ],
  "final_max_temperature": 300.01,
  "elapsed_time": 0.5,
  "step_count": 1000
}
```

## Step 5: Analyze the Results

Now you can analyze the results to understand what happened in your simulation:

1. Look at the temperature evolution over time
2. Check the reaction rates to see if any significant fusion occurred
3. Note the final maximum temperature to determine if there was any heating

For a basic simulation like this, you might not see significant temperature increases or reaction rates, as we used standard conditions. To see more interesting results, try:

- Increasing the initial temperature
- Adding more enhancement mechanisms
- Increasing the simulation time
- Using different reaction types

## Step 6: Clean Up

When you're done with the simulation, you can delete it to free up server resources:

```bash
curl -X DELETE http://localhost:8010/api/multi-physics/simulations/3fa85f64-5717-4562-b3fc-2c963f66afa6
```

### Python Example

```python
import requests

delete_url = f"http://localhost:8010/api/multi-physics/simulations/{simulation_id}"
response = requests.delete(delete_url)
print(response.json())
```

## Next Steps

Now that you've completed a basic simulation, you might want to:

1. Try different parameter values to see how they affect the results
2. Experiment with different enhancement mechanisms
3. Try a more complex simulation with higher resolution
4. Compare results for different nuclear reactions
5. Learn how to visualize the 3D temperature field

Check out the advanced tutorials for more examples and use cases.

## Troubleshooting

### Simulation Fails to Start

If your simulation fails to start, check that:
- All required parameters are provided
- Parameter values are within valid ranges (e.g., positive temperatures, non-zero densities)
- The server has enough resources to run the simulation

### Simulation Takes Too Long

If your simulation takes too long:
- Reduce the resolution
- Decrease the simulation time
- Increase the time step size (be careful with numerical stability)

### Invalid Results

If you get unexpected or invalid results:
- Check for NaN or extremely high values in the results
- Ensure your time step is small enough for numerical stability
- Verify that your material properties are physically realistic 