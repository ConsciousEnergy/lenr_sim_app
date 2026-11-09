"""Campaign grid presets for LENR_SIM_APP model-output sweeps.

Counts are cartesian products. Smoke is the test default.
``diverse`` adds negative-control extras (not a full cartesian blow-up).
"""

from __future__ import annotations

from itertools import product
from typing import Dict, Iterator, List, Mapping, Any, Tuple

from app.physics_engine.theory_pipeline import THEORY_COMPOSITION_GROUPS

PRESETS: Dict[str, Dict[str, List[Any]]] = {
    "smoke": {
        "temperatures": [300.0, 350.0],
        "loading_ratios": [0.85, 0.95],
        "materials": ["palladium"],
        "reactants": ["deuterium"],
        "rate_modes": ["two_body"],
        "use_theory_pipeline": [True],
    },
    "default": {
        "temperatures": [280.0, 300.0, 350.0, 400.0],
        "loading_ratios": [0.80, 0.90, 0.95],
        "materials": ["palladium", "nickel"],
        "reactants": ["deuterium"],
        "rate_modes": ["two_body"],
        "use_theory_pipeline": [False, True],
    },
    "full": {
        "temperatures": [280.0, 300.0, 320.0, 350.0, 400.0, 450.0],
        "loading_ratios": [0.70, 0.85, 0.90, 0.95],
        "materials": ["palladium", "nickel", "titanium"],
        "reactants": ["deuterium", "hydrogen"],
        "rate_modes": ["two_body"],
        "use_theory_pipeline": [False, True],
    },
    # Literature-anchored designed grid (not a cartesian). Axes unused.
    "literature_grid": {
        "temperatures": [300.0],
        "loading_ratios": [0.90],
        "materials": ["palladium"],
        "reactants": ["deuterium"],
        "rate_modes": ["two_body"],
        "use_theory_pipeline": [True],
    },
    # All registered theories at a small occurrence-relevant Pd-D grid.
    # Cartesian is 2 T × 2 loading × 1 host × 1 reactant × 1 pipeline = 4.
    "all_claims": {
        "temperatures": [300.0, 350.0],
        "loading_ratios": [0.90, 0.95],
        "materials": ["palladium"],
        "reactants": ["deuterium"],
        "rate_modes": ["two_body"],
        "use_theory_pipeline": [True],
    },
    # Designed experiment: cryogenic/hot + unloaded/loaded negatives, H/D, three hosts.
    # Cartesian is 4 T × 4 loading × 3 hosts × 2 reactants × 2 pipeline = 192.
    "diverse": {
        "temperatures": [77.0, 300.0, 350.0, 500.0],
        "loading_ratios": [0.10, 0.50, 0.85, 0.95],
        "materials": ["palladium", "nickel", "titanium"],
        "reactants": ["deuterium", "hydrogen"],
        "rate_modes": ["two_body"],
        "use_theory_pipeline": [False, True],
    },
    # Q-anchored isolated theories (not a cartesian). Axes unused.
    "question_theories": {
        "temperatures": [300.0],
        "loading_ratios": [0.90],
        "materials": ["palladium"],
        "reactants": ["deuterium"],
        "rate_modes": ["two_body"],
        "use_theory_pipeline": [True],
    },
    # Designed association screen (not a cartesian). Axes unused.
    "association_screen": {
        "temperatures": [280.0, 300.0, 350.0],
        "loading_ratios": [0.85, 0.95],
        "materials": ["palladium"],
        "reactants": ["deuterium"],
        "rate_modes": ["two_body"],
        "use_theory_pipeline": [True],
    },
    # Isolated registered theories + three literature full-pipeline cells.
    "testbed_review": {
        "temperatures": [300.0],
        "loading_ratios": [0.90],
        "materials": ["palladium"],
        "reactants": ["deuterium"],
        "rate_modes": ["two_body"],
        "use_theory_pipeline": [True],
    },
    "iccf27_grid": {
        "temperatures": [300.0],
        "loading_ratios": [0.90],
        "materials": ["palladium"],
        "reactants": ["deuterium"],
        "rate_modes": ["two_body"],
        "use_theory_pipeline": [True],
    },
    "parameter_map_grid": {
        "temperatures": [300.0],
        "loading_ratios": [0.90],
        "materials": ["palladium"],
        "reactants": ["deuterium"],
        "rate_modes": ["two_body"],
        "use_theory_pipeline": [True],
    },
    "carbon_silicate_uq": {
        "temperatures": [300.0],
        "loading_ratios": [0.90],
        "materials": ["palladium"],
        "reactants": ["deuterium"],
        "rate_modes": ["two_body"],
        "use_theory_pipeline": [True],
    },
    # Designed cavitation / collapse–heavy grid (not a cartesian). Axes unused.
    "cavitation_collapse": {
        "temperatures": [298.0],
        "loading_ratios": [0.90],
        "materials": ["palladium"],
        "reactants": ["deuterium"],
        "rate_modes": ["two_body"],
        "use_theory_pipeline": [True],
    },
}

