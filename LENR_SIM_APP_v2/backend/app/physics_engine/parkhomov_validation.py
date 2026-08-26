"""
parkhomov_validation.py
=======================

Lightweight validation service that checks whether a simulation's predicted
reactant -> product transmutation pathway matches an entry in the
Dr. Alexander Parkhomov (2018) exothermic nuclear reaction database
(as republished via `db.lenr.academy` / `nanosoft.co.nz`).

The full Parkhomov database has ~518,995 entries and ships as a ~161 MB
SQLite file. For in-process validation we only need the subset of fusion
and 2->2 transmutation reactions relevant to the hosts we model
(Pd, Ni, Ti, Li + H/D). The curated sample below (~40 rows) is sufficient
to return useful "exact / partial / none" verdicts in UI without shipping
a large binary blob.

Added as part of v0.3.6-beta refactor (plan §3A).

Reference: Parkhomov, A. G. (2018) "Nuclear Reactions in LENR: Review of
Experimental Results", republished by LENR Academy.
"""

from __future__ import annotations

from dataclasses import dataclass, asdict
from typing import Any, Dict, List, Optional, Tuple, Sequence

from app.data.dataset_io import parkhomov_curated


# ---------------------------------------------------------------------------
# Curated subset of Parkhomov-tabulated exothermic reactions.
# Each entry: reactants[], products[], energy_mev, category, neutrino,
# classification. Energy values are approximate Q-values in MeV (positive
# means exothermic). Elements are stored as (symbol, A) tuples where A is
# the mass number. Z is implicit from the symbol and resolved by
# `_ATOMIC_NUMBER` below so the lookup is tolerant to isotope labels.
# ---------------------------------------------------------------------------

def _nuclide(row: Dict[str, Any]) -> Tuple[str, int]:
    return (str(row["symbol"]), int(row["A"]))


def _load_atomic_number() -> Dict[str, int]:
    raw = parkhomov_curated().get("atomic_number") or {}
    return {str(key): int(value) for key, value in raw.items()}


def _load_reactions() -> Tuple[ParkhomovReaction, ...]:
    rows = parkhomov_curated().get("reactions") or []
    loaded: List[ParkhomovReaction] = []
    for row in rows:
        loaded.append(
            ParkhomovReaction(
                reactants=tuple(_nuclide(item) for item in row.get("reactants") or ()),
                products=tuple(_nuclide(item) for item in row.get("products") or ()),
                energy_mev=float(row["energy_mev"]),
                category=str(row["category"]),
                classification=str(row["classification"]),
                neutrino=str(row.get("neutrino") or "none"),
                notes=str(row.get("notes") or ""),
            )
        )
    return tuple(loaded)


_ATOMIC_NUMBER: Dict[str, int] = _load_atomic_number()


@dataclass(frozen=True)
class ParkhomovReaction:
    """A canonical Parkhomov reaction row."""

    reactants: Tuple[Tuple[str, int], ...]
    products: Tuple[Tuple[str, int], ...]
    energy_mev: float
    category: str  # "fusion" | "transmutation" | "fission"
    classification: str  # "boson-boson" | "fermion-fermion" | "mixed"
    neutrino: str  # "none" | "nu" | "anti-nu"
    notes: str = ""


# Compact curated table loaded from parkhomov_curated.v1.json.
_REACTIONS: Tuple[ParkhomovReaction, ...] = _load_reactions()


# ---------------------------------------------------------------------------
# Normalisation helpers
# ---------------------------------------------------------------------------


