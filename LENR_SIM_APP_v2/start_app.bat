@echo off
setlocal EnableDelayedExpansion
cd /d "%~dp0"

echo ========================================
echo Starting LENR Simulation App v2
echo ========================================
echo.
echo This launcher opens TWO windows:
echo   1. LENR Backend  - uvicorn on port 8010
echo   2. LENR Frontend - npm sync + Vite on port 3000
echo Watch the Frontend window for install/start errors.
echo.

where python >nul 2>&1
IF ERRORLEVEL 1 (
    echo ERROR: Python is not on PATH.
    pause
    exit /b 1
)

where node >nul 2>&1
IF ERRORLEVEL 1 (
    echo ERROR: Node.js is not on PATH.
    pause
    exit /b 1
)

if not exist "backend\venv\Scripts\activate.bat" (
    echo Creating backend virtual environment...
    pushd backend
    python -m venv venv
    popd
)

echo Starting Backend Server window...
REM Numeric-stack check/repair runs before uvicorn so a broken Windows NumPy
REM (ndarray.__repr__ / complexfloating) cannot 500 bubble-lattice mid-run.
start "LENR Backend" cmd /k "cd /d "%~dp0backend" && call venv\Scripts\activate.bat && call fix_scipy_venv.bat && uvicorn app.main:app --reload --host 0.0.0.0 --port 8010"

echo Waiting 15 seconds for backend bind (numeric-stack check/repair may take a bit)...
timeout /t 15 /nobreak > nul

echo Starting Frontend Server window...
start "LENR Frontend" cmd /k "cd /d "%~dp0frontend" && call start_dev.bat"

echo.
echo ========================================
echo Application is starting...
echo ========================================
echo.
echo Backend:  http://localhost:8010
echo Frontend: http://localhost:3000
echo API docs: http://localhost:8010/api/docs
echo.
echo If the Frontend window shows an npm error, leave Backend running,
echo free some RAM, then re-run start_dev.bat in LENR_SIM_APP_v2\frontend.
echo.
echo Press any key to close this launcher (servers keep running)...
pause > nul
endlocal
