#!/bin/bash

echo "Starting LENR Simulation Application..."

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "Python 3 is not installed. Please install Python 3.8+."
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Node.js is not installed. Please install Node.js 14+."
    exit 1
fi

# Ensure necessary directories exist
mkdir -p LENR_SIM_APP_v2/backend/data LENR_SIM_APP_v2/backend/static LENR_SIM_APP_v2/backend/logs

# Setup and start backend
echo "Setting up backend..."
cd LENR_SIM_APP_v2/backend

# Check for virtual environment
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment and install dependencies
echo "Activating virtual environment..."
source venv/bin/activate

echo "Installing backend dependencies..."
pip install -r requirements.txt

# Start backend server in a new terminal
echo "Starting backend server on port 8001..."
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    osascript -e 'tell app "Terminal" to do script "cd '$(pwd)' && source venv/bin/activate && python -m uvicorn app.main:app --reload --port 8001"'
else
    # Linux
    if command -v gnome-terminal &> /dev/null; then
        gnome-terminal -- bash -c "cd $(pwd) && source venv/bin/activate && python -m uvicorn app.main:app --reload --port 8001; exec bash"
    elif command -v xterm &> /dev/null; then
        xterm -e "cd $(pwd) && source venv/bin/activate && python -m uvicorn app.main:app --reload --port 8001" &
    else
        echo "No suitable terminal emulator found. Starting backend in the background."
        nohup python -m uvicorn app.main:app --reload --port 8001 > ../logs/backend.log 2>&1 &
        echo "Backend server is running in the background. Check logs/backend.log for details."
    fi
fi

# Return to root directory
cd ../..

# Setup and start frontend
echo "Setting up frontend..."
cd LENR_SIM_APP_v2/frontend

# Install frontend dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install
fi

# Start frontend server in a new terminal
echo "Starting frontend server..."
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    osascript -e 'tell app "Terminal" to do script "cd '$(pwd)' && npm start"'
else
    # Linux
    if command -v gnome-terminal &> /dev/null; then
        gnome-terminal -- bash -c "cd $(pwd) && npm start; exec bash"
    elif command -v xterm &> /dev/null; then
        xterm -e "cd $(pwd) && npm start" &
    else
        echo "No suitable terminal emulator found. Starting frontend in the background."
        nohup npm start > ../logs/frontend.log 2>&1 &
        echo "Frontend server is running in the background. Check logs/frontend.log for details."
    fi
fi

# Return to root directory
cd ../..

echo ""
echo "LENR Simulation Application is starting..."
echo "Backend API: http://localhost:8001"
echo "Frontend: http://localhost:3000"
echo ""
echo "If terminals were opened, press Ctrl+C in those windows to stop the servers."
echo "If servers were started in the background, use 'pkill -f uvicorn' and 'pkill -f node' to stop them." 