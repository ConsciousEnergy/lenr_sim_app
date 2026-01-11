# Changelog

All notable changes to the LENR Simulation App will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

#### Visualization Enhancements
- **Visualization Legend**: Interactive, collapsible legend showing particle types, energy scale, scale indicator, and live statistics
- **Quantum Flux Visualization**: Physics-based visualization with 6 modes:
  - Electron Screening (Thomas-Fermi model)
  - Magnetic Dipoles (nuclear/electron spin)
  - Phonon Modes (Debye model lattice vibrations)
  - Coulomb Exchange (virtual photon exchange)
  - Gamow Window (stellar nucleosynthesis)
  - Combined Enhancement effects
- **Scale Bar**: 3D scale indicator with automatic unit conversion (pm/Å/nm/μm)
- **Enhanced 3D Scene**: Grid references, corner markers, axis labels, origin marker
- **Mode Selector**: Dropdown to switch between quantum field visualization modes

#### New Components
- `QuantumFluxVisualization.js` - Physics-based quantum effects visualization
- `VisualizationLegend.jsx` - Interactive legend component with scrolling support
- `PhysicsErrorBoundary.jsx` - Specialized error handling for physics/WebGL errors
- `ComparisonView.jsx` - Side-by-side LENR system comparison component
- `usePhysicsWorker.js` - Web Worker hook for offloading physics calculations
- `useApiHealth.js` - API health monitoring hook
- `apiResilience.js` - Retry logic with exponential backoff

#### Backend Improvements
- Temperature-dependent phonon coupling using Debye model
- Enhanced `/api/health` endpoint with component status and memory info
- Unit tests for WKB tunneling, bubble collapse, and enhancement factors

#### Documentation
- `docs/VISUALIZATION_IMPROVEMENTS.md` - Comprehensive visualization documentation

### Changed
- Replaced decorative plasma vortex with physics-grounded quantum flux visualization
- Improved legend scrollability with custom scrollbar styling
- Brightened visualization color schemes for better visibility
- Updated `FusionParameterControls.jsx` with plasma/laser fusion parameters
- Enhanced CSV/JSON export functionality in `FusionSimulationPage.jsx`
- Fixed `start_app.bat` and `start_app.sh` to use correct v2 directory paths

### Fixed
- Legend cutoff issue - added proper scrolling support
- Quantum flux visibility - increased opacity and brightened colors
- `PlasmaVortexEffect is not defined` error after refactoring
- Hot reload caching issues with webpack

### Previous Unreleased Items
- Comprehensive API documentation with all endpoints
- Quick start guide for new users
- Physics modules documentation
- Performance benchmarking guide
- Error handling audit and improvements
- Pre-commit hooks for code quality
- Enhanced CI/CD pipeline with multiple test jobs
- ErrorBoundary component in frontend root
- Exception handler registration in backend
- Updated GitHub Actions workflow to support development branch
- Improved error handling across backend and frontend
- Enhanced OpenAPI documentation
- Updated installation guide with detailed instructions
- Error handlers now properly registered in main.py
- ErrorBoundary now wraps root App component
- Test configuration updated for better organization

## [0.3.0-beta] - 2026-01-07

### Added
- Multi-physics coupling framework
- Real-time visualization via WebSocket
- Comprehensive test suite (unit, integration, e2e, performance)
- Performance monitoring and benchmarking
- Memory monitoring and optimization
- Simulation caching system
- Custom reaction support
- Enhanced physics models:
  - Advanced quantum tunneling
  - Electron screening (Thomas-Fermi, Debye-Hückel)
  - Phonon-assisted tunneling
  - Coherent phonon effects
  - Material enhancement calculations
- Parameter sensitivity analysis
- Fitting and optimization tools
- Diagnostics and logging endpoints
- Result visualization and analysis

### Changed
- Migrated to MUI v7
- Improved API structure and organization
- Enhanced error handling and validation
- Better performance for large simulations
- Optimized memory usage

### Fixed
- Memory leaks in long-running simulations
- Grid API compatibility issues
- Import errors and path issues
- Test configuration problems

## [0.2.0-beta] - 2025-12-17

