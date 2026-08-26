# Campaign → SQL → Analytics → open-questions lab (2026-08-26)

**Question this diagram answers:** how literature-anchored campaign cells become
persisted `experiments` / `theory_runs`, show up on Analytics, and still leave
Q1–Q5 OPEN in the virtual lab.

**Commit note:** dated for the theory reviewer-pack campaign; regenerate if
routes move. Extra rows are model outputs. They do not set `lenr_proved` or
rewrite `EQ-OPEN-*`.

```mermaid
flowchart TD
  json["datasets JSON literature_baselines.v1"]
  grid["campaign preset literature_grid"]
  cli["run_simulation_campaign / theories.run"]
  sqlExp["experiments SQL"]
  sqlRun["theory_runs SQL"]
  overview["Analytics Overview SQL charts"]
  map["Relevance Map mean_final_score N CI"]
  pack["export_reviewer_pack JSONL"]
  lab["open_questions virtual lab"]
  lean["LenrFormal OpenQuestionBounds would-close-if"]
  json --> grid
  grid --> cli
  cli --> sqlExp
  cli --> sqlRun
  cli --> lab
  sqlExp --> overview
  sqlRun --> map
  sqlExp --> pack
  sqlRun --> pack
  lab --> pack
  lean -->|"predicates stay OPEN"| lab
```

```mermaid
flowchart LR
  live["Run live scores five_factor"]
  lit["opt-in five_factor_plus_literature"]
  sqlMean["SQL mean skip_sensitivity 0.5"]
  live --> mapNodes[Relevance Map node size]
  lit --> mapNodes
  sqlMean --> mapNodes
```

Related: `LENR_SIM_APP_v2/docs/v0.3.6-beta/RESEARCHER_REVIEW_PACK.md`,
`LENR_SIM_APP_v2/docs/v0.3.6-beta/ANALYTICS_TRANSPARENCY.md`,
`docs/ARCHITECTURE/OPEN_QUESTIONS_VIRTUAL_LAB_2026-08-22.md`.
