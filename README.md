# Our Distance - Backend

REST API para la aplicacion de pareja **Our Distance**, construida con NestJS, TypeORM y PostgreSQL.

## Stack

- **NestJS** - framework backend
- **TypeORM** - ORM para base de datos
- **PostgreSQL** - base de datos relacional
- **JWT** - autenticacion con access token, refresh token y sesiones persistidas
- **Docker** - contenedor local de PostgreSQL
- **Swagger** - documentacion interactiva de la API

## Estado actual

El backend ya tiene implementados estos modulos:

- **Auth**
  - registro
  - login
  - logout
  - refresh token con rotacion
  - sesiones persistidas en base de datos (`auth_sessions`)
- **Users**
  - perfil del usuario autenticado
  - actualizacion de username
  - conexion y desconexion de pareja
  - eliminacion de cuenta
  - `forgot password`
  - `reset password`
  - `change password` para usuarios autenticados
- **Goals**
  - crear metas privadas y compartidas
  - listar metas propias, de la pareja y compartidas
  - actualizar progreso y estado
  - eliminar metas

## Flujo de autenticacion

### Access y refresh tokens

- Al hacer `register` o `login`, el backend crea una sesion en `auth_sessions`.
- El refresh token se guarda hasheado en base de datos.
- `POST /auth/refresh` valida firma, sesion activa y hash del refresh token.
- Si el refresh es valido, el backend rota el refresh token y actualiza la sesion.
- Si la sesion fue revocada, el refresh deja de servir.

### Recuperacion de contrasena

- `POST /users/forgot-password` genera un token JWT de recuperacion.
- `POST /users/reset-password` valida ese token y cambia la contrasena.
- Cada usuario tiene `passwordResetVersion`, que invalida tokens viejos de reset cuando la contrasena cambia.
- Al completar `reset-password`, se revocan las sesiones activas del usuario.

### Cambio de contrasena autenticado

- `PATCH /users/me/password` requiere JWT.
- Valida la contrasena actual.
- Guarda la nueva contrasena hasheada.
- Incrementa `passwordResetVersion`.
- Revoca las sesiones activas del usuario.

## Lo que aun falta

- envio real de correo para `forgot-password`
- frontend de recuperacion de contrasena
- pruebas unitarias y e2e mantenidas para los flujos actuales

## Requisitos

- Node.js 18+
- Docker Desktop

## Instalacion

```bash
git clone https://github.com/Mayel-dev/our-distance.git
cd our-distance
npm install
```

## Variables de entorno

Puedes configurar la base de datos de dos maneras.

### Opcion 1: variables separadas

```env
DB_HOST=localhost
DB_PORT=5435
DB_USERNAME=myuser
DB_PASSWORD=mypassword
DB_NAME=our-distance
```

### Opcion 2: URL completa

```env
DATABASE_URL=postgres://myuser:mypassword@localhost:5435/our-distance
```

### Variables JWT y servidor

```env
JWT_ACCESS_SECRET=tu_access_secret
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_SECRET=tu_refresh_secret
JWT_REFRESH_EXPIRES_IN=7d
JWT_RESET_SECRET=tu_reset_secret
JWT_RESET_EXPIRES_IN=15m
PORT=3000
```

## Base de datos local

```bash
docker-compose up -d
```

El `docker-compose.yml` levanta PostgreSQL 15 en `localhost:5435`.

## Ejecutar el proyecto

```bash
npm run start:dev
```

## Comandos utiles

```bash
npm run build
npm run lint
npm test
npm run test:e2e
```

Nota: hoy no hay una suite de tests mantenida para los flujos nuevos; el proyecto compila y lint pasa, pero la cobertura automatizada sigue pendiente.

## Swagger

Con el servidor corriendo:

```txt
http://localhost:3000/api
```

## Endpoints principales

### Auth

- `POST /auth/register` - registra un usuario y devuelve tokens
- `POST /auth/login` - inicia sesion y devuelve tokens
- `POST /auth/refresh` - rota el refresh token y devuelve nuevos tokens
- `POST /auth/logout` - revoca la sesion actual

### Users

- `POST /users/forgot-password` - genera token de recuperacion
- `POST /users/reset-password` - restablece la contrasena con token
- `GET /users/me` - obtiene el perfil autenticado
- `PATCH /users/me` - actualiza el username
- `PATCH /users/me/password` - cambia la contrasena estando autenticado
- `POST /users/connect-partner` - conecta una pareja por `pairingCode`
- `DELETE /users/disconnect-partner` - desconecta la pareja actual
- `DELETE /users/me` - elimina la cuenta del usuario

### Goals

- `POST /goals` - crea una meta
- `GET /goals/my-goals` - lista metas privadas propias
- `GET /goals/partner-goals` - lista metas privadas de la pareja
- `GET /goals/shared-goals` - lista metas compartidas
- `GET /goals/:id` - obtiene una meta puntual
- `PATCH /goals/:id` - actualiza una meta
- `DELETE /goals/:id` - elimina una meta
