$ErrorActionPreference = 'Continue'
Set-Location (Resolve-Path "$PSScriptRoot\..\..")

Write-Host "AAE-AAR - Diagnostico Windows"
Write-Host ""

Write-Host "Docker:"
docker --version
Write-Host ""

Write-Host "Estado de Docker:"
docker info --format '{{.ServerVersion}}' 2>$null
Write-Host ""

Write-Host "WSL:"
wsl --status
Write-Host ""

Write-Host "Contenedores LAN:"
docker compose ps
Write-Host ""

Write-Host "Contenedores servidor publico:"
docker compose -f docker-compose.server.yml ps
Write-Host ""

Write-Host "Puertos 80, 443 y 3000:"
Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $_.LocalPort -in 80,443,3000 } | Select-Object LocalAddress,LocalPort,OwningProcess
Write-Host ""

Write-Host "IPv4 local:"
Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue | Where-Object { $_.IPAddress -notlike '127.*' -and $_.PrefixOrigin -ne 'WellKnown' } | Select-Object InterfaceAlias,IPAddress
Write-Host ""

Write-Host "Ultimos logs de la aplicacion:"
docker compose logs --tail=50 web
