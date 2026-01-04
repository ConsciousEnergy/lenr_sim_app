# Physics Modules Documentation

## Overview

The LENR Simulation App implements a comprehensive set of physics models for simulating Low Energy Nuclear Reactions (LENR). This document provides detailed documentation for each physics module.

## Table of Contents

1. [Quantum Tunneling](#quantum-tunneling)
2. [Electron Screening](#electron-screening)
3. [Phonon Interactions](#phonon-interactions)
4. [Fusion Reactions](#fusion-reactions)
5. [Multi-Physics Coupling](#multi-physics-coupling)
6. [Thermodynamics](#thermodynamics)
7. [Statistical Mechanics](#statistical-mechanics)

## Quantum Tunneling

### Overview

Quantum tunneling is a fundamental mechanism in LENR that allows nuclear reactions to occur at energies below the classical Coulomb barrier. The module implements multiple tunneling models including WKB approximation and numerical solutions.

### Models

#### WKB Approximation

The Wentzel-Kramers-Brillouin (WKB) approximation provides an analytical solution for tunneling probability:

```
P(E) = exp(-2 * integral(sqrt(2*m*(V(x) - E))/hbar) dx)
```

**Parameters:**
- `barrier_width`: Width of the potential barrier (m)
- `potential_type`: Type of potential ("coulomb", "yukawa", "wood_saxon")
- `z1, z2`: Atomic numbers of interacting particles

#### Numerical Solutions

For more accurate results, numerical integration of the Schrödinger equation is available.

### API Endpoints

- `POST /api/physics/quantum-tunneling`: Calculate tunneling probability
- `POST /api/physics/tunneling-temperature-pressure`: Analyze temperature/pressure dependence

### Example

```python
from app.physics.quantum_tunneling import calculate_advanced_tunneling

result = calculate_advanced_tunneling(
    temperature=300.0,
    potential_type="yukawa",
    barrier_width=1.5e-10,
    z1=1, z2=1,
    energy_min_ev=0.01,
    energy_max_ev=10.0,
    electron_screening=True,
    phonon_assisted=True
)

print(f"Tunneling probability: {result['tunneling_probability']}")
print(f"Enhancement factor: {result['total_enhancement_factor']}")
```

### References

- Gamow, G. (1928). "Zur Quantentheorie des Atomkernes"
- WKB approximation theory
- Quantum mechanical tunneling in nuclear physics

## Electron Screening

### Overview

Electron screening reduces the effective Coulomb barrier by screening the nuclear charges. This is a critical enhancement mechanism in LENR.

### Models

#### Thomas-Fermi Screening

The Thomas-Fermi model provides screening length:

```
λ_TF = sqrt(ε₀ * k_B * T / (e² * n_e))
```

#### Debye-Hückel Screening

For plasma-like conditions:

```
λ_D = sqrt(ε₀ * k_B * T / (e² * Σ n_i * Z_i²))
```

### Enhancement Factor

The enhancement factor due to electron screening:

```
f_screen = exp(Z1 * Z2 * e² / (4πε₀ * λ * k_B * T))
```

### API Integration

Electron screening is integrated into:
- Enhancement calculations
- Quantum tunneling calculations
- Material enhancement calculations

### Example

```python
from app.physics.enhanced_fusion import EnhancedFusionCalculator

calculator = EnhancedFusionCalculator()
result = calculator.calculate_enhancement(
    mechanisms=["electron_screening"],
    config={
        "electron_screening": {
            "screening_length": 2.5e-11,
            "screening_type": "thomas_fermi"
        }
    }
)

print(f"Screening enhancement: {result['electron_screening']}")
```

## Phonon Interactions

### Overview

Phonon-assisted tunneling and coherent phonon effects can significantly enhance reaction rates in solid-state LENR systems.

### Models

#### Phonon Dispersion

Calculate phonon dispersion relations for different lattice structures:

```python
from app.physics.phonon_modes import calculate_phonon_dispersion

lattice_params = LatticeParameters(
    lattice_constant=4e-10,
    debye_temperature=300.0,
    material="palladium"
)

dispersion = calculate_phonon_dispersion(lattice_params)
```

#### Phonon-Assisted Tunneling

Phonons can assist tunneling by:
- Providing energy to overcome barriers
- Creating coherent states
- Modifying potential barriers

#### Coherent Phonon Tunneling

When phonons are in phase, they can create coherent enhancement:

```python
from app.physics.phonon_modes import calculate_coherent_phonon_tunneling

enhancement = calculate_coherent_phonon_tunneling(
    lattice_params=lattice_params,
    temperature=300.0,
    frequency_range=(1e12, 1e14)
)
```

### API Endpoints

- `POST /api/physics/phonon-dispersion`: Calculate phonon dispersion
- `POST /api/physics/phonon-density-of-states`: Calculate DOS
- `POST /api/physics/phonon-nuclear-coupling`: Calculate coupling effects

### Lattice Presets

Common materials with pre-configured parameters:
- Palladium
- Nickel
- Titanium
- Custom materials

## Fusion Reactions

### Overview

The fusion reaction module handles various fusion reactions including D-D, D-T, and custom reactions.

### Built-in Reactions

#### Deuterium-Deuterium (D-D)

```
D + D → ³He + n  (Q = 3.27 MeV)
D + D → T + p    (Q = 4.03 MeV)
```

#### Deuterium-Tritium (D-T)

```
D + T → ⁴He + n  (Q = 17.6 MeV)
```

### Custom Reactions

Create custom reactions via API:

```python
custom_reaction = {
    "name": "custom-reaction",
    "reactants": [{"z": 1, "a": 1}, {"z": 1, "a": 1}],
    "products": [{"z": 2, "a": 2}],
    "q_value_mev": 0.5
}
```

### Reaction Rate Calculation

The fusion rate is calculated using:

```
R = n₁ * n₂ * <σv>
```

Where `<σv>` is the thermally averaged cross-section.

### API Endpoints

- `POST /api/physics/calculate/rate`: Calculate reaction rate
- `GET /api/physics/available-reactions`: List available reactions
- `POST /api/physics/reactions/custom`: Create custom reaction

## Multi-Physics Coupling

### Overview

Multi-physics coupling integrates nuclear reactions with thermal transport, electromagnetic fields, and other physical domains.

### Domains

#### Nuclear Domain

- Tracks reaction rates
- Calculates energy release
- Manages species densities

#### Thermal Domain

- Heat conduction
- Temperature evolution
- Thermal properties

#### Electromagnetic Domain

- Electric fields
- Magnetic fields
- Currents

### Coupling Mechanisms

#### Nuclear-Thermal Coupling

Nuclear reactions release energy that heats the material:

```
Q_nuclear = Σ R_i * Q_i
```

Heat conduction:

```
∂T/∂t = (1/(ρ*c_p)) * ∇·(k*∇T) + Q_nuclear/(ρ*c_p)
```

#### Thermal-Nuclear Coupling

Temperature affects reaction rates through:
- Thermal energy distribution
- Material properties
- Enhancement mechanisms

### API Endpoints

- `POST /api/multi-physics/simulations`: Start coupled simulation
- `GET /api/multi-physics/simulations/{id}/status`: Check status
- `GET /api/multi-physics/simulations/{id}/results`: Get results

### Example

```python
simulation_request = {
    "domain_size": [0.01, 0.01, 0.01],
    "resolution": [20, 20, 20],
    "simulation_time": 0.01,
    "time_step": 1e-6,
    "reactions": ["d-d"],
    "mechanisms": ["electron_screening", "coherent_tunneling"],
    "initial_temperature": 300.0,
    "species_densities": {"d": 1.0e28},
    "thermal_conductivity": 10.0,
    "heat_capacity": 500.0
}
```

## Thermodynamics

### Overview

Thermodynamic calculations for energy balance, excess power, and calorimetry.

### Energy Balance

Total energy in the system:

```
E_total = E_kinetic + E_potential + E_thermal + E_nuclear
```

### Excess Power

Excess power calculation:

```
P_excess = P_measured - P_input - P_losses
```

### Calorimetry

Calorimetric analysis for experimental validation.

### API Endpoints

- `POST /api/physics/thermal-properties`: Calculate thermal properties
- Energy balance calculations (integrated in multi-physics)

## Statistical Mechanics

### Overview

Statistical mechanical models for reaction rates and distributions.

### Reaction Rate Theory

Thermally averaged reaction rate:

```
<σv> = ∫ σ(E) * v(E) * f(E) dE
```

Where `f(E)` is the energy distribution (Maxwell-Boltzmann).

### Enhancement Mechanisms

Various enhancement mechanisms are modeled:
- Electron screening
- Phonon assistance
- Coherent tunneling
- Resonance effects
- Material effects

### Parameter Sensitivity

Analyze how parameters affect results:

```python
from app.physics.unified_enhancement import analyze_parameter_sensitivity

sensitivity = analyze_parameter_sensitivity(
    parameter_name="screening_length",
    mechanism="electron_screening",
    min_value=1e-12,
    max_value=1e-10,
    steps=20
)
```

## Best Practices

### Choosing Models

1. **Start Simple:** Use basic models first
2. **Add Complexity:** Gradually add enhancement mechanisms
3. **Validate:** Compare with experimental data when available
4. **Document:** Keep track of parameters used

### Performance Optimization

1. **Use Caching:** Enhancement calculations are cached
2. **Reduce Resolution:** For exploratory runs
3. **Parallel Processing:** Multi-physics simulations use parallelization
4. **Monitor Resources:** Use diagnostics endpoints

### Parameter Selection

1. **Physical Ranges:** Stay within physically reasonable ranges
2. **Literature Values:** Use established values when available
3. **Sensitivity Analysis:** Understand parameter effects
4. **Uncertainty:** Account for uncertainties in results

## References

### Key Papers

1. Gamow, G. (1928). "Zur Quantentheorie des Atomkernes"
2. Thomas-Fermi screening theory
3. Phonon-assisted tunneling in solids
4. Multi-physics coupling in LENR

### Textbooks

- "Nuclear Physics" by Krane
- "Statistical Mechanics" by Pathria
- "Quantum Mechanics" by Griffiths

## Module Structure

```
app/physics/
├── quantum_tunneling.py      # Tunneling calculations
├── enhanced_fusion.py         # Fusion rate calculations
├── unified_enhancement.py     # Enhancement factors
├── phonon_modes.py            # Phonon interactions
├── models.py                  # Data models
└── ...
```

## Contributing

When adding new physics models:

1. Follow existing code structure
2. Add comprehensive tests
3. Document parameters and equations
4. Include references
5. Update this documentation

## Support

For questions about physics models:
- Check API documentation
- Review example code in `backend/app/examples/`
- Consult referenced papers
- Open an issue on GitHub
