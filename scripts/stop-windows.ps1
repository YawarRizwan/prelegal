# Prelegal stop script — kills uvicorn (python.exe) and the Next.js dev server (node.exe).
# Safe to run multiple times. Does NOT rely on PID files.

Write-Host "Stopping Prelegal..."

# Kill all python processes (uvicorn workers)
$pythonProcs = Get-Process -Name python -ErrorAction SilentlyContinue
if ($pythonProcs) {
    foreach ($p in $pythonProcs) {
        Write-Host "  Stopping python (PID $($p.Id))..."
    }
    Stop-Process -Name python -Force -ErrorAction SilentlyContinue
} else {
    Write-Host "  No python processes found."
}

# Kill Node processes listening on port 3000 (frontend dev server)
$nodeProcs = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty OwningProcess -Unique
foreach ($procId in $nodeProcs) {
    $proc = Get-Process -Id $procId -ErrorAction SilentlyContinue
    if ($proc) {
        Write-Host "  Stopping $($proc.ProcessName) (PID $procId) on port 3000..."
        Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
    }
}
if (-not $nodeProcs) { Write-Host "  No frontend process on port 3000." }

Start-Sleep -Seconds 2

# Verify ports are clear (check only LISTEN state, ignore TIME_WAIT/ESTABLISHED)
$still8000 = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue
$still3000 = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
if ($still8000) { Write-Host "WARNING: Something is still LISTENING on port 8000. Try running this script again." }
if ($still3000) { Write-Host "WARNING: Something is still LISTENING on port 3000. Try running this script again." }

# Clean up any leftover PID files
$pidsDir = Join-Path (Split-Path -Parent $PSScriptRoot) ".pids"
if (Test-Path $pidsDir) { Remove-Item $pidsDir -Recurse -Force -ErrorAction SilentlyContinue }

Write-Host ""
Write-Host "Done. Ports 3000 and 8000 are free."
