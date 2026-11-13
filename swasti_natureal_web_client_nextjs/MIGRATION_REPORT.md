# Migration report: React (Vite) to Next.js

- **Source:** `swasti_natureal_web_client`. React 19, Vite 7, React Router 7, Tailwind CSS v4. This project was not modified.
- **Result:** `swasti_natureal_web_client_nextjs`. Next.js 16.4.6 (App Router, Turbopack), React 19, Tailwind CSS v4.

## Approach

The goal was an exact functional and visual clone, so the UI code was copied unchanged rather than rewritten:

1. **Components, pages, contexts, hooks, i18n and helpers** were copied as-is. Each component module starts with `'use client'` because they all use browser state and hooks.
2. **React Router was replaced by a compatibility module** (`src/router`). It provides `Link`, `NavLink`, `Navigate`, `Outlet`, `useNavigate`, `useLocation`, `useParams`, `useSearchParams` and `useOutletContext` on top of `next/navigation`. The original `basename="/admin"` is reproduced with `<RouterBase base="/admin">`. Admin links such as `/products` therefore still resolve to `/admin/products`.
3. **The route tables became Next.js routes.** There are 41 admin route files under `app/admin` and 24 storefront route files under `app/(store)`, each matching one original route, including the `preset` props and the permission checks.
4. **Layouts:**
   - The original `AdminRoot` and `App` (providers plus the admin session gate) are now `shells/AdminShell.jsx`.
   - `StoreRoot` (providers plus the store layout) is now `shells/StoreShell.jsx`.
   - The account sidebar is now `app/(store)/account/layout.jsx`.
   - Original layouts render their page through `<Outlet />`, as before.
5. **The Vite dev proxy became `src/proxy.js`** (Next.js 16 Proxy, formerly Middleware). It forwards `/api/*` and `/uploads/*` to `API_PROXY_TARGET` and drops the `Origin` header, exactly like the old Vite proxy. Uploads up to 64 MB per request pass through.
6. **`index.html` became `app/layout.jsx`:**
   - The same Google Fonts (DM Sans, Fraunces, Hind Siliguri, Manrope) are loaded.
   - The same favicon and apple-touch icon, theme colour, description and title are used.
   - The logo-mark image is still preloaded.
7. **`src/index.css` became `app/globals.css`** (identical). Tailwind runs through `@tailwindcss/postcss` instead of the Vite plugin.

### Rendering and hydration

The original app was a client-only single-page app. Tokens, cart, wishlist, theme and language live in `localStorage` and `sessionStorage`. To keep that behaviour and avoid hydration mismatches, each section mounts its interactive tree in the browser (`shells/ClientOnly.jsx`). Before mounting it shows the same blank white boot screen the original showed.

Route files and layouts are Server Components. They hold routing, redirects and metadata, and render the client page components. Each route is code-split automatically, which replaces the original `React.lazy` imports.

## Changes needed for Next.js

| Original | Next.js | Reason |
| --- | --- | --- |
| `src/pages/` | `src/views/` | Next.js reserves `src/pages` for the Pages Router. |
| `import … from 'react-router-dom'` | `import … from '@/router'` | Routing is done by Next.js; same API. |
| `/admin/categories/:categoryId/products` | `app/admin/categories/[id]/products` with `ParamAlias categoryId←id` | Next.js requires one dynamic segment name per level; the page still receives `categoryId`. |
| `i18n/index.js` set `document.documentElement.lang` at import | Guarded with `typeof document !== 'undefined'`, and storage is read only in the browser | Modules are also evaluated on the server. |
| `main.jsx`, `AdminRoot.jsx`, `App.jsx`, `StoreRoot.jsx` | `app/**` routes + `shells/*` | Next.js entry points replace them. |
| `VITE_API_PROXY_TARGET` | `API_PROXY_TARGET` | Server-only setting; never exposed to the browser. |

No backend or API contract changes were made.

## Feature checklist

All of these are migrated and were tested in a browser against a test API and database:

- **Admin login:** login page (glass card design), wrong-password error, staying on the requested URL after sign-in, session kept on refresh, logout, and every admin URL requiring login.
- **Permissions:** role-based access via the per-route `Guard` and the no-access screen for customer accounts.
- **Dashboard:** stat cards, charts (Recharts), date ranges, recent orders and activity.
- **Categories:** list, search, filters, create (image upload), details, edit, delete (confirmation dialog), category products.
- **Products:** list and presets (featured, new arrivals, best selling), create (image upload), details, edit, duplicate, stock, delete.
- **Other admin modules:**
  - Inventory overview, low stock, out of stock.
  - Orders (status tabs, details, manual order creation) and payments.
  - Customers, users, admins, roles.
  - Marketing (coupons, discounts, banners, sliders), shipping, reviews, notifications.
  - Seven report types with CSV export, and all settings sections including branding.
- **Admin layout and UX:**
  - Pagination and URL-synced list parameters.
  - Sidebar (collapsible, collapsed by default), topbar, page search, notifications badge.
  - Themes (light, dark, system and five accents) and the Bangla/English switch.
  - Skeleton loading states.
- **Storefront pages:** home, product listing (filters, sort, search, pagination), categories, product details, quick view, cart, wishlist.
- **Customer accounts:** register, login, forgot and reset password, and the account pages (dashboard, profile, orders, order details, addresses, wishlist, change password).
- **Ordering:** multi-step checkout (cash on delivery, Bangladesh address), order confirmation and order tracking.
- **Info pages and responsiveness:** contact form, about page, 404 pages, and mobile layouts.

## Test results

| Test | Result |
| --- | --- |
| `next build` | Passes; all 65 routes generated |
| Admin route sweep (50 URLs; console errors, HTTP errors, titles) | 50/50 render, 0 errors, titles identical to the original |
| Visual comparison, original vs Next.js (54 screenshots, pixel diff) | 45 identical; the 9 others differ only in data that changed between runs (last-login times, activity feed, dashboard counts) |
| Storefront end-to-end (desktop and mobile) | 30/30 |
| Admin CRUD, auth, upload, search, pagination, i18n, logout | 20/20 |
| `next dev` | Compiles and serves store and admin pages |

## Known differences and notes

- **Scroll and remount behaviour.** Navigation does not scroll to the top, matching React Router; the storefront layout still scrolls to top on page change, as in the original. Moving between two different routes that use the same page component now remounts it (Next.js behaviour), so the page starts fresh.
- **No server-side HTML for page content.** It is rendered in the browser, as in the original single-page app, because sessions and the cart live in browser storage. Search-engine-friendly server rendering of product pages could be added later as an enhancement.
- **Uploads.** Requests through the proxy are buffered up to 64 MB (`experimental.proxyClientMaxBodySize` in `next.config.mjs`).

No unresolved issues were found.
