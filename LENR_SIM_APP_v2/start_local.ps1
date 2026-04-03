<#
.SYNOPSIS
  Start LENR Simulation App backend and frontend locally.

.DESCRIPTION
  - Activates backend venv (or creates one), installs pip requirements, starts uvicorn on 8001
  - Installs npm dependencies for frontend, starts npm start on 3000
  - Prints instructions for stopping and URLs

.NOTES
  Backend: http://localhost:8001
  Frontend: http://localhost:3000
  If frontend proxy is set to 8000, update package.json "proxy" to "http://localhost:8001"
#>

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDir = Join-Path $Root "backend"
$FrontendDir = Join-Path $Root "frontend"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  LENR Simulation App - Local Start" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# --- Backend ---
Write-Host "[Backend] Setting up..." -ForegroundColor Yellow
Set-Location $BackendDir

$VenvPath = Join-Path $BackendDir "venv"
$VenvActivate = Join-Path $VenvPath "Scripts" "Activate.ps1"

if (-not (Test-Path $VenvPath)) {
    Write-Host "  Creating venv..." -ForegroundColor Gray
    python -m venv venv
}
if (Test-Path $VenvActivate) {
    & $VenvActivate
} else {
    Write-Host "  Warning: venv not found, using system Python" -ForegroundColor DarkYellow
}

Write-Host "  Installing pip requirements..." -ForegroundColor Gray
pip install -q -r requirements.txt

Write-Host "  Starting uvicorn on port 8001 (background)..." -ForegroundColor Gray
$PythonExe = if (Test-Path (Join-Path $VenvPath "Scripts" "python.exe")) {
    Join-Path $VenvPath "Scripts" "python.exe"
} else {
    "python"
}
$BackendJob = Start-Job -ScriptBlock {
    param($dir, $py)
    Set-Location $dir
    & $py -m uvicorn app.main:app --host 127.0.0.1 --port 8001 --no-use-colors
} -ArgumentList $BackendDir, $PythonExe

Start-Sleep -Seconds 2
Write-Host "  Backend started (Job ID: $($BackendJob.Id))" -ForegroundColor Green
Write-Host ""

# --- Frontend ---
Write-Host "[Frontend] Setting up..." -ForegroundColor Yellow
Set-Location $FrontendDir

if (-not (Test-Path "node_modules")) {
    Write-Host "  Installing npm dependencies..." -ForegroundColor Gray
    npm install
} else {
    Write-Host "  node_modules exists, skipping npm install (run 'npm install' manually to update)" -ForegroundColor Gray
}

Write-Host "  Starting npm start on port 3000..." -ForegroundColor Gray
$env:BROWSER = "none"
$FrontendJob = Start-Job -ScriptBlock {
    param($dir)
    Set-Location $dir
    $env:BROWSER = "none"
    npm start
} -ArgumentList $FrontendDir

Start-Sleep -Seconds 3
Write-Host "  Frontend started (Job ID: $($FrontendJob.Id))" -ForegroundColor Green
Write-Host ""

# --- Summary ---
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  URLs" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Backend:   http://localhost:8001" -ForegroundColor White
Write-Host "  API Docs:  http://localhost:8001/api/docs" -ForegroundColor White
Write-Host "  Frontend:  http://localhost:3000" -ForegroundColor White
Write-Host ""
Write-Host "  Note: If frontend proxy targets 8000, update frontend/package.json 'proxy' to 'http://localhost:8001'" -ForegroundColor DarkGray
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  To Stop" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Stop-Job -Id $($BackendJob.Id); Remove-Job -Id $($BackendJob.Id)   # Backend" -ForegroundColor White
Write-Host "  Stop-Job -Id $($FrontendJob.Id); Remove-Job -Id $($FrontendJob.Id) # Frontend" -ForegroundColor White
Write-Host "  Or: taskkill /F /IM node.exe 2>$null; taskkill /F /IM python.exe 2>$null" -ForegroundColor White
Write-Host ""

# Keep session open; user can Ctrl+C to stop
Write-Host "Backend and frontend are running. Press Ctrl+C to stop, or close this window." -ForegroundColor Gray
Wait-Job $BackendJob, $FrontendJob
