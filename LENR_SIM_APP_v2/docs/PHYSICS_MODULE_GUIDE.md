# Physics Module Developer Guide

**Version:** 0.2.1-beta  
**Last Updated:** January 2026

---

## Overview

This guide provides developers with a comprehensive understanding of the physics modules in the LENR Simulation Platform. It covers module dependencies, key functions, and how to extend the physics calculations.

---

## Module Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PHYSICS LAYER ARCHITECTURE                          │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                           API LAYER (routers/)                               │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌────────────────────┐   │
│  │ physics_simulation  │  │ unified_simulation  │  │ bubble_simulation  │   │
│  │      _router.py     │  │      .py            │  │      .py           │   │
│  └──────────┬──────────┘  └──────────┬──────────┘  └─────────┬──────────┘   │
└─────────────┼────────────────────────┼───────────────────────┼──────────────┘
              │                        │                       │
              ▼                        ▼                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PHYSICS ENGINE LAYER                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    unified_lenr_model.py                             │    │
│  │            (Main orchestrator for LENR simulations)                  │    │
│  └──────────────────────────────┬──────────────────────────────────────┘    │
│                                 │                                           │
│         ┌───────────────────────┼───────────────────────┐                   │
│         │                       │                       │                   │
│         ▼                       ▼                       ▼                   │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────────────┐          │
│  │ bubble_      │      │ hydrogen_    │      │ quantum_effects_ │          │
│  │ lattice_     │      │ flux_model   │      │ solver.py        │          │
│  │ interaction  │      │ .py          │      │                  │          │
│  └──────┬───────┘      └──────┬───────┘      └────────┬─────────┘          │
│         │                     │                       │                     │
└─────────┼─────────────────────┼───────────────────────┼─────────────────────┘
          │                     │                       │
          ▼                     ▼                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CORE PHYSICS LAYER                                   │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                      core_constants.py                                │   │
│  │        (CODATA 2018 constants, utility functions)                     │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│           ▲               ▲               ▲               ▲                 │
│           │               │               │               │                 │
│  ┌────────┴───────┐ ┌─────┴──────┐ ┌──────┴─────┐ ┌───────┴──────┐         │
│  │ wkb_tunneling  │ │ electron_  │ │ casimir_   │ │ reaction_    │         │
│  │ .py            │ │ screening  │ │ forces.py  │ │ rates.py     │         │
│  └────────────────┘ │ .py        │ └────────────┘ └──────────────┘         │
│                     └────────────┘                                          │
│  ┌────────────────┐ ┌────────────┐ ┌────────────┐ ┌──────────────┐         │
│  │ quantum_       │ │ bubble_    │ │ rydberg_   │ │ phonon_      │         │
│  │ tunneling.py   │ │ collapse   │ │ matter.py  │ │ interactions │         │
│  └────────────────┘ │ .py        │ └────────────┘ │ .py          │         │
│                     └────────────┘                └──────────────┘         │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Module Descriptions

### Core Layer (`backend/app/physics/`)

#### core_constants.py
**Purpose:** Central repository for all physical constants and utility functions.

**Key Contents:**
- CODATA 2018 fundamental constants (c, ℏ, e, ε₀, etc.)
- Particle masses (electron, proton, neutron, deuteron)
- Energy conversion factors (eV ↔ J, keV ↔ J)
- Nuclear parameters (R₀, S-factors, Q-values)
- Material properties dataclass

**Key Functions:**
```python
def reduced_mass(m1: float, m2: float) -> float
def sommerfeld_parameter(z1: int, z2: int, energy_kev: float, mu_kg: float) -> float
def coulomb_barrier(z1: int, z2: int, r_fm: float = None) -> float
def gamow_energy(z1: int, z2: int, mu_kg: float) -> float
def thermal_energy(temperature_k: float) -> float
```

**Dependencies:** numpy

---

#### wkb_tunneling.py
**Purpose:** WKB approximation for quantum tunneling calculations.

**Key Class:** `WKBTunnelingCalculator`

