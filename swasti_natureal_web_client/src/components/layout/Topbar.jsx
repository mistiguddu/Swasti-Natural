import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, ChevronDown, LogOut, Menu, Plus, Search, Settings, ShieldCheck, UserRound } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { FLAT_NAVIGATION } from './navigation.js';
import { ROLE_LABELS } from '../../lib/format.js';

function useClickOutside(ref, onClose) {
  useEffect(() => {
    const handler = (event) => { if (ref.current && !ref.current.contains(event.target)) onClose(); };
    const onKey = (event) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', handler); document.removeEventListener('keydown', onKey); };
  }, [ref, onClose]);
}

/** Quick jump to any admin page. */
function PageSearch() {
  const { can } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const box = useRef(null);
  useClickOutside(box, () => setOpen(false));

  const results = useMemo(() => {
    const term = query.trim().toLowerCase();
    const pages = FLAT_NAVIGATION.filter((entry) => !entry.permission || can(entry.permission));
    return (term ? pages.filter((entry) => `${entry.section ?? ''} ${entry.label}`.toLowerCase().includes(term)) : pages).slice(0, 8);
  }, [query, can]);

  const go = (entry) => { navigate(entry.to); setQuery(''); setOpen(false); };

  return (
    <div ref={box} className="relative hidden w-full max-w-md md:block">
      <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" />
      <input
        value={query}
        onChange={(event) => { setQuery(event.target.value); setOpen(true); setCursor(0); }}
        onFocus={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') { event.preventDefault(); setCursor((value) => Math.min(value + 1, results.length - 1)); }
          if (event.key === 'ArrowUp') { event.preventDefault(); setCursor((value) => Math.max(value - 1, 0)); }
          if (event.key === 'Enter' && results[cursor]) go(results[cursor]);
        }}
        placeholder="Jump to a page…"
        aria-label="Jump to a page"
        role="combobox"
        aria-expanded={open}
        aria-controls="page-search-results"
        className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pr-3 pl-9 text-sm outline-none placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-500/15"
      />
      {open && results.length > 0 && (
        <ul id="page-search-results" role="listbox" className="absolute top-12 z-50 w-full overflow-hidden rounded-xl bg-white py-1 shadow-xl ring-1 ring-slate-200">
          {results.map((entry, index) => {
            const Icon = entry.icon;
            return (
              <li key={entry.to} role="option" aria-selected={index === cursor}>
                <button type="button" onMouseEnter={() => setCursor(index)} onClick={() => go(entry)} className={`flex w-full cursor-pointer items-center gap-3 px-3 py-2 text-left text-sm ${index === cursor ? 'bg-teal-50 text-teal-800' : 'text-slate-700'}`}>
                  {Icon && <Icon size={15} className="text-slate-400" />}
                  <span className="font-medium">{entry.label}</span>
                  {entry.section && <span className="ml-auto text-xs text-slate-400">{entry.section}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default function Topbar({ onOpenMobile, unread }) {
  const { user, signOut, can } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menu = useRef(null);
  useClickOutside(menu, () => setMenuOpen(false));
  const initial = (user?.name ?? 'A').trim().charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/85 px-4 backdrop-blur-md sm:px-6">
      <button type="button" onClick={onOpenMobile} className="grid h-10 w-10 cursor-pointer place-items-center rounded-xl text-slate-600 hover:bg-slate-100 lg:hidden" aria-label="Open menu"><Menu size={20} /></button>
      <PageSearch />
      <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
        {can('catalog.manage') && (
          <Link to="/products/new" className="hidden h-10 items-center gap-2 rounded-xl bg-teal-600 px-3.5 text-sm font-semibold text-white shadow-sm shadow-teal-600/20 transition hover:bg-teal-700 sm:inline-flex">
            <Plus size={16} /> New product
          </Link>
        )}
        <Link to="/notifications" className="relative grid h-10 w-10 place-items-center rounded-xl text-slate-600 transition hover:bg-slate-100" aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}>
          <Bell size={19} />
          {unread > 0 && <span className="absolute top-1.5 right-1.5 min-w-4 rounded-full bg-rose-500 px-1 text-center text-[9px] leading-4 font-bold text-white ring-2 ring-white">{unread > 9 ? '9+' : unread}</span>}
        </Link>
        <div ref={menu} className="relative">
          <button type="button" onClick={() => setMenuOpen((value) => !value)} aria-expanded={menuOpen} aria-haspopup="menu" className="flex cursor-pointer items-center gap-2.5 rounded-xl py-1 pr-2 pl-1 transition hover:bg-slate-100">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-400 font-display text-sm font-bold text-white">{initial}</span>
            <span className="hidden text-left leading-tight sm:block">
              <span className="block max-w-36 truncate text-sm font-semibold text-slate-800">{user?.name}</span>
              <span className="block text-[11px] text-slate-500">{ROLE_LABELS[user?.role]}</span>
            </span>
            <ChevronDown size={15} className="hidden text-slate-400 sm:block" />
          </button>
          {menuOpen && (
            <div role="menu" className="absolute right-0 mt-2 w-60 overflow-hidden rounded-xl bg-white py-1 shadow-xl ring-1 ring-slate-200 motion-safe:animate-fade-up">
              <div className="border-b border-slate-100 px-4 py-3">
                <p className="truncate text-sm font-semibold text-slate-800">{user?.name}</p>
                <p className="truncate text-xs text-slate-500">{user?.email}</p>
              </div>
              {[
                { to: '/settings/profile', icon: UserRound, label: 'Profile settings' },
                { to: '/settings/security', icon: ShieldCheck, label: 'Security' },
                ...(can('settings.manage') ? [{ to: '/settings/store', icon: Settings, label: 'Store settings' }] : []),
              ].map((item) => (
                <Link key={item.to} role="menuitem" to={item.to} onClick={() => setMenuOpen(false)} className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"><item.icon size={15} className="text-slate-400" /> {item.label}</Link>
              ))}
              <button role="menuitem" type="button" onClick={signOut} className="flex w-full cursor-pointer items-center gap-2.5 border-t border-slate-100 px-4 py-2.5 text-sm font-medium text-rose-600 hover:bg-rose-50"><LogOut size={15} /> Sign out</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
