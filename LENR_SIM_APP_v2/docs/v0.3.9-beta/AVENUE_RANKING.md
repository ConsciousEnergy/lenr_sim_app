# Avenue ranking (Phase B) — lab informativeness over campaign packs

**Status:** Science-train module on `dev`. Does **not** prove LENR, does **not**
close any `EQ-OPEN-*`, and never sets `lenr_proved: true`.

## Purpose

Rank which **physical-experiment avenues** look most informative next, given:

1. Campaign / reviewer-pack model outputs (`smoke`, `q_campaign_demo`, and any
   future `cavitation_collapse_campaign` pack from Phase A).
2. Existing **reaction-rate UQ** with optional `experimental_band` posterior
   weighting ([`reaction_rate_uq.py`](../../backend/app/physics_engine/unified_lenr_model/reaction_rate_uq.py)).
3. **Collapse UQ** predictive intervals
   ([`collapse_uq.py`](../../backend/app/physics_engine/collapse_uq.py)).
4. **Decision-oracle** priors and `next_measurement` order
   ([`decision_oracle.py`](../../backend/app/physics_engine/decision_oracle.py)).

This is a **decision aid for lab design**, not a posterior over “LENR is true.”

## Honesty contract

| Field | Value |
|-------|--------|
| `schema` | `lenr-avenue-ranking-v1` |
| `kind` | `scenario_table_not_posterior` |
| `lenr_proved` | always `false` |
| `open_status[*]` | always `OPEN` for `EQ-OPEN-MEV/RAD/RATE/EC/YIELD-01` |
| `forbidden` | includes `LENR_PROVED`, `LENR_DISPROVED_AS_THEOREM` |

Contract tests:
[`test_avenue_ranking_contract.py`](../../backend/tests/test_integration/test_avenue_ranking_contract.py).

## Module map

| Path | Role |
|------|------|
| [`avenue_catalog.py`](../../backend/app/campaign/avenue_catalog.py) | Avenue → OPEN-id / ledger stress map |
| [`avenue_pack_io.py`](../../backend/app/campaign/avenue_pack_io.py) | Soft pack discovery + JSONL load |
| [`avenue_ranking.py`](../../backend/app/campaign/avenue_ranking.py) | Score table + honesty guard |

## Seed packs

```python
from app.campaign.avenue_ranking import rank_avenues

table = rank_avenues()  # prefers cavitation_collapse_campaign; else q_campaign_demo
```

- **Preferred:** `datasets/reviewer_packs/cavitation_collapse_campaign/` (Phase A / PR #299)
  when present — including pack-embedded `collapse_uq` percentiles.
- **Fallback:** `q_campaign_demo` (then `smoke` if nothing else is on disk).
- Presence of the cavitation pack also soft-boosts the `cavitation_collapse_uq`
  avenue score. Honesty fields are unchanged either way.

## Scoring (toy, labelled)

Informativeness blends (weights fixed in code):

1. Inverse `decision_oracle.next_measurement` rank (Miles heat–He first).
2. Pack coverage: fraction of cells tagging the avenue’s `EQ-OPEN-*` ids.
3. Rate-UQ **log-width shrink** when an `experimental_band` is applied
   (cell `fusion_rate` / observables, else a labelled default band).
4. Oracle log10 hypothesis separation under Miles-band vs null observations.
5. Collapse-UQ predictive peak-temperature width (cavitation avenue).
6. Soft boost when the Phase A cavitation pack is on disk.

Outputs remain `claim_tier: speculative_exploratory` at the table level.

## Avenue → OPEN / ledger stress (still OPEN)

| Avenue id | Stresses |
|-----------|----------|
| `miles_heat_helium_q` | `EQ-OPEN-MEV-01`, `EQ-OPEN-YIELD-01`, WH-ENP-01 |
| `gamma_ul_23p8` | `EQ-OPEN-RAD-01` |
| `calorimetry_sigma_q` | `EQ-OPEN-YIELD-01` |
| `p4_occupation` | `EQ-OPEN-MEV-01`, `EQ-OPEN-RATE-01` |
| `rate_budget_loading` | `EQ-OPEN-RATE-01` |
| `electron_capture_threshold` | `EQ-OPEN-EC-01` |
| `cavitation_collapse_uq` | `EQ-OPEN-RATE-01`, `EQ-OPEN-MEV-01`, `ENG-BUBBLE-FUSION-01`, `EQ-BBL-LIM-01` |

## Detector / weak screen pack → Q4 / RAD / RATE (Slice B note)

Reviewer pack
[`datasets/reviewer_packs/detector_weak_screen/`](../../datasets/reviewer_packs/detector_weak_screen/)
(`preset=detector_weak_screen`) is a **lab-design coverage seed**, not a
posterior:

| Pack cell family | Stresses (still OPEN) | Honesty |
|------------------|-----------------------|---------|
| Detector UL / Cd-ratio (SPAWAR, Taleyarkhan, Parkhomov Cd-wrapped SNM-14) | `EQ-OPEN-RAD-01`, and Parkhomov also `EQ-OPEN-RATE-01` | Contested / EMP anchors; Cd-wrap ≠ neutron proof |
| Weak EC-threshold (SAFIRE × Widom–Larsen) | `EQ-OPEN-EC-01` (Q4) | Contested SPEC path; deficit / bound companions stay OPEN |
| Moderator-null (ARPA-E) | `EQ-OPEN-RAD-01`, `EQ-OPEN-YIELD-01` | Negative-control style cell |

Re-ranking with `rank_avenues(pack_ids=["detector_weak_screen"])` may change
informativeness **ordering** among avenues that already stress these OPEN ids
(e.g. `gamma_ul_23p8`, `electron_capture_threshold`, `rate_budget_loading`).
That delta is a **design aid only** — it does **not** flip any `EQ-OPEN-*`
status, raise claim tiers, or set `lenr_proved`. Parkhomov detector-gas ν/ν̄
SPEC curated rows (`neutrino: anti-nu`, `feeds_production_rate: false`) never
enter production magnitudes or discharge Q4.

## Phase A plug-in

Drop a reviewer pack at
`LENR_SIM_APP_v2/datasets/reviewer_packs/cavitation_collapse_campaign/`
(`manifest.json` + `experiments.jsonl`). Ranking discovers it automatically;
no API or schema break required.

## Non-goals

- Closing `EQ-OPEN-*` or flipping `lenr_proved`
- Claiming a laboratory Bayesian posterior from simulation packs alone
- Theory Paper frontend / Swarm ops changes
