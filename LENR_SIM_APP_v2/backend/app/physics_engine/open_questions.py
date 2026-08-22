"""Additive open_questions ledger (RORO).

Builds the researcher-facing block for unified / bubble-lattice / theory-pipeline
responses. Defensive: callers should catch failures so the core contract never
breaks. Does not change contract_version.
"""
from __future__ import annotations

import logging
import math
from typing import Any, Dict, Mapping, Optional

from scipy import constants as const

from app.physics_engine.constants import MAX_ENHANCEMENT_FACTOR
from app.physics_engine.decision_oracle import (
    TWO_BODY_LOG10_N_EVENTS,
    evaluate_determination,
)
from app.physics_engine.unified_lenr_model.reaction_rate_engine import (
    DEFAULT_CLUSTER_LIFETIME_S,
    DEFAULT_TRAP_SEPARATION_M,
    DEFAULT_THREE_BODY_CONVERSION,
    DEFAULT_MASS_RENORMALIZATION,
    MAX_COLLECTIVE_FACTOR,
)

HBAR = const.hbar
E_CHARGE = const.e
Q_DD_HE4_MEV = 23.8
Q_DD_HE4_J = Q_DD_HE4_MEV * 1e6 * E_CHARGE
DEFAULT_PHONON_HZ = 1e13
DEFAULT_G_COUPLING = 1e-4
FCC_A_PD_M = 3.89e-10
TRAP_SEP_M = DEFAULT_TRAP_SEPARATION_M
# Heisenberg-Euler: 1 + (2α/45π)(E/E_cr)² ≈ 1 at 1e14 V/m (code comment).
# Weak-field Heisenberg-Euler at 1e14 V/m; PHYSICS_EQUATION_VERIFICATION 9C.3.
HEISENBERG_EULER_LAB_CORRECTION = 5.9e-13
LOGGER = logging.getLogger(__name__)
OBS_KEYS = (
    "excess_power_W",
    "sigma_Q_W",
    "he4_atoms_per_s",
    "gamma_cps_ul",
    "gamma_efficiency",
    "p_4_occupation",
)


def _phonon_order(omega_hz: float = DEFAULT_PHONON_HZ) -> Dict[str, Any]:
    e_ph = HBAR * 2.0 * math.pi * max(omega_hz, 1e-30)
    n_ph = Q_DD_HE4_J / max(e_ph, 1e-30)
    g = min(max(DEFAULT_G_COUPLING, 1e-300), 1.0 - 1e-15)
    if n_ph < 1e6:
        p_naive = g ** n_ph
    else:
        log_p = n_ph * math.log(g)
        p_naive = math.exp(log_p) if log_p > -700 else 0.0
    return {
        "phonon_order_N": float(n_ph),
        "omega_hz": float(omega_hz),
        "naive_g": float(g),
        "naive_g_to_N": float(p_naive),
        "naive_ruled_out": bool(p_naive < 1e-100 or g < 0.1),
        "lean_theorems": ["EQ-PHONON-N-01", "EQ-NAIVE-GN-01"],
    }


def _fcc_d_dd_m(a_m: float = FCC_A_PD_M) -> float:
    return a_m / (2.0 * math.sqrt(2.0))


