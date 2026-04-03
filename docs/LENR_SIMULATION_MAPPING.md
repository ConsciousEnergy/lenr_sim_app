# LENR Framework — Simulation Mapping (RORO)

**Purpose:** Map audited theory into simulation-ready inputs/outputs; avoid double counting.  
**References:** All audit documents in this folder.

---

## 1. Inputs (RORO: Receive an Object)

### 1.1 Material and Geometry

```python
@dataclass
class MaterialInputs:
    n_deuteron: float          # m⁻³, deuteron density
    n_proton: float            # m⁻³, if H system
    loading_ratio: float       # H(Pd) or D/Pd
    defect_density: float      # defects/cm³
    surface_roughness_nm: float  # nm
    grain_size_nm: float       # nm
    dislocation_density: float # /cm³
```

### 1.2 Field and Electrochemical

```python
@dataclass
class FieldInputs:
    delta_V: float             # V, potential drop
    double_layer_width_nm: float  # nm
    field_enhancement_beta: float  # 1–100
    # E_field = beta * delta_V / double_layer_width_nm
```

### 1.3 Screening and Coherence

```python
@dataclass
class ScreeningCoherenceInputs:
    Ue_eV: float               # Screening energy, 10–100 eV
    E_kin_eV: float            # Effective D kinetic energy, 0.01–0.1
    Delta_E_eV: float          # For coherence length, 0.1–1
    v_F: float                 # m/s, Fermi velocity, ~1e6
```

### 1.4 Enhancement Bounds (No Double Counting)

```python
@dataclass
class EnhancementBounds:
    f_screening_max: float     # Cap, e.g. 1e3
    f_field_max: float         # Cap
    f_coherence_max: float     # Cap
    f_phonon_max: float        # Cap
    f_enhancement_total_max: float  # 1e5 (from consistency)
    # f_total = min(f_screen * f_field * f_coherence * f_phonon, f_total_max)
```

### 1.5 Nuclear Channel

```python
@dataclass
class NuclearChannelInputs:
    channel_mode: str          # "DD_He4" | "DD_standard" | "Widom_Larsen" | "mixed"
    branching_He4: float       # If mixed
    branching_Tp: float
    branching_He3n: float
    gamma_suppression_factor: float  # 0–1
```

### 1.6 Cavitation (Optional)

```python
@dataclass
class CavitationInputs:
    enabled: bool
    R_bubble_um: float
    P_drive_kPa: float
    surface_proximity_gamma: float  # h/R
    E_field_at_bubble: float   # V/m
```

### 1.7 Overlap Regime

```python
overlap_regime: Literal["halo", "interface"]  # P_overlap choice
```

---

## 2. Outputs (RORO: Return an Object)

### 2.1 Reaction Rate

```python
@dataclass
class ReactionRateOutputs:
    R_per_m3_per_s: float      # Reactions per m³ per second
    f_enhancement: float       # Actual applied
    f_screening: float
    f_field: float
    f_coherence: float
    f_phonon: float
    P_threshold: float
```

### 2.2 Product Yields (per W excess)

```python
@dataclass
class ProductYields:
    He4_atoms_per_W_hr: float
    T_atoms_per_W_hr: float
    neutrons_per_s_per_W: float
    gamma_upper_bound_per_W: float  # If suppressed
```

### 2.3 Observables

```python
@dataclass
class ObservablesOutputs:
    P_excess_W: float
    Q_nuclear_J: float
    He4_detected_per_hr: float   # After retention factor
    T_detected_per_hr: float
    neutron_count_rate: float
```

---

## 3. Enhancement Factor Decomposition (No Double Counting)

**Rule:** Each mechanism contributes a multiplicative factor, but total is capped.

\[
f_{\text{enhancement}} = \min\left( f_{\text{screening}} \times f_{\text{field}} \times f_{\text{coherence}} \times f_{\text{phonon}}, \; f_{\max} \right)
\]

| Factor | Formula / source | Range |
|--------|------------------|-------|
| f_screening | exp(Ue/E_kin), cap at f_screening_max | 1–10³ |
| f_field | From E_field effect on barrier; phenomenological | 1–10² |
| f_coherence | From ξ, cluster size; phenomenological | 1–10² |
| f_phonon | From g_ph-nuc, n_ph; cap to avoid IL-009 | 1–10 |
| **f_total** | Product, cap at 10⁵ | 1–10⁵ |

**Do not** add cavitation as multiplicative to f_enhancement if it is treated as P_threshold modifier.

---

## 4. Rate Equation

\[
R = n_1 n_2 \langle \sigma v \rangle_{\text{thermal}} \times f_{\text{enhancement}} \times P_{\text{threshold}}
\]

- ⟨σv⟩: Gamow + S-factor
- P_threshold: probability of meeting activation conditions (loading, defects, field, cavitation trigger)

---

## 5. Uncertainty Ranges

| Parameter | Recommended range | Distribution |
|-----------|-------------------|--------------|
| Ue | [10, 100] eV | Uniform or log-normal |
| f_enhancement | [1e3, 1e5] | Log-uniform |
| P_threshold | [1e-4, 1] | Log-uniform |
| retention_He4 | [1e-3, 1] | Uniform |

Monte Carlo: sample inputs, propagate to R and yields; report percentiles (5th, 50th, 95th).
