'use client';

import { useEffect } from 'react';
import { Home, LayoutGrid, ShoppingBag, Store, UserRound } from 'lucide-react';
import { Link, useLocation } from '@/router';
import { useCart } from '../context/CartContext.jsx';
import { useCustomer } from '../context/CustomerAuthContext.jsx';

/** Pages with their own sticky bottom action bar (add to cart, place order) hide the nav. */
const HIDDEN_ON = [/^\/product\//, /^\/checkout/];

/** Space reserved under the page; other fixed elements (chat button, toasts) read --bottom-nav-h. */
const NAV_HEIGHT = 'calc(4rem + env(safe-area-inset-bottom))';

export function useBottomNavVisible() {
  const { pathname } = useLocation();
  return !HIDDEN_ON.some((pattern) => pattern.test(pathname));
}

/** Short haptic tick on phones that support it. */
function tap() {
  try { navigator.vibrate?.(8); } catch { /* not supported */ }
}

/**
 * One size system for every tab, so Home matches the others:
 *   bar 64px · icon 20px · label 11px (100% white: readable on every theme's dark bar) · icon slot 32px tall · active dot 4px.
 * Home uses the same icon, label and dot; only its slot is a 44px circle lifted ~8px above the bar.
 */
const ICON = 20;
const LABEL = 'text-[11px] leading-none tracking-wide';
const TAB = `group flex h-full flex-col items-center justify-center gap-1 outline-none select-none [-webkit-tap-highlight-color:transparent] ${LABEL}`;

function Badge({ count }) {
  if (!count) return null;
  return (
    <span className="absolute -top-1 -right-1 min-w-4 rounded-full bg-amber-400 px-1 text-center text-[9.5px] leading-4 font-bold text-emerald-950 ring-2 ring-emerald-800 motion-safe:animate-fade-in">
      {count > 99 ? '99+' : count}
    </span>
  );
}

function Dot({ active }) {
  return <span className={`h-1 w-1 rounded-full bg-amber-400 transition-all duration-300 ${active ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`} aria-hidden="true" />;
}

function Tab({ to, label, icon: Icon, active, count }) {
  return (
    <Link to={to} onClick={tap} aria-current={active ? 'page' : undefined} aria-label={count ? `${label} (${count})` : label} className={`${TAB} ${active ? 'font-semibold text-white' : 'font-medium text-white'}`}>
      <span className={`relative grid h-8 w-12 place-items-center rounded-full transition-all duration-300 ease-out group-active:scale-90 group-focus-visible:ring-2 group-focus-visible:ring-white/70 ${active ? 'bg-white text-emerald-800 shadow-[0_4px_12px_-4px_rgba(0,0,0,0.35)]' : 'group-hover:bg-white/10'}`}>
        <Icon size={ICON} strokeWidth={active ? 2.3 : 1.8} />
        <Badge count={count} />
      </span>
      <span>{label}</span>
      <Dot active={active} />
    </Link>
  );
}

/** Centre Home button: same icon, label and dot as the other tabs, in a slightly raised 44px circle. */
function HomeTab({ active }) {
  return (
    <Link to="/" onClick={tap} aria-current={active ? 'page' : undefined} aria-label="Home" className={`${TAB} ${active ? 'font-semibold text-white' : 'font-medium text-white'}`}>
      {/* 44px circle in a 32px slot (-mt-3): lifts it ~8px above the bar and keeps the label in line. */}
      <span
        className={`relative -mt-3 grid h-11 w-11 place-items-center rounded-full bg-gradient-to-b from-white to-emerald-50 text-emerald-700 ring-4 ring-emerald-800 transition-all duration-300 ease-out group-active:scale-90 group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-white ${active
          ? 'shadow-[0_0_0_6px_rgba(255,255,255,0.14),0_6px_16px_-4px_rgba(0,0,0,0.45)]'
          : 'shadow-[0_6px_14px_-6px_rgba(0,0,0,0.45)]'}`}
      >
        <Home size={ICON} strokeWidth={active ? 2.4 : 2} />
      </span>
      <span>Home</span>
      <Dot active={active} />
    </Link>
  );
}

/** App-style tab bar for phones (below the md breakpoint). Background and highlights follow the storefront theme. */
export default function BottomNav() {
  const { pathname } = useLocation();
  const cart = useCart();
  const { isSignedIn } = useCustomer();
  const visible = useBottomNavVisible();

  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia('(max-width: 767.98px)');
    const apply = () => {
      if (visible && media.matches) root.style.setProperty('--bottom-nav-h', NAV_HEIGHT);
      else root.style.removeProperty('--bottom-nav-h');
    };
    apply();
    media.addEventListener('change', apply);
    return () => { media.removeEventListener('change', apply); root.style.removeProperty('--bottom-nav-h'); };
  }, [visible]);

  if (!visible) return null;

  const accountActive = ['/account', '/login', '/register', '/forgot-password', '/reset-password'].some((path) => pathname.startsWith(path));

  return (
    <>
      <div className="md:hidden" style={{ height: NAV_HEIGHT }} aria-hidden="true" />
      {/*
        Docked to the screen edge (no gap below). Background is the storefront theme colour
        (emerald-* is re-pointed by the theme), running under the iPhone home bar too.
      */}
      <nav aria-label="Bottom navigation" className="fixed inset-x-0 bottom-0 z-40 rounded-t-3xl bg-gradient-to-b from-emerald-800 to-emerald-950 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_-10px_var(--color-emerald-950)] md:hidden">
        <div className="relative mx-auto max-w-md">
          {/* Soft light edge along the top for depth */}
          <div className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" aria-hidden="true" />
          <ul className="grid h-16 grid-cols-5 px-1">
            <li><Tab to="/products" label="Shop" icon={Store} active={pathname.startsWith('/products')} /></li>
            <li><Tab to="/categories" label="Categories" icon={LayoutGrid} active={pathname.startsWith('/categories') || pathname.startsWith('/category/')} /></li>
            <li><HomeTab active={pathname === '/'} /></li>
            <li><Tab to="/cart" label="Cart" icon={ShoppingBag} active={pathname.startsWith('/cart')} count={cart.count} /></li>
            <li><Tab to={isSignedIn ? '/account' : '/login'} label={isSignedIn ? 'Account' : 'Sign in'} icon={UserRound} active={accountActive} /></li>
          </ul>
        </div>
      </nav>
    </>
  );
}
