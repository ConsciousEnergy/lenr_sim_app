@echo off
ECHO Stopping LENR Simulation Application...

:: Kill any running uvicorn processes (backend server)
ECHO Stopping backend server...
taskkill /F /IM uvicorn.exe >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq *uvicorn*" >nul 2>&1

:: Kill any running node processes related to the React app (frontend server)
ECHO Stopping frontend server...
taskkill /F /FI "WINDOWTITLE eq *react-scripts*" >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq *npm start*" >nul 2>&1

ECHO.
ECHO All LENR Simulation Application processes have been stopped.
ECHO. 