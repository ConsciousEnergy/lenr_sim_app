"""Shell-structure / nucleon-pairing branching prior (Phase 7 / RR-013).

Adds a *relative branching preference* over candidate nuclear products based on
nucleon-pairing and shell-closure structure. Motivated by Nguyen et al.,
"Quantum shell structure of proton-neutron pairing" (Nature, 2026,
doi:10.1038/s41586-026-10616-2, key ``nguyen2026``), which shows proton-neutron
pairing is organised by shell structure.

CRITICAL GUARDRAIL: this prior **only re-weights relative branching among
already-allowed products**. It does NOT change any reaction rate magnitude,
Q-value, or the absolute number of reactions. All outputs are tagged
``claim_tier = "speculative_exploratory"``. This keeps the established
calorimetric predictions untouched while letting the UI explain *which* product
channels are structurally favoured.

Physics basis (textbook + Nguyen 2026):
- The pairing term of the semi-empirical mass formula favours even numbers of
  like nucleons (even-Z, even-N): even-even > odd-mass > odd-odd.
- Closed shells at magic numbers (2, 8, 20, 28, 50, 82, 126) are extra-stable;
  He-4 (Z=N=2, doubly magic) is the canonical example and the observed primary
  clean-LENR ash.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Sequence, Tuple

CLAIM_TIER = "speculative_exploratory"
REFERENCES = ["nguyen2026"]

MAGIC_NUMBERS = frozenset({2, 8, 20, 28, 50, 82, 126})

# Atomic numbers for symbols we model (mirrors parkhomov_validation).
_Z: Dict[str, int] = {
    "H": 1, "D": 1, "T": 1, "n": 0, "He": 2, "Li": 3, "Be": 4, "B": 5,
    "C": 6, "N": 7, "O": 8, "F": 9, "Ne": 10, "Na": 11, "Mg": 12, "Al": 13,
    "Si": 14, "Ti": 22, "V": 23, "Cr": 24, "Mn": 25, "Fe": 26, "Co": 27,
    "Ni": 28, "Cu": 29, "Zn": 30, "Pd": 46, "Ag": 47, "Cd": 48, "Cs": 55,
    "Ba": 56, "Pr": 59, "Sm": 62, "Sr": 38, "Ga": 31, "Ge": 32, "Pt": 78,
}


@dataclass(frozen=True)
class PairingWeight:
    """Structural branching preference for a product set (relative, unnormalised)."""

    weight: float
    is_even_even: bool
    magic_closures: int
    claim_tier: str = CLAIM_TIER
    references: List[str] = field(default_factory=lambda: list(REFERENCES))


def _nucleus_pairing_score(symbol: str, mass_number: int) -> float:
    """Relative structural stability score for a single nuclide.

    Even-even nuclei score highest; magic Z or N add a closure bonus.
    Scores are dimensionless preference weights, not energies.
    """
    z = _Z.get(symbol)
    if z is None or mass_number <= 0:
        return 1.0  # unknown nuclide: neutral preference
    n = mass_number - z
    if n < 0:
        return 1.0

    z_even = z % 2 == 0
    n_even = n % 2 == 0
    if z_even and n_even:
        score = 1.6          # even-even: paired protons and neutrons
    elif z_even != n_even:
        score = 1.0          # odd-mass: one unpaired nucleon
    else:
        score = 0.5          # odd-odd: two unpaired nucleons

    closures = (1 if z in MAGIC_NUMBERS else 0) + (1 if n in MAGIC_NUMBERS else 0)
    score *= (1.0 + 0.25 * closures)
    return score


def pairing_preference(products: Sequence[Tuple[str, int]]) -> PairingWeight:
    """Structural branching preference for a product set (RORO).

    The weight is the product of per-nuclide pairing scores; higher means the
    channel is more structurally favoured. Relative only - never a probability.
    """
    if not products:
        return PairingWeight(weight=1.0, is_even_even=False, magic_closures=0)

    weight = 1.0
    all_even_even = True
    closures = 0
    for symbol, a in products:
        z = _Z.get(symbol)
        weight *= _nucleus_pairing_score(symbol, a)
        if z is not None and a > 0:
            n = a - z
            if not (z % 2 == 0 and n % 2 == 0):
                all_even_even = False
            closures += (1 if z in MAGIC_NUMBERS else 0)
            closures += (1 if n in MAGIC_NUMBERS else 0)
        else:
            all_even_even = False

    return PairingWeight(
        weight=float(weight),
        is_even_even=all_even_even,
        magic_closures=closures,
    )


def annotate_branching(
    matching_reactions: Sequence[Dict],
) -> Dict[str, object]:
    """Attach a normalised structural branching prior to Parkhomov matches.

    Parameters
    ----------
    matching_reactions:
        The ``matching_reactions`` list from
        ``parkhomov_validation.validate_transmutation`` (each row has a
        ``products`` list of ``{"symbol","A"}`` dicts).

    Returns
    -------
    dict with the same rows plus a ``shell_pairing_prior`` field per row
    (normalised so the priors over the returned set sum to 1) and a top-level
    ``claim_tier`` / ``references``. Rate magnitudes are NOT modified.
    """
    rows = list(matching_reactions or [])
    raw_weights: List[float] = []
    annotated: List[Dict] = []
    for row in rows:
        products = [
            (p.get("symbol", ""), int(p.get("A", 0) or 0))
            for p in row.get("products", [])
        ]
        pw = pairing_preference(products)
        raw_weights.append(pw.weight)
        annotated.append({**row, "_pairing_weight": pw.weight,
                          "is_even_even": pw.is_even_even,
                          "magic_closures": pw.magic_closures})

    total = sum(raw_weights) or 1.0
    for row, w in zip(annotated, raw_weights):
        row["shell_pairing_prior"] = round(w / total, 6)
        row.pop("_pairing_weight", None)

    return {
        "matching_reactions": annotated,
        "claim_tier": CLAIM_TIER,
        "references": list(REFERENCES),
        "note": (
            "Relative structural branching preference (nucleon pairing / shell "
            "closure). Re-weights channels only; does not alter rates or Q-values."
        ),
    }


__all__ = [
    "PairingWeight",
    "pairing_preference",
    "annotate_branching",
    "MAGIC_NUMBERS",
]
