@echo off
ECHO ========================================
ECHO   LENR Simulation Application Starter
ECHO ========================================
ECHO.

:: Check if Python is installed
python --version >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    ECHO ERROR: Python is not installed or not in PATH. Please install Python 3.8+.
    PAUSE
    EXIT /B 1
)

:: Check if Node.js is installed
node --version >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    ECHO ERROR: Node.js is not installed or not in PATH. Please install Node.js 14+.
    PAUSE
    EXIT /B 1
)

:: Ensure necessary directories exist
ECHO Creating necessary directories...
IF NOT EXIST backend\data mkdir backend\data
IF NOT EXIST backend\static mkdir backend\static
IF NOT EXIST backend\logs mkdir backend\logs

:: Setup and start backend
ECHO.
ECHO [1/4] Setting up backend...
cd backend

:: Check for virtual environment
IF NOT EXIST venv (
    ECHO Creating virtual environment...
    python -m venv venv
)

:: Activate virtual environment and install dependencies
ECHO Installing/updating backend dependencies...
call venv\Scripts\activate
pip install -q -r requirements.txt

:: Start backend server in a new window
ECHO [2/4] Starting backend server on port 8001...
START "LENR Backend" cmd /c "cd /d %CD% && call venv\Scripts\activate && python -m uvicorn app.main:app --reload --port 8001 && pause"

:: Return to root directory
cd ..

:: Setup and start frontend
ECHO.
ECHO [3/4] Setting up frontend...
cd frontend

:: Check if node_modules exists
IF NOT EXIST node_modules (
    ECHO Installing frontend dependencies (this may take a few minutes)...
    CALL npm install --legacy-peer-deps
) ELSE (
    ECHO Frontend dependencies already installed.
)

:: Ensure ajv is correctly installed (fixes common startup issue)
ECHO Checking frontend dependencies...
CALL npm list ajv >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    ECHO Fixing dependency issues...
    CALL npm install ajv@^8.0.0 --save-dev --legacy-peer-deps
)

:: Start frontend server
ECHO [4/4] Starting frontend server on port 3000...
START "LENR Frontend" cmd /c "cd /d %CD% && set BROWSER=none && npm start && pause"

:: Return to root directory
cd ..

ECHO.
ECHO ========================================
ECHO   LENR Simulation Application Started!
ECHO ========================================
ECHO.
ECHO Backend API:  http://localhost:8001
ECHO Frontend UI:  http://localhost:3000
ECHO.
ECHO Both servers are starting in separate windows.
ECHO Wait 30-60 seconds for compilation to complete.
ECHO.
ECHO Then open http://localhost:3000 in your browser.
ECHO.
ECHO Press any key to open the frontend in your browser...
PAUSE >nul

:: Open browser
START http://localhost:3000

ECHO.
ECHO To stop the servers, close the respective terminal windows.
ECHO.

