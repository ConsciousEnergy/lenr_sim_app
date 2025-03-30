# LENR Simulation Application

A comprehensive application for simulating Low Energy Nuclear Reactions (LENR) and Condensed Matter Nuclear Science (CMNS) phenomena, with a focus on quantum tunneling effects in metal hydrides.

## Features

- **Interactive 3D Visualization**: Three.js-based visualization of metal lattice structures with embedded hydrogen isotopes
- **Physics-Based Visualization Modes**: 
  - Lattice structure view with accurate atomic representations
  - Energy distribution visualization showing reaction probability
  - Phonon propagation visualization for lattice dynamics
  - Dedicated quantum tunneling visualization for fusion mechanics
  - Detailed physics information panel with calculations and explanations
- **Simulation Engine**: Backend physics core for LENR/CMNS simulations
- **Parameter Configuration**: Fine-tune simulation parameters to explore different conditions
- **Data Analysis**: Compare simulation results with experimental data
- **Export/Import**: Save and load simulation data for further analysis

## Project Structure

```
lenr_sim_app/
├── backend/              # FastAPI server
│   ├── app/              # Application code
│   │   ├── api/          # API endpoints
│   │   ├── core/         # Core simulation engine
│   │   ├── models/       # Data models
│   │   └── utils/        # Utility functions
│   ├── tests/            # Backend tests
│   └── main.py           # Entry point
├── frontend/             # React frontend
│   ├── public/           # Static files
│   ├── src/              # Source code
│   │   ├── api/          # API integration
│   │   ├── components/   # React components
│   │   │   ├── data/     # Data-related components
│   │   │   └── visualization/ # Visualization components
│   │   ├── pages/        # Application pages
│   │   ├── utils/        # Utility functions
│   │   └── App.js        # Main application component
│   └── package.json      # Dependencies
├── scripts/              # Utility scripts
└── README.md             # Project documentation
```

## Getting Started

### Prerequisites

- Python 3.9+
- Node.js 16+
- npm or yarn

### Installation

1. Clone the repository
```
git clone https://github.com/your-repo/lenr_sim_app.git
cd lenr_sim_app
```

2. Set up the backend
```
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

3. Set up the frontend
```
cd frontend
npm install
```

### Running the Application

1. Start the backend server
```
cd backend
uvicorn main:app --reload
```

2. Start the frontend development server
```
cd frontend
npm start
```

3. Open your browser and navigate to `http://localhost:3000`

## Usage

### Simulation Parameters

Adjust the following parameters to explore different LENR scenarios:

- **Temperature**: System temperature in Kelvin
- **Tunneling Parameter**: Quantum tunneling coefficient
- **Equilibrium Separation**: Distance between nuclei at equilibrium
- **Spring Constant**: Strength of the binding force
- **Potential Model**: Type of potential energy model (harmonic, Morse, etc.)

### Visualization Controls

The 3D visualization includes multiple viewing modes:

1. **Lattice Structure**: View the metal lattice with embedded hydrogen isotopes
2. **Tunneling Effects**: Visualize quantum tunneling probability
3. **Physics Information**: Detailed calculations and explanations of LENR physics

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- Three.js for 3D visualization
- React and Material-UI for the frontend interface
- FastAPI for the backend server
- NumPy and SciPy for scientific calculations 