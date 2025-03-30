# LENR Simulation App Startup Script for Windows
# This script starts both the backend and frontend development servers

# Function to display a banner
function Show-Banner {
    $banner = @"
========================================================
   _     _____ _   _ ____     ____  _                  
  | |   | ____| \ | |  _ \   / ___|(_)_ __ ___         
  | |   |  _| |  \| | |_) |  \___ \| | '_ \` _ \      
  | |___| |___| |\  |  _ <    ___) | | | | | | |       
  |_____|_____|_| \_|_| \_\  |____/|_|_| |_| |_|       
                                                        
========================================================
"@
    Write-Host $banner -ForegroundColor Magenta
}

# Kill process using a specific port
function Stop-ProcessByPort {
    param(
        [int]$Port
    )
    
    try {
        $tcpConnections = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
        if (-not $tcpConnections) {
            Write-Host "No processes found using port $Port" -ForegroundColor Yellow
            return $false
        }
        
        foreach ($conn in $tcpConnections) {
            $pid = $conn.OwningProcess
            # Skip system processes (PID 0, 4) and other critical processes
            if ($pid -eq 0 -or $pid -eq 4) {
                Write-Host "Skipping system process with PID $pid" -ForegroundColor Yellow
                continue
            }
            
            try {
                $processInfo = Get-Process -Id $pid -ErrorAction SilentlyContinue
                if ($processInfo -and $processInfo.ProcessName -notin @("System", "Idle", "svchost", "lsass", "winlogon", "services")) {
                    Write-Host "Stopping process $($processInfo.ProcessName) (PID: $pid) using port $Port" -ForegroundColor Yellow
                    Stop-Process -Id $pid -Force
                    Start-Sleep -Seconds 1
                    return $true
                } else {
                    Write-Host "Skipping critical system process $($processInfo.ProcessName) (PID: $pid)" -ForegroundColor Yellow
                }
            } catch {
                Write-Host "Failed to stop process with PID $pid" -ForegroundColor Red
            }
        }
        return $false
    } catch {
        Write-Host "Failed to query processes on port $Port" -ForegroundColor Red
        return $false
    }
}

# Check if port is in use
function Test-PortInUse {
    param(
        [int]$Port
    )
    
    try {
        $connections = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
        return ($connections -ne $null)
    } catch {
        return $false
    }
}

# Main execution
try {
    Show-Banner
    
    Write-Host "LENR Simulation App Startup" -ForegroundColor Cyan
    Write-Host "Starting development environment..." -ForegroundColor Cyan
    
    # Free up ports if needed
    if (Test-PortInUse -Port 8000) {
        Write-Host "Port 8000 is already in use. Attempting to free up the port..." -ForegroundColor Yellow
        Stop-ProcessByPort -Port 8000
        Start-Sleep -Seconds 2
    }
    
    if (Test-PortInUse -Port 3000) {
        Write-Host "Port 3000 is already in use. Attempting to free up the port..." -ForegroundColor Yellow
        Stop-ProcessByPort -Port 3000
        Start-Sleep -Seconds 2
    }
    
    # Start backend server in a new window
    Write-Host "Starting backend server..." -ForegroundColor Green
    Start-Process -FilePath "cmd" -ArgumentList "/c cd backend && python -m uvicorn app.main:app --reload --port 8000"
    
    # Wait a bit for backend to start
    Write-Host "Waiting for backend to start..." -ForegroundColor Cyan
    Start-Sleep -Seconds 5
    
    # Check if backend started successfully
    if (Test-PortInUse -Port 8000) {
        Write-Host "Backend server is running at http://localhost:8000" -ForegroundColor Green
    } else {
        Write-Host "Failed to start backend server. Check if Python and dependencies are installed." -ForegroundColor Red
        exit 1
    }
    
    # Start frontend server in a new window
    Write-Host "Starting frontend server..." -ForegroundColor Green
    Start-Process -FilePath "cmd" -ArgumentList "/c cd frontend && npm start"
    
    # Wait for frontend to start
    Write-Host "Waiting for frontend to start..." -ForegroundColor Cyan
    Start-Sleep -Seconds 10
    
    # Check if frontend started successfully
    if (Test-PortInUse -Port 3000) {
        Write-Host "Frontend server is running at http://localhost:3000" -ForegroundColor Green
        
        # Open the browser
        Write-Host "Opening browser to http://localhost:3000" -ForegroundColor Green
        Start-Process "http://localhost:3000"
    } else {
        Write-Host "Failed to start frontend server. Check if Node.js and npm are installed." -ForegroundColor Red
        exit 1
    }
    
    Write-Host "Both servers are now running in separate windows." -ForegroundColor Magenta
    Write-Host "Close the command windows to stop the servers." -ForegroundColor Magenta
    Write-Host "This script will now exit. You can continue working in the separate terminal windows." -ForegroundColor Cyan
}
catch {
    Write-Host "An error occurred. Please check the error message and try again." -ForegroundColor Red
} 