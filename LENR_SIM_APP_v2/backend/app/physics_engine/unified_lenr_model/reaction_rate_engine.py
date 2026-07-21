"""Reaction-rate engine with selectable physical formalisms (Phase 5 / RR-006).

Provides two *explicitly labelled* rate modes plus an optional collective
many-body term, so the conservative baseline and the speculative CMNS formalism
never silently replace one another:

- ``two_body`` -- the standard free-particle thermonuclear rate
  ``0.5 n^2 <sigma v> P`` (textbook nuclear astrophysics). Conservative baseline.
- ``trapped_state`` -- Fermi's-golden-rule / TSC-style rate for reactants
  confined to sub-picometre separation inside a transient cluster, per
  Takahashi, *Fundamental of Rate Theory for CMNS*, JCMNS 19, 298 (2016)
  (key ``takahashi2016``). Speculative/exploratory; argued to exceed the
  two-body rate by many orders of magnitude because the barrier-penetration
  factor is evaluated at the trapped-state separation, not the thermal one.

A bounded ``collective_factor`` models coherent N-body enhancement
(superradiance-like). It is a documented model assumption and is hard-capped so
it cannot dominate without bound.

Design rules honoured:
- RORO: functions receive a ``SimulationConfig`` (+ scalars) and return a
  ``ReactionRateResult`` object.
- Backward compatible: ``two_body`` reuses the existing
  ``cross_sections.calculate_reaction_rate`` unchanged.
- Every result carries its claim tier and citation keys for provenance/export.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List

import numpy as np
from scipy import constants as const

from .config import SimulationConfig
from .cross_sections import calculate_reaction_rate as _two_body_rate

KB = const.k
E_CHARGE = const.e
C = const.c
ALPHA = const.alpha
HBAR = const.hbar

# Hard cap on the coherent many-body enhancement (model assumption, RR-006).
MAX_COLLECTIVE_FACTOR: float = 1e6
# Default transient-cluster parameters (Takahashi TSC), used as UQ priors.
DEFAULT_TRAP_SEPARATION_M: float = 25e-12   # ~25 pm minimum approach in TSC
DEFAULT_CLUSTER_LIFETIME_S: float = 1e-20   # collapse timescale
DEFAULT_TRAP_NUCLEAR_RADIUS_M: float = 5e-15


class RateMode(str, Enum):
    """Selectable reaction-rate formalism."""

    TWO_BODY = "two_body"
    TRAPPED_STATE = "trapped_state"


@dataclass(frozen=True)
class ReactionRateResult:
    """Structured reaction-rate output (reactions per m^3 per s)."""

    rate_per_m3_s: float
    mode: str
    claim_tier: str
    collective_factor: float
    references: List[str] = field(default_factory=list)
    provenance: Dict[str, float] = field(default_factory=dict)
    notes: str = ""

    def as_dict(self) -> Dict[str, object]:
        return {
            "rate_per_m3_s": float(self.rate_per_m3_s),
            "mode": self.mode,
            "claim_tier": self.claim_tier,
            "collective_factor": float(self.collective_factor),
            "references": list(self.references),
            "provenance": dict(self.provenance),
            "notes": self.notes,
        }


def _reactant_number_density(config: SimulationConfig) -> float:
    """Reactant number density (m^-3) from host density and loading ratio."""
    n_host = config.host_material.electron_density / max(
        config.host_material.atomic_number, 1
    )
    return n_host * config.loading_ratio


def _gamow_penetration(config: SimulationConfig, separation_m: float) -> float:
    """WKB barrier penetration for two like nuclei brought to ``separation_m``.

    Uses the screened-Coulomb Gamow form evaluated at the *trapped-state*
    separation. For sub-picometre separation this is vastly larger than the
    thermal two-body value, which is the crux of the trapped-state hypothesis.
    """
    z1 = z2 = config.reactant.atomic_number
    if separation_m <= DEFAULT_TRAP_NUCLEAR_RADIUS_M:
        return 1.0
    m_reduced = 0.5 * config.reactant.atomic_mass * const.u
    # Coulomb barrier height at the trapped separation (J).
    v_coulomb = (z1 * z2 * E_CHARGE**2) / (
        4.0 * np.pi * const.epsilon_0 * separation_m
    )
    # WKB exponent for a square-ish barrier of width (sep - r_nuc).
    width = separation_m - DEFAULT_TRAP_NUCLEAR_RADIUS_M
    kappa = np.sqrt(max(2.0 * m_reduced * v_coulomb, 0.0)) / HBAR
    exponent = float(np.clip(-2.0 * kappa * width, -700.0, 0.0))
    return float(np.exp(exponent))


def _collective_factor(n_coherent: float) -> float:
    """Bounded coherent N-body enhancement (model assumption, RR-006).

    Superradiance-like scaling with the number of phase-coherent participants,
    capped at ``MAX_COLLECTIVE_FACTOR`` so it cannot dominate without bound.
    """
    if n_coherent <= 1.0:
        return 1.0
    return float(min(n_coherent, MAX_COLLECTIVE_FACTOR))


def compute_two_body_rate(
    config: SimulationConfig, tunneling_prob: float
) -> ReactionRateResult:
    """Conservative baseline rate (textbook thermonuclear formalism)."""
    rate = _two_body_rate(config, tunneling_prob)
    return ReactionRateResult(
        rate_per_m3_s=float(rate),
        mode=RateMode.TWO_BODY.value,
        claim_tier="validated_lenr_mechanism",
        collective_factor=1.0,
        references=["gamow1928", "standard thermonuclear <sigma v>"],
        provenance={"tunneling_probability": float(tunneling_prob)},
        notes="Free-particle two-body rate; conservative lower bound.",
    )


def compute_trapped_state_rate(
    config: SimulationConfig,
    *,
    trap_separation_m: float = DEFAULT_TRAP_SEPARATION_M,
    cluster_lifetime_s: float = DEFAULT_CLUSTER_LIFETIME_S,
    n_coherent: float = 1.0,
) -> ReactionRateResult:
    """Trapped-state (TSC / Fermi-golden-rule) rate. Speculative claim tier.

    Per-cluster fusion probability per unit time is approximated as the
    barrier-penetration factor at the trapped separation divided by the cluster
    collapse lifetime; multiplied by the cluster number density and an optional
    coherent many-body factor. Parameters are exposed as UQ priors.
    """
    n_reactant = _reactant_number_density(config)
    # Number density of transient clusters ~ paired reactant sites.
    n_clusters = 0.5 * n_reactant
    p_barrier = _gamow_penetration(config, trap_separation_m)
    lifetime = max(cluster_lifetime_s, 1e-30)
    per_cluster_rate = p_barrier / lifetime
    collective = _collective_factor(n_coherent)
    rate = n_clusters * per_cluster_rate * collective
    return ReactionRateResult(
        rate_per_m3_s=float(rate),
        mode=RateMode.TRAPPED_STATE.value,
        claim_tier="speculative_exploratory",
        collective_factor=collective,
        references=["takahashi2016", "floquetwkb2026"],
        provenance={
            "trap_separation_m": float(trap_separation_m),
            "cluster_lifetime_s": float(lifetime),
            "barrier_penetration": float(p_barrier),
            "n_clusters_m3": float(n_clusters),
            "n_coherent": float(n_coherent),
        },
        notes=(
            "Trapped-state rate evaluated at sub-pm separation (Takahashi TSC). "
            "Speculative: magnitude depends strongly on trap separation prior."
        ),
    )


def compute_reaction_rate(
    config: SimulationConfig,
    tunneling_prob: float,
    *,
    mode: RateMode | str = RateMode.TWO_BODY,
    n_coherent: float = 1.0,
    trap_separation_m: float = DEFAULT_TRAP_SEPARATION_M,
    cluster_lifetime_s: float = DEFAULT_CLUSTER_LIFETIME_S,
) -> ReactionRateResult:
    """Dispatch to the requested rate formalism (RORO).

    Defaults to the conservative ``two_body`` mode for backward compatibility.
    """
    mode_value = mode.value if isinstance(mode, RateMode) else str(mode).lower()
    if mode_value == RateMode.TRAPPED_STATE.value:
        return compute_trapped_state_rate(
            config,
            trap_separation_m=trap_separation_m,
            cluster_lifetime_s=cluster_lifetime_s,
            n_coherent=n_coherent,
        )
    return compute_two_body_rate(config, tunneling_prob)


__all__ = [
    "RateMode",
    "ReactionRateResult",
    "compute_reaction_rate",
    "compute_two_body_rate",
    "compute_trapped_state_rate",
    "MAX_COLLECTIVE_FACTOR",
]
