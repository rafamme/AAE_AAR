param(
  [switch]$PublicServer
)

$ErrorActionPreference = 'Stop'
Set-Location (Resolve-Path "$PSScriptRoot\..\..")

Write-Host "AAE-AAR - Actualizacion"

git pull --ff-only

if ($PublicServer) {
  docker compose -f docker-compose.server.yml up -d --build
  docker compose -f docker-compose.server.yml ps
} else {
  docker compose up -d --build
  docker compose ps
}

Write-Host "Actualizacion completada."
