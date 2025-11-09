# LENR Simulation App API Documentation

## Overview

The LENR Simulation App API provides a comprehensive set of endpoints for simulating and analyzing Low Energy Nuclear Reaction (LENR) phenomena. The API is organized into several modules, each focusing on different aspects of LENR physics.

## Base URL

```
http://localhost:8000/api
```

## Authentication

Currently, the API does not require authentication for local development. In production, authentication will be implemented.

## API Modules

### 1. Quantum Tunneling API

Endpoints for calculating quantum tunneling probabilities with advanced models.

#### `POST /physics/quantum-tunneling`

Calculate quantum tunneling probability with advanced models, including electron screening, phonon assistance, and multi-site effects.

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
    "energy_eV": [...],
    "base_probability": [...],
    "enhanced_probability": [...],
    "energy_distribution": [...],
    "boltzmann_factors": [...]
  },
  "metadata": {
    "model_version": "2.0.0",
    "model_type": "wkb",
    "potential_type": "yukawa",
    "temperature_K": 300.0,
    "barrier_width_m": 1.5e-10,
    "enhancements_applied": {
      "electron_screening": true,
      "phonon_assisted": true,
      "coherent_multi_site": true
    },
    "processing_time_ms": 123.45
  }
}
```

#### `POST /physics/tunneling-temperature-pressure`

Analyze how tunneling probability changes with temperature and pressure.

**Request Body:**
```json
{
  "base_parameters": {
    "temperature": 300.0,
    "potential_type": "coulomb",
    "barrier_width": 1e-10,
    "energy_range": [0.01, 10.0],
    "energy_points": 50,
    "electron_screening": true,
    "potential_params": {
      "Z1": 1,
      "Z2": 1
    }
  },
  "temperature_min": 100.0,
  "temperature_max": 1000.0,
  "include_pressure": true,
  "pressure_min": 1e5,
  "pressure_max": 1e9,
  "points": 10
}
```

**Response:**
```json
{
  "temperature_dependence": {
    "temperature_K": [...],
    "tunneling_probability": [...],
    "enhancement_factor": [...]
  },
  "pressure_dependence": {
    "pressure_Pa": [...],
    "tunneling_probability": [...],
    "enhancement_factor": [...]
  },
  "metadata": {
    "base_temperature": 300.0,
    "temperature_range": [100.0, 1000.0],
    "pressure_range": [1e5, 1e9],
    "processing_time_ms": 234.56
  }
}
```

#### `GET /physics/tunneling-presets`

Get predefined parameter presets for different materials and scenarios.

**Response:**
```json
{
  "presets": {
    "palladium_deuterium": {
      "name": "Palladium-Deuterium System",
      "description": "Typical parameters for D in Pd lattice",
      "parameters": {
        "temperature": 300.0,
        "potential_type": "yukawa",
        "barrier_width": 1.5e-10,
        "z1": 1,
        "z2": 1,
        "electron_screening": true,
        "screening_length": 2.5e-11,
        "phonon_assisted": true,
        "lattice_sites": 3,
        "model_type": "wkb"
      }
    },
    "nickel_hydrogen": {
      "name": "Nickel-Hydrogen System",
      "description": "Typical parameters for H in Ni lattice",
      "parameters": { ... }
    },
    ...
  }
}
```

### 2. Phonon Mode API

Endpoints for calculating lattice dynamics and phonon-related properties.

#### `POST /physics/phonon-dispersion`

Calculate phonon dispersion relation along a specific direction in the Brillouin zone.

**Request Body:**
```json
{
  "lattice_params": {
    "lattice_type": "fcc",
    "lattice_constant": 3.89e-10,
    "dimensions": [10, 10, 10],
    "debye_temperature": 275.0,
    "has_loading": true,
    "loading_element": "D",
    "loading_ratio": 0.8,
    "temperature": 300.0
  },
  "direction": "100"
}
```

**Response:**
```json
{
  "wavenumbers": [...],
  "acoustic_frequencies": [...],
  "optical_frequencies": [...],
  "direction": "100",
  "metadata": {
    "lattice_type": "fcc",
    "lattice_constant": 3.89e-10,
    "spring_constant": 20.0,
    "atomic_mass": 106.42,
    "anharmonicity": 0.05,
    "processing_time_ms": 345.67
  }
}
```

#### `POST /physics/phonon-density-of-states`

Calculate phonon density of states (DOS) for a given lattice structure.

**Request Body:**
```json
{
  "lattice_type": "fcc",
  "lattice_constant": 3.89e-10,
  "debye_temperature": 275.0,
  "has_loading": true,
  "loading_element": "D",
  "loading_ratio": 0.8,
  "temperature": 300.0
}
```

**Response:**
```json
{
  "frequencies": [...],
  "density_of_states": [...],
  "debye_model": [...],
  "metadata": {
    "lattice_type": "fcc",
    "debye_temperature": 275.0,
    "debye_frequency": 5.73e12,
    "has_loading": true,
    "loading_element": "D",
    "loading_ratio": 0.8,
    "processing_time_ms": 123.45
  }
}
```

#### `POST /physics/thermal-properties`

Calculate thermal properties based on phonon spectrum.

**Request Body:**
```json
{
  "lattice_type": "fcc",
  "lattice_constant": 3.89e-10,
  "debye_temperature": 275.0,
  "temperature": 300.0,
  "has_loading": true,
  "loading_element": "D",
  "loading_ratio": 0.8
}
```

**Response:**
```json
{
  "molar_heat_capacity": 24.94,
  "volumetric_heat_capacity": 2.78e6,
  "thermal_conductivity": 71.8,
  "thermal_diffusivity": 2.58e-5,
  "phonon_velocity": 3245.0,
  "mean_free_path": 3.42e-8,
  "gruneisen_parameter": 2.5,
  "debye_function": 2.98,
  "metadata": {
    "temperature": 300.0,
    "debye_temperature": 275.0,
    "reduced_temperature": 0.9167,
    "lattice_type": "fcc",
    "has_loading": true,
    "loading_ratio": 0.8,
    "processing_time_ms": 89.12
  }
}
```

#### `POST /physics/phonon-nuclear-coupling`

Calculate coupling between phonons and nuclear processes.

**Request Body:**
```json
{
  "lattice_params": {
    "lattice_type": "fcc",
    "lattice_constant": 3.89e-10,
    "debye_temperature": 275.0,
    "temperature": 300.0,
    "has_loading": true,
    "loading_element": "D",
    "loading_ratio": 0.8
  },
  "energy_transfer_ev": 0.005
}
```

**Response:**
```json
{
  "energy_transfer_ev": 0.005,
  "frequency": 1.21e12,
  "phonon_occupation": 2.18,
  "momentum_transfer_evc": 1.24e-25,
  "recoil_energy_ev": 3.45e-7,
  "transfer_probability": 0.0238,
  "debye_waller_factor": 0.992,
  "enhancement_factor": 5.12e-11,
  "metadata": {
    "temperature": 300.0,
    "debye_temperature": 275.0,
    "target_element": "D",
    "target_mass_amu": 2.014,
    "processing_time_ms": 76.54
  }
}
```

#### `GET /physics/lattice-presets`

Get predefined lattice parameter presets for common LENR materials.

**Response:**
```json
{
  "presets": {
    "pd_d": {
      "name": "Palladium-Deuterium",
      "description": "Typical parameters for deuterium-loaded palladium",
      "parameters": {
        "lattice_type": "fcc",
        "lattice_constant": 3.89e-10,
        "debye_temperature": 275.0,
        "has_loading": true,
        "loading_element": "D",
        "loading_ratio": 0.8,
        "loading_sites": "octahedral",
        "temperature": 300.0
      }
    },
    "ni_h": {
      "name": "Nickel-Hydrogen",
      "description": "Typical parameters for hydrogen-loaded nickel",
      "parameters": { ... }
    },
    ...
  }
}
```

### 3. Fusion Rate API

Endpoints for calculating fusion reaction rates with various enhancement mechanisms.

#### `POST /physics/fusion-rate`

Calculate fusion reaction rate for a specific reaction.

**Request Body:**
```json
{
  "reaction_name": "d-d",
  "temperature": 300.0,
  "density1": 6.0e28,
  "density2": 6.0e28,
  "mechanisms": ["electron_screening", "quantum_coherence", "lattice_confinement"]
}
```

**Response:**
```json
{
  "reaction_rate": 1.23e-15,
  "power_density": 4.56e-12,
  "enhancement_factor": 1.23e15,
  "base_rate": 1.0e-30,
  "mechanism_contributions": {
    "electron_screening": 2.34e2,
    "quantum_coherence": 1.23e5,
    "lattice_confinement": 4.56e7
  },
  "metadata": {
    "reaction": "d-d",
    "temperature": 300.0,
    "densities": [6.0e28, 6.0e28],
    "mechanisms_included": ["electron_screening", "quantum_coherence", "lattice_confinement"],
    "processing_time_ms": 56.78
  }
}
```

## Error Handling

All API endpoints follow a consistent error format:

```json
{
  "detail": "Error message describing what went wrong"
}
```

Common HTTP status codes:
- 400: Bad Request - Invalid input parameters
- 404: Not Found - Resource not found
- 500: Internal Server Error - Unexpected server error

## Rate Limiting

Currently, there are no rate limits implemented for local development. In production, rate limiting will be applied to prevent abuse.

## Versioning

The current API version is v2. API versions are not included in the URL path but are tracked in response metadata.

## Examples

### Calculate Tunneling for Deuterium in Palladium

```python
import requests
import json

