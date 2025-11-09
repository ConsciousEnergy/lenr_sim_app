@echo off
echo ========================================
echo   STARTING BACKEND IN SAFE MODE
echo ========================================
echo.

REM Activate virtual environment if it exists
if exist "venv\Scripts\activate.bat" (
    echo Activating virtual environment...
    call venv\Scripts\activate.bat
) else if exist ".venv\Scripts\activate.bat" (
    echo Activating virtual environment...
    call .venv\Scripts\activate.bat
) else (
    echo Warning: No virtual environment found
)

echo.
echo Starting backend without file watching (safe mode)...
echo This prevents memory issues from file watcher
echo.

REM Start uvicorn without reload to prevent memory issues
REM Using --no-reload flag to disable file watching
python -m uvicorn main:app --host 127.0.0.1 --port 8001 --no-use-colors

echo.
echo Backend stopped.
pause
