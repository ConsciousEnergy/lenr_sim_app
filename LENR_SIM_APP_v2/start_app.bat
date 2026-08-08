@echo off
setlocal EnableDelayedExpansion
echo ========================================
echo Starting LENR Simulation App v2
echo ========================================
echo.

REM Check if backend virtual environment exists
if not exist "backend\venv" (
    echo Creating backend virtual environment...
    cd backend
    python -m venv venv
    cd ..
)

REM Start Backend on dedicated dev port (8010) to avoid port 8000 conflicts
echo Starting Backend Server...
start cmd /k "cd backend && venv\Scripts\activate && pip install -r requirements.txt && uvicorn app.main:app --reload --host 0.0.0.0 --port 8010"

REM Wait a moment for backend to start
timeout /t 5 /nobreak > nul

REM Sync frontend node_modules to package-lock.json via SHA256 stamp before npm start.
REM Missing node_modules, missing stamp, or hash mismatch triggers npm ci.
echo Syncing frontend dependencies...
cd frontend

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

REM Start Frontend (Vite honors both REACT_APP_API_URL and VITE_API_URL).
echo Starting Frontend Development Server...
start cmd /k "set REACT_APP_API_URL=http://localhost:8010 && set VITE_API_URL=http://localhost:8010 && npm start"
cd ..

echo.
echo ========================================
echo Application is starting...
echo ========================================
echo.
echo Backend will run on: http://localhost:8010
echo Frontend will run on: http://localhost:3000
echo.
echo API Documentation: http://localhost:8010/api/docs
echo.
echo Test Pages:
echo - Visualization Test: http://localhost:3000/visualization-test
echo - Simulation Dashboard: http://localhost:3000/dashboard
echo.
echo Press any key to exit this window (servers will keep running)...
pause > nul
endlocal
