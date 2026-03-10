# Our Distance - Backend

REST API para la aplicación de pareja **Our Distance**, construida con NestJS, TypeORM y PostgreSQL.

## Stack

- **NestJS** - Framework backend
- **TypeORM** - ORM para base de datos
- **PostgreSQL** - Base de datos relacional
- **JWT** - Autenticación
- **Docker** - Contenedor de base de datos
- **Swagger** - Documentación de la API

## Requisitos

- Node.js 18+
- Docker Desktop

## Instalación
```bash
# Clonar el repositorio
git clone https://github.com/Mayel-dev/our-distance.git
cd our-distance

# Instalar dependencias
npm install

# Crear archivo .env basado en .env.example
cp .env.example .env
```

## Variables de entorno
```env
DB_HOST=localhost
DB_PORT=5435
DB_USERNAME=myuser
DB_PASSWORD=mypassword
DB_NAME=our-distance
PORT=3000
JWT_SECRET=tu_clave_secreta
JWT_EXPIRES_IN=7d
```

## Levantar la base de datos
```bash
docker-compose up -d
```

## Correr el proyecto
```bash
npm run start:dev
```

## Documentación

Con el servidor corriendo visita:
```
http://localhost:3000/api
```

## Endpoints principales

### Auth
- `POST /auth/register` - Registro de usuario
- `POST /auth/login` - Login

### Users
- `GET /users/me` - Obtener perfil
- `PATCH /users/me` - Actualizar perfil
- `DELETE /users/me` - Eliminar cuenta
- `POST /users/connect-partner` - Conectar pareja
- `PATCH /users/disconnect-partner` - Desconectar pareja

### Goals
- `POST /goals` - Crear meta
- `GET /goals/my-goals` - Mis metas
- `GET /goals/partner-goals` - Metas de mi pareja
- `GET /goals/shared-goals` - Metas compartidas
- `PATCH /goals/:id` - Actualizar meta
- `DELETE /goals/:id` - Eliminar meta