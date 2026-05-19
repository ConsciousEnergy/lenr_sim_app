"""
Parkhomov-style exothermic reaction lookup (lightweight subset).

Full Parkhomov / Nanosoft tables live in external databases (e.g. lenr.academy).
This module ships a small deterministic subset for contract validation and UI hints.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Sequence, Tuple

# Curated exothermic-style entries: (reactants tuple, products tuple, energy_mev, channel)
# Notation: element symbols as used in LENR literature (D = deuterium).
_REACTIONS: List[Tuple[Tuple[str, ...], Tuple[str, ...], float, str]] = [
    (("D", "D"), ("He4",), 23.8, "fusion"),
    (("D", "D"), ("T", "H"), 4.0, "fusion_branch"),
    (("D", "Ni"), ("Cu",), 0.0, "transmutation_placeholder"),
    (("H", "Ni"), ("Cu",), 0.0, "transmutation_placeholder"),
    (("D", "Pd"), ("Ag",), 0.0, "transmutation_placeholder"),
    (("H", "Pd"), ("Ag",), 0.0, "transmutation_placeholder"),
    (("D", "Ti"), ("V",), 0.0, "transmutation_placeholder"),
    (("Li", "D"), ("He4", "He4"), 0.0, "hypothetical_chain"),
    (("Li", "H"), ("He4",), 0.0, "hypothetical_chain"),
]


def _normalize_symbol(s: str) -> str:
    x = (s or "").strip()
    if not x:
        return ""
    low = x.lower()
    if low in ("d", "deuterium", "²h", "2h"):
        return "D"
    if low in ("h", "p", "protium", "hydrogen", "proton", "¹h", "1h"):
        return "H"
    if low in ("pd", "palladium"):
        return "Pd"
    if low in ("ni", "nickel"):
        return "Ni"
    if low in ("ti", "titanium"):
        return "Ti"
    if low in ("li", "lithium"):
        return "Li"
    return x[:2].title() if len(x) <= 2 else x[0].upper() + x[1:].lower()


def _host_reactant_pair(host: str, reactant: str) -> Tuple[str, str]:
    return _normalize_symbol(host), _normalize_symbol(reactant)


@dataclass
class ParkhomovMatch:
    parkhomov_match: str  # "exact" | "partial" | "none"
    matching_reactions: List[Dict[str, Any]]
    total_candidates: int
    source: str


def validate_transmutation(
    host_material: str,
    reactant: str,
    product_elements: Optional[Sequence[str]] = None,
) -> Dict[str, Any]:
    """
    Match host+reactant against a small embedded reaction table.

    ``product_elements`` is optional; when provided, ``exact`` requires a
    reaction whose product multiset overlaps.
    """
    h, r = _host_reactant_pair(host_material, reactant)
    products_norm = {_normalize_symbol(p) for p in (product_elements or []) if p}

    exact: List[Dict[str, Any]] = []
    partial: List[Dict[str, Any]] = []

    for reactants, products, mev, channel in _REACTIONS:
        if r in reactants and h in reactants:
            entry = {
                "reactants": list(reactants),
                "products": list(products),
                "energy_mev": float(mev),
                "channel": channel,
            }
            if products_norm and set(products).intersection(products_norm):
                exact.append(entry)
            else:
                partial.append(entry)

    if exact:
        status = "exact"
        matches = sorted(exact, key=lambda e: e["energy_mev"], reverse=True)[:5]
    elif partial:
        status = "partial"
        matches = sorted(partial, key=lambda e: e["energy_mev"], reverse=True)[:5]
    else:
        status = "none"
        matches = []

    total = sum(1 for reactants, _, _, _ in _REACTIONS if r in reactants and h in reactants)
    result = ParkhomovMatch(
        parkhomov_match=status,
        matching_reactions=matches,
        total_candidates=total,
        source="Parkhomov-style subset (embedded); see lenr.academy for full tables",
    )
    return {
        "parkhomov_match": result.parkhomov_match,
        "matching_reactions": result.matching_reactions,
        "total_candidates": result.total_candidates,
        "source": result.source,
    }
