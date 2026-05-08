$ErrorActionPreference = 'SilentlyContinue'

$projectRoot = Split-Path -Parent $PSScriptRoot
$runtimeDir = Join-Path $projectRoot '.runtime'
$serverPidPath = Join-Path $runtimeDir 'server.pid'

function Stop-FromPidFile {
  param(
    [string]$PidFile
  )

  if (-not (Test-Path -LiteralPath $PidFile)) {
    return
  }

  try {
    $pidValue = Get-Content -LiteralPath $PidFile | Select-Object -First 1
    if ($pidValue) {
      Stop-Process -Id ([int]$pidValue) -Force -ErrorAction SilentlyContinue
    }
  } finally {
    Remove-Item -LiteralPath $PidFile -Force -ErrorAction SilentlyContinue
  }
}

function Stop-FromPort {
  param(
    [int]$Port
  )

  $listeningConnections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue

  foreach ($connection in $listeningConnections) {
    if ($connection.OwningProcess) {
      Stop-Process -Id $connection.OwningProcess -Force -ErrorAction SilentlyContinue
    }
  }

  $netstatMatches = netstat -ano | Select-String ":$Port"

  foreach ($match in $netstatMatches) {
    $columns = ($match.Line -replace '\s+', ' ').Trim().Split(' ')

    if ($columns.Length -lt 5) {
      continue
    }

    $processId = $columns[-1]
    if ($processId -match '^\d+$' -and [int]$processId -ne 0) {
      Stop-Process -Id ([int]$processId) -Force -ErrorAction SilentlyContinue
    }
  }
}

function Stop-ProjectElectronProcesses {
  param(
    [string]$ProjectRoot
  )

  $normalizedProjectRoot = $ProjectRoot.ToLowerInvariant()
  $electronProcesses = Get-CimInstance Win32_Process -Filter "name = 'electron.exe'"

  foreach ($process in $electronProcesses) {
    $commandLine = $process.CommandLine

    if (-not $commandLine) {
      continue
    }

    if ($commandLine.ToLowerInvariant().Contains($normalizedProjectRoot)) {
      Stop-Process -Id $process.ProcessId -Force -ErrorAction SilentlyContinue
    }
  }
}

Stop-FromPidFile -PidFile $serverPidPath
Stop-FromPort -Port 3001
Stop-FromPort -Port 3002
Stop-ProjectElectronProcesses -ProjectRoot $projectRoot
