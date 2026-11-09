"""Uncertainty quantification for the reaction-rate engine (Phase 5 / RR-006).

Propagates the dominant input uncertainties through a chosen rate mode and
reports a predictive distribution with credible intervals. Uses only numpy +
scipy (scipy.stats.qmc Sobol sequence), so no new dependency is introduced.

Two layers, both deterministic given a seed:
1. **Sobol propagation** -- low-discrepancy sampling of mode-specific inputs:
   - ``two_body``: screening potential, tunneling enhancement
   - ``trapped_state``: trap separation, lifetime, fusion_probability
     (screening/enhancement dims are reserved in the Sobol layout for a
     uniform sample matrix shape but are **not** consumed by the trapped-state
     rate formula today)
   - ``three_body``: compression, conversion_probability, proton_fraction,
     mass_renormalization
   to obtain the predictive rate distribution and a first-order variance-based
   sensitivity ranking.
2. **Optional Bayesian band update** -- when an experimental rate band is
   supplied, samples are importance-weighted by a log-normal likelihood centred
   on the band, yielding a posterior credible interval. This is a pragmatic,
   data-light Bayesian update (no external MCMC dependency) and is non-blocking.

Credible intervals are reported as percentiles of the (weighted) predictive
distribution; the term "credible interval" is used for the posterior-weighted
case and "predictive interval" for the prior-only case.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

import numpy as np
from scipy.stats import qmc

from app.physics_engine.constants import MAX_ENHANCEMENT_FACTOR

from .config import SimulationConfig
from .cross_sections import calculate_reaction_rate as _two_body_rate
from .reaction_rate_engine import (
    RateMode,
    compute_reaction_rate,
    DEFAULT_TRAP_SEPARATION_M,
    DEFAULT_CLUSTER_LIFETIME_S,
    DEFAULT_COMPRESSION_RATIO,
    DEFAULT_PROTON_FRACTION,
    DEFAULT_THREE_BODY_CONVERSION,
    DEFAULT_MASS_RENORMALIZATION,
)
from .screening_data import get_screening_potential_range

# Paper-adopted tunneling enhancement prior band (RR-001). Upper edge is the
# governance composition / display ceiling — honesty floor, not a lab 10^5.
ENHANCEMENT_PRIOR_LO: float = 1e3
ENHANCEMENT_PRIOR_HI: float = float(MAX_ENHANCEMENT_FACTOR)


@dataclass(frozen=True)
class UQResult:
    """Predictive / posterior summary for a reaction rate (per m^3 per s)."""

    mode: str
    claim_tier: str
    median: float
    mean: float
    credible_interval: Dict[str, float]  # keys: p05, p50, p95 (+ p25,p75)
    interval_kind: str  # "predictive" or "posterior_credible"
    n_samples: int
    seed: int
    sensitivity: Dict[str, float] = field(default_factory=dict)
    references: List[str] = field(default_factory=list)
    notes: str = ""

    def as_dict(self) -> Dict[str, object]:
        return {
            "mode": self.mode,
            "claim_tier": self.claim_tier,
            "median": float(self.median),
            "mean": float(self.mean),
            "credible_interval": {k: float(v) for k, v in self.credible_interval.items()},
            "interval_kind": self.interval_kind,
            "n_samples": int(self.n_samples),
            "seed": int(self.seed),
            "sensitivity": {k: float(v) for k, v in self.sensitivity.items()},
            "references": list(self.references),
            "notes": self.notes,
        }


def _loguniform(unit: np.ndarray, lo: float, hi: float) -> np.ndarray:
    """Map [0,1) samples to a log-uniform range (for span-many-decades priors)."""
    log_lo, log_hi = np.log10(lo), np.log10(hi)
    return np.power(10.0, log_lo + unit * (log_hi - log_lo))


def _tunneling_from_enhancement(config: SimulationConfig, enhancement: float) -> float:
    """Approximate tunneling probability for a given screening enhancement.

    Mirrors cross_sections.calculate_tunneling_probability without importing the
    enhancement pipeline, so the UQ stays cheap and vectorisable.
    """
    from scipy import constants as const

    T = config.temperature
    m_reduced = 0.5 * config.reactant.atomic_mass * const.u
    E = 1.5 * const.k * T
    z = config.reactant.atomic_number
    eta = z * z * const.alpha * np.sqrt(m_reduced * const.c**2 / (2.0 * E))
    p_gamow = np.exp(-2.0 * np.pi * eta)
    return float(min(p_gamow * enhancement, 1.0))


def _sample_unit(n_samples: int, n_dims: int, seed: int) -> np.ndarray:
    """Deterministic Sobol sample in the unit hypercube."""
    sampler = qmc.Sobol(d=n_dims, scramble=True, seed=seed)
    # Sobol is happiest with powers of two; round up then trim.
    m = int(np.ceil(np.log2(max(n_samples, 2))))
    pts = sampler.random_base2(m=m)
    return pts[:n_samples]


def propagate_rate_uncertainty(
    config: SimulationConfig,
    *,
    mode: RateMode | str = RateMode.TWO_BODY,
    n_samples: int = 512,
    seed: Optional[int] = None,
    experimental_band: Optional[Tuple[float, float]] = None,
    material_key: str = "palladium",
) -> UQResult:
    """Propagate input uncertainty through the rate model (RORO).

    Parameters
    ----------
    experimental_band:
        Optional ``(low, high)`` reactions/m^3/s band. If given, samples are
        importance-weighted by a log-normal likelihood centred on the band's
        geometric mean to produce a posterior credible interval.
    """
    seed = 12345 if seed is None else int(seed)
    mode_value = mode.value if isinstance(mode, RateMode) else str(mode).lower()
    scr = get_screening_potential_range(material_key)

    is_trapped = mode_value == RateMode.TRAPPED_STATE.value
    is_three = mode_value == RateMode.THREE_BODY.value
    if is_trapped:
        n_dims = 5
    elif is_three:
        n_dims = 4  # compression, conversion, proton_fraction, mass_renorm
    else:
        n_dims = 2
    unit = _sample_unit(n_samples, n_dims, seed)

    # Screening potential prior over the cited material range (eV).
    u_screen = (
        scr.minimum + unit[:, 0] * (scr.maximum - scr.minimum)
        if not is_three
        else np.full(n_samples, scr.typical)
    )
    # Tunneling enhancement prior: 1e3–MAX_ENHANCEMENT_FACTOR (RR-001 band).
    enhancement = (
        _loguniform(unit[:, 1], ENHANCEMENT_PRIOR_LO, ENHANCEMENT_PRIOR_HI)
        if not is_three
        else np.ones(n_samples)
    )

    if is_trapped:
        trap_sep = _loguniform(unit[:, 2], 1e-12, 1e-10)   # 1-100 pm
        lifetime = _loguniform(unit[:, 3], 1e-21, 1e-19)   # collapse time
        fusion_prob = _loguniform(unit[:, 4], 1e-6, 1.0)
        compression = np.full(n_samples, DEFAULT_COMPRESSION_RATIO)
        conversion = np.full(n_samples, DEFAULT_THREE_BODY_CONVERSION)
        proton_frac = np.full(n_samples, DEFAULT_PROTON_FRACTION)
        mass_renorm = np.full(n_samples, DEFAULT_MASS_RENORMALIZATION)
    elif is_three:
        trap_sep = np.full(n_samples, DEFAULT_TRAP_SEPARATION_M)
        lifetime = np.full(n_samples, DEFAULT_CLUSTER_LIFETIME_S)
        fusion_prob = np.ones(n_samples)
        compression = _loguniform(unit[:, 0], 1.0, 1e3)
        conversion = _loguniform(unit[:, 1], 1e-12, 1e-2)
        proton_frac = unit[:, 2]  # uniform [0,1)
        mass_renorm = 2.0 + unit[:, 3] * 6.0  # 2–8 (threshold ≈ 2.53)
    else:
        trap_sep = np.full(n_samples, DEFAULT_TRAP_SEPARATION_M)
        lifetime = np.full(n_samples, DEFAULT_CLUSTER_LIFETIME_S)
        fusion_prob = np.ones(n_samples)
        compression = np.full(n_samples, DEFAULT_COMPRESSION_RATIO)
        conversion = np.full(n_samples, DEFAULT_THREE_BODY_CONVERSION)
        proton_frac = np.full(n_samples, DEFAULT_PROTON_FRACTION)
        mass_renorm = np.full(n_samples, DEFAULT_MASS_RENORMALIZATION)

    rates = np.empty(n_samples, dtype=float)
    if is_trapped:
        for i in range(n_samples):
            res = compute_reaction_rate(
                config,
                1.0,
                mode=mode_value,
                trap_separation_m=float(trap_sep[i]),
                cluster_lifetime_s=float(lifetime[i]),
                fusion_probability=float(fusion_prob[i]),
            )
            rates[i] = res.rate_per_m3_s
    elif is_three:
        for i in range(n_samples):
            res = compute_reaction_rate(
                config,
                1.0,
                mode=mode_value,
                compression_ratio=float(compression[i]),
                conversion_probability=float(conversion[i]),
                proton_fraction=float(proton_frac[i]),
                mass_renormalization=float(mass_renorm[i]),
            )
            rates[i] = res.rate_per_m3_s
    else:
        for i in range(n_samples):
            rates[i] = _two_body_rate(
                config,
                float(enhancement[i]),
                screening_energy_keV=float(u_screen[i]) / 1000.0,
            )

    # Keep zeros: a vanishing two-body cold rate is an honest, physical outcome.
    finite = np.isfinite(rates)
    unit = unit[finite]
    rates = rates[finite]
    if rates.size == 0:
        rates = np.array([0.0])
        unit = np.zeros((1, n_dims))

    weights = np.ones(rates.size)
    interval_kind = "predictive"
    if experimental_band is not None and rates.size > 1:
        lo, hi = experimental_band
        if lo > 0 and hi > 0:
            target = np.sqrt(lo * hi)
            sigma = max(np.log10(hi / lo) / 2.0, 0.1)
            log_resid = (np.log10(np.clip(rates, 1e-300, None)) - np.log10(target)) / sigma
            weights = np.exp(-0.5 * log_resid**2)
            if weights.sum() > 0:
                interval_kind = "posterior_credible"
            else:
                weights = np.ones(rates.size)

    summary = _weighted_summary(rates, weights)
    sensitivity = _first_order_sensitivity(
        unit, rates, mode_value
    ) if rates.size > 1 else {}

    if is_trapped:
        refs = ["takahashi2016", "floquetwkb2026"]
        claim = "speculative_exploratory"
    elif is_three:
        refs = ["widomlarsen2006", "tennfors2013", "steinetz2020exp", "miles1993"]
        claim = "speculative_exploratory"
    else:
        refs = ["gamow1928"]
        claim = "established_reference"
    refs += [c for c in scr.citations]
    return UQResult(
        mode=mode_value,
        claim_tier=claim,
        median=summary["p50"],
        mean=summary["mean"],
        credible_interval={k: summary[k] for k in ("p05", "p25", "p50", "p75", "p95")},
        interval_kind=interval_kind,
        n_samples=int(rates.size),
        seed=seed,
        sensitivity=sensitivity,
        references=refs,
        notes=(
            "Sobol propagation over cited priors; "
            + ("posterior weighted to experimental band." if interval_kind ==
               "posterior_credible" else "prior-only predictive interval.")
        ),
    )


def _weighted_summary(values: np.ndarray, weights: np.ndarray) -> Dict[str, float]:
    """Weighted percentiles + mean (log-stable for many-decade spreads)."""
    order = np.argsort(values)
    v = values[order]
    w = weights[order]
    cw = np.cumsum(w)
    if cw[-1] <= 0:
        cw = np.arange(1, len(v) + 1, dtype=float)
    cw = cw / cw[-1]

    def q(p: float) -> float:
        return float(np.interp(p, cw, v))

    mean = float(np.average(values, weights=weights)) if weights.sum() > 0 else float(np.mean(values))
    return {
        "p05": q(0.05), "p25": q(0.25), "p50": q(0.50),
        "p75": q(0.75), "p95": q(0.95), "mean": mean,
    }


def _first_order_sensitivity(
    unit: np.ndarray, rates: np.ndarray, mode_value: str
) -> Dict[str, float]:
    """Cheap variance-based sensitivity: correlation of each input with log-rate."""
    if mode_value == RateMode.TRAPPED_STATE.value:
        names = [
            "screening_potential_eV",
            "tunneling_enhancement",
            "trap_separation_m",
            "cluster_lifetime_s",
            "fusion_probability",
        ]
    elif mode_value == RateMode.THREE_BODY.value:
        names = [
            "compression_ratio",
            "conversion_probability",
            "proton_fraction",
            "mass_renormalization",
        ]
    else:
        names = ["screening_potential_eV", "tunneling_enhancement"]
    log_rate = np.log10(np.clip(rates, 1e-300, None))
    out: Dict[str, float] = {}
    for i, name in enumerate(names):
        if i >= unit.shape[1]:
            break
        col = unit[:, i]
        if np.std(col) < 1e-12 or np.std(log_rate) < 1e-12:
            out[name] = 0.0
        else:
            out[name] = float(abs(np.corrcoef(col, log_rate)[0, 1]))
    total = sum(out.values()) or 1.0
    return {k: v / total for k, v in out.items()}


__all__ = [
    "UQResult",
    "propagate_rate_uncertainty",
    "ENHANCEMENT_PRIOR_LO",
    "ENHANCEMENT_PRIOR_HI",
]
