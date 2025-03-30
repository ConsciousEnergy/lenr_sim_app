# LENR Simulation Application

An interactive scientific application for simulating Low Energy Nuclear Reaction (LENR) phenomena and quantum tunneling effects.

## Overview

This application provides a comprehensive suite of tools for simulating and visualizing quantum tunneling phenomena related to LENR (Low Energy Nuclear Reactions). The application consists of:

- **Backend**: FastAPI-based Python server for physics calculations and data processing
- **Frontend**: React-based user interface for interactive parameter exploration and visualization

## Key Features

- **Interactive Simulations**: Adjust quantum tunneling parameters in real-time with intuitive sliders and inputs
- **Advanced Visualizations**: Explore 3D lattice structures using Three.js with multiple visualization modes
- **Informative Legends**: Detailed legends explaining visualization elements and color codes
- **Simulation Controls**: Start, pause, stop and reset simulations directly within the visualization
- **Multiple Visualization Modes**: Toggle between lattice structure, energy distribution, and phonon propagation modes
- **Data Visualization**: Interactive charts and graphs for simulation results using Recharts
- **Parameter Exploration**: Test different potential models and configurations
- **Real-time Feedback**: Immediate visual feedback when changing simulation parameters
- **Responsive Design**: Fully responsive interface that works on desktop and tablets

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
│       │   └── visualization/ # Visualization components
│       ├── pages/         # Application pages
│       └── theme/         # Styling and theming
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

- **Parameter Panel**: Interactive controls for adjusting simulation parameters
- **Results Panel**: Display simulation results with interactive charts
- **Lattice Visualization**: 3D visualization of lattice structures with different view modes, interactive legend, and simulation controls
  - **Visualization Modes**: Switch between lattice structure, energy distribution, and phonon propagation
  - **Interactive Legend**: Explains the meaning of different elements and colors in the visualization
  - **Simulation Controls**: Start, pause, stop, and reset simulations directly from the visualization
- **Dashboard**: Main interface combining all components

## 3D Visualization Features

The 3D visualization component offers:

- **Multiple View Modes**: Toggle between different visualization perspectives
  - **Lattice Structure**: View the basic crystalline arrangement of atoms
  - **Energy Distribution**: See how energy is distributed throughout the lattice
  - **Phonon Propagation**: Visualize phonon wave movements within the structure
- **Interactive Controls**: Orbit, zoom, and pan to explore the 3D model
- **Detailed Legend**: Explanatory legend showing what different colors and elements represent
- **Embedded Simulation Controls**: Control the simulation directly from the visualization panel
- **Real-time Updates**: See the visualization change as the simulation progresses

## Documentation

For more information, see:
- `DEV_PLAN.md`: Development roadmap and implementation status
- `PROGRESS_SUMMARY.md`: Summary of completed work and next steps

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

See `CONTRIBUTORS.md` for a list of contributors to the project. 