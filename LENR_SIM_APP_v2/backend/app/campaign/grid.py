"""Campaign grid presets for LENR_SIM_APP model-output sweeps.

Counts are cartesian products. Smoke is the test default.
"""

from __future__ import annotations

from itertools import product
from typing import Dict, Iterator, List, Mapping, Any

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
}

AXIS_KEYS = (
    "temperatures",
    "loading_ratios",
    "materials",
    "reactants",
    "rate_modes",
    "use_theory_pipeline",
)


def iter_campaign_cases(preset: str) -> Iterator[Dict[str, Any]]:
    """Yield request fragments for one named preset."""
    spec = PRESETS.get(preset)
    if spec is None:
        raise KeyError(f"Unknown campaign preset: {preset}")
    axes = [spec[key] for key in AXIS_KEYS]
    for temp, loading, material, reactant, rate_mode, pipeline in product(*axes):
        yield {
            "temperature": float(temp),
            "loading_ratio": float(loading),
            "host_material": str(material),
            "reactant": str(reactant),
            "rate_mode": str(rate_mode),
            "use_theory_pipeline": bool(pipeline),
        }


def campaign_size(preset: str) -> int:
    spec = PRESETS[preset]
    n = 1
    for key in AXIS_KEYS:
        n *= len(spec[key])
    return n


def describe_preset(preset: str) -> Mapping[str, Any]:
    return {
        "preset": preset,
        "n_cases": campaign_size(preset),
        "axes": PRESETS[preset],
    }
