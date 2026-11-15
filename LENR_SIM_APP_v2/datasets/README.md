# Application datasets (v1)

Versioned JSON tables consumed by the LENR_SIM_APP loaders. Python modules
remain the runtime API; these files are the citable source of truth.

**Epistemic rule:** rows tagged `EMP` / `null` / `disputed` / `contested` are
literature anchors for campaigns and opt-in scoring. Extra model-output
simulations do not raise `claim_tier` or close `EQ-OPEN-*`.

| File | Rows | Loaded by |
|------|------|-----------|
| `literature_baselines.v1.json` | 19 | `app.data.baseline_experiments` |
| `literature_iccf27.v1.json` | 6 | `app.campaign.iccf27` (extension; does not replace the 19) |
| `screening_priors.v1.json` | 9 hosts | `unified_lenr_model.screening_data` |
| `parkhomov_curated.v1.json` | curated subset | `parkhomov_validation.py` |
| `open_question_register.v1.json` | Q1–Q5 | campaigns / docs / Lean IR |
| `testable_predictions.v1.json` | Predictions 1–10 | virtual-lab crosswalk |
| `reviewer_packs/` | export envelopes | `export_reviewer_pack` |

Optional cite-gated calorimetry MoE on EMP rows: `sigma_Q_W`,
`sigma_Q_statistical_W`, `sigma_Q_systematic_W`, `moe_provenance`
(`literature_reported` | `literature_reported_instrument_precision` |
`model_assumption`), `moe_citation_keys`, `moe_notes`. Refuse fabricated
`literature_reported` σ_Q. Analytics `S_heat = Q/σ_Q` and
`discovery_grade_eligible` never close `EQ-OPEN-*` or set `lenr_proved`
(see `app.physics_engine.calorimetry_significance`).

The full Parkhomov SQLite (~519k rows, ~161 MB) is **not** shipped.
