# v0.3.6-beta Codebase Map

**Status:** Added as part of the v0.3.6-beta refactor (plan §5D).
**Scope:** Single-page map of active routes, frontend pages, physics engine
modules, and the test tree. Use this as the starting point when onboarding to
the repo; every other doc cross-references it.

---

## Backend

Entry point: `LENR_SIM_APP_v2/backend/app/main.py`

### Active FastAPI routers (mounted via `app.include_router`)

| Prefix | Router module | Purpose |
|---|---|---|
| `/api/physics` | `routers/physics_routes.py` | Physics calculation endpoints |
| *(no prefix)* | `routers/physics_simulation_router.py` | Real physics simulations |
| `/api/multi-physics` | `routers/multi_physics_routes.py` | Multi-physics coupling |
| `/api/visualization` | `routers/visualization_routes.py` | Visualization support |
| `/api/results` | `routers/result_visualization_routes.py` | Result visualization |
| *(no prefix)* | `routers/shared_simulation_router.py` | Shared simulation store + matching |
| `/api` | `routers/websocket_router.py` | WebSocket real-time updates |
| `/api` | `routers/analytics_routes.py` | Analytics dashboard (v0.2.3-beta+) |
| `/api` | `api/routes/physics.py` (`theory_physics_router`) | Theory testbed |
| `/api` | `api/routes/docs_routes.py` | Documentation endpoints |
| `/api` | `api/routes/unified_simulation.py` | **Unified LENR simulation** (primary) |
| `/api/fitting` (dev) | `routers/fitting_routes.py` | Parameter fitting (dev-only) |
| `/api/logs` (dev) | `routers/logging_routes.py` | Logging (dev-only) |
| `/api/diagnostics` (dev) | `routers/diagnostics_routes.py` | Diagnostics (dev-only) |
| `/api/simulations` (dev) | `routers/mock_simulation_router.py` | Mock simulations (dev-only) |

### Removed in v0.3.6-beta (dead code, plan §1A)

- `routers/presets_routes.py`
- `routers/simulations.py`
- `routers/parameters.py`
- `routers/simulation_router.py` (superseded by `shared_simulation_router`)
- `routers/simulation_routes.py` (superseded by `shared_simulation_router`)
- `api/routes/visualizations.py` (never mounted)
- `api/routes/test_physics.py` (never mounted)

### Physics engine module tree

```
backend/app/physics_engine/
├── bubble_lattice_interaction.py      Bubble + lattice coupled simulation
├── proton_phase_model.py              Proton FREE->SCREENED->NUCLEAR transitions
├── constants.py                       Physical + model constants (MAX_ENHANCEMENT_FACTOR)
├── scientific_guardrails.py           Electrolyte + molarity guardrails (v0.3.6-beta)
├── parkhomov_validation.py            Parkhomov (2018) transmutation lookup (v0.3.6-beta)
├── theory_pipeline.py                 Theory composition pipeline
├── theory_protocol.py                 Protocol that every theory module implements
├── theories/                          21 theory modules (electron_screening, coherent_qed,
│                                       quantum_tunneling, bubble_mhd_confinement, casimir_confinement,
│                                       hagelstein_phonon, kim_bec, widom_larsen, nae_model,
│                                       takahashi_tsc, vysotskii_ccs, chubb_ion_band,
│                                       iwamura_transmutation, piantelli_ni_h, matsumoto_enc,
│                                       swartz_nanor, letts_laser, miles_heat_helium, hydroton,
│                                       non_equilibrium_thermo, phonon_coupling_legacy)
├── mhd/                               MHD solvers (Hartmann flow, induction, multiscale bridge)
│   ├── hartmann_flow.py               Hartmann / Shercliff / Hunt profile
│   ├── mhd_induction_solver.py        Induction equation solver
│   ├── dimensionless_parameters.py    Ha, Rm, etc. (v0.3.6-beta)
│   └── multiscale_bridge.py           Coupling layer
├── unified_lenr_model/                Legacy unified model + cross sections + screening
└── theory_relationships/              Relationship graph defaults
```

### External validation sources referenced by the physics engine

