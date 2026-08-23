# Theory Composition Contract (v0.3.6-beta)

Which enhancement number means what, how each is assembled, and which ones may
never be multiplied together.

## Why this document exists

Four different composition rules existed for what reads as "the" enhancement
factor, with no statement of how they relate:

| Source | Rule |
|---|---|
| Unified theory paper, computational section | `f_screening x f_field x f_coherence x f_phonon` |
| `bubble_lattice_interaction._calculate_enhancement_breakdown` | product of seven mechanisms plus the electrolyte multiplier |
| `theory_pipeline._combine_contributions` | `grouped_max_confidence_product` |
| `unified_lenr_model.model._combine_enhancements` | primary product times secondary geometric mean |

A user looking at the Unified Theory page sees two large numbers on one screen:
the bubble-lattice peak enhancement and the Theory Testbed combined enhancement.
Nothing said they come from different engines, so treating them as factors of a
single product was an easy and badly wrong inference.

## Canonical rule

`grouped_max_confidence_product` in
[theory_pipeline.py](../../backend/app/physics_engine/theory_pipeline.py) is the
canonical composition rule for the theory pipeline:

1. Group applicable contributions by `THEORY_COMPOSITION_GROUPS`.
2. Within a group, keep the single contribution maximising
   `enhancement_factor * confidence`. Losers are marked `excluded_overlap` and
   reported in `composition_provenance.excluded_theories`.
3. Multiply the group winners. Energy is summed rather than multiplied.
4. Clamp the product to `MAX_ENHANCEMENT_FACTOR` (1e5).

Grouping is what keeps the result defensible. Theories in one group are rival
explanations of the same physics, so multiplying them would compound alternative
descriptions of a single effect.

| Group | Members | Why they are exclusive |
|---|---|---|
| `screening` | `electron_screening`, `quantum_tunneling` | Both act on the Coulomb barrier / tunnelling probability |
| `coherence` | `coherent_qed`, `vysotskii_ccs`, `kim_bec`, `takahashi_tsc` | Competing many-body accounts of coherent barrier suppression |
| `confinement` | `bubble_mhd_confinement`, `casimir_confinement` | Confinement energy at the collapse site |
| `surface_activation` | `nae_model`, `swartz_nanor`, `hydroton` | Rival active-site / nano-gap geometries |
| `phonon_transfer` | `hagelstein_phonon`, `phonon_coupling_legacy` | Same mechanism, legacy wrapper |
| `weak_interaction` | `widom_larsen`, `chubb_ion_band` | Rival single-mechanism accounts of the "three miracles" |
| `transmutation_route` | `iwamura_transmutation`, `matsumoto_enc` | Predict the same product spectra by different routes |
| `empirical_correlation` | `miles_heat_helium`, `letts_laser`, `piantelli_ni_h` | Observed correlations, not independent barrier mechanisms |
| `thermodynamic_framing` | `non_equilibrium_thermo` | A framing of the energetics, not an extra channel |
| `context_line` | `stellar_scaling_mhd` | Non-LENR regime, comparison only |

### The `independent` fallback is a bug, not a design

Any theory absent from `THEORY_COMPOSITION_GROUPS` lands in
`UNGROUPED_FALLBACK_GROUP` and **each such theory multiplies into the total**.
Ten theories previously sat there, so enabling Takahashi, Widom-Larsen, Chubb,
Iwamura, Letts and others produced one product of mutually exclusive accounts.

The pipeline now logs a warning and reports
`composition_provenance.ungrouped_theories`. `test_theory_composition_contract.py`
fails if any registered theory is unassigned.

## Non-combinable quantities

These come from **separate engines**. Neither is a factor of the other.

| Quantity | Engine | Rule |
|---|---|---|
| `peak_conditions.enhancement_factor` (`/api/unified/bubble-lattice`) | bubble-lattice mechanism product | phenomenological multiplicative |
| `combined_enhancement` (`/api/physics/theories/run`) | theory pipeline | `grouped_max_confidence_product` |

Both responses now state this in-band:

- bubble-lattice: `validation.composition_contract.not_combinable_with`
- theory pipeline: `composition_provenance.not_combinable_with`

The bubble-lattice mechanism product is a **scenario calculation**, not a claim
that the seven mechanisms are independent. QED, Rydberg and compression all
scale with collapse intensity and are therefore correlated; the product is an
upper-bound-style construction reported under a claim-tier ceiling.

## Claim-tier resolution

`classify_evidence_tier` can only emit `empirical_lenr_correlation` or
`speculative_exploratory`, but the governance vocabulary defines five tiers with
different weightings. Overwriting a module's declaration therefore erased
information: `cross_regime_extrapolation` (0.20x) was promoted to
`speculative_exploratory` (0.30x), and `established_reference` /
`validated_lenr_mechanism` could never be reported by a pipeline run.

Policy, implemented in `resolve_claim_tier`:

> The rubric may **downgrade** a module's declared claim tier when the confidence
> score is weak. It may never **upgrade** one. Whichever tier is weaker wins.

`resolve_evidence_class` additionally preserves a declared
`cross_regime_extrapolation`, since that is a statement about physical regime
that no confidence score can infer.

Every contribution carries `provenance.claim_tier_resolution` with the declared
tier, the rubric classification, the resolved value, and the policy.

## What the UI must show

- A composition summary with group winners and excluded overlaps
  (`composition_provenance` was returned by the API but rendered nowhere).
- Claim-tier chips on any quantitative claim.
- A statement that pipeline and bubble-lattice totals are separate engines.
- Confidence derived from the rubric `weighted_score`, never from the magnitude
  of the enhancement. `deriveSimulationHeadlineState` previously computed
  `log10(combined_enhancement)/8`, which reads a bigger number as more
  trustworthy and pins to a constant once the value saturates at 1e5.

## Known gaps

- The paper's four-factor formula and `THEORY_OVERVIEW.md` still describe a plain
  multiplicative combination and predate the group rule.
- `unified_lenr_model.model._combine_enhancements` keeps its geometric-mean
  hybrid; it is reachable only through `/api/unified/simulate` with
  `use_theory_pipeline=false`.
- `app/physics/oppenheimer_phillips.py` exists but is not a registered
  `TheoryModule`, so paper section 2.7 has no runnable module.

## Bubble-lattice prediction block (EQ-PRED-01)

The bubble-lattice `/api/unified/bubble-lattice` response carries a three-tier
`enhancement_breakdown.prediction` block:

| Tier | Role |
|---|---|
| `sensitivity_model` | Naive mechanism product (exploratory upper bound) |
| `physics_governed` | Grouped max-within-collapse-groups (EQ-BBL-COMP-01) |
| `claim_tier_display` | `min(physics_governed, 1e5)` — headline numbers use this |

Flat mechanism keys in `enhancement_breakdown` remain claim-tier display values.

## Screening: bubble route vs theory pipeline

| Path | U_e source | Typical Pd value | Combinable? |
|---|---|---|---|
| Bubble-lattice (`screening_kernel.py`) | Cited material range | **800 eV** | Canonical for collapse route |
| Theory pipeline (`electron_screening.py`) | Thomas-Fermi from `n_e` | **~27 eV** | Parallel; not multiplied with bubble total |

The theory pipeline's `electron_screening` and the bubble-lattice screening kernel
address the same physics by different models. They must not be read as independent
factors of a single product.
