# Multi-Physics Domain API Reference

## Overview

The Multi-Physics Domain API provides a framework for coupling different physics domains within LENR simulations. This document describes the core interfaces, implementation requirements, and usage patterns.

## Domain Interface

All physics domains must implement the `DomainInterface` abstract class. This interface provides a standard way for domains to interact and exchange data.

### Core Methods

| Method | Description | Parameters | Return Value |
|--------|-------------|------------|--------------|
| `initialize(config)` | Initialize the domain with configuration | `config`: Dict[str, Any] - Configuration parameters | None |
| `advance(dt)` | Advance the domain by a time step | `dt`: float - Time step size in seconds | bool - Success flag |
| `get_state(variable_name)` | Get the current state of a variable | `variable_name`: str - Name of the variable | numpy.ndarray - Variable state |
| `set_state(variable_name, value)` | Set the state of a variable | `variable_name`: str - Name of the variable<br>`value`: numpy.ndarray - New variable state | None |
| `get_max_stable_timestep()` | Get maximum stable time step | None | float - Time step in seconds |
| `get_required_variables()` | Get variables required from other domains | None | Set[str] - Set of variable names |
| `get_provided_variables()` | Get variables provided to other domains | None | Set[str] - Set of variable names |
| `validate_state()` | Validate domain state for consistency | None | Tuple[bool, List[str]] - Validity flag and error messages |
| `get_domain_name()` | Get the name of the domain | None | str - Domain name |

## Available Physics Domains

### ThermalDomain

Models heat transfer processes using the heat diffusion equation.

#### Provided Variables
- `temperature` - Temperature field (K)
- `thermal_conductivity` - Thermal conductivity field (W/(m*K))
- `heat_capacity` - Heat capacity field (J/(kg*K))
- `density` - Material density field (kg/m³)

#### Required Variables
- `power_density` - Heat source from nuclear reactions (W/m³)

#### Configuration Parameters

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `initial_temperature` | float | Initial temperature in K | 300.0 |
| `thermal_conductivity` | float | Thermal conductivity in W/(m*K) | 1.0 |
| `heat_capacity` | float | Heat capacity in J/(kg*K) | 1000.0 |
| `density` | float | Material density in kg/m³ | 1000.0 |
| `boundary_conditions` | Dict | Dictionary of boundary conditions | {} |

### NuclearDomain

Models nuclear reaction processes and energy production.

#### Provided Variables
- `power_density` - Power density from reactions (W/m³)
- `energy_deposition` - Cumulative energy deposition (J/m³)
- `density_{species}` - Density of each species (m⁻³)
- `reaction_rate_{reaction}` - Reaction rates for each reaction (reactions/s/m³)

#### Required Variables
- `temperature` - Temperature field (K)

#### Configuration Parameters

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `reactions` | List[str] | List of reaction names to simulate | [] |
| `mechanisms` | List[str] | Enhancement mechanisms to include | None |
| `initial_temperature` | float | Initial temperature in K | 300.0 |
| `densities` | Dict[str, float] | Species densities (m⁻³) | {} |

## Physics Domain Manager

The `PhysicsDomainManager` class coordinates the registration and interaction of different physics domains.

### Key Features

- Domain and coupler registration
- Automatic execution order determination
- Time stepping and synchronization
- Data exchange between domains
- Error detection and recovery

### Example Usage

```python
# Create spatial domain
domain = SimulationDomain(
    dimensions=(0.01, 0.01, 0.01),  # 1cm³ cube
    resolution=(20, 20, 20),        # 20×20×20 grid
    boundary_conditions={
        'x_min': 'dirichlet', 'x_max': 'dirichlet',
        'y_min': 'dirichlet', 'y_max': 'dirichlet',
        'z_min': 'dirichlet', 'z_max': 'dirichlet'
    }
)

# Create physics domains
nuclear_domain = NuclearDomain(domain)
thermal_domain = ThermalDomain(domain)

# Initialize domains
nuclear_domain.initialize({
    'reactions': ['d-d'],
    'mechanisms': ['electron_screening', 'coherent_tunneling'],
    'initial_temperature': 300.0,
    'densities': {'d': 1.0e28}
})

thermal_domain.initialize({
    'initial_temperature': 300.0,
    'thermal_conductivity': 10.0,
    'heat_capacity': 500.0,
    'density': 1000.0
})

# Create domain manager
manager = PhysicsDomainManager()

# Register domains
manager.register_domain(nuclear_domain)
manager.register_domain(thermal_domain)

# Create and register couplers
nuclear_to_thermal = DomainCoupler("nuclear", "thermal")
nuclear_to_thermal.add_variable_mapping("power_density", "heat_source")
manager.register_coupler(nuclear_to_thermal)

thermal_to_nuclear = DomainCoupler("thermal", "nuclear")
thermal_to_nuclear.add_variable_mapping("temperature", "temperature")
manager.register_coupler(thermal_to_nuclear)

# Run simulation
simulation_time = 0.01  # seconds
dt = 1.0e-6            # time step
steps = int(simulation_time / dt)

for i in range(steps):
    manager.advance(dt)
```

## Domain Coupler

The `DomainCoupler` class manages data exchange between physics domains.

### Key Methods

| Method | Description | Parameters |
|--------|-------------|------------|
| `add_variable_mapping(source_var, target_var, transformation)` | Add mapping between source and target variables | `source_var`: str - Source variable name<br>`target_var`: str - Target variable name<br>`transformation`: Optional[Callable] - Optional transformation function |
| `exchange_data(manager)` | Exchange data between domains | `manager`: PhysicsDomainManager - Domain manager instance |

## REST API Endpoints

The API provides endpoints for running and managing multi-physics simulations.

### POST /api/multi-physics/simulations

Start a new multi-physics coupled simulation.

#### Request Body

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

#### Response

```json
{
  "simulation_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "status": "pending",
  "message": "Simulation started in the background",
  "estimated_duration": 10.0
}
```

### GET /api/multi-physics/simulations/{simulation_id}/status

Get the status of a running simulation.

#### Response

```json
{
  "simulation_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "status": "running",
  "progress": 45.5,
  "current_time": 0.00455,
  "message": "Simulation in progress"
}
```

### GET /api/multi-physics/simulations/{simulation_id}/results

Get the results of a completed simulation.

#### Response

```json
{
  "simulation_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "status": "completed",
  "times": [0.0, 0.000001, 0.000002, /* ... */],
  "max_temperatures": [300.0, 300.1, 300.2, /* ... */],
  "mean_reaction_rates": [1.0e12, 1.1e12, 1.2e12, /* ... */],
  "final_max_temperature": 350.5,
  "elapsed_time": 12.3,
  "step_count": 10000
}
```

### GET /api/multi-physics/simulations

List all simulations with their current status.

#### Response

```json
[
  {
    "simulation_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "status": "completed",
    "progress": 100.0,
    "current_time": 0.01,
    "message": null
  },
  {
    "simulation_id": "4fa85f64-5717-4562-b3fc-2c963f66afa7",
    "status": "running",
    "progress": 23.5,
    "current_time": 0.00235,
    "message": "Simulation in progress"
  }
]
```

### DELETE /api/multi-physics/simulations/{simulation_id}

Delete a simulation and its results.

#### Response

```json
{
  "status": "success",
  "message": "Simulation 3fa85f64-5717-4562-b3fc-2c963f66afa6 deleted"
}
``` 