# Prelegal start script for Windows
#
# RETURNING AFTER INACTIVITY?
#   If the site is unreachable, run this script again — it kills stale
#   processes on ports 3000 and 8000 before starting fresh ones.
#   You do NOT need to manually kill anything first.
#
# HOW TO STOP:
#   Run scripts\stop-windows.ps1   (or close the two terminal windows that open)
#
# TROUBLESHOOTING:
#   Two PowerShell windows open — one for backend, one for frontend.
#   If something fails, the error will be visible in that window.
#   - Backend window errors: check .env file for OPENROUTER_API_KEY
#   - Frontend window errors: run  npm install  in the frontend/ folder

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

# --- Kill any stale backend/frontend processes ---
Write-Host "Clearing stale processes on ports 3000 and 8000..."

# Kill all python processes (uvicorn workers from previous runs)
Stop-Process -Name python -Force -ErrorAction SilentlyContinue

# Kill any node process on port 3000
$nodeProcs = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty OwningProcess -Unique
foreach ($procId in $nodeProcs) {
    Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
}

Start-Sleep -Milliseconds 800   # let OS release the ports

# --- Locate uv ---
$uvPath = "$env:USERPROFILE\.local\bin\uv.exe"
if (-not (Test-Path $uvPath)) { $uvPath = "uv" }

# --- Sync backend dependencies ---
Write-Host "Syncing backend dependencies..."
$backendDir = Join-Path $root "backend"
Push-Location $backendDir
& $uvPath sync --quiet
Pop-Location

# --- Start backend in a visible window ---
# The window stays open so you can see logs and errors.
$backendCmd = "Set-Location '$backendDir'; Write-Host 'Backend starting...'; & '$uvPath' run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload; Write-Host 'Backend stopped. Press Enter to close.'; Read-Host"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendCmd

# Wait for backend to actually be listening before starting frontend
Write-Host "Waiting for backend on port 8000..."
$attempts = 0
do {
    Start-Sleep -Milliseconds 500
    $attempts++
    $listening = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue
} while (-not $listening -and $attempts -lt 30)

if (-not $listening) {
    Write-Host ""
    Write-Host "ERROR: Backend did not start after 15 seconds."
    Write-Host "Check the backend terminal window for error messages."
    exit 1
}
Write-Host "Backend is up."

# --- Install frontend deps if needed ---
$frontendDir = Join-Path $root "frontend"
if (-not (Test-Path (Join-Path $frontendDir "node_modules"))) {
    Write-Host "Installing frontend dependencies (first run)..."
    Push-Location $frontendDir
    npm install --silent
    Pop-Location
}

# --- Start frontend in a visible window ---
$frontendCmd = "Set-Location '$frontendDir'; Write-Host 'Frontend starting...'; npm run dev; Write-Host 'Frontend stopped. Press Enter to close.'; Read-Host"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontendCmd

Write-Host ""
Write-Host "Prelegal is starting:"
Write-Host "  Backend:  http://localhost:8000"
Write-Host "  Frontend: http://localhost:3000  (ready in ~5-10 seconds)"
Write-Host ""
Write-Host "Two terminal windows are open — keep them open while using the app."
Write-Host "Run scripts\stop-windows.ps1 (or close both windows) to stop."
