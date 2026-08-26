# Application datasets (v1)

Versioned JSON tables consumed by the LENR_SIM_APP loaders. Python modules
remain the runtime API; these files are the citable source of truth.

**Epistemic rule:** rows tagged `EMP` / `null` / `disputed` / `contested` are
literature anchors for campaigns and opt-in scoring. Extra model-output
simulations do not raise `claim_tier` or close `EQ-OPEN-*`.

| File | Rows | Loaded by |
|------|------|-----------|
| `literature_baselines.v1.json` | 17 | `app.data.baseline_experiments` |
| `screening_priors.v1.json` | 5 hosts | `unified_lenr_model.screening_data` |
| `parkhomov_curated.v1.json` | curated subset | `parkhomov_validation.py` |
| `open_question_register.v1.json` | Q1–Q5 | campaigns / docs / Lean IR |
| `testable_predictions.v1.json` | Predictions 1–7 | virtual-lab crosswalk |
| `reviewer_packs/` | export envelopes | `export_reviewer_pack` |

The full Parkhomov SQLite (~519k rows, ~161 MB) is **not** shipped.
