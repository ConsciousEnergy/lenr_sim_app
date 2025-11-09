@echo off
REM LENR Simulation App Startup Script for Windows Command Prompt
REM This script starts both the backend and frontend development servers

REM Create a timestamp for log files
set TIMESTAMP=%DATE:~10,4%%DATE:~4,2%%DATE:~7,2%_%TIME:~0,2%%TIME:~3,2%%TIME:~6,2%
set TIMESTAMP=%TIMESTAMP: =0%
set STARTUP_LOG=startup_%TIMESTAMP%.log

REM Start logging
echo =============== STARTUP LOG %TIMESTAMP% =============== > %STARTUP_LOG%
echo Startup script initiated at %DATE% %TIME% >> %STARTUP_LOG%

REM Function to display a banner
echo ========================================================
echo    _     _____ _   _ ____     ____  _                  
echo   ^| ^|   ^| ____^| \ ^| ^|  _ \   / ___^|(_)_ __ ___         
echo   ^| ^|   ^|  _^| ^|  \^| ^| ^|_) ^|  \___ \^| ^| '_ \` _ \      
echo   ^| ^|___^| ^|___^| ^|\  ^|  _ ^<    ___) ^| ^| ^| ^| ^| ^| ^|       
echo   ^|_____^|_____^|_^| \_^|_^| \_\  ^|____/^|_^|_^| ^|_^| ^|_^|       
echo                                                        
echo ========================================================
echo.

echo [*] LENR Simulation App Startup
echo [*] Starting development environment...
echo [*] Logging startup details to %STARTUP_LOG%
echo.

REM Log system info
echo System Information: >> %STARTUP_LOG%
systeminfo | findstr /B /C:"OS Name" /C:"OS Version" >> %STARTUP_LOG%
echo. >> %STARTUP_LOG%

REM Set environment variables
set VENV_DIR=backend-env
set BACKEND_PORT=8000
set FRONTEND_PORT=3000

REM Check if ports are already in use
echo [*] Checking if ports are already in use...
echo Checking ports: >> %STARTUP_LOG%
netstat -ano | findstr ":%BACKEND_PORT%" >> %STARTUP_LOG% 2>&1
netstat -ano | findstr ":%FRONTEND_PORT%" >> %STARTUP_LOG% 2>&1

REM Kill any processes using the ports
echo [*] Ensuring ports are free...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%BACKEND_PORT%"') do (
    echo Terminating process on port %BACKEND_PORT%: %%a >> %STARTUP_LOG%
    taskkill /F /PID %%a >> %STARTUP_LOG% 2>&1
)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%FRONTEND_PORT%"') do (
    echo Terminating process on port %FRONTEND_PORT%: %%a >> %STARTUP_LOG%
    taskkill /F /PID %%a >> %STARTUP_LOG% 2>&1
)

REM Start the backend server
echo [+] Starting backend server...
echo Backend startup: >> %STARTUP_LOG%

REM Check for virtual environment
if exist "%VENV_DIR%" (
    echo [*] Using existing virtual environment: %VENV_DIR%
    echo Using existing environment: %VENV_DIR% >> %STARTUP_LOG%
) else (
    echo [!] No virtual environment found.
    echo [*] Creating new virtual environment '%VENV_DIR%'...
    echo Creating new virtual environment >> %STARTUP_LOG%
    python -m venv %VENV_DIR% >> %STARTUP_LOG% 2>&1
    if %ERRORLEVEL% NEQ 0 (
        echo [!] Failed to create virtual environment. Please make sure Python is installed.
        echo Failed to create virtual environment. Error code: %ERRORLEVEL% >> %STARTUP_LOG%
        goto error
    )
)

REM Activate virtual environment
echo Activating virtual environment >> %STARTUP_LOG%
call %VENV_DIR%\Scripts\activate.bat
if %ERRORLEVEL% NEQ 0 (
    echo [!] Failed to activate virtual environment.
    echo Failed to activate virtual environment. Error code: %ERRORLEVEL% >> %STARTUP_LOG%
    goto error
)

REM Log Python version
python --version >> %STARTUP_LOG% 2>&1
echo Python path: >> %STARTUP_LOG%
where python >> %STARTUP_LOG% 2>&1

REM Ensure pip is up to date
echo [*] Ensuring pip is up to date...
echo Upgrading pip >> %STARTUP_LOG%
%VENV_DIR%\Scripts\python -m pip install --upgrade pip >> %STARTUP_LOG% 2>&1

