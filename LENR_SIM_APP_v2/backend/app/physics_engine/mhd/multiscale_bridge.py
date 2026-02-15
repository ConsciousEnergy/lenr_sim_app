"""
Multi-Scale Bridging Framework
===============================

The bubble-MHD-nuclear problem spans **15+ orders of magnitude** in length
scale.  This module implements a hierarchical bridging framework that:

1. Defines canonical *scale levels* with their characteristic parameters.
2. Computes MHD dimensionless numbers at each level.
3. Passes **effective boundary conditions downward** (macro → micro → nuclear)
   and **source terms upward** (nuclear energy → lattice → bubble → acoustic).

Scale Hierarchy
---------------
::

    MACRO   (mm–cm)      Acoustic driving, bulk fluid, standing waves
      │
      └─ BUBBLE (1–100 µm)   Rayleigh-Plesset, MHD body forces, Hartmann flow
            │
            └─ SURFACE (1–100 nm)   Double-layer, Casimir, Debye screening, Hartmann BL
                  │
                  └─ LATTICE (0.1–1 nm)   Crystal structure, interstitial sites, phonons
                        │
                        └─ NUCLEAR (1–10 fm)   Coulomb barrier, tunneling, fusion

References
----------
[1] E, W. & Engquist, B. (2003). "The Heterogeneous Multiscale Methods".
    Comm. Math. Sci. 1(1), 87–132.
"""

from __future__ import annotations

import logging
import math
from dataclasses import dataclass, field
from enum import Enum, auto
from typing import Any, Dict, List, Optional

import numpy as np
from scipy import constants as const

from .dimensionless_parameters import compute_mhd_parameters, MHDDimensionlessParameters

logger = logging.getLogger(__name__)

KB: float = const.k
HBAR: float = const.hbar
E_CHARGE: float = const.e
MU_0: float = const.mu_0
C: float = const.c


# ═══════════════════════════════════════════════════════════════════════════
#  Scale definitions
# ═══════════════════════════════════════════════════════════════════════════
class ScaleLevel(Enum):
    """Canonical scale levels in the multi-physics problem."""
    MACRO = auto()
    BUBBLE = auto()
    SURFACE = auto()
    LATTICE = auto()
    NUCLEAR = auto()


# Default characteristic parameters for each scale
_DEFAULT_SCALE_PARAMS: Dict[ScaleLevel, Dict[str, float]] = {
    ScaleLevel.MACRO: {
        "L": 1e-2,         # 1 cm
        "v": 1.0,          # 1 m/s (acoustic velocity perturbation)
        "B": 0.1,          # 0.1 T (applied external)
        "rho": 1000.0,     # 1000 kg/m³ (water/D₂O)
        "sigma": 5.0,      # 5 S/m (electrolyte)
        "nu": 1e-6,        # 1e-6 m²/s (water)
        "T": 300.0,        # 300 K
        "n_ion": 6e25,     # ~0.1 M electrolyte
    },
    ScaleLevel.BUBBLE: {
        "L": 50e-6,        # 50 µm
        "v": 100.0,        # 100 m/s (collapse velocity)
        "B": 1.0,          # 1 T (Z-pinch compressed)
        "rho": 1000.0,
        "sigma": 100.0,    # ionised shell
        "nu": 1e-6,
        "T": 5000.0,       # hot compressed gas
        "n_ion": 1e27,
    },
    ScaleLevel.SURFACE: {
        "L": 10e-9,        # 10 nm  (Debye-length scale)
        "v": 50.0,         # 50 m/s
        "B": 10.0,         # 10 T (flux-compressed)
        "rho": 2000.0,     # near-surface dense layer
        "sigma": 1e4,      # surface conductivity
        "nu": 1e-7,
        "T": 1e4,
        "n_ion": 1e28,
    },
    ScaleLevel.LATTICE: {
        "L": 0.3e-9,       # 3 Å  (lattice constant)
        "v": 10.0,         # phonon-scale velocity
        "B": 50.0,         # high flux density in lattice
        "rho": 12000.0,    # Pd density
        "sigma": 1e6,      # metallic conductivity
        "nu": 1e-8,        # effective kinematic viscosity in lattice
        "T": 500.0,        # loaded lattice temperature
        "n_ion": 7e28,     # Pd atom density
    },
    ScaleLevel.NUCLEAR: {
        "L": 5e-15,        # 5 fm  (nuclear scale)
        "v": 1e6,          # nuclear-scale velocities (MeV protons)
        "B": 1e3,          # extreme field at nuclear proximity
        "rho": 1e17,       # nuclear density
        "sigma": 1e10,     # effective conductivity near nucleus
        "nu": 1e-15,       # quantum viscosity
        "T": 1e8,          # equivalent nuclear temperature
        "n_ion": 1e44,     # nuclear density
    },
}


