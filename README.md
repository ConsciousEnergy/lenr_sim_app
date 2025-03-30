# 🔬 LENR_Sim_App

**LENR_Sim_App** is a high-performance, research-grade web simulation platform for modeling **Low Energy Nuclear Reactions (LENR)** phenomena. It combines state-of-the-art physics (WKB tunneling, lattice phonon dynamics, cluster effects, Boltzmann state population, impact energy modeling) with a modern, interactive web interface for researchers, engineers, and enthusiasts in Condensed Matter Nuclear Science (CMNS).

---

## 🌐 Live App

🚀 [Run the Web App](https://your-streamlit-cloud-url.streamlit.app)

---

## 📌 Features

- 🔍 **Quantum Tunneling Simulation** (WKB, Boltzmann-averaged)
- 🎛️ **Adjustable Physical Parameters** (λ, T, T_impact, k_spring, r₀)
- 🧪 **Experimental Curve Fitting** (Upload T vs Power)
- 📈 **Interactive Potential Visualizer** (with energy levels)
- 🔥 **Impact Energy Modeling** (bubble collapse / cavitation hotspots)
- 🧬 **Multi-body Cluster Viewer** (3D potential landscape via Three.js)
- 💾 **Export Results** (CSV, PNG)
- 🗃 **RESTful API** backend via FastAPI
- 🧠 Built-in physics: ZPE, vibrational tunneling, harmonic & Morse potentials

---

## 🖥️ Tech Stack

| Layer      | Tech                 |
|------------|----------------------|
| Frontend   | React, HTML, CSS     |
| Visualization | Plotly.js, Three.js |
| Backend    | FastAPI (Python)     |
| Math Engine| NumPy, SciPy, SymPy  |
| 3D Engine  | VTK (via PyVista) + Three.js |
| Deployment | Docker, Streamlit Cloud / NGINX |

---

## 📦 Installation

### Quick Start with Start Scripts

Run the entire application (backend and frontend) with a single command:

#### Windows (PowerShell)
```powershell
.\start_app.ps1
```

#### Unix/Linux/MacOS
```bash
./start_app.sh
```

### Manual Setup

```bash
# Backend setup
cd backend/
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Run API
uvicorn app.main:app --reload

# Frontend setup
cd frontend/
npm install
npm run dev
```

---

## 🧪 Testing

Run the comprehensive test suite to verify all components:

```bash
python run_tests.py all -v
```

Run specific test categories:

```bash
python run_tests.py physics   # Run physics model tests
python run_tests.py tunneling # Run tunneling engine tests
python run_tests.py heatmap   # Run heatmap generation tests
python run_tests.py api       # Test API endpoints
```

For a detailed test plan and status, see [TEST_PLAN.md](TEST_PLAN.md).

---

## 📡 API Endpoints

| Endpoint               | Method | Description                        |
|------------------------|--------|------------------------------------|
| `/simulate/thermal`    | POST   | Thermal (Boltzmann-averaged) tunneling |
| `/simulate/impact`     | POST   | High-energy impact tunneling       |
| `/simulate/heatmap`    | POST   | Generate 2D heatmap                |
| `/simulate/cluster`    | POST   | Return 3D cluster potential (VTK)  |
| `/fit/experimental`    | POST   | Fit to Power vs Temperature        |

---

## 🧪 Example Input (JSON)

```json
{
  "T": 300,
  "lambda": 1e-10,
  "r0": 1e-10,
  "k_spring": 1000,
  "potential": "harmonic"
}
```

---

## 📤 Upload Experimental Data

Upload a CSV file containing:

```csv
Temperature,Power
300,0.02
400,0.04
...
```

---

## 📊 Outputs

- Tunneling probability (thermal + impact)
- Energy level table
- Residuals for experimental fit
- 3D cluster visualization

---

## 🧠 Physics References

- WKB Approximation
- Boltzmann-weighted quantum state populations
- Zero-point energy in harmonic wells
- Anharmonic corrections (Morse potential)
- Surface cavitation model (impact tunneling)
- Multi-body electrostatics (D⁺ cluster)

---

## 📜 License

MIT License — for educational and non-commercial research purposes.

---

## 👩‍🔬 Authors & Contributors

- [Diadon Acs] (Lead Developer)
- LENR ARA (AI Planning Assistant)
- Open Source Physics Community

---

## 📂 Project Structure

```
LENR_SIM_APP/
├── backend/               # FastAPI backend
│   ├── app/
│   │   ├── api/           # API routes
│   │   ├── models/        # Pydantic models
│   │   ├── physics/       # Physics calculation modules
│   │   ├── utils/         # Utilities
│   │   ├── visualization/ # Visualization utilities
│   │   └── main.py        # Entry point
│   ├── static/            # Static files
│   ├── logs/              # Log files
│   └── tests/             # Test suite
├── frontend/              # React frontend
│   ├── src/
│   │   ├── components/    # UI components
│   │   ├── api/           # API client
│   │   ├── theme/         # Theme configuration
│   │   └── App.js         # Main app
├── TEST_PLAN.md           # Comprehensive test plan
├── start_app.sh           # Unix startup script
├── start_app.ps1          # Windows startup script
└── run_tests.py           # Test runner
```

--- 