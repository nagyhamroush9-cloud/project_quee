# Hospital Queue Management System (HQMS)

Production-ready full-stack web application for hospital queue + appointment management with real-time updates, prioritization, RBAC, Arabic/English (RTL) UI, and Docker-based deployment.

## Tech stack

- **Frontend**: React (Vite), Tailwind CSS, Axios, Socket.IO client, i18n (Arabic + English, RTL)
- **Backend**: Node.js (Express), Socket.IO, JWT, bcrypt, REST API (clean architecture style)
- **Database**: MySQL 8
- **DevOps**: Docker, Docker Compose, Nginx reverse proxy + static hosting

## Folder structure

```text
/client   -> React app
/server   -> Express API + Socket.IO + MySQL
/nginx    -> Reverse proxy + static web server
```

## Environment variables

Copy examples and adjust as needed:

```bash
copy server\.env.example server\.env
```

## Run locally (without Docker)

### 1) Start MySQL

Create a MySQL database and user, then run the schema:

```bash
mysql -u root -p < server\db\schema.sql
```

### 2) Backend

```bash
cd server
npm install
npm run dev
```

Backend starts on `http://localhost:4000`.

### 3) Frontend

```bash
cd client
npm install
npm run dev
```

Frontend starts on `http://localhost:5173`.

## Run with Docker (recommended)

```bash
docker compose up --build
```

- App: `http://localhost`
- API: `http://localhost/api`
- Socket.IO: proxied via Nginx

## Default seed users

On first run, the server auto-seeds an **Admin** user if none exists.

- **Email**: `admin@hqms.local`
- **Password**: `Admin@12345`

You can change these in `server/.env`.

## Deployment notes

- Nginx serves the built frontend and proxies `/api` + `/socket.io` to the backend container.
- Configure `JWT_SECRET` and `CORS_ORIGINS` for your domain.
- For HTTPS, terminate TLS at a load balancer or extend Nginx config with certificates.

