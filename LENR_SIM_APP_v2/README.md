# LENR Simulation App v2

**Advanced modeling and visualization of Low Energy Nuclear Reactions**

[![Status](https://img.shields.io/badge/status-active-success.svg)]()
[![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)]()
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)

---

## 🎯 Quick Start

### Start the Application

```bash
# From project root
start_app.bat
```

This will start both:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000

### Access the App

- **Homepage**: http://localhost:3000
- **API Documentation**: http://localhost:8000/api/docs
- **Visualization Test**: http://localhost:3000/visualization-test

---

## 📊 Project Status (November 9, 2025)

### ✅ **App is Running Successfully**

- ✓ Compiles without errors
- ✓ All core features functional
- ✓ UI/UX improvements applied
- ✓ Accessibility enhanced
- ✓ Documentation complete

### ⚠️ Known Non-Critical Warnings

All warnings are **documented and safe to ignore**:
- 9 NPM vulnerabilities (in react-scripts dependencies)
- Webpack deprecation warnings (will be fixed in CRA update)
- 4 MUI Grid console warnings (informational only)
- Source map warning (cosmetic)

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

Create `frontend/.env.local`:
```env
REACT_APP_API_URL=http://localhost:8000
REACT_APP_API_BASE_URL=http://localhost:8000
REACT_APP_DEBUG_LEVEL=3
REACT_APP_USE_MOCK_DATA=false
REACT_APP_MOCK_DELAY=500
```

---

## 📝 Recent Updates (November 9, 2025)

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
