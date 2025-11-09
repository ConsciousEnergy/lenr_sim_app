# Safe Mode Startup Script for LENR Simulation App
# This script starts both backend and frontend in safe mode to prevent memory issues

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  LENR SIMULATION APP - SAFE MODE" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "This script starts the application in safe mode to prevent memory issues." -ForegroundColor Yellow
Write-Host "Features disabled in safe mode:" -ForegroundColor Yellow
Write-Host "  - File watching/auto-reload" -ForegroundColor Red
Write-Host "  - Aggressive memory monitoring" -ForegroundColor Red
Write-Host "  - Debug logging" -ForegroundColor Red
Write-Host "`n"

# Function to check if port is in use
function Test-Port {
    param($Port)
    $tcpConnection = New-Object System.Net.Sockets.TcpClient
    try {
        $tcpConnection.Connect("127.0.0.1", $Port)
        $tcpConnection.Close()
        return $true
    } catch {
        return $false
    }
}

# Check and kill existing processes
Write-Host "Checking for existing processes..." -ForegroundColor Yellow

if (Test-Port 8001) {
    Write-Host "  Backend is running on port 8001. Killing..." -ForegroundColor Red
    Get-NetTCPConnection -LocalPort 8001 -ErrorAction SilentlyContinue | ForEach-Object {
        Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
    }
}

if (Test-Port 3000) {
    Write-Host "  Frontend is running on port 3000. Killing..." -ForegroundColor Red
    Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | ForEach-Object {
        Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
    }
}

# Kill any remaining Python/Node processes
Get-Process | Where-Object {$_.ProcessName -match "python|node|npm"} | ForEach-Object {
    Write-Host "  Killing: $($_.ProcessName) (PID: $($_.Id))" -ForegroundColor Yellow
    Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
}

Start-Sleep -Seconds 2

Write-Host "`nStarting Backend in Safe Mode..." -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

# Start backend in a new window
$backendPath = Join-Path $PSScriptRoot "backend"
Start-Process powershell -ArgumentList "-NoExit", "-Command", @"
    cd '$backendPath'
    Write-Host 'BACKEND - SAFE MODE' -ForegroundColor Cyan
    Write-Host '===================' -ForegroundColor Cyan
    Write-Host ''
    
    # Check for virtual environment
    if (Test-Path 'venv\Scripts\Activate.ps1') {
        Write-Host 'Activating virtual environment...' -ForegroundColor Yellow
        & .\venv\Scripts\Activate.ps1
    } elseif (Test-Path '.venv\Scripts\Activate.ps1') {
        Write-Host 'Activating virtual environment...' -ForegroundColor Yellow
        & .\.venv\Scripts\Activate.ps1
    }
    
    Write-Host 'Starting backend without file watching...' -ForegroundColor Green
    Write-Host 'Using safe configuration to prevent memory issues' -ForegroundColor Green
    Write-Host ''
    
    # Start uvicorn with safe config (no reload)
    python -m uvicorn config_safe:app --host 127.0.0.1 --port 8001 --log-level warning
"@

Start-Sleep -Seconds 5

Write-Host "`nStarting Frontend..." -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

# Start frontend in a new window
$frontendPath = Join-Path $PSScriptRoot "frontend"
Start-Process powershell -ArgumentList "-NoExit", "-Command", @"
    cd '$frontendPath'
    Write-Host 'FRONTEND' -ForegroundColor Cyan
    Write-Host '========' -ForegroundColor Cyan
    Write-Host ''
    
    # Set environment variables for production-like build
    `$env:BROWSER = 'none'
    `$env:GENERATE_SOURCEMAP = 'false'
    
    Write-Host 'Installing dependencies if needed...' -ForegroundColor Yellow
    npm install --silent
    
    Write-Host 'Starting frontend development server...' -ForegroundColor Green
    npm start
"@

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "  STARTING SERVICES IN SAFE MODE" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Green

Write-Host "Services are starting in new windows..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Please wait for both services to fully start:" -ForegroundColor Cyan
Write-Host "  Backend:  http://localhost:8001" -ForegroundColor White
Write-Host "  Frontend: http://localhost:3000" -ForegroundColor White
Write-Host ""
Write-Host "API Documentation: http://localhost:8001/docs" -ForegroundColor Yellow
Write-Host ""
Write-Host "Press any key to exit this window..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
