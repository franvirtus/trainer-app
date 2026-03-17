$ErrorActionPreference = "Stop"

$scriptPath = $MyInvocation.MyCommand.Path
if (-not $scriptPath) {
    throw "Esegui questo script come file .ps1, non incollandolo direttamente nel terminale."
}

$scriptsDir = Split-Path -Parent $scriptPath
$aiDir = Split-Path -Parent $scriptsDir
$generated = Join-Path $aiDir "generated"
$zipPath = Join-Path $generated "ai_context_bundle.zip"

if (Test-Path $zipPath) {
    Remove-Item $zipPath -Force
}

Compress-Archive -Path (Join-Path $generated "*") -DestinationPath $zipPath -Force

Write-Host "Creato pacchetto: $zipPath"