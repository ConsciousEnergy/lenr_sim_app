"""Experiment-anchored V&V gates (Phase 4, plan / RR-009, RR-016).

These gates encode *falsifiable* experimental observables as assertions against
the physics engine's own data tables and constants. They are deliberately
independent of any single endpoint so they keep protecting the science even as
the rate engine (Phase 5) and branching model (Phase 7) evolve.

Anchored observables and their sources:
- Miles He-4/heat correlation: 24 +/- 4 MeV released per He-4 atom detected
  (Miles et al. 1993 J. Electroanal. Chem. 346, 99; Bush et al. 1991).
- He-4 as the primary nuclear ash of clean Pd-D LENR (McKubre 1998; Storms 2007).
- Aneutronic / low-radiation signature: the heat-producing branch emits no
  commensurate neutron or gamma flux.
- NASA Lattice Confinement Fusion: ErD3 dynamic screening U_e ~ 347 eV and
  light-ion fusion channels (Steinetz et al. 2020, NASA/TP-2020-5001530;
  Pines et al. 2020 Phys. Rev. C 101, 044609).
- Parkhomov (2018) exothermic reaction subset reproducibility.
"""

import pytest

from app.physics_engine.parkhomov_validation import (
    validate_transmutation,
    infer_default_products,
    _REACTIONS,
)
from app.physics_engine.unified_lenr_model.screening_data import (
    get_screening_potential_range,
    ADIABATIC_LIMIT_EV,
)


# --- Reference bands (with citations in module docstring) ---------------------
MILES_MEV_PER_HE4_MIN = 20.0   # 24 - 4
MILES_MEV_PER_HE4_MAX = 28.0   # 24 + 4
NASA_LCF_ERBIUM_UE_EV = 347.0  # Steinetz/Pines ErD3 screening


def _find_reaction(reactants, products):
    """Return the curated Parkhomov row matching reactants->products, or None.

    Entries are ``(symbol, A)`` tuples so isotopes (Li-6 vs Li-7) are
    disambiguated; plain symbols match any mass number.
    """
    def _key(entries):
        return sorted(
            (e if isinstance(e, tuple) else (e, None)) for e in entries
        )

    def _row_key(entries):
        return sorted(entries)

    rset, pset = _key(reactants), _key(products)
    for row in _REACTIONS:
        r = _row_key(row.reactants)
        p = _row_key(row.products)
        r_match = all(
            any(rs == s and (ra is None or ra == a) for s, a in r)
            for rs, ra in rset
        ) and len(rset) == len(r)
        p_match = all(
            any(ps == s and (pa is None or pa == a) for s, a in p)
            for ps, pa in pset
        ) and len(pset) == len(p)
        if r_match and p_match:
            return row
    return None


def test_miles_he4_heat_correlation_band() -> None:
    """D+D -> He-4 Q-value must fall in the Miles 24 +/- 4 MeV/He-4 band.

    Falsifier: if the tabulated clean-fusion Q-value drifts outside 20-28 MeV,
    the engine would contradict the single most-cited LENR correlation.
    """
    row = _find_reaction(["D", "D"], ["He"])
    assert row is not None, "D+D -> He-4 branch missing from reaction table"
    assert MILES_MEV_PER_HE4_MIN <= row.energy_mev <= MILES_MEV_PER_HE4_MAX, (
        f"Q={row.energy_mev} MeV outside Miles band "
        f"[{MILES_MEV_PER_HE4_MIN}, {MILES_MEV_PER_HE4_MAX}]"
    )


def test_he4_is_primary_clean_lenr_ash() -> None:
    """Pd-D default product pathway must be He-4 (clean-LENR primary ash)."""
    products = infer_default_products("palladium", "deuterium")
    assert ("He", 4) in products, f"He-4 not the primary Pd-D product: {products}"


def test_clean_he4_branch_is_aneutronic() -> None:
    """The heat-producing He-4 branch must emit no neutron/gamma.

    Falsifier: a non-aneutronic 'clean' branch would contradict the observed
    absence of commensurate radiation in calorimetric LENR experiments.
    """
    row = _find_reaction(["D", "D"], ["He"])
    assert row is not None
    product_symbols = {s for s, _ in row.products}
    assert "n" not in product_symbols, "He-4 heat branch must be neutron-free"
    assert "gamma" not in product_symbols

    # Contrast: the hot-fusion D+D -> He-3 + n branch DOES carry a neutron,
    # so the table correctly distinguishes radiative from clean channels.
    hot = _find_reaction(["D", "D"], ["He", "n"])
    assert hot is not None
    assert "n" in {s for s, _ in hot.products}


def test_nasa_lcf_erbium_screening_anchor() -> None:
    """ErD3 dynamic screening prior must match the NASA LCF value (~347 eV)."""
    er = get_screening_potential_range("erbium")
    assert er.minimum <= NASA_LCF_ERBIUM_UE_EV <= er.maximum
    assert er.typical == pytest.approx(NASA_LCF_ERBIUM_UE_EV, rel=0.05)
    # Screening must exceed the universal adiabatic gas-target limit.
    assert er.minimum >= ADIABATIC_LIMIT_EV


def test_nasa_lcf_light_ion_channels_present() -> None:
    """p-Li7 -> 2 alpha and d-Li channels (LCF-relevant) must be tabulated."""
    p_li7 = _find_reaction([("H", 1), ("Li", 7)], [("He", 4), ("He", 4)])
    assert p_li7 is not None, "p+Li7 -> 2 He-4 channel missing"
    assert p_li7.energy_mev == pytest.approx(17.347, abs=0.1)


def test_parkhomov_subset_reproducible_exact_matches() -> None:
    """Curated Parkhomov rows must validate as exact (regression guard)."""
    res = validate_transmutation([("H", 1), ("Li", 7)], [("He", 4), ("He", 4)])
    assert res["parkhomov_match"] == "exact"
    assert res["total_candidates"] >= 1

    res_dd = validate_transmutation([("D", 2), ("D", 2)], [("He", 4)])
    assert res_dd["parkhomov_match"] == "exact"


def test_screening_ranges_are_ordered_and_cited() -> None:
    """Every screening range must satisfy min<=typical<=max and carry citations.

    Guards RR-007: the material-dependent range replaces the single 800 eV scalar.
    """
    for material in ("palladium", "nickel", "titanium", "erbium", "lithium"):
        rng = get_screening_potential_range(material)
        assert rng.minimum <= rng.typical <= rng.maximum
        assert rng.minimum >= ADIABATIC_LIMIT_EV
        assert rng.citations, f"{material} screening range has no citation"