def _normalise_element(symbol: str, mass_number: Optional[int] = None) -> Tuple[str, int]:
    """Return a canonical (symbol, A) tuple.

    Accepts inputs like ``"D"``, ``"deuterium"``, ``"Pd-106"``, ``"Ni62"``.
    """
    if not symbol:
        raise ValueError("Element symbol is required")

    s = str(symbol).strip()
    lower = s.lower()

    # Common aliases used in our simulation layer
    aliases = {
        "hydrogen": ("H", 1),
        "protium": ("H", 1),
        "proton": ("H", 1),
        "deuterium": ("D", 2),
        "deuteron": ("D", 2),
        "tritium": ("T", 3),
        "triton": ("T", 3),
        "helium": ("He", 4),
        "alpha": ("He", 4),
        "lithium": ("Li", 7),
        "palladium": ("Pd", 106),
        "nickel": ("Ni", 58),
        "titanium": ("Ti", 48),
        "neutron": ("n", 1),
    }
    if lower in aliases:
        return aliases[lower]

    # Strip "-" or digits appended to symbol: "Pd-106" or "Pd106"
    sym = ""
    digits = ""
    for ch in s.replace("-", "").replace("_", ""):
        if ch.isalpha():
            sym += ch
        elif ch.isdigit():
            digits += ch
    if not sym:
        raise ValueError(f"Could not parse element symbol from {symbol!r}")

    # Preserve canonical casing (first upper, rest lower)
    sym = sym[0].upper() + sym[1:].lower() if len(sym) > 1 else sym.upper()
    a = int(digits) if digits else (mass_number if mass_number else 0)
    if a == 0:
        # Unknown isotope: caller will match at Z-level only
        a = -1
    return (sym, a)


def _z_of(symbol: str) -> Optional[int]:
    return _ATOMIC_NUMBER.get(symbol)


def _as_multiset(entries: Sequence[Tuple[str, int]]) -> Tuple[Tuple[str, int], ...]:
    return tuple(sorted(entries, key=lambda e: (e[0], e[1])))


def _match_score(
    request_reactants: Sequence[Tuple[str, int]],
    request_products: Sequence[Tuple[str, int]],
    row: ParkhomovReaction,
) -> str:
    """Return 'exact', 'partial', or 'none' for a candidate row."""
    req_r = _as_multiset(request_reactants)
    req_p = _as_multiset(request_products)
    row_r = _as_multiset(row.reactants)
    row_p = _as_multiset(row.products)

    if req_r == row_r and req_p == row_p:
        return "exact"

    # Z-only match (isotope unknown on our side)
    def z_set(entries):
        return tuple(sorted(_z_of(s) or 0 for s, _ in entries))

    if z_set(req_r) == z_set(row_r) and z_set(req_p) == z_set(row_p):
        return "partial"

    # Relaxed: request products are a subset of row products (e.g. we only
    # care about main nucleus, ignoring neutron/gamma)
    if req_r == row_r and all(p in row_p for p in req_p):
        return "partial"

    return "none"


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def validate_transmutation(
    reactants: Sequence[Any],
    products: Sequence[Any] = (),
    *,
    max_results: int = 5,
) -> Dict[str, Any]:
    """Validate a predicted transmutation path against the Parkhomov table.

    Parameters
    ----------
    reactants, products:
        Each entry may be a plain string (``"D"``, ``"Pd-106"``, ``"palladium"``)
        or a ``(symbol, A)`` tuple/list.
    max_results:
        Cap on the number of matching rows returned (sorted by MeV).

    Returns
    -------
    dict with keys:
        ``parkhomov_match``: one of ``"exact"``, ``"partial"``, ``"none"``
        ``matching_reactions``: list of top matches (newest first)
        ``total_candidates``: integer
        ``source``: attribution string
    """
    if not reactants:
        return _empty_result("missing_reactants")

    normalised_reactants = []
    for entry in reactants:
        if isinstance(entry, (tuple, list)) and len(entry) == 2:
            normalised_reactants.append(_normalise_element(entry[0], int(entry[1])))
        else:
            normalised_reactants.append(_normalise_element(entry))

    normalised_products = []
    for entry in products or ():
        if isinstance(entry, (tuple, list)) and len(entry) == 2:
            normalised_products.append(_normalise_element(entry[0], int(entry[1])))
        else:
            normalised_products.append(_normalise_element(entry))

    # Score every row, keep best bucket
    exact: List[ParkhomovReaction] = []
    partial: List[ParkhomovReaction] = []
    for row in _REACTIONS:
        score = _match_score(normalised_reactants, normalised_products, row)
        if score == "exact":
            exact.append(row)
        elif score == "partial":
            partial.append(row)

    if exact:
        verdict = "exact"
        hits = exact
    elif partial:
        verdict = "partial"
        hits = partial
    else:
        verdict = "none"
        # When no product constraint is supplied, fall back to reactant-only hits
        if not normalised_products:
            for row in _REACTIONS:
                if _match_score(normalised_reactants, [r for r, _ in row.products] and row.products, row) != "none":
                    continue
                if _as_multiset(normalised_reactants) == _as_multiset(row.reactants):
                    partial.append(row)
            hits = partial
            if hits:
                verdict = "partial"
        else:
            hits = []

    hits_sorted = sorted(hits, key=lambda r: -r.energy_mev)[:max_results]

    return {
        "parkhomov_match": verdict,
        "matching_reactions": [_serialise_row(r) for r in hits_sorted],
        "total_candidates": len(hits),
        "source": "Parkhomov (2018) via LENR Academy",
        "table_version": "v0.3.6-beta-curated-subset",
    }


