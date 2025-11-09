# Advanced Multi-Physics Simulation Tutorial

This tutorial builds on the basic multi-physics tutorial and introduces more advanced techniques for running complex LENR simulations. We'll explore enhanced parameters, multiple reactions, and more sophisticated analysis techniques.

## Prerequisites

- Completion of the [Basic Multi-Physics Simulation Tutorial](multi_physics_basic.md)
- Intermediate understanding of nuclear physics and heat transfer
- Python with the necessary libraries (requests, numpy, matplotlib, scipy)

## 1. Designing Advanced Simulations

Advanced simulations allow you to model more realistic scenarios by:

- Using higher spatial resolution
- Including multiple nuclear reactions
- Implementing multiple enhancement mechanisms
- Using realistic material properties
- Applying complex boundary conditions
- Running for longer simulation times

Let's walk through how to set up such a simulation.

## 2. Simulating Multiple Reactions with Enhancement Mechanisms

In this example, we'll simulate a palladium-deuterium system with both d-d and d-p reactions, including electron screening and coherent tunneling enhancement mechanisms.

```python
import requests
import json
import time
import numpy as np
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d import Axes3D
from matplotlib import cm

# API endpoint
base_url = "http://localhost:8000/api"

# Simulation parameters
payload = {
    "domain_size": [0.01, 0.01, 0.01],  # 1cm cube
    "resolution": [30, 30, 30],         # Higher resolution
    "simulation_time": 0.01,            # Longer simulation time
    "time_step": 5e-7,                  # Smaller time step for stability
    "reactions": ["d-d", "d-p"],        # Multiple reactions
    "mechanisms": [
        "electron_screening", 
        "coherent_tunneling", 
        "lattice_vibration"
    ],
    "initial_temperature": 350.0,       # Higher initial temperature
    "species_densities": {
        "d": 2.0e28,                    # Deuterium
        "p": 5.0e27                     # Protons (from contaminants)
    },
    # Palladium properties (temperature-dependent)
    "thermal_conductivity": 71.8,
    "heat_capacity": 240.0,
    "material_density": 12023.0
}

# Start the simulation
response = requests.post(f"{base_url}/multi-physics/simulations", json=payload)
result = response.json()
simulation_id = result["simulation_id"]
print(f"Simulation started: {simulation_id}")
print(f"Estimated duration: {result['estimated_duration']} seconds")

# Poll for status
while True:
    response = requests.get(f"{base_url}/multi-physics/simulations/{simulation_id}/status")
    status = response.json()
    print(f"Status: {status['status']}, Progress: {status['progress']:.1f}%")
    
    if status['status'] in ['completed', 'failed']:
        break
        
    time.sleep(2)  # Check every 2 seconds

# Get results
if status['status'] == 'completed':
    response = requests.get(f"{base_url}/multi-physics/simulations/{simulation_id}/results")
    results = response.json()
    print("Simulation completed successfully!")
    print(f"Final maximum temperature: {results['final_max_temperature']} K")
    print(f"Simulation steps: {results['step_count']}")
    print(f"Wall-clock time: {results['elapsed_time']} seconds")
else:
    print(f"Simulation failed: {status.get('message', 'Unknown error')}")
    exit(1)
```

## 3. Analyzing Multiple Reaction Contributions

When working with multiple reactions, it's valuable to analyze the contribution of each reaction to the overall power generation:

```python
# Advanced analysis of reaction contributions
import numpy as np
import matplotlib.pyplot as plt

# Create subplots
fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(12, 10))

# Temperature evolution
ax1.plot(results['times'], results['max_temperatures'], 'r-', linewidth=2)
ax1.set_xlabel('Time (s)')
ax1.set_ylabel('Temperature (K)')
ax1.set_title('Maximum Temperature Evolution')
ax1.grid(True)

# Extract reaction-specific data if available
if 'reaction_rates' in results:
    reaction_data = results['reaction_rates']
    
    # Normalize reaction rates for comparison
    max_rate = max([max(rates) for reaction, rates in reaction_data.items()])
    
    for reaction, rates in reaction_data.items():
        ax2.plot(results['times'], rates, label=f"{reaction} reaction")
    
    ax2.set_xlabel('Time (s)')
    ax2.set_ylabel('Reaction Rate (m⁻³s⁻¹)')
    ax2.set_title('Reaction Rates Comparison')
    ax2.set_yscale('log')  # Log scale often works better for reaction rates
    ax2.legend()
    ax2.grid(True)

plt.tight_layout()
plt.savefig('advanced_simulation_results.png')
plt.show()
```

