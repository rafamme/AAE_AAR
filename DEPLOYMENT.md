# Despliegue de AAE-AAR fuera de Vercel

AAE-AAR es una aplicación Next.js con Supabase como backend. Puede ejecutarse en cualquier plataforma capaz de alojar Node.js 22+ o contenedores Docker.

## Variables necesarias

Configura estas variables en el proveedor de destino:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<tu-proyecto>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
PORT=3000
```

No uses ni expongas `service_role` en el frontend.

> Las variables `NEXT_PUBLIC_*` forman parte del bundle del navegador. En despliegues Docker conviene pasarlas también como argumentos de build.

## Docker

Construcción:

```bash
docker build \
  --build-arg NEXT_PUBLIC_SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL" \
  --build-arg NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" \
  -t aae-aar .
```

Ejecución:

```bash
docker run --rm -p 3000:3000 \
  -e NEXT_PUBLIC_SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL" \
  -e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" \
  aae-aar
```

La aplicación quedará disponible en `http://localhost:3000`.

## Railway

1. Crea un proyecto nuevo desde el repositorio GitHub `rafamme/AAE_AAR`.
2. Railway detectará el `Dockerfile`.
3. Añade las variables `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
4. Expón el puerto configurado por Railway. Next.js arrancará con `npm start`.
5. Añade el dominio final a las URLs permitidas de Supabase Auth.

Si Railway no pasa automáticamente las variables públicas al build Docker, configúralas también como build arguments.

## Render

1. Crea un Web Service conectado al repositorio.
2. Selecciona entorno Docker.
3. Añade las variables de Supabase.
4. Publica el servicio y asigna el dominio.
5. Añade ese dominio a Supabase Auth.

## VPS propio

Requisitos recomendados:

- Linux actualizado.
- Docker y Docker Compose.
- Caddy o Nginx como proxy inverso.
- HTTPS obligatorio para producción.

Ejemplo mínimo con Docker Compose:

```yaml
services:
  web:
    build:
      context: .
      args:
        NEXT_PUBLIC_SUPABASE_URL: ${NEXT_PUBLIC_SUPABASE_URL}
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: ${NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY}
    restart: unless-stopped
    environment:
      NEXT_PUBLIC_SUPABASE_URL: ${NEXT_PUBLIC_SUPABASE_URL}
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: ${NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY}
      PORT: 3000
    ports:
      - "127.0.0.1:3000:3000"
```

El proxy inverso debe enviar el dominio HTTPS a `127.0.0.1:3000`.

## Supabase Auth al cambiar de dominio

Al publicar en un nuevo dominio, revisa en Supabase Auth:

- Site URL.
- Redirect URLs.
- URLs de recuperación de contraseña.
- Cualquier callback utilizado por autenticación.

Las políticas RLS, datos, Storage y demás configuración de Supabase no necesitan migrarse si se conserva el mismo proyecto Supabase.

## Despliegue Node.js sin Docker

También puede ejecutarse directamente:

```bash
npm ci
npm run build
npm start
```

Requiere Node.js 22+ y las mismas variables de entorno.

## Comprobaciones tras migrar

Verifica como mínimo:

1. Portada y mapa.
2. Catálogo de localidades y monumentos.
3. Inicio/cierre de sesión.
4. Recuperación de contraseña.
5. Área de socios y planificación.
6. Administración.
7. Carga y visualización de multimedia.
8. Server Actions que escriben en Supabase.
9. Redirecciones después de login/logout.

Vercel puede seguir funcionando en paralelo mientras se valida el nuevo proveedor.
