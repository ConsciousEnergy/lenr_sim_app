# Citation Standard (LENR Scientific Rigor Review 2026)

**Status:** Active policy. Applies to the research paper, code docstrings/`references`
fields, and all `docs/REVIEW_2026/` artifacts.

This is the short, reusable policy block referenced by Phase 0 of the
[plan](../../.cursor/plans). It governs how every source is cited so that the
code -> paper -> citation chain is unambiguous and verifiable.

---

## 1. Identifier priority (DOI-first)

For every reference, capture the strongest available identifier, in this order:

1. **DOI** (preferred) — e.g. `10.1103/PhysRevC.101.044610`.
2. **arXiv ID** — e.g. `arXiv:nucl-th/0608059`, used only when no DOI exists.
3. **Stable publisher/registry URL** — e.g. JCMNS article PDF, NASA TP number.

Every reference must additionally carry: **author(s), year, title, venue**
(journal/proceedings/book/preprint server), and volume/pages where applicable.

## 2. Citation-key convention

Use `AuthorYear` BibTeX keys, lowercased author surname + 4-digit year, with a
disambiguating letter when needed: `takahashi2016`, `hagelstein2025a`,
`steinetz2020exp`, `pines2020theory`, `tennfors2013`, `mulnix2026`,
`nguyen2026`. The same key is used in the paper BibTeX, the
[traceability matrix](TRACEABILITY_MATRIX.md), and code `references` lists.

## 3. Code `references` fields

`TheoryContribution` / `TheoryMetadata` `references` entries must be
human-readable AND resolvable to a bibliography key. Preferred form:

```
"Takahashi (2016), JCMNS 19, 298 — takahashi2016"
"Steinetz et al. (2020), Phys. Rev. C 101, 044610 — doi:10.1103/PhysRevC.101.044610"
```

The trailing `key` or `doi:` token is what the traceability matrix matches on.

## 4. Claim-tier + provenance pairing

Per [PROVENANCE_GOVERNANCE.md](../../LENR_SIM_APP_v2/docs/v0.3.6-beta/PROVENANCE_GOVERNANCE.md),
any user-facing scientific claim must carry both a **citation** and a
**claim_tier**. Contested mechanisms (e.g. Widom-Larsen) must cite **both** the
proposing work and its principal critique (scientific-integrity rule).

## 5. Numeric values

Every hardcoded physical constant, calibration value, or enhancement factor must
either:
- resolve to a citation key (measured/derived value), or
- be explicitly labelled a **model assumption** in code and in the matrix.

Single-point "magic numbers" that drive physics (e.g. screening potential) should
be replaced by cited ranges where the literature reports a range.