## 4. Temperature-Dependent Material Properties

In real-world scenarios, material properties like thermal conductivity and heat capacity are temperature-dependent. You can model this by using the material properties endpoints:

```python
# First, get the temperature-dependent properties for palladium
response = requests.get(f"{base_url}/physics/materials/palladium")
material_data = response.json()

# Extract temperature-dependent thermal conductivity
temp_points = []
k_values = []

for data_point in material_data['temperature_dependent_properties']['thermal_conductivity']:
    temp_points.append(data_point['temperature'])
    k_values.append(data_point['value'])

# Create interpolation function
from scipy.interpolate import interp1d
k_interp = interp1d(temp_points, k_values, kind='linear', fill_value='extrapolate')

# Now we can calculate thermal conductivity at any temperature
simulation_temps = np.linspace(300, 600, 100)
conductivity_values = k_interp(simulation_temps)

# Plot the temperature-dependent conductivity
plt.figure(figsize=(8, 6))
plt.plot(temp_points, k_values, 'ro', label='Reference data')
plt.plot(simulation_temps, conductivity_values, 'b-', label='Interpolated values')
plt.xlabel('Temperature (K)')
plt.ylabel('Thermal Conductivity (W/m·K)')
plt.title('Temperature-Dependent Thermal Conductivity of Palladium')
plt.legend()
plt.grid(True)
plt.savefig('thermal_conductivity.png')
plt.show()
```

## 5. 3D Visualization of Results

For advanced analysis, you'll often want to visualize the 3D temperature or reaction rate field:

```python
# Get the 3D field data (may require an additional API call)
response = requests.get(f"{base_url}/multi-physics/simulations/{simulation_id}/fields?variable=temperature")
field_data = response.json()

# Extract 3D temperature array
temperature_field = np.array(field_data['temperature_field'])
x_coords = np.array(field_data['x_coordinates'])
y_coords = np.array(field_data['y_coordinates'])
z_coords = np.array(field_data['z_coordinates'])

# Create mesh grid
X, Y = np.meshgrid(x_coords, y_coords)

# Choose a z-slice to visualize (middle of the domain)
z_idx = len(z_coords) // 2
temp_slice = temperature_field[:, :, z_idx]

# Create the 2D visualization
plt.figure(figsize=(10, 8))
cs = plt.contourf(X, Y, temp_slice, 50, cmap=cm.inferno)
plt.colorbar(cs, label='Temperature (K)')
plt.xlabel('X (m)')
plt.ylabel('Y (m)')
plt.title(f'Temperature Distribution at Z = {z_coords[z_idx]:.6f} m')
plt.savefig('temperature_slice.png')

# Create a 3D visualization (optional)
fig = plt.figure(figsize=(12, 10))
ax = fig.add_subplot(111, projection='3d')

# Find hotspots (temperatures above a threshold)
threshold = np.mean(temperature_field) + np.std(temperature_field)
hotspots = temperature_field > threshold

# Create a scatter plot of hotspots
x_idx, y_idx, z_idx = np.where(hotspots)
temperatures = temperature_field[x_idx, y_idx, z_idx]

scatter = ax.scatter(
    x_coords[x_idx], 
    y_coords[y_idx], 
    z_coords[z_idx],
    c=temperatures,
    cmap=cm.hot,
    alpha=0.7,
    s=30
)

plt.colorbar(scatter, label='Temperature (K)')
ax.set_xlabel('X (m)')
ax.set_ylabel('Y (m)')
ax.set_zlabel('Z (m)')
ax.set_title('Hot Spots in the Simulation Domain')
plt.savefig('temperature_hotspots_3d.png')
plt.show()
```

## 6. Parameter Sensitivity Analysis

To understand how different parameters affect your simulation results, perform a sensitivity analysis:

