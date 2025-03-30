#!/bin/bash
# LENR Simulation App Startup Script
# This script starts both the backend and frontend development servers

# Function to check if a command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Function to display a colorful banner
show_banner() {
  echo -e "\033[1;35m"
  echo "========================================================"
  echo "   _     _____ _   _ ____     ____  _                  "
  echo "  | |   | ____| \ | |  _ \   / ___|(_)_ __ ___         "
  echo "  | |   |  _| |  \| | |_) |  \___ \| | '_ \` _ \      "
  echo "  | |___| |___| |\  |  _ <    ___) | | | | | | |       "
  echo "  |_____|_____|_| \_|_| \_\  |____/|_|_| |_| |_|       "
  echo "                                                        "
  echo "========================================================"
  echo -e "\033[0m"
}

# Function to start the backend server
start_backend() {
  echo -e "\033[1;34m[+] Starting backend server...\033[0m"
  
  # Check for virtual environment
  if [ -d "backend-env" ]; then
    VENV_DIR="backend-env"
  elif [ -d "venv" ]; then
    VENV_DIR="venv"
  elif [ -d "backend-venv" ]; then
    VENV_DIR="backend-venv"
  else
    echo -e "\033[1;31m[!] No virtual environment found.\033[0m"
    echo -e "\033[1;33m[*] Creating new virtual environment 'backend-env'...\033[0m"
    python -m venv backend-env
    VENV_DIR="backend-env"
  fi
  
  # Activate virtual environment
  if [ -f "$VENV_DIR/bin/activate" ]; then
    source "$VENV_DIR/bin/activate"
  elif [ -f "$VENV_DIR/Scripts/activate" ]; then
    source "$VENV_DIR/Scripts/activate"
  else
    echo -e "\033[1;31m[!] Failed to activate virtual environment.\033[0m"
    return 1
  fi
  
  # Install requirements if needed
  if [ -f "backend/requirements.txt" ]; then
    echo -e "\033[1;33m[*] Installing backend requirements...\033[0m"
    pip install -r backend/requirements.txt
  fi
  
  # Start the backend server
  echo -e "\033[1;32m[*] Starting FastAPI server...\033[0m"
  cd backend && python -m uvicorn app.main:app --reload --port 8000 &
  BACKEND_PID=$!
  cd ..
  
  echo -e "\033[1;32m[✓] Backend server running (PID: $BACKEND_PID)\033[0m"
  echo -e "\033[1;32m[✓] API available at http://localhost:8000\033[0m"
}

# Function to start the frontend server
start_frontend() {
  echo -e "\033[1;34m[+] Starting frontend server...\033[0m"
  
  # Check if npm is installed
  if ! command_exists npm; then
    echo -e "\033[1;31m[!] npm is not installed. Please install Node.js and npm.\033[0m"
    return 1
  fi
  
  # Check if frontend directory exists
  if [ ! -d "frontend" ]; then
    echo -e "\033[1;31m[!] Frontend directory not found.\033[0m"
    return 1
  fi
  
  # Install dependencies if needed
  if [ ! -d "frontend/node_modules" ]; then
    echo -e "\033[1;33m[*] Installing frontend dependencies...\033[0m"
    cd frontend && npm install
    cd ..
  fi
  
  # Start the frontend server
  echo -e "\033[1;32m[*] Starting React development server...\033[0m"
  cd frontend && npm start &
  FRONTEND_PID=$!
  cd ..
  
  echo -e "\033[1;32m[✓] Frontend server running (PID: $FRONTEND_PID)\033[0m"
  echo -e "\033[1;32m[✓] UI available at http://localhost:3000\033[0m"
}

# Function to handle cleanup on exit
cleanup() {
  echo -e "\033[1;33m[*] Shutting down servers...\033[0m"
  
  if [ ! -z "$BACKEND_PID" ]; then
    kill $BACKEND_PID 2>/dev/null
    echo -e "\033[1;32m[✓] Backend server stopped.\033[0m"
  fi
  
  if [ ! -z "$FRONTEND_PID" ]; then
    kill $FRONTEND_PID 2>/dev/null
    echo -e "\033[1;32m[✓] Frontend server stopped.\033[0m"
  fi
  
  # Kill any lingering processes
  if command_exists pkill; then
    pkill -f "uvicorn app.main:app" 2>/dev/null
    pkill -f "react-scripts start" 2>/dev/null
  fi
  
  echo -e "\033[1;35m[*] Thank you for using LENR Simulation App!\033[0m"
  exit 0
}

# Register cleanup function
trap cleanup EXIT INT TERM

# Main execution
show_banner

echo -e "\033[1;36m[*] LENR Simulation App Startup\033[0m"
echo -e "\033[1;36m[*] Starting development environment...\033[0m"

# Start backend and frontend
start_backend
start_frontend

# Keep script running
echo -e "\033[1;35m[*] Both servers are now running.\033[0m"
echo -e "\033[1;35m[*] Press Ctrl+C to stop all servers.\033[0m"

# Wait for user to press Ctrl+C
while true; do
  sleep 1
done 