REM Install core dependencies first
echo Installing core dependencies first >> %STARTUP_LOG%
echo [*] Installing core dependencies...
echo Uninstalling pydantic and uvicorn to ensure clean installation >> %STARTUP_LOG%
%VENV_DIR%\Scripts\pip uninstall -y pydantic uvicorn >> %STARTUP_LOG% 2>&1

echo Installing uvicorn, FastAPI and required packages >> %STARTUP_LOG%
%VENV_DIR%\Scripts\pip install uvicorn==0.15.0 fastapi==0.68.2 aiofiles==0.8.0 starlette==0.14.2 >> %STARTUP_LOG% 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [!] Failed to install core dependencies.
    echo Failed to install core dependencies. Error code: %ERRORLEVEL% >> %STARTUP_LOG%
    goto error
)

echo Installing scientific packages >> %STARTUP_LOG%
%VENV_DIR%\Scripts\pip install numpy scipy pandas matplotlib >> %STARTUP_LOG% 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [!] Failed to install scientific packages.
    echo Failed to install scientific packages. Error code: %ERRORLEVEL% >> %STARTUP_LOG%
    goto error
)

echo Installing additional required packages >> %STARTUP_LOG%
%VENV_DIR%\Scripts\pip install python-multipart aiohttp pyyaml psutil >> %STARTUP_LOG% 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [!] Failed to install additional required packages.
    echo Failed to install additional required packages. Error code: %ERRORLEVEL% >> %STARTUP_LOG%
    goto error
)

echo Installing pydantic v2 >> %STARTUP_LOG%
%VENV_DIR%\Scripts\pip install pydantic>=2.0.0 >> %STARTUP_LOG% 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [!] Failed to install pydantic.
    echo Failed to install pydantic. Error code: %ERRORLEVEL% >> %STARTUP_LOG%
    goto error
)

REM Install requirements if needed
if exist "backend\requirements.txt" (
    echo [*] Installing backend requirements...
    echo Installing backend requirements >> %STARTUP_LOG%
    %VENV_DIR%\Scripts\pip install -r backend\requirements.txt >> %STARTUP_LOG% 2>&1
    if %ERRORLEVEL% NEQ 0 (
        echo [!] Failed to install requirements.
        echo Failed to install requirements. Error code: %ERRORLEVEL% >> %STARTUP_LOG%
        echo [!] Continuing anyway as critical packages were installed directly.
    )
)

REM List installed packages for debugging
echo Listing installed packages for verification >> %STARTUP_LOG%
%VENV_DIR%\Scripts\pip list | findstr "uvicorn fastapi numpy scipy pandas" >> %STARTUP_LOG% 2>&1

REM Start the backend server in a new window with output redirection
echo [*] Starting FastAPI server...
echo Starting FastAPI server >> %STARTUP_LOG%
echo cd backend ^&^& %VENV_DIR%\Scripts\uvicorn app.main:app --reload --host 127.0.0.1 --port %BACKEND_PORT% >> %STARTUP_LOG%
start "LENR Backend Server" cmd /c "cd backend && ..\%VENV_DIR%\Scripts\uvicorn app.main:app --reload --host 127.0.0.1 --port %BACKEND_PORT% > ..\backend_startup_%TIMESTAMP%.log 2>&1"
if %ERRORLEVEL% NEQ 0 (
    echo [!] Failed to start backend server.
    echo Failed to start backend server. Error code: %ERRORLEVEL% >> %STARTUP_LOG%
    goto error
)

REM Wait a moment for the server to start
echo [*] Waiting for backend server to initialize...
timeout /t 5 /nobreak > nul

REM Verify the server is running
echo Verifying backend server is running >> %STARTUP_LOG%
netstat -ano | findstr ":%BACKEND_PORT%" >> %STARTUP_LOG% 2>&1
for /f %%a in ('netstat -ano ^| findstr ":%BACKEND_PORT%" ^| find /c /v ""') do set BACKEND_RUNNING=%%a
if "%BACKEND_RUNNING%"=="0" (
    echo [!] Backend server may not be running properly. Continuing anyway...
    echo Backend server not detected on port %BACKEND_PORT%. >> %STARTUP_LOG%
) else (
    echo [√] Backend server running
    echo Backend server detected on port %BACKEND_PORT%. >> %STARTUP_LOG%
)

