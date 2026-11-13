import { useCallback, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import Topbar from './Topbar.jsx';
import { api } from '../../api.js';
import { useAuth } from '../../context/AuthContext.jsx';

/** Shared shell: collapsible sidebar, top bar, and a page outlet. Exposes `refreshBadges` via outlet context. */
export default function AdminLayout() {
  const { can } = useAuth();
  const { pathname } = useLocation();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('swasti_sidebar_collapsed') === '1');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [badges, setBadges] = useState({ notifications: 0, pendingOrders: 0 });
  const [categories, setCategories] = useState([]);

  const refreshBadges = useCallback(async () => {
    const [notifications, orders] = await Promise.all([
      api.get('/notifications/unread-count').catch(() => null),
      can('orders.manage') ? api.get('/orders', { status: 'pending', limit: 1 }).catch(() => null) : null,
    ]);
    setBadges({ notifications: notifications?.unread ?? 0, pendingOrders: orders?.pagination?.total ?? 0 });
  }, [can]);

  const refreshCategories = useCallback(async () => {
    if (!can('catalog.manage')) return;
    const data = await api.get('/categories', { all: 'true', parent: 'root', status: 'active' }).catch(() => null);
    setCategories((data?.items ?? []).slice(0, 12));
  }, [can]);

  useEffect(() => { refreshBadges(); }, [pathname, refreshBadges]);
  useEffect(() => { refreshCategories(); }, [refreshCategories]);
  useEffect(() => { setMobileOpen(false); }, [pathname]);
  useEffect(() => {
    const timer = setInterval(refreshBadges, 60000);
    return () => clearInterval(timer);
  }, [refreshBadges]);

  const toggleCollapse = () => setCollapsed((value) => {
    localStorage.setItem('swasti_sidebar_collapsed', value ? '0' : '1');
    return !value;
  });

  return (
    <div className="flex min-h-screen bg-slate-50 font-body text-slate-800 selection:bg-teal-200">
      <a href="#main" className="sr-only z-[80] rounded-lg bg-white px-3 py-2 focus:not-sr-only focus:fixed focus:top-3 focus:left-3">Skip to content</a>
      <Sidebar collapsed={collapsed} onToggleCollapse={toggleCollapse} mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} badges={badges} categories={categories} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onOpenMobile={() => setMobileOpen(true)} unread={badges.notifications} />
        <main id="main" className="mx-auto w-full max-w-[1500px] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet context={{ refreshBadges, refreshCategories }} />
        </main>
      </div>
    </div>
  );
}
