$ErrorActionPreference = 'Stop'
Set-Location (Resolve-Path "$PSScriptRoot\..\..")

if (-not (Test-Path '.env')) {
  throw "No existe .env para respaldar."
}

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$backupDir = Join-Path (Get-Location) 'backups\config'
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
$target = Join-Path $backupDir ".env.$stamp.bak"
Copy-Item '.env' $target
Write-Host "Copia creada: $target"
Write-Host "Protege este archivo: contiene configuración sensible de despliegue."
