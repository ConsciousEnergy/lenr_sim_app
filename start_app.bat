@echo off
setlocal EnableDelayedExpansion
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

:: Sync node_modules to package-lock.json via SHA256 stamp (node_modules\.lockfile-hash).
:: Missing node_modules, missing stamp, or hash mismatch triggers npm ci.
SET NEED_NPM_CI=0
IF NOT EXIST node_modules SET NEED_NPM_CI=1
IF NOT EXIST node_modules\.lockfile-hash SET NEED_NPM_CI=1

IF !NEED_NPM_CI!==0 (
    SET LOCK_HASH=
    FOR /F "skip=1 delims=" %%H IN ('certutil -hashfile package-lock.json SHA256') DO (
        IF NOT DEFINED LOCK_HASH SET "LOCK_HASH=%%H"
    )
    SET /P STORED_HASH=<node_modules\.lockfile-hash
    IF /I NOT "!LOCK_HASH!"=="!STORED_HASH!" SET NEED_NPM_CI=1
)

IF !NEED_NPM_CI!==1 (
    ECHO Lockfile changed or node_modules missing — running npm ci --legacy-peer-deps...
    npm ci --legacy-peer-deps
    IF !ERRORLEVEL! NEQ 0 (
        ECHO npm ci failed. Falling back to npm install --legacy-peer-deps...
        npm install --legacy-peer-deps
    )
    SET LOCK_HASH=
    FOR /F "skip=1 delims=" %%H IN ('certutil -hashfile package-lock.json SHA256') DO (
        IF NOT DEFINED LOCK_HASH SET "LOCK_HASH=%%H"
    )
    ECHO !LOCK_HASH!>node_modules\.lockfile-hash
) ELSE (
    ECHO Frontend node_modules matches package-lock.json — skipping npm ci.
)

ECHO.
ECHO Expected audit: 2 moderate (react-router), 0 high.
ECHO Funding / vulnerability summary lines are npm noise, not a Vite failure.
ECHO.

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
endlocal
