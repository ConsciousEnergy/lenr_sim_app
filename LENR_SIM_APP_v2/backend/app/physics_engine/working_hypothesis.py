"""WH-ENP-01 coupled ledger (RORO).

Speculative working hypothesis for §5A Q1–Q3. Does not discharge EQ-OPEN-*.
Never sets lenr_proved. Two-body baseline is unchanged.
"""
from __future__ import annotations

import math
from typing import Any, Dict, Mapping, Optional

from scipy import constants as const

from app.physics_engine.constants import (
    QED_VACUUM_COEFFICIENT,
    SCHWINGER_CRITICAL_FIELD_V_M,
)
from app.physics_engine.many_body.branching_model import LATTICE_GAMMA_TARGET
from app.physics_engine.many_body.fgr_model import (
    GeometryMode,
    bernoulli_p4,
    trap_separation_m,
)
from app.physics_engine.many_body.wh_bounds import (
    PD_D_NUMBER_DENSITY_M3,
    closure_demand,
    coupling_scan,
    dicke_count,
    franck_condon_tail,
)

HBAR = const.hbar
H_PLANCK = const.h
E_CHARGE = const.e
ALPHA = const.alpha
KB = const.k
C = const.c

WH_ID = "WH-ENP-01"
Q_DD_HE4_MEV = 23.8
Q_4D_MEV = 47.6
ALPHA_KE_MEV = 23.8
CLAIM_TIER = "speculative_exploratory"
# Pd Debye temperature ~274 K (Ashcroft/Mermin band); k_B θ_D ≈ 24 meV.
PD_DEBYE_K = 274.0
# Optical/acoustic scale used with paper ħω ~ 50 meV / 10 THz (model assumption).
PHONON_HZ = 1e13
PD_SOUND_M_S = 3070.0
# Paper §5A.1 Dicke example: N ~ 1e4 in ~6.6 nm domain.
PAPER_DICKE_DOMAIN_M = 6.6e-9
# Order-of-magnitude CSDA range for ~24 MeV He in Pd (model assumption).
ALPHA_CSDA_RANGE_PD_M = 4.0e-5
LAB_FIELD_V_M = 1e14
REFERENCES = (
    "Hagelstein (2025), JCMNS phonon-nuclear matrix — hagelstein2025",
    "Takahashi (2016), JCMNS 19, 298 — takahashi2016",
    "Heisenberg & Euler (1936); Schwinger Phys. Rev. 82, 664 (1951) — EQ-QED-HE-NEG-01",
)


def _phonon_wavelength_m(omega_hz: float = PHONON_HZ) -> float:
    return PD_SOUND_M_S / max(float(omega_hz), 1.0)


def dicke_radius_m(omega_hz: float = PHONON_HZ) -> float:
    """Cooperation radius λ/(2π). N² is licensed only if domain ≤ this scale."""
    return _phonon_wavelength_m(omega_hz) / (2.0 * math.pi)


def derive_lattice_gamma_bound(*, g_coupling: float = 1e-4) -> Dict[str, Any]:
    """First-principles harmonic bound for Γ_ph/Γ_γ (EQ-WH-BOUND-01).

    Harmonic phonons vanish above the Debye cutoff (~24 meV in Pd), so the
    lattice DOS at 23.8 MeV is identically zero. The derived ratio is 0 and
    cannot meet the 10^11 target. Umklapp/defect boosts are unlabeled AX and
    are not inserted here.
    """
    debye_mev = (KB * PD_DEBYE_K) / E_CHARGE * 1e3
    g = min(max(float(g_coupling), 1e-300), 1.0)
    g_over_alpha_sq = (g / ALPHA) ** 2
    harmonic_dos_at_q = 0.0
    ratio = 0.0
    return {
        "g_coupling": g,
        "g_over_alpha_sq": float(g_over_alpha_sq),
        "pd_debye_mev": float(debye_mev),
        "harmonic_phonon_dos_at_q": harmonic_dos_at_q,
        "derived_gamma_ph_over_gamma_gamma": ratio,
        "log10_derived_ratio": None,
        "lattice_gamma_target": float(LATTICE_GAMMA_TARGET),
        "meets_target": False,
        "branching_is_scenario_input": True,
        "claim_tier": CLAIM_TIER,
        "label": (
            "Harmonic ρ_ph(Q)=0 above Debye cutoff; derived Γ_ph/Γ_γ = 0 "
            "< 10^11. Assumed branching remains scenario input."
        ),
        "lean_theorems": ["EQ-WH-BOUND-01", "EQ-BRANCH-LATTICE-01"],
        "references": list(REFERENCES),
    }


