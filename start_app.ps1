# LENR Simulation App Startup Script for Windows
# This script starts both the backend and frontend development servers

# Function to display a colorful banner
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

# Function to start the backend server
function Start-Backend {
    Write-Host "[+] Starting backend server..." -ForegroundColor Blue
    
    # Check for virtual environment
    $venvDir = $null
    if (Test-Path "backend-env") {
        $venvDir = "backend-env"
    } elseif (Test-Path "venv") {
        $venvDir = "venv"
    } elseif (Test-Path "backend-venv") {
        $venvDir = "backend-venv"
    } else {
        Write-Host "[!] No virtual environment found." -ForegroundColor Red
        Write-Host "[*] Creating new virtual environment 'backend-env'..." -ForegroundColor Yellow
        python -m venv backend-env
        $venvDir = "backend-env"
    }
    
    # Activate virtual environment
    $activateScript = Join-Path $venvDir "Scripts\activate.ps1"
    if (Test-Path $activateScript) {
        & $activateScript
    } else {
        Write-Host "[!] Failed to activate virtual environment." -ForegroundColor Red
        return
    }
    
    # Install requirements if needed
    if (Test-Path "backend\requirements.txt") {
        Write-Host "[*] Installing backend requirements..." -ForegroundColor Yellow
        pip install -r backend\requirements.txt
    }
    
    # Start the backend server
    Write-Host "[*] Starting FastAPI server..." -ForegroundColor Green
    Start-Process -FilePath "python" -ArgumentList "-m", "uvicorn", "app.main:app", "--reload", "--port", "8000" -WorkingDirectory "backend" -NoNewWindow
    
    Write-Host "[✓] Backend server running" -ForegroundColor Green
    Write-Host "[✓] API available at http://localhost:8000" -ForegroundColor Green
}

# Function to start the frontend server
function Start-Frontend {
    Write-Host "[+] Starting frontend server..." -ForegroundColor Blue
    
    # Check if npm is installed
    if (-not (Get-Command "npm" -ErrorAction SilentlyContinue)) {
        Write-Host "[!] npm is not installed. Please install Node.js and npm." -ForegroundColor Red
        return
    }
    
    # Check if frontend directory exists
    if (-not (Test-Path "frontend")) {
        Write-Host "[!] Frontend directory not found." -ForegroundColor Red
        return
    }
    
    # Check if package.json exists
    if (-not (Test-Path "frontend\package.json")) {
        Write-Host "[!] Missing package.json in frontend directory." -ForegroundColor Red
        Write-Host "[!] Please run the script from the project root directory or ensure your frontend is set up correctly." -ForegroundColor Red
        
        # Log error to a file for debugging
        $errorMessage = "ERROR: package.json not found in frontend directory. Script run at $(Get-Date)"
        $errorMessage | Out-File -Append -FilePath "frontend_errors.log"
        return
    }
    
    # Install dependencies if needed
    if (-not (Test-Path "frontend\node_modules")) {
        Write-Host "[*] Installing frontend dependencies..." -ForegroundColor Yellow
        Push-Location "frontend"
        try {
            $npmOutput = npm install 2>&1
            if ($LASTEXITCODE -ne 0) {
                Write-Host "[!] Error installing dependencies:" -ForegroundColor Red
                Write-Host $npmOutput -ForegroundColor Red
                $npmOutput | Out-File -Append -FilePath "..\frontend_errors.log"
                Pop-Location
                return
            }
        } catch {
            Write-Host "[!] Exception during npm install: $_" -ForegroundColor Red
            $_ | Out-File -Append -FilePath "..\frontend_errors.log"
            Pop-Location
            return
        }
        Pop-Location
    }
    
    # Start the frontend server
    Write-Host "[*] Starting React development server..." -ForegroundColor Green
    Push-Location "frontend"
    try {
        Start-Process -FilePath "npm" -ArgumentList "start" -NoNewWindow
        if ($LASTEXITCODE -ne 0) {
            Write-Host "[!] Error starting React server" -ForegroundColor Red
            Pop-Location
            return
        }
    } catch {
        Write-Host "[!] Exception during npm start: $_" -ForegroundColor Red
        $_ | Out-File -Append -FilePath "..\frontend_errors.log"
        Pop-Location
        return
    }
    Pop-Location
    
    Write-Host "[✓] Frontend server running" -ForegroundColor Green
    Write-Host "[✓] UI available at http://localhost:3000" -ForegroundColor Green
}

# Function to handle cleanup on exit
function Cleanup {
    Write-Host "[*] Shutting down servers..." -ForegroundColor Yellow
    
    # Stop all backend processes
    Get-Process -Name "python" | Where-Object { $_.CommandLine -like "*uvicorn*" } | ForEach-Object { 
        Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue 
        Write-Host "[✓] Backend server stopped." -ForegroundColor Green
    }
    
    # Stop all frontend processes
    Get-Process -Name "node" | Where-Object { $_.CommandLine -like "*react-scripts*" } | ForEach-Object { 
        Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue 
        Write-Host "[✓] Frontend server stopped." -ForegroundColor Green
    }
    
    Write-Host "[*] Thank you for using LENR Simulation App!" -ForegroundColor Magenta
}

# Main execution
try {
    Show-Banner
    
    Write-Host "[*] LENR Simulation App Startup" -ForegroundColor Cyan
    Write-Host "[*] Starting development environment..." -ForegroundColor Cyan
    
    # Start backend and frontend
    Start-Backend
    Start-Frontend
    
    # Keep script running and handle CTRL+C
    Write-Host "[*] Both servers are now running." -ForegroundColor Magenta
    Write-Host "[*] Press Ctrl+C to stop all servers." -ForegroundColor Magenta
    
    # Wait for user to press Ctrl+C
    while ($true) {
        Start-Sleep -Seconds 1
    }
} 
catch {
    # Handle errors
    Write-Host "An error occurred: $_" -ForegroundColor Red
    $_ | Out-File -Append -FilePath "app_startup_errors.log"
}
finally {
    # Cleanup when script exits
    Cleanup
} 