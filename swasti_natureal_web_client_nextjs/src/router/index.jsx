'use client';

/**
 * React Router compatibility layer for the Next.js App Router.
 *
 * The original Vite app used react-router-dom. Every component keeps the same API
 * (Link, NavLink, Navigate, Outlet, useNavigate, useLocation, useParams,
 * useSearchParams, useOutletContext), but routing is now done by Next.js file-based
 * routes. This keeps the UI and behaviour identical without rewriting each page.
 *
 * - <RouterBase base="/admin"> plays the role of BrowserRouter's `basename`, so admin
 *   links such as "/products" resolve to "/admin/products".
 * - <RouteOutlet content={children}> lets a Next.js layout feed its page into the
 *   original layout component's <Outlet />.
 */
import NextLink from 'next/link';
import {
  useParams as useNextParams,
  usePathname,
  useRouter,
  useSearchParams as useNextSearchParams,
} from 'next/navigation';
import { createContext, forwardRef, useCallback, useContext, useEffect, useMemo, useRef } from 'react';

const BaseContext = createContext('');
const OutletSlotContext = createContext(null);
const OutletDataContext = createContext(undefined);
const ParamAliasContext = createContext(null);

export function RouterBase({ base = '', children }) {
  return <BaseContext.Provider value={base.replace(/\/$/, '')}>{children}</BaseContext.Provider>;
}

/** Maps a Next.js dynamic segment name to the name a component expects (e.g. categoryId ← id). */
export function ParamAlias({ map, children }) {
  return <ParamAliasContext.Provider value={map}>{children}</ParamAliasContext.Provider>;
}

function stripBase(pathname, base) {
  if (!base) return pathname || '/';
  if (pathname === base) return '/';
  if (pathname.startsWith(`${base}/`)) return pathname.slice(base.length);
  return pathname;
}

function withBase(path, base) {
  if (!base) return path || '/';
  return path === '/' ? base : `${base}${path}`;
}

/** Turns a react-router `to` (string or { pathname, search, hash }) into an href. */
function resolveHref(to, base, location) {
  if (typeof to === 'string') {
    if (to.startsWith('?') || to.startsWith('#')) return withBase(location.pathname, base) + to;
    if (to.startsWith('/')) {
      const [path, rest = ''] = splitPath(to);
      return withBase(path, base) + rest;
    }
    // Relative path (resolved against the current location, like react-router).
    const parent = location.pathname.endsWith('/') ? location.pathname : `${location.pathname}/`;
    const [path, rest = ''] = splitPath(new URL(to, `http://x${parent}`).pathname + to.replace(/^[^?#]*/, ''));
    return withBase(path, base) + rest;
  }
  const pathname = to?.pathname ?? location.pathname;
  const search = to?.search ? (to.search.startsWith('?') ? to.search : `?${to.search}`) : '';
  const hash = to?.hash ? (to.hash.startsWith('#') ? to.hash : `#${to.hash}`) : '';
  return withBase(pathname, base) + (search === '?' ? '' : search) + hash;
}

function splitPath(value) {
  const index = value.search(/[?#]/);
  return index === -1 ? [value] : [value.slice(0, index), value.slice(index)];
}

export function useLocation() {
  const base = useContext(BaseContext);
  const pathname = usePathname() ?? '/';
  const searchParams = useNextSearchParams();
  return useMemo(() => {
    const query = searchParams?.toString() ?? '';
    const path = stripBase(pathname, base);
    return { pathname: path, search: query ? `?${query}` : '', hash: '', state: null, key: `${path}?${query}` };
  }, [pathname, searchParams, base]);
}

export function useNavigate() {
  const router = useRouter();
  const base = useContext(BaseContext);
  const location = useLocation();
  const locationRef = useRef(location);
  locationRef.current = location;
  return useCallback((to, options = {}) => {
    if (typeof to === 'number') {
      if (to < 0) router.back();
      else router.forward();
      return;
    }
    const href = resolveHref(to, base, locationRef.current);
    if (options.replace) router.replace(href, { scroll: false });
    else router.push(href, { scroll: false });
  }, [router, base]);
}

export function useParams() {
  const params = useNextParams();
  const alias = useContext(ParamAliasContext);
  return useMemo(() => {
    const result = {};
    for (const [key, value] of Object.entries(params ?? {})) {
      const raw = Array.isArray(value) ? value.join('/') : value;
      try { result[key] = decodeURIComponent(raw); } catch { result[key] = raw; }
    }
    if (alias) for (const [name, source] of Object.entries(alias)) result[name] = result[source];
    return result;
  }, [params, alias]);
}

export function useSearchParams() {
  const router = useRouter();
  const nextParams = useNextSearchParams();
  const params = useMemo(() => new URLSearchParams(nextParams?.toString() ?? ''), [nextParams]);
  const setParams = useCallback((next, options = {}) => {
    const current = new URLSearchParams(window.location.search);
    const value = typeof next === 'function' ? next(current) : next;
    const query = new URLSearchParams(value).toString();
    const href = window.location.pathname + (query ? `?${query}` : '');
    if (options.replace) router.replace(href, { scroll: false });
    else router.push(href, { scroll: false });
  }, [router]);
  return [params, setParams];
}

export const Link = forwardRef(function Link({ to, replace, state: _state, reloadDocument, preventScrollReset: _p, ...props }, ref) {
  const base = useContext(BaseContext);
  const location = useLocation();
  const href = resolveHref(to, base, location);
  if (reloadDocument) return <a ref={ref} href={href} {...props} />;
  return <NextLink ref={ref} href={href} replace={replace} scroll={false} {...props} />;
});

export const NavLink = forwardRef(function NavLink({ to, end = false, className, style, children, caseSensitive: _c, ...props }, ref) {
  const location = useLocation();
  const target = typeof to === 'string' ? splitPath(to)[0] || location.pathname : to?.pathname ?? location.pathname;
  const toPath = target.length > 1 ? target.replace(/\/$/, '') : target;
  const path = location.pathname;
  const isActive = path === toPath || (!end && toPath !== '/' && path.startsWith(toPath) && path.charAt(toPath.length) === '/');
  const state = { isActive, isPending: false, isTransitioning: false };
  const resolvedClass = typeof className === 'function' ? className(state) : [className, isActive ? 'active' : null].filter(Boolean).join(' ') || undefined;
  return (
    <Link
      ref={ref}
      to={to}
      aria-current={isActive ? 'page' : undefined}
      className={resolvedClass}
      style={typeof style === 'function' ? style(state) : style}
      {...props}
    >
      {typeof children === 'function' ? children(state) : children}
    </Link>
  );
});

export function Navigate({ to, replace = false }) {
  const navigate = useNavigate();
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    navigate(to, { replace });
  }, [navigate, to, replace]);
  return null;
}

/** Supplies the page rendered by a Next.js layout to the original layout's <Outlet />. */
export function RouteOutlet({ content, children }) {
  return <OutletSlotContext.Provider value={content}>{children}</OutletSlotContext.Provider>;
}

export function Outlet({ context }) {
  const content = useContext(OutletSlotContext);
  return <OutletDataContext.Provider value={context}>{content}</OutletDataContext.Provider>;
}

export function useOutletContext() {
  return useContext(OutletDataContext);
}