def neutron_moderation_lengths_m() -> Dict[str, Any]:
    """Order-of-magnitude 2.45 MeV n thermalization lengths (model assumption)."""
    return {
        "neutron_energy_mev": 2.45,
        "media": {
            "liquid_d2o": {
                "length_m": 0.06,
                "label": "liquid",
                "provenance": "model assumption (H-rich slowing-down length, cm scale)",
            },
            "solid_pdh": {
                "length_m": 0.08,
                "label": "solid",
                "provenance": "model assumption (comparable H density to water)",
            },
            "gas_d2_stp": {
                "length_m": 60.0,
                "label": "gas",
                "provenance": "model assumption (~10^3 lower H density than liquid)",
            },
            "plasma": {
                "length_m": None,
                "label": "plasma",
                "provenance": "not a condensed moderator; length unbounded here",
            },
        },
        "closes_mev_gap": False,
        "note": "Residual n-branch only; does not partition 23.8 MeV on the ⁴He channel.",
    }


def child_product_channels() -> list[Dict[str, Any]]:
    """Finite channel DAG — not a Feynman path integral."""
    return [
        {
            "id": "dd_he4_phonons",
            "q_mev": Q_DD_HE4_MEV,
            "primary_gamma_required": "open",
            "weight_kind": "assumed",
            "lean_ids": ["EQ-QDD-01", "EQ-OPEN-MEV-01"],
        },
        {
            "id": "tsc_4d_2alpha",
            "q_mev": Q_4D_MEV,
            "primary_gamma_required": False,
            "weight_kind": "kinematics_only",
            "lean_ids": ["EQ-TSC-Q-01", "EQ-TSC-CH-01", "EQ-TSC-STOP-01"],
        },
        {
            "id": "dd_t_p",
            "q_mev": 4.03,
            "primary_gamma_required": False,
            "weight_kind": "conventional_branch",
            "lean_ids": [],
        },
        {
            "id": "dd_n_he3",
            "q_mev": 3.27,
            "primary_gamma_required": False,
            "weight_kind": "conventional_branch",
            "lean_ids": [],
        },
    ]


def heisenberg_euler_lab_factor(e_field_v_m: float = LAB_FIELD_V_M) -> float:
    return 1.0 + QED_VACUUM_COEFFICIENT * (float(e_field_v_m) / SCHWINGER_CRITICAL_FIELD_V_M) ** 2


def default_gamma_tun_by_geometry() -> Dict[str, float]:
    """Gamow WKB penetration per rival trap geometry (engine helper, D+D in Pd)."""
    from app.physics_engine.unified_lenr_model.config import SimulationConfig
    from app.physics_engine.unified_lenr_model.reaction_rate_engine import (
        _gamow_penetration,
    )

    config = SimulationConfig()
    return {
        geometry.value: _gamow_penetration(config, trap_separation_m(geometry))
        for geometry in GeometryMode
    }


def default_n_sites_per_m3(loading_ratio: float) -> float:
    """Engine-convention site density: 0.5 * _reactant_number_density(config).

    Mirrors ``compute_trapped_state_rate`` exactly (host density =
    electron_density / Z, times loading) so the EQ-WH-CAP-01 ceiling bounds the
    rate the engine can actually emit. This is ~46x below 0.5 * n_D with the
    physical Pd atom density (6.8e28 m^-3) used by the Dicke count; the
    difference is recorded in the closure_demand provenance, not hidden.
    """
    from app.physics_engine.unified_lenr_model.config import SimulationConfig
    from app.physics_engine.unified_lenr_model.reaction_rate_engine import (
        _reactant_number_density,
    )

    loading = max(0.0, min(float(loading_ratio), 1.0))
    config = SimulationConfig()
    config.loading_ratio = loading
    return 0.5 * _reactant_number_density(config)