# ═══════════════════════════════════════════════════════════════════════════
#  Data structures
# ═══════════════════════════════════════════════════════════════════════════
@dataclass
class ScaleState:
    """Physical state at a single scale level."""

    level: ScaleLevel
    L: float = 0.0                  # characteristic length (m)
    v: float = 0.0                  # characteristic velocity (m/s)
    B: float = 0.0                  # magnetic field (T)
    rho: float = 0.0               # density (kg/m³)
    sigma: float = 0.0             # conductivity (S/m)
    nu: float = 0.0                # kinematic viscosity (m²/s)
    T: float = 300.0               # temperature (K)
    n_ion: float = 1e28            # ion number density (m⁻³)
    collision_freq: float = 1e13   # collision frequency (Hz)

    # Computed
    mhd_params: Optional[MHDDimensionlessParameters] = None

    # Boundary conditions / source terms (passed between scales)
    pressure_bc: float = 0.0       # effective pressure (Pa)
    heat_source: float = 0.0       # volumetric heat source (W/m³)
    B_bc: float = 0.0              # magnetic field boundary (T)
    v_bc: float = 0.0              # velocity boundary (m/s)
    screening_potential: float = 0.0  # electron screening energy (eV)

    def compute_mhd(self) -> MHDDimensionlessParameters:
        """Compute MHD dimensionless parameters at this scale."""
        self.mhd_params = compute_mhd_parameters(
            B=self.B,
            L=self.L,
            v=self.v,
            rho=self.rho,
            sigma=self.sigma,
            nu=self.nu,
            temperature=self.T,
            ion_density=self.n_ion,
            collision_frequency=self.collision_freq,
        )
        return self.mhd_params

    def to_dict(self) -> Dict[str, Any]:
        d: Dict[str, Any] = {
            "level": self.level.name,
            "L_m": self.L,
            "v_m_s": self.v,
            "B_T": self.B,
            "rho_kg_m3": self.rho,
            "sigma_S_m": self.sigma,
            "nu_m2_s": self.nu,
            "T_K": self.T,
            "n_ion_m3": self.n_ion,
        }
        if self.mhd_params:
            d["mhd_parameters"] = self.mhd_params.to_dict()
        return d


@dataclass
class MultiscaleBridgeResult:
    """Results from a full multi-scale computation."""

    scales: Dict[str, ScaleState] = field(default_factory=dict)
    dominant_physics: Dict[str, str] = field(default_factory=dict)
    boundary_conditions_down: Dict[str, Dict[str, float]] = field(default_factory=dict)
    source_terms_up: Dict[str, Dict[str, float]] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "scales": {k: v.to_dict() for k, v in self.scales.items()},
            "dominant_physics": self.dominant_physics,
            "boundary_conditions_down": self.boundary_conditions_down,
            "source_terms_up": self.source_terms_up,
        }


