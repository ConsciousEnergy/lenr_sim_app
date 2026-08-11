# LENR Simulation App v2 - Development Notes

> **📖 For Product Vision & Roadmap**: See **[PRD.md](PRD.md)**  
> This document focuses on technical setup and development workflows.

---

## Quick Start

### Start Both Servers (Recommended)
```bash
# From project root
start_app.bat
```

### Start Frontend Only (Clean Mode)
```bash
cd frontend
start-clean.bat
```

### Start Frontend (Normal Mode)
```bash
cd frontend
npm start
```

---

## ⚠️ Known Warnings

### Summary of Warnings:
1. **2 moderate npm advisories** - `react-router` 6.x; clearing them needs a v7
   migration, so they are deferred. `npm audit --audit-level=high` exits `0`.
2. **npm install summary** - the funding line and audit count printed after
   `npm ci` come from npm, not from Vite.
3. **Source Map Warning** - missing map for prebuilt third-party bundles
   (`@mediapipe/tasks-vision` via `@react-three/drei`).

If you see any **high** advisory you are on a stale lockfile or `node_modules`;
pull and reinstall.

📖 **See `frontend/WARNINGS_EXPLAINED.md` for detailed explanations**

---

## App Status: ✅ HEALTHY

- ✓ Builds successfully (Vite 6.4.3)
- ✓ Runs on http://localhost:3000
- ✓ Backend API on http://localhost:8010
- ✓ All features functional
- ✓ Production builds work (`npm run build`)

---

## Recent Fixes Applied

### UI/UX Improvements (Nov 9, 2025)
- ✅ Fixed difficult-to-read feature chips in hero section (now white with blue text)
- ✅ Removed user profile/authentication UI (app is open access)
- ✅ Fixed sidebar to display vertically on the side
- ✅ Cleaned up navigation to show only essential controls

### Compilation Fixes
- ✅ Fixed Avatar import for app logo
- ✅ Removed unused imports and variables
- ✅ All ESLint errors resolved
- ✅ Resolved Grid2 import issue (reverted to Grid v1)

### Runtime Optimization
- ✅ Added React Router v7 future flags
- ✅ Improved navigation performance with startTransition
- ⚠️ MUI Grid warnings remain (non-critical, documented)

### Accessibility Enhancements
- ✅ Added proper `id`, `name`, `aria-label` attributes to all form controls
- ✅ Associated labels with form inputs using `htmlFor`
- ✅ Improved keyboard navigation
- ✅ Enhanced screen reader compatibility

### Documentation
- ✅ Created comprehensive testing task list
- ✅ Documented all known warnings and their causes
- ✅ Created debugging guides

---

## Testing

### 📋 **Comprehensive Task List**
See **[TESTING_AND_DEBUG_TASKS.md](TESTING_AND_DEBUG_TASKS.md)** for:
- 13 structured testing tasks
- Priority-based organization
- Estimated completion times
- Success criteria for each task
- Debug utilities and commands

### Quick Testing Commands

```bash
# Run Accessibility Tests
cd frontend/src/tests
node accessibility-test.js

# Test Visualizations
# Navigate to: http://localhost:3000/visualization-test

# Run Production Build
cd frontend
npm run build

# Analyze Bundle Size
cd frontend
npm run build:analyze
```

### Recommended Testing Order
1. Homepage & Navigation (30 min) - **Start Here**
2. Visualization Test Page (45 min)
3. Backend Integration (1 hr)
4. Simulation Pages (1.5 hrs)
5. Performance Testing (1 hr)

---

## Troubleshooting

### "Cannot find REACT_APP_API_URL" Error
Run the environment setup script:
```bash
cd frontend
setup-env.bat
```

### Port Already in Use
Kill existing Node processes or change port:
```bash
# In frontend/.env.local
PORT=3001
```

### Backend Not Responding
Make sure the backend is running:
```bash
cd backend
venv\Scripts\activate
uvicorn app.main:app --reload --port 8010
```

---

## Project Structure

```
LENR_SIM_APP_v2/
├── backend/              # FastAPI backend
│   ├── app/
│   │   ├── main.py
│   │   ├── routers/
│   │   │   └── mock_simulation_router.py
│   │   └── physics/
│   └── requirements.txt
│
├── frontend/            # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── AppLayoutFixed.jsx    # Main layout with sidebar
│   │   │   └── visualization/
│   │   ├── pages/
│   │   │   ├── DashboardNew.jsx      # Homepage
│   │   │   └── VisualizationTest.jsx # Test page
│   │   └── App.tsx                   # Main app routing
│   ├── package.json
│   └── WARNINGS_EXPLAINED.md
│
├── start_app.bat        # Start both frontend & backend
└── DEVELOPMENT_NOTES.md # This file
```

---

## Environment Variables

### Optional API override
Vite proxies relative `/api/*` paths to the backend, so local development usually
needs no override at all. To bypass the proxy, create `frontend/.env.local`:
```
REACT_APP_API_URL=http://localhost:8010
VITE_API_URL=http://localhost:8010
```

### Optional Variables
```
REACT_APP_DEBUG_LEVEL=3
REACT_APP_USE_MOCK_DATA=false
REACT_APP_MOCK_DELAY=500
GENERATE_SOURCEMAP=false  # Suppress source map warnings
```

---

## Common Commands

### Frontend
```bash
npm start              # Start dev server
npm run build          # Production build
npm test              # Run tests
npm audit             # Check vulnerabilities
```

### Backend
```bash
pip install -r requirements.txt    # Install dependencies
uvicorn app.main:app --reload      # Start dev server
```

---

## Documentation Links

### Testing & Development
- **[Testing & Debug Tasks](TESTING_AND_DEBUG_TASKS.md)** - Comprehensive task list with 13 structured tasks
- [Visualization Debug Guide](VISUALIZATION_DEBUG_GUIDE.md) - Guide for debugging 3D visualizations

### Issue Documentation
- [Warnings Explained](frontend/WARNINGS_EXPLAINED.md) - Detailed explanation of all warnings
- [Runtime Warnings Status](frontend/RUNTIME_WARNINGS_FIXED.md) - Status of runtime warnings
- [Accessibility Fixes Report](frontend/accessibility-fixes-report.md) - Summary of accessibility improvements

### Quick Links
- Frontend: http://localhost:3000
- Backend API: http://localhost:8010
- API Docs: http://localhost:8010/api/docs
- Visualization Test: http://localhost:3000/visualization-test

---

## Support

For issues or questions:
1. Check `WARNINGS_EXPLAINED.md` for known warnings
2. Review `VISUALIZATION_DEBUG_GUIDE.md` for visualization issues
3. Check the GitHub issues (if applicable)

---

**Last Updated**: August 2026  
**Version**: 0.3.6-beta  
**Status**: Development - Stable