**Key Methods:**
```python
def calculate_tunneling_probability(
    z1, z2, a1, a2, energy_kev, 
    potential_type='coulomb',
    screening_energy_ev=0.0,
    temperature_k=300.0,
    material=None
) -> TunnelingResult
```

**Potential Models:**
- `coulomb`: Pure Coulomb potential
- `screened`: Yukawa (screened Coulomb)
- `woods_saxon`: Nuclear + Coulomb

**Dependencies:** core_constants, numpy, scipy.integrate

---

#### electron_screening.py
**Purpose:** Electron screening effects in condensed matter.

**Key Functions:**
```python
def calculate_screening_potential(
    electron_density, work_function, temperature, 
    model='debye', material=None
) -> float  # Returns U_e in eV

def calculate_enhancement_factor(
    z1, z2, screening_potential, energy, reduced_mass_amu
) -> float  # Returns enhancement factor

def get_material_screening(material, temperature) -> Dict
```

**Models:**
- `debye`: Debye-Hückel (classical)
- `thomas_fermi`: Thomas-Fermi (quantum degenerate)
- `ichimaru`: Ichimaru (dense plasma)
- `experimental`: Lookup from experimental data

**Dependencies:** core_constants, numpy

---

#### casimir_forces.py
**Purpose:** Casimir force calculations for nanoscale phenomena.

**Key Functions:**
```python
def calculate_casimir_force(distance, area, temperature=300.0, ...) -> float  # Newtons
def calculate_casimir_energy(distance, area, temperature=300.0, ...) -> float  # Joules
def calculate_casimir_pressure(distance, temperature=300.0, ...) -> float  # Pascals
def calculate_casimir_force_sphere_plate(radius, distance, ...) -> float
def calculate_casimir_effect_in_lattice(lattice_constant, ...) -> Dict
```

**Dependencies:** numpy, logging

---

#### quantum_tunneling.py
**Purpose:** Extended tunneling calculations with caching and optimization.

**Key Classes:**
- `TunnelingParameters`: Configuration dataclass
- Caching system for repeated calculations

**Key Functions:**
```python
def calculate_advanced_tunneling(params: TunnelingParameters) -> Dict
def calculate_temperature_pressure_dependence(...) -> Dict
def calculate_gamow_factor(z1, z2, reduced_mass, energy) -> float
def calculate_enhanced_tunneling(...) -> float
def calculate_fusion_rate(...) -> float
```

**Dependencies:** core_constants, numpy, scipy

---

#### reaction_rates.py
**Purpose:** Fusion reaction rate calculations with statistical mechanics.

**Key Classes:**
- `EnhancementFactors`: Decomposed enhancement (screening, coherence, field, phonon)
- `StatisticalReactionRateResult`: Comprehensive result with uncertainties

**Key Functions:**
```python
def calculate_gamow_energy(z1, z2, reduced_mass_amu) -> float  # keV
def tunneling_cross_section(energy_keV, gamow_energy_keV, s_factor) -> float  # barns
def thermal_average_cross_section(temperature_keV, ...) -> Tuple[float, float]
def statistical_reaction_rate(...) -> StatisticalReactionRateResult
```

**Dependencies:** core_constants, numpy, scipy, physics.optimizations

---

#### bubble_collapse.py
**Purpose:** Cavitation bubble dynamics and sonofusion.

**Key Functions:**
```python
def calculate_rayleigh_collapse_time(radius, ambient_pressure, density) -> float
def calculate_collapse_temperature(r_init, r_min, T_init, gamma) -> float
def calculate_collapse_pressure(r_init, r_min, P_init, gamma) -> float
def calculate_shock_wave_energy(...) -> float
def calculate_compression_enhancement(...) -> Dict
def simulate_bubble_dynamics(...) -> Dict  # Full Rayleigh-Plesset simulation
```

**Dependencies:** numpy, scipy

---

### Engine Layer (`backend/app/physics_engine/`)

#### unified_lenr_model.py
**Purpose:** Main orchestrator integrating all physics mechanisms.

**Key Capabilities:**
- Combines bubble dynamics with lattice interactions
- Calculates total enhancement from all mechanisms
- Provides unified simulation interface