```python
# Define parameters to vary
variations = {
    "temperature": [300, 350, 400, 450, 500],
    "density": [0.5e28, 1.0e28, 2.0e28, 4.0e28]
}

# Results storage
results_matrix = np.zeros((len(variations["temperature"]), len(variations["density"])))

# Run simulations for each parameter combination
for i, temp in enumerate(variations["temperature"]):
    for j, density in enumerate(variations["density"]):
        # Update the payload
        payload["initial_temperature"] = temp
        payload["species_densities"]["d"] = density
        
        # Start simulation
        response = requests.post(f"{base_url}/multi-physics/simulations", json=payload)
        sim_id = response.json()["simulation_id"]
        
        # Wait for completion (simplified)
        while True:
            response = requests.get(f"{base_url}/multi-physics/simulations/{sim_id}/status")
            status = response.json()
            if status['status'] in ['completed', 'failed']:
                break
            time.sleep(2)
        
        # Get final temperature
        if status['status'] == 'completed':
            response = requests.get(f"{base_url}/multi-physics/simulations/{sim_id}/results")
            sim_results = response.json()
            results_matrix[i, j] = sim_results['final_max_temperature']
        
        # Clean up
        requests.delete(f"{base_url}/multi-physics/simulations/{sim_id}")

# Visualize the sensitivity analysis
plt.figure(figsize=(10, 8))
plt.imshow(
    results_matrix, 
    interpolation='bilinear', 
    origin='lower',
    extent=[
        min(variations["density"]), 
        max(variations["density"]), 
        min(variations["temperature"]), 
        max(variations["temperature"])
    ],
    aspect='auto',
    cmap=cm.viridis
)
plt.colorbar(label='Final Max Temperature (K)')
plt.xlabel('Deuterium Density (m⁻³)')
plt.ylabel('Initial Temperature (K)')
plt.title('Parameter Sensitivity Analysis')
plt.savefig('sensitivity_analysis.png')
plt.show()
```

## 7. Batch Processing Multiple Simulations

For comprehensive studies, you might want to run multiple simulations with different parameters. Here's a way to manage batch processing:

```python
import concurrent.futures
import pandas as pd

# Define parameter sets
parameter_sets = [
    {"name": "baseline", "temperature": 300, "mechanisms": ["electron_screening"]},
    {"name": "high_temp", "temperature": 500, "mechanisms": ["electron_screening"]},
    {"name": "multi_mech", "temperature": 300, "mechanisms": ["electron_screening", "coherent_tunneling"]},
    {"name": "combined", "temperature": 500, "mechanisms": ["electron_screening", "coherent_tunneling"]}
]

results_summary = []

# Function to run a single simulation
def run_simulation(params):
    # Create simulation payload from the base payload
    sim_payload = payload.copy()
    sim_payload["initial_temperature"] = params["temperature"]
    sim_payload["mechanisms"] = params["mechanisms"]
    
    # Start simulation
    response = requests.post(f"{base_url}/multi-physics/simulations", json=sim_payload)
    sim_id = response.json()["simulation_id"]
    
    # Wait for completion
    while True:
        response = requests.get(f"{base_url}/multi-physics/simulations/{sim_id}/status")
        status = response.json()
        if status['status'] in ['completed', 'failed']:
            break
        time.sleep(2)
    
    # Get results
    if status['status'] == 'completed':
        response = requests.get(f"{base_url}/multi-physics/simulations/{sim_id}/results")
        sim_results = response.json()
        
        # Clean up
        requests.delete(f"{base_url}/multi-physics/simulations/{sim_id}")
        
        # Return summary
        return {
            "name": params["name"],
            "temperature": params["temperature"],
            "mechanisms": ", ".join(params["mechanisms"]),
            "final_temp": sim_results['final_max_temperature'],
            "max_reaction_rate": max(sim_results['mean_reaction_rates']),
            "elapsed_time": sim_results['elapsed_time']
        }
    else:
        return {
            "name": params["name"],
            "temperature": params["temperature"],
            "mechanisms": ", ".join(params["mechanisms"]),
            "status": "failed"
        }

# Run simulations in parallel (adjust max_workers based on server capacity)
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
    futures = [executor.submit(run_simulation, params) for params in parameter_sets]
    for future in concurrent.futures.as_completed(futures):
        results_summary.append(future.result())

# Create a summary dataframe
results_df = pd.DataFrame(results_summary)
print(results_df)

# Save to CSV
results_df.to_csv('simulation_results_summary.csv', index=False)
```

