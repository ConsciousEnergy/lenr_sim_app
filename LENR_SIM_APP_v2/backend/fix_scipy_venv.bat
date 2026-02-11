@echo off
REM Fix broken scipy (missing METADATA/RECORD) so pip can install packages.
REM Run from repo root: LENR_SIM_APP_v2\backend\fix_scipy_venv.bat
REM Or from LENR_SIM_APP_v2\backend with venv already activated.
cd /d "%~dp0"
if not exist venv\Scripts\activate.bat (
    echo Virtual environment not found. Create it first: python -m venv venv
    exit /b 1
)
call venv\Scripts\activate

echo Removing broken scipy metadata and package folders...
python remove_broken_scipy.py
if %ERRORLEVEL% NEQ 0 exit /b 1

echo.
echo Installing dependencies...
pip install -r requirements.txt

echo.
echo Done. Start the app with start_app.bat from the repo root.
