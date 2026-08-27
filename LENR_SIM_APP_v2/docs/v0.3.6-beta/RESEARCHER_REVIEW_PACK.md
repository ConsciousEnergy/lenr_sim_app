# Researcher review pack (v0.3.6-beta)

How to collect, inspect, **import**, and export **model-output** rows for other researchers.
Extra simulations do **not** prove LENR, close `EQ-OPEN-*`, or raise `claim_tier`.

## Clone ≠ 126 Analytics rows

`git pull` of `lenr_sim_app_v0.3.6-beta` ships **code** and literature JSON, not
the cloud agent's SQLite. App startup creates tables only.

| After | Analytics Total Records | What it is |
|-------|-------------------------|------------|
| Pull and start | 0 | Empty sqlite |
| `seed_database` | ~17 | Literature baselines (includes Miles 1993). Old DBs without `--force` stay at 16 |
| Seed + a couple of UI runs | ~18 | The usual “I synced but I am not on 126” state |
| Import `q_campaign_demo` or `--hydrate-demo` | ~126 | 17 Baseline + Campaign model-output rows (includes association_screen) |
| Re-run campaign presets including association_screen | ~126+ | Live physics; same honest N, slower |

Point `LENR_SQLITE_PATH` at the **same** file the API uses. A second sqlite
(`/tmp/lenr_reviewer.db`) will look like 16–18 forever.

Analytics Overview does **not** show a CLI hydrate warning. Seed-only vs campaign
N is in the caption. Use the commands below (from `LENR_SIM_APP_v2/backend`).

```bash
# Match the cloud/PR Analytics screenshot (from LENR_SIM_APP_v2/backend)
python -m app.scripts.seed_database --force --hydrate-demo
# equivalent:
python -m app.scripts.import_reviewer_pack --in ../datasets/reviewer_packs/q_campaign_demo
```

Committed demo pack: `LENR_SIM_APP_v2/datasets/reviewer_packs/q_campaign_demo/`
(126 experiments, 108 `theory_runs`, including association_screen). Smoke fixture N=1 remains for tests.
Do **not** git-add `reviewer_packs/local/` (export scratch).
Do **not** write campaign or UI model outputs into `literature_baselines.v1.json`
(cited literature only). Persist those rows in the app DB / demo pack.

## Commands (from `LENR_SIM_APP_v2/backend`)

```bash
python -m app.scripts.run_simulation_campaign --preset literature_grid
python -m app.scripts.run_simulation_campaign --preset all_claims
python -m app.scripts.run_simulation_campaign --preset question_theories
python -m app.scripts.run_simulation_campaign --preset association_screen
python -m app.scripts.export_reviewer_pack --out ../datasets/reviewer_packs/local
python -m app.scripts.report_open_question_stress --out ../datasets/reviewer_packs/local
python -m app.scripts.import_reviewer_pack --in ../datasets/reviewer_packs/q_campaign_demo
```

Do **not** run `--preset full` or full `--preset diverse` in CI. Optional
`--uq-samples 512` applies Sobol only to the first two cells (API cap 512;
default UQ stays off). Optional `--live-scores` on the stress report samples
five-factor vs literature-likelihood; it does not close `EQ-OPEN-*`.

Honest N: literature_grid (~16–32 designed cells, one per `literature_id` plus
negative controls) + all_claims (~6 unified + one run per registered theory) +
question_theories (~20–45 isolated theory×literature cells) + association_screen
(~18 Miles/McKubre/ARPA-E T×loading cells) + optional diverse
(~237). That is a few hundred persisted model rows, not the paper’s Monte Carlo
aspiration of \(10^4\)–\(10^6\).

Smoke fixture (in git): `LENR_SIM_APP_v2/datasets/reviewer_packs/smoke/`.
Demo hydrate pack (in git): `LENR_SIM_APP_v2/datasets/reviewer_packs/q_campaign_demo/`.

## What N means

| Surface | What it shows | What it is not |
|---------|---------------|----------------|
| Analytics Overview | SQL `experiments` counts, completion vs scientific-positive | LENR proof |
| Relevance Map SQL mean | Mean five-factor `final_score` over persisted `theory_runs`, with N and percentile CI | Experimental confirmation |
| History Model association % | Mean `final_score` on that experiment’s `pipeline_scores` | P(LENR) or proof |
| Live scores | Heuristic at stated conditions; opt-in `score_mode=five_factor_plus_literature` | Auto-promote of claim tiers |
| Reviewer pack JSONL | Export of SQL rows + `campaign_invariants` | Discharge of Q1–Q5 |
| Open-question stress | N by `EQ-OPEN-*` from `parameters_json`, still_missing copied from the register | Discharge of Q1–Q5 |

`scientificPositiveRate` ≠ LENR proof. Persist stores `parameter_sensitivity = 0.5`
unless you click **Run live scores**.

## Datasets

Versioned JSON under `LENR_SIM_APP_v2/datasets/` (Python modules are loaders):

- `literature_baselines.v1.json` — 17 cited seeds (includes Miles 1993 EMP), stable UUID5 ids
- `screening_priors.v1.json` — material \(U_e\) ranges
- `parkhomov_curated.v1.json` — curated subset; full ~519k SQLite is not shipped
- `open_question_register.v1.json` — Q1–Q5 still `OPEN`
- `testable_predictions.v1.json` — PRED-01…07 with falsifiers

## Lean

`formalization/lean/LenrFormal/OpenQuestionBounds.lean` adds **would-close-if**
lemmas. `EQ-OPEN-*` stay `OPEN`. There is no `theorem lenr_occurs`.
See `docs/FORMALIZATION/FORMAL_PROOF_STATUS.md`.
