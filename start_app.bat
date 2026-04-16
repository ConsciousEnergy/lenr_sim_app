@echo off
REM LENR Simulation App v2 — local dev launcher (aligned with v0.3.6-beta API config)
REM Backend and frontend both use port 8010 to match frontend/package.json "proxy" and
REM frontend/src/setupProxy.js (REACT_APP_BACKEND_PROXY_TARGET).
REM Pull latest git changes if you do not see UI/API updates.

ECHO Starting LENR Simulation Application (v2)...

:: Check if Python is installed
python --version >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    ECHO Python is not installed or not in PATH. Please install Python 3.8+.
    EXIT /B 1
)

:: Check if Node.js is installed
node --version >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    ECHO Node.js is not installed or not in PATH. Please install Node.js 14+.
    EXIT /B 1
)

:: Ensure necessary directories exist
IF NOT EXIST LENR_SIM_APP_v2\backend\data mkdir LENR_SIM_APP_v2\backend\data
IF NOT EXIST LENR_SIM_APP_v2\backend\static mkdir LENR_SIM_APP_v2\backend\static
IF NOT EXIST LENR_SIM_APP_v2\backend\logs mkdir LENR_SIM_APP_v2\backend\logs

:: Setup and start backend
ECHO Setting up backend...
cd /d "%~dp0LENR_SIM_APP_v2\backend"

:: Check for virtual environment
IF NOT EXIST venv (
    ECHO Creating virtual environment...
    python -m venv venv
)

:: Activate virtual environment and install dependencies
ECHO Activating virtual environment...
call venv\Scripts\activate

ECHO Installing backend dependencies...
pip install -r requirements.txt
IF %ERRORLEVEL% NEQ 0 (
    ECHO pip install failed. Trying scipy fix for broken "no RECORD file" install...
    python remove_broken_scipy.py
    pip install -r requirements.txt
)
IF %ERRORLEVEL% NEQ 0 (
    ECHO Still failing. Run manually: LENR_SIM_APP_v2\backend\fix_scipy_venv.bat
)

:: Start backend on 8010 (must match frontend proxy — see LENR_SIM_APP_v2/frontend/package.json)
ECHO Starting backend server on port 8010...
start "LENR Backend" cmd /k "cd /d %~dp0LENR_SIM_APP_v2\backend && call venv\Scripts\activate && python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8010"

:: Return to repo root
cd /d "%~dp0"

:: Setup and start frontend
ECHO Setting up frontend...
cd /d "%~dp0LENR_SIM_APP_v2\frontend"

:: Install frontend dependencies if needed
IF NOT EXIST node_modules (
    ECHO Installing frontend dependencies...
    npm install
)

:: Proxy target must match backend port; leave REACT_APP_API_URL unset so dev uses CRA proxy (see src/config/api.js)
ECHO Starting frontend (proxy to http://localhost:8010)...
start "LENR Frontend" cmd /k "cd /d %~dp0LENR_SIM_APP_v2\frontend && set REACT_APP_BACKEND_PROXY_TARGET=http://localhost:8010 && npm start"

cd /d "%~dp0"

ECHO.
ECHO LENR Simulation Application is starting...
ECHO Backend API: http://localhost:8010
ECHO API docs:     http://localhost:8010/api/docs
ECHO Frontend:     http://localhost:3000
ECHO Unified Theory (latest UI): http://localhost:3000/unified-theory
ECHO.
ECHO If the UI looks unchanged: git pull your branch, restart both windows, hard-refresh the browser (Ctrl+F5).
ECHO Remove stale frontend/.env.local REACT_APP_API_URL if the wrong port is used.
ECHO.
ECHO Press Ctrl+C in the Backend/Frontend windows to stop the servers.
