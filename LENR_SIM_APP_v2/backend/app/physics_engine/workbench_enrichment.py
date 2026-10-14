"""ARA Oct 2026 workbench enrichment overlays.

Provides predicted signatures, structured falsifiers, taxonomy kinds,
equation citations, and identifiability warnings for the comparative
hypothesis workbench. Module-level fields win; catalog fills gaps.
"""

from __future__ import annotations

from copy import deepcopy
from typing import Any, Dict, List, Optional

# taxonomy_kind: named_theory | known_mechanism | proposed_state |
#                experiment_env | observed_output

_DEFAULT_TAXONOMY: Dict[str, str] = {
    "electron_screening": "known_mechanism",
    "quantum_tunneling": "known_mechanism",
    "null_recombination": "known_mechanism",
    "coherent_qed": "named_theory",
    "nae_model": "named_theory",
    "takahashi_tsc": "named_theory",
    "hagelstein_phonon": "named_theory",
    "widom_larsen": "named_theory",
    "kim_bec": "named_theory",
    "holmlid_udh": "named_theory",
    "vysotskii_ccs": "named_theory",
    "chubb_ion_band": "named_theory",
    "schwinger_lattice": "named_theory",
    "matsumoto_enc": "named_theory",
    "shoulders_evo": "proposed_state",
    "hydroton": "proposed_state",
    "miles_heat_helium": "observed_output",
    "iwamura_transmutation": "experiment_env",
    "piantelli_ni_h": "experiment_env",
    "letts_laser": "experiment_env",
    "swartz_nanor": "experiment_env",
    "bubble_mhd_confinement": "known_mechanism",
    "casimir_confinement": "known_mechanism",
    "czerski_thermal_spike": "known_mechanism",
    "phonon_coupling_legacy": "known_mechanism",
    "non_equilibrium_thermo": "known_mechanism",
    "stellar_scaling_mhd": "known_mechanism",
}

