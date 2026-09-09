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
    occurrence_anchored,
)
from app.physics_engine.many_body.branching_model import (
    branching_inconsistent_with_ul,
    compute_branching_partition,
    detector_gamma_ul_log10,
)
from app.physics_engine.many_body.fgr_model import (
    GeometryMode,
    bernoulli_p4,
    fcc_d_dd_m,
    trap_separation_m,
)
from app.physics_engine.mechanism_path_diagrams import enrich_mechanism_paths
from app.physics_engine.open_question_details import (
    ElectronCaptureQuestionInput,
    IntegratedYieldQuestionInput,
    build_electron_capture_question,
    build_integrated_yield_question,
)
from app.physics_engine.unified_lenr_model.reaction_rate_engine import (
    DEFAULT_CLUSTER_LIFETIME_S,
    DEFAULT_MASS_RENORMALIZATION,
    DEFAULT_THREE_BODY_CONVERSION,
    DEFAULT_TRAP_SEPARATION_M,
    MAX_COLLECTIVE_FACTOR,
)
from app.physics_engine.working_hypothesis import (
    compute_working_hypothesis,
    default_gamma_tun_by_geometry,
    default_n_sites_per_m3,
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


# Nominal active volume for calorimetric threshold bookkeeping (1 cm³).
NOMINAL_ACTIVE_VOLUME_M3 = 1e-6

_MECHANISM_LEAN_IDS = {
    "trapped_state": ["EQ-NBODY-FGR-01", "EQ-TSC-GEOM-01", "EQ-TRAP-SEP-01"],
    "phonon_cascade": ["EQ-PHONON-N-01", "EQ-BRANCH-LATTICE-01"],
    "three_body": ["EQ-3B-SEQ-01", "EQ-3B-MASS-DOM-01"],
}


def _log10_n_events(rate_per_m3_s: float, volume_m3: float, time_s: float) -> Optional[float]:
    n = float(rate_per_m3_s) * float(volume_m3) * float(time_s)
    if n <= 0:
        return None
    return math.log10(n)


def _observed_volumetric_rate_floor(excess_power_w: float, volume_m3: float) -> float:
    """Minimum volumetric reaction rate consistent with observed excess power."""
    vol = max(float(volume_m3), 1e-30)
    return float(excess_power_w) / (Q_DD_HE4_J * vol)


def _fgr_parameters_from_rate(
    rate: Mapping[str, Any],
    *,
    loading_ratio: float,
    geometry_mode: Optional[str],
) -> Dict[str, Any]:
    prov = dict(rate.get("provenance") or {})
    mode = str(rate.get("mode") or "two_body")
    if mode == "two_body":
        return {
            "mode": mode,
            "P_occ": None,
            "Gamma_tun": prov.get("tunneling_probability"),
            "f_nuc": None,
            "C_lin": 1.0,
            "geometry_mode": None,
            "log10_n_events": None,
        }
    geom = geometry_mode or prov.get("geometry_mode") or "trap_25pm_default"
    p_occ = prov.get("P_occ")
    if p_occ is None and mode == "trapped_state":
        p_occ = bernoulli_p4(loading_ratio)
    return {
        "mode": mode,
        "P_occ": p_occ,
        "Gamma_tun": prov.get("fgr_Gamma_tun") or prov.get("barrier_penetration"),
        "f_nuc": prov.get("fusion_probability"),
        "C_lin": prov.get("fgr_C_lin") or prov.get("collective_factor"),
        "geometry_mode": geom,
        "trap_separation_m": prov.get("trap_separation_m"),
        "log10_n_events": None,
    }


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
    loading_ratio: float = 0.9,
    total_time: float = 10.0,
    duty_fraction: Optional[float] = None,
    geometry_mode: Optional[str] = None,
    stimulation: Optional[Mapping[str, Any]] = None,
    active_volume_m3: Optional[float] = None,
    kgrp_locked: bool = False,
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
    phonon_frac = float(hag.get("phonon_fraction") or 0.0)
    phonon_energy = phonon_frac * Q_DD_HE4_MEV

    branching = dict(
        assumed_branching
        or {"he4": 1.0 - 1e-11, "n": 1e-11, "gamma": 0.0}
    )
    branch_part = compute_branching_partition(
        branching,
        phonon_fraction=phonon_frac,
    )
    gamma_energy = float(branch_part["gamma_mev"])
    recoil_energy = float(branch_part["recoil_mev"])
    remainder = max(
        Q_DD_HE4_MEV - phonon_energy - gamma_energy - recoil_energy, 0.0
    )
    rate = dict((rate_block or {}).get("rate") or {})
    provenance = dict(rate.get("provenance") or {})
    unphysical = bool(provenance.get("unphysical"))
    uq = (rate_block or {}).get("uncertainty") or {}

    d_dd = fcc_d_dd_m(FCC_A_PD_M)
    obs = dict(observations or {})
    anchored = occurrence_anchored(obs)
    emp_gates: list[str] = []
    if anchored:
        emp_gates.append("miles_q_band")
    if obs.get("gamma_cps_ul") is not None:
        emp_gates.append("gamma_ul_ingest")

    vol = float(active_volume_m3 or NOMINAL_ACTIVE_VOLUME_M3)
    duty = float(duty_fraction) if duty_fraction is not None else 1.0
    duty = max(0.0, min(duty, 1.0))
    stim = dict(stimulation or {})
    letts = bool(stim.get("letts_laser"))
    acoustic = bool(stim.get("acoustic_drive"))
    bubble_drive = route_mode.startswith("bubble")
    stimulation_active = letts or acoustic or bubble_drive
    hagelstein_enabled = "hagelstein_phonon" in enabled

    rate_per_m3 = float(rate.get("rate_per_m3_s") or 0.0)
    active_log10_n = _log10_n_events(rate_per_m3, vol, total_time * duty)
    threshold_crossed: Optional[bool] = None
    power = obs.get("excess_power_W")
    if power is not None and float(power) > 0:
        r_obs = _observed_volumetric_rate_floor(float(power), vol)
        threshold_crossed = rate_per_m3 >= r_obs

    ul_log10 = detector_gamma_ul_log10(
        obs.get("gamma_cps_ul"),
        obs.get("gamma_efficiency"),
        obs.get("he4_atoms_per_s"),
    )
    branch_inconsistent = branching_inconsistent_with_ul(
        float(branch_part["gamma_fraction"]),
        ul_log10,
    )

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
        hagelstein_enabled=hagelstein_enabled,
        kgrp_locked=bool(kgrp_locked),
        branching_inconsistent=branch_inconsistent,
        threshold_crossed=threshold_crossed,
        active_mode_log10_n=active_log10_n,
    )

    posteriors = {
        row["id"]: float(row["posterior"])
        for row in determination.get("oracle_b", {}).get("hypotheses", [])
    }
    mechanism_paths = [
        {
            "id": path_id,
            "posterior": posteriors.get(path_id, 0.0),
            "lean_ids": _MECHANISM_LEAN_IDS.get(path_id, []),
        }
        for path_id in ("trapped_state", "phonon_cascade", "three_body")
    ]
    try:
        mechanism_paths = enrich_mechanism_paths(mechanism_paths)
    except Exception:
        LOGGER.exception(
            "mechanism-path diagram enrichment failed; using plain path rows"
        )
    fgr_params = _fgr_parameters_from_rate(
        rate,
        loading_ratio=float(loading_ratio),
        geometry_mode=geometry_mode,
    )
    if active_log10_n is not None:
        fgr_params["log10_n_events"] = active_log10_n
    trapped_ref = dict((rate_block or {}).get("two_body_reference") or {})
    trapped_log10 = None
    if trapped_ref:
        trapped_log10 = _log10_n_events(
            float(trapped_ref.get("rate_per_m3_s") or 0.0), vol, total_time * duty
        )

    occurrence = {
        "anchored": anchored,
        "emp_gates": emp_gates,
        "note": (
            "EMP anchors when occurrence is in band, not how the mechanism works."
            if anchored
            else "No Miles-class simultaneous heat–He ingest; occurrence not anchored."
        ),
    }
    when = {
        "threshold_crossed": threshold_crossed,
        "duty_cycle_s": float(total_time) * duty,
        "loading_ratio": float(loading_ratio),
        "stimulation_active": stimulation_active,
        "stimulation": {
            "letts_laser": letts,
            "acoustic_drive": acoustic,
            "bubble_drive": bubble_drive,
        },
        "two_body_reference_log10_n": TWO_BODY_LOG10_N_EVENTS,
        "active_mode_log10_n": active_log10_n,
        "trapped_state_log10_n": trapped_log10 if mode != "trapped_state" else active_log10_n,
        "three_body_log10_n": active_log10_n if mode == "three_body" else None,
        "nominal_volume_m3": vol,
        "lean_theorems": ["EQ-WHEN-THRESH-01", "EQ-WHEN-DUTY-01"],
    }
    how = {
        "mechanism_paths": mechanism_paths,
        "active_rate_mode": mode,
        "best_mechanism_path": determination.get("oracle_b", {}).get(
            "best_mechanism_path"
        ),
        "fgr_parameters": fgr_params,
        "lean_theorems": ["EQ-MECH-PATH-01", "EQ-NBODY-FGR-01"],
    }

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
        "required_V_nuc_sketch": (
            "WOULD_CLOSE_IF: |V_eff| such that cascade rate matches excess_power_W "
            "(not solved here)."
            if obs.get("excess_power_W") else None
        ),
    }
    q_rad = {
        "id": "EQ-OPEN-RAD-01",
        "status": "OPEN",
        "claim_tier": "speculative_exploratory",
        "assumed_branching": branching,
        "assumed_branching_label": "assumed / scenario — not a derived Gamma_ph/Gamma_gamma",
        "hardcoded_product_gamma_is_not_a_limit": True,
        "detection_limit_note": "Publish BR_gamma < U/epsilon; do not cite product_gamma=0.",
        "detector_ul_log10": ul_log10,
        "branching_inconsistent_with_ul": branch_inconsistent,
        "lattice_gamma_target": branch_part["lattice_gamma_target"],
        "lattice_gamma_target_label": branch_part["lattice_gamma_target_label"],
        "lean_theorems": list(branch_part["lean_theorems"]),
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
    q_ec = build_electron_capture_question(
        ElectronCaptureQuestionInput(
            mode=mode,
            rate_provenance=provenance,
        )
    )
    q_yield = build_integrated_yield_question(
        IntegratedYieldQuestionInput(
            observations=obs,
            total_time_s=total_time,
            duty_fraction=duty,
        )
    )

    working_hypothesis = compute_working_hypothesis(
        phonon_energy_mev=phonon_energy,
        gamma_energy_mev=gamma_energy,
        recoil_energy_mev=recoil_energy,
        open_remainder_mev=remainder,
        q_total_mev=Q_DD_HE4_MEV,
        naive_ruled_out=bool(phonon.get("naive_ruled_out")),
        rate_per_m3_s=rate_per_m3,
        active_volume_m3=vol,
        excess_power_w=float(power) if power is not None else None,
        loading_ratio=float(loading_ratio),
        fgr_params=fgr_params,
        g_coupling=float(phonon.get("naive_g") or DEFAULT_G_COUPLING),
        n_sites_per_m3=default_n_sites_per_m3(float(loading_ratio)),
        gamma_tun_by_geometry=default_gamma_tun_by_geometry(),
    )
    q_mev["working_hypothesis_id"] = working_hypothesis["id"]
    q_mev["lean_theorems"] = list(q_mev["lean_theorems"]) + [
        "EQ-WH-PART-01",
        "EQ-WH-STOP-01",
        "EQ-WH-NONCLOSE-01",
        "EQ-WH-PART-02",
        "EQ-WH-DICKE-N-01",
    ]
    q_rad["working_hypothesis_id"] = working_hypothesis["id"]
    q_rad["derived_bound"] = working_hypothesis["q2"]["derived_bound"]
    q_rad["branching_is_scenario_input"] = True
    q_rad["lean_theorems"] = list(q_rad["lean_theorems"]) + [
        "EQ-WH-BOUND-01",
        "EQ-WH-NONCLOSE-01",
        "EQ-WH-FC-01",
    ]
    q_stat["working_hypothesis_id"] = working_hypothesis["id"]
    q_stat["R_obs_per_m3_s"] = working_hypothesis["q3"]["R_obs_per_m3_s"]
    q_stat["lean_theorems"] = list(q_stat["lean_theorems"]) + [
        "EQ-WH-FLOOR-01",
        "EQ-WH-NONCLOSE-01",
        "EQ-WH-CAP-01",
    ]
    when["R_obs_per_m3_s"] = working_hypothesis["q3"]["R_obs_per_m3_s"]
    when["R_mode_per_m3_s"] = working_hypothesis["q3"]["R_mode_per_m3_s"]
    how["working_hypothesis_id"] = working_hypothesis["id"]

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
        "occurrence": occurrence,
        "when": when,
        "how": how,
        "q_mev_gap": q_mev,
        "q_radiation": q_rad,
        "q_statistical": q_stat,
        "q_electron_capture": q_ec,
        "q_integrated_yield": q_yield,
        "working_hypothesis": working_hypothesis,
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
            "fcc_tetrahedral_separation_m": trap_separation_m(GeometryMode.FCC_TETRAHEDRAL),
            "geometry_mode": geometry_mode,
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
    """Never raise: a virtual lab failure must not 500 the core contract."""
    try:
        return build_open_questions(**kwargs)
    except Exception:
        LOGGER.exception("open_questions builder failed; omitting additive block")
        return {}