AXIS_KEYS = (
    "temperatures",
    "loading_ratios",
    "materials",
    "reactants",
    "rate_modes",
    "use_theory_pipeline",
)

DIVERSE_EXTRA_CASES: List[Dict[str, Any]] = [
    {
        "temperature": 300.0,
        "loading_ratio": 0.90,
        "host_material": "palladium",
        "reactant": "deuterium",
        "rate_mode": "trapped_state",
        "use_theory_pipeline": False,
        "tag": "trapped_state_slice",
    },
    {
        "temperature": 300.0,
        "loading_ratio": 0.90,
        "host_material": "palladium",
        "reactant": "deuterium",
        "rate_mode": "two_body",
        "use_theory_pipeline": True,
        "electric_field": 0.0,
        "tag": "efield_off",
    },
    {
        "temperature": 300.0,
        "loading_ratio": 0.90,
        "host_material": "palladium",
        "reactant": "deuterium",
        "rate_mode": "two_body",
        "use_theory_pipeline": True,
        "electric_field": 1.0e6,
        "tag": "efield_on",
    },
    {
        "temperature": 300.0,
        "loading_ratio": 0.90,
        "host_material": "copper",
        "reactant": "hydrogen",
        "rate_mode": "two_body",
        "use_theory_pipeline": True,
        "tag": "copper_host_control",
    },
    {
        "temperature": 300.0,
        "loading_ratio": 0.90,
        "host_material": "palladium",
        "reactant": "deuterium",
        "rate_mode": "two_body",
        "use_theory_pipeline": True,
        "electrolyte_family": "other",
        "tag": "electrolyte_none",
    },
]

def _composition_groups_in_registry_order() -> Tuple[str, ...]:
    """Stable unique composition groups from the theory pipeline registry."""
    seen: List[str] = []
    for group in THEORY_COMPOSITION_GROUPS.values():
        if group not in seen:
            seen.append(group)
    return tuple(seen)


# One representative theory per composition group (not all 21 on every cell).
DIVERSE_THEORY_GROUPS: Tuple[str, ...] = _composition_groups_in_registry_order()

DIVERSE_THEORY_CONDITION_CELLS: List[Dict[str, Any]] = [
    {
        "temperature": 300.0,
        "loading_ratio": 0.90,
        "host_material": "palladium",
        "reactant": "deuterium",
        "tag": "pd_d_ambient",
    },
    {
        "temperature": 300.0,
        "loading_ratio": 0.90,
        "host_material": "nickel",
        "reactant": "hydrogen",
        "tag": "ni_h_ambient",
    },
    {
        "temperature": 77.0,
        "loading_ratio": 0.10,
        "host_material": "palladium",
        "reactant": "deuterium",
        "tag": "cryogenic_unloaded",
    },
    {
        "temperature": 500.0,
        "loading_ratio": 0.90,
        "host_material": "titanium",
        "reactant": "deuterium",
        "tag": "ti_d_hot",
    },
]


def _case_from_axes(
    temp: Any,
    loading: Any,
    material: Any,
    reactant: Any,
    rate_mode: Any,
    pipeline: Any,
) -> Dict[str, Any]:
    return {
        "temperature": float(temp),
        "loading_ratio": float(loading),
        "host_material": str(material),
        "reactant": str(reactant),
        "rate_mode": str(rate_mode),
        "use_theory_pipeline": bool(pipeline),
    }


