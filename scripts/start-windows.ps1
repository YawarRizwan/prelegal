$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$pidsDir = Join-Path $root ".pids"
New-Item -ItemType Directory -Force -Path $pidsDir | Out-Null

Write-Host "Starting Prelegal backend..."
Set-Location (Join-Path $root "backend")
uv sync --quiet
$backend = Start-Process -FilePath "uv" -ArgumentList "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload" -PassThru -WindowStyle Hidden
$backend.Id | Out-File (Join-Path $pidsDir "backend.pid") -Encoding ascii

Write-Host "Starting Prelegal frontend..."
Set-Location (Join-Path $root "frontend")
npm install --silent
$frontend = Start-Process -FilePath "npm" -ArgumentList "run", "dev" -PassThru -WindowStyle Hidden
$frontend.Id | Out-File (Join-Path $pidsDir "frontend.pid") -Encoding ascii

Write-Host ""
Write-Host "Prelegal is running:"
Write-Host "  Frontend: http://localhost:3000"
Write-Host "  Backend:  http://localhost:8000"
Write-Host ""
Write-Host "Run scripts\stop-windows.ps1 to stop."
