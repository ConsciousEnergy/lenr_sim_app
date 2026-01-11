@echo off
echo ========================================
echo Fixing NPM Dependencies
echo ========================================
echo.

REM Delete existing node_modules and package-lock
echo Cleaning old dependencies...
if exist "node_modules" (
    rmdir /s /q node_modules
    echo - Removed node_modules
)
if exist "package-lock.json" (
    del package-lock.json
    echo - Removed package-lock.json
)

REM Clear npm cache
echo.
echo Clearing npm cache...
call npm cache clean --force

REM Install dependencies with legacy peer deps flag
echo.
echo Installing dependencies...
call npm install --legacy-peer-deps

echo.
echo ========================================
echo Dependencies fixed!
echo ========================================
echo.
echo You can now run 'npm start' to start the application.
echo.
pause
