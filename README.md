# LENR Simulation Application

An interactive scientific application for simulating Low Energy Nuclear Reaction (LENR) phenomena and quantum tunneling effects.

## Overview

This application provides a comprehensive suite of tools for simulating and visualizing quantum tunneling phenomena related to LENR (Low Energy Nuclear Reactions). The application consists of:

- **Backend**: FastAPI-based Python server for physics calculations and data processing
- **Frontend**: React-based user interface with consolidated dashboard for visualization and simulation

## Key Features

- **Unified Dashboard**: Single-page interface integrating all simulation features to prevent unmounting issues
- **Interactive Simulations**: Adjust quantum tunneling parameters in real-time with intuitive sliders and inputs
- **Advanced Visualizations**: Explore 3D lattice structures using Three.js with multiple visualization modes
- **Memory-Optimized Rendering**: Three.js integration with optimized resource management
- **Data Visualization**: Interactive charts and graphs for simulation results using Recharts
- **Parameter Exploration**: Test different potential models and configurations
- **Real-time Feedback**: Immediate visual feedback when changing simulation parameters
- **Centralized Settings Management**: Context-based settings system with persistent storage
- **Responsive Design**: Fully responsive interface that works on desktop and tablets
- **Conscious.Energy Integration**: Links and branding connection to conscious.energy

## Project Structure

```
LENR_SIM_APP/
├── backend/               # FastAPI server and physics engine
│   ├── app/               # Application code
│   │   ├── physics/       # Physics models and calculations
│   │   ├── routers/       # API endpoints
│   │   ├── services/      # Business logic
│   │   └── utils/         # Helper functions
│   └── tests/             # Backend test suite
├── frontend/              # React application
│   ├── public/            # Static assets
│   └── src/               # React components and state management
│       ├── components/    # Reusable UI components
│       ├── contexts/      # React contexts for state management
│       │   ├── AppSettingsContext.js  # Centralized settings management
│       │   ├── LogContext.js          # Logging system
│       │   └── ThrottleContext.js     # Performance throttling
│       ├── models/        # Physics models for simulation
│       ├── utils/         # Utility functions and helpers
│       │   ├── threeCleanup.js   # Three.js resource management
│       │   └── errorReporter.js  # Error handling system
│       ├── pages/         # Application pages
│       └── debug/         # Debugging tools and testers
│           └── SettingsPage.js   # Settings interface
├── start_app.ps1          # Windows PowerShell script to start both servers
└── logs/                  # Application logs
```

## Getting Started

### Prerequisites

- Python 3.8+
- Node.js 14+
- npm or yarn

### Starting the Application

#### On Windows:
```powershell
.\start_app.ps1
```

This will:
1. Create a virtual environment if one doesn't exist
2. Install backend dependencies
3. Start the FastAPI backend server
4. Install frontend dependencies
5. Start the React development server

### Running Tests

```bash
cd backend
pytest
```

## Components

### Backend

- **Physics Engine**: Calculate quantum tunneling probabilities, energy levels, and lattice interactions
- **FastAPI Endpoints**: RESTful API for interacting with the physics engine
- **Data Processing**: Process and analyze simulation results

### Frontend

- **Unified Dashboard**: Main interface with persistent 3D visualization and tabbed interface
- **Parameter Panel**: Interactive controls for adjusting simulation parameters
- **Results Panel**: Display simulation results with interactive charts
- **Memory-Optimized Visualization**: 3D rendering with proper resource cleanup
- **Error Handling System**: Comprehensive error capturing and reporting
- **Settings Management**: Centralized context-based settings with persistence

## Architecture Improvements

### Three.js Memory Management
The application implements robust Three.js resource management to prevent memory leaks:
- Proper cleanup of geometries, materials, and textures
- React-safe handling of Three.js DOM elements
- Detached DOM containers to prevent React-Three.js conflicts

### Consolidated Dashboard
A single-page dashboard approach with tabs for different features:
- Simulation controls alongside visualization
- Results analysis with charts
- Configuration options
- Persistent visualization component to avoid unmounting/remounting cycles

### Centralized Settings System
The application uses a context-based settings management system:
- Persistent storage using localStorage
- Categorized settings for appearance, visualization, simulation, and LENR physics
- Real-time application of settings across components
- Import/export functionality for sharing configurations
- Robust error handling and defaults

## Documentation

For more information, see:
- `DEV_PLAN.md`: Development roadmap and implementation status
- `PROGRESS_SUMMARY.md`: Summary of completed work and next steps

## Recent Improvements

### Backend Optimization
- **Improved Parameter Handling**: Enhanced the `PotentialParameters` class with proper copy methods to prevent reference errors
- **Updated API Signatures**: Standardized function signatures in the tunneling engine to use `PotentialParameters` objects
- **Memory Management**: Optimized memory usage in physics calculations and heatmap generation
- **Error Handling**: Improved error catching and reporting across backend services

### Testing Enhancements
- **Comprehensive Test Coverage**: All tests (unit, integration, and end-to-end) are now passing with 85%+ coverage
- **Visualization Tests**: Added robust tests for heatmap generation and visualization components
- **Edge Case Handling**: Improved test cases to handle error conditions and edge cases

### Documentation
- **Updated Development Plan**: Revised development plan with current implementation status
- **Progress Tracking**: Enhanced progress summary with recent achievements
- **Code Comments**: Improved inline documentation for complex physics calculations

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

See `CONTRIBUTORS.md` for a list of contributors to the project. 

## Branded Connection

This application is associated with [conscious.energy](https://conscious.energy), featuring shared branding and integration. 