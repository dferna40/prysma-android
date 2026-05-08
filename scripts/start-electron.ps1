$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$electronExecutable = Join-Path $projectRoot 'node_modules\electron\dist\electron.exe'
$electronEntryPoint = Join-Path $projectRoot 'electron\main.mjs'
$desktopLogPath = Join-Path $projectRoot '.runtime\electron-userdata\desktop-runtime.log'
$launcherLogPath = Join-Path $projectRoot '.runtime\logs\electron-launcher.log'

Add-Type -AssemblyName PresentationFramework

New-Item -ItemType Directory -Force -Path (Split-Path -Parent $launcherLogPath) | Out-Null

function Write-ElectronLauncherLog {
  param(
    [string]$Message
  )

  Add-Content -LiteralPath $launcherLogPath -Value "[$([DateTime]::Now.ToString('s'))] $Message"
}

& (Join-Path $PSScriptRoot 'stop-app.ps1')
Write-ElectronLauncherLog 'Se ejecuta stop-app antes de arrancar Electron.'

if (-not (Test-Path -LiteralPath $electronExecutable)) {
  throw "No se ha encontrado Electron en: $electronExecutable"
}

if (-not (Test-Path -LiteralPath $electronEntryPoint)) {
  throw "No se ha encontrado el punto de entrada de Electron en: $electronEntryPoint"
}

$electronProcess = Start-Process -FilePath $electronExecutable -ArgumentList @($electronEntryPoint) -WorkingDirectory $projectRoot -PassThru
Write-ElectronLauncherLog "Electron lanzado con PID inicial $($electronProcess.Id)"

Start-Sleep -Seconds 3

if ($electronProcess.HasExited) {
  $desktopLog = ''
  if (Test-Path -LiteralPath $desktopLogPath) {
    $desktopLog = (Get-Content -LiteralPath $desktopLogPath -Tail 15) -join [Environment]::NewLine
  }

  [System.Windows.MessageBox]::Show(
    "Electron se ha cerrado justo despues de arrancar.`n`nRevisa este log:`n$desktopLogPath`n`nUltimas lineas:`n$desktopLog",
    'Asistente de Conocimiento',
    'OK',
    'Warning'
  ) | Out-Null

  exit 1
}

Write-ElectronLauncherLog 'Electron sigue vivo despues de la ventana inicial.'
