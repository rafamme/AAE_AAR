# AAE-AAR en Windows como servidor web

Esta guía prepara un PC Windows para ejecutar AAE-AAR mediante Docker Desktop y WSL2, manteniendo Supabase en la nube.

## Requisitos recomendados

- Windows 11 Pro o Windows Server con soporte de virtualización.
- 4 GB de RAM como mínimo; 8 GB recomendados.
- SSD.
- Conexión de red estable.
- Docker Desktop con backend WSL2.
- Git para Windows.

## 1. Instalar WSL2

Abrir PowerShell como administrador:

```powershell
wsl --install
```

Reiniciar Windows si se solicita.

Comprobar:

```powershell
wsl --status
```

## 2. Instalar Docker Desktop

Instalar Docker Desktop y dejar activado el motor basado en WSL2. En Docker Desktop, habilitar el inicio automático con Windows si el equipo va a funcionar como servidor permanente.

Comprobar desde PowerShell:

```powershell
docker --version
docker info
```

## 3. Instalar Git

Comprobar:

```powershell
git --version
```

## 4. Clonar AAE-AAR

Ejemplo:

```powershell
cd C:\
git clone https://github.com/rafamme/AAE_AAR.git AAE_AAR
cd C:\AAE_AAR
```

## 5. Preparar configuración

Ejecutar:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\windows\setup.ps1
```

La primera ejecución crea `.env` y abre el Bloc de notas. Completar:

```env
NEXT_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
PORT=3000
AAE_DOMAIN=aae.example.com
```

Para uso exclusivamente LAN, `AAE_DOMAIN` no se utiliza.

## 6. Arranque en red local

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\windows\setup.ps1
```

La aplicación queda en:

```text
http://IP-DEL-PC:3000
```

Para conocer la IP:

```powershell
ipconfig
```

Conviene reservar una IP fija para el PC en el router, por ejemplo `192.168.1.50`.

## 7. Firewall para LAN

Si otros equipos de la red no pueden acceder al puerto 3000, abrir PowerShell como administrador:

```powershell
New-NetFirewallRule -DisplayName "AAE-AAR LAN 3000" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow -Profile Private
```

No abras el puerto 3000 directamente a Internet.

## 8. Servidor público con Caddy y HTTPS

Configurar en `.env`:

```env
AAE_DOMAIN=socios.tudominio.es
```

El dominio debe resolver hacia la IP pública de la conexión. El router debe redirigir los puertos TCP 80 y 443 hacia la IP local fija del PC servidor.

Abrir en Windows Firewall:

```powershell
New-NetFirewallRule -DisplayName "AAE-AAR HTTP" -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow
New-NetFirewallRule -DisplayName "AAE-AAR HTTPS" -Direction Inbound -Protocol TCP -LocalPort 443 -Action Allow
```

Arrancar:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\windows\setup.ps1 -PublicServer
```

Caddy solicita y renueva automáticamente el certificado HTTPS cuando el DNS y los puertos 80/443 son accesibles desde Internet.

## 9. Supabase Auth

Cuando se use un dominio nuevo, añadirlo en la configuración de autenticación de Supabase como Site URL y/o Redirect URL, por ejemplo:

```text
https://socios.tudominio.es
https://socios.tudominio.es/**
```

No debe exponerse ninguna service-role key en este servidor web. AAE-AAR utiliza la publishable key y las políticas RLS de Supabase.

## 10. Actualizar la aplicación

LAN:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\windows\update.ps1
```

Servidor público:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\windows\update.ps1 -PublicServer
```

El script ejecuta `git pull --ff-only` y reconstruye los contenedores.

## 11. Diagnóstico

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\windows\diagnose.ps1
```

Muestra Docker, WSL, contenedores, puertos, direcciones IPv4 y los últimos logs de AAE-AAR.

Comandos adicionales:

```powershell
docker compose ps
docker compose logs -f web
docker compose -f docker-compose.server.yml logs -f caddy
```

## 12. Copia de seguridad de la configuración

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\windows\backup-config.ps1
```

Se crea una copia local bajo `backups\config`. Este directorio debe permanecer fuera del control de versiones y sus copias deben protegerse adecuadamente.

La información patrimonial, socios, autenticación y multimedia sigue estando en Supabase, por lo que este respaldo local cubre principalmente la configuración del despliegue.

## 13. Arranque tras reiniciar Windows

Configura Docker Desktop para iniciarse al entrar en Windows. Los servicios Docker usan `restart: unless-stopped`, de modo que los contenedores volverán a levantarse una vez que Docker esté operativo.

Para un servidor sin sesión interactiva permanente, Windows Server o una configuración de Docker que arranque como servicio puede ser más adecuada que depender del inicio de sesión de un usuario.

## 14. Apagado controlado

LAN:

```powershell
docker compose down
```

Servidor público:

```powershell
docker compose -f docker-compose.server.yml down
```

## Arquitectura

```text
Internet / LAN
     |
     +-- Caddy :80/:443   (modo público)
     |       |
     |       +-- AAE-AAR / Next.js
     |
     +-- :3000            (modo LAN directo)
             |
             +-- Supabase Cloud
                 - PostgreSQL
                 - Auth
                 - Storage
```
