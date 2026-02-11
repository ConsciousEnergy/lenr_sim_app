Write-Host "Starting LENR Simulation Application..." -ForegroundColor Cyan

# Define base directory for v2 app components
$AppBaseDir = ".\LENR_SIM_APP_v2"
$BackendDir = "$AppBaseDir\backend"
$FrontendDir = "$AppBaseDir\frontend"
$RootVenvDir = ".\backend-env" # Check for root venv first
$BackendVenvDir = "$BackendDir\venv" # Fallback to backend venv

# Check if Python is installed
try {
    $pythonVersion = python --version
    Write-Host "Found $pythonVersion" -ForegroundColor Green
}
catch {
    Write-Host "Python is not installed or not in PATH. Please install Python 3.8+." -ForegroundColor Red
    exit 1
}

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "Found Node.js $nodeVersion" -ForegroundColor Green
}
catch {
    Write-Host "Node.js is not installed or not in PATH. Please install Node.js 14+." -ForegroundColor Red
    exit 1
}

# Ensure necessary directories exist within the v2 structure
if (-not (Test-Path -Path "$BackendDir\data")) { 
    New-Item -Path "$BackendDir\data" -ItemType Directory | Out-Null
    Write-Host "Created directory: $BackendDir\data" -ForegroundColor Yellow
}
if (-not (Test-Path -Path "$BackendDir\static")) { 
    New-Item -Path "$BackendDir\static" -ItemType Directory | Out-Null 
    Write-Host "Created directory: $BackendDir\static" -ForegroundColor Yellow
}
if (-not (Test-Path -Path "$BackendDir\logs")) { 
    New-Item -Path "$BackendDir\logs" -ItemType Directory | Out-Null 
    Write-Host "Created directory: $BackendDir\logs" -ForegroundColor Yellow
}

# Setup and start backend
Write-Host "Setting up backend..." -ForegroundColor Cyan

# Determine Venv Path and Activation Script
$VenvPath = $null
$ActivateScript = $null
if (Test-Path -Path "$RootVenvDir\Scripts\Activate.ps1") {
    $VenvPath = $RootVenvDir
    $ActivateScript = "$RootVenvDir\Scripts\Activate.ps1"
    Write-Host "Using root virtual environment: $RootVenvDir" -ForegroundColor Yellow
} elseif (Test-Path -Path "$BackendVenvDir\Scripts\Activate.ps1") {
    $VenvPath = $BackendVenvDir
    $ActivateScript = "$BackendVenvDir\Scripts\Activate.ps1"
    Write-Host "Using backend virtual environment: $BackendVenvDir" -ForegroundColor Yellow
} else {
    Write-Host "No suitable virtual environment found. Please run setup or create one in $RootVenvDir or $BackendVenvDir." -ForegroundColor Red
    exit 1
}

# Activate virtual environment 
Write-Host "Activating virtual environment..." -ForegroundColor Yellow
& $ActivateScript

# Install dependencies (run from backend dir where requirements.txt is)
Push-Location -Path $BackendDir
Write-Host "Installing backend dependencies (from $BackendDir)..." -ForegroundColor Yellow
pip install -r requirements.txt
Pop-Location

# Start backend server in a new window (from project root, targeting app.main:app in the correct dir)
Write-Host "Starting backend server on port 8000..." -ForegroundColor Green
# Ensure the command inside Start-Process knows the backend path and activates venv correctly
$BackendCommand = "Set-Location -Path '$BackendDir'; & '$ActivateScript'; python -m uvicorn app.main:app --reload --port 8000"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $BackendCommand

# Setup and start frontend
Write-Host "Setting up frontend..." -ForegroundColor Cyan
Push-Location -Path $FrontendDir

# Install frontend dependencies if needed
if (-not (Test-Path -Path ".\node_modules")) {
    Write-Host "Installing frontend dependencies (from $FrontendDir)..." -ForegroundColor Yellow
    npm install
}

# Start frontend server in a new window
Write-Host "Starting frontend server on default port (likely 3000 or 5173)..." -ForegroundColor Green
# Use npm run dev as per Vite convention often seen in package.json
$FrontendCommand = "Set-Location -Path '$FrontendDir'; npm run dev"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $FrontendCommand
Pop-Location

Write-Host ""
Write-Host "LENR Simulation Application is starting..." -ForegroundColor Cyan
Write-Host "Backend API: http://localhost:8000" -ForegroundColor Green
Write-Host "Frontend: Check console (likely http://localhost:3000 or http://localhost:5173)" -ForegroundColor Green
Write-Host ""
Write-Host "Press Ctrl+C in the respective PowerShell windows to stop the servers." -ForegroundColor Yellow 