| Source | Purpose | Location |
|---|---|---|
| Parkhomov (2018) via LENR Academy | Transmutation pathway validation | `parkhomov_validation.py` |
| COMSOL Hartmann benchmark | MHD Ha/Rm parameter definitions | `mhd/dimensionless_parameters.py` |
| OpenFOAM `mhdFoam` / `FreeMHD` | Shercliff vs Hunt wall regimes | `mhd/hartmann_flow.py` |
| LAMMPS EAM Pd-H | Diffusion barrier ~0.49 eV, inverse isotope effect | `theories/quantum_tunneling_theory.py` |
| Quantum ESPRESSO DFT PdHx | Screening suppression at Fermi level | `theories/electron_screening.py` |
| Cvetinovic et al. (Phys. Lett. B 2023) | Experimental screening bounds in Pd | `theories/electron_screening.py` |
| Bojovic et al. (Nature 2026) | Fermi-Hubbard lattice gate analogy | `theories/quantum_tunneling_theory.py` |

---

## Frontend

Entry point: `LENR_SIM_APP_v2/frontend/src/index.js`

### Pages (`frontend/src/pages/`)

- `DashboardNew.jsx`            Main dashboard
- `UnifiedTheoryPage.jsx`       Unified LENR simulation (primary workflow)
- `UnifiedTheoryPage.test.jsx`  Tests for UnifiedTheoryPage
- `TheoryPage.jsx`              Theory browser
- `TheoryPaperPage.jsx`         Theoretical framework paper view
- `SimulationPage.jsx`          Legacy simulation page
- `SimulationDetail.jsx`        Simulation detail view
- `AnalyticsPage.jsx`           Analytics dashboard
- `AdvancedAnalysisPage.js`     Advanced analysis tools
- `SettingsPage.jsx`            Settings

### Key visualization components

- `components/visualizations/UnifiedBubbleLatticeVisualization.jsx`
- `components/visualizations/VisualizationLegend.jsx`
- `components/physics/TheoryTogglePanel.tsx`
- `components/physics/PhysicsModelRegistry.ts` (consolidated in v0.3.6-beta, §1B)

### Config / utilities

- `config/api.js`                      Single source of truth for API URLs
- `config/theoryVisualizationMap.js`   Theory-id -> visualization layer map (v0.3.6-beta)
- `config/version.js`                  App version
- `utils/simulationDerivedState.js`    Derived-state selectors for the legend
- `utils/visualizationWebSocket.js`    WebSocket helpers
- `contexts/PhysicsContext.tsx`        Physics state provider
- `services/websocket.js`              WebSocket service

### Removed in v0.3.6-beta (plan §2E, §1B)

- `components/visualizations/ProtonPhaseSystem.js` — not imported anywhere
- `components/physics/PhysicsModelRegistry.tsx` — merged into `.ts`

---

## Test tree

Location: `backend/tests/` (primary) and `backend/app/tests/` (CI-only).

`pytest.ini` testpaths cover both directories. Run:

```powershell
cd backend
venv\Scripts\activate
pytest                # both trees
pytest tests/         # primary only
pytest app/tests/     # legacy embedded tests only
```

Notable new tests in v0.3.6-beta:

- `tests/test_scientific_guardrails.py`
- `tests/test_integration/test_physics_benchmark_gates.py`
- `tests/test_integration/test_simulation_pipeline.py`
- `tests/test_theory_modules.py` (extended)

---

## Start / stop

| Task | Command |
|---|---|
| Dev (Windows) | `LENR_SIM_APP_v2\start_app.bat` |
| Dev (PowerShell) | `LENR_SIM_APP_v2\start_app.ps1` |
| Dev (Unix) | `LENR_SIM_APP_v2/start_app.sh` |
| Local only | `LENR_SIM_APP_v2\start_local.ps1` |
| Docker | `docker-compose up` (from `LENR_SIM_APP_v2/`) |

Backend dev port: **8010** (see `start_app.bat`). Frontend dev port: **3000**.

---

## Cross-references

- [THEORY_OVERVIEW.md](../THEORY_OVERVIEW.md) — theoretical framework
- [ANALYTICS_TRANSPARENCY.md](./ANALYTICS_TRANSPARENCY.md) — analytics/telemetry contract
- [RELEASE_EVIDENCE_PACK.md](./RELEASE_EVIDENCE_PACK.md) — V&V evidence for the v0.3.6-beta release
- [DATA_CONTRACT_LOCK.md](./DATA_CONTRACT_LOCK.md) — frozen response contracts
- [PORT_TOPOLOGY_POLICY.md](./PORT_TOPOLOGY_POLICY.md) — port numbering policy
