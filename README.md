# LENR Simulation Application

An interactive scientific application for simulating Low Energy Nuclear Reaction (LENR) phenomena and quantum tunneling effects.

## Overview

This application provides a comprehensive suite of tools for simulating and visualizing quantum tunneling phenomena related to LENR (Low Energy Nuclear Reactions). The application consists of:

- **Backend**: FastAPI-based Python server for physics calculations and data processing
- **Frontend**: React-based user interface for interactive parameter exploration and visualization

## Project Structure

```
LENR_SIM_APP/
├── backend/               # FastAPI server and physics engine
│   ├── app/               # Application code
│   │   ├── models/        # Physics models and calculations
│   │   ├── routers/       # API endpoints
│   │   ├── services/      # Business logic
│   │   └── utils/         # Helper functions
│   └── tests/             # Backend test suite
├── frontend/              # React application
│   ├── public/            # Static assets
│   └── src/               # React components and state management
│       ├── components/    # Reusable UI components
│       ├── pages/         # Application pages
│       └── theme/         # Styling and theming
├── start_app.sh           # Unix shell script to start both servers
├── start_app.ps1          # Windows PowerShell script to start both servers
└── run_tests.py           # Script to run tests and generate reports
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

#### On Unix-like systems:
```bash
chmod +x start_app.sh
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
python run_tests.py --category all --report
```

See the `TEST_PLAN.md` for comprehensive testing information.

## Features

- **Interactive Simulations**: Adjust quantum tunneling parameters in real-time
- **Visualization**: Multiple visualization options including heatmaps and 3D renderings
- **Parameter Exploration**: Test different potential models and configurations
- **Data Export**: Save simulation results for further analysis

## Documentation

- Frontend UI documentation: See `frontend/README.md`
- Test plan: See `TEST_PLAN.md`
- Contributing guidelines: See `CONTRIBUTING.md`

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

See `CONTRIBUTORS.md` for a list of contributors to the project. 