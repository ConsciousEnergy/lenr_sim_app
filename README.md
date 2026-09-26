# LENR Simulation Application

A comprehensive application for simulating Low Energy Nuclear Reaction (LENR) phenomena with advanced physics models, multi-physics coupling, and interactive 3D visualizations.

## Project Organization

The application lives under **[`LENR_SIM_APP_v2/`](LENR_SIM_APP_v2/)** (backend, frontend, infrastructure, docs). Everything else at the repository root is shared tooling and governance:

| Path | Purpose |
|------|---------|
| `LENR_SIM_APP_v2/` | The application: FastAPI backend, React/Vite frontend, Docker/Terraform infrastructure, release evidence docs |
| `formalization/` | Equation IR and Lean 4 consistency checks (mathematical consistency only, not a proof that LENR occurs) |
| `docs/` | Repository-level documentation, including [`docs/releases/`](docs/releases/) (release notes and merge instructions) |
| `archive/status-reports/` | Historical status reports kept for provenance |
| `.github/` | CI workflows, Dependabot, PR template, CODEOWNERS |
| `.cursor/` | Shared agent rules and skills |

The application features:
- Advanced multi-physics coupling (thermal, nuclear, electromagnetic)
- Complete FEM implementation
- Comprehensive physics models (quantum tunneling, electron screening, phonon interactions)
- Full-featured React frontend with Three.js 3D visualizations
- Extensive API and test suite with release-blocking, experiment-anchored science gates

👉 **[Go to the application README](LENR_SIM_APP_v2/README.md)** for installation and usage instructions.

### Docs map (public vs team)

| Audience | Start here |
|----------|------------|
| Public / contributors | This README, [`CONTRIBUTING.md`](CONTRIBUTING.md), [`LENR_SIM_APP_v2/README.md`](LENR_SIM_APP_v2/README.md) |
| Branching / releases | [`.github/BRANCHING.md`](.github/BRANCHING.md) |
| Operators (Compose now, Swarm later) | [`LENR_SIM_APP_v2/docs/v0.3.8-beta/`](LENR_SIM_APP_v2/docs/v0.3.8-beta/) — especially [`DUAL_KVM2_SWARM_READINESS.md`](LENR_SIM_APP_v2/docs/v0.3.8-beta/DUAL_KVM2_SWARM_READINESS.md) and [`PR_AND_BRANCH_HYGIENE.md`](LENR_SIM_APP_v2/docs/v0.3.8-beta/PR_AND_BRANCH_HYGIENE.md) |
| Academic parallel train | [`LENR_SIM_APP_v2/docs/v0.3.7-beta/`](LENR_SIM_APP_v2/docs/v0.3.7-beta/) (`EQ-OPEN-*` stay OPEN) |

**Live share today:** Compose + Caddy on the beta VPS. Dual KVM2 (app + dedicated CI) does **not** by itself complete Swarm + Traefik + Cloudflare cutover — that stays behind `CONFIRM_SWARM_0_3_8` (staging) / `CONFIRM_SWARM_0_3_9` (production).

### Legacy code

The original `LENR_SIM_APP_v1/` tree and the root `backend/` / `frontend/` mirrors were removed from the working tree in September 2026. They remain available in git history at the annotated tag `archive/pre-legacy-removal` (for example `git show archive/pre-legacy-removal:LENR_SIM_APP_v1/README.md`).

## Quick Start

### For New Users

```bash
cd LENR_SIM_APP_v2
```

Then follow the instructions in [LENR_SIM_APP_v2/README.md](LENR_SIM_APP_v2/README.md)

### Windows Quick Start

```batch
cd LENR_SIM_APP_v2
start_app.bat
```

### Linux/Mac Quick Start

```bash
cd LENR_SIM_APP_v2
chmod +x start_app.sh  # First time only
./start_app.sh
```

## Documentation

### Essential Documentation

- **[SETUP_INSTRUCTIONS.md](SETUP_INSTRUCTIONS.md)** - Initial setup guide
- **[CONTRIBUTING.md](CONTRIBUTING.md)** - Contribution workflow and code style
- **[.github/BRANCHING.md](.github/BRANCHING.md)** - Branching model, release tagging, and hotfix flow
- **[SECURITY.md](SECURITY.md)** - Security practices and vulnerability reporting
- **[docs/releases/](docs/releases/)** - Release notes and merge instructions
- **[REORGANIZATION_PLAN.md](archive/status-reports/REORGANIZATION_PLAN.md)** - Project reorganization details (archived)

### Application Documentation