## 8. Coupling with External Analysis Tools

For advanced analysis, you might want to export your results to specialized scientific tools like MATLAB, R, or specialized visualization software.

```python
# Export to CSV for external tools
import pandas as pd

# Create a dataframe from simulation results
times = results['times']
temperatures = results['max_temperatures']
reaction_rates = results['mean_reaction_rates']

df = pd.DataFrame({
    'time': times,
    'max_temperature': temperatures,
    'mean_reaction_rate': reaction_rates
})

# Save to CSV
df.to_csv('simulation_data.csv', index=False)
print("Data saved to simulation_data.csv for external analysis")
```

## 9. Comparing with Experimental Data

When validating your model against experimental data, you can overlay the simulation results with experimental measurements:

```python
# Example comparison with experimental data
# (In a real scenario, you would load actual experimental data)
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt

# Load experimental data (simulated here)
def generate_sample_experimental_data():
    # Generate synthetic experimental data with some noise
    times = np.linspace(0, results['times'][-1], 20)
    temperatures = np.interp(times, results['times'], results['max_temperatures'])
    # Add some noise and experimental error
    temperatures += np.random.normal(0, 2, len(temperatures))
    # Add systematic error (experimental temperatures may be higher)
    temperatures *= 1.05
    
    return pd.DataFrame({
        'time': times,
        'temperature': temperatures,
        'error': np.ones_like(times) * 3  # Assume 3K error bars
    })

exp_data = generate_sample_experimental_data()

# Plot comparison
plt.figure(figsize=(10, 6))
plt.plot(results['times'], results['max_temperatures'], 'b-', label='Simulation')
plt.errorbar(exp_data['time'], exp_data['temperature'], yerr=exp_data['error'], 
             fmt='ro', label='Experimental Data', capsize=5)
plt.xlabel('Time (s)')
plt.ylabel('Temperature (K)')
plt.title('Comparison of Simulation Results with Experimental Data')
plt.legend()
plt.grid(True)
plt.savefig('simulation_vs_experiment.png')
plt.show()

# Calculate goodness of fit
from scipy.interpolate import interp1d
from sklearn.metrics import mean_squared_error, r2_score

# Interpolate simulation data at experimental time points
sim_interp = interp1d(results['times'], results['max_temperatures'])
sim_at_exp_times = sim_interp(exp_data['time'])

# Calculate metrics
mse = mean_squared_error(exp_data['temperature'], sim_at_exp_times)
rmse = np.sqrt(mse)
r2 = r2_score(exp_data['temperature'], sim_at_exp_times)

print(f"Model validation metrics:")
print(f"Root Mean Square Error (RMSE): {rmse:.2f} K")
print(f"R² Score: {r2:.4f}")
```

## 10. Advanced Troubleshooting

When running advanced simulations, you might encounter various issues. Here are some tips for troubleshooting:

### Numerical Instability

If your simulation results show sudden spikes, oscillations, or NaN values:
- Decrease the time step size
- Check if your material properties are within physical ranges
- Examine your boundary conditions for consistency
- Ensure that your domain resolution is adequate

### Performance Bottlenecks

If simulations are taking too long:
- Profile which part of the simulation is most computationally intensive
- Consider reducing the resolution in less critical areas
- Use adaptive time stepping if available
- For parameter studies, start with coarse simulations before running high-resolution ones

### Memory Issues

For large 3D simulations, memory usage can be significant:
- Monitor server memory usage during simulations
- Process results in chunks rather than loading entire datasets
- Consider downsampling output data for visualization
- Clean up completed simulations promptly

## Conclusion

This advanced tutorial has covered:

1. Setting up complex multi-physics simulations
2. Analyzing results from multiple reactions
3. Working with temperature-dependent material properties
4. Visualizing 3D simulation data
5. Performing parameter sensitivity analysis
6. Batch processing multiple simulations
7. Exporting data for external analysis
8. Comparing simulation results with experimental data
9. Troubleshooting advanced simulations

By mastering these techniques, you'll be able to conduct sophisticated LENR simulations and extract meaningful insights from your results. 