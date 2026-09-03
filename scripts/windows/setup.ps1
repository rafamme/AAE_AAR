param(
  [switch]$PublicServer
)

$ErrorActionPreference = 'Stop'
Set-Location (Resolve-Path "$PSScriptRoot\..\..")

Write-Host "AAE-AAR - Preparacion de servidor Windows"

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  throw "Docker no esta disponible. Instala Docker Desktop con WSL2 y vuelve a ejecutar este script."
}

try { docker info | Out-Null } catch { throw "Docker Desktop no esta iniciado o no responde." }

if (-not (Test-Path '.env')) {
  Copy-Item '.env.example' '.env'
  Write-Host "Se ha creado .env desde .env.example. Editalo antes de continuar."
  Start-Process notepad.exe '.env'
  exit 0
}

$envText = Get-Content '.env' -Raw
if ($envText -match 'your-project\.supabase\.co' -or $envText -match 'sb_publishable_x+') {
  throw "Completa NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY en .env."
}

if ($PublicServer) {
  if ($envText -match 'AAE_DOMAIN=aae\.example\.com') {
    throw "Configura AAE_DOMAIN en .env antes de iniciar el servidor publico."
  }
  docker compose -f docker-compose.server.yml up -d --build
  Write-Host "Servidor publico iniciado. Caddy gestionara HTTP/HTTPS."
} else {
  docker compose up -d --build
  Write-Host "Servidor LAN iniciado en el puerto 3000."
}

docker compose ps
