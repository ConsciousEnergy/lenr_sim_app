@echo off
ECHO Starting LENR Simulation Application...

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
cd LENR_SIM_APP_v2\backend

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

:: Start backend server in a new window
ECHO Starting backend server on port 8000...
START cmd /c "call venv\Scripts\activate && python -m uvicorn app.main:app --reload --port 8000"

:: Return to root directory
cd ..\..

:: Setup and start frontend
ECHO Setting up frontend...
cd LENR_SIM_APP_v2\frontend

:: Install from package-lock.json when node_modules is missing. After a git pull that
:: updates the lockfile, delete node_modules once so the next start picks up security fixes.
:: The funding / vulnerability summary is printed by npm, not by Vite.
IF NOT EXIST node_modules (
    ECHO Installing frontend dependencies from package-lock.json...
    npm ci --legacy-peer-deps
    IF %ERRORLEVEL% NEQ 0 (
        ECHO npm ci failed. Falling back to npm install --legacy-peer-deps...
        npm install --legacy-peer-deps
    )
    ECHO.
    ECHO Expected on development tip: 2 moderate (react-router), 0 high.
    ECHO If you still see high vulnerabilities: git pull origin development,
    ECHO then delete LENR_SIM_APP_v2\frontend\node_modules and re-run.
    ECHO.
) ELSE (
    ECHO Frontend node_modules already present — skipping npm ci.
    ECHO After pulling lockfile security fixes, delete node_modules once and re-run.
)

:: Start frontend server
ECHO Starting frontend server...
START cmd /c "npm start"

:: Return to root directory
cd ..\..

ECHO.
ECHO LENR Simulation Application is starting...
ECHO Backend API: http://localhost:8000
ECHO Frontend: http://localhost:3000
ECHO.
ECHO Press Ctrl+C in the respective terminal windows to stop the servers. 