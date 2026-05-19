# Provenance and Evidence Governance (v0.3.6-beta)

## Backend Metadata Fields
Each theory contribution now includes:
- `provenance.source`
- `provenance.validation_status`
- `provenance.model_version`
- `evidence_class`
- `reproducibility_tier`
- `claim_tier`

## Interpretation
- `evidence_class=replicated|partial|exploratory` communicates support depth.
- `claim_tier` separates empirical correlation from speculative mechanism.
- `validation_status` prevents silent promotion of non-applicable theory outputs.

## Governance Rule
- Any UI claim without evidence/provenance metadata is treated as non-release-ready.

