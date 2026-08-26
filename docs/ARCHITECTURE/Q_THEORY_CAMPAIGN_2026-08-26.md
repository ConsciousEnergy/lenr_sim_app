# Q-anchored theory vs literature campaign (2026-08-26)

**Question this diagram answers:** how Miles and other literature_ids become
persisted campaign rows with open-question provenance, how isolated theories
are run at those cells, and why Q1–Q5 remain OPEN.

**Commit note:** dated for the Q-theory campaign; regenerate if persist keys
move. Extra rows are model outputs. They do not set `lenr_proved` or rewrite
`EQ-OPEN-*`.

```mermaid
flowchart TD
  json["datasets JSON literature_baselines.v1"]
  miles["miles-1993 EMP seed"]
  grid["literature_grid one cell per literature_id"]
  qslice["question_theories isolated theory at tagged cell"]
  sim["unified simulate"]
  persist["experiments.parameters_json tag literature_id claim_tag open_question_ids"]
  sql["experiments plus theory_runs"]
  stats["GET analytics stats openQuestionCounts"]
  report["report_open_question_stress JSON"]
  lab["virtual lab Q1-Q5 stay OPEN"]
  json --> miles
  miles --> grid
  json --> qslice
  grid --> sim
  qslice --> sim
  sim --> persist
  persist --> sql
  sql --> stats
  sql --> report
  sim --> lab
```

Related: `LENR_SIM_APP_v2/docs/v0.3.6-beta/RESEARCHER_REVIEW_PACK.md`,
`docs/ARCHITECTURE/THEORY_REVIEWER_CAMPAIGN_2026-08-26.md`.