- [Application README](LENR_SIM_APP_v2/README.md) - Complete guide
- [Development Plan](LENR_SIM_APP_v2/DEV_PLAN.md) - Roadmap and status
- [Changelog](CHANGELOG.md) - Current progress and version history
- [Test Plan](LENR_SIM_APP_v2/TEST_PLAN.md) - Testing strategy
- [API Documentation](LENR_SIM_APP_v2/docs/api/) - API reference
- [Tutorials](LENR_SIM_APP_v2/docs/tutorials/) - Usage guides

## Architecture Overview

### LENR_SIM_APP_v2 Architecture

```
┌─────────────────────────────────────────┐
│     React Frontend (Port 3000)          │
│  - Parameter Controls                   │
│  - 3D Visualizations (Three.js)         │
│  - Real-time Results Display            │
└──────────────┬──────────────────────────┘
               │ REST API / WebSocket
┌──────────────┴──────────────────────────┐
│    FastAPI Backend (Port 8000)          │
│  - Physics Engine API                   │
│  - Multi-Physics Coupling               │
│  - Data Streaming                       │
└──────────────┬──────────────────────────┘
               │
┌──────────────┴──────────────────────────┐
│         Physics Core                    │
│  ┌─────────────────────────────────┐   │
│  │  Unified LENR Solver            │   │
│  │  - Lattice Dynamics             │   │
│  │  - Fusion Processor             │   │
│  │  - Enhancement Calculator       │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  Multi-Physics Coupling         │   │
│  │  - Thermal Domain               │   │
│  │  - Nuclear Domain               │   │
│  │  - EM Domain                    │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  Physics Models                 │   │
│  │  - Quantum Tunneling            │   │
│  │  - Electron Screening           │   │
│  │  - Phonon Interactions          │   │
│  │  - FEM Solver                   │   │
│  │  - And more...                  │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

## Requirements

### System Requirements
- **OS**: Windows 10/11, Linux (Ubuntu 20.04+), macOS 10.15+
- **RAM**: 8GB minimum, 16GB recommended
- **CPU**: Multi-core processor recommended for parallel simulations
- **GPU**: WebGL-capable graphics for 3D visualizations

### Software Requirements
- **Python**: 3.8 or higher
- **Node.js**: 14.x or higher  
- **npm**: 6.x or higher

## Development

### Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full workflow. In short:

1. **Branch from `main`** using a short-lived branch (`feat/<topic>`, `fix/<topic>`, `chore/<topic>`, `docs/<topic>`); see [.github/BRANCHING.md](.github/BRANCHING.md).

2. **Work inside `LENR_SIM_APP_v2/`**:
   ```bash
   cd LENR_SIM_APP_v2
   node scripts/dev.js list  # See available tasks
   node scripts/dev.js next  # Get next task to work on
   ```

3. **Test your changes**:
   ```bash
   # Backend tests
   cd LENR_SIM_APP_v2/backend
   pytest

   # Frontend tests
   cd LENR_SIM_APP_v2/frontend
   npm test
   ```

4. **Submit a pull request to `main`** using the PR template; it is squash-merged once CI (including the science gates) is green.

### Development Tools

The application includes a comprehensive task management system:

```bash
cd LENR_SIM_APP_v2
node scripts/dev.js --help  # See all available commands
```

## License

Licensed under **GNU GPL-3.0**. This project is freely available for anyone to use, study, modify, and distribute. See [LICENSE](LICENSE) for full terms.

## Acknowledgments

- Contributors to the LENR research community
- FastAPI, React, and Three.js communities
- All open-source contributors

## Support

### Getting Help

1. **Check the documentation**:
   - Start with the [application README](LENR_SIM_APP_v2/README.md)
   - Review [SETUP_INSTRUCTIONS.md](SETUP_INSTRUCTIONS.md)
   - Check the [application docs](LENR_SIM_APP_v2/docs/)

2. **Common Issues**:
   - See the troubleshooting section in the [application README](LENR_SIM_APP_v2/README.md#troubleshooting)

3. **Report Issues**:
   - Open an issue on GitHub (for security vulnerabilities, follow [SECURITY.md](SECURITY.md) instead)
   - Include version number, OS, and error logs

## Project Status

- **Current release**: `v0.3.6-beta` (see [Changelog](CHANGELOG.md) and the evidence pack under `LENR_SIM_APP_v2/docs/v0.3.6-beta/`)
- **Development branch**: `main` (trunk-based; releases are `v*` tags)
- **Public beta**: same-origin Hostinger VPS at `https://lenr-sim-beta.conscious.energy` (Caddy + Compose; see `LENR_SIM_APP_v2/infrastructure/vps/`)

---

**Last Updated**: September 2026  
**Maintainers**: See [CODEOWNERS](.github/CODEOWNERS)
