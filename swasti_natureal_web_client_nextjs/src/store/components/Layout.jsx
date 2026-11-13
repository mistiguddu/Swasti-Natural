'use client';

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, NavLink, Outlet, useLocation, useNavigate, useSearchParams } from '@/router';
import {
  ChevronDown, ChevronRight, Facebook, Home, Info, LayoutGrid, LogIn, Package, Heart, Instagram, Mail, MapPin, Menu, MessageCircle, Phone, Search, ShieldCheck, ShoppingBag, Truck, UserRound, X, Youtube,
} from 'lucide-react';
import { useBranding } from '../../context/BrandingContext.jsx';
import { useStore } from '../context/StoreContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useWishlist } from '../context/WishlistContext.jsx';
import { useCustomer } from '../context/CustomerAuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { storeApi } from '../api.js';
import { money } from '../../lib/format.js';
import { Container, ProductImage, btn } from './ui.jsx';
import ChatWidget, { openChat } from './ChatWidget.jsx';

const NAV = [
  { to: '/', label: 'Home', end: true },
  { to: '/products', label: 'All Products' },
  { to: '/categories', label: 'Categories', menu: true },
  { to: '/about', label: 'About Us' },
  { to: '/contact', label: 'Contact' },
];

function Logo({ compact = false }) {
  const { logoMarkUrl, storeName } = useBranding();
  return (
    <Link to="/" className="flex min-w-0 shrink items-center gap-2 sm:shrink-0 sm:gap-2.5" aria-label={`${storeName} home`}>
      <img src={logoMarkUrl} alt="" className="h-10 w-10 shrink-0 rounded-full bg-white object-contain p-0.5 ring-1 ring-emerald-900/10 sm:h-11 sm:w-11" />
      {!compact && <span className="truncate font-serif text-lg leading-none font-semibold text-emerald-950 sm:text-xl">{storeName}</span>}
    </Link>
  );
}

function SearchBox({ className = '', onDone }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [term, setTerm] = useState(params.get('q') ?? '');
  return (
    <form
      role="search"
      className={`relative ${className}`}
      onSubmit={(event) => {
        event.preventDefault();
        const q = term.trim();
        navigate(q ? `/products?q=${encodeURIComponent(q)}` : '/products');
        onDone?.();
      }}
    >
      <input
        type="search"
        value={term}
        onChange={(event) => setTerm(event.target.value)}
        placeholder="Search natural products…"
        aria-label="Search products"
        className="h-11 w-full rounded-full border border-stone-200 bg-stone-50 pr-12 pl-5 text-sm outline-none placeholder:text-stone-400 focus:border-emerald-700 focus:bg-white focus:ring-4 focus:ring-emerald-700/10 [&::-webkit-search-cancel-button]:hidden"
      />
      <button type="submit" aria-label="Search" className="absolute top-1 right-1 grid h-9 w-9 cursor-pointer place-items-center rounded-full bg-emerald-800 text-white hover:bg-emerald-900"><Search size={16} /></button>
    </form>
  );
}

function IconLink({ to, label, count, children }) {
  return (
    <Link to={to} aria-label={`${label}${count ? ` (${count})` : ''}`} title={label} className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full text-emerald-950 transition hover:bg-emerald-50 sm:h-11 sm:w-11">
      {children}
      {count > 0 && <span className="absolute top-0.5 right-0.5 min-w-5 rounded-full bg-amber-400 px-1 text-center text-[11px] leading-5 font-bold text-emerald-950 ring-2 ring-white">{count > 99 ? '99+' : count}</span>}
    </Link>
  );
}

const MOBILE_NAV_ICONS = { '/': Home, '/products': Package, '/categories': LayoutGrid, '/about': Info, '/contact': Mail };

/**
 * Off-canvas menu for phones/tablets. Rendered in a portal on <body>: the sticky header uses
 * backdrop-filter, which would otherwise trap `position: fixed` inside the header's box.
 */
