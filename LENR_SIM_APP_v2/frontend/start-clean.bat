@echo off
REM Start the LENR Simulation App with suppressed warnings

echo ========================================
echo Starting LENR Simulation App (Clean Mode)
echo ========================================
echo.
echo This script suppresses non-critical warnings:
echo - Source map warnings from third-party libraries
echo.
echo Note: NPM vulnerabilities and webpack deprecation
echo warnings cannot be suppressed without breaking changes.
echo See WARNINGS_EXPLAINED.md for details.
echo.
echo ========================================
echo.

REM Set environment variable to suppress source map warnings
set GENERATE_SOURCEMAP=false

REM Start the development server
npm start

pause

