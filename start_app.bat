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

:: Start backend server in a new window
ECHO Starting backend server on port 8000...
START cmd /c "call venv\Scripts\activate && python -m uvicorn app.main:app --reload --port 8000"

:: Return to root directory
cd ..\..

:: Setup and start frontend
ECHO Setting up frontend...
cd LENR_SIM_APP_v2\frontend

:: Install frontend dependencies if needed
IF NOT EXIST node_modules (
    ECHO Installing frontend dependencies...
    npm install
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