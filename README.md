# LENR Simulation Application

A comprehensive application for simulating Low Energy Nuclear Reaction (LENR) phenomena with advanced physics models, multi-physics coupling, and interactive 3D visualizations.

## Project Organization

This repository contains multiple versions of the LENR Simulation Application:

### 📁 LENR_SIM_APP_v2 (Current Development - **START HERE**)

**Status**: ✅ Active Development  
**Recommended for**: All new development and usage

The latest and most comprehensive version with:
- Advanced multi-physics coupling (thermal, nuclear, electromagnetic)
- Complete FEM implementation
- Comprehensive physics models (quantum tunneling, electron screening, phonon interactions)
- Full-featured React frontend with Three.js 3D visualizations
- Task management system
- Extensive API and test suite

👉 **[Go to v2 README](LENR_SIM_APP_v2/README.md)** for installation and usage instructions.

### 📁 LENR_SIM_APP_v1 (Legacy/Stable)

**Status**: 🔒 Archived  
**Recommended for**: Reference only

The original stable version, kept for:
- Historical reference
- Legacy compatibility
- Comparison with v2 improvements

This version is **not actively maintained** but remains functional.

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

## Feature Comparison

| Feature | v1 | v2 |
|---------|----|----|
| Basic Physics Models | ✅ | ✅ |
| Advanced Physics (QED, Rydberg, etc.) | ❌ | ✅ |
| Multi-Physics Coupling | ❌ | ✅ |
| FEM Simulation | Basic | Advanced |
| 3D Visualization | Basic | Advanced (Three.js) |
| Real-time Data Streaming | ❌ | ✅ |
| Custom Reactions | ❌ | ✅ |
| Task Management System | ❌ | ✅ |
| Comprehensive Test Suite | Partial | Complete |
| API Documentation | Basic | Extensive |
| Performance Optimization | Basic | Advanced |

## Documentation

### Essential Documentation

- **[SETUP_INSTRUCTIONS.md](SETUP_INSTRUCTIONS.md)** - Initial setup guide
- **[SECURITY.md](SECURITY.md)** - Security practices
- **[REORGANIZATION_PLAN.md](archive/status-reports/REORGANIZATION_PLAN.md)** - Project reorganization details (archived)

### Version-Specific Documentation

#### v2 Documentation (Recommended)
- [v2 README](LENR_SIM_APP_v2/README.md) - Complete v2 guide
- [Development Plan](LENR_SIM_APP_v2/DEV_PLAN.md) - Roadmap and status
- [Changelog](CHANGELOG.md) - Current progress and version history
- [Test Plan](LENR_SIM_APP_v2/TEST_PLAN.md) - Testing strategy
- [API Documentation](LENR_SIM_APP_v2/docs/api/) - API reference
- [Tutorials](LENR_SIM_APP_v2/docs/tutorials/) - Usage guides

#### v1 Documentation (Legacy)
- [v1 README](LENR_SIM_APP_v1/README.md) - v1 guide (archived)

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

## Migration from v1 to v2

If you're currently using v1 and want to upgrade:

1. **Back up your v1 data and configuration**
2. **Set up v2 following the [v2 README](LENR_SIM_APP_v2/README.md)**
3. **Review the v2 API changes** in the API documentation
4. **Update your simulation parameters** to use v2's enhanced models
5. **Test thoroughly** before decommissioning v1

Note: v1 configuration files are not directly compatible with v2. You'll need to manually transfer your settings.

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

1. **Choose the right version**:
   - All new development should target v2
   - v1 accepts only critical bug fixes

2. **Follow the development workflow**:
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

4. **Submit a pull request** with clear description of changes

### Development Tools

v2 includes a comprehensive task management system:

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
   - Start with [v2 README](LENR_SIM_APP_v2/README.md)
   - Review [SETUP_INSTRUCTIONS.md](SETUP_INSTRUCTIONS.md)
   - Check [v2 docs](LENR_SIM_APP_v2/docs/)

2. **Common Issues**:
   - See troubleshooting section in [v2 README](LENR_SIM_APP_v2/README.md#troubleshooting)

3. **Report Issues**:
   - Open an issue on GitHub
   - Include version number, OS, and error logs

## Project Status

- **v2**: ✅ Active Development (55% complete)
- **v1**: 🔒 Archived (Maintenance only)

Current v2 development focus:
- Completing 3D visualization components
- Enhancing custom reaction support
- Performance optimization
- Documentation improvements

For detailed status, see the [Changelog](CHANGELOG.md) and the v0.3.6-beta evidence pack under `LENR_SIM_APP_v2/docs/v0.3.6-beta/`

---

**Recommended Version**: [LENR_SIM_APP_v2](LENR_SIM_APP_v2/)  
**Last Updated**: November 2025  
**Maintainers**: See CONTRIBUTORS.md in each version
