# Analytics pack hydrate (2026-08-26)

**Question this diagram answers:** why a local `git pull` of beta shows ~18
Analytics records while a cloud campaign run showed ~107, and how import
restores that N without re-simulating.

**Commit note:** dated for pack import. Imported rows are model outputs. They
do not set `lenr_proved` or rewrite `EQ-OPEN-*`.

```mermaid
flowchart LR
  gitPull["git pull beta"] --> jsonSeeds["literature_baselines.v1.json"]
  jsonSeeds --> seedCli["seed_database"]
  seedCli --> sql17["sqlite ~17 Baseline"]
  sql17 --> caption["Analytics caption seed vs campaign N"]
  demo["reviewer_packs/q_campaign_demo"] --> importCli["import_reviewer_pack"]
  importCli --> sql107["sqlite 17 Baseline plus 90 Campaign"]
  sql107 --> stats["GET analytics stats sourceClassCounts"]
  stats --> ui["Total Records ~107"]
  live["run_simulation_campaign three presets"] --> sql107
```

Related: `LENR_SIM_APP_v2/docs/v0.3.6-beta/RESEARCHER_REVIEW_PACK.md`,
`LENR_SIM_APP_v2/docs/v0.3.6-beta/ANALYTICS_TRANSPARENCY.md`.
