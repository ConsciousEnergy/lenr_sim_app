# LENR Simulation Application

A research-grade simulation platform for exploring Low Energy Nuclear Reactions (LENR), focusing on quantum tunneling phenomena and related energy production mechanisms.

![LENR Simulation](https://img.shields.io/badge/Version-0.1.0-blue)
![Python](https://img.shields.io/badge/Python-3.7+-brightgreen)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115.0+-green)
![React](https://img.shields.io/badge/React-18.0.0+-orange)

## Overview

The LENR Simulation Application provides an integrated environment for scientists, researchers, and enthusiasts to model and visualize Low Energy Nuclear Reaction phenomena. The platform features a modern React frontend with advanced visualization capabilities and a robust Python FastAPI backend that performs complex physical calculations.

## Features

- **Physics-based Simulation**: Accurate mathematical models for potential barriers, tunneling probabilities, and energy calculations
- **Interactive Visualizations**: Real-time 2D/3D representations of potential wells, tunneling events, and heat generation
- **Parameter Exploration**: Intuitive interface for adjusting simulation parameters
- **Heatmap Generation**: Visual representation of energy output under varying conditions
- **Data Export**: Download simulation results for further analysis
- **Responsive Design**: Optimized for desktop and tablet devices

## Getting Started

### Prerequisites

- Python 3.7+
- Node.js 16+
- npm 8+

### Installation

There are two ways to start the application:

#### Option 1: Using the Startup Scripts

For Windows:
```powershell
# Clone this repository
git clone https://github.com/YOUR_USERNAME/LENR_Simulation_App.git
cd LENR_Simulation_App

# Run the startup script
.\start_app.ps1
```

For Unix-like systems:
```bash
# Clone this repository
git clone https://github.com/YOUR_USERNAME/LENR_Simulation_App.git
cd LENR_Simulation_App

# Make the script executable
chmod +x start_app.sh

# Run the startup script
./start_app.sh
```

#### Option 2: Manual Setup

```bash
# Clone this repository
git clone https://github.com/YOUR_USERNAME/LENR_Simulation_App.git
cd LENR_Simulation_App

# Backend setup
python -m venv backend-env
source backend-env/bin/activate  # On Windows use: backend-env\Scripts\activate
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# In a separate terminal
# Frontend setup
cd frontend
npm install
npm start
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

## Testing

The application includes a comprehensive test suite. To run tests:

```bash
python run_tests.py --category all --report
```

See [TEST_PLAN.md](TEST_PLAN.md) for more details about testing.

## Project Structure

```
LENR_Simulation_App/
├── backend/                 # FastAPI backend
│   ├── app/                 # Application code
│   │   ├── api/             # API endpoints
│   │   ├── core/            # Core functionality
│   │   ├── models/          # Data models
│   │   ├── physics/         # Physics calculation modules
│   │   └── utils/           # Utility functions
│   ├── tests/               # Backend tests
│   └── requirements.txt     # Python dependencies
├── frontend/                # React frontend
│   ├── public/              # Static files
│   ├── src/                 # Source code
│   │   ├── components/      # React components
│   │   ├── theme/           # UI theming
│   │   ├── utils/           # Utility functions
│   │   └── services/        # API client services
│   └── package.json         # Node.js dependencies
├── start_app.ps1            # Windows startup script
├── start_app.sh             # Unix startup script
├── run_tests.py             # Test runner script
└── TEST_PLAN.md             # Testing documentation
```

## Development

See [frontend/README.md](frontend/README.md) for information about the frontend UI theme and components.

For contribution guidelines and development workflow, please refer to the [contributing guidelines](CONTRIBUTING.md).

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgements

- The scientific community researching LENR phenomena
- The FastAPI and React communities for their excellent frameworks
- Contributors and researchers who have provided insights into quantum tunneling models 