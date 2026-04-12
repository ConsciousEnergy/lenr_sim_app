# Uncertainty and Identifiability Gate (Initial)

## Implemented in v0.3.6 baseline
- Confidence intervals generated for all theory contributions.
- Confidence penalties applied through parameter proximity and evidence weights.
- Falsification conditions attached to each theory contribution.

## Next Gate Expansion
- Add posterior identifiability checks across:
  - `loading_ratio`
  - `surface_roughness`
  - `defect_density`
  - `electrolyte_molarity_mol_l`
- Require identifiability pass before marking run output as high confidence.

