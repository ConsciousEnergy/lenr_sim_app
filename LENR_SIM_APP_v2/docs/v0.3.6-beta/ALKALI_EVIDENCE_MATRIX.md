# Alkali Evidence Matrix (v0.3.6-beta)

## Intent
Bound alkali and electrolyte effects as electrochemical boundary modifiers only. No new nuclear channels are introduced by alkali selection.

## Matrix

| Ion Family | Support Tier | Default Evidence Weight | Runtime Status | Notes |
|---|---|---:|---|---|
| Li | replicated/strongest in electrolytic LENR context | 1.00 | primary | default family for Pd-D electrolytic presets |
| Na | partial/moderate | 0.82-0.92 | primary alternative | modeled with confidence penalty versus Li |
| K | partial/moderate-low | 0.76-0.88 | primary alternative | bounded modifier, conservative scaling |
| Rb | exploratory/low | 0.45-0.72 | optional low-support | explicit confidence penalty |
| Cs | exploratory/low | 0.40-0.68 | optional low-support | explicit confidence penalty |
| Fr | unsupported/practically irrelevant | n/a | excluded | not exposed in runtime controls |

## Parameter Bounds
- Recommended window: `0.01 <= electrolyte_molarity_mol_L <= 1.0`
- Soft extrapolation warning: `1.0 < molarity <= 2.0`
- Hard extrapolation warning: `molarity <= 0` or `molarity > 2.0`

## Implemented Contract Fields
- `electrolyte_family`
- `electrolyte_species`
- `electrolyte_molarity_mol_l`
- `confidence_breakdown.parameter_proximity`
- `confidence_breakdown.evidence_weight`

## Species Defaults and Mapping
- Family `li`: defaults to `lioh` (carbonate option: `li2co3`)
- Family `na`: defaults to `naoh` (carbonate option: `na2co3`)
- Family `k`: defaults to `koh` (carbonate option: `k2co3`)
- Family `mixed`: defaults to `mixed`
- Families `rb`, `cs`, and `other`: default to `other` with explicit low-support status

