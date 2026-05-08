$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$runtimeDir = Join-Path $projectRoot '.runtime'
$logsDir = Join-Path $runtimeDir 'logs'
$serverPidPath = Join-Path $runtimeDir 'server.pid'
$serverLogPath = Join-Path $logsDir 'server.stdout.log'
$serverErrorLogPath = Join-Path $logsDir 'server.stderr.log'
$distIndexPath = Join-Path $projectRoot 'dist\index.html'
$appUrl = 'http://127.0.0.1:3001'
$serverUrl = 'http://127.0.0.1:3001/health'

New-Item -ItemType Directory -Force -Path $runtimeDir | Out-Null
New-Item -ItemType Directory -Force -Path $logsDir | Out-Null
Add-Type -AssemblyName PresentationFramework

if (-not (Test-Path -LiteralPath $distIndexPath)) {
  [System.Windows.MessageBox]::Show(
    "No existe la version compilada de la aplicacion.`n`nFalta este archivo:`n$distIndexPath",
    'Asistente de Conocimiento',
    'OK',
    'Warning'
  ) | Out-Null
  exit 1
}

function Test-PortReady {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Url
  )

  try {
    $response = Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec 2
    return $response.StatusCode -ge 200
  } catch {
    return $false
  }
}

function Test-UrlReachable {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Url
  )

  try {
    $response = Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec 2
    return $response.StatusCode -ge 200 -and $response.StatusCode -lt 500
  } catch {
    if ($_.Exception.Response -and $_.Exception.Response.StatusCode.value__) {
      $statusCode = $_.Exception.Response.StatusCode.value__
      return $statusCode -ge 200 -and $statusCode -lt 500
    }

    return $false
  }
}

function Test-ProcessAlive {
  param(
    [string]$PidFile
  )

  if (-not (Test-Path -LiteralPath $PidFile)) {
    return $false
  }

  try {
    $pidValue = Get-Content -LiteralPath $PidFile -ErrorAction Stop | Select-Object -First 1
    if (-not $pidValue) {
      return $false
    }

    $null = Get-Process -Id ([int]$pidValue) -ErrorAction Stop
    return $true
  } catch {
    return $false
  }
}

function Get-ListeningProcessIdForPort {
  param(
    [int]$Port
  )

  $listeningConnections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
  if ($listeningConnections) {
    return ($listeningConnections | Select-Object -First 1).OwningProcess
  }

  $netstatMatch = netstat -ano | Select-String "LISTENING\s+\d+$" | Where-Object {
    $_.Line -match ":$Port\s"
  } | Select-Object -First 1

  if (-not $netstatMatch) {
    return $null
  }

  $columns = ($netstatMatch.Line -replace '\s+', ' ').Trim().Split(' ')
  if ($columns.Length -lt 5) {
    return $null
  }

  $processId = $columns[-1]
  if ($processId -match '^\d+$') {
    return [int]$processId
  }

  return $null
}

function Start-HiddenProcess {
  param(
    [Parameter(Mandatory = $true)]
    [string]$PidFile,
    [Parameter(Mandatory = $true)]
    [string]$StandardOutputLogPath,
    [Parameter(Mandatory = $true)]
    [string]$StandardErrorLogPath
  )

  if (Test-ProcessAlive -PidFile $PidFile) {
    return
  }

  foreach ($logPath in @($StandardOutputLogPath, $StandardErrorLogPath)) {
    if (Test-Path -LiteralPath $logPath) {
      Remove-Item -LiteralPath $logPath -Force -ErrorAction SilentlyContinue
    }
  }

  $escapedProjectRoot = $projectRoot.Replace('"', '""')
  $escapedStdOutLog = $StandardOutputLogPath.Replace('"', '""')
  $escapedStdErrLog = $StandardErrorLogPath.Replace('"', '""')
  $command = 'set "APP_PORT=3001" && set "APP_SERVE_STATIC=true" && start "" /b node server.js 1>> "' + $escapedStdOutLog + '" 2>> "' + $escapedStdErrLog + '"'
  $startInfo = New-Object System.Diagnostics.ProcessStartInfo
  $startInfo.FileName = 'cmd.exe'
  $startInfo.Arguments = "/d /c ""cd /d """"$escapedProjectRoot"""" && $command"""
  $startInfo.WorkingDirectory = $projectRoot
  $startInfo.UseShellExecute = $false
  $startInfo.CreateNoWindow = $true

  $process = New-Object System.Diagnostics.Process
  $process.StartInfo = $startInfo
  $process.Start() | Out-Null

  for ($attempt = 0; $attempt -lt 15; $attempt++) {
    $listeningProcessId = Get-ListeningProcessIdForPort -Port 3001
    if ($listeningProcessId) {
      Set-Content -LiteralPath $PidFile -Value $listeningProcessId -Encoding ASCII
      return
    }

    Start-Sleep -Milliseconds 300
  }

  Set-Content -LiteralPath $PidFile -Value $process.Id -Encoding ASCII
}

if (-not (Test-PortReady -Url $serverUrl)) {
  Start-HiddenProcess `
    -PidFile $serverPidPath `
    -StandardOutputLogPath $serverLogPath `
    -StandardErrorLogPath $serverErrorLogPath
}

$maxAttempts = 45
for ($attempt = 0; $attempt -lt $maxAttempts; $attempt++) {
  if ((Test-PortReady -Url $serverUrl) -and (Test-UrlReachable -Url $appUrl)) {
    Start-Process $appUrl
    exit 0
  }

  Start-Sleep -Milliseconds 750
}

[System.Windows.MessageBox]::Show(
  "La aplicacion no ha arrancado a tiempo.`n`nRevisa estos logs:`n$serverLogPath`n$serverErrorLogPath",
  'Asistente de Conocimiento',
  'OK',
  'Warning'
) | Out-Null

exit 1
