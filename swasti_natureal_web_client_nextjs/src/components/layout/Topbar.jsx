'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from '@/router';
import {
  Bell, Check, ChevronDown, ExternalLink, Languages, LogOut, Menu, MessagesSquare, Monitor, Moon, Palette, Plus, Search, Settings, ShieldCheck, Sun, UserRound,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useChatRealtime } from '../../context/ChatRealtimeContext.jsx';
import { ACCENTS, usePreferences } from '../../context/PreferencesContext.jsx';
import { FLAT_NAVIGATION } from './navigation.js';
import { ROLE_LABELS } from '../../lib/format.js';
import { digits, LANGUAGES, t } from '../../i18n/index.js';

function useClickOutside(ref, onClose) {
  useEffect(() => {
    const handler = (event) => { if (ref.current && !ref.current.contains(event.target)) onClose(); };
    const onKey = (event) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', handler); document.removeEventListener('keydown', onKey); };
  }, [ref, onClose]);
}

/** Quick jump to any admin page (matches English and the current language). */
function PageSearch() {
  const { can } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const box = useRef(null);
  const close = useCallback(() => setOpen(false), []);
  useClickOutside(box, close);

  const results = useMemo(() => {
    const term = query.trim().toLowerCase();
    const pages = FLAT_NAVIGATION.filter((entry) => !entry.permission || can(entry.permission));
    const haystack = (entry) => `${entry.section ?? ''} ${entry.label} ${t(entry.section ?? '')} ${t(entry.label)}`.toLowerCase();
    return (term ? pages.filter((entry) => haystack(entry).includes(term)) : pages).slice(0, 8);
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
        placeholder={t('Jump to a page…')}
        aria-label={t('Jump to a page…')}
        role="combobox"
        aria-expanded={open}
        aria-controls="page-search-results"
        className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pr-3 pl-9 text-sm outline-none placeholder:text-slate-400 focus:border-teal-500 focus:bg-surface focus:ring-4 focus:ring-teal-500/15"
      />
      {open && results.length > 0 && (
        <ul id="page-search-results" role="listbox" className="absolute top-12 z-50 w-full overflow-hidden rounded-xl bg-surface py-1 shadow-xl ring-1 ring-slate-200">
          {results.map((entry, index) => {
            const Icon = entry.icon;
            return (
              <li key={entry.to} role="option" aria-selected={index === cursor}>
                <button type="button" onMouseEnter={() => setCursor(index)} onClick={() => go(entry)} className={`flex w-full cursor-pointer items-center gap-3 px-3 py-2 text-left text-sm ${index === cursor ? 'bg-teal-50 text-teal-800' : 'text-slate-700'}`}>
                  {Icon && <Icon size={15} className="text-slate-400" />}
                  <span className="font-medium">{t(entry.label)}</span>
                  {entry.section && <span className="ml-auto text-xs text-slate-400">{t(entry.section)}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

const MODE_OPTIONS = [
  { key: 'light', label: 'Light', icon: Sun },
  { key: 'dark', label: 'Dark', icon: Moon },
  { key: 'system', label: 'System', icon: Monitor },
];

/** Theme mode, accent colour and language. */
function AppearanceMenu() {
  const { mode, accent, language, resolvedTheme, setMode, setAccent, setLanguage } = usePreferences();
  const [open, setOpen] = useState(false);
  const box = useRef(null);
  const close = useCallback(() => setOpen(false), []);
  useClickOutside(box, close);
  const ModeIcon = resolvedTheme === 'dark' ? Moon : Sun;

  return (
    <div ref={box} className="relative">
      <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-haspopup="dialog" aria-label={t('Appearance & language')} title={t('Appearance & language')} className="grid h-10 w-10 cursor-pointer place-items-center rounded-xl text-slate-600 transition hover:bg-slate-100">
        <ModeIcon size={19} />
      </button>
      {open && (
        <div role="dialog" aria-label={t('Appearance & language')} className="absolute right-0 mt-2 w-72 rounded-2xl bg-surface p-4 shadow-xl ring-1 ring-slate-200 motion-safe:animate-fade-up">
          <p className="mb-2 text-[11px] font-bold tracking-wider text-slate-400 uppercase">{t('Theme')}</p>
          <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-slate-100 p-1" role="radiogroup" aria-label={t('Theme')}>
            {MODE_OPTIONS.map((option) => (
              <button key={option.key} type="button" role="radio" aria-checked={mode === option.key} onClick={() => setMode(option.key)} className={`flex cursor-pointer flex-col items-center gap-1 rounded-lg py-2 text-xs font-semibold transition ${mode === option.key ? 'bg-surface text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
                <option.icon size={16} />{t(option.label)}
              </button>
            ))}
          </div>

          <p className="mt-4 mb-2 flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-slate-400 uppercase"><Palette size={12} /> {t('Accent colour')}</p>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t('Accent colour')}>
            {ACCENTS.map((item) => (
              <button key={item.key} type="button" role="radio" aria-checked={accent === item.key} onClick={() => setAccent(item.key)} title={t(item.label)} aria-label={t(item.label)} className={`grid h-9 w-9 cursor-pointer place-items-center rounded-full ring-2 ring-offset-2 ring-offset-surface transition ${accent === item.key ? 'ring-slate-400' : 'ring-transparent hover:ring-slate-200'}`} style={{ background: item.swatch }}>
                {accent === item.key && <Check size={16} className="text-white" />}
              </button>
            ))}
          </div>

          <p className="mt-4 mb-2 flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-slate-400 uppercase"><Languages size={12} /> {t('Language')}</p>
          <div className="grid grid-cols-2 gap-1.5" role="radiogroup" aria-label={t('Language')}>
            {LANGUAGES.map((item) => (
              <button key={item.code} type="button" role="radio" aria-checked={language === item.code} lang={item.code} onClick={() => setLanguage(item.code)} className={`h-10 cursor-pointer rounded-xl text-sm font-semibold ring-1 transition ${language === item.code ? 'bg-teal-50 text-teal-800 ring-teal-200' : 'text-slate-600 ring-slate-200 hover:bg-slate-50'}`}>
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** One-click EN ⇄ বাংলা switch. */
function LanguageToggle() {
  const { language, setLanguage } = usePreferences();
  const next = LANGUAGES.find((item) => item.code !== language);
  return (
    <button type="button" onClick={() => setLanguage(next.code)} lang={next.code} title={`${t('Language')}: ${next.label}`} aria-label={`${t('Switch language to')} ${next.label}`} className="hidden h-10 min-w-10 cursor-pointer items-center justify-center gap-1.5 rounded-xl px-2.5 text-sm font-bold text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-100 sm:inline-flex">
      <Languages size={16} /> {next.short}
    </button>
  );
}

export default function Topbar({ onOpenMobile, unread, messages = 0 }) {
  const { user, signOut, can } = useAuth();
  const { connected } = useChatRealtime();
  const [menuOpen, setMenuOpen] = useState(false);
  const menu = useRef(null);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  useClickOutside(menu, closeMenu);
  const initial = (user?.name ?? 'A').trim().charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200 bg-surface/85 px-4 backdrop-blur-md sm:px-6">
      <button type="button" onClick={onOpenMobile} className="grid h-10 w-10 cursor-pointer place-items-center rounded-xl text-slate-600 hover:bg-slate-100 lg:hidden" aria-label={t('Open menu')}><Menu size={20} /></button>
      <PageSearch />
      <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
        {can('catalog.manage') && (
          <Link to="/products/new" className="hidden h-10 items-center gap-2 rounded-xl bg-teal-600 px-3.5 text-sm font-semibold text-white shadow-sm shadow-teal-600/20 transition hover:bg-teal-600/90 sm:inline-flex">
            <Plus size={16} /> {t('New product')}
          </Link>
        )}
        {/* The storefront lives outside the /admin router, so this is a plain link. */}
        <a href="/" target="_blank" rel="noreferrer" className="hidden h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-100 xl:inline-flex">
          <ExternalLink size={15} /> {t('View store')}
        </a>
        <LanguageToggle />
        <AppearanceMenu />
        {can('customers.manage') && (
          <Link to="/messages" title={connected ? t('Live chat connected') : t('Live chat reconnecting…')} className="relative grid h-10 w-10 place-items-center rounded-xl text-slate-600 transition hover:bg-slate-100" aria-label={`${t('Messages')}${messages ? ` (${messages})` : ''}`}>
            <MessagesSquare size={19} />
            <span className={`absolute bottom-2 left-2 h-2 w-2 rounded-full ring-2 ring-surface ${connected ? 'bg-emerald-500' : 'bg-slate-300'}`} />
            {messages > 0 && <span className="absolute top-1.5 right-1.5 min-w-4 rounded-full bg-teal-600 px-1 text-center text-[9px] leading-4 font-bold text-white ring-2 ring-surface motion-safe:animate-soft-pulse">{digits(messages > 9 ? '9+' : messages)}</span>}
          </Link>
        )}
        <Link to="/notifications" className="relative grid h-10 w-10 place-items-center rounded-xl text-slate-600 transition hover:bg-slate-100" aria-label={`${t('Notifications')}${unread ? ` (${unread})` : ''}`}>
          <Bell size={19} />
          {unread > 0 && <span className="absolute top-1.5 right-1.5 min-w-4 rounded-full bg-rose-500 px-1 text-center text-[9px] leading-4 font-bold text-white ring-2 ring-surface">{digits(unread > 9 ? '9+' : unread)}</span>}
        </Link>
        <div ref={menu} className="relative">
          <button type="button" onClick={() => setMenuOpen((value) => !value)} aria-expanded={menuOpen} aria-haspopup="menu" className="flex cursor-pointer items-center gap-2.5 rounded-xl py-1 pr-2 pl-1 transition hover:bg-slate-100">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-teal-500 to-accent2-400 font-display text-sm font-bold text-white">{initial}</span>
            <span className="hidden text-left leading-tight sm:block">
              <span className="block max-w-36 truncate text-sm font-semibold text-slate-800">{user?.name}</span>
              <span className="block text-[11px] text-slate-500">{ROLE_LABELS[user?.role]}</span>
            </span>
            <ChevronDown size={15} className="hidden text-slate-400 sm:block" />
          </button>
          {menuOpen && (
            <div role="menu" className="absolute right-0 mt-2 w-60 overflow-hidden rounded-xl bg-surface py-1 shadow-xl ring-1 ring-slate-200 motion-safe:animate-fade-up">
              <div className="border-b border-slate-100 px-4 py-3">
                <p className="truncate text-sm font-semibold text-slate-800">{user?.name}</p>
                <p className="truncate text-xs text-slate-500">{user?.email}</p>
              </div>
              {[
                { to: '/settings/profile', icon: UserRound, label: 'Profile settings' },
                { to: '/settings/security', icon: ShieldCheck, label: 'Security' },
                ...(can('settings.manage') ? [{ to: '/settings/store', icon: Settings, label: 'Store settings' }] : []),
              ].map((item) => (
                <Link key={item.to} role="menuitem" to={item.to} onClick={() => setMenuOpen(false)} className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"><item.icon size={15} className="text-slate-400" /> {t(item.label)}</Link>
              ))}
              <button role="menuitem" type="button" onClick={signOut} className="flex w-full cursor-pointer items-center gap-2.5 border-t border-slate-100 px-4 py-2.5 text-sm font-medium text-rose-600 hover:bg-rose-50"><LogOut size={15} /> {t('Sign out')}</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
