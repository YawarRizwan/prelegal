$root = Split-Path -Parent $PSScriptRoot
$pidsDir = Join-Path $root ".pids"

function Stop-PidFile($file) {
    if (Test-Path $file) {
        $procId = [int](Get-Content $file)
        $proc = Get-Process -Id $procId -ErrorAction SilentlyContinue
        if ($proc) {
            Stop-Process -Id $procId -Force
            Write-Host "Stopped PID $procId"
        }
        Remove-Item $file -Force
    }
}

Stop-PidFile (Join-Path $pidsDir "backend.pid")
Stop-PidFile (Join-Path $pidsDir "frontend.pid")

Write-Host "Prelegal stopped."
