# Analytics Transparency Notes

## Backend Outputs Added
- `analytics_transparency.confidence_weights`
- `analytics_transparency.normalization`
- `analytics_transparency.sensitivity_note`
- `analytics_transparency.electrolyte_family`
- `analytics_transparency.electrolyte_species`
- `analytics_transparency.electrolyte_diagnostics.support_level`
- `analytics_transparency.electrolyte_diagnostics.activity_multiplier`
- `composition_provenance.combination_rule`
- `composition_provenance.applied_groups`
- `composition_provenance.excluded_theories`
- `validation.contradiction_reason_code`
- `transmutation_validation` (unified simulate + bubble-lattice): `parkhomov_match`, `matching_reactions`, `total_candidates`, `source`
- `dimensionless_parameters` (bubble-lattice): `hartmann_number`, `magnetic_reynolds_number`, `wall_conductivity_regime`, `notes`

## Purpose
- Make confidence composition and normalization inspectable from API payloads.
- Avoid hidden score aggregation logic in frontend-only paths.
- Make electrolyte assumptions explicit (family, species, molarity regime, consistency checks).
- Expose overlap resolution policy so theory combinations are reproducible and auditable.
- Distinguish explicit contradiction reason taxonomy from generic warning text.
- Document Parkhomov-style validation and MHD dimensionless summaries returned beside primary physics outputs.

## Contradiction Reason Taxonomy
- `none`: no contradiction detected.
- `threshold_boundary`: enhancement at cap boundary without consistent phase assignment.
- `missing_phase_data`: required phase distribution keys absent.
- `inconsistent_mode`: run configuration indicates incompatible mode/species consistency.

## Composition Policy
- Runtime grouping prevents double counting from overlapping mechanisms (screening, coherence, confinement, etc.).
- Within each group, one theory is selected with `max(enhancement_factor * confidence)`.
- Excluded theories are still returned in per-theory outputs and tagged with `composition_status: excluded_overlap`.