# ═══════════════════════════════════════════════════════════════════════════
#  Multi-Scale Bridge
# ═══════════════════════════════════════════════════════════════════════════
class MultiscaleBridge:
    """Hierarchical multi-scale bridge for bubble-MHD-nuclear coupling."""

    SCALE_ORDER: List[ScaleLevel] = [
        ScaleLevel.MACRO,
        ScaleLevel.BUBBLE,
        ScaleLevel.SURFACE,
        ScaleLevel.LATTICE,
        ScaleLevel.NUCLEAR,
    ]

    def __init__(self, overrides: Optional[Dict[ScaleLevel, Dict[str, float]]] = None) -> None:
        self.states: Dict[ScaleLevel, ScaleState] = {}
        params = {level: dict(defaults) for level, defaults in _DEFAULT_SCALE_PARAMS.items()}
        if overrides:
            for level, ov in overrides.items():
                if level in params:
                    params[level].update(ov)
        for level in self.SCALE_ORDER:
            p = params[level]
            self.states[level] = ScaleState(
                level=level,
                L=p["L"], v=p["v"], B=p["B"],
                rho=p["rho"], sigma=p["sigma"], nu=p["nu"],
                T=p["T"], n_ion=p["n_ion"],
            )

    # ── MHD parameters at every scale ─────────────────────────────────
    def compute_all_mhd_parameters(self) -> Dict[ScaleLevel, MHDDimensionlessParameters]:
        """Compute dimensionless MHD parameters at every scale level."""
        results: Dict[ScaleLevel, MHDDimensionlessParameters] = {}
        for level in self.SCALE_ORDER:
            results[level] = self.states[level].compute_mhd()
        return results

    # ── Downward boundary-condition cascade ───────────────────────────
    def cascade_boundary_conditions_down(self) -> Dict[str, Dict[str, float]]:
        """Pass effective BCs from each scale to the one below.

        * MACRO → BUBBLE:  acoustic pressure, bulk B, bulk velocity
        * BUBBLE → SURFACE:  compression pressure, compressed B, collapse v
        * SURFACE → LATTICE:  Debye screening, surface B, surface T
        * LATTICE → NUCLEAR:  screening potential, local B, local T
        """
        bc_log: Dict[str, Dict[str, float]] = {}

        for i in range(len(self.SCALE_ORDER) - 1):
            parent = self.states[self.SCALE_ORDER[i]]
            child = self.states[self.SCALE_ORDER[i + 1]]
            key = f"{parent.level.name}→{child.level.name}"

            # Magnetic field compression (flux conservation B ∝ 1/L²)
            if parent.L > 0 and child.L > 0:
                flux_ratio = (parent.L / child.L) ** 2
                child.B_bc = parent.B * min(flux_ratio, 1e10)  # capped
                # Update child's B if it hasn't been explicitly set
                child.B = max(child.B, child.B_bc)

            # Pressure cascade (adiabatic compression, gamma=5/3)
            if parent.L > 0 and child.L > 0:
                compression = (parent.L / child.L) ** 3
                child.pressure_bc = parent.rho * parent.v**2 * min(compression, 1e15)

            # Velocity mapping (energy conservation  ½ρv² preserved)
            if parent.rho > 0 and child.rho > 0:
                child.v_bc = parent.v * math.sqrt(parent.rho / child.rho)
                child.v = max(child.v, child.v_bc)

            # Screening potential (from surface → lattice → nuclear)
            if parent.level in (ScaleLevel.SURFACE, ScaleLevel.LATTICE):
                # Debye screening: V_s ≈ (e² n_e / (ε₀ k_B T))^0.5 × k_B T / e
                if parent.n_ion > 0 and parent.T > 0:
                    from scipy.constants import epsilon_0
                    lambda_D = math.sqrt(
                        epsilon_0 * KB * parent.T / (parent.n_ion * E_CHARGE**2)
                    )
                    V_screen_eV = KB * parent.T / E_CHARGE  # screening energy
                    child.screening_potential = V_screen_eV

            bc_log[key] = {
                "B_bc_T": child.B_bc,
                "pressure_bc_Pa": child.pressure_bc,
                "v_bc_m_s": child.v_bc,
                "screening_eV": child.screening_potential,
            }

        return bc_log

    # ── Upward source-term cascade ────────────────────────────────────
    def cascade_source_terms_up(
        self,
        nuclear_energy_release_W: float = 0.0,
        nuclear_neutron_rate: float = 0.0,
    ) -> Dict[str, Dict[str, float]]:
        """Pass source terms from each scale to the one above.

        * NUCLEAR → LATTICE:  nuclear energy → phonon heating
        * LATTICE → SURFACE:  lattice heating → surface temperature rise
        * SURFACE → BUBBLE:   surface heating → bubble expansion pressure
        * BUBBLE → MACRO:     bubble expansion → acoustic emission
        """
        source_log: Dict[str, Dict[str, float]] = {}

        # Start at nuclear
        energy_flux = nuclear_energy_release_W  # W per reaction site

        for i in range(len(self.SCALE_ORDER) - 1, 0, -1):
            child = self.states[self.SCALE_ORDER[i]]
            parent = self.states[self.SCALE_ORDER[i - 1]]
            key = f"{child.level.name}→{parent.level.name}"

            # Volumetric heat source (W/m³)
            if child.L > 0:
                vol = child.L**3
                heat_density = energy_flux / vol if vol > 0 else 0.0
                parent.heat_source += heat_density

            # Temperature increment (rough estimate: ΔT = Q dt / (ρ c_p vol))
            # We don't advance time here; just log the source term.
            source_log[key] = {
                "heat_source_W_m3": parent.heat_source,
                "energy_input_W": energy_flux,
                "neutron_rate": nuclear_neutron_rate if child.level == ScaleLevel.NUCLEAR else 0.0,
            }

            # Attenuate energy for next scale (some fraction radiated / lost)
            energy_flux *= 0.8  # 80 % coupling efficiency assumption

        return source_log

    # ── Dominant-physics classification ────────────────────────────────
    def classify_dominant_physics(self) -> Dict[str, str]:
        """For each scale, identify the dominant physical regime."""
        result: Dict[str, str] = {}
        for level in self.SCALE_ORDER:
            state = self.states[level]
            p = state.mhd_params
            if p is None:
                state.compute_mhd()
                p = state.mhd_params
            if p is None:
                result[level.name] = "unknown"
                continue

            # Choose the dominant label
            labels: List[str] = []
            if p.magnetic_reynolds_number > 10:
                labels.append("frozen-in flux")
            elif p.magnetic_reynolds_number < 0.1:
                labels.append("resistive diffusion")

            if p.hartmann_number > 10:
                labels.append("Hartmann-dominated")

            if p.hall_parameter > 1:
                labels.append("Hall-MHD")

            if p.plasma_beta < 0.1:
                labels.append("magnetically dominated")
            elif p.plasma_beta > 10:
                labels.append("kinetically dominated")

            if p.stuart_number > 1:
                labels.append("EM braking")

            result[level.name] = " + ".join(labels) if labels else "weakly magnetised"

        return result

    # ── Full solve ────────────────────────────────────────────────────
    def solve(
        self,
        nuclear_energy_W: float = 0.0,
        nuclear_neutron_rate: float = 0.0,
    ) -> MultiscaleBridgeResult:
        """Run a complete multi-scale computation.

        1. Compute MHD parameters at every scale.
        2. Cascade boundary conditions downward.
        3. Re-compute MHD (with updated BCs).
        4. Cascade source terms upward.
        5. Classify dominant physics at each scale.
        """
        # First pass — MHD with default params
        self.compute_all_mhd_parameters()

        # Downward BCs
        bc_down = self.cascade_boundary_conditions_down()

        # Re-compute MHD with updated child fields
        self.compute_all_mhd_parameters()

        # Upward sources
        src_up = self.cascade_source_terms_up(nuclear_energy_W, nuclear_neutron_rate)

        # Dominant physics
        dom = self.classify_dominant_physics()

        return MultiscaleBridgeResult(
            scales={level.name: self.states[level] for level in self.SCALE_ORDER},
            dominant_physics=dom,
            boundary_conditions_down=bc_down,
            source_terms_up=src_up,
        )
