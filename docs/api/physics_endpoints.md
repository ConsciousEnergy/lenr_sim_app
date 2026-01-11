# Physics API Endpoints Reference

## Overview

The Physics API endpoints provide access to core physics calculations and models for LENR simulations. These endpoints handle the underlying physics computations, including nuclear reaction rates, energy production, and various enhancement mechanisms.

## Nuclear Reaction Endpoints

### POST /api/physics/reaction-rate

Calculate the reaction rate for a given nuclear reaction.

#### Request

```json
{
  "reaction": "d-d",
  "temperature": 300.0,
  "density1": 1.0e28,
  "density2": 1.0e28,
  "mechanisms": ["electron_screening", "coherent_tunneling"],
  "parameters": {
    "screening_factor": 5.0,
    "coherence_factor": 10.0
  }
}
```

#### Parameters

| Name | Type | Description | Required |
|------|------|-------------|----------|
| `reaction` | string | Nuclear reaction identifier (e.g., 'd-d', 'p-B11', 'd-t') | Yes |
| `temperature` | number | Temperature in Kelvin | Yes |
| `density1` | number | Density of first reactant species in m⁻³ | Yes |
| `density2` | number | Density of second reactant species in m⁻³ | Yes |
| `mechanisms` | array | List of enhancement mechanisms to include | No |
| `parameters` | object | Additional parameters for specific mechanisms | No |

#### Response

```json
{
  "reaction": "d-d",
  "reaction_rate_m3_s": 1.234e-28,
  "power_density_W_m3": 5.678e-15,
  "enhancements": {
    "electron_screening": 10.5,
    "coherent_tunneling": 3.2
  },
  "temperature": 300.0,
  "cross_section_m2": 6.789e-32
}
```

### GET /api/physics/reactions

Get a list of available nuclear reactions.

#### Response

```json
{
  "reactions": [
    {
      "id": "d-d",
      "name": "Deuterium-Deuterium",
      "products": ["He-3", "n"],
      "energy_MeV": 3.27,
      "branching_ratio": 0.5
    },
    {
      "id": "d-d_2",
      "name": "Deuterium-Deuterium (second branch)",
      "products": ["t", "p"],
      "energy_MeV": 4.03,
      "branching_ratio": 0.5
    },
    {
      "id": "p-B11",
      "name": "Proton-Boron",
      "products": ["He-4", "He-4", "He-4"],
      "energy_MeV": 8.7,
      "branching_ratio": 1.0
    }
  ]
}
```

### GET /api/physics/mechanisms

Get a list of available enhancement mechanisms.

#### Response

```json
{
  "mechanisms": [
    {
      "id": "electron_screening",
      "name": "Electron Screening",
      "description": "Enhanced tunneling due to electron shielding of nuclear repulsion",
      "parameters": [
        {
          "name": "screening_factor",
          "type": "number",
          "default": 1.0,
          "description": "Enhancement factor for electron screening"
        }
      ]
    },
    {
      "id": "coherent_tunneling",
      "name": "Coherent Tunneling",
      "description": "Enhanced tunneling due to coherent quantum effects",
      "parameters": [
        {
          "name": "coherence_factor",
          "type": "number",
          "default": 1.0,
          "description": "Enhancement factor for coherent effects"
        }
      ]
    }
  ]
}
```

## Thermal Physics Endpoints

### POST /api/physics/thermal-diffusion

Solve a thermal diffusion problem with specified parameters.

#### Request

```json
{
  "domain_size": [0.01, 0.01, 0.01],
  "resolution": [20, 20, 20],
  "thermal_conductivity": 10.0,
  "heat_capacity": 500.0,
  "density": 1000.0,
  "initial_temperature": 300.0,
  "heat_sources": [
    {
      "position": [0.005, 0.005, 0.005],
      "radius": 0.002,
      "power": 1000.0
    }
  ],
  "boundary_conditions": {
    "x_min": {"type": "dirichlet", "value": 300.0},
    "x_max": {"type": "dirichlet", "value": 300.0},
    "y_min": {"type": "dirichlet", "value": 300.0},
    "y_max": {"type": "dirichlet", "value": 300.0},
    "z_min": {"type": "dirichlet", "value": 300.0},
    "z_max": {"type": "dirichlet", "value": 300.0}
  },
  "simulation_time": 0.1,
  "time_steps": 100
}
```

#### Parameters

| Name | Type | Description | Required |
|------|------|-------------|----------|
| `domain_size` | array | Physical dimensions of the domain in meters [x, y, z] | Yes |
| `resolution` | array | Number of grid points in each dimension [nx, ny, nz] | Yes |
| `thermal_conductivity` | number | Thermal conductivity in W/(m*K) | Yes |
| `heat_capacity` | number | Heat capacity in J/(kg*K) | Yes |
| `density` | number | Material density in kg/m³ | Yes |
| `initial_temperature` | number | Initial temperature in Kelvin | Yes |
| `heat_sources` | array | List of heat sources in the domain | No |
| `boundary_conditions` | object | Boundary conditions for each face of the domain | Yes |
| `simulation_time` | number | Total simulation time in seconds | Yes |
| `time_steps` | number | Number of time steps to simulate | Yes |

#### Response

