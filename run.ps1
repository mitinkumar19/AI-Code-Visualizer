# AI Code Visualizer Multi-Process Runner

# Ensure we are in the script's directory
$scriptPath = $PSScriptRoot
if (-not $scriptPath) {
    $scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Definition
}
Set-Location $scriptPath

Write-Host "Starting AI Code Visualizer..." -ForegroundColor Cyan

# 1. Start Backend
Write-Host "Starting FastAPI Backend (Port 8000)..." -ForegroundColor Yellow
$backendCmd = "-NoExit -Command `".\venv\Scripts\python backend/app.py`""
Start-Process -FilePath "powershell.exe" -ArgumentList $backendCmd -WindowStyle Normal

# 2. Start Frontend
Write-Host "Starting Vite Frontend (Port 5173)..." -ForegroundColor Yellow
$frontendCmd = "-NoExit -Command `"cd frontend; npm run dev`""
Start-Process -FilePath "powershell.exe" -ArgumentList $frontendCmd -WindowStyle Normal

Write-Host "`nBoth services are launching!" -ForegroundColor Green
Write-Host "--------------------------------------------------"
Write-Host "Backend API: http://localhost:8000"
Write-Host "Frontend UI: http://localhost:5173"
Write-Host "--------------------------------------------------"
Write-Host "Close the separate windows to stop the services." -ForegroundColor Gray
