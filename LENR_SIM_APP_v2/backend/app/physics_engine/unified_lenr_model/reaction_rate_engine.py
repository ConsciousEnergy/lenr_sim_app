"""Reaction-rate engine with selectable physical formalisms (Phase 5 / RR-006).

Provides *explicitly labelled* rate modes so the conservative baseline and the
speculative CMNS formalisms never silently replace one another:

- ``two_body`` -- textbook free-particle thermonuclear rate
  ``0.5 n^2 <sigma v> P``. Claim tier: ``established_reference``.
- ``trapped_state`` -- Fermi's-golden-rule / TSC-style rate at sub-pm
  separation (Takahashi 2016). Claim tier: ``speculative_exploratory``.
- ``three_body`` -- cavitation-localized multi-species chain
  ``p + e⁻ → n + ν_e`` then ``n + d → products`` (Widom–Larsen class +
  Oppenheimer–Phillips / NASA LCF capture). Claim tier:
  ``speculative_exploratory``. Models the abundance of protons, electrons,
  and deuterons under extreme localized compression — not a validated LENR
  mechanism.

A bounded ``collective_factor`` models coherent participation as a **linear**
clamp ``min(N, MAX_COLLECTIVE_FACTOR)`` (not N² Dicke scaling). Documented model
assumption; hard-capped so it cannot dominate without bound.

Design rules honoured:
- RORO: functions receive a ``SimulationConfig`` (+ scalars) and return a
  ``ReactionRateResult`` object.
- Backward compatible: default remains ``two_body``.
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
# Distinct from the phenomenological tunneling band 10³–10⁵ (paper §2.8): this
# caps linear coherent participation N, not the f_enhancement product.
MAX_COLLECTIVE_FACTOR: float = 1e6
# Default transient-cluster parameters (Takahashi TSC), used as UQ priors.
DEFAULT_TRAP_SEPARATION_M: float = 25e-12   # ~25 pm minimum approach in TSC
DEFAULT_CLUSTER_LIFETIME_S: float = 1e-20   # collapse timescale
DEFAULT_TRAP_NUCLEAR_RADIUS_M: float = 5e-15
# Calorimetry-scale ceiling for volumetric power (≈1 kW/cm³); governance falsifier.
MAX_PHYSICAL_POWER_DENSITY_W_M3: float = 1e9
# D+D → ⁴He Q-value used only for the power-density falsifier (J).
_DD_HE4_Q_J: float = 23.8e6 * const.e
# Default proton fraction among loaded hydrogen isotopes (cavitation H/D mix).
DEFAULT_PROTON_FRACTION: float = 0.1
# Default cavitation compression (density scale factor on n_e, n_p, n_d).
DEFAULT_COMPRESSION_RATIO: float = 10.0
# Unresolved chain / MeV-gap efficiency (default << 1 — do not silently assume 1).
DEFAULT_THREE_BODY_CONVERSION: float = 1e-6
# Widom–Larsen electron mass renormalization m*/m_e (threshold ≈ 2.53).
DEFAULT_MASS_RENORMALIZATION: float = 4.0


class RateMode(str, Enum):
    """Selectable reaction-rate formalism."""

    TWO_BODY = "two_body"
    TRAPPED_STATE = "trapped_state"
    THREE_BODY = "three_body"


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

    Sub-nuclear separations are clamped to the nuclear radius so the path never
    silently returns ``p_barrier = 1.0`` (perfect conversion / MeV-gap blow-up).
    """
    z1 = z2 = config.reactant.atomic_number
    sep = max(float(separation_m), DEFAULT_TRAP_NUCLEAR_RADIUS_M)
    m_reduced = 0.5 * config.reactant.atomic_mass * const.u
    # Coulomb barrier height at the trapped separation (J).
    v_coulomb = (z1 * z2 * E_CHARGE**2) / (
        4.0 * np.pi * const.epsilon_0 * sep
    )
    # WKB width: at least one nuclear radius so penetration stays strictly < 1.
    width = max(sep - DEFAULT_TRAP_NUCLEAR_RADIUS_M, DEFAULT_TRAP_NUCLEAR_RADIUS_M)
    kappa = np.sqrt(max(2.0 * m_reduced * v_coulomb, 0.0)) / HBAR
    exponent = float(np.clip(-2.0 * kappa * width, -700.0, 0.0))
    return float(np.exp(exponent))