echo [√] API available at http://localhost:%BACKEND_PORT%
echo.

REM Start the frontend server
echo [+] Starting frontend server...
echo Frontend startup: >> %STARTUP_LOG%

REM Check if npm is installed
echo Checking for npm >> %STARTUP_LOG%
where npm >> %STARTUP_LOG% 2>&1
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [!] npm is not installed. Please install Node.js and npm.
    echo npm not found. Error code: %ERRORLEVEL% >> %STARTUP_LOG%
    goto error
)

REM Log npm and node versions
npm --version >> %STARTUP_LOG% 2>&1
node --version >> %STARTUP_LOG% 2>&1

REM Check if frontend directory exists
if not exist "frontend" (
    echo [!] Frontend directory not found.
    echo Frontend directory not found >> %STARTUP_LOG%
    goto error
)

REM Check if package.json exists
if not exist "frontend\package.json" (
    echo [!] Missing package.json in frontend directory.
    echo [!] Please run the script from the project root directory or ensure your frontend is set up correctly.
    echo Missing package.json in frontend directory >> %STARTUP_LOG%
    echo ERROR: package.json not found in frontend directory. Script run at %DATE% %TIME% > frontend_errors.log
    goto error
)

REM Install dependencies if needed
if not exist "frontend\node_modules" (
    echo [*] Installing frontend dependencies...
    echo Installing frontend dependencies >> %STARTUP_LOG%
    cd frontend
    npm install >> ..\%STARTUP_LOG% 2>&1
    if %ERRORLEVEL% NEQ 0 (
        echo [!] Error installing dependencies.
        echo Error installing dependencies. Error code: %ERRORLEVEL% >> ..\%STARTUP_LOG%
        cd ..
        goto error
    )
    cd ..
)

REM Start the frontend server in a new window with output redirection
echo [*] Starting React development server...
echo Starting React development server >> %STARTUP_LOG%
echo cd frontend ^&^& npm start >> %STARTUP_LOG%
start "LENR Frontend Server" cmd /c "cd frontend && npm start > ..\frontend_startup_%TIMESTAMP%.log 2>&1"
if %ERRORLEVEL% NEQ 0 (
    echo [!] Failed to start frontend server.
    echo Failed to start frontend server. Error code: %ERRORLEVEL% >> %STARTUP_LOG%
    goto error
)

REM Wait a moment for the server to start
echo [*] Waiting for frontend server to initialize...
timeout /t 5 /nobreak > nul

REM Verify the server is running
echo Verifying frontend server is running >> %STARTUP_LOG%
netstat -ano | findstr ":%FRONTEND_PORT%" >> %STARTUP_LOG% 2>&1
for /f %%a in ('netstat -ano ^| findstr ":%FRONTEND_PORT%" ^| find /c /v ""') do set FRONTEND_RUNNING=%%a
if "%FRONTEND_RUNNING%"=="0" (
    echo [!] Frontend server may not be running properly. Continuing anyway...
    echo Frontend server not detected on port %FRONTEND_PORT%. >> %STARTUP_LOG%
) else (
    echo [√] Frontend server running
    echo Frontend server detected on port %FRONTEND_PORT%. >> %STARTUP_LOG%
)

echo [√] UI available at http://localhost:%FRONTEND_PORT%
echo.

REM Display success message
echo [*] Both servers are now running.
echo [*] Open your browser and navigate to http://localhost:%FRONTEND_PORT%
echo [*] Press Ctrl+C in the server windows to stop them.
echo [*] You can also use stop_app.bat to shut down both servers.
echo.
echo [*] You can close this window after you're done using the application.
echo [*] Thank you for using LENR Simulation App!
echo Startup completed successfully at %DATE% %TIME% >> %STARTUP_LOG%
goto end

:error
echo.
echo [!] An error occurred during startup.
echo [!] Please check the error messages above and in %STARTUP_LOG%.
echo [!] Also check backend_startup_%TIMESTAMP%.log and frontend_startup_%TIMESTAMP%.log for server specific errors.
echo.
echo Error occurred during startup at %DATE% %TIME% >> %STARTUP_LOG%
pause
exit /b 1

:end
echo [*] Startup script completed.
echo [*] Server logs will be available in backend_startup_%TIMESTAMP%.log and frontend_startup_%TIMESTAMP%.log.
echo.
exit /b 0 