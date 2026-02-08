# LENR Simulation Application Setup Guide

## What We've Fixed

1. Added missing import of `scipy.constants` to fix errors in `physics_routes.py`
2. Updated API base URLs in frontend to use port 8001 instead of port 8000
3. Created proper startup scripts for Windows, PowerShell, and Linux/Mac
4. Created a comprehensive README with setup and usage instructions

## Quick Start Guide

### On Windows

#### Using Batch Script (Command Prompt)
1. Double-click `start_app.bat` or run it from Command Prompt
2. Two windows will open automatically (one for backend, one for frontend)
3. To stop the application, close both windows or run `stop_app.bat`

#### Using PowerShell
1. Right-click `start_app.ps1` and select "Run with PowerShell" or run it from PowerShell
2. Two PowerShell windows will open automatically (one for backend, one for frontend)
3. To stop the application, close both windows

### On Linux/Mac

1. Open a terminal in the project root directory
2. Make the script executable (if not already): `chmod +x start_app.sh`
3. Run the script: `./start_app.sh`
4. Terminal windows will open for backend and frontend
5. To stop the application, press Ctrl+C in both terminal windows

## Accessing the Application

- Backend API: http://localhost:8001
- Frontend: http://localhost:3000
- API Documentation: http://localhost:8001/docs

## Manual Setup

If the scripts don't work for your environment, follow these steps:

### Backend Setup

1. Open a terminal in the project root
2. Run:
   ```bash
   cd backend
   python -m venv venv
   # On Windows
   .\venv\Scripts\activate
   # On Linux/Mac
   source venv/bin/activate
   pip install -r requirements.txt
   python -m uvicorn app.main:app --reload --port 8001
   ```

### Frontend Setup

1. Open another terminal in the project root
2. Run:
   ```bash
   cd frontend
   npm install
   npm start
   ```

## Troubleshooting

### Port Already in Use
If port 8001 is already in use, modify the port number in:
- Backend startup command
- API base URL in frontend files:
  - `frontend/src/api/physics/physicsApiClient.ts`
  - `frontend/src/api/physics/websocketClient.ts`
  - `frontend/src/api/realtime.ts`

### Missing Directories
Ensure these directories exist:
```bash
mkdir -p backend/data backend/static backend/logs
```

### Running backend tests (pytest + coverage)
Run tests **from the v2 backend directory** so coverage finds `tests/.coveragerc`:
- **From repo root:** `run_backend_tests.bat` (Windows), or:
  ```bash
  cd LENR_SIM_APP_v2\backend
  python -m pytest tests/ -v --tb=short
  ```
  If you use a venv at repo root, activate it first: `venv\Scripts\activate`.

### Node.js and frontend dependencies
- **Node v20.12** is sufficient; you do not need to upgrade Node to run the app.
- Frontend: `cd LENR_SIM_APP_v2\frontend` then `npm install` (already works with Node 20.12).
- To refresh dependencies without upgrading Node: `npm update` in the frontend folder, or a clean install: remove `node_modules`, then `npm install` (keep `package-lock.json` for reproducible installs).
- Upgrading **npm** to 11.x requires Node ^20.17 or ≥22.9; on Node 20.12 you can use `npm install -g npm@10.9.0` if you want a newer 10.x npm.

### pip install fails: "No such file or directory: ... scipy-1.11.2.dist-info\\METADATA"
The venv has a **broken scipy** install (metadata missing). Remove it and reinstall.

**Option A (script):** From **LENR_SIM_APP_v2\\backend** with venv activated:
```bat
python remove_broken_scipy.py
pip install -r requirements.txt
```
Or run once from repo root: **LENR_SIM_APP_v2\\backend\\fix_scipy_venv.bat**

**Option B (manual PowerShell):** From `LENR_SIM_APP_v2\backend`:
```powershell
Remove-Item -Recurse -Force "venv\Lib\site-packages\scipy-1.11.2.dist-info" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "venv\Lib\site-packages\scipy" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "venv\lib\site-packages\scipy-1.11.2.dist-info" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "venv\lib\site-packages\scipy" -ErrorAction SilentlyContinue
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### Other Issues
Check the logs in:
- `backend/logs/`
- Browser console for frontend errors 