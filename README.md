# Our Distance 💑

API REST para una app de pareja que permite gestionar metas personales y compartidas.

## Tecnologías
- NestJS
- TypeORM
- PostgreSQL
- Docker
- JWT (autenticación)

## Requisitos
- Node.js
- Docker Desktop

## Correr el proyecto

# Levantar la base de datos
docker-compose up -d

# Instalar dependencias
npm install

# Correr en desarrollo
npm run start:dev

## Endpoints principales

### Auth
- POST /auth/register → crear cuenta
- POST /auth/login    → iniciar sesión

### Users
- GET    /users/me                → ver mi perfil
- PATCH  /users/me                → editar mi perfil
- DELETE /users/me                → eliminar mi cuenta
- POST   /users/connect-partner   → conectar pareja
- PATCH  /users/disconnect-partner → desconectar pareja

### Goals
- POST   /goals              → crear meta
- GET    /goals/my-goals     → mis metas
- GET    /goals/partner-goals → metas de mi pareja
- GET    /goals/shared-goals  → metas compartidas
- PATCH  /goals/:id          → editar meta
- DELETE /goals/:id          → eliminar meta