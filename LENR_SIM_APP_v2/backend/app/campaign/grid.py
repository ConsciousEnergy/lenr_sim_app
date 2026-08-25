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
    axes = [spec[key] for key in AXIS_KEYS]
    for temp, loading, material, reactant, rate_mode, pipeline in product(*axes):
        yield _case_from_axes(temp, loading, material, reactant, rate_mode, pipeline)
    if preset == "diverse":
        for extra in DIVERSE_EXTRA_CASES:
            yield dict(extra)


def campaign_size(preset: str) -> int:
    spec = PRESETS[preset]
    n = 1
    for key in AXIS_KEYS:
        n *= len(spec[key])
    if preset == "diverse":
        n += len(DIVERSE_EXTRA_CASES)
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
    return payload