```json
{
  "final_temperature": {
    "min": 300.0,
    "max": 345.6,
    "mean": 312.3,
    "data": [/* 3D array of temperature values */]
  },
  "temperature_evolution": [
    {
      "time": 0.0,
      "max_temperature": 300.0,
      "mean_temperature": 300.0
    },
    {
      "time": 0.001,
      "max_temperature": 310.5,
      "mean_temperature": 301.2
    },
    /* Additional time points */
  ],
  "simulation_parameters": {
    "domain_size": [0.01, 0.01, 0.01],
    "resolution": [20, 20, 20],
    "time_step": 0.001,
    "stable_time_step": 0.00125
  }
}
```

### POST /api/physics/heat-flow

Calculate steady-state heat flow through a material with specified properties.

#### Request

```json
{
  "domain_size": [0.01, 0.01, 0.01],
  "resolution": [20, 20, 20],
  "thermal_conductivity": 10.0,
  "temperature_gradient": {
    "direction": "x",
    "delta_t": 50.0
  }
}
```

#### Parameters

| Name | Type | Description | Required |
|------|------|-------------|----------|
| `domain_size` | array | Physical dimensions of the domain in meters [x, y, z] | Yes |
| `resolution` | array | Number of grid points in each dimension [nx, ny, nz] | Yes |
| `thermal_conductivity` | number or object | Thermal conductivity in W/(m*K), can be scalar or field | Yes |
| `temperature_gradient` | object | Temperature gradient to apply across the domain | Yes |

#### Response

```json
{
  "heat_flow": 5.0,  // W/m²
  "temperature_field": {/* 3D array of temperature values */},
  "heat_flux_field": {/* 3D array of heat flux vector components */}
}
```

## Material Properties Endpoints

### GET /api/physics/materials

Get a list of available predefined materials with their properties.

#### Response

```json
{
  "materials": [
    {
      "id": "palladium",
      "name": "Palladium",
      "thermal_conductivity": 71.8,  // W/(m*K)
      "heat_capacity": 240.0,        // J/(kg*K)
      "density": 12023.0,            // kg/m³
      "melting_point": 1828.0,       // K
      "electrical_resistivity": 1.05e-7  // Ω·m
    },
    {
      "id": "nickel",
      "name": "Nickel",
      "thermal_conductivity": 90.9,
      "heat_capacity": 444.0,
      "density": 8908.0,
      "melting_point": 1728.0,
      "electrical_resistivity": 6.99e-8
    }
  ]
}
```

### GET /api/physics/materials/{material_id}

Get detailed properties for a specific material.

#### Response

```json
{
  "id": "palladium",
  "name": "Palladium",
  "properties": {
    "thermal": {
      "thermal_conductivity": 71.8,  // W/(m*K)
      "heat_capacity": 240.0,        // J/(kg*K)
      "thermal_diffusivity": 2.48e-5,  // m²/s
      "thermal_expansion": 11.8e-6    // K⁻¹
    },
    "mechanical": {
      "density": 12023.0,            // kg/m³
      "youngs_modulus": 121.0e9,     // Pa
      "poissons_ratio": 0.39,
      "bulk_modulus": 180.0e9,       // Pa
      "shear_modulus": 44.0e9        // Pa
    },
    "electrical": {
      "electrical_resistivity": 1.05e-7,  // Ω·m
      "work_function": 5.22           // eV
    },
    "nuclear": {
      "neutron_cross_section": 6.9,   // barns
      "hydrogen_solubility": 0.7      // H/Pd ratio
    }
  },
  "temperature_dependent_properties": {
    "thermal_conductivity": [
      {"temperature": 300.0, "value": 71.8},
      {"temperature": 600.0, "value": 69.2},
      {"temperature": 900.0, "value": 66.5}
    ],
    "heat_capacity": [
      {"temperature": 300.0, "value": 240.0},
      {"temperature": 600.0, "value": 260.0},
      {"temperature": 900.0, "value": 280.0}
    ]
  }
}
```

## Cross-Section Data Endpoints

### GET /api/physics/cross-sections/{reaction}

Get cross-section data for a specific nuclear reaction as a function of energy.

#### Response

```json
{
  "reaction": "d-d",
  "energies_keV": [1.0, 2.0, 5.0, 10.0, 20.0, 50.0, 100.0],
  "cross_sections_barn": [1.0e-7, 1.0e-6, 1.0e-4, 0.001, 0.01, 0.1, 0.5],
  "s_factors_keV_barn": [50.0, 52.0, 54.0, 56.0, 58.0, 60.0, 62.0],
  "data_source": "ENDF/B-VIII.0",
  "reference": "M.B. Chadwick et al., Nuclear Data Sheets, vol. 112, pp. 2887-2996 (2011)"
}
```

### POST /api/physics/maxwell-averaged-cross-section

Calculate Maxwell-averaged cross-section for a nuclear reaction at a given temperature.

#### Request

```json
{
  "reaction": "d-d",
  "temperature": 300.0  // K
}
```

#### Parameters

| Name | Type | Description | Required |
|------|------|-------------|----------|
| `reaction` | string | Nuclear reaction identifier (e.g., 'd-d', 'p-B11', 'd-t') | Yes |
| `temperature` | number | Temperature in Kelvin | Yes |

#### Response

```json
{
  "reaction": "d-d",
  "temperature": 300.0,  // K
  "maxwell_averaged_cross_section_m2": 1.234e-32,
  "reactivity_m3_s": 5.678e-28
}
```

## Error Responses

All endpoints may return the following error responses:

### 400 Bad Request

```json
{
  "detail": "Invalid parameter: temperature must be positive"
}
```

### 404 Not Found

```json
{
  "detail": "Reaction 'x-y' not found"
}
```

### 500 Internal Server Error

```json
{
  "detail": "Internal server error"
}
``` 