# Swasti Natural Web Client

React, Vite, Tailwind CSS, React Router, Axios and Recharts admin dashboard for the Swasti Natural REST API.

## Features

- Collapsible sidebar with expandable menus, breadcrumbs, page search, notifications and responsive mobile drawer
- Dashboard: summary cards with period comparison, sales/revenue/yearly charts, order statistics, top products and categories, customer growth, recent orders and activity, date filters (today, 7/30 days, month, year, custom)
- Categories and products: full CRUD, image/thumbnail/gallery upload with previews, server-side pagination, search, filters, sorting, bulk actions, details pages, duplicate, category-wise product listing
- Orders (status workflow, payments, manual order creation), customers, users, roles & permissions, inventory, coupons, discounts, banners, sliders, shipping, reviews, notifications, reports with CSV export, settings
- Skeleton loading states everywhere (no spinners), plus separate empty and error states

## Structure

```text
src/
|-- api.js               Axios client, token handling, multipart helper
|-- context/             AuthContext (session, permissions, settings), ToastContext
|-- hooks/useApi.js      Data fetching and URL-synced list parameters
|-- components/layout/   AdminLayout, Sidebar, Topbar, Breadcrumb, navigation config
|-- components/ui/       DataTable, Pagination, StatCard, forms, image uploaders, modals, skeletons, ...
|-- components/charts/   Chart cards, tooltip, legend, bar list
|-- lib/                 Formatting, CSV export, chart colours, slugify
`-- pages/               Dashboard, categories, products, orders, customers, users, marketing, reports, settings
```

## Run Locally

Requirements: Node.js 22 or newer and the API server running.

```powershell
npm ci
Copy-Item .env.example .env
npm run dev
```

Open `http://localhost:5173`. The Vite proxy forwards `/api` and `/uploads` requests to `http://127.0.0.1:4000`, the API's configured development port. Set `VITE_API_PROXY_TARGET` in `.env` if the API runs on a different port.

## Authentication

Sign in with an account registered through `POST /api/v1/auth/register` or the initial admin account after it has been safely provisioned. The client calls `POST /api/v1/auth/login`, then loads the profile from `GET /api/v1/auth/me`. The JWT is kept in `sessionStorage` for this browser tab and removed on sign-out.

Only admins and super admins can open the dashboard; customer accounts see a no-access screen. All figures and charts come from the API — nothing is hard-coded.

## Production Build

```powershell
npm run build
npm run preview
```

The generated static assets are written to `dist/`. Configure the production web server to forward `/api` and `/uploads` to the REST API origin, and to serve `index.html` for unknown paths (client-side routing).