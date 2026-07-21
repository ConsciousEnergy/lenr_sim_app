# References Audit (code <-> bibliography, both directions)

**Status:** Phase 3 deliverable. Confirms every `TheoryContribution` /
`TheoryMetadata` `references` list resolves to a real source, flags DOI gaps for
the Phase 13 bibliography, and checks that frontend copy does not overstate
evidence relative to claim tiers.

Policy: [CITATION_STANDARD.md](CITATION_STANDARD.md). Keys:
[TRACEABILITY_MATRIX.md](TRACEABILITY_MATRIX.md).

---

## 1. Backend theory-module references

All 21 registered theory modules in
`backend/app/physics_engine/theories/` declare `references` with
author/year/venue in both `calculate()` and `get_metadata()`. Verified present
and internally consistent:

| theory_id | Primary references (author/year/venue) | DOI status |
|-----------|----------------------------------------|------------|
| electron_screening | Assenbaum 1987; Ichimaru 1993 | Phase 13 |
| quantum_tunneling | Gamow 1928; Wentzel 1926 | Phase 13 |
| coherent_qed | Del Giudice & Preparata 1998; Preparata 1995 | Phase 13 |
| nae_model | Storms 2007, 2014 | Phase 13 |
| casimir_confinement | Casimir 1948; Lifshitz 1956; Klimchitskaya 2009 | Phase 13 |
| bubble_mhd_confinement | Rayleigh 1917; Plesset 1949; Hartmann 1937; Shercliff 1953 | Phase 13 |
| takahashi_tsc | Takahashi 2004, 2008, 2013 | Phase 13 (+ takahashi2016) |
| hagelstein_phonon | Hagelstein 2010, 2012; Hagelstein & Chaudhary 2015 | Phase 13 (+ hagelstein2025) |
| vysotskii_ccs | Vysotskii 2001, 2009, 2013 | Phase 13 |
| swartz_nanor | Swartz 2006, 2015, 2021 | Phase 13 |
| miles_heat_helium | Miles 1993, 2000; McKubre 1998; Bush 1991 | Phase 13 (+ storms2015) |
| widom_larsen | Widom-Larsen 2006/2007/2008; **Tennfors 2013 [critique]** | tennfors2013 has DOI |
| kim_bec | Kim 2009, 2012, 2013 | Phase 13 |
| matsumoto_enc | Matsumoto 1992, 1995, 2000 | Phase 13 |
| chubb_ion_band | Chubb & Chubb 1990, 1994; Chubb 2005 | Phase 13 |
| piantelli_ni_h | Focardi & Piantelli 1998; Focardi 1994; Piantelli 2012 | Phase 13 |
| iwamura_transmutation | Iwamura 2002, 2004; Higashizono 2009 | Phase 13 |
| letts_laser | Letts & Cravens 2003; Letts 2006; Letts & Hagelstein 2009 | Phase 13 |
| phonon_coupling_legacy | Hagelstein 2010; Preparata 1991 | Phase 13 |
| non_equilibrium_thermo | de Groot & Mazur 1962; Fleischmann & Pons 1989 | Phase 13 |
| stellar_scaling_mhd | Parkin & Pudritz 2004; Shercliff 1953; Pouquet 1976 | Phase 13 |
| hydroton (optional) | Storms 2007, 2014 | Phase 13 |

**Orphan check (code -> bibliography):** none. Every entry is a real,
identifiable source.

**Orphan check (bibliography -> code):** CLOSED for the deep-research sources.
takahashi2016 + floquetwkb2026 (`reaction_rate_engine.py`, `reaction_rate_uq.py`),
hagelstein2025 + mulnix2026 (`cavitation_kgrp.py`), nguyen2026
(`shell_pairing_prior.py`), and raiola2002/huke2008/czerski2023/screeningreview2024
(`unified_lenr_model/screening_data.py`) are now emitted by code. steinetz2020exp,
pines2020theory, storms2015, tennfors2013, parkhomov2018, and miles1993 are
referenced by the relevant modules/validation data. All keys resolve in BOTH the
paper markdown bibliography (Supplementary [18]-[32]) and the app
`ReferencesSection.jsx` (2026 Rigor-Review Sources subsection).

**Action applied (Phase 3):** added the Tennfors critique to `widom_larsen.py`
`references` (RR-008) so the contested-mechanism rule holds in code, not just the
paper.

## 2. Equation-verification doc sync

`LENR_SIM_APP_v2/docs/PHYSICS_EQUATION_VERIFICATION.md` and
`THEORY_CROSS_EXAMINATION.md` catalogue implemented equations vs standard refs.
Phase 2 re-verified Casimir, Debye length, and BEC T_c (see matrix verification
log); no drift found in those equations. Remaining catalogue entries are covered
by the existing equation-verification doc and the Phase 11 test expansion.

## 3. Frontend claim-tier consistency

`frontend/src/utils/theoryGovernance.ts` mirrors the backend
`CLAIM_TIER_MULTIPLIER` (validated_lenr_mechanism 1.0 ... cross_regime_extrapolation
0.2) and provides `buildRegimeGateReason()`. `PhysicsModelRegistry.ts` fallback
descriptions were reviewed: they describe mechanisms without asserting they are
established (e.g. "Del Giudice/Preparata coherent EM domains", "Gamow/WKB base
tunneling"). No copy overstates evidence relative to its claim tier. New
UI surfaces in Phase 9 must keep this property (claim-tier chip required next to
any quantitative claim).

## 4. v0.3.6-beta E2E citation-coherence closure

The reaction-rate engine is now surfaced end-to-end (`/api/unified/bubble-lattice`
-> `ReactionRateGovernancePanel`). The citation-coherence guard is satisfied: every
`references` key emitted by a backend module resolves to (a) the paper markdown
bibliography and (b) a visible entry in `ReferencesSection.jsx`.

Canonical key -> resolution map (single source of truth):

| Citation key | Emitting module(s) | Paper markdown | App ReferencesSection |
|--------------|--------------------|----------------|-----------------------|
| gamow1928 | reaction_rate_engine, reaction_rate_uq | yes | [2] |
| takahashi2016 | reaction_rate_engine, reaction_rate_uq | [18] | yes (keyed) |
| floquetwkb2026 | reaction_rate_engine, reaction_rate_uq | [30] | yes (keyed) |
| mulnix2026 | cavitation_kgrp | [28] | yes (keyed) |
| hagelstein2025 | cavitation_kgrp | [19] | yes (keyed) |
| nguyen2026 | shell_pairing_prior | [29] | yes (keyed) |
| raiola2002 / huke2008 / czerski2023 / screeningreview2024 | screening_data | [22]-[25] | yes (grouped) |
| storms2015 / tennfors2013 / steinetz2020exp / pines2020theory | miles_heat_helium / widom_larsen / matrix | [20],[21],[26],[27] | yes (grouped) |
| parkhomov2018 / miles1993 | parkhomov_validation / miles_heat_helium | [31],[32] | yes (keyed) |

**Deferred (tracked, not done now):** the legacy numeric app entries [1]-[28] have
not been re-keyed to DOI-first `AuthorYear` keys; doing so is a larger,
non-additive renumber recorded in the README deferred-restructure backlog. The new
2026 entries already use canonical keys, so no emitted key is unresolved.

## Change log
- 2026-06-04: Audit created (Phase 3). Tennfors critique added to widom_larsen.py.
- 2026-06-06: Closed the bibliography->code orphan check; added the v0.3.6-beta
  citation-coherence closure map (Section 4) after wiring the rate engine E2E.