# Define the request parameters
data = {
  "temperature": 300.0,
  "potential_type": "yukawa",
  "barrier_width": 1.5e-10,
  "z1": 1,
  "z2": 1,
  "energy_min_ev": 0.01,
  "energy_max_ev": 10.0,
  "energy_points": 100,
  "electron_screening": True,
  "screening_length": 2.5e-11,
  "phonon_assisted": True,
  "lattice_sites": 3,
  "model_type": "wkb"
}

# Send the request
response = requests.post(
    "http://localhost:8000/api/physics/quantum-tunneling",
    json=data
)

# Process the response
if response.status_code == 200:
    result = response.json()
    print(f"Tunneling probability: {result['tunneling_probability']}")
    print(f"Enhancement factor: {result['total_enhancement_factor']}")
else:
    print(f"Error: {response.json()['detail']}")
```

### Calculate Phonon Dispersion in Palladium

```python
import requests
import json
import matplotlib.pyplot as plt
import numpy as np

# Define the request parameters
data = {
  "lattice_params": {
    "lattice_type": "fcc",
    "lattice_constant": 3.89e-10,
    "dimensions": [10, 10, 10],
    "debye_temperature": 275.0,
    "has_loading": True,
    "loading_element": "D",
    "loading_ratio": 0.8,
    "temperature": 300.0
  },
  "direction": "100"
}

# Send the request
response = requests.post(
    "http://localhost:8000/api/physics/phonon-dispersion",
    json=data
)

# Process the response and plot the results
if response.status_code == 200:
    result = response.json()
    q_values = np.array(result["wavenumbers"])
    frequencies = np.array(result["acoustic_frequencies"])
    
    plt.figure(figsize=(10, 6))
    plt.plot(q_values, frequencies[:,0], 'r-', label='Transverse 1')
    plt.plot(q_values, frequencies[:,1], 'g-', label='Transverse 2')
    plt.plot(q_values, frequencies[:,2], 'b-', label='Longitudinal')
    plt.xlabel('Wavenumber [1/m]')
    plt.ylabel('Frequency [Hz]')
    plt.title(f'Phonon Dispersion in [100] Direction')
    plt.legend()
    plt.grid(True)
    plt.show()
else:
    print(f"Error: {response.json()['detail']}")
``` 