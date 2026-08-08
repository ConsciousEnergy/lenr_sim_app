@echo off
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

REM Start Frontend (Vite honors both REACT_APP_API_URL and VITE_API_URL).
REM npm ci installs exactly from package-lock.json (wipes node_modules first).
REM The "packages looking for funding" / "vulnerabilities" lines are from npm, not Vite.
echo Starting Frontend Development Server...
start cmd /k "cd frontend && set REACT_APP_API_URL=http://localhost:8010 && set VITE_API_URL=http://localhost:8010 && npm ci --legacy-peer-deps && echo. && echo Expected on development tip: 2 moderate (react-router), 0 high. && echo If you still see high vulnerabilities: git pull origin development, then re-run. && echo. && npm start"

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