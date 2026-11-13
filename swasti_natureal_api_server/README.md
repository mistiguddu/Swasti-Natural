# swasti_natureal_api_server

Versioned REST API for user registration, login, and JWT-protected account access.
`GET /` returns the API base path, authentication endpoints, and Swagger documentation path.

## Project Structure

```text
swasti_natureal_api_server/
|-- config/              Environment, MongoDB, OpenAPI, and security setup
|-- controllers/         Authentication request handlers
|-- middlewares/         Authentication, request schemas, and errors
|-- models/              User Mongoose model
|-- routes/              Authentication REST routes
|-- utils/               Shared errors, JWT, and async helpers
|-- auth.service.js      Authentication business logic
|-- app.js               Express application
|-- server.js            HTTP and MongoDB startup
|-- create-admin.js      Superadmin/admin seed command
|-- .env.example         Safe local configuration template
|-- .gitignore
|-- package.json
|-- package-lock.json
`-- README.md
```

### MVC Responsibilities

- **Models** define the user document and indexes.
- **Routes** map versioned HTTP paths to middleware and controllers.
- **Controllers** handle authentication HTTP input/output and delegate work to `auth.service.js`.
- **Authentication service** handles registration and login using the User model.
- **Views** are not a separate folder because this server returns JSON API responses rather than rendered HTML pages.
- **Security configuration** in `config/security.js` applies Helmet, CORS allowlisting, trusted-proxy settings, and API rate limits.

REST flow: `auth route -> middleware -> auth controller -> auth service -> User model -> MongoDB`.

## Requirements

- Windows 10/11 with PowerShell
- Node.js 24 LTS (Node 22 or newer is supported)
- MongoDB 8 locally

## Windows Setup

From PowerShell, open this project directory and run:

```powershell
node --version
npm --version
Copy-Item .env.example .env
```

`node --version` and `npm --version` confirm the toolchain. `Copy-Item` creates the local configuration file; `.env` is ignored by Git. Edit `.env` and replace `JWT_SECRET` with a random value of at least 32 characters. To generate one without installing another utility:

```powershell
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
```

Set `MONGODB_URI` to your MongoDB connection string. `MONGODB_DATABASE` selects `swasti_natural`, independently of the URI path. For a local MongoDB installation, the sample URI is ready to use. `CORS_ORIGINS` is a comma-separated allowlist; configure the exact web app origins, with scheme and port. An empty value denies cross-origin browser requests while allowing non-browser clients such as Postman. Set `TRUST_PROXY=true` only when the API is behind exactly one trusted reverse proxy.

Store Atlas connection values in the server's ignored `.env` file. Two accounts are created automatically on startup when their email does not exist yet:

| Role | Email variable (default) | Password variable |
| --- | --- | --- |
| `superadmin` | `SUPERADMIN_EMAIL` (`superadmin@gmail.com`) | `SUPERADMIN_PASSWORD` |
| `admin` | `ADMIN_EMAIL` (`admin@gmail.com`) | `ADMIN_PASSWORD` |

Passwords must be at least 8 characters and live only in `.env`. The startup seed never changes an existing account's role or password. Keep database credentials and admin passwords out of `.env.example` and source control.

Install and run:

```powershell
npm ci
npm run dev
```

`npm ci` installs the locked dependencies. `npm run dev` starts the API with Nodemon on `http://localhost:3000`; startup waits for MongoDB and validates required environment values.

## Seed The Superadmin And Admin

Server startup seeds both accounts automatically. To seed them without starting the server:

```powershell
npm run admin:create
```

The command uses the same idempotent seed logic as startup: passwords are hashed with bcrypt and existing accounts are never overwritten. Public registration always creates a `user`; a caller cannot choose their role.

## REST API

Interactive OpenAPI documentation is at `http://localhost:3000/api/docs`. All application endpoints are under `/api/v1`.

| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| POST | `/auth/register` | Public | Create a user (name, email, password; 12+ character password) |
| POST | `/auth/login` | Public | Return `accessToken` and user |
| GET | `/auth/me` | User | Current account |

### Postman Walkthrough

1. `POST http://localhost:3000/api/v1/auth/register` with JSON `{"name":"Asha","email":"asha@example.com","password":"a-long-password-123"}`.
2. Log in using `POST /api/v1/auth/login` with `{"email":"asha@example.com","password":"a-long-password-123"}`. Copy `data.accessToken` from the response.
3. Request `GET http://localhost:3000/api/v1/auth/me` with that token under **Authorization > Bearer Token**.

## Production

For a Windows host, set production environment variables through the host's secret manager, ensure MongoDB is reachable, then run:

```powershell
$env:NODE_ENV = 'production'
npm ci --omit=dev
npm run start:prod
```

`start:prod` runs the API under PM2's runtime. Use a process supervisor/service wrapper for restart-on-host-reboot, terminate TLS at a trusted reverse proxy, restrict MongoDB network access, and set `CORS_ORIGINS` explicitly.

## Security And Operations

- JWT secret and MongoDB URI are required at startup; secrets are never committed. Access tokens are short-lived according to `JWT_EXPIRES_IN`.
- Passwords use bcrypt cost 12. Public registration cannot set roles; role changes require trusted database/admin operations.
- Zod validates registration and login bodies. Helmet, CORS allowlisting, JSON size limits, and API rate limiting are enabled.
- Protected auth routes load the active user from MongoDB for each request; public registration always assigns the `user` role.
- Monitor MongoDB separately and alert on startup/database failures.
- This trimmed project layout does not include automated tests; validate database workflows in a staging environment before deployment.