function MobileMenu({ onClose }) {
  const { topCategories, info } = useStore();
  const { isSignedIn, user } = useCustomer();
  const cart = useCart();
  const wishlist = useWishlist();
  const [showAllCats, setShowAllCats] = useState(false);
  const phone = info?.contact?.phone;
  const whatsapp = info?.social?.whatsapp;
  const cats = showAllCats ? topCategories : topCategories.slice(0, 6);

  useEffect(() => {
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    const onKey = (event) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = overflow; window.removeEventListener('keydown', onKey); };
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
      <div className="absolute inset-0 bg-emerald-950/50 backdrop-blur-[2px] motion-safe:animate-fade-in" onClick={onClose} aria-hidden="true" />
      <aside className="absolute inset-y-0 left-0 flex h-dvh w-[86vw] max-w-[340px] flex-col bg-stone-50 shadow-2xl shadow-emerald-950/30 motion-safe:animate-drawer-in">
        <div className="flex items-center justify-between gap-3 border-b border-stone-200/70 bg-white px-4 py-3">
          <Logo />
          <button type="button" onClick={onClose} aria-label="Close menu" className="grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-full bg-stone-100 text-stone-700 transition hover:bg-stone-200"><X size={19} /></button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain">
          {/* Account */}
          <div className="p-4">
            <Link to={isSignedIn ? '/account' : '/login'} onClick={onClose} className="flex items-center gap-3 rounded-2xl bg-gradient-to-br from-emerald-800 to-emerald-950 p-3.5 text-white shadow-lg shadow-emerald-900/20">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/15 ring-1 ring-white/20">
                {isSignedIn ? <span className="text-base font-bold uppercase">{(user?.name || 'U').charAt(0)}</span> : <LogIn size={19} />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[11px] font-semibold tracking-wider text-emerald-200/80 uppercase">{isSignedIn ? 'Welcome back' : 'Hello, guest'}</span>
                <span className="block truncate text-sm font-semibold">{isSignedIn ? user?.name : 'Sign in or create account'}</span>
              </span>
              <ChevronRight size={18} className="shrink-0 text-emerald-200" />
            </Link>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Link to="/wishlist" onClick={onClose} className="flex items-center gap-2 rounded-xl bg-white px-3 py-2.5 text-sm font-medium text-stone-700 ring-1 ring-stone-200/80">
                <Heart size={16} className="text-rose-500" /> Wishlist
                {wishlist.count > 0 && <span className="ml-auto rounded-full bg-stone-100 px-1.5 text-xs font-semibold text-stone-600">{wishlist.count}</span>}
              </Link>
              <Link to="/cart" onClick={onClose} className="flex items-center gap-2 rounded-xl bg-white px-3 py-2.5 text-sm font-medium text-stone-700 ring-1 ring-stone-200/80">
                <ShoppingBag size={16} className="text-emerald-700" /> Cart
                {cart.count > 0 && <span className="ml-auto rounded-full bg-amber-400 px-1.5 text-xs font-bold text-emerald-950">{cart.count}</span>}
              </Link>
            </div>
          </div>

          {/* Main navigation */}
          <nav aria-label="Mobile" className="px-4">
            <p className="px-1 pb-2 text-[11px] font-bold tracking-widest text-stone-400 uppercase">Menu</p>
            <ul className="overflow-hidden rounded-2xl bg-white ring-1 ring-stone-200/80">
              {NAV.map((item) => {
                const Icon = MOBILE_NAV_ICONS[item.to] ?? ChevronRight;
                return (
                  <li key={item.to} className="border-b border-stone-100 last:border-0">
                    <NavLink to={item.to} end={item.end} onClick={onClose} className={({ isActive }) => `group flex items-center gap-3 px-3.5 py-3 text-[15px] font-medium transition ${isActive ? 'active bg-emerald-50 text-emerald-900' : 'text-stone-800 active:bg-stone-50'}`}>
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-800 group-[.active]:bg-emerald-700 group-[.active]:text-white"><Icon size={16} /></span>
                      {item.label}
                      <ChevronRight size={16} className="ml-auto text-stone-300 group-[.active]:text-emerald-700" />
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Categories */}
          {topCategories.length > 0 && (
            <div className="px-4 pt-5 pb-4">
              <div className="flex items-center justify-between px-1 pb-2">
                <p className="text-[11px] font-bold tracking-widest text-stone-400 uppercase">Shop by category</p>
                <Link to="/categories" onClick={onClose} className="text-xs font-semibold text-emerald-800">View all</Link>
              </div>
              <ul className="grid grid-cols-2 gap-2">
                {cats.map((category) => (
                  <li key={category.id}>
                    <Link to={`/category/${category.slug}`} onClick={onClose} className="flex items-center gap-2 rounded-xl bg-white p-2 ring-1 ring-stone-200/80 transition active:scale-[0.98]">
                      <span className="h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-emerald-50"><ProductImage src={category.thumbnail || category.image} alt="" /></span>
                      <span className="min-w-0">
                        <span className="block truncate text-[13px] leading-tight font-semibold text-stone-800">{category.name}</span>
                        {category.productCount != null && <span className="block text-[11px] text-stone-400">{category.productCount} items</span>}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              {topCategories.length > 6 && (
                <button type="button" onClick={() => setShowAllCats((value) => !value)} className="mt-2 flex w-full cursor-pointer items-center justify-center gap-1 rounded-xl py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-50">
                  {showAllCats ? 'Show less' : `Show ${topCategories.length - 6} more`} <ChevronDown size={15} className={`transition ${showAllCats ? 'rotate-180' : ''}`} />
                </button>
              )}
            </div>
          )}
        </div>

        <div className="border-t border-stone-200/70 bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button type="button" onClick={() => { onClose(); openChat(); }} className={`${btn.accent} mb-3 h-11 w-full text-sm`}><MessageCircle size={16} /> Chat with us</button>
          <div className="flex items-center gap-2 text-xs text-stone-500"><ShieldCheck size={14} className="text-emerald-700" /> Cash on delivery across Bangladesh</div>
          {(phone || whatsapp) && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              {phone && <a href={`tel:${phone}`} className={`${btn.primary} h-10 px-3 text-sm ${whatsapp ? '' : 'col-span-2'}`}><Phone size={15} /> Call us</a>}
              {whatsapp && <a href={`https://wa.me/${whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className={`${btn.secondary} h-10 px-3 text-sm ${phone ? '' : 'col-span-2'}`}><MessageCircle size={15} /> WhatsApp</a>}
            </div>
          )}
        </div>
      </aside>
    </div>,
    document.body,
  );
}

function Header() {
  const { topCategories, freeShippingFrom, info } = useStore();
  const cart = useCart();
  const wishlist = useWishlist();
  const { isSignedIn, user } = useCustomer();
  const [menuOpen, setMenuOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const { pathname } = useLocation();
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  useEffect(() => { setMenuOpen(false); setCatOpen(false); }, [pathname]);

  return (
    <header className="sticky top-0 z-40 bg-white/95 shadow-[0_1px_0_rgba(6,78,59,0.08)] backdrop-blur-md">
      {freeShippingFrom && (
        <div className="bg-emerald-900 text-emerald-50">
          <Container className="flex h-9 items-center justify-center gap-2 text-xs font-medium sm:text-[13px]">
            <Truck size={15} className="shrink-0" /> Free delivery on orders over {money(freeShippingFrom)}
          </Container>
        </div>
      )}
      <Container className="flex h-[72px] items-center gap-2 sm:gap-4 lg:gap-8">
        <button type="button" onClick={() => setMenuOpen(true)} aria-label="Open menu" className="-ml-2 grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-full text-emerald-950 hover:bg-emerald-50 sm:ml-0 sm:h-11 sm:w-11 lg:hidden"><Menu size={22} /></button>
        <Logo />
        <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
          {NAV.map((item) => (item.menu ? (
            <div key={item.to} className="relative" onMouseEnter={() => setCatOpen(true)} onMouseLeave={() => setCatOpen(false)}>
              <NavLink to={item.to} onFocus={() => setCatOpen(true)} className={({ isActive }) => `inline-flex items-center gap-1 rounded-full px-3 whitespace-nowrap xl:px-4 py-2 text-[15px] font-medium transition ${isActive ? 'text-emerald-800' : 'text-stone-700 hover:text-emerald-800'}`}>
                {item.label} <ChevronDown size={14} />
              </NavLink>
              {catOpen && topCategories.length > 0 && (
                <div className="absolute top-full left-0 w-72 pt-2">
                  <div className="rounded-2xl bg-white p-2 shadow-xl ring-1 ring-stone-200">
                    {topCategories.slice(0, 10).map((category) => (
                      <Link key={category.id} to={`/category/${category.slug}`} className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm text-stone-700 hover:bg-emerald-50 hover:text-emerald-900">
                        {category.name}<span className="text-xs text-stone-400">{category.productCount}</span>
                      </Link>
                    ))}
                    <Link to="/categories" className="mt-1 block rounded-xl px-3 py-2.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-50">View all categories →</Link>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `rounded-full px-3 xl:px-4 py-2 whitespace-nowrap text-[15px] font-medium transition ${isActive ? 'text-emerald-800' : 'text-stone-700 hover:text-emerald-800'}`}>{item.label}</NavLink>
          )))}
        </nav>
        <SearchBox className="ml-auto hidden w-full max-w-xs md:block lg:hidden xl:block xl:max-w-sm" />
        <div className="ml-auto flex shrink-0 items-center gap-0 sm:gap-1 md:ml-0 lg:ml-auto xl:ml-0">
          <IconLink to={isSignedIn ? '/account' : '/login'} label={isSignedIn ? `My account (${user?.name})` : 'Sign in'}><UserRound size={21} /></IconLink>
          <IconLink to="/wishlist" label="Wishlist" count={wishlist.count}><Heart size={21} /></IconLink>
          <IconLink to="/cart" label="Cart" count={cart.count}><ShoppingBag size={21} /></IconLink>
        </div>
      </Container>
      <Container className="pb-3 md:hidden lg:block xl:hidden"><SearchBox /></Container>

      {menuOpen && <MobileMenu onClose={closeMenu} />}
    </header>
  );
}

function Newsletter() {
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    try {
      const result = await storeApi.post('/store/newsletter', { email });
      toast.success(result.alreadySubscribed ? 'You’re already subscribed — thank you!' : 'Thanks for subscribing!');
      setEmail('');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="bg-emerald-900" aria-labelledby="newsletter-title">
      <Container className="flex flex-col items-center justify-between gap-6 py-12 lg:flex-row">
        <div className="text-center lg:text-left">
          <h2 id="newsletter-title" className="font-serif text-3xl font-semibold text-white">Join our newsletter</h2>
          <p className="mt-1 text-emerald-100/80">New arrivals, offers and natural-living tips — straight to your inbox.</p>
        </div>
        <form onSubmit={submit} className="flex w-full max-w-md gap-2">
          <input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Your email address" aria-label="Email address" className="h-12 min-w-0 flex-1 rounded-full border-0 bg-white/10 px-5 text-white ring-1 ring-white/20 outline-none placeholder:text-emerald-100/50 focus:ring-2 focus:ring-amber-300" />
          <button type="submit" disabled={busy} className={`${btn.accent} h-12 shrink-0`}>{busy ? 'Subscribing…' : 'Subscribe'}</button>
        </form>
      </Container>
    </section>
  );
}

function Footer() {
  const { info, topCategories } = useStore();
  const { storeName, logoMarkUrl } = useBranding();
  const contact = info?.contact ?? {};
  const social = info?.social ?? {};
  const socials = [
    social.facebook && { href: social.facebook, label: 'Facebook', icon: Facebook },
    social.instagram && { href: social.instagram, label: 'Instagram', icon: Instagram },
    social.youtube && { href: social.youtube, label: 'YouTube', icon: Youtube },
    social.whatsapp && { href: `https://wa.me/${social.whatsapp.replace(/\D/g, '')}`, label: 'WhatsApp', icon: MessageCircle },
  ].filter(Boolean);

  return (
    <footer className="bg-[#052e22] text-emerald-50/80">
      <Container className="grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-3">
            <img src={logoMarkUrl} alt="" className="h-12 w-12 rounded-full bg-white object-contain p-0.5" />
            <span className="font-serif text-xl font-semibold text-white">{storeName}</span>
          </div>
          <p className="mt-4 text-sm leading-relaxed">{info?.tagline || 'Natural wellness products, carefully selected and delivered to your door.'}</p>
          {socials.length > 0 && (
            <div className="mt-5 flex gap-2">
              {socials.map(({ href, label, icon: Icon }) => (
                <a key={label} href={href} target="_blank" rel="noreferrer" aria-label={label} className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white transition hover:bg-amber-400 hover:text-emerald-950"><Icon size={17} /></a>
              ))}
            </div>
          )}
        </div>
        <div>
          <h3 className="font-semibold text-white">Shop</h3>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li><Link to="/products" className="hover:text-white">All products</Link></li>
            <li><Link to="/products?onSale=true" className="hover:text-white">Special offers</Link></li>
            {topCategories.slice(0, 4).map((category) => <li key={category.id}><Link to={`/category/${category.slug}`} className="hover:text-white">{category.name}</Link></li>)}
          </ul>
        </div>
        <div>
          <h3 className="font-semibold text-white">Customer care</h3>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li><Link to="/account" className="hover:text-white">My account</Link></li>
            <li><Link to="/account/orders" className="hover:text-white">My orders</Link></li>
            <li><Link to="/track-order" className="hover:text-white">Track your order</Link></li>
            <li><Link to="/wishlist" className="hover:text-white">Wishlist</Link></li>
            <li><Link to="/about" className="hover:text-white">About us</Link></li>
            <li><Link to="/contact" className="hover:text-white">Contact us</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold text-white">Contact</h3>
          <ul className="mt-4 space-y-3 text-sm">
            {contact.address && <li className="flex gap-2.5"><MapPin size={16} className="mt-0.5 shrink-0 text-amber-300" />{contact.address}</li>}
            {contact.phone && <li><a href={`tel:${contact.phone}`} className="flex gap-2.5 hover:text-white"><Phone size={16} className="mt-0.5 shrink-0 text-amber-300" />{contact.phone}</a></li>}
            {contact.email && <li><a href={`mailto:${contact.email}`} className="flex gap-2.5 hover:text-white"><Mail size={16} className="mt-0.5 shrink-0 text-amber-300" />{contact.email}</a></li>}
            {!contact.address && !contact.phone && !contact.email && <li><Link to="/contact" className="hover:text-white">Send us a message</Link></li>}
          </ul>
          <h3 className="mt-6 font-semibold text-white">We accept</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white"><ShieldCheck size={14} className="text-amber-300" /> Cash on delivery</span>
          </div>
        </div>
      </Container>
      <div className="border-t border-white/10">
        <Container className="flex flex-col items-center justify-between gap-2 py-5 text-xs sm:flex-row">
          <p>© {new Date().getFullYear()} {storeName}. All rights reserved.</p>
          <p className="flex gap-4"><Link to="/about" className="hover:text-white">About</Link><Link to="/contact" className="hover:text-white">Contact</Link></p>
        </Container>
      </div>
    </footer>
  );
}

export default function StoreLayout() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo({ top: 0 }); }, [pathname]);
  return (
    <div className="flex min-h-screen flex-col bg-white font-body text-stone-800 selection:bg-emerald-200">
      <a href="#content" className="sr-only z-[80] rounded-lg bg-white px-3 py-2 focus:not-sr-only focus:fixed focus:top-3 focus:left-3">Skip to content</a>
      <Header />
      <main id="content" className="flex-1"><Outlet /></main>
      <Newsletter />
      <Footer />
      <ChatWidget />
    </div>
  );
}