_CATALOG: Dict[str, Dict[str, Any]] = {
    "nae_model": {
        "taxonomy_kind": "named_theory",
        "display_model_version": "Storms NAE 2012–13 (active); 2026 electron channel tagged",
        "historical_parents": ["storms_nae_2012_13", "storms_nae_2026"],
        "predicted_signatures": [
            {"id": "excess_heat", "polarity": "positive", "regime": "NAE_present"},
            {"id": "He4", "polarity": "positive", "regime": "D_fuel"},
            {"id": "energetic_electrons", "polarity": "positive", "regime": "2026_channel"},
            {"id": "neutrons", "polarity": "absent_or_low", "regime": "primary_claim"},
            {"id": "gamma", "polarity": "absent_or_low", "regime": "primary_claim"},
        ],
        "falsifiers": [
            {
                "required_condition": "Viable NAE (nanocrack/void) plus fuel migration into NAE",
                "prediction": "LENR activity scales with effective NAE site density",
                "contradicting_observation": (
                    "Material with demonstrably no viable NAE produces the same LENR curve"
                ),
            }
        ],
        "equation_citations": [
            {
                "source": "Storms E. (2012) JCMNS 9 — An Explanation of LENR",
                "equation_label": "NAE formation / void hypothesis (qualitative)",
                "model_version": "storms_nae_2012_13",
                "lenr_sim_modification": "Gaussian crack-width filter + site-density enhancement",
                "inputs_from_paper": ["NAE concept", "void/nanocrack role"],
                "inputs_added_by_simulator": ["crack_width_nm", "site_density_m2"],
            }
        ],
        "identifiability_warnings": [
            "site_density_m2 and tunnel/enhancement factors are non-identifiable "
            "from heat alone when neither is independently measured.",
        ],
    },
    "takahashi_tsc": {
        "taxonomy_kind": "named_theory",
        "display_model_version": "4H/TSC–MHE lineage (P0 approx rate); historical parent 4D/TSC 2011",
        "historical_parents": ["4D/TSC 2011", "4H/TSC–MHE 2024"],
        "predicted_signatures": [
            {"id": "tetrahedral_cluster", "polarity": "required", "regime": "T_sites_nanosites"},
            {"id": "He4", "polarity": "positive", "regime": "4D_formulation"},
            {"id": "time_dependent_condensation", "polarity": "positive", "regime": "Langevin_P1"},
            {"id": "neutrons", "polarity": "absent_or_low", "regime": "primary_claim"},
        ],
        "falsifiers": [
            {
                "required_condition": "Formation of the tetrahedral condensed cluster (TSC)",
                "prediction": "Reaction path suppressed without tetrahedral state",
                "contradicting_observation": (
                    "Same rate regardless of whether the tetrahedral state exists"
                ),
            }
        ],
        "equation_citations": [
            {
                "source": "Takahashi A. (2011) JCMNS 4 — Progress in Condensed Cluster Fusion Theory",
                "equation_label": "4D/TSC condensation geometry",
                "model_version": "takahashi_tsc_p0_approx_rate_v1",
                "lenr_sim_modification": "Approximate rate path; full Langevin deferred to ARA P1",
                "inputs_from_paper": ["tetrahedral geometry", "He-4 dominated products"],
                "inputs_added_by_simulator": ["coherence_factor", "approx rate bridge"],
            }
        ],
        "identifiability_warnings": [
            "Coherence factor and approximate rate bridge are not uniquely constrained "
            "by calorimetry alone.",
        ],
    },
    "hagelstein_phonon": {
        "taxonomy_kind": "named_theory",
        "display_model_version": "hagelstein_phonon_p0_v1 (2025 matrix-element path = P1 target)",
        "historical_parents": ["phonon_nuclear_coupling_pre_2025"],
        "predicted_signatures": [
            {"id": "nuclear_excitation_transfer", "polarity": "positive", "regime": "coupled_modes"},
            {"id": "phonon_mediated_coupling", "polarity": "positive", "regime": "lattice"},
            {"id": "fractionated_energy", "polarity": "positive", "regime": "no_hard_gamma"},
            {"id": "gamma", "polarity": "suppressed", "regime": "primary_claim"},
        ],
        "falsifiers": [
            {
                "required_condition": "Non-zero phonon–nuclear coupling matrix element",
                "prediction": "Energy fractionation into lower-energy channels",
                "contradicting_observation": (
                    "Hard gamma spectrum matching conventional nuclear de-excitation "
                    "with no phonon coupling dependence"
                ),
            }
        ],
        "equation_citations": [
            {
                "source": "Hagelstein P.L. & Chaudhary I.U. (2015) JCMNS 16, 46",
                "equation_label": "phonon-exchange / coupling matrix element (approx)",
                "model_version": "hagelstein_phonon_p0_v1",
                "lenr_sim_modification": "Approximate coupling; relativistic matrix rebuild = P1",
                "inputs_from_paper": ["phonon–nuclear coupling concept"],
                "inputs_added_by_simulator": ["coupling_strength"],
            }
        ],
        "identifiability_warnings": [
            "coupling_strength is a free simulator parameter; not identifiable from "
            "heat without independent spectroscopic constraints.",
        ],
    },
    "widom_larsen": {
        "taxonomy_kind": "named_theory",
        "display_model_version": "widom_larsen_p0_v1 (electroweak entrance)",
        "historical_parents": ["widom_larsen_2006"],
        "predicted_signatures": [
            {"id": "collective_surface_EM", "polarity": "positive", "regime": "hydride_surface"},
            {"id": "electron_capture_on_proton", "polarity": "positive", "regime": "mass_threshold"},
            {"id": "ULM_neutrons", "polarity": "positive", "regime": "above_threshold"},
            {"id": "neutron_capture_isotopes", "polarity": "positive", "regime": "local_capture"},
            {"id": "He4", "polarity": "not_primary", "regime": "entrance_channel"},
        ],
        "falsifiers": [
            {
                "required_condition": "Electron/proton state satisfying weak-capture threshold",
                "prediction": "ULM neutron production turns on above mass/threshold condition",
                "contradicting_observation": (
                    "Neutron/transmutation signatures continue below the proposed threshold"
                ),
            }
        ],
        "equation_citations": [
            {
                "source": "Widom A. & Larsen L. (2006) Eur. Phys. J. C 46, 107",
                "equation_label": "e− + p → n + ν_e (ULM neutrons)",
                "model_version": "widom_larsen_p0_v1",
                "lenr_sim_modification": "ULM chain rate→enhancement scale is simulator assumption",
                "inputs_from_paper": ["inverse beta threshold", "ULM capture idea"],
                "inputs_added_by_simulator": ["ULM_CHAIN_RATE_TO_ENHANCEMENT"],
            }
        ],
        "identifiability_warnings": [
            "Mass-renormalization scale and ULM→enhancement bridge are non-identifiable "
            "from heat alone.",
        ],
    },
    "holmlid_udh": {
        "taxonomy_kind": "named_theory",
        "display_model_version": "holmlid_udh_p0_pheno_v1 (H(0)/D(0); not Kim BEC)",
        "historical_parents": ["rydberg_matter_UDH"],
        "predicted_signatures": [
            {"id": "ultra_dense_H0_D0", "polarity": "required", "regime": "laser_TOF"},
            {"id": "picometre_scale_distances", "polarity": "claimed", "regime": "UDH"},
            {"id": "MeV_particles_TOF", "polarity": "positive", "regime": "laser_induced"},
        ],
        "falsifiers": [
            {
                "required_condition": "Formation of claimed ultra-dense H(0)/D(0) state",
                "prediction": "Distinct TOF particle signatures under laser stimulation",
                "contradicting_observation": (
                    "Attributing Holmlid results to a generic BEC Tc model (use kim_bec)"
                ),
            }
        ],
        "equation_citations": [
            {
                "source": "Holmlid L. — ultra-dense hydrogen / Rydberg-matter program",
                "equation_label": "phenomenological UDH stub (no BEC Tc)",
                "model_version": "holmlid_udh_p0_pheno_v1",
                "lenr_sim_modification": "Phenomenological registry module; not Kim BECNF",
                "inputs_from_paper": ["H(0)/D(0) state claims"],
                "inputs_added_by_simulator": ["phenomenological free parameters"],
            }
        ],
        "identifiability_warnings": [],
    },
    "kim_bec": {
        "taxonomy_kind": "named_theory",
        "display_model_version": "kim_becnf_p0_v1 (Bose–Einstein Condensate Nuclear Fusion)",
        "historical_parents": ["Kim BECNF"],
        "predicted_signatures": [
            {"id": "deuteron_BEC", "polarity": "required", "regime": "nano_grain"},
            {"id": "fusion_in_BEC", "polarity": "positive", "regime": "below_Tc"},
        ],
        "falsifiers": [
            {
                "required_condition": "Deuteron BEC conditions as specified by Kim",
                "prediction": "Rate tied to condensate fraction / Tc regime",
                "contradicting_observation": (
                    "Using Holmlid UDH phenomenology as if it were Kim BECNF"
                ),
            }
        ],
        "equation_citations": [
            {
                "source": "Kim Y.E. — Bose–Einstein Condensate Theory of Deuteron Fusion in Metal",
                "equation_label": "BECNF rate structure (P0)",
                "model_version": "kim_becnf_p0_v1",
                "lenr_sim_modification": "Separate module from holmlid_udh",
                "inputs_from_paper": ["BECNF framework"],
                "inputs_added_by_simulator": ["module free parameters"],
            }
        ],
        "identifiability_warnings": [],
    },
    "quantum_tunneling": {
        "taxonomy_kind": "known_mechanism",
        "display_model_version": "Model 0 — conventional WKB/Gamow baseline",
        "historical_parents": [],
        "predicted_signatures": [
            {"id": "conventional_DD_rate", "polarity": "baseline", "regime": "thermal"},
            {"id": "hard_radiation_channels", "polarity": "conventional", "regime": "DD"},
        ],
        "falsifiers": [
            {
                "required_condition": "Standard Coulomb barrier + WKB tunneling",
                "prediction": "Negligible cold rates without anomalous enhancement",
                "contradicting_observation": (
                    "Treating this baseline as a named LENR author theory"
                ),
            }
        ],
        "equation_citations": [
            {
                "source": "Standard nuclear / QM tunneling textbooks",
                "equation_label": "Gamow / WKB penetration",
                "model_version": "quantum_tunneling_baseline_v1",
                "lenr_sim_modification": "Identity enhancement control_role=baseline",
                "inputs_from_paper": ["accepted tunneling formalism"],
                "inputs_added_by_simulator": [],
            }
        ],
        "identifiability_warnings": [],
    },
    "null_recombination": {
        "taxonomy_kind": "known_mechanism",
        "display_model_version": "Model 0 — non-nuclear heat/artifact null",
        "historical_parents": [],
        "predicted_signatures": [
            {"id": "chemical_recombination_heat", "polarity": "positive", "regime": "null"},
            {"id": "He4", "polarity": "absent", "regime": "null"},
            {"id": "nuclear_products", "polarity": "absent", "regime": "null"},
        ],
        "falsifiers": [
            {
                "required_condition": "Same experiment inputs without nuclear mechanism",
                "prediction": "Heat/artifacts explainable by chemistry / recombination",
                "contradicting_observation": (
                    "Nuclear product ratios incompatible with null chemistry"
                ),
            }
        ],
        "equation_citations": [
            {
                "source": "Conventional chemistry / calorimetry controls",
                "equation_label": "recombination / desorption enthalpy (control)",
                "model_version": "null_recombination_v1",
                "lenr_sim_modification": "control_role=null",
                "inputs_from_paper": [],
                "inputs_added_by_simulator": ["null heat parameterization"],
            }
        ],
        "identifiability_warnings": [],
    },
    "electron_screening": {
        "taxonomy_kind": "known_mechanism",
        "display_model_version": "Shared established-physics screening layer",
        "historical_parents": [],
        "predicted_signatures": [
            {"id": "screening_potential_Ue", "polarity": "positive", "regime": "dense_plasma_lattice"},
        ],
        "falsifiers": [
            {
                "required_condition": "Accepted electron-screening estimates",
                "prediction": "Modest rate enhancement vs bare Gamow",
                "contradicting_observation": (
                    "Equating screening alone with a named LENR author theory"
                ),
            }
        ],
        "equation_citations": [
            {
                "source": "Assenbaum / Raiola / Czerski-style screening literature",
                "equation_label": "U_e screening potential",
                "model_version": "electron_screening (shared_mechanism)",
                "lenr_sim_modification": "control_role=shared_mechanism",
                "inputs_from_paper": ["screening potential scales"],
                "inputs_added_by_simulator": [],
            }
        ],
        "identifiability_warnings": [],
    },
    "schwinger_lattice": {
        "taxonomy_kind": "named_theory",
        "display_model_version": "Schwinger — Nuclear Energy in an Atomic Lattice (scaffold)",
        "historical_parents": ["Schwinger 1990 Cold Fusion: A Hypothesis", "NEAL papers"],
        "predicted_signatures": [
            {"id": "lattice_energy_uptake", "polarity": "positive", "regime": "coherent_lattice"},
            {"id": "HD_channel", "polarity": "sensitive", "regime": "H2O_in_D2O"},
            {"id": "burst_intermittency", "polarity": "possible", "regime": "collective"},
            {"id": "hard_gamma", "polarity": "suppressed", "regime": "lattice_coupling"},
        ],
        "falsifiers": [
            {
                "required_condition": "Strong deuteration + collective lattice participation",
                "prediction": "Heat sensitive to small H₂O admixture in D₂O (HD hypothesis)",
                "contradicting_observation": (
                    "No H/D-ratio sensitivity under conditions where HD channel should matter"
                ),
            }
        ],
        "equation_citations": [
            {
                "source": "Schwinger J. Cold Fusion: A Hypothesis (LENR-CANR)",
                "equation_label": "p+d → ³He with lattice energy uptake (hypothesis)",
                "model_version": "schwinger_lattice_p0_scaffold_v1",
                "lenr_sim_modification": (
                    "Historical-control scaffold; no invented quantitative rate law"
                ),
                "inputs_from_paper": ["HD critical experiment", "lattice coupling concept"],
                "inputs_added_by_simulator": ["h_fraction_in_d2o slider parameter"],
            }
        ],
        "identifiability_warnings": [
            "Scaffold has no quantitative rate law; do not fit heat to invent one.",
        ],
    },
}


