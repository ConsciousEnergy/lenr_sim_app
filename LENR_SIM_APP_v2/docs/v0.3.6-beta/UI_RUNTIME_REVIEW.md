# UI Runtime Review (v0.3.6-beta)

## Scope
- Route/content synchronization between major pages.
- Analytics history critical action behavior (`View Details`).
- Theory Testbed and visualization cohesion.

## Findings and Fixes

### 1) Route/content synchronization
- Observation: route changed before heavy target pages finished rendering.
- Change: removed artificial dashboard navigation delay in `frontend/src/pages/DashboardNew.jsx`.
- Result: navigation is immediate, with only normal lazy-load transition.

### 2) Critical action feedback: `View Details`
- Observation: Analytics history `View Details` had no handler.
- Changes:
  - Added explicit click handler + route navigation in `frontend/src/pages/AnalyticsPage.jsx`.
  - Added simulation preview state handoff to detail page.
  - Added fallback notice and snapshot rendering in `frontend/src/pages/SimulationDetail.jsx` when live API detail is unavailable.
- Result: action always yields deterministic outcome (live details when available, explicit snapshot fallback otherwise).

### 3) Theory Testbed and visualization cohesion
- Observation: Theory Testbed controls and result panes were aligned.
- Result: pass; theory execution, observables bridge messaging, and panel updates were coherent in runtime review.

## Runtime Verdict
- Route/content sync: **PASS**
- Critical action feedback (`View Details`): **PASS**
- Theory Testbed cohesion: **PASS**

---

## Ship-readiness UI pass (2026-08-02)

### Scope
- First-load shell, Unified Theory governance UI, analytics shell, production API wiring, claim-tier / provenance visibility, and confirmation that Karahadian uncapped helpers are **not** presented as default validated predictions.

### Findings

#### 1) Application shell / first viewport
- Observation: SPA mounts `#root` on `/` (Playwright `app-shell.spec.js`).
- Result: **PASS**

#### 2) Unified Theory — claim tiers & provenance affordances
- Observation: `UnifiedTheoryPage` exposes governance glossary (`aria-label="Open governance glossary"`) and theory toggle chips via `TheoryTogglePanel` (`tier: …` labels) + `ReactionRateGovernancePanel` claim-tier chips. Rate modes keep `two_body` as validated baseline; `trapped_state` remains speculative.
- Karahadian bi-exponential helpers are opt-in Python APIs only (`calculate_heterogeneous_screening_enhancement`) and are **not** wired into `theory_pipeline` / default UI enhancement composition — no uncapped >1e18 factor shown as a validated default.
- Result: **PASS**

#### 3) Export / reproducibility path
- Observation: Unified Theory JSON/CSV export controls remain on the results surface; backend export/rate-engine contract tests lock `lenr-run-export-v1` / `contract_version`.
- Result: **PASS** (contract tests green)

#### 4) Analytics shell
- Observation: `/analytics` mounts a non-empty shell; prior View Details handler remains in place from the earlier runtime review.
- Result: **PASS** (Playwright analytics smoke)

#### 5) Production API wiring
- Observation: `frontend/src/config/api.js` production fallback is `https://api.conscious.energy` when `VITE_API_URL` / `REACT_APP_API_URL` unset; Cloudflare Pages build must set `VITE_API_URL=https://api.conscious.energy`.
- Result: **PASS** (code review)

#### 6) Responsive / mobile smoke
- Observation: primary routes use MUI layout with flex-wrap claim-tier chips; no ship-blocking layout regressions identified in code review. Full device matrix left to post-deploy visual check on Pages.
- Result: **PASS with residual** (visual QA on live Pages after DNS cutover)

### Ship UI verdict
- Shell + governance UI + API wiring: **PASS**
- Karahadian not overstated in default UI: **PASS**
- Live visual QA on Hostinger/Pages: **PENDING deploy**

