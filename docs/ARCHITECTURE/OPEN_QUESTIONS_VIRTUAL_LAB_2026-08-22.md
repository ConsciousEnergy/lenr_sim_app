# Open-questions virtual lab — architecture map (2026-08-22)

**Question this diagram answers:** how a unified / bubble-lattice / theory-pipeline
run becomes an additive `open_questions` determination without changing
`contract_version` or multiplying rival engines.

**Commit note:** dated at introduction of the virtual lab; regenerate if routes move.

```mermaid
flowchart TD
  ui[UnifiedTheory ResultsPanel]
  sim["POST /api/unified/simulate"]
  bub["POST /api/unified/bubble-lattice"]
  pipe["POST /api/physics/theories/run"]
  oq[open_questions.build_open_questions]
  lean[LenrFormal theorems]
  dec[decision_oracle]
  mhd[multiscale_bridge MHD-to-MHD]
  ui --> sim
  ui --> bub
  ui --> pipe
  sim --> oq
  bub --> oq
  pipe --> oq
  lean -->|"oracle_a IDs"| oq
  dec -->|"oracle_b status alphabet"| oq
  mhd -->|"coupling_kind label"| oq
  oq --> ui
```

```mermaid
flowchart LR
  subgraph engines [Three composition engines never multiplied]
    pipeEng[theory_pipeline grouped_max cap 1e5]
    bubEng[bubble_lattice mechanism product cap 1e5]
    legEng[legacy geometric_mean when use_theory_pipeline false]
  end
  pipeEng -.->|"illegal product pedagogy"| bad[DoNotMultiply]
  bubEng -.->|"illegal product pedagogy"| bad
  legEng -.->|"illegal product pedagogy"| bad
```

```mermaid
flowchart TB
  h2[two_body 0.5 n^2 sigma_v P]
  htrap[trapped_state WKB at 25 pm]
  h3[three_body sequential p+e then n+d]
  h2 -.->|"modes replace"| dispatch[rate_mode dispatch]
  htrap -.-> dispatch
  h3 -.-> dispatch
```

```mermaid
flowchart TB
  emp[OracleEMP Miles and lab ingest]
  umbf[many_body FGR + branching]
  lean[LenrFormal WhenHow Branching]
  dec[decision_oracle mechanism paths]
  oq[open_questions occurrence when how]
  ui[OpenQuestionsVirtualLab]
  emp -->|"occurrence_anchored"| dec
  umbf -->|"fgr_parameters"| oq
  lean -->|"oracle_a IDs"| oq
  dec -->|"when_how status"| oq
  oq --> ui
```

Verified against:

- `LENR_SIM_APP_v2/backend/app/physics_engine/many_body/`
- `LENR_SIM_APP_v2/backend/app/api/routes/unified_simulation.py`
- `LENR_SIM_APP_v2/backend/app/api/routes/physics.py` (`/theories/run`)
- `LENR_SIM_APP_v2/backend/app/physics_engine/theory_pipeline.py`
- `LENR_SIM_APP_v2/backend/app/physics_engine/open_questions.py`
- `LENR_SIM_APP_v2/backend/app/physics_engine/decision_oracle.py`
- `LENR_SIM_APP_v2/backend/app/physics_engine/mhd/multiscale_bridge.py`
- `LENR_SIM_APP_v2/frontend/src/components/physics/OpenQuestionsVirtualLab.jsx`

Engines that must never be multiplied: theory-pipeline grouped product,
bubble-lattice mechanism product, legacy geometric-mean
(`use_theory_pipeline=false`). Rate modes `two_body` | `trapped_state` |
`three_body` are a dispatch, not a product. MHD bridge is a restriction
cascade (`coupling_kind: mhd_to_mhd_cascade`), not a QED operator.