### Changed
- **Codebase Organization**: Reorganized files for Beta v0.2.0 release
- Moved historical status/report documents to `LENR_SIM_APP_v1(Deprecated)/docs/`
- Moved deprecated components and temporary files to deprecated folder
- Removed duplicate nested directories and files
- Updated `.gitignore` to properly exclude all environment files and sensitive information
- Organized documentation files into appropriate locations

### Security
- Enhanced `.gitignore` patterns to exclude all `.env*` files and sensitive patterns
- Verified no hardcoded secrets in codebase (only placeholders)

### Removed
- Duplicate startup scripts (`start_app_fixed.bat`, `start.bat`, `start_safe_mode.ps1`)
- Nested duplicate directory `LENR_SIM_APP_v2/frontend/LENR_SIM_APP_v2/`
- Temporary files (`temp_applayoutfix.jsx`, `App_Merged.tsx`)
- Historical documentation files (moved to deprecated folder)

### Moved to Deprecated
- Historical status reports (15+ files)
- Deprecated components (`EnhancedFusionPanel.js`)
- Historical fix documentation (6+ files)
- Temporary and merged files

## [0.2.0] - 2024-12-01

### Added
- Basic physics calculations
- Simple visualization
- REST API endpoints
- Basic frontend interface

### Changed
- Initial release structure

## [0.1.0] - 2024-11-01

### Added
- Initial project setup
- Basic FastAPI backend
- React frontend skeleton
- Basic physics models

---

## Version History Summary

### v0.3.0-beta (Current)
- **Focus**: Beta launch preparation
- **Key Features**: Multi-physics coupling, comprehensive testing, performance optimization
- **Status**: Ready for beta testing

### v0.2.0-beta
- **Focus**: Codebase organization
- **Key Features**: File reorganization, security enhancements, cleanup
- **Status**: Stable

### v0.2.0
- **Focus**: Core functionality
- **Key Features**: Basic calculations, visualization, API
- **Status**: Stable

### v0.1.0
- **Focus**: Initial development
- **Key Features**: Project structure, basic setup
- **Status**: Archived

---

## Migration Guides

### Upgrading from v0.2.0 to v0.3.0-beta

1. **Update Dependencies:**
   ```bash
   cd backend
   pip install -r requirements.txt
   
   cd ../frontend
   npm install
   ```

2. **Check Configuration:**
   - Review new configuration options in `backend/app/core/config.py`
   - Update environment variables if needed

3. **API Changes:**
   - Some endpoint paths have changed
   - New endpoints added for multi-physics
   - Review API documentation for details

4. **Test Your Setup:**
   ```bash
   # Backend tests
   cd backend
   pytest
   
   # Frontend tests
   cd frontend
   npm test
   ```

### Breaking Changes

#### API Changes
- Some endpoint paths restructured
- Response formats standardized
- Error response format changed

#### Configuration
- New configuration options required
- Environment variable names updated

#### Dependencies
- Python 3.10+ required (was 3.8+)
- Node.js 18+ required (was 14+)
- MUI v7 required (was v6)

---

## Planned Features

### v0.4.0 (Future)
- [ ] Advanced visualization features
- [ ] Machine learning integration
- [ ] Distributed computing support
- [ ] Enhanced material database
- [ ] Experimental data import/export
- [ ] Advanced analysis tools

### v0.5.0 (Future)
- [ ] User authentication and authorization
- [ ] Multi-user support
- [ ] Cloud deployment options
- [ ] Advanced reporting
- [ ] Plugin system

---

## Deprecations

### v0.3.0-beta
- None

### v0.4.0 (Planned)
- Some legacy API endpoints will be deprecated
- Old visualization components will be removed

---

## Security

### Security Updates
- All dependencies regularly updated
- Security audits performed
- Vulnerability scanning enabled

### Reporting Security Issues
- Report security issues via GitHub security advisory
- Do not open public issues for security vulnerabilities

---

## Contributors

See CONTRIBUTORS.md for a list of contributors.

---

## Links

- [GitHub Repository](https://github.com/ConsciousEnergy/lenr_sim_app)
- [Documentation](https://github.com/ConsciousEnergy/lenr_sim_app/tree/main/docs)
- [Issue Tracker](https://github.com/ConsciousEnergy/lenr_sim_app/issues)

---

**Note**: This changelog is maintained manually. For automated changelog generation in the future, we may integrate tools like `conventional-changelog`.
