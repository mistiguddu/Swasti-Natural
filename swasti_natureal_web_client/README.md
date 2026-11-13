# Swasti Natural Web Client

React, Vite, and Tailwind CSS client for the Swasti Natural REST API.

## Run Locally

Requirements: Node.js 22 or newer and the API server running.

```powershell
npm ci
Copy-Item .env.example .env
npm run dev
```

Open `http://localhost:5173`. The Vite proxy forwards `/api` requests to `http://127.0.0.1:4000`, the API's configured development port. Set `VITE_API_PROXY_TARGET` in `.env` if the API runs on a different port.

## Authentication

Sign in with an account registered through `POST /api/v1/auth/register` or the initial admin account after it has been safely provisioned. The client calls `POST /api/v1/auth/login`, then loads the profile from `GET /api/v1/auth/me`. The JWT is kept in `sessionStorage` for this browser tab and removed on sign-out.

The dashboard displays the authenticated user's account information. No dashboard content or metrics are fabricated by the client.

## Production Build

```powershell
npm run build
npm run preview
```

The generated static assets are written to `dist/`. Configure the production web server to forward `/api` to the REST API origin.