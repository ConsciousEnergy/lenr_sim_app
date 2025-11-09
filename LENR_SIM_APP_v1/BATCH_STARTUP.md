# LENR Simulation Application - Batch Startup Guide

This document provides instructions for running the LENR Simulation Application using the Windows batch script.

## Prerequisites

Before running the application, ensure you have the following installed:

1. **Python 3.8+** - [Download Python](https://www.python.org/downloads/)
2. **Node.js and npm** - [Download Node.js](https://nodejs.org/)

## Running the Application

### Using the Batch Script (Recommended for Windows Users)

1. Open Windows Explorer and navigate to the LENR_SIM_APP_v1 directory.
2. Double-click on `start_app.bat`.
3. The script will:
   - Display the LENR Simulation App banner
   - Check for and create a Python virtual environment if needed
   - Install required Python packages
   - Start the backend server (FastAPI)
   - Install frontend dependencies if needed
   - Start the frontend server (React)
4. Two new command windows will open:
   - Backend server window (FastAPI on port 8000)
   - Frontend server window (React on port 3000)
5. Your default web browser should open automatically to the application UI at http://localhost:3000.

### Stopping the Application

You have two ways to stop the application:

#### Method 1: Using stop_app.bat (Recommended)
1. Double-click on `stop_app.bat` in the LENR_SIM_APP_v1 directory.
2. This script will automatically:
   - Find and terminate all backend server processes
   - Find and terminate all frontend server processes
   - Clean up any related resources
3. Press any key when prompted to close the script.

#### Method 2: Manual Shutdown
1. To stop the servers manually, press `Ctrl+C` in each of the server windows.
2. Confirm with `Y` when prompted "Terminate batch job (Y/N)?"
3. Close all command windows.

## Troubleshooting

If you encounter issues when running the application:

1. **Python Not Found**:
   - Ensure Python is installed and added to your PATH
   - Try running `python --version` in your command prompt to verify

2. **npm Not Found**:
   - Ensure Node.js is installed and added to your PATH
   - Try running `npm --version` in your command prompt to verify

3. **Port Conflicts**:
   - If ports 8000 (backend) or 3000 (frontend) are already in use, you'll need to:
     - Find and stop the processes using these ports
     - Or edit the batch file to use different ports
     - Using `stop_app.bat` before starting the application may help resolve port conflicts

4. **Backend Server Errors**:
   - Check the backend server window for specific error messages
   - Most common issues relate to missing Python packages

5. **Frontend Server Errors**:
   - Check the frontend server window for specific error messages
   - Most common issues relate to npm dependencies

## Alternative Startup Methods

If the batch script doesn't work for your system, you can also try:

- PowerShell script: `start_app.ps1` (requires PowerShell)
- Bash script: `start_app.sh` (for Linux/Mac users)
- Manual startup:
  ```
  # Start backend (from project root)
  cd backend
  python -m venv venv
  venv\Scripts\activate
  pip install -r requirements.txt
  python -m uvicorn app.main:app --reload --port 8000
  
  # Start frontend (in a new terminal, from project root)
  cd frontend
  npm install
  npm start
  ```

## Contact and Support

If you continue to experience issues, please refer to the main documentation or contact the development team. 