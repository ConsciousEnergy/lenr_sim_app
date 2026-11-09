"""
Uncertainty quantification for collapse observables and the mechanism breakdown.

Only the reaction rate carried a real physics interval
(:mod:`unified_lenr_model.reaction_rate_uq`). Peak temperature, peak pressure,
minimum radius and every mechanism in the enhancement breakdown were reported as
bare point estimates, even though the inputs they depend on have cited ranges
spanning more than an order of magnitude (Pd screening potential is 250-18000 eV).

Method: Sobol propagation through the *closed-form* collapse relations rather
than re-integrating the Rayleigh-Plesset ODE per sample. Re-solving would cost
~50 ms per sample and make the block unusable inside a request; the closed-form
adiabatic laws are exactly what ``simulate_collapse`` uses to map a compression
ratio onto the reported peak conditions, so the propagation is faithful to the
reported quantities.

Each sampled dimension is labelled by provenance, ``cited_range`` or
``model_assumption``, so a reader can tell measured spread from assumed spread.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

import numpy as np
from scipy.stats import qmc

from app.physics_engine.constants import MAX_ENHANCEMENT_FACTOR
from app.physics_engine.unified_lenr_model.screening_data import (
    get_screening_potential_range,
)

#: Reported percentiles, matching reaction_rate_uq.UQResult.credible_interval.
PERCENTILES = (5.0, 25.0, 50.0, 75.0, 95.0)
PERCENTILE_KEYS = ("p05", "p25", "p50", "p75", "p95")
_PERCENTILE_KEYS = PERCENTILE_KEYS

#: Fractional tolerance on the compression ratio returned by the ODE solve.
#: Model assumption, not a measurement: it stands in for sensitivity to the
#: acoustic drive amplitude and the hard-core floor, both of which move R_min.
COMPRESSION_RATIO_TOLERANCE = 0.20

#: Fractional tolerance on the polytropic index. Gas-mixture composition inside a
#: cavitating bubble is not measured per run, and the tabulated values span
#: ~1.33 (vapour) to ~1.67 (monatomic). Model assumption.
POLYTROPIC_INDEX_TOLERANCE = 0.05

#: Public Nat-scale anchors for Lean ↔ Python agreement (EQ-BBL-UQ-01).
SAMPLED_DIMENSIONS = (
    "screening_potential_ev",
    "compression_ratio",
    "polytropic_index",
)
_SAMPLED_DIMENSIONS = SAMPLED_DIMENSIONS
SAMPLED_DIMENSION_COUNT = len(SAMPLED_DIMENSIONS)


def _sample_unit(n_samples: int, n_dims: int, seed: int) -> np.ndarray:
    """Deterministic Sobol sample in the unit hypercube.

    Mirrors reaction_rate_uq._sample_unit so both UQ layers share one sampling
    convention (Sobol prefers powers of two; round up then trim).
    """
    sampler = qmc.Sobol(d=n_dims, scramble=True, seed=seed)
    m = int(np.ceil(np.log2(max(n_samples, 2))))
    return sampler.random_base2(m=m)[:n_samples]


def _loguniform(unit: np.ndarray, lo: float, hi: float) -> np.ndarray:
    """Map [0,1) samples onto a log-uniform range."""
    lo = max(float(lo), 1e-30)
    hi = max(float(hi), lo * (1.0 + 1e-12))
    return np.power(10.0, np.log10(lo) + unit * (np.log10(hi) - np.log10(lo)))


def _percentiles(values: np.ndarray) -> Dict[str, float]:
    finite = values[np.isfinite(values)]
    if finite.size == 0:
        return {key: 0.0 for key in _PERCENTILE_KEYS}
    computed = np.percentile(finite, PERCENTILES)
    return {key: float(value) for key, value in zip(_PERCENTILE_KEYS, computed)}


def _summary(values: np.ndarray, *, unit: str) -> Dict[str, Any]:
    finite = values[np.isfinite(values)]
    return {
        "unit": unit,
        "median": float(np.median(finite)) if finite.size else 0.0,
        "mean": float(np.mean(finite)) if finite.size else 0.0,
        "credible_interval": _percentiles(values),
        "interval_kind": "predictive",
    }


def _first_order_sensitivity(
    samples: Dict[str, np.ndarray], response: np.ndarray
) -> Dict[str, float]:
    """Correlation-ratio sensitivity of ``response`` to each sampled input.

    First-order and cheap: the squared Spearman-style rank correlation in log
    space, normalised to sum to one. Enough to rank which input dominates the
    spread, which is the question a reader actually has.
    """
    log_response = np.log10(np.maximum(response, 1e-300))
    scores: Dict[str, float] = {}
    for name, values in samples.items():
        if np.allclose(values, values[0]):
            scores[name] = 0.0
            continue
        log_values = np.log10(np.maximum(values, 1e-300))
        if np.std(log_values) == 0 or np.std(log_response) == 0:
            scores[name] = 0.0
            continue
        correlation = float(np.corrcoef(log_values, log_response)[0, 1])
        scores[name] = correlation**2 if np.isfinite(correlation) else 0.0

    total = sum(scores.values())
    if total <= 0:
        return {name: 0.0 for name in scores}
    return {name: value / total for name, value in scores.items()}


def _first_order_sensitivity_linear(
    samples: Dict[str, np.ndarray], response: np.ndarray
) -> Dict[str, float]:
    """Sensitivity for a response that is already in log space.

    Taking log10 of a log10 quantity would compress the very spread being ranked
    (and go negative), so the response is used as-is here.
    """
    scores: Dict[str, float] = {}
    for name, values in samples.items():
        log_values = np.log10(np.maximum(values, 1e-300))
        if np.std(log_values) == 0 or np.std(response) == 0:
            scores[name] = 0.0
            continue
        correlation = float(np.corrcoef(log_values, response)[0, 1])
        scores[name] = correlation**2 if np.isfinite(correlation) else 0.0

    total = sum(scores.values())
    if total <= 0:
        return {name: 0.0 for name in scores}
    return {name: value / total for name, value in scores.items()}


def propagate_collapse_uncertainty(
    *,
    model: Any,
    compression_ratio: float,
    temperature_ceiling: float,
    pressure_ceiling: float,
    n_samples: int = 128,
    seed: Optional[int] = None,
    material: str = "palladium",
) -> Dict[str, Any]:
    """Predictive intervals for collapse observables and mechanisms (RORO).

    Args:
        model: A ``BubbleLatticeInteraction``, used for its bubble/lattice
            parameters and its mechanism breakdown.
        compression_ratio: Deterministic compression ratio from the ODE solve.
        temperature_ceiling: Reporting ceiling applied to peak temperature (K).
        pressure_ceiling: Reporting ceiling applied to peak pressure (Pa).
        n_samples: Sobol sample count.
        seed: Deterministic seed; ``None`` uses a fixed default.
        material: Host material key for the cited screening range.

    Returns:
        Dict with ``observables``, ``mechanisms``, ``sensitivity``, ``inputs`` and
        ``provenance``. Empty dict is never returned; callers treat this as
        additive and non-fatal.
    """
    seed = 20260808 if seed is None else int(seed)
    n_samples = int(max(16, min(int(n_samples), 4096)))

    bubble = model.bubble
    scr = get_screening_potential_range(material)
    prior = scr.as_uq_prior()

    unit = _sample_unit(n_samples, len(_SAMPLED_DIMENSIONS), seed)

    screening_ev = _loguniform(unit[:, 0], prior["min_eV"], prior["max_eV"])
    cr_lo = max(compression_ratio * (1.0 - COMPRESSION_RATIO_TOLERANCE), 1.0)
    cr_hi = min(
        compression_ratio * (1.0 + COMPRESSION_RATIO_TOLERANCE),
        float(model.MAX_COMPRESSION_RATIO),
    )
    compression = _loguniform(unit[:, 1], cr_lo, max(cr_hi, cr_lo * (1.0 + 1e-9)))

    gamma_nominal = float(bubble.polytropic_index)
    gamma = gamma_nominal * (
        1.0 + POLYTROPIC_INDEX_TOLERANCE * (2.0 * unit[:, 2] - 1.0)
    )

    # Closed-form collapse relations, the same mapping simulate_collapse reports.
    temperature = np.minimum(
        bubble.ambient_temperature * compression ** (3.0 * (gamma - 1.0)),
        temperature_ceiling,
    )
    pressure = np.minimum(
        bubble.ambient_pressure * compression ** (3.0 * gamma), pressure_ceiling
    )
    min_radius_um = (bubble.initial_radius / compression) * 1e6
    peak_field = bubble.double_layer_field * compression**2

    # Mechanism breakdown per sample. Vectorising the breakdown would duplicate
    # its formulae, so it is called directly; n_samples is bounded for this reason.
    mechanism_names = (
        "screening",
        "phonon",
        "qed",
        "casimir",
        "rydberg",
        "compression",
        "loading",
        "total",
    )
    collected: Dict[str, List[float]] = {name: [] for name in mechanism_names}
    original_potential = model.lattice.screening_potential
    try:
        for index in range(n_samples):
            model.lattice.screening_potential = float(screening_ev[index])
            breakdown = model._calculate_enhancement_breakdown(
                float(temperature[index]),
                float(pressure[index]),
                float(peak_field[index]),
                float(compression[index]),
            )
            for name in mechanism_names:
                collected[name].append(float(breakdown.get(name, 1.0)))
    finally:
        model.lattice.screening_potential = original_potential

    mechanism_arrays = {name: np.asarray(values) for name, values in collected.items()}
    sampled = {
        "screening_potential_ev": screening_ev,
        "compression_ratio": compression,
        "polytropic_index": gamma,
    }

    # `total` from the breakdown is already clamped at the display ceiling, so at
    # peak conditions every sample equals 1e5 and any sensitivity computed on it is
    # identically zero. Accumulate the uncapped product in log space instead, the
    # same trick build_saturation_report uses to survive overflow.
    contributing = [
        name for name in mechanism_names if name != "total"
    ]
    log10_total_raw = np.zeros(n_samples)
    for name in contributing:
        log10_total_raw = log10_total_raw + np.log10(
            np.maximum(mechanism_arrays[name], 1e-300)
        )

    return {
        "observables": {
            "peak_temperature_k": _summary(temperature, unit="K"),
            "peak_pressure_pa": _summary(pressure, unit="Pa"),
            "min_radius_um": _summary(min_radius_um, unit="um"),
            "peak_field_v_m": _summary(peak_field, unit="V/m"),
        },
        "mechanisms": {
            name: _summary(values, unit="dimensionless")
            for name, values in mechanism_arrays.items()
        },
        # Uncapped total in log space, so a saturated point estimate still has a
        # reportable spread.
        "log10_total_enhancement_raw": _summary(log10_total_raw, unit="log10"),
        "sensitivity": {
            "log10_total_enhancement_raw": _first_order_sensitivity_linear(
                sampled, log10_total_raw
            ),
            "peak_temperature": _first_order_sensitivity(sampled, temperature),
        },
        "inputs": {
            "n_samples": n_samples,
            "seed": seed,
            "sampler": "scipy.stats.qmc.Sobol(scramble=True)",
            "dimensions": {
                "screening_potential_ev": {
                    "distribution": "log_uniform",
                    "low": prior["min_eV"],
                    "high": prior["max_eV"],
                    "provenance": "cited_range",
                    "citations": list(scr.citations),
                },
                "compression_ratio": {
                    "distribution": "log_uniform",
                    "low": float(cr_lo),
                    "high": float(cr_hi),
                    "provenance": "model_assumption",
                    "note": (
                        f"+/-{COMPRESSION_RATIO_TOLERANCE:.0%} around the ODE solution, "
                        "standing in for acoustic-drive and hard-core-floor sensitivity."
                    ),
                },
                "polytropic_index": {
                    "distribution": "uniform",
                    "low": float(gamma_nominal * (1.0 - POLYTROPIC_INDEX_TOLERANCE)),
                    "high": float(gamma_nominal * (1.0 + POLYTROPIC_INDEX_TOLERANCE)),
                    "provenance": "model_assumption",
                    "note": "Bubble gas-mixture composition is not measured per run.",
                },
            },
        },
        "provenance": {
            "method": "sobol_closed_form_collapse_relations",
            "claim_tier": "speculative_exploratory",
            "display_ceiling": float(MAX_ENHANCEMENT_FACTOR),
            "note": (
                "Intervals propagate input ranges through the same closed-form "
                "adiabatic relations the point estimate uses; they are not a "
                "measurement uncertainty and do not include model-form error. "
                "Mechanism intervals are clipped by the display ceiling where "
                "the point estimate saturates."
            ),
        },
    }