---

#### bubble_lattice_interaction.py
**Purpose:** Coupling between bubble collapse and lattice physics.

**Key Features:**
- Proton phase transitions (FREE → SCREENED → CAPTURE_READY → NUCLEAR)
- Enhancement factor timeline during collapse
- Lattice deformation effects

---

#### hydrogen_flux_model.py
**Purpose:** Hydrogen diffusion and loading in metal lattices.

**Key Calculations:**
- Fick's law diffusion with temperature dependence
- Trapping and detrapping at lattice defects
- Loading ratio evolution

---

## Usage Examples

### Basic Tunneling Calculation

```python
from app.physics.wkb_tunneling import WKBTunnelingCalculator

calc = WKBTunnelingCalculator()

# D-D fusion at 1 keV with palladium screening
result = calc.calculate_tunneling_probability(
    z1=1, z2=1,
    a1=2, a2=2,
    energy_kev=1.0,
    potential_type='screened',
    material='palladium',
    temperature_k=300.0
)

print(f"Tunneling probability: {result.probability:.2e}")
print(f"Enhancement factor: {result.enhancement_factor:.2e}")
```

### Reaction Rate with Statistics

```python
from app.physics.reaction_rates import statistical_reaction_rate

result = statistical_reaction_rate(
    temperature_keV=0.1,
    density_m3=1e28,
    z1=1, z2=1,
    reduced_mass_amu=1.0,
    screening_potential_eV=800,
    coherence_factor=10,
    run_monte_carlo=True
)

print(f"Rate: {result.rate_per_m3_s:.2e} ± {result.rate_uncertainty:.2e}")
print(f"Enhancement: {result.enhancement_factors.total:.2e}")
```

### Bubble Collapse Simulation

```python
from app.physics.bubble_collapse import simulate_bubble_dynamics

results = simulate_bubble_dynamics(
    initial_radius=10e-6,  # 10 μm
    driving_pressure_amplitude=1.5e5,  # 1.5 bar
    frequency=20000,  # 20 kHz
    time_steps=1000,
    total_cycles=2.0
)

print(f"Maximum temperature: {max(results['temperature']):.2e} K")
print(f"Minimum radius: {min(results['radius']):.2e} m")
```

---

## Extending the Physics

### Adding a New Potential Model

1. Add method to `WKBTunnelingCalculator`:

```python
def _my_new_potential(self, r: float, z1: int, z2: int, **kwargs) -> float:
    """My new potential model."""
    # Calculate potential energy in Joules
    return V_joules
```

2. Register in `__init__`:

```python
self.potential_models['my_new'] = self._my_new_potential
```

3. Use in calculations:

```python
result = calc.calculate_tunneling_probability(
    ...,
    potential_type='my_new'
)
```

### Adding Material Properties

1. Edit `core_constants.py`:

```python
MATERIALS['new_material'] = MaterialProperties(
    name='New Material',
    symbol='Nm',
    atomic_number=XX,
    # ... other properties
)

SCREENING_POTENTIALS['new_material'] = XXX  # eV
```

---

## Testing

### Running Physics Tests

```bash
cd backend
pytest app/tests/test_wkb_tunneling.py -v
pytest app/tests/test_enhancement_factors.py -v
pytest app/tests/test_bubble_collapse.py -v
```

### Verification Tests

Each physics module has corresponding tests that verify:
- Dimensional consistency
- Known analytical limits
- Numerical stability
- Edge cases

---

## Performance Considerations

1. **Caching:** `quantum_tunneling.py` implements LRU caching for repeated calculations
2. **Vectorization:** Use numpy vectorized operations where possible
3. **Parallel Processing:** `reaction_rates.py` supports multi-core calculations
4. **Memory:** Large simulations should use generators or chunked processing

---

## References

See [PHYSICS_EQUATION_VERIFICATION.md](PHYSICS_EQUATION_VERIFICATION.md) for complete equation references and verification status.

---

**Document maintained by:** LENR Simulation Platform Development Team  
**Contact:** diadon@conscious.energy