def compute_working_hypothesis(
    *,
    phonon_energy_mev: float,
    gamma_energy_mev: float,
    recoil_energy_mev: float,
    open_remainder_mev: float,
    q_total_mev: float,
    naive_ruled_out: bool,
    rate_per_m3_s: float,
    active_volume_m3: float,
    excess_power_w: Optional[float],
    loading_ratio: float,
    fgr_params: Optional[Mapping[str, Any]] = None,
    g_coupling: float = 1e-4,
    phonon_hz: float = PHONON_HZ,
    n_sites_per_m3: Optional[float] = None,
    gamma_tun_by_geometry: Optional[Mapping[str, float]] = None,
) -> Dict[str, Any]:
    """Assemble the coupled WH-ENP-01 ledger shared by Q1–Q3."""
    fgr = dict(fgr_params or {})
    dicke_r = dicke_radius_m(phonon_hz)
    domain = PAPER_DICKE_DOMAIN_M
    dicke_licensed = domain <= dicke_r
    he_factor = heisenberg_euler_lab_factor()
    bound = derive_lattice_gamma_bound(g_coupling=g_coupling)
    q_j = Q_DD_HE4_MEV * 1e6 * E_CHARGE
    vol = max(float(active_volume_m3), 1e-30)
    r_obs = None
    if excess_power_w is not None and float(excess_power_w) > 0:
        r_obs = float(excess_power_w) / (q_j * vol)
    r_mode = float(rate_per_m3_s)
    threshold = None if r_obs is None else r_mode >= r_obs
    dicke_n = dicke_count(dicke_radius_m=dicke_r)
    franck_condon = franck_condon_tail(q_mev=Q_DD_HE4_MEV, phonon_hz=phonon_hz)
    scan = coupling_scan(
        q_mev=Q_DD_HE4_MEV,
        g_cited=g_coupling,
        n_coh_cited_cap=int(dicke_n["n_coh_licensed_max"]),
    )
    closure = closure_demand(
        r_obs_per_m3_s=r_obs,
        n_sites_per_m3=(
            float(n_sites_per_m3)
            if n_sites_per_m3 is not None
            else default_n_sites_per_m3(loading_ratio)
        ),
        gamma_tun_by_geometry=dict(gamma_tun_by_geometry or default_gamma_tun_by_geometry()),
    )
    derived_sum = (
        float(phonon_energy_mev) + float(gamma_energy_mev) + float(recoil_energy_mev)
    )
    remainder = float(open_remainder_mev)
    gn_closes = bool(not naive_ruled_out)
    q1_closed = remainder <= 0 and not gn_closes
    q2_closed = bool(bound["meets_target"])
    two_body_log = -40.0
    q3_two_body_closed = two_body_log >= 0
    p_occ = fgr.get("P_occ")
    if p_occ is None:
        p_occ = bernoulli_p4(loading_ratio)
        p_occ_kind = "bernoulli_p4_model_assumption"
    else:
        p_occ_kind = "fgr_ingest_or_engine"

    return {
        "id": WH_ID,
        "claim_tier": CLAIM_TIER,
        "status": "OPEN",
        "lenr_proved": False,
        "statement": (
            "Electron–neutron–proton coupling in a deuteron cluster partitions "
            "D+D energy through a Hagelstein coherent virtual-phonon cascade on "
            "Takahashi TSC 4D geometry. Two on-shell alphas remove a primary "
            "24 MeV γ kinematically but do not close the MeV gap or radiation "
            "suppression. Γ_ph/Γ_γ is a derived harmonic bound (fails 10^11). "
            "Rate feasibility is the same-cluster FGR versus R_obs = P_W/(Q V)."
        ),
        "geometry": "fcc_tetrahedral",
        "occupation_model": p_occ_kind,
        "P_occ": float(p_occ) if p_occ is not None else None,
        "nuclear_operator": "hagelstein_phonon_on_tsc_4d",
        "references": list(REFERENCES),
        "derived_terms": [
            "phonon_order_N",
            "naive_gN_ruled_out",
            "tsc_2alpha_kinematics",
            "harmonic_Gamma_ph_over_Gamma_gamma",
            "heisenberg_euler_lab_identity",
            "dicke_radius_license",
            "two_body_log10N_events",
        ],
        "assumed_terms": [
            "trap_separation_25pm",
            "cluster_lifetime_1e-20_s",
            "f_nuc",
            "P_occ_if_bernoulli",
            "assumed_branching_fractions",
            "alpha_csda_range_pd",
            "neutron_moderation_lengths",
            "phonon_sound_speed",
        ],
        "q1": {
            "open_remainder_mev": remainder,
            "derived_mev": derived_sum,
            "q_total_mev": float(q_total_mev),
            "naive_gN_closes": gn_closes,
            "alpha_stopping": {
                "ke_per_alpha_mev": ALPHA_KE_MEV,
                "q_4d_mev": Q_4D_MEV,
                "n_alphas": 2,
                "csda_range_pd_m": ALPHA_CSDA_RANGE_PD_M,
                "counted_in_derived_mev": False,
                "note": "Alpha stopping ≠ 24 MeV photon down-conversion (EQ-TSC-STOP-01).",
                "lean_theorems": ["EQ-WH-STOP-01", "EQ-TSC-STOP-01"],
                "provenance": "model assumption (range magnitude)",
            },
            "coupling_scan": scan,
            "status": "OPEN",
        },
        "q2": {
            "derived_bound": bound,
            "neutron_moderation": neutron_moderation_lengths_m(),
            "franck_condon": franck_condon,
            "status": "OPEN",
        },
        "q3": {
            "R_obs_per_m3_s": r_obs,
            "R_mode_per_m3_s": r_mode,
            "active_volume_m3": vol,
            "threshold_crossed": threshold,
            "two_body_log10_n_events": two_body_log,
            "two_body_closes": q3_two_body_closed,
            "P_occ_provenance": p_occ_kind,
            "f_nuc": fgr.get("f_nuc"),
            "C_lin": fgr.get("C_lin"),
            "closure_demand": closure,
            "status": "OPEN" if not q3_two_body_closed else "BUDGET_DOES_NOT_CLOSE",
        },
        "dicke": {
            "phonon_wavelength_m": _phonon_wavelength_m(phonon_hz),
            "dicke_radius_m": dicke_r,
            "paper_domain_m": domain,
            "n2_licensed": bool(dicke_licensed),
            "n_d_per_m3": dicke_n["n_d_per_m3"],
            "dicke_volume_m3": dicke_n["dicke_volume_m3"],
            "n_within_radius": dicke_n["n_within_radius"],
            "n_coh_licensed_max": dicke_n["n_coh_licensed_max"],
            "n_d_provenance": dicke_n["n_d_provenance"],
            "engine_collective": "linear_min_N_1e6",
            "lean_theorems": ["EQ-WH-DICKE-01", "EQ-COLL-LIN-01", "EQ-WH-DICKE-N-01"],
            "note": "N² is not the engine rate law; domain > λ/(2π) does not license Dicke N².",
        },
        "schwinger_he": {
            "lab_field_v_m": LAB_FIELD_V_M,
            "he_factor": float(he_factor),
            "closes_q1": False,
            "closes_q2": False,
            "lean_theorems": ["EQ-QED-HE-NEG-01"],
        },
        "channels": child_product_channels(),
        "remainder_vector": {
            "q1_open_remainder_mev": remainder,
            "q2_log10_ratio_minus_11": None,
            "q3_log10_n_two_body": two_body_log,
        },
        "discharges_eq_open": False,
        "lean_theorems": [
            "EQ-WH-ENP-01",
            "EQ-WH-PART-01",
            "EQ-WH-BOUND-01",
            "EQ-WH-FLOOR-01",
            "EQ-WH-DICKE-01",
            "EQ-WH-STOP-01",
            "EQ-WH-NONCLOSE-01",
            "EQ-WH-FC-01",
            "EQ-WH-PART-02",
            "EQ-WH-DICKE-N-01",
            "EQ-WH-CAP-01",
        ],
        "q1_closed": q1_closed,
        "q2_closed": q2_closed,
        "q3_closed": q3_two_body_closed,
    }
