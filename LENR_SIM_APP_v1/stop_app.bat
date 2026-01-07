@echo off
REM LENR Simulation App Shutdown Script for Windows
REM This script stops all backend and frontend processes

REM Create a timestamp for log files
set TIMESTAMP=%DATE:~10,4%%DATE:~4,2%%DATE:~7,2%_%TIME:~0,2%%TIME:~3,2%%TIME:~6,2%
set TIMESTAMP=%TIMESTAMP: =0%
set SHUTDOWN_LOG=shutdown_%TIMESTAMP%.log

REM Start logging
echo =============== SHUTDOWN LOG %TIMESTAMP% =============== > %SHUTDOWN_LOG%
echo Shutdown script initiated at %DATE% %TIME% >> %SHUTDOWN_LOG%

echo ========================================================
echo    _     _____ _   _ ____     ____  _                  
echo   ^| ^|   ^| ____^| \ ^| ^|  _ \   / ___^|(_)_ __ ___         
echo   ^| ^|   ^|  _^| ^|  \^| ^| ^|_) ^|  \___ \^| ^| '_ \` _ \      
echo   ^| ^|___^| ^|___^| ^|\  ^|  _ ^<    ___) ^| ^| ^| ^| ^| ^| ^|       
echo   ^|_____^|_____^|_^| \_^|_^| \_\  ^|____/^|_^|_^| ^|_^| ^|_^|       
echo                                                        
echo ========================================================
echo.
echo [*] LENR Simulation App Shutdown
echo [*] Stopping all running processes...
echo [*] Logging shutdown details to %SHUTDOWN_LOG%
echo.

REM Identify which ports are in use
set BACKEND_PORT=8000
set FRONTEND_PORT=3000

echo [*] Checking for running services on ports %BACKEND_PORT% and %FRONTEND_PORT%...
echo Checking for running services: >> %SHUTDOWN_LOG%
netstat -ano | findstr ":%BACKEND_PORT%" >> %SHUTDOWN_LOG% 2>&1
netstat -ano | findstr ":%FRONTEND_PORT%" >> %SHUTDOWN_LOG% 2>&1

REM Stop backend server processes
echo [+] Stopping backend server processes...
echo Stopping backend processes: >> %SHUTDOWN_LOG%

REM Try different methods to capture all possible processes
echo Attempting to stop processes by window title... >> %SHUTDOWN_LOG%
taskkill /F /FI "WINDOWTITLE eq LENR Backend Server*" /T >> %SHUTDOWN_LOG% 2>&1

echo Attempting to stop Python processes serving uvicorn... >> %SHUTDOWN_LOG%
taskkill /F /FI "IMAGENAME eq python.exe" /FI "WINDOWTITLE eq *uvicorn*" /T >> %SHUTDOWN_LOG% 2>&1

echo Attempting to stop Python processes with uvicorn command line... >> %SHUTDOWN_LOG%
taskkill /F /FI "COMMANDLINE eq *uvicorn app.main:app*" /T >> %SHUTDOWN_LOG% 2>&1

REM Kill by port
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%BACKEND_PORT%"') do (
    echo Terminating process on port %BACKEND_PORT%: %%a >> %SHUTDOWN_LOG%
    taskkill /F /PID %%a >> %SHUTDOWN_LOG% 2>&1
)

echo [√] Backend server stopped.
echo.

REM Stop frontend server processes
echo [+] Stopping frontend server processes...
echo Stopping frontend processes: >> %SHUTDOWN_LOG%

REM Try different methods to capture all possible processes
echo Attempting to stop processes by window title... >> %SHUTDOWN_LOG%
taskkill /F /FI "WINDOWTITLE eq LENR Frontend Server*" /T >> %SHUTDOWN_LOG% 2>&1

echo Attempting to stop Node processes with npm start... >> %SHUTDOWN_LOG%
taskkill /F /FI "IMAGENAME eq node.exe" /FI "WINDOWTITLE eq *npm start*" /T >> %SHUTDOWN_LOG% 2>&1

echo Attempting to stop Node processes with react-scripts command line... >> %SHUTDOWN_LOG%
taskkill /F /FI "COMMANDLINE eq *react-scripts start*" /T >> %SHUTDOWN_LOG% 2>&1

REM Kill by port
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%FRONTEND_PORT%"') do (
    echo Terminating process on port %FRONTEND_PORT%: %%a >> %SHUTDOWN_LOG%
    taskkill /F /PID %%a >> %SHUTDOWN_LOG% 2>&1
)

echo [√] Frontend server stopped.
echo.

REM Verify ports are freed
echo [*] Verifying all processes are terminated...
echo Verifying ports are free: >> %SHUTDOWN_LOG%
netstat -ano | findstr ":%BACKEND_PORT%" >> %SHUTDOWN_LOG% 2>&1
netstat -ano | findstr ":%FRONTEND_PORT%" >> %SHUTDOWN_LOG% 2>&1

REM Additional cleanup for npm processes that might be lingering
echo [*] Checking for any lingering npm or node processes...
echo Looking for lingering processes: >> %SHUTDOWN_LOG%
tasklist /FI "IMAGENAME eq node.exe" >> %SHUTDOWN_LOG% 2>&1
tasklist /FI "IMAGENAME eq npm.cmd" >> %SHUTDOWN_LOG% 2>&1

echo [*] All LENR Simulation App processes have been stopped.
echo [*] Thank you for using LENR Simulation App!
echo Shutdown completed successfully at %DATE% %TIME% >> %SHUTDOWN_LOG%
echo.
pause 