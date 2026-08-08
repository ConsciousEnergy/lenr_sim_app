@echo off
setlocal EnableDelayedExpansion
cd /d "%~dp0"

ECHO Starting LENR Simulation Application...
ECHO.
ECHO Tip: prefer LENR_SIM_APP_v2\start_app.bat (backend :8010 + frontend sync).
ECHO This root launcher uses backend :8000.
ECHO.

where python >nul 2>&1
IF ERRORLEVEL 1 (
    ECHO ERROR: Python is not installed or not in PATH. Please install Python 3.8+.
    pause
    EXIT /B 1
)

where node >nul 2>&1
IF ERRORLEVEL 1 (
    ECHO ERROR: Node.js is not installed or not in PATH. Please install Node.js 18+.
    pause
    EXIT /B 1
)

IF NOT EXIST LENR_SIM_APP_v2\backend\data mkdir LENR_SIM_APP_v2\backend\data
IF NOT EXIST LENR_SIM_APP_v2\backend\static mkdir LENR_SIM_APP_v2\backend\static
IF NOT EXIST LENR_SIM_APP_v2\backend\logs mkdir LENR_SIM_APP_v2\backend\logs

ECHO Setting up backend...
pushd LENR_SIM_APP_v2\backend

IF NOT EXIST venv\Scripts\activate.bat (
    ECHO Creating virtual environment...
    python -m venv venv
)

ECHO Starting Backend Server window on port 8000...
start "LENR Backend" cmd /k "cd /d "%~dp0LENR_SIM_APP_v2\backend" && call venv\Scripts\activate.bat && pip install -r requirements.txt && python -m uvicorn app.main:app --reload --port 8000"
popd

ECHO Waiting 5 seconds for backend bind...
timeout /t 5 /nobreak > nul

ECHO Starting Frontend Server window...
REM Reuse the v2 frontend launcher; override API URL to port 8000 for this root script.
start "LENR Frontend" cmd /k "cd /d "%~dp0LENR_SIM_APP_v2\frontend" && set REACT_APP_API_URL=http://localhost:8000&& set VITE_API_URL=http://localhost:8000&& call start_dev.bat"

ECHO.
ECHO LENR Simulation Application is starting...
ECHO Backend API: http://localhost:8000
ECHO Frontend:    http://localhost:3000
ECHO.
ECHO Watch the "LENR Frontend" window for npm/Vite errors.
ECHO Press any key to close this launcher (servers keep running)...
pause > nul
endlocal
