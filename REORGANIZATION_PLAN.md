# LENR_SIM_APP Reorganization Plan

## Current State Analysis

### Root Level (Most Complete)
- **Backend**: Comprehensive FastAPI app with:
  - Advanced multi-physics coupling
  - FEM implementation
  - Comprehensive physics models (quantum tunneling, electron screening, phonon interactions)
  - Visualization hooks and result analysis
  - Complete test suite
  - Memory management and caching

- **Frontend**: Complete React app with:
  - Material-UI components
  - Three.js integration
  - Comprehensive state management
  - Task management integration
  - TypeScript support

- **Scripts**: Task management system (dev.js)

### LENR_SIM_APP_v1 (Legacy/Stable)
- Simpler implementation
- Basic features working
- Good for reference
- **Action**: Keep as-is for legacy reference

### LENR_SIM_APP_v2 (Partial Implementation)
- Has some unique unified LENR solver code
- Less comprehensive than root
- **Action**: Merge root into v2, preserve v2's unique unified solver code

## Reorganization Strategy

### Phase 1: Backup and Preparation
1. Create reorganization branch (if using git)
2. Document current state

### Phase 2: Consolidate into v2
1. **Backend Consolidation**:
   - Copy root/backend/app → v2/backend/app (preserve v2's physics_engine unique files)
   - Merge requirements.txt
   - Update imports and paths

2. **Frontend Consolidation**:
   - Copy root/frontend/src → v2/frontend/src (preserve unique v2 components)
   - Merge package.json dependencies
   - Update configuration files

3. **Scripts and Tools**:
   - Move root/scripts → v2/scripts
   - Move root/tasks → v2/tasks

4. **Documentation**:
   - Move detailed docs to v2/docs
   - Keep high-level docs at root

### Phase 3: Clean Root Directory
Root should contain ONLY:
- README.md (pointing to v1 and v2)
- SETUP_INSTRUCTIONS.md
- LICENSE
- .gitignore
- Overall project documentation

### Phase 4: Update References
1. Update all README files
2. Update startup scripts to point to correct locations
3. Update import paths
4. Update documentation links

### Phase 5: Cleanup
1. Remove duplicate venv directories
2. Remove duplicate node_modules
3. Remove temporary/backup files
4. Clean up logs and output directories

## File Movement Map

### To LENR_SIM_APP_v2:
- backend/app/ → v2/backend/app/ (merge)
- backend/tests/ → v2/backend/tests/ (merge)
- backend/requirements.txt → v2/backend/requirements.txt (merge)
- frontend/src/ → v2/frontend/src/ (merge)
- frontend/public/ → v2/frontend/public/ (merge)
- frontend/package.json → v2/frontend/package.json (merge)
- scripts/ → v2/scripts/
- tasks/ → v2/tasks/
- docs/ → v2/docs/ (detailed documentation)

### Keep at Root:
- README.md (updated)
- SETUP_INSTRUCTIONS.md
- LICENSE (if exists)
- SECURITY.md
- .gitignore

### Archive to LENR_SIM_APP_v1:
- Already done, keep as-is

## Post-Reorganization Structure

```
LENR_SIM_APP/
├── README.md (overview, points to v1 and v2)
├── SETUP_INSTRUCTIONS.md
├── LICENSE
├── SECURITY.md
├── .gitignore
│
├── LENR_SIM_APP_v1/ (Legacy - Keep as-is)
│   └── [existing v1 files]
│
└── LENR_SIM_APP_v2/ (Current Development)
    ├── README.md
    ├── backend/
    │   ├── app/
    │   │   ├── main.py
    │   │   ├── physics/
    │   │   ├── physics_engine/
    │   │   ├── simulation/
    │   │   ├── routers/
    │   │   ├── services/
    │   │   ├── utils/
    │   │   └── tests/
    │   └── requirements.txt
    │
    ├── frontend/
    │   ├── src/
    │   ├── public/
    │   ├── package.json
    │   └── [config files]
    │
    ├── scripts/
    │   └── dev.js (task management)
    │
    ├── tasks/
    │   └── tasks.json
    │
    ├── docs/
    │   ├── api/
    │   ├── tutorials/
    │   └── [detailed documentation]
    │
    ├── start.bat
    ├── start.sh
    └── install-dependencies.bat
```

## Benefits of This Organization

1. **Clear Separation**: v1 as legacy, v2 as current development
2. **No Duplication**: All current code in one place (v2)
3. **Clean Root**: Easy to understand project structure
4. **Preserves History**: v1 remains intact for reference
5. **Easier Maintenance**: Single location for current development
6. **Better Version Control**: Clear what's active vs archived

## Risks and Mitigations

1. **Risk**: Breaking import paths
   - **Mitigation**: Update all imports systematically, test after each major move

2. **Risk**: Losing unique code from v2
   - **Mitigation**: Carefully merge, preserve v2's unique unified_lenr_solver

3. **Risk**: Breaking startup scripts
   - **Mitigation**: Update and test scripts after reorganization

4. **Risk**: Configuration conflicts
   - **Mitigation**: Merge configuration files carefully, keep both if needed

## Success Criteria

- [ ] All code from root successfully moved to v2
- [ ] No duplicate backend/frontend at root level
- [ ] Startup scripts work from v2 directory
- [ ] All tests pass in v2
- [ ] Documentation updated and accurate
- [ ] Root README clearly explains structure
- [ ] v1 preserved as legacy reference

