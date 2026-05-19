@echo off
REM LENR_SIM_APP_v2 local dev — backend 8010 + CRA proxy (v0.3.6-beta aligned)
REM Run this from the LENR_SIM_APP_v2 folder, or use repo root start_app.bat
REM Pull latest git if you do not see updates.

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

REM Backend on 8010 — matches frontend/package.json "proxy" and setupProxy.js
echo Starting Backend Server on port 8010...
start "LENR Backend" cmd /k "cd /d %~dp0backend && call venv\Scripts\activate && pip install -r requirements.txt && uvicorn app.main:app --reload --host 0.0.0.0 --port 8010"

REM Wait a moment for backend to start
timeout /t 5 /nobreak > nul

REM Frontend: set proxy target explicitly; do not set REACT_APP_API_URL so /api uses CRA proxy (src/config/api.js)
echo Starting Frontend Development Server...
start "LENR Frontend" cmd /k "cd /d %~dp0frontend && set REACT_APP_BACKEND_PROXY_TARGET=http://localhost:8010 && npm install --legacy-peer-deps && npm start"

echo.
echo ========================================
echo Application is starting...
echo ========================================
echo.
echo Backend:  http://localhost:8010
echo API docs: http://localhost:8010/api/docs
echo Frontend: http://localhost:3000
echo Unified Theory (latest): http://localhost:3000/unified-theory
echo.
echo If nothing looks new: git pull, restart both windows, hard-refresh browser (Ctrl+F5).
echo Stale frontend/.env.local can override ports — delete or fix REACT_APP_API_URL.
echo.
echo Test Pages:
echo - Visualization Test: http://localhost:3000/visualization-test
echo - Simulation Dashboard: http://localhost:3000/dashboard
echo.
echo Press any key to exit this window (servers will keep running)...
pause > nul