def _empty_result(reason: str) -> Dict[str, Any]:
    return {
        "parkhomov_match": "none",
        "matching_reactions": [],
        "total_candidates": 0,
        "source": "Parkhomov (2018) via LENR Academy",
        "table_version": "v0.3.6-beta-curated-subset",
        "reason": reason,
    }


def _serialise_row(row: ParkhomovReaction) -> Dict[str, Any]:
    data = asdict(row)
    # Re-render as plain dicts for JSON
    data["reactants"] = [{"symbol": s, "A": a} for s, a in row.reactants]
    data["products"] = [{"symbol": s, "A": a} for s, a in row.products]
    return data


def infer_default_reactants(host: str, reactant: str) -> List[Tuple[str, int]]:
    """Heuristic: pick the dominant nuclear-active reactant pair.

    For host-mediated LENR the host typically provides confinement while the
    true fusion pair is reactant+reactant (e.g. D+D inside Pd lattice) or
    host_isotope+reactant (e.g. Ni-58+H, Li-7+H). This mirrors what the
    simulation actually predicts at the nuclear layer.
    """
    h = (host or "").strip().lower()
    r = (reactant or "").strip().lower()
    if h == "palladium" and r in {"deuterium", "deuteron"}:
        return [("D", 2), ("D", 2)]  # D-D fusion in Pd confinement
    if h == "nickel" and r in {"hydrogen", "protium", "proton"}:
        return [("Ni", 58), ("H", 1)]  # Parkhomov Ni-H transmutation
    if h == "lithium" and r in {"hydrogen", "protium", "proton"}:
        return [("H", 1), ("Li", 7)]  # p-Li7 -> 2 alpha
    if h == "titanium" and r in {"deuterium", "deuteron"}:
        return [("Ti", 48), ("D", 2)]
    return [host, reactant]  # best-effort; caller normalises


def infer_default_products(host: str, reactant: str) -> List[Tuple[str, int]]:
    """Heuristic product set for a host/reactant pair.

    Returns an empty list when the pathway is ambiguous, which allows
    ``validate_transmutation`` to fall back to reactant-only matching.
    """
    h = (host or "").strip().lower()
    r = (reactant or "").strip().lower()
    if h == "palladium" and r in {"deuterium", "deuteron"}:
        return [("He", 4)]  # clean-LENR D+D -> He-4 signature
    if h == "nickel" and r in {"hydrogen", "protium", "proton"}:
        return [("Cu", 59)]  # Ni-58 + H -> Cu-59
    if h == "lithium" and r in {"hydrogen", "protium", "proton"}:
        return [("He", 4), ("He", 4)]  # p-Li7 -> 2 alpha
    if h == "titanium" and r in {"deuterium", "deuteron"}:
        return [("V", 50)]
    return []


__all__ = [
    "validate_transmutation",
    "infer_default_products",
    "infer_default_reactants",
    "ParkhomovReaction",
]
