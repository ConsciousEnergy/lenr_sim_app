# LENR Simulation Application

A comprehensive simulation platform for Low Energy Nuclear Reactions based on quantum tunneling models. This application includes a physics engine to simulate LENR processes and a web-based interface for parameter input, visualization, and analysis.

## Features

- **Advanced Physics Engine**: Implementation of quantum tunneling models for LENR simulation
- **Interactive UI**: Parameter input panels and real-time result visualization
- **3D Visualization**: Three.js-based visualization of lattice structures with interactive legend and controls
- **Data Analysis**: Import/export experimental data, compare with simulation results, and statistical analysis
- **Flexible API**: Well-documented FastAPI endpoints for simulation control and data access
- **Cross-Platform**: Works on Windows, macOS, and Linux

## Project Structure

```
LENR_SIM_APP/
├── backend/                    # FastAPI server
│   ├── app/
│   │   ├── api/                # API endpoints
│   │   ├── core/               # Core application code
│   │   ├── models/             # Pydantic models
│   │   ├── physics/            # Physics simulation engine
│   │   └── utils/              # Utility functions
│   └── tests/                  # Automated tests
├── frontend/                   # React client
│   ├── public/                 # Static assets
│   └── src/
│       ├── api/                # API client functions
│       ├── components/         # React components
│       │   ├── data/           # Data analysis components
│       │   └── visualization/  # Visualization components
│       ├── pages/              # Application pages
│       └── theme/              # Styling and theming
├── scripts/                    # Helper scripts
└── start_app.ps1               # Application launcher
```

## Getting Started

### Prerequisites

- Python 3.8 or higher
- Node.js 14 or higher
- npm or yarn

### Installation

1. Clone the repository
   ```
   git clone https://github.com/yourusername/LENR_SIM_APP.git
   cd LENR_SIM_APP
   ```

2. Set up the backend
   ```
   cd backend
   python -m venv venv
   # Windows
   venv\Scripts\activate
   # macOS/Linux
   source venv/bin/activate
   pip install -r requirements.txt
   ```

3. Set up the frontend
   ```
   cd frontend
   npm install
   ```

### Running the Application

#### Using the start script (Windows)
```
.\start_app.ps1
```

#### Manually
```
# Start the backend
cd backend
python -m app.main

# Start the frontend (in a new terminal)
cd frontend
npm start
```

## Key Features

### 1. Physics Engine

The backend implements several physics models:
- Quantum tunneling calculation with various potential models
- Temperature-dependent fusion probability
- Lattice dynamics simulation
- Phonon generation and propagation

### 2. Interactive Parameter Panel

Users can adjust simulation parameters such as:
- Temperature range
- Lattice parameters
- Potential model selection
- Simulation time steps

### 3. Real-time Visualization

Results are displayed through:
- Interactive charts showing temperature vs. tunneling probability
- 3D visualization of the lattice structure with:
  - Color coding for energy levels
  - Interactive legend explaining visualization elements
  - Controls to start, pause, and reset simulations
  - Animation of phonon propagation

### 4. Data Analysis

The application supports extensive data analysis features:
- Import experimental data via CSV upload
- Compare simulation results with experimental data
- Statistical analysis including R², RMSE, and correlation coefficients
- Export combined data sets for further analysis

## API Documentation

The FastAPI backend provides automatic OpenAPI documentation at:
```
http://localhost:8000/docs
```

## Contributing

Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details on how to contribute to this project.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- The LENR research community
- FastAPI, React, and Three.js communities
- Contributors to the scientific modules used in this project 