def _collective_factor(n_coherent: float) -> float:
    """Bounded coherent participation factor (model assumption, RR-006).

    Implemented as a **linear** clamp ``min(N, MAX_COLLECTIVE_FACTOR)``, not N²
    Dicke superradiance. Paper §5A.1 discusses N² as a hypothesis; this engine
    intentionally uses the more conservative linear form until that claim is
    evidenced. Cap is independent of the 10³–10⁵ tunneling-enhancement band.
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
        claim_tier="established_reference",
        collective_factor=1.0,
        references=["gamow1928", "standard thermonuclear <sigma v>"],
        provenance={"tunneling_probability": float(tunneling_prob)},
        notes=(
            "Free-particle two-body reference rate (textbook thermonuclear formalism). "
            "Not a validated lattice-LENR mechanism; see paper §5A.3."
        ),
    )


def compute_trapped_state_rate(
    config: SimulationConfig,
    *,
    trap_separation_m: float = DEFAULT_TRAP_SEPARATION_M,
    cluster_lifetime_s: float = DEFAULT_CLUSTER_LIFETIME_S,
    n_coherent: float = 1.0,
    fusion_probability: float = 1.0,
) -> ReactionRateResult:
    """Trapped-state (TSC / Fermi-golden-rule) rate. Speculative claim tier.

    Per-cluster rate ≈ ``p_barrier × fusion_probability / lifetime``. The
    ``fusion_probability`` factor is the unresolved nuclear conversion /
    optical-potential (MeV-gap) piece: default ``1.0`` preserves prior numerics
    but makes the assumption visible in provenance and UQ (RR-011).
    """
    n_reactant = _reactant_number_density(config)
    # Number density of transient clusters ~ paired reactant sites.
    n_clusters = 0.5 * n_reactant
    p_barrier = _gamow_penetration(config, trap_separation_m)
    lifetime = max(cluster_lifetime_s, 1e-30)
    f_nuc = float(np.clip(fusion_probability, 0.0, 1.0))
    per_cluster_rate = p_barrier * f_nuc / lifetime
    collective = _collective_factor(n_coherent)
    rate = n_clusters * per_cluster_rate * collective
    power_density = float(rate) * _DD_HE4_Q_J
    unphysical = 1.0 if power_density > MAX_PHYSICAL_POWER_DENSITY_W_M3 else 0.0
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
            "fusion_probability": f_nuc,
            "n_clusters_m3": float(n_clusters),
            "n_coherent": float(n_coherent),
            "power_density_W_m3": power_density,
            "unphysical": unphysical,
        },
        notes=(
            "Trapped-state rate evaluated at sub-pm separation (Takahashi TSC). "
            "Speculative: magnitude depends strongly on trap separation prior. "
            "fusion_probability defaults to 1.0 (MeV-gap / nuclear matrix element "
            "unresolved — see MEV_GAP_HYPOTHESIS.md); propagate via UQ."
        ),
    )


def compute_three_body_rate(
    config: SimulationConfig,
    *,
    compression_ratio: float = DEFAULT_COMPRESSION_RATIO,
    proton_fraction: float = DEFAULT_PROTON_FRACTION,
    conversion_probability: float = DEFAULT_THREE_BODY_CONVERSION,
    n_coherent: float = 1.0,
    mass_renormalization: float = DEFAULT_MASS_RENORMALIZATION,
) -> ReactionRateResult:
    """Cavitation-localized three-species chain (p + e⁻ + d). Speculative.

    Bookkeeping model for the multi-species environment under extreme localized
    compression (bubble collapse / NAE hotspots):

    1. ``p + e⁻ → n + ν_e`` — weak / ULM capture. Opens when the Widom–Larsen
       electron-mass renormalization ``m*/m_e`` exceeds ≈2.53; otherwise the
       free-particle Boltzmann factor ``exp(-0.782 MeV / kT)`` applies
       (typically negligible at cold lattice T). Tennfors (2013) critiques
       the ULM assumptions — they remain visible in provenance.
    2. ``n + d → products`` — barrier-free capture follow-on (OP / NASA LCF);
       efficiency folded into ``conversion_probability`` (default 1e-6).

    Volumetric neutron production uses ``n_p n_e σ_weak v_th`` (compressed
    densities), then ``R_3 = R_n · f_capture · η_conv · C``.

    Claim tier: ``speculative_exploratory``. Does not replace ``two_body``.
    """
    from app.physics.weak_interaction import (
        calculate_weak_interaction_cross_section,
        THRESHOLD_ELECTRON_MEV,
    )

    compress = max(float(compression_ratio), 1.0)
    f_p = float(np.clip(proton_fraction, 0.0, 1.0))
    eta = float(np.clip(conversion_probability, 0.0, 1.0))
    mass_ratio = max(float(mass_renormalization), 0.0)

    n_loaded = _reactant_number_density(config) * compress
    n_d = n_loaded * (1.0 - f_p)
    n_p = n_loaded * f_p
    n_e = float(config.host_material.electron_density) * compress

    me, mp, mn = const.m_e, const.m_p, const.m_n
    m_threshold_ratio = (mn - mp + me) / me  # ≈ 2.531
    mass_sufficient = mass_ratio >= m_threshold_ratio

    T = float(config.temperature)
    sigma = float(calculate_weak_interaction_cross_section(1e6))
    v_th = float(np.sqrt(2.0 * KB * T / me)) if T > 0 else 0.0
    if mass_sufficient:
        # Speculative ULM channel: mass renormalization lifts the threshold.
        channel_factor = 1.0
    elif T > 0:
        e_th_j = THRESHOLD_ELECTRON_MEV * 1e6 * E_CHARGE
        channel_factor = float(np.exp(np.clip(-e_th_j / (KB * T), -700.0, 0.0)))
    else:
        channel_factor = 0.0

    r_neutron = n_p * n_e * sigma * v_th * channel_factor
    f_capture = float(n_d / (n_d + n_p + 1.0)) if (n_d + n_p) > 0 else 0.0
    collective = _collective_factor(n_coherent)
    rate = r_neutron * f_capture * eta * collective

    power_density = float(rate) * _DD_HE4_Q_J
    unphysical = 1.0 if power_density > MAX_PHYSICAL_POWER_DENSITY_W_M3 else 0.0

    return ReactionRateResult(
        rate_per_m3_s=float(rate),
        mode=RateMode.THREE_BODY.value,
        claim_tier="speculative_exploratory",
        collective_factor=collective,
        references=[
            "widomlarsen2006",
            "tennfors2013",
            "steinetz2020exp",
            "pines2020theory",
            "miles1993",
        ],
        provenance={
            "compression_ratio": compress,
            "proton_fraction": f_p,
            "n_p_m3": float(n_p),
            "n_d_m3": float(n_d),
            "n_e_m3": float(n_e),
            "mass_renormalization": mass_ratio,
            "mass_threshold_ratio": float(m_threshold_ratio),
            "mass_sufficient": 1.0 if mass_sufficient else 0.0,
            "channel_factor": channel_factor,
            "neutron_production_m3_s": float(r_neutron),
            "nd_capture_fraction": f_capture,
            "conversion_probability": eta,
            "n_coherent": float(n_coherent),
            "power_density_W_m3": power_density,
            "unphysical": unphysical,
        },
        notes=(
            "Three-body cavitation chain: p+e⁻→n then n+d→products. "
            "Speculative (Widom–Larsen mass renormalization + OP/NASA LCF). "
            "conversion_probability defaults to 1e-6. "
            "Tennfors (2013) critiques of ULM assumptions apply. "
            "Does not replace the two_body baseline."
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
    fusion_probability: float = 1.0,
    compression_ratio: float = DEFAULT_COMPRESSION_RATIO,
    proton_fraction: float = DEFAULT_PROTON_FRACTION,
    conversion_probability: float = DEFAULT_THREE_BODY_CONVERSION,
    mass_renormalization: float = DEFAULT_MASS_RENORMALIZATION,
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
            fusion_probability=fusion_probability,
        )
    if mode_value == RateMode.THREE_BODY.value:
        return compute_three_body_rate(
            config,
            compression_ratio=compression_ratio,
            proton_fraction=proton_fraction,
            conversion_probability=conversion_probability,
            n_coherent=n_coherent,
            mass_renormalization=mass_renormalization,
        )
    return compute_two_body_rate(config, tunneling_prob)


__all__ = [
    "RateMode",
    "ReactionRateResult",
    "compute_reaction_rate",
    "compute_two_body_rate",
    "compute_trapped_state_rate",
    "compute_three_body_rate",
    "MAX_COLLECTIVE_FACTOR",
]
