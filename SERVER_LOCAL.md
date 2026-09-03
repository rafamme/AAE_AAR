# AAE-AAR en un servidor local

Esta configuración permite ejecutar AAE-AAR en un PC local usando Docker y Caddy. Supabase continúa alojando la base de datos, Auth y Storage.

## Recomendación de sistema

- Ubuntu Server 24.04 LTS o Debian 12
- 4 GB de RAM o más
- SSD
- Conexión estable
- IP local fija o reserva DHCP

## 1. Instalar Docker

Instala Docker Engine y Docker Compose Plugin siguiendo la documentación oficial de Docker para tu distribución.

Comprueba:

```bash
docker --version
docker compose version
```

## 2. Obtener AAE-AAR

```bash
git clone https://github.com/rafamme/AAE_AAR.git
cd AAE_AAR
```

## 3. Crear el archivo .env

```bash
cp .env.example .env
```

Completa al menos:

```env
NEXT_PUBLIC_SUPABASE_URL=https://whyegusyggdjbiyvjwhg.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=TU_PUBLISHABLE_KEY
AAE_DOMAIN=localhost
```

No uses nunca la service_role key en este archivo para el frontend.

## 4. Uso únicamente dentro de la red local

Con `AAE_DOMAIN=localhost`, arranca:

```bash
docker compose -f docker-compose.server.yml up -d --build
```

Comprueba los contenedores:

```bash
docker compose -f docker-compose.server.yml ps
```

En el propio servidor podrás abrir:

```text
http://localhost
```

Para acceso desde otros equipos de la LAN, si no se utiliza un nombre DNS local, resulta más sencillo usar temporalmente el compose básico:

```bash
docker compose up -d --build
```

Y acceder mediante:

```text
http://IP-DEL-SERVIDOR:3000
```

Ejemplo: `http://192.168.1.50:3000`.

## 5. Publicar con dominio y HTTPS

Para acceso desde Internet:

1. Asigna una IP local fija al servidor.
2. Haz que el dominio o subdominio apunte a la IP pública de tu conexión.
3. Redirige en el router los puertos TCP 80 y 443 hacia el servidor.
4. Define el dominio en `.env`:

```env
AAE_DOMAIN=socios.ejemplo.es
```

5. Arranca el stack:

```bash
docker compose -f docker-compose.server.yml up -d --build
```

Caddy solicitará y renovará automáticamente el certificado HTTPS siempre que el dominio resuelva al servidor y los puertos 80/443 sean accesibles desde Internet.

## 6. Supabase Auth

Cuando exista un nuevo dominio, actualiza en Supabase Auth la Site URL y las Redirect URLs. Añade, por ejemplo:

```text
https://socios.ejemplo.es
https://socios.ejemplo.es/**
```

Mantén también las URLs de Vercel mientras sigan utilizándose.

## 7. Actualizar la aplicación

```bash
git pull
docker compose -f docker-compose.server.yml up -d --build
```

## 8. Ver registros

```bash
docker compose -f docker-compose.server.yml logs -f web
```

Para Caddy:

```bash
docker compose -f docker-compose.server.yml logs -f caddy
```

## 9. Reinicio automático

Los servicios usan `restart: unless-stopped`, por lo que Docker los reiniciará tras un reinicio del PC siempre que el servicio Docker esté habilitado:

```bash
sudo systemctl enable --now docker
```

## 10. Copia de seguridad

La aplicación no guarda la base de datos en este servidor: PostgreSQL, Auth y Storage permanecen en Supabase. Conviene conservar copia de:

- `.env`
- configuración DNS/router
- cualquier personalización local

El código puede recuperarse de GitHub y los volúmenes de Caddy solo contienen certificados/configuración recreable.

## Arquitectura

```text
Internet o LAN
      |
      v
   Caddy :80/:443
      |
      v
AAE-AAR Next.js :3000
      |
      v
Supabase Cloud
  - PostgreSQL
  - Auth
  - Storage
```

## Seguridad mínima recomendada

- No exponer el puerto 3000 a Internet cuando se use Caddy.
- Abrir únicamente 80/443 y, si es necesario, SSH.
- Usar claves SSH para administración del servidor.
- Mantener sistema, Docker y dependencias actualizados.
- No almacenar claves `service_role` en el frontend ni en repositorios públicos.
