# LENR Simulation App v2

**Advanced modeling and visualization of Low Energy Nuclear Reactions** *(research preview — model output, not laboratory measurement)*

[![Live beta](https://img.shields.io/badge/live%20beta-0.3.9--beta-brightgreen.svg)](https://lenr-sim-beta.conscious.energy)
[![Markers](https://img.shields.io/badge/markers-0.3.9--beta-blue.svg)](../CHANGELOG.md)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)

> Looking for the project-level overview, honesty invariants, and signed-out beta walkthrough? Start at the repository root [`README.md`](../README.md).

---

## Current truth (public)

| Topic | Where |
|-------|--------|
| Live public beta | https://lenr-sim-beta.conscious.energy — **0.3.9-beta** |
| Public API | https://api.conscious.energy |
| Version trains | `main` and `dev` both **`0.3.9-beta`** — four markers must match within a branch |
| Honesty | `lenr_proved` stays `false`; `EQ-OPEN-*` stay **OPEN** — see root README |
| Science / academic review | [`PHYSICS_MATURITY_LEDGER.md`](docs/v0.3.7-beta/PHYSICS_MATURITY_LEDGER.md), [`PROOF_MATRIX.md`](docs/v0.3.7-beta/PROOF_MATRIX.md), [`GOALS.md`](docs/v0.3.7-beta/GOALS.md) |
| Operators / agents | Root [`AGENTS.md`](../AGENTS.md) and versioned ops docs under `docs/v0.3.*` (not duplicated here) |

## 🧭 Architecture & Onboarding

New to the codebase? Start with the curated maps below before diving into files.

**Where things live**
- `backend/app/physics_engine/` — physics core. Key modules: `unified_lenr_model/` (config, cross-sections, screening, reaction-rate engine + UQ), `theory_pipeline.py` / `theory_protocol.py` (pluggable `TheoryModule`s), `cavitation_kgrp.py` (KG-RP harmonic-locking diagnostics), `shell_pairing_prior.py`, `parkhomov_validation.py`, `scientific_guardrails.py`.
- `backend/app/api/routes/unified_simulation.py` — the unified API: `/api/unified/simulate`, `/api/unified/bubble-lattice` (now returns the additive `reaction_rate_engine` block), and `/api/unified/export` (`lenr-run-export-v1`).
- `frontend/src/pages/UnifiedTheoryPage.jsx` — primary simulation UI (bubble-lattice flow, reaction-rate/UQ controls, governance panel + glossary).
- `frontend/src/components/physics/` — governance UI (`ReactionRateGovernancePanel`, `GovernanceGlossaryDrawer`, `TheoryTogglePanel`) backed by the shared source of truth `frontend/src/utils/theoryGovernance.ts`.

**Read these first**
- [`docs/v0.3.6-beta/CODEBASE_MAP.md`](docs/v0.3.6-beta/CODEBASE_MAP.md) — annotated module-by-module map (still accurate for layout).
- [`docs/v0.3.7-beta/DATA_CONTRACT_LOCK.md`](docs/v0.3.7-beta/DATA_CONTRACT_LOCK.md) — API/version contracts for this train.
- [`docs/v0.3.6-beta/RUBRIC_GOVERNANCE.md`](docs/v0.3.6-beta/RUBRIC_GOVERNANCE.md) — claim tiers / evidence classes (mirrored in the in-app glossary).
- [`docs/v0.3.6-beta/PORT_TOPOLOGY_POLICY.md`](docs/v0.3.6-beta/PORT_TOPOLOGY_POLICY.md) — canonical dev/prod ports (frontend `:3000`, backend `:8010`).
- Scientific review & evidence: [`../docs/REVIEW_2026/`](../docs/REVIEW_2026) (citation standard, MeV-gap hypothesis, evidence matrices).

**Deferred restructure backlog** (intentionally out of scope for the public beta trains; tracked for a later, dedicated refactor pass so releases stay additive and low-risk):
- Unify the mixed `.js`/`.jsx`/`.tsx` frontend file extensions onto a single convention.
- Split oversized modules (`UnifiedTheoryPage.jsx`, `unified_simulation.py`) into smaller route/handler/util units (<300 lines per the project style rule).
- Consolidate the legacy `electrolyte`-in-`lattice` fallback fields once all clients send the canonical top-level `electrolyte` object.
- Consolidate the repository-root `start_app.bat` (backend on `8000`) with the v2 launcher (`8010`) so there is one canonical entry point.

## 🎯 Quick Start

### Start the Application

```bash
# From LENR_SIM_APP_v2 (preferred; backend on 8010 per the port policy)
start_app.bat
```

This opens two windows:
- **LENR Frontend**: http://localhost:3000 (Vite)
- **LENR Backend API**: http://localhost:8010

### Access the App

- **Homepage**: http://localhost:3000
- **API Documentation**: http://localhost:8010/api/docs
- **Visualization Test**: http://localhost:3000/visualization-test

The repository-root `start_app.bat` is a legacy launcher that runs the backend on
`8000` instead. See [PORT_TOPOLOGY_POLICY.md](docs/v0.3.6-beta/PORT_TOPOLOGY_POLICY.md)
for the canonical port matrix.

---

## 📊 Project Status

### Public beta research preview

- Live beta: **`0.3.9-beta`** at [lenr-sim-beta.conscious.energy](https://lenr-sim-beta.conscious.energy)
- `main` and `dev` markers: **`0.3.9-beta`** (`dev` is the default PR base / integration tip)
- Engine maturity chips and claim tiers are first-class; FEM remains aspirational on the public beta
- `lenr_proved` stays `false`; `EQ-OPEN-*` stay **OPEN**
- Signed-out walkthrough and honesty invariants: root [`README.md`](../README.md)

### Known Non-Critical Warnings

- 2 moderate npm advisories (`react-router` 6.x; needs a v7 migration).
  `npm audit --audit-level=high` exits `0`.
- npm install prints a funding line and an audit summary; neither is a Vite error.
- Source map warnings from prebuilt third-party bundles (cosmetic).

📖 **See [WARNINGS_EXPLAINED.md](frontend/WARNINGS_EXPLAINED.md) for details**

---

## 🚀 Features

### Physics Simulations
- **Quantum Tunneling** - Analyze quantum mechanical effects
- **Fusion Simulation** - Model fusion reactions in metal lattices
- **LENR Simulation** - Full Low Energy Nuclear Reaction modeling
- **Bubble Fusion** - Sonofusion and cavitation studies

### 3D Visualization
- Real-time lattice structure rendering
- Fusion event visualization
- Enhancement region mapping
- Interactive camera controls
- Quality settings (auto, ultra, high, medium, low)

### Real-time Analysis
- Live simulation progress tracking
- Energy output monitoring
- Temperature dynamics
- Performance metrics

### Data Export
- Simulation results
- Visualization data
- Analysis reports

---

## 📋 Documentation

### Product & Planning

- **[PRD.md](PRD.md)** - Product Requirements Document ⭐
  - Product vision and goals
  - Feature roadmap (Phase 1-5)
  - Current status and completed features
  - User personas and use cases
  - Success metrics
  - Release history

### For Developers

- **[DEVELOPMENT_NOTES.md](DEVELOPMENT_NOTES.md)** - Developer reference
  - Quick start commands
  - Project structure
  - Troubleshooting
  - Environment setup

- **[TESTING_AND_DEBUG_TASKS.md](TESTING_AND_DEBUG_TASKS.md)** - Testing roadmap
  - 13 structured testing tasks
  - Priority-based organization
  - Success criteria
  - Estimated completion times

### For Understanding Warnings

- **[frontend/WARNINGS_EXPLAINED.md](frontend/WARNINGS_EXPLAINED.md)** - Detailed warning explanations
  - Why each warning occurs
  - Whether it's safe to ignore
  - When it will be fixed
  - Impact on production

- **[frontend/RUNTIME_WARNINGS_FIXED.md](frontend/RUNTIME_WARNINGS_FIXED.md)** - Runtime warning status
  - What has been fixed
  - What remains
  - Current workarounds

### For Debugging

- **[VISUALIZATION_DEBUG_GUIDE.md](VISUALIZATION_DEBUG_GUIDE.md)** - Visualization debugging
  - Common issues
  - Debug tools
  - Performance tips

- **[frontend/accessibility-fixes-report.md](frontend/accessibility-fixes-report.md)** - Accessibility improvements
  - WCAG compliance
  - Screen reader support
  - Keyboard navigation

---

## 🏗️ Project Structure

```
LENR_SIM_APP_v2/
├── frontend/              # React application
│   ├── src/
│   │   ├── components/    # React components
│   │   │   ├── AppLayoutFixed.jsx       # Main layout
│   │   │   └── visualization/           # 3D visualization components
│   │   ├── pages/         # Page components
│   │   │   ├── DashboardNew.jsx        # Homepage
│   │   │   ├── QuantumTunnelingPage.jsx
│   │   │   ├── FusionSimulationPage.jsx
│   │   │   ├── LENRSimulationPage.jsx
│   │   │   ├── BubbleFusionPage.jsx
│   │   │   └── VisualizationTest.jsx   # Test page
│   │   ├── contexts/      # React contexts
│   │   └── App.tsx        # Main app routing
│   ├── public/            # Static assets
│   └── package.json       # Dependencies
│
├── backend/               # FastAPI backend
│   ├── app/
│   │   ├── main.py                      # FastAPI app
│   │   ├── routers/
│   │   │   └── mock_simulation_router.py # Mock API
│   │   └── physics/                     # Physics modules
│   └── requirements.txt   # Python dependencies
│
├── start_app.bat          # Start both servers
├── README.md              # This file
├── DEVELOPMENT_NOTES.md   # Developer guide
└── TESTING_AND_DEBUG_TASKS.md  # Testing roadmap
```

---

## 🛠️ Technology Stack

### Frontend
- **React 18.2** - UI framework
- **Material-UI v7** - Component library
- **Three.js** - 3D visualization
- **React Router v6** - Navigation
- **Axios** - HTTP client
- **TypeScript** - Type safety

### Backend
- **FastAPI** - Python web framework
- **Uvicorn** - ASGI server
- **Pydantic** - Data validation
- **NumPy/SciPy** - Scientific computing

---

## 🧪 Testing

### Run Tests

```bash
# Accessibility tests
cd frontend/src/tests
node accessibility-test.js

# Production build
cd frontend
npm run build

# Bundle analysis
cd frontend
npm run build:analyze
```

### Testing Roadmap

See **[TESTING_AND_DEBUG_TASKS.md](TESTING_AND_DEBUG_TASKS.md)** for:
1. **Priority 1**: Core functionality (3.5 hrs)
2. **Priority 2**: Backend integration (1.75 hrs)
3. **Priority 3**: Performance (3 hrs)
4. **Priority 4**: Cross-platform (2.5 hrs)
5. **Priority 5**: Debugging (3 hrs, optional)

**Start with Task 1.1: Homepage & Navigation (30 min)**

---

## 🔧 Development

### Prerequisites
- Node.js 16+ 
- Python 3.8+
- Git

### Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd LENR_SIM_APP_v2
   ```

2. **Frontend setup**
   ```bash
   cd frontend
   npm install
   
   # Setup environment variables
   setup-env.bat
   ```

3. **Backend setup**
   ```bash
   cd backend
   python -m venv venv
   venv\Scripts\activate
   pip install -r requirements.txt
   ```

4. **Start the app**
   ```bash
   # From project root
   start_app.bat
   ```

### Environment Variables

Create `frontend/.env.local`. Vite honours both the `REACT_APP_` and `VITE_`
prefixes here, and `8010` is the canonical dev backend port:
```env
REACT_APP_API_URL=http://localhost:8010
VITE_API_URL=http://localhost:8010
REACT_APP_DEBUG_LEVEL=3
REACT_APP_USE_MOCK_DATA=false
REACT_APP_MOCK_DELAY=500
```

Leaving these unset is usually better for local development: the Vite dev-server
proxy forwards relative `/api/*` paths, which avoids CORS entirely.

---

## 📝 Recent Updates (February 2026)

### ✅ Completed
- UI/UX improvements (readable chips, clean navigation)
- Removed user authentication (app is open access)
- Fixed all compilation errors
- Added React Router v7 future flags
- Enhanced accessibility (WCAG 2.1 Level AA)
- Created comprehensive documentation

### 🎯 Next Steps
- Test core functionality (see TESTING_AND_DEBUG_TASKS.md)
- Verify 3D visualizations
- Test backend integration
- Performance optimization
- Cross-browser testing

---

## 🐛 Troubleshooting

### App Won't Start
```bash
# Kill existing processes and restart
# Close all Node/Python processes
start_app.bat
```

### Port Already in Use
```bash
# Frontend (change port)
# In frontend/.env.local
PORT=3001

# Backend (change port)
cd backend
uvicorn app.main:app --reload --port 8001
```

### Compilation Errors
```bash
cd frontend
npm install
npm start
```

### Backend Not Responding
```bash
cd backend
venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

For more troubleshooting, see [DEVELOPMENT_NOTES.md](DEVELOPMENT_NOTES.md#troubleshooting)

---

## 📞 Support

### Documentation
- [Development Notes](DEVELOPMENT_NOTES.md)
- [Testing Tasks](TESTING_AND_DEBUG_TASKS.md)
- [Warnings Explained](frontend/WARNINGS_EXPLAINED.md)

### Issues
- Check documentation first
- Review known warnings
- Check browser console
- Check server terminals

---

## 📄 License

Licensed under **GNU GPL-3.0**. This project is freely available for anyone to use, study, modify, and distribute. See the root [LICENSE](../LICENSE) file for full terms.

---

## 🙏 Acknowledgments

Built for advancing LENR research and education.

---

**Ready to explore LENR simulations?**  
Visit http://localhost:3000 to get started!
