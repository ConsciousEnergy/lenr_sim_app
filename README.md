# LENR Simulation Application

An interactive scientific application for simulating Low Energy Nuclear Reaction (LENR) phenomena and quantum tunneling effects.

## Overview

This application provides a comprehensive suite of tools for simulating and visualizing quantum tunneling phenomena related to LENR (Low Energy Nuclear Reactions). The application consists of:

- **Backend**: FastAPI-based Python server for physics calculations and data processing
- **Frontend**: React-based user interface for interactive parameter exploration and visualization

## Key Features

- **Multiple Simulation Modes**: Choose between thermal tunneling and impact tunneling simulations
- **Interactive Parameter Control**: Adjust quantum tunneling parameters in real-time with intuitive sliders and inputs
- **Advanced Visualizations**: 
  - Explore 3D lattice structures using Three.js with interactive controls
  - Visualize parameter spaces with heatmaps using Recharts
  - Examine particle clusters with 3D visualization
- **Data Analysis**: Import experimental data with CSV preview and validation
- **Real-time Feedback**: Immediate visual feedback when changing simulation parameters
- **Responsive Design**: Fully responsive interface that works on desktop and tablets

## Project Structure

```
LENR_SIM_APP/
├── backend/               # FastAPI server and physics engine
│   ├── app/               # Application code
│   │   ├── physics/       # Physics models and calculations
│   │   ├── api/           # API endpoints and routing
│   │   │   └── routes/    # API route definitions
│   │   ├── models/        # Pydantic data models
│   │   ├── visualization/ # Visualization generators
│   │   └── utils/         # Helper functions
│   └── tests/             # Backend test suite
├── frontend/              # React application
│   ├── public/            # Static assets
│   └── src/               # React components and state management
│       ├── components/    # Reusable UI components
│       │   └── visualization/ # Visualization components
│       ├── api/           # API client and service functions
│       ├── pages/         # Application pages
│       └── theme/         # Styling and theming
├── start_app.ps1          # Windows PowerShell script to start both servers
├── start_app.sh           # Unix shell script to start both servers
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

#### On Unix/macOS:
```bash
./start_app.sh
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
python run_tests.py
```

## Components

### Backend

- **Physics Engine**: Calculate quantum tunneling probabilities, energy levels, and lattice interactions
- **FastAPI Endpoints**: RESTful API for interacting with the physics engine
- **Data Processing**: Process and analyze simulation results
- **Visualization Generators**: Generate 3D visualization data for the frontend

### Frontend

- **Parameter Panel**: Interactive controls for adjusting simulation parameters
- **Results Panel**: Display simulation results with interactive charts
- **Visualization Components**:
  - Lattice Visualization: 3D visualization of lattice structures
  - Heatmap Panel: Parameter space exploration through heatmaps
  - Cluster Visualization: 3D visualization of particle clusters
- **Data Uploader**: Import and preview experimental data from CSV files
- **Dashboard**: Main interface combining all components

## API Endpoints

The application exposes the following main API endpoints:

- `/simulate/thermal` - Calculate thermal tunneling with Boltzmann averaging
- `/simulate/impact` - Calculate impact energy tunneling
- `/simulate/heatmap` - Generate 2D heatmap of parameter space
- `/simulate/cluster` - Generate 3D cluster visualization data
- `/fit/experimental` - Fit experimental data to theoretical models
- `/health` - Server health check endpoint

## Documentation

For more information, see:
- `DEV_PLAN.md`: Development roadmap and implementation status
- `PROGRESS_SUMMARY.md`: Summary of completed work and next steps
- `IMPLEMENTATION_SUMMARY.md`: Details of the frontend implementation

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

See `CONTRIBUTORS.md` for a list of contributors to the project. 