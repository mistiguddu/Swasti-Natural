'use client';

import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from '@/router';
import { ChevronDown, ChevronsLeft, ChevronsRight, X } from 'lucide-react';
import { NAVIGATION } from './navigation.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { digits, t } from '../../i18n/index.js';
import { LogoMark } from '../ui/Logo.jsx';
import { useBranding } from '../../context/BrandingContext.jsx';

function isActive(pathname, to, end) {
  if (to === '/') return pathname === '/';
  return end ? pathname === to : pathname === to || pathname.startsWith(`${to}/`);
}

function Badge({ value }) {
  if (!value) return null;
  return <span className="ml-auto min-w-5 rounded-full bg-rose-500 px-1.5 text-center text-[10px] leading-5 font-bold text-white">{digits(value > 99 ? '99+' : value)}</span>;
}

function SubLink({ to, end, children, onNavigate }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onNavigate}
      className={({ isActive: active }) => `relative flex items-center gap-2 rounded-lg py-1.5 pr-2 pl-9 text-[13px] transition before:absolute before:top-1/2 before:left-[19px] before:h-1.5 before:w-1.5 before:-translate-y-1/2 before:rounded-full ${active ? 'bg-teal-50 font-semibold text-teal-800 before:bg-teal-500' : 'text-slate-500 before:bg-slate-300 hover:bg-slate-50 hover:text-slate-900'}`}
    >
      <span className="truncate">{typeof children === "string" ? t(children) : children}</span>
    </NavLink>
  );
}

export default function Sidebar({ collapsed, onToggleCollapse, mobileOpen, onCloseMobile, badges }) {
  const { pathname } = useLocation();
  const { can } = useAuth();
  const { storeName } = useBranding();
  const visible = NAVIGATION
    .filter((item) => !item.permission || can(item.permission))
    .map((item) => (item.children ? { ...item, children: item.children.filter((child) => !child.permission || can(child.permission)) } : item))
    .filter((item) => !item.children || item.children.length);

  const groupActive = (item) => item.children?.some((child) => isActive(pathname, child.to, child.end))
    || (item.categoryShortcuts && /^\/categories\/[^/]+\/products/.test(pathname));
  const [open, setOpen] = useState(() => new Set(visible.filter(groupActive).map((item) => item.label)));

  useEffect(() => {
    const active = visible.find(groupActive);
    if (active) setOpen((current) => (current.has(active.label) ? current : new Set(current).add(active.label)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const toggle = (label) => setOpen((current) => {
    const next = new Set(current);
    if (next.has(label)) next.delete(label); else next.add(label);
    return next;
  });

  const wide = !collapsed || mobileOpen;
  const itemClass = (active) => `group flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-teal-500 ${active ? 'bg-teal-600 text-white shadow-md shadow-teal-600/25' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'} ${wide ? '' : 'justify-center px-0'}`;

  return (
    <>
      {mobileOpen && <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px] lg:hidden" onClick={onCloseMobile} aria-hidden="true" />}
      <aside
        aria-label="Main navigation"
        className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-slate-200 bg-surface transition-[width,transform] duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} ${wide ? 'w-72 lg:w-64' : 'w-72 lg:w-[76px]'}`}
      >
        <div className={`flex h-16 shrink-0 items-center border-b border-slate-100 ${wide ? 'justify-between px-5' : 'justify-center'}`}>
          <Link to="/" onClick={onCloseMobile} className="flex items-center gap-3 rounded-xl focus-visible:outline-2 focus-visible:outline-teal-500" aria-label={`${storeName} — ${t('Dashboard')}`}>
            <LogoMark />
            {wide && (
              <span className="font-display text-[15px] leading-tight font-extrabold text-slate-900">
                <span className="block max-w-36 truncate">{storeName}</span>
                <span className="block text-[10px] font-semibold tracking-[0.18em] text-teal-600">{t('ADMIN CONSOLE')}</span>
              </span>
            )}
          </Link>
          <button type="button" onClick={onCloseMobile} className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-slate-500 hover:bg-slate-100 lg:hidden" aria-label="Close menu"><X size={18} /></button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4 [scrollbar-width:thin]">
          {visible.map((item) => {
            const Icon = item.icon;
            const badge = item.badge ? badges[item.badge] : 0;
            if (!item.children) {
              return (
                <NavLink key={item.label} to={item.to} end={item.end} onClick={onCloseMobile} title={wide ? undefined : t(item.label)} className={({ isActive: active }) => itemClass(active)}>
                  <span className="relative"><Icon size={19} className="shrink-0" />{!wide && badge > 0 && <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-rose-500" />}</span>
                  {wide && <span className="truncate">{t(item.label)}</span>}
                  {wide && <Badge value={badge} />}
                </NavLink>
              );
            }
            const active = groupActive(item);
            const expanded = open.has(item.label);
            return (
              <div key={item.label}>
                <button
                  type="button"
                  onClick={() => (wide ? toggle(item.label) : onToggleCollapse())}
                  aria-expanded={wide ? expanded : undefined}
                  title={wide ? undefined : t(item.label)}
                  className={`${itemClass(false)} ${active ? 'text-teal-700' : ''}`}
                >
                  <span className="relative">
                    <Icon size={19} className={`shrink-0 ${active ? 'text-teal-600' : ''}`} />
                    {!wide && active && <span className="absolute -right-1 -bottom-1 h-1.5 w-1.5 rounded-full bg-teal-500" />}
                  </span>
                  {wide && <span className={`truncate ${active ? 'font-semibold' : ''}`}>{t(item.label)}</span>}
                  {wide && <Badge value={badge} />}
                  {wide && <ChevronDown size={15} className={`shrink-0 text-slate-400 transition-transform duration-200 ${badge ? 'ml-1' : 'ml-auto'} ${expanded ? 'rotate-180' : ''}`} />}
                </button>
                {wide && (
                  <div className={`grid transition-[grid-template-rows] duration-200 ease-out ${expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                    <div className="overflow-hidden">
                      <div className="mt-1 space-y-0.5 pb-1">
                        {item.children.map((child) => <SubLink key={child.to} to={child.to} end={child.end} onNavigate={onCloseMobile}>{t(child.label)}</SubLink>)}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="hidden shrink-0 border-t border-slate-100 p-3 lg:block">
          <button type="button" onClick={onToggleCollapse} className={`${itemClass(false)} text-slate-500`} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            {collapsed ? <ChevronsRight size={18} /> : <><ChevronsLeft size={18} /><span>{t('Collapse')}</span></>}
          </button>
        </div>
      </aside>
    </>
  );
}