_WORKBENCH_KEYS = (
    "predicted_signatures",
    "falsifiers",
    "taxonomy_kind",
    "equation_citations",
    "identifiability_warnings",
    "historical_parents",
    "display_model_version",
)


def catalog_entry(theory_id: str) -> Dict[str, Any]:
    return deepcopy(_CATALOG.get(theory_id, {}))


def default_taxonomy_kind(theory_id: str, control_role: str = "") -> str:
    if theory_id in _DEFAULT_TAXONOMY:
        return _DEFAULT_TAXONOMY[theory_id]
    if control_role in ("baseline", "null", "shared_mechanism"):
        return "known_mechanism"
    return "named_theory"


def merge_workbench_fields(
    theory_id: str,
    *,
    existing: Optional[Dict[str, Any]] = None,
    control_role: str = "",
) -> Dict[str, Any]:
    """Return additive workbench fields; existing non-empty values win."""
    existing = existing or {}
    cat = catalog_entry(theory_id)
    out: Dict[str, Any] = {}

    for key in (
        "predicted_signatures",
        "falsifiers",
        "equation_citations",
        "identifiability_warnings",
        "historical_parents",
    ):
        cur = existing.get(key)
        if cur:
            out[key] = deepcopy(cur)
        else:
            out[key] = deepcopy(cat.get(key, []))

    tax = existing.get("taxonomy_kind") or cat.get("taxonomy_kind") or ""
    out["taxonomy_kind"] = tax or default_taxonomy_kind(theory_id, control_role)

    disp = existing.get("display_model_version") or cat.get("display_model_version") or ""
    out["display_model_version"] = disp

    return out


def enrich_metadata_dict(row: Dict[str, Any]) -> Dict[str, Any]:
    """Mutate-and-return a list_theories row with workbench fields."""
    tid = str(row.get("theory_id", ""))
    control = str(row.get("control_role", "") or "")
    existing = {k: row.get(k) for k in _WORKBENCH_KEYS if k in row}
    merged = merge_workbench_fields(tid, existing=existing, control_role=control)
    row.update(merged)
    return row


def enrich_contribution_dict(
    row: Dict[str, Any],
    *,
    control_role: str = "",
) -> Dict[str, Any]:
    """Mutate-and-return a per_theory export row with workbench fields."""
    tid = str(row.get("theory_id", ""))
    existing = {k: row.get(k) for k in _WORKBENCH_KEYS if k in row}
    # Prefer control_role already on row if present
    control = str(row.get("control_role") or control_role or "")
    merged = merge_workbench_fields(tid, existing=existing, control_role=control)
    row.update(merged)
    if "control_role" not in row:
        row["control_role"] = control
    return row


def workbench_catalog_ids() -> List[str]:
    return sorted(_CATALOG.keys())
