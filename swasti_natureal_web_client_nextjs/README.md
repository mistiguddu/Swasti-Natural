# Swasti Natural Web Client (Next.js)

Next.js (App Router) version of `swasti_natureal_web_client`. It has the same customer storefront and admin dashboard, with the same design and features. It talks to the same Swasti Natural API server, and the backend has not changed.

- **Storefront:** `http://localhost:3000/`
- **Admin dashboard:** `http://localhost:3000/admin`

## Tech stack

Next.js 16 (App Router, Turbopack), React 19, Tailwind CSS v4, Axios, Recharts and lucide-react. The code is JavaScript (JSX), like the original project.

## Requirements

- Node.js 20.9 or newer (tested with Node 26)
- The Swasti Natural API server running (by default on `http://127.0.0.1:4000`)

## Install and run

```powershell
cd swasti_natureal_web_client_nextjs
npm install
Copy-Item .env.example .env   # then edit API_PROXY_TARGET if your API uses another port
npm run dev
```

Open `http://localhost:3000` for the store and `http://localhost:3000/admin` for the admin dashboard. The dev server also listens on your LAN IP, for example `http://192.168.0.111:3000`. Local-network addresses (`192.168.x.x`, `10.x.x.x`) are allowed in `allowedDevOrigins` in `next.config.mjs`. Without that, Next.js blocks its dev scripts for those addresses and the page stays white. Restart `npm run dev` after changing `next.config.mjs`.

If PowerShell blocks `npm` with an execution-policy error, use `npm.cmd run dev`.

### Fast mode (recommended for using and testing the site)

`npm run dev` compiles each page the first time you open it, so first visits can take several seconds. That is normal for development mode. For browsing and testing, build once and run the optimized version:

```powershell
npm run preview    # build + start on port 3000
```

Measured on this project (14 pages, first visit): dev mode 55–130 s in total, production mode **6 s** (0.1–0.4 s per page). After code changes run `npm run preview` again. Use `npm run dev` only while editing code.

### Production

```powershell
npm run build
npm start          # serves on port 3000
```

## Environment variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `API_PROXY_TARGET` | `http://127.0.0.1:4000` | URL of the API server. `/api/*` and `/uploads/*` are forwarded there. This is read on the server only and never sent to the browser. |

No secrets live in the client. Login tokens come from the API at runtime.

## How it is organised

```text
src/
|-- app/                     Next.js routes (one folder per URL)
|   |-- layout.jsx           <html>, fonts, metadata
|   |-- globals.css          Tailwind v4 theme (same as the original index.css)
|   |-- (store)/             Storefront routes: /, /products, /product/[slug], /cart, /checkout, /account/...
|   `-- admin/               Admin routes: /admin, /admin/products, /admin/orders/[id], ...
|-- proxy.js                 Forwards /api and /uploads to the API server (drops the Origin header)
|-- shells/                  AdminShell and StoreShell: providers, admin session gate, loading skeletons
|-- router/                  React Router compatible Link/NavLink/useNavigate/... built on next/navigation
|-- components/ context/ hooks/ i18n/ lib/ api.js    Admin code (unchanged from the original)
|-- views/                   Admin pages (the original src/pages; renamed because Next.js reserves "pages")
`-- store/                   Storefront components, contexts and pages (unchanged from the original)
```

### Routing

Every route from the original app is a real Next.js route:

- **Admin.** `/admin/...` mirrors the original `App.jsx` route table. Each page keeps its permission check, so a missing permission shows the same "not allowed" page. `/admin/reports` and `/admin/settings` redirect to their first section, as before.
- **Storefront.** The routes mirror the original `StoreRoot.jsx`. The `/account/*` pages share the account sidebar layout (`app/(store)/account/layout.jsx`).
- **Unknown URLs** show the original 404 pages, inside the admin or store layout.

The components still import `Link`, `NavLink`, `useNavigate`, `useParams`, `useSearchParams`, `Outlet` and `useOutletContext`, now from `@/router` instead of `react-router-dom`. That module implements the same API on top of the Next.js router, so the page code did not need to change.

### Authentication

This is unchanged from the original:

- **Admin:** the token is kept in `sessionStorage` (`swasti_access_token`). On any `/admin` URL the login page shows until you sign in; after signing in you stay on that URL.
- **Customers:** the token is kept in `localStorage` (`swasti_customer_token`). Staff accounts can't sign in to the store.
- **Separate sessions:** the admin and customer sessions are independent of each other.

## Testing done

The same seeded test API was used for the original (Vite) app and this Next.js app:

- **Admin routes:** all 50 routes render with no console or HTTP errors, and every page title matches the original. Pixel comparison found 45 of 54 screenshots identical. The rest differ only because data changed between runs (login times, activity feed).
- **Storefront:** the full flow passes 30 of 30 checks. That covers home, listing, search, category, product, cart, register, checkout, order confirmation, account, orders, tracking, addresses, contact, about, 404, mobile layouts and the admin order view.
- **Admin CRUD and auth:** 20 of 20 checks pass. That covers protected routes, wrong-password error, login, refresh, category and product create (with image upload), edit, search, delete, pagination, sidebar navigation, Bangla/English switch and logout.

See `MIGRATION_REPORT.md` for details.