def iter_campaign_cases(preset: str) -> Iterator[Dict[str, Any]]:
    """Yield request fragments for one named preset."""
    spec = PRESETS.get(preset)
    if spec is None:
        raise KeyError(f"Unknown campaign preset: {preset}")
    if preset == "literature_grid":
        from app.campaign.literature import iter_literature_grid_cases

        yield from iter_literature_grid_cases()
        return
    if preset == "question_theories":
        from app.campaign.question_theories import iter_question_theories_cases

        yield from iter_question_theories_cases()
        return
    if preset == "association_screen":
        from app.campaign.association_screen import iter_association_screen_cases

        yield from iter_association_screen_cases()
        return
    if preset == "testbed_review":
        from app.campaign.testbed_review import iter_testbed_review_cases

        yield from iter_testbed_review_cases()
        return
    if preset == "iccf27_grid":
        from app.campaign.iccf27 import iter_iccf27_grid_cases

        yield from iter_iccf27_grid_cases()
        return
    if preset == "parameter_map_grid":
        from app.campaign.parameter_map import iter_parameter_map_cases

        yield from iter_parameter_map_cases()
        return
    if preset == "carbon_silicate_uq":
        from app.campaign.carbon_silicate import iter_carbon_silicate_uq_cases

        yield from iter_carbon_silicate_uq_cases()
        return
    if preset == "cavitation_collapse":
        from app.campaign.cavitation_collapse import iter_cavitation_collapse_cases

        yield from iter_cavitation_collapse_cases()
        return
    axes = [spec[key] for key in AXIS_KEYS]
    for temp, loading, material, reactant, rate_mode, pipeline in product(*axes):
        yield _case_from_axes(temp, loading, material, reactant, rate_mode, pipeline)
    if preset == "diverse":
        for extra in DIVERSE_EXTRA_CASES:
            yield dict(extra)
    if preset == "all_claims":
        for extra in ALL_CLAIMS_OCCURRENCE_CASES:
            yield dict(extra)


def campaign_size(preset: str) -> int:
    if preset == "literature_grid":
        from app.campaign.literature import literature_grid_count

        return literature_grid_count()
    if preset == "question_theories":
        from app.campaign.question_theories import question_theories_count

        return question_theories_count()
    if preset == "association_screen":
        from app.campaign.association_screen import association_screen_count

        return association_screen_count()
    if preset == "testbed_review":
        from app.campaign.testbed_review import testbed_review_count

        return testbed_review_count()
    if preset == "iccf27_grid":
        from app.campaign.iccf27 import iccf27_grid_count

        return iccf27_grid_count()
    if preset == "parameter_map_grid":
        from app.campaign.parameter_map import parameter_map_count

        return parameter_map_count()
    if preset == "carbon_silicate_uq":
        from app.campaign.carbon_silicate import carbon_silicate_uq_count

        return carbon_silicate_uq_count()
    if preset == "cavitation_collapse":
        from app.campaign.cavitation_collapse import cavitation_collapse_count

        return cavitation_collapse_count()
    spec = PRESETS[preset]
    n = 1
    for key in AXIS_KEYS:
        n *= len(spec[key])
    if preset == "diverse":
        n += len(DIVERSE_EXTRA_CASES)
    if preset == "all_claims":
        n += len(ALL_CLAIMS_OCCURRENCE_CASES)
    return n


def theory_group_representatives(
    groups: Tuple[str, ...] = DIVERSE_THEORY_GROUPS,
) -> Dict[str, str]:
    """First registered theory_id per composition group (stable dict order)."""
    by_group: Dict[str, List[str]] = {}
    for theory_id, group in THEORY_COMPOSITION_GROUPS.items():
        by_group.setdefault(group, []).append(theory_id)
    reps: Dict[str, str] = {}
    for group in groups:
        ids = by_group.get(group) or []
        if ids:
            reps[group] = ids[0]
    return reps


def iter_diverse_theory_group_cases() -> Iterator[Dict[str, Any]]:
    """One pipeline run per composition-group representative at each short cell."""
    reps = theory_group_representatives()
    for cell in DIVERSE_THEORY_CONDITION_CELLS:
        for group, theory_id in reps.items():
            case = dict(cell)
            case.update(
                {
                    "rate_mode": "two_body",
                    "use_theory_pipeline": True,
                    "enabled_theories": [theory_id],
                    "composition_group": group,
                    "tag": f"theory_group:{group}:{cell.get('tag')}",
                }
            )
            yield case


def diverse_theory_group_count() -> int:
    return len(theory_group_representatives()) * len(DIVERSE_THEORY_CONDITION_CELLS)


ALL_CLAIMS_OCCURRENCE_CASES: List[Dict[str, Any]] = [
    {
        "temperature": 300.0,
        "loading_ratio": 0.95,
        "host_material": "palladium",
        "reactant": "deuterium",
        "rate_mode": "two_body",
        "use_theory_pipeline": True,
        "tag": "occurrence_anchored_pd_d",
    },
    {
        "temperature": 350.0,
        "loading_ratio": 0.90,
        "host_material": "palladium",
        "reactant": "deuterium",
        "rate_mode": "two_body",
        "use_theory_pipeline": True,
        "tag": "occurrence_anchored_pd_d_warm",
    },
]


