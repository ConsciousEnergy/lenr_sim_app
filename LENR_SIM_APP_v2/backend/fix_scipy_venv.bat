@echo off
REM Repair broken NumPy/SciPy (hybrid installs, missing METADATA/RECORD).
REM Run from LENR_SIM_APP_v2\backend or via start_app.bat auto-repair.
cd /d "%~dp0"
if not exist venv\Scripts\activate.bat (
    echo Virtual environment not found. Create it first: python -m venv venv
    exit /b 1
)
call venv\Scripts\activate.bat

echo Checking numeric stack...
python check_numeric_stack.py
if %ERRORLEVEL% EQU 0 (
    echo Numeric stack already healthy.
    goto :install_rest
)

echo.
echo Removing broken numpy/scipy packages...
python repair_numeric_stack.py
if %ERRORLEVEL% NEQ 0 exit /b 1

echo.
echo Force-reinstalling pinned numpy + scipy...
pip install --force-reinstall --no-cache-dir numpy==1.26.4 scipy==1.14.1
if %ERRORLEVEL% NEQ 0 exit /b 1

python check_numeric_stack.py
if %ERRORLEVEL% NEQ 0 (
    echo Repair failed. Delete backend\venv and recreate it:
    echo   rmdir /s /q venv
    echo   python -m venv venv
    echo   call venv\Scripts\activate.bat
    echo   pip install -r requirements.txt
    exit /b 1
)

:install_rest
echo.
echo Installing remaining dependencies...
pip install -r requirements.txt
if %ERRORLEVEL% NEQ 0 exit /b 1

echo.
echo Done. Start the app with start_app.bat from the repo root.
exit /b 0
