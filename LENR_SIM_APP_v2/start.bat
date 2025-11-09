@echo off
title LENR_SIM_APP Starter

REM New ASCII Title
echo "/====================================================================================================\"
echo "|| ___       _______   ________   ________  ________  ___  _____ ______   ___      ___  _______     ||"
echo "|||\  \     |\  ___ \ |\   ___  \|\   __  \|\   ____\|\  \|\   _ \  _   \|\  \    /  /|/  ___  \    ||"
echo "||\ \  \    \ \   __/|\ \  \\ \  \ \  \|\  \ \  \___|\ \  \ \  \\\__\ \  \ \  \  /  / /__/|_/  /|   ||"
echo "|| \ \  \    \ \  \_|/_\ \  \\ \  \ \   _  _\ \_____  \ \  \ \  \\|__| \  \ \  \/  / /|__|//  / /   ||"
echo "||  \ \  \____\ \  \_|\ \ \  \\ \  \ \  \\  \\|____|\  \ \  \ \  \    \ \  \ \    / /     /  /_/__  ||"
echo "||   \ \_______\ \_______\ \__\\ \__\ \__\\ _\ ____\_\  \ \__\ \__\    \ \__\ \__/ /     |\________\||"
echo "||    \|_______|\|_______|\|__| \|__|\|__|\|__|\_________\|__|\|__|     \|__|\|__|/       \|_______|||"
echo "||                                            \|_________|                                          ||"
echo "\====================================================================================================/"
echo.
echo Low-Energy Nuclear Reaction Simulation - v2.0
echo [*] Initiating Poisson-Schrodinger Solver...
echo (+) Loading quantum tunneling kernel...
echo (o) Calibrating lattice coherence models...
echo.
echo Starting Servers...
echo.

REM Start Backend (FastAPI/Uvicorn)
echo Starting Backend Server...
cd backend
start "Backend" cmd /k "call .\venv\Scripts\activate.bat && uvicorn app.main:app --reload --port 8000"
cd ..

REM Start Frontend (React/Vite)
echo Starting Frontend Server...
cd frontend
start "Frontend" cmd /k "npm run dev"
cd ..

echo.
echo Both servers are starting in separate windows.
echo Backend: http://localhost:8000
echo Frontend: http://localhost:5173 (or check terminal output)
echo. 