def iter_all_claims_single_theory_cases() -> Iterator[Dict[str, Any]]:
    """One pipeline run per registered theory_id at high-loading Pd-D."""
    from app.physics_engine.theory_pipeline import get_default_pipeline

    theory_ids = list(get_default_pipeline().registered_ids)
    for theory_id in theory_ids:
        yield {
            "temperature": 300.0,
            "loading_ratio": 0.90,
            "host_material": "palladium",
            "reactant": "deuterium",
            "rate_mode": "two_body",
            "use_theory_pipeline": True,
            "enabled_theories": [theory_id],
            "tag": f"all_claims:{theory_id}",
        }


def all_claims_single_theory_count() -> int:
    from app.physics_engine.theory_pipeline import get_default_pipeline

    return len(list(get_default_pipeline().registered_ids))


def describe_preset(preset: str) -> Mapping[str, Any]:
    payload: Dict[str, Any] = {
        "preset": preset,
        "n_cases": campaign_size(preset),
        "axes": PRESETS[preset],
    }
    if preset == "diverse":
        payload["n_extra_unified"] = len(DIVERSE_EXTRA_CASES)
        payload["n_theory_group_runs"] = diverse_theory_group_count()
        payload["theory_group_representatives"] = theory_group_representatives()
    if preset == "all_claims":
        payload["n_occurrence_anchored"] = len(ALL_CLAIMS_OCCURRENCE_CASES)
        payload["n_single_theory_runs"] = all_claims_single_theory_count()
        payload["note"] = (
            "Model-output sampling of every registered theory_id plus "
            "occurrence-anchored Pd-D cells. Does not prove LENR."
        )
    if preset == "literature_grid":
        from app.campaign.literature import LITERATURE_NEGATIVE_CONTROLS

        payload["n_negative_controls"] = len(LITERATURE_NEGATIVE_CONTROLS)
        payload["note"] = (
            "Literature-anchored model-output grid plus negative controls. "
            "Does not prove LENR. Do not run full or diverse in CI."
        )
    if preset == "question_theories":
        from app.campaign.question_theories import QUESTION_THEORY_SLICES

        payload["n_question_slices"] = len(QUESTION_THEORY_SLICES)
        payload["note"] = (
            "Designed Q-anchored isolated theory runs at tagged literature "
            "cells plus ARPA-E composition-group nulls. Does not prove LENR. "
            "Do not run full or diverse in CI."
        )
    if preset == "association_screen":
        from app.campaign.association_screen import association_screen_axes

        payload["axes"] = association_screen_axes()
        payload["note"] = (
            "Designed Miles / McKubre / ARPA-E screen at 3 T × 2 loading. "
            "Ranks five-factor association, not P(LENR). Does not prove LENR. "
            "Do not run full or diverse in CI."
        )
    if preset == "testbed_review":
        from app.campaign.testbed_review import testbed_review_axes

        payload["axes"] = testbed_review_axes()
        payload["note"] = (
            "Isolated registered theories plus Miles / McKubre / ARPA-E "
            "full-pipeline cells. Model association, not P(LENR). Does not "
            "prove LENR. Do not run full or diverse in CI."
        )
    if preset == "iccf27_grid":
        payload["note"] = (
            "ICCF-27 / Sept 2026 literature extension plus graphite/SiC "
            "controls. Does not mutate the locked 18-row seed set. Does not "
            "prove LENR."
        )
    if preset == "parameter_map_grid":
        payload["note"] = (
            "Designed DeCapua/Metzler-style parameter map (loading × T × host). "
            "Not a cartesian. Does not prove LENR."
        )
    if preset == "carbon_silicate_uq":
        payload["note"] = (
            "Pd/Ni plus graphite/SiC UQ cells for probabilistic outcomes. "
            "Model output only. Does not prove LENR."
        )
    if preset == "cavitation_collapse":
        from app.campaign.cavitation_collapse import cavitation_collapse_count

        payload["n_collapse_cells"] = cavitation_collapse_count()
        payload["note"] = (
            "Cavitation / collapse–heavy bubble-lattice cells: host × loading × "
            "drive × dynamics_mode with include_uncertainty and literature "
            "anchors. Model output only. Does not prove LENR. Do not run full "
            "or diverse in CI."
        )
    return payload