def build_open_questions(
    *,
    route_mode: str,
    rate_mode: str = "two_body",
    pipeline_combined_enhancement: Optional[float] = None,
    bubble_peak_enhancement: Optional[float] = None,
    legacy_geometric_mean: Optional[float] = None,
    rate_block: Optional[Mapping[str, Any]] = None,
    two_body_reference: Optional[Mapping[str, Any]] = None,
    enabled_theories: Optional[list] = None,
    hagelstein_observables: Optional[Mapping[str, Any]] = None,
    observations: Optional[Mapping[str, Any]] = None,
    priors: Optional[Mapping[str, float]] = None,
    assumed_branching: Optional[Mapping[str, float]] = None,
    electrolyte_is_boundary_modifier: bool = True,
) -> Dict[str, Any]:
    """Assemble the additive open_questions object."""
    enabled = list(enabled_theories or [])
    mode = (rate_mode or "two_body").strip().lower()
    if mode not in {"two_body", "trapped_state", "three_body"}:
        mode = "two_body"
    fallback = route_mode == "local_fallback"

    phonon = _phonon_order()
    hag = dict(hagelstein_observables or {})
    if hag.get("n_phonons_needed"):
        phonon["phonon_order_N"] = float(hag["n_phonons_needed"])
    phonon_energy = float(hag.get("phonon_fraction") or 0.0) * Q_DD_HE4_MEV
    # Heuristic SPEC split never sums to Q — OPEN remainder is required.
    gamma_energy = 0.0
    recoil_energy = 0.0
    remainder = max(Q_DD_HE4_MEV - phonon_energy - gamma_energy - recoil_energy, 0.0)

    branching = dict(
        assumed_branching
        or {"he4": 1.0 - 1e-11, "n": 1e-11, "gamma": 0.0}
    )
    rate = dict((rate_block or {}).get("rate") or {})
    provenance = dict(rate.get("provenance") or {})
    unphysical = bool(provenance.get("unphysical"))
    uq = (rate_block or {}).get("uncertainty") or {}

    d_dd = _fcc_d_dd_m()
    engines_present = []
    if pipeline_combined_enhancement is not None:
        engines_present.append("theory_pipeline")
    if bubble_peak_enhancement is not None:
        engines_present.append("bubble_lattice")
    if legacy_geometric_mean is not None:
        engines_present.append("legacy_geometric_mean")

    pipe_v = float(pipeline_combined_enhancement) if pipeline_combined_enhancement is not None else None
    bub_v = float(bubble_peak_enhancement) if bubble_peak_enhancement is not None else None
    leg_v = float(legacy_geometric_mean) if legacy_geometric_mean is not None else None
    illegal = None
    if pipe_v is not None and bub_v is not None:
        illegal = pipe_v * bub_v

    tsc_leak = "takahashi_tsc" in enabled and mode == "two_body"

    determination = evaluate_determination(
        rate_mode=mode,
        route_mode=route_mode,
        two_body_log10_n_events=TWO_BODY_LOG10_N_EVENTS,
        unphysical=unphysical,
        observations=observations,
        priors=priors,
        uq_interval_kind=uq.get("interval_kind"),
    )

    q_mev = {
        "id": "EQ-OPEN-MEV-01",
        "status": "OPEN",
        "claim_tier": "speculative_exploratory",
        "phonon": phonon,
        "energy_partition_mev": {
            "phonon": phonon_energy,
            "gamma": gamma_energy,
            "recoil": recoil_energy,
            "open_remainder": remainder,
            "q_total": Q_DD_HE4_MEV,
            "label": "SPEC heuristic; remainder is OPEN (does not sum as solved).",
        },
        "lean_theorems": ["EQ-PHONON-N-01", "EQ-NAIVE-GN-01"],
        "kgrp_lock": "necessary_not_sufficient",
    }
    q_rad = {
        "id": "EQ-OPEN-RAD-01",
        "status": "OPEN",
        "claim_tier": "speculative_exploratory",
        "assumed_branching": branching,
        "assumed_branching_label": "assumed / scenario — not a derived Gamma_ph/Gamma_gamma",
        "hardcoded_product_gamma_is_not_a_limit": True,
        "detection_limit_note": "Publish BR_gamma < U/epsilon; do not cite product_gamma=0.",
        "lean_theorems": ["EQ-TSC-CH-01"],
    }
    q_stat = {
        "id": "EQ-OPEN-RATE-01",
        "status": "OPEN" if mode != "two_body" else "BUDGET_DOES_NOT_CLOSE",
        "claim_tier": "established_reference" if mode == "two_body" else "speculative_exploratory",
        "rate_mode": mode,
        "n_events_log10_two_body": TWO_BODY_LOG10_N_EVENTS,
        "sobol_is_not_calorimetry": True,
        "two_body_reference": dict(
            two_body_reference
            or (rate_block or {}).get("two_body_reference")
            or {}
        ),
        "open_priors": {
            "trap_separation_m": provenance.get("trap_separation_m", TRAP_SEP_M),
            "cluster_lifetime_s": provenance.get("cluster_lifetime_s", DEFAULT_CLUSTER_LIFETIME_S),
            "fusion_probability": provenance.get("fusion_probability"),
            "conversion_probability": provenance.get("conversion_probability", DEFAULT_THREE_BODY_CONVERSION),
            "mass_renormalization": provenance.get("mass_renormalization", DEFAULT_MASS_RENORMALIZATION),
            "collective_cap": MAX_COLLECTIVE_FACTOR,
        },
        "unphysical": unphysical,
        "lean_theorems": ["EQ-RATE-2B-NC-01", "EQ-RATE-REPLACE-01", "EQ-RATE-COND-01"],
    }
    q_ec = {
        "id": "EQ-OPEN-EC-01",
        "status": "OPEN",
        "claim_tier": "speculative_exploratory",
        "dimmed": True,
        "lean_theorems": ["EQ-3B-MASS-DOM-01"],
    }
    q_yield = {
        "id": "EQ-OPEN-YIELD-01",
        "status": "OPEN",
        "claim_tier": "empirical_lenr_correlation",
        "dimmed": True,
        "lean_theorems": ["EQ-MILES-CONV-01"],
    }

    emp_chips = []
    if not fallback:
        emp_chips.append({
            "id": "miles_q_band",
            "label": "Miles 24±4 MeV/He EMP",
            "result": determination.get("oracle_emp", {}).get("miles_band_gate"),
            "claim_tier": "empirical_lenr_correlation",
        })
        emp_chips.append({
            "id": "aneutronic_table",
            "label": "Aneutronic product-table (schema, not a detector)",
            "result": "schema_only",
            "claim_tier": "empirical_lenr_correlation",
        })

    return {
        "contract_note": "additive",
        "schema": "lenr-open-questions-v1",
        "route_mode": route_mode,
        "rate_mode": mode,
        "determination": determination,
        "q_mev_gap": q_mev,
        "q_radiation": q_rad,
        "q_statistical": q_stat,
        "q_electron_capture": q_ec,
        "q_integrated_yield": q_yield,
        "composition": {
            "pipeline_combined_enhancement": pipe_v,
            "bubble_peak_enhancement": bub_v,
            "legacy_geometric_mean": leg_v,
            "engines_present": engines_present,
            "not_combinable": True,
            "illegal_product": illegal,
            "illegal_product_label": "not physical — pedagogy only",
            "electrolyte_is_boundary_modifier": bool(electrolyte_is_boundary_modifier),
            "cap": MAX_ENHANCEMENT_FACTOR,
            "tsc_enhancement_can_scale_two_body": tsc_leak,
            "tsc_leak_note": (
                "takahashi_tsc enhancement is a coherence-group rival, not a "
                "two_body rate factor. Do not multiply by trapped_state."
                if tsc_leak else None
            ),
            "lean_theorems": ["EQ-COMP-01", "EQ-COMP-02", "EQ-COMP-03"],
        },
        "nbody": {
            "modes_replace_not_product": True,
            "fcc_d_DD_m": d_dd,
            "trap_separation_m": TRAP_SEP_M,
            "geometry_neq_trap": abs(d_dd - TRAP_SEP_M) > 1e-12,
            "p4_occupation_is_open": True,
            "q_4d_mev": 47.6,
            "lean_theorems": [
                "EQ-RATE-REPLACE-01",
                "EQ-TSC-GEOM-01",
                "EQ-TSC-GEOM-02",
                "EQ-COLL-LIN-01",
                "EQ-TSC-Q-01",
            ],
        },
        "mhd_qed": {
            "coupling_kind": "mhd_to_mhd_cascade",
            "qed_operator": "none",
            "heisenberg_euler_lab_correction": HEISENBERG_EULER_LAB_CORRECTION,
            "lean_theorems": ["EQ-SCALE-MHD-DOM-01", "EQ-QED-HE-NEG-01"],
        },
        "emp_chips": emp_chips,
        "open_ids": [
            "EQ-OPEN-MEV-01",
            "EQ-OPEN-RAD-01",
            "EQ-OPEN-RATE-01",
            "EQ-OPEN-EC-01",
            "EQ-OPEN-YIELD-01",
        ],
        "ui_phrase_class": "consistency_or_odds_only",
        "lenr_proved": False,
    }


def observations_from_obj(src: Any) -> Dict[str, Any]:
    """Pull optional lab ingest fields from a request model or mapping."""
    out: Dict[str, Any] = {}
    for key in OBS_KEYS:
        if isinstance(src, Mapping):
            value = src.get(key)
        else:
            value = getattr(src, key, None)
        if value is not None:
            out[key] = value
    return out


def safe_build_open_questions(**kwargs: Any) -> Dict[str, Any]:
    """Never raise: a cockpit failure must not 500 the core contract."""
    try:
        return build_open_questions(**kwargs)
    except Exception:
        LOGGER.exception("open_questions builder failed; omitting additive block")
        return {}
