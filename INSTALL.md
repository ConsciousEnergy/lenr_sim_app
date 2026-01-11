# LENR Simulation App Installation

## Prerequisites

- Python 3.7 or later
- pip package manager

## Installation Steps

1. Clone the repository:
   ```
   git clone https://github.com/your-username/LENR_SIM_APP.git
   cd LENR_SIM_APP
   ```

2. Create a virtual environment (optional but recommended):
   ```
   python -m venv env
   
   # On Windows:
   env\Scripts\activate
   
   # On macOS/Linux:
   source env/bin/activate
   ```

3. Install the package in development mode:
   ```
   pip install -e .
   ```

   This will install all the required dependencies and make the package importable.

## Running the Application

To run the FastAPI backend:

```
cd backend
python -m app.main
```

The application will be available at `http://localhost:8000`.

## Troubleshooting

### Import Issues

If you encounter import errors, ensure that you have installed the package using `pip install -e .` from the project root directory.

### Dependency Issues

If you have dependency issues, try running:

```
pip install -r requirements.txt
```

If this file doesn't exist, you can generate it with:

```
pip freeze > requirements.txt
```

### Missing Modules

If you see errors about missing modules, ensure you're running the application from the correct directory and that all required packages